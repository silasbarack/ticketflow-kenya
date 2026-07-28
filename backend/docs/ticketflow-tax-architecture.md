# TicketFlow Kenya — Tax Architecture

Status: engineering documentation for the `backend/src/tax/` module. This is **not tax advice**. Every seeded tax rate, rounding rule and treatment in this module is marked `requiresReview: true` and must be reviewed and approved by a Kenyan tax professional (see the "Production-readiness checklist" at the end of this document, and `docs/ticketflow-tax-payment-runbook.md`) before it drives real filings or payments.

## 1. Business model: disclosed agent

TicketFlow Kenya Limited acts as a **disclosed ticketing and collection agent** for each named event organizer. This is the default and only enabled model (`CompanyTaxProfile.agencyModel = 'DISCLOSED_AGENT'`).

Under this model:

- **Ticket face-value proceeds belong to the event organizer.** TicketFlow never recognizes the customer's full payment as its own revenue.
- TicketFlow holds organizer proceeds as **client money / an organizer payable** (`LEDGER_ACCOUNTS.ORGANIZER_PAYABLE`, `CLIENT_MONEY_ORGANIZER_FUNDS`) until settlement.
- **TicketFlow's own revenue** is only its disclosed booking fees, commission, and any other explicitly contracted service fees.
- **VAT ownership follows revenue ownership**: VAT on TicketFlow's own fees is TicketFlow's output VAT (`TICKETFLOW_VAT_PAYABLE`). VAT on the underlying ticket is the **organizer's** VAT — it is computed and recorded (`TaxCalculation.organizerTicketOutputVatMinor`) as a memorandum for the organizer's own return, but it is **never** posted to TicketFlow's ledger or included in TicketFlow's VAT period aggregation.

A second model, `PRINCIPAL_RESELLER`, is implemented in the calculation domain logic (`calculateTicketSaleTax` in `src/tax/domain/calculation/calculate-ticket-sale-tax.logic.ts`) for completeness and future use, but:

- It is **not** the default (`CompanyTaxProfile.agencyModel` defaults to `DISCLOSED_AGENT`, and `TICKETFLOW_AGENCY_MODEL` in `.env.example` is likewise `DISCLOSED_AGENT`).
- **Ledger posting for `PRINCIPAL_RESELLER` is not implemented.** `TicketSaleLedgerPostingService` only posts the disclosed-agent journal entries described below. Enabling `PRINCIPAL_RESELLER` in production requires implementing a distinct posting path first (TicketFlow would recognize the full ticket sale as its own revenue, not just fees) — see "Unresolved risks" in the final implementation report.

## 2. Money and rounding

All monetary values in the tax module are **integer minor units** (`bigint`), never floating point:

```ts
type Money = { currency: 'KES'; minorUnits: bigint };
```

`src/tax/domain/money/money.ts` is the single source of truth:

- `minorUnitsFromDecimalString('1500.00') === 150000n`, and the reverse `decimalStringFromMinorUnits`.
- Rates are basis points (`500` = 5%, `1600` = 16%).
- `divideBigIntWithRounding(numerator, denominator, mode)` implements `'HALF_UP'` (round half away from zero) and `'DOWN'` (truncate toward zero) — the two `RoundingMode`s used everywhere else.
- `extractVatFromInclusive(grossMinor, rateBps, mode)` and `addVatToExclusive(netMinor, rateBps, mode)` are the only two VAT arithmetic primitives; every fee/commission/ticket-price calculation is built from these plus `percentageOfMinor`.
- `serializeMoney(money)` produces `{ currency, minorUnits: string, display: string }` — the explicit JSON-safe serialization the task requires, since `JSON.stringify` cannot serialize `bigint`. `src/tax/domain/money/json-safe.ts#toJsonSafe` does the same generically for arbitrary structures (used for eTIMS payload storage). `src/tax/infrastructure/serializers/bigint-json.polyfill.ts` adds a `BigInt.prototype.toJSON` safety net in `main.ts` in case a raw `bigint` ever reaches a controller response unconverted — it is a backstop, not the primary serialization path.

