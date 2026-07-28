/**
 * Typed interface for a real bank-transfer rail. No production
 * implementation exists in this codebase — banks expose no standard
 * public API for this, and any real implementation must be built against
 * a specific bank's documented corporate-banking/RTGS API and a signed
 * agreement, never invented here. See docs/ticketflow-tax-payment-runbook.md.
 */
export interface BankTransferRequest {
  idempotencyKey: string;
  fromAccountToken: string;
  toAccountOrPrn: string;
  amountMinor: bigint;
  currency: "KES";
  narrative: string;
}

export interface BankTransferResult {
  reference: string;
  status: "SUBMITTED" | "FAILED" | "REQUIRES_REVIEW";
}

export interface BankTransferClient {
  transfer(request: BankTransferRequest): Promise<BankTransferResult>;
  checkStatus(reference: string): Promise<BankTransferResult>;
}
