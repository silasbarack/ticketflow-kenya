import {
  ApprovedTaxLiabilityForPayment,
  TaxPaymentReceipt,
  TaxPaymentStatus,
  VerifiedPrnForPayment,
} from "../../domain/remittance/tax-remittance.types";

/**
 * Adapter boundary between TicketFlow and however a KRA tax bill actually
 * gets paid. This is NOT an eTIMS client (see integrations/etims) — eTIMS
 * is invoicing, this is tax remittance against a PRN. See
 * docs/ticketflow-tax-payment-runbook.md for why these are separate
 * processes and there is no documented public "pay my PRN" KRA API this
 * codebase can call.
 */
export interface TaxPaymentAdapter {
  remit(
    remittanceId: string,
    liability: ApprovedTaxLiabilityForPayment,
    registration: VerifiedPrnForPayment,
  ): Promise<TaxPaymentReceipt>;
  checkStatus(remittanceId: string): Promise<TaxPaymentStatus>;
}