Rounding happens **at the component (fee/commission/ticket) level**, not on a combined total — see the worked example below. This is deliberate: it is the granularity at which eTIMS invoice lines and the organizer settlement report need exact figures, and it is what produces the demonstration numbers below exactly.

## 3. Worked example (also the assertion in `test/tax/calculate-ticket-sale-tax.spec.ts`)

```
Ticket face value:            KES 1,500.00   (standard-rated, organizer VAT-registered)
Customer booking fee:         KES   100.00   VAT-inclusive, fixed
Organizer commission:         5% of ticket face value = KES 75.00, VAT-inclusive
Processor charge:             KES    40.00, borne by TicketFlow
TicketFlow VAT status:        Registered (16%)
Agency model:                 Disclosed agent

Customer payment            = 1,500.00 + 100.00                     = KES 1,600.00
Booking fee ex-VAT          = 100.00 / 1.16                         = KES    86.21
Booking-fee VAT             = 100.00 - 86.21                        = KES    13.79
Commission ex-VAT           = 75.00 / 1.16                          = KES    64.66
Commission VAT               = 75.00 - 64.66                         = KES    10.34
TicketFlow revenue ex-VAT   = 86.21 + 64.66                          = KES   150.87
TicketFlow output VAT       = 13.79 + 10.34                          = KES    24.13
Organizer settlement        = 1,500.00 - 75.00                       = KES 1,425.00
TicketFlow cash retained    = 100.00 + 75.00 - 40.00                 = KES   135.00
  (before other costs)
TicketFlow cash after VAT   = 135.00 - 24.13                         = KES   110.87
```

The organizer's own ticket VAT (a memo only, since the organizer is standard-rated and registered) is computed the same way: `1,500.00 / 1.16 = 1,293.10` net, `206.90` VAT — stored on `TaxCalculation.organizerTicketOutputVatMinor` and **never posted to TicketFlow's ledger**.

## 4. Double-entry ledger

`src/tax/domain/ledger/accounts.ts` defines the chart of accounts (`LEDGER_ACCOUNTS`), seeded by `prisma/seed-tax.ts` into the `ledger_accounts` table:

| Code | Purpose |
|---|---|
| `CASH_MPESA_CLEARING`, `CARD_PROCESSOR_CLEARING`, `BANK` | Cash/settlement clearing |
| `CUSTOMER_REFUND_PAYABLE` | Amounts owed back to customers |
| `CLIENT_MONEY_ORGANIZER_FUNDS`, `ORGANIZER_PAYABLE` | Organizer proceeds held/owed |
| `BOOKING_FEE_REVENUE`, `COMMISSION_REVENUE` | TicketFlow's own revenue |
| `TICKETFLOW_VAT_PAYABLE` | TicketFlow's own output VAT liability |
| `ORGANIZER_OWNED_VAT_MEMO` | Non-posting memo account for organizer VAT (informational only — see `isOrganizerMemo` in `LedgerAccount`) |
| `PAYMENT_PROCESSING_EXPENSE`, `PROCESSOR_PAYABLE_CLEARING` | Processor costs |
| `CHARGEBACK_EXPENSE` | Chargeback losses |
| `TAX_PAYABLE`, `TAX_PAYMENT_CLEARING` | Tax remittance accounts |

For the KES 1,600 example, `TicketSaleLedgerPostingService.postTicketSale` posts exactly three balanced journal entries (asserted in `test/tax/ledger.spec.ts`):

```
Entry 1 — sale settlement:
  Dr  Cash/M-Pesa clearing         1,600.00
  Cr  Organizer payable            1,500.00
  Cr  Booking-fee revenue             86.21
  Cr  TicketFlow VAT payable          13.79

Entry 2 — commission deduction:
  Dr  Organizer payable               75.00
  Cr  Commission revenue               64.66
  Cr  TicketFlow VAT payable           10.34

Entry 3 — TicketFlow-borne processor charge:
  Dr  Payment-processing expense       40.00
  Cr  Processor payable/clearing       40.00
```

