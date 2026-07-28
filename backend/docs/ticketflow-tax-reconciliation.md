# Tax Reconciliation

`ReconciliationService` (`src/tax/application/reconciliation.service.ts`) never silently adjusts a figure. Every discrepancy it finds becomes a `ReconciliationException` row (`status: 'OPEN'`) that a human must investigate and explicitly resolve (`POST /admin/tax/reconciliation/exceptions/:id/resolve`, `tax.liability.reconcile`), recording a resolution note. Nothing here auto-corrects a balance.

## Daily reconciliation

`POST /admin/tax/reconciliation/daily/:date` (`ReconciliationService.runDaily`). For a given calendar day it checks two identities:

```
Payment gateway settlements  = customer payments − customer refunds − chargebacks − processor deductions
Customer receipts            = organizer payable movements + TicketFlow gross service fees + customer-borne charges
```

Concretely, it:

1. Pulls every `SUCCESS` `Payment` updated that day and groups by `orderId` — more than one `SUCCESS` payment for the same order is a `DUPLICATE_PAYMENT` exception.
2. For each successful payment, looks up the matching active `TaxCalculation` for that order:
   - No calculation at all → `ORPHAN_PAYMENT` (money moved with no corresponding tax record).
   - Calculation exists but its `customerPaymentMinor` doesn't match the payment amount → `AMOUNT_MISMATCH`.
3. For every `TaxCalculation` created that day, confirms a `SUCCESS` payment exists for its order — if not, `MISSING_SETTLEMENT` (tax was calculated but the money never actually settled).
4. Re-checks `LedgerRepository.unbalancedEntryIds()` — this should be structurally impossible given the DB balance trigger, but it's checked anyway as a second line of defence (e.g. against a trigger being disabled by a superuser session) → `UNBALANCED_LEDGER`.

`TaxJobsService.detectUnreconciledYesterday` runs at 02:00 daily and raises a notification (not an automatic run) if no daily reconciliation exists for the previous day — operations must trigger it explicitly.

## Monthly VAT reconciliation

`POST /admin/tax/periods/:period/reconcile` (`ReconciliationService.runMonthly`, `period` = `YYYY-MM`). This is the fuller chain the task describes:

```
Sales ledger ↔ tax calculation ledger ↔ eTIMS invoices ↔ eTIMS credit notes
            ↔ VAT period aggregation ↔ filed return figures ↔ PRN ↔ treasury payment ↔ KRA confirmation
```

Checks performed, each producing a distinct exception type:

- **Every TicketFlow-taxable sale in the period has exactly one eTIMS invoice document.** Zero → `MISSING_ETIMS_INVOICE`. More than one → `DUPLICATE_ETIMS_INVOICE`.
- **Every refund requiring a credit note (`RefundTaxCalculation.requiresEtimsCreditNote`) has one.** Missing → `MISSING_CREDIT_NOTE`.
- **The prepared `TaxPeriod.outputVatMinor` still matches a live recomputation** from every active `TaxCalculation`/`RefundTaxCalculation` in the period. If new sales or refunds were recorded *after* the period was aggregated, they'll disagree → `VAT_MISMATCH` (with both figures in the exception metadata, and a note to re-run `aggregate-vat-period`).
- **Every `TaxPaymentRegistration` amount still matches its liability's amount** → `PRN_MISMATCH` if not (this should already be prevented at attach time; this is a second, independent check).
- **For every organizer-owned liability, the attached PRN's masked taxpayer PIN still matches the organizer's current registered KRA PIN** → `ORGANIZER_PIN_MISMATCH` if the organizer's profile PIN was changed after the PRN was attached.
- **Ledger balance**, same check as the daily run → `UNBALANCED_LEDGER`.

## Exception types

| Type | Meaning |
|---|---|
| `MISSING_ETIMS_INVOICE` | A taxable sale has no eTIMS invoice document |
| `DUPLICATE_ETIMS_INVOICE` | More than one eTIMS invoice exists for one order |
| `AMOUNT_MISMATCH` | A payment amount disagrees with the calculated customer payment |
| `VAT_MISMATCH` | Aggregated period VAT disagrees with a live recomputation |
| `MISSING_CREDIT_NOTE` | A refund that should have generated a credit note doesn't have one |
| `ORPHAN_PAYMENT` | A successful payment has no matching tax calculation |
| `DUPLICATE_PAYMENT` | More than one successful payment exists for one order |
| `PRN_MISMATCH` | A PRN's amount disagrees with its liability |
| `ORGANIZER_PIN_MISMATCH` | An attached PRN's taxpayer PIN disagrees with the organizer's current profile |
| `UNBALANCED_LEDGER` | A posted journal entry does not balance (should be structurally impossible) |
| `MISSING_SETTLEMENT` | Tax was calculated but no successful payment was ever recorded |

## Recovery after a reconciliation exception

There is no "auto-fix" button by design. The general procedure:

1. Read the exception's `description` and `metadata` (both figures are usually included for `*_MISMATCH` types).
2. Cross-reference `GET /admin/tax/audit-events?entityType=...&entityId=...` for the full history of the affected record.
3. Fix the *root cause* — e.g. re-run `POST /admin/tax/periods/:period/aggregate` if `VAT_MISMATCH` was caused by late-arriving sales, or resubmit an eTIMS document (`etims.retry`) if `MISSING_ETIMS_INVOICE`.
4. Resolve the exception with a note explaining what was done: `POST /admin/tax/reconciliation/exceptions/:id/resolve`.

## What this does not cover yet

- Reconciliation against the **filed return figures** and **KRA's own records** is only checked indirectly (via the PRN amount and `kraConfirmationReference` on the remittance) — there is no automated feed from iTax to compare against, since no such KRA API is available to this codebase. Comparing against the actual filed return remains a manual step for now (cross-check the iTax-generated return PDF against `GET /admin/tax/periods/:period/report`).
- Input VAT and withholding-VAT credits entered via `POST /admin/tax/periods/:period/adjustments` are taken as given once approved (`tax.liability.approve`) — this module does not independently verify that a claimed input-VAT credit is itself valid/allowable. That determination belongs to whoever prepares the return.
