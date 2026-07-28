# Tax Payment Runbook

## Why this is separate from eTIMS

eTIMS fiscalises invoices/credit notes. It does not pay tax. VAT, corporation tax, PAYE, withholding tax, and other tax return filings happen through **iTax**, KRA's tax administration portal, which — after a return is filed — issues a **Payment Registration Number (PRN)**: a reference used to actually pay the assessed amount through a bank, mobile money, or KRA's own payment channels. This runbook covers everything from "a liability has been approved" to "KRA has confirmed the money arrived."

**This system does not, and must not, automate iTax.** There is no screen-scraping, no browser automation, no CAPTCHA bypass, and no storage of any user's iTax password anywhere in this codebase. A human always logs into iTax, files the return, and obtains the PRN. This system's job starts once that PRN exists.

## The liability state machine

```
DRAFT → CALCULATED → RECONCILED → APPROVED → PRN_REQUIRED → PRN_ATTACHED → PAYMENT_PROCESSING → PAID → KRA_CONFIRMED
                                                                                      ↘ FAILED (retryable) ↘ REQUIRES_REVIEW
also: REJECTED, CANCELLED (terminal)
```

Defined in `src/tax/domain/liability/tax-liability.types.ts` (`ALLOWED_LIABILITY_TRANSITIONS`), enforced by `TaxLiabilityService.transition` on every write. Key invariants (all covered by `test/tax/tax-liability-state-machine.spec.ts`):

- A `DRAFT` liability cannot be paid — it must pass through `CALCULATED → RECONCILED → APPROVED` first.
- `CALCULATED → APPROVED` directly is rejected; reconciliation (`tax.liability.reconcile`) is mandatory first.
- Approval immediately cascades `APPROVED → PRN_REQUIRED` — a liability with no PRN attached cannot enter `PAYMENT_PROCESSING`.
- `PAID` and `KRA_CONFIRMED` liabilities cannot be edited or re-approved.
- `FAILED` may retry back to `PAYMENT_PROCESSING` using the **same** remittance idempotency key. `REQUIRES_REVIEW` deliberately cannot — it requires a human to investigate first (see "Uncertain payment status" below), then move the liability back through reconciliation.

## Step by step: from approved liability to KRA confirmation

1. **Prepare & reconcile** (`tax.period.prepare`, `tax.liability.reconcile`): a finance user reviews the calculated period figures and marks the liability reconciled. This is a distinct step from approval — one person's calculation must be checked before another approves it.
2. **Approve** (`tax.liability.approve`, `POST /admin/tax/liabilities/:id/approve`): a *different* user than whoever reconciled it approves the liability. `assertDifferentActors` enforces this in code, not just by convention — approving your own reconciliation throws `SameActorMakerCheckerError`. The one documented exception: if `TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR` is set and the liability amount is at or below it, the same-actor check is skipped (a deliberate, auditable low-value exception — see `.env.example`). Leave it unset to require maker-checker on everything.
3. **File the return and obtain a PRN through iTax** (outside this system, by a human). The PRN, taxpayer PIN, tax head, tax period, and exact amount come from that iTax session.
4. **Attach the PRN** (`tax.prn.attach`, `POST /admin/tax/liabilities/:id/prn`): the finance user pastes the PRN. `TaxPrnService.attach` validates, before storing anything:
   - The PRN amount equals the approved liability's amount exactly.
   - Currency is `KES`.
   - Tax period and tax head match the liability.
   - The taxpayer PIN matches the liability owner: for a `TICKETFLOW`-owned liability, it must match `CompanyTaxProfile.kraPinEncrypted`; for an `ORGANIZER`-owned liability, it must match that organizer's `OrganizerTaxProfile.kraPinEncrypted`. **An organizer-owned liability can never be attached under TicketFlow's own PIN, or vice versa** — this is enforced in code and covered by `test/tax/integration/tax-workflows.spec.ts` ("#24 wrong taxpayer PIN").
   - The PRN has not already been attached elsewhere (`prnHash` unique index — the raw PRN itself is stored encrypted, never in plaintext, and never returned in full through any API; only a masked form is ever shown).
