export type TaxRemittanceStatus =
  | "PENDING"
  | "AWAITING_EXTERNAL_CONFIRMATION"
  | "SUBMITTED"
  | "REQUIRES_REVIEW"
  | "PAID"
  | "FAILED"
  | "SANDBOX_SIMULATED";

export interface TaxPaymentReceipt {
  remittanceId: string;
  status: TaxRemittanceStatus;
  bankReference?: string;
  mpesaReference?: string;
  kraConfirmationReference?: string;
  failureReason?: string;
}

export interface TaxPaymentStatus {
  remittanceId: string;
  status: TaxRemittanceStatus;
}

export interface ApprovedTaxLiabilityForPayment {
  id: string;
  amountMinor: bigint;
  currency: "KES";
  taxHead: string;
  owner: "TICKETFLOW" | "ORGANIZER";
  organizerId: string | null;
}

export interface VerifiedPrnForPayment {
  id: string;
  prnEncrypted: string;
  amountMinor: bigint;
  currency: "KES";
}
