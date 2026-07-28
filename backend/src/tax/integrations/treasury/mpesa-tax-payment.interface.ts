/**
 * Typed interface for an M-Pesa-based tax payment rail (e.g. Business Till
 * / PayBill to KRA's official tax PayBill). No production implementation
 * exists here — the existing MpesaService (src/mpesa/mpesa.service.ts)
 * only implements Lipa na M-Pesa Online (STK Push) for customer checkout;
 * a business-to-business tax PayBill payment is a different Daraja API
 * (B2B / Business PayBill) requiring separate KRA-published PayBill
 * details (KRA_PAYBILL_NUMBER) and Safaricom onboarding this codebase
 * does not assume exists yet.
 */
export interface MpesaTaxPaymentRequest {
  idempotencyKey: string;
  payBillNumber: string;
  accountReference: string; // the PRN
  amountMinor: bigint;
  currency: "KES";
}

export interface MpesaTaxPaymentResult {
  mpesaReceiptNumber?: string;
  status: "SUBMITTED" | "FAILED" | "REQUIRES_REVIEW";
}

export interface MpesaTaxPaymentClient {
  pay(request: MpesaTaxPaymentRequest): Promise<MpesaTaxPaymentResult>;
  checkStatus(idempotencyKey: string): Promise<MpesaTaxPaymentResult>;
}