5. **Verify** (`POST /admin/tax/liabilities/prn/:registrationId/verify`): a second, explicit step — attaching is not the same as verifying. Verification is what actually moves the liability `PRN_REQUIRED → PRN_ATTACHED`.
6. **Initiate payment** (`tax.payment.initiate`, `POST /admin/tax/liabilities/:id/pay`): `TaxRemittanceService.initiate` selects the adapter from `CompanyTaxProfile.taxPaymentMode` and creates a `TaxRemittance` row keyed on `TAX-PAYMENT:{liabilityId}` — calling this twice in a row (or twice concurrently) returns the same row, never a duplicate (see "Idempotency" below).
7. **Confirm payment** (`tax.payment.confirm`) — see the adapter-specific flow below.
8. **KRA confirmation**: if a `kraConfirmationReference` is recorded alongside the payment confirmation, the liability additionally moves `PAID → KRA_CONFIRMED`.

## Payment adapters

`TaxPaymentAdapter` (`src/tax/integrations/kra-payment/kra-payment.interface.ts`): `remit(remittanceId, liability, registration)` / `checkStatus(remittanceId)`. Selected by `CompanyTaxProfile.taxPaymentMode`:

### `MANUAL_PRN` (default, the only fully "real" flow today)

`ManualPrnPaymentAdapter` marks the remittance `AWAITING_EXTERNAL_CONFIRMATION` — a human then pays the PRN through whatever official KRA-approved channel operations uses (bank, M-Pesa PayBill, etc.) *outside this system*, and records the result:

- `POST /admin/tax/remittances/:id/confirm` (`tax.payment.confirm`) — records `bankReference`/`mpesaReference`/`evidenceFileRef`/`kraConfirmationReference` and validates the confirmed amount against the remittance amount exactly (an authorised user cannot confirm an arbitrary amount).
- If `TAX_MAKER_CHECKER_ENABLED=true`, this only moves the remittance to `SUBMITTED`; a **second**, different user must call `POST /admin/tax/remittances/:id/second-approve` to reach `PAID`. `assertDifferentActors` again enforces this is not the same person who initiated payment.

### `SANDBOX`

`MockKraPaymentAdapter` — always succeeds immediately with status `SANDBOX_SIMULATED`. **Never** `PAID`, **never** `KRA_CONFIRMED` — those statuses are reserved for confirmed real payments so sandbox activity can never be mistaken for one in reporting or reconciliation.

### `APPROVED_BANK_INTEGRATION` / `APPROVED_MPESA_INTEGRATION`

`ApprovedTreasuryPaymentAdapter` — a fail-closed stub. Every call to `remit()` throws `TaxPaymentConfigurationError` today, regardless of configuration, because **no real, authorised treasury integration exists yet**. What it does do (and what a real implementation must preserve):

- Uses idempotency key `TAX-PAYMENT:{liabilityId}`.
- Would debit only the configured `KRA_TAX_BANK_ACCOUNT_TOKEN` — never an arbitrary account.
- Would use the PRN as the payment reference, and the **amount stored on the approved liability** — never an amount supplied by the API caller.
- On any uncertain outcome (including a timeout), sets the remittance and liability to `REQUIRES_REVIEW` rather than retrying automatically or guessing success (see below).
- Stores bank/M-Pesa and KRA confirmation references as separate fields, never conflated.

**Before enabling either of these in production**: implement the real bank/M-Pesa API call inside `ApprovedTreasuryPaymentAdapter.remit`, verify `KRA_PAYMENT_CHANNEL` and `KRA_PAYBILL_NUMBER` against KRA's *current* published channel (these are not hard-coded anywhere in this codebase specifically so they can't go stale silently), and get sign-off that TicketFlow has genuine authority to move money from `KRA_TAX_BANK_ACCOUNT_TOKEN`.

