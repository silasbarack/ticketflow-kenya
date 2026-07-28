# eTIMS Integration

## What eTIMS is, and what it is not

eTIMS (electronic Tax Invoice Management System) is KRA's system for **fiscalising invoices and credit notes** — it is how a business reports the existence and content of a taxable sale/refund to KRA in near-real-time. It has two system-to-system integration paths for businesses that don't use a physical device:

- **OSCU** (Online Sales Control Unit) — direct online integration.
- **VSCU** (Virtual Sales Control Unit) — integration via a KRA-approved intermediary/ERP connector.

**eTIMS is not a payment system.** Submitting an invoice to eTIMS does not move any money and does not pay any tax. Actual VAT/other tax payment happens through iTax (return filing → Payment Registration Number, or PRN) and a separate payment channel — see `docs/ticketflow-tax-payment-runbook.md`. Conflating the two is a common and serious mistake; this module keeps them as entirely separate subsystems (`src/tax/integrations/etims/` vs `src/tax/integrations/kra-payment/`) on purpose.

## Boundary enforced by this codebase

1. TicketFlow may only use OSCU/VSCU system-to-system integration **after being properly onboarded, tested and certified by KRA**. This module does not assume that has happened.
2. `EtimsClient` (`src/tax/integrations/etims/etims-client.interface.ts`) is a typed interface with three methods: `submitInvoice`, `submitCreditNote`, `getDocumentStatus`.
3. `EtimsSandboxAdapter` is the only adapter that returns a "success" today, and it **always** returns `SANDBOX_SIMULATED` — never `ACCEPTED` — so a sandbox run can never be mistaken for a real fiscalised document downstream (in reconciliation, reporting, or the liability state machine).
4. `EtimsProductionAdapter` implements the same interface but has **no real wire protocol** — every method call checks configuration (`ETIMS_BASE_URL`, `ETIMS_CLIENT_ID`, `ETIMS_CLIENT_SECRET`, `ETIMS_CERTIFICATE_PATH`, `ETIMS_PRIVATE_KEY_PATH`) and then **always** throws `EtimsNotConfiguredError`, whether or not those variables are set. This is deliberate: even with plausible-looking configuration present, this codebase does not know KRA's actual OSCU/VSCU request/response shape (that specification is issued to taxpayers only after onboarding), so it must never fabricate a submission.
5. `EtimsDocumentService` (`src/tax/application/etims-document.service.ts`) selects the adapter from `CompanyTaxProfile.etimsMode`:
   - `DISABLED` → refuses immediately, no adapter call at all, document status `PENDING_CONFIGURATION`.
   - `SANDBOX` → `EtimsSandboxAdapter`.
   - `OSCU` / `VSCU` → `EtimsProductionAdapter` (which will throw until real certification work is done — see "What's left" below).

## Idempotency and the outbox

Every submission is keyed on the **immutable sale/refund identity**, not a request ID a caller could vary:

```
ETIMS-INVOICE:{taxCalculationId}
ETIMS-CREDIT-NOTE:{refundTaxCalculationId}
```

`EtimsDocument.idempotencyKey` has a unique DB constraint. Calling `submitInvoice`/`submitCreditNote` again for the same calculation returns the existing document once it has reached `SUBMITTED`, `ACCEPTED`, or `SANDBOX_SIMULATED` — it never creates a second row or resubmits (`test/tax/integration/tax-workflows.spec.ts`, "#21 duplicate eTIMS submission").

Failures increment `attemptCount` and schedule `nextAttemptAt` with exponential backoff (5, 10, 20, 40… minutes, capped at 24h). After 5 attempts, the document moves to `REQUIRES_REVIEW` and stops auto-retrying. `TaxJobsService.retryEtimsOutbox` (every 10 minutes) picks up anything `PENDING_SUBMISSION` whose `nextAttemptAt` has passed; `TaxJobsService.alertOnEtimsFailures` (hourly) raises a notification for anything stuck `REQUIRES_REVIEW`. A finance/ops user with the `etims.retry` permission can also force a retry via `POST /admin/etims/documents/:id/retry`.

Every request and response payload is stored (`EtimsDocument.requestPayload`/`responsePayload`, JSON-safe via `toJsonSafe` — bigints as decimal strings) for audit. No full secret (client secret, private key contents) is ever written to these columns or to application logs — only configuration *presence*, never values, is logged by `EtimsProductionAdapter`.

## Invoice / credit-note mapping

`src/tax/integrations/etims/etims-invoice.mapper.ts` and `etims-credit-note.mapper.ts` build a **generic** request shape covering the fields general KRA fiscalisation guidance requires: seller legal name + PIN, buyer details where applicable, invoice/credit-note number and date-time, per-line description/quantity/taxable amount/VAT rate/VAT amount/total.

**Only TicketFlow's own taxable supply is invoiced** — the booking fee and commission lines (`ticketFlowRevenueExcludingVat` / `ticketFlowOutputVat`). The organizer's own ticket-VAT liability is the organizer's own fiscalisation responsibility, not something this integration submits on their behalf.

This mapping is deliberately **not** the exact OSCU/VSCU wire payload. KRA's real technical specification (exact field names, required headers, digital signing, unit-of-measure codes, item classification codes, etc.) is issued to taxpayers only after onboarding, and is not publicly documented in a way this codebase can safely reproduce. Both mapper files contain `TODO(OSCU/VSCU cert):` markers at the two points (invoice number format, credit-note number format) most likely to need adjustment once the real specification is available. **Do not guess at additional fields** — extend the mapper (or add a provider-specific mapper behind the same `EtimsClient` interface) once the specification is in hand.

## What's left before this can go to production

1. Complete KRA eTIMS OSCU or VSCU onboarding and certification for TicketFlow Kenya Limited.
2. Obtain the official technical specification and any client certificate/private key KRA issues as part of that process.
3. Implement the real HTTP/mTLS request/response handling inside `EtimsProductionAdapter` (currently it only validates configuration presence and always fails closed) — replace the `TODO(OSCU/VSCU cert)` markers in the mappers with the certified field names.
4. Point `ETIMS_MODE` at `OSCU` or `VSCU` and populate `ETIMS_BASE_URL`/`ETIMS_CLIENT_ID`/`ETIMS_CLIENT_SECRET`/`ETIMS_CERTIFICATE_PATH`/`ETIMS_PRIVATE_KEY_PATH` from a real secret manager.
5. Re-run the eTIMS-related tests (`test/tax/integration/tax-workflows.spec.ts`) plus a manual submission against KRA's sandbox before flipping any real traffic over.

Until all five are done, keep `ETIMS_MODE=SANDBOX` (development/demo) or `DISABLED` (nothing should be submitted at all).