`LedgerRepository.postEntry` (`src/tax/infrastructure/repositories/ledger.repository.ts`) **rejects an unbalanced entry in application code before it reaches the database** (`UnbalancedJournalEntryError`), and the database independently enforces the same invariant via a deferred `CONSTRAINT TRIGGER` (`tax_journal_lines_balance_check`) that fires at transaction commit — belt and suspenders, since a raw SQL statement bypassing the application layer would otherwise be able to post an unbalanced entry. Posted entries and lines are **append-only**: `tax_journal_entries_no_update` / `tax_journal_lines_no_update` triggers reject any `UPDATE` or `DELETE`. Corrections must be posted as new, reversing entries — never edits.

Authoritative financial balances must always be derived from summing posted journal lines by account, **never** from `Order.status` or any other mutable status field.

## 5. Refunds

`CalculateRefundTaxService` (`src/tax/application/calculate-refund-tax.service.ts`, domain logic in `src/tax/domain/refund/calculate-refund-tax.logic.ts`) never mutates or deletes the original `TaxCalculation`. It creates a linked `RefundTaxCalculation` row (`originalCalculationId` FK) that separately computes:

- Refundable ticket face value and booking fee (full, prorated by line, or non-refundable per policy).
- Reversal of TicketFlow's own revenue and output VAT (what gets credit-noted through eTIMS).
- Reversal of the organizer payable, and — if the event was standard-rated/registered — reversal of the organizer's own ticket VAT memo.
- `organizerAlreadySettled`: if true, `ticketFlowRecoveryRequired` and `refundReserveRequired` are both set to the reversed organizer-payable amount, since TicketFlow must recover funds already paid out to the organizer rather than simply netting against a payable that no longer exists.
- `requiresEtimsCreditNote`: true whenever any TicketFlow-owned amount (fee/commission/VAT) is reversed.

`RefundLedgerPostingService` posts new, forward-dated reversing journal entries referencing the original sale via `sourceType`/`sourceId` — it never edits the original entries (which is enforced at the DB level regardless).

## 6. Tax rules — effective-dated, non-overlapping

`TaxRule` (`prisma/schema.prisma`, code enum `TICKETFLOW_PLATFORM_OUTPUT_VAT | ORGANIZER_TICKET_OUTPUT_VAT | CORPORATION_TAX_PROVISION | SUPPLIER_WITHHOLDING_TAX | PAYE | AFFORDABLE_HOUSING_LEVY | OTHER`) is effective-dated (`effectiveFrom`/`effectiveTo`) and jurisdiction-scoped (`KE` only today). A **PostgreSQL `EXCLUDE USING gist` constraint** (`tax_rules_no_overlap`, over a generated `tsrange` column `effective_range`) makes it impossible for two *enabled* rules with the same `code`+`jurisdiction` to have overlapping date ranges, at the database level — not just in application code. `TaxRuleRepository.create` performs the same check first and throws a friendlier `OverlappingTaxRuleError`, but the DB constraint is the real backstop.

Seed rules (`prisma/seed-tax.ts`) are marked `requiresReview: true` and `approvedBy: null` — they are **demonstration values only**, not tax advice, and must be reviewed and explicitly approved (`POST /admin/tax/rules/:id/approve`) before being relied on.

**⚠️ Operational warning on schema changes**: the `effective_range` generated column and the `tax_rules_no_overlap` exclusion constraint are *not* expressible in `schema.prisma` (Prisma has no concept of generated columns or exclusion constraints), so they were added by hand in raw migration SQL. **Every time you run `prisma migrate dev` after a schema.prisma change, Prisma's shadow-DB diff will detect this column/constraint as "drift" and generate a migration that drops it** (`ALTER TABLE "tax_rules" DROP COLUMN "effective_range"` — this actually happened once during this module's development; see `prisma/migrations/20260724155153_add_tax_module_relations/migration.sql` for the fix and a much longer version of this warning inline). Before applying any newly generated migration, search its `migration.sql` for that line and delete it (and the accompanying `Warnings:` comment) if present, or the overlap protection silently disappears again. Plain `CHECK` constraints and triggers are *not* affected by this — Prisma's diff engine does not manage those at all, which is why the balance/immutability triggers and non-negative-amount checks have survived every migration untouched.