## Idempotency

Every remittance is keyed on `TAX-PAYMENT:{liabilityId}` (unique DB constraint on `TaxRemittance.idempotencyKey`), and `TaxRemittance.liabilityId` + `status = 'PAID'` has a **partial unique index** (`tax_remittances_one_paid_per_liability`) so the database itself refuses a second `PAID` row for the same liability even if application logic were bypassed. `TaxRemittanceService.initiate`:

- Returns the existing remittance untouched if it is already `PAID`/`SANDBOX_SIMULATED`/in flight (`PENDING`/`AWAITING_EXTERNAL_CONFIRMATION`/`SUBMITTED`) — see `test/tax/integration/tax-workflows.spec.ts` ("#29 existing receipt returned on retry", "#22 duplicate payment attempt").
- Handles the race where two concurrent `initiate()` calls both pass the "no existing remittance" check: the loser's `INSERT` hits the unique constraint, is caught, and the loser re-fetches and returns the winner's row instead of erroring.
- Only allows a fresh `remit()` call when the liability is freshly `PRN_ATTACHED`, or retrying a `FAILED` remittance. A `REQUIRES_REVIEW` remittance is never auto-retried.

## Uncertain payment status ("timeout after treasury submission")

If a payment adapter cannot determine whether a real payment succeeded (a network timeout mid-call, an ambiguous provider response), the correct behaviour is **never** to assume success and mark `PAID`, and **never** to blindly retry a transfer that might have actually gone through. This codebase's convention (`ApprovedTreasuryPaymentAdapter`, and the "uncertain payment status" scheduled job):

1. Set the remittance and liability to `REQUIRES_REVIEW`.
2. Raise a `TaxNotificationService` notification (`UNCERTAIN_PAYMENT_STATUS`).
3. Require a human to check the actual bank/KRA record and either (a) attach evidence the payment succeeded and confirm it manually, or (b) confirm it did not and allow a fresh remittance to be initiated once the liability is moved back through reconciliation.

`TaxJobsService.detectStalePaymentProcessing` (every 30 minutes) automatically flags any liability stuck in `PAYMENT_PROCESSING` for more than 6 hours the same way — moving it to `REQUIRES_REVIEW` and notifying, never retrying automatically.

## Key rotation

`TAX_ENCRYPTION_KEY` (AES-256-GCM, 32 bytes/64 hex chars) encrypts `CompanyTaxProfile.kraPinEncrypted`, `OrganizerTaxProfile.kraPinEncrypted`, and `TaxPaymentRegistration.prnEncrypted`. To rotate it:

1. Generate a new key (`openssl rand -hex 32`).
2. Write a one-off script that, for each encrypted field, decrypts with the **old** key and re-encrypts with the **new** key, inside a single DB transaction per row.
3. Only after every row is re-encrypted, update `TAX_ENCRYPTION_KEY` in the running environment and redeploy.
4. Never deploy the new key before the re-encryption pass completes — every already-encrypted value becomes permanently unreadable otherwise (there is no key-versioning scheme in `TaxEncryptionService` today; it assumes exactly one active key at a time — see "Unresolved risks" in the final implementation report).

## Audit procedures

Every state transition, PRN attach/verify, payment initiate/confirm, and permission grant/revoke writes a `TaxAuditEvent` (`GET /admin/tax/audit-events`, `tax.audit.view`) with actor, before/after hash, and metadata — but **never** a full KRA PIN, full PRN, password, or credential (see `TaxAuditService` and the redaction discipline in every service that logs one). For a period-end audit: pull all `TaxAuditEvent`s for the relevant `TaxLiability`/`TaxRemittance`/`TaxPaymentRegistration` ids and cross-reference against `docs/ticketflow-tax-reconciliation.md`.
