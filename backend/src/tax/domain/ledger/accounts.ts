/**
 * Canonical chart-of-accounts codes for the tax/ledger module. These match
 * the rows seeded by prisma/seed-tax.ts into `tax_ledger_accounts`. Using a
 * const object (not a free-form string) at every call site keeps postings
 * typo-proof; the FK-less `accountCode` column on JournalLine is still
 * validated against this table by LedgerRepository before posting.
 */
export const LEDGER_ACCOUNTS = {
  CASH_MPESA_CLEARING: "CASH_MPESA_CLEARING",
  CARD_PROCESSOR_CLEARING: "CARD_PROCESSOR_CLEARING",
  CUSTOMER_REFUND_PAYABLE: "CUSTOMER_REFUND_PAYABLE",
  CLIENT_MONEY_ORGANIZER_FUNDS: "CLIENT_MONEY_ORGANIZER_FUNDS",
  ORGANIZER_PAYABLE: "ORGANIZER_PAYABLE",
  BOOKING_FEE_REVENUE: "BOOKING_FEE_REVENUE",
  COMMISSION_REVENUE: "COMMISSION_REVENUE",
  TICKETFLOW_VAT_PAYABLE: "TICKETFLOW_VAT_PAYABLE",
  ORGANIZER_VAT_MEMO: "ORGANIZER_VAT_MEMO",
  PAYMENT_PROCESSING_EXPENSE: "PAYMENT_PROCESSING_EXPENSE",
  CHARGEBACK_EXPENSE: "CHARGEBACK_EXPENSE",
  TAX_PAYABLE: "TAX_PAYABLE",
  TAX_PAYMENT_CLEARING: "TAX_PAYMENT_CLEARING",
  BANK: "BANK",
  PROCESSOR_PAYABLE_CLEARING: "PROCESSOR_PAYABLE_CLEARING",
} as const;

export type LedgerAccountCode =
  (typeof LEDGER_ACCOUNTS)[keyof typeof LEDGER_ACCOUNTS];