## 7. Historical rules

Every `TaxCalculation` records `ruleVersionIds: string[]` — the exact `TaxRule.id`s used to produce it. Calculations are looked up by `transactionDate`, so recalculating a historical sale (e.g. for an audit) always re-derives the rate that was in force *at the time*, not today's rate — see `test/tax/calculate-ticket-sale-tax.spec.ts` ("historical rule usage").

## 8. Immutable, versioned calculations

`TaxCalculation` rows are never updated in place. A recalculation creates a new row with an incremented `calculationVersion`, sets `supersededByCalculationId` on the old row, and flips `isActive` — see `CalculateTicketSaleTaxService.persist`. `calculationHash` (SHA-256 over the full result) lets you detect whether two calculations for the same input actually produced identical figures.

## 9. Module boundary

`src/tax/` reads/writes its own tables plus a small, explicit surface of the existing schema: `Order`, `Event`, `OrganizerProfile`, `Payment` (read-only, for reconciliation). No existing module imports from `src/tax/`; `TaxModule` is added to `AppModule.imports` and nothing else in the pre-existing codebase changed. See the final implementation report for the exact file list.

## 10. Notifications

There is no configured outbound email/Slack channel for tax events in this codebase (see `TaxNotificationService`). Every notification is (a) logged via Nest's `Logger` at `WARN`, and (b) written as a `TaxAuditEvent`, queryable via `GET /admin/tax/audit-events` (`tax.audit.view`). Wiring a real channel (e.g. reusing the existing `EmailModule`, being careful never to put unmasked PINs/PRNs in an email body) is a follow-up, not implemented here — see "Unresolved risks" in the final report.

## 11. Production-readiness checklist

Before enabling anything beyond `SANDBOX`/`MANUAL_PRN` in production:

- [ ] A Kenyan tax professional has reviewed and approved every seeded `TaxRule` (`approvedBy` set, `requiresReview` cleared).
- [ ] `TAX_ENCRYPTION_KEY` is set from a real secret manager, not `.env`, and a key-rotation runbook exists (see `docs/ticketflow-tax-payment-runbook.md` "Key rotation").
- [ ] `CompanyTaxProfile.kraPinEncrypted` and each `OrganizerTaxProfile.kraPinEncrypted` are populated and verified.
- [ ] eTIMS: KRA OSCU/VSCU onboarding and certification is complete; `ETIMS_MODE`, `ETIMS_BASE_URL`, `ETIMS_CLIENT_ID/SECRET`, and the certificate/key paths are set to *real, KRA-issued* values; `EtimsProductionAdapter` has been extended with the certified wire protocol (see `docs/ticketflow-etims-integration.md`).
- [ ] Tax payment: `KRA_TAX_PAYMENT_MODE` is only moved off `MANUAL_PRN` once a real, authorised bank/M-Pesa treasury integration exists — `ApprovedTreasuryPaymentAdapter` is a fail-closed stub today (see `docs/ticketflow-tax-payment-runbook.md`).
- [ ] `KRA_PAYMENT_CHANNEL` / `KRA_PAYBILL_NUMBER` have been verified against KRA's *current* official payment channel immediately before enabling — these change and must never be hard-coded.
- [ ] Every newly generated Prisma migration has been checked for the `effective_range` drop described in §6.
- [ ] `TAX_MAKER_CHECKER_ENABLED=true` in production; `TAX_PAYMENT_APPROVAL_THRESHOLD_MINOR` is either unset or set to a genuinely low, board-approved value.
- [ ] A real notification channel has replaced/augmented the log+audit-only `TaxNotificationService`.
