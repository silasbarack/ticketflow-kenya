export type EtimsDocumentStatus =
  | "PENDING_CONFIGURATION"
  | "PENDING_SUBMISSION"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REJECTED"
  | "SANDBOX_SIMULATED"
  | "REQUIRES_REVIEW";

export interface EtimsInvoiceLine {
  description: string;
  quantity: number;
  unitPriceMinor: bigint;
  taxableAmountMinor: bigint;
  vatRateBps: number;
  vatAmountMinor: bigint;
  totalMinor: bigint;
}

export interface SubmitEtimsInvoiceRequest {
  idempotencyKey: string;
  externalReference: string;
  sellerLegalName: string;
  sellerKraPin: string;
  buyerName?: string;
  buyerKraPin?: string;
  invoiceNumber: string;
  invoiceDateTime: string;
  currency: "KES";
  lines: EtimsInvoiceLine[];
  totalTaxableAmountMinor: bigint;
  totalVatAmountMinor: bigint;
  totalAmountMinor: bigint;
}

export interface SubmitEtimsCreditNoteRequest {
  idempotencyKey: string;
  externalReference: string;
  originalInvoiceExternalReference: string;
  sellerLegalName: string;
  sellerKraPin: string;
  buyerName?: string;
  buyerKraPin?: string;
  creditNoteNumber: string;
  creditNoteDateTime: string;
  reason: string;
  currency: "KES";
  lines: EtimsInvoiceLine[];
  totalTaxableAmountMinor: bigint;
  totalVatAmountMinor: bigint;
  totalAmountMinor: bigint;
}

export interface EtimsInvoiceResult {
  externalReference: string;
  status: EtimsDocumentStatus;
  providerReference?: string;
  rawResponse?: unknown;
}

export interface EtimsCreditNoteResult {
  externalReference: string;
  status: EtimsDocumentStatus;
  providerReference?: string;
  rawResponse?: unknown;
}

export interface EtimsDocumentStatusResult {
  externalReference: string;
  status: EtimsDocumentStatus;
}

/**
 * Boundary to KRA eTIMS (electronic Tax Invoice Management System) via
 * OSCU (Online Sales Control Unit) or VSCU (Virtual Sales Control Unit)
 * system-to-system integration.
 *
 * eTIMS is invoicing/fiscalisation, NOT tax payment — see
 * docs/ticketflow-etims-integration.md for why these are legally and
 * technically separate KRA processes and must not be conflated.
 *
 * TicketFlow may only use OSCU/VSCU after being properly onboarded,
 * tested and certified by KRA — this interface exists so that
 * integration, once certified, plugs in behind EtimsProductionAdapter
 * without touching calling code. Until then, EtimsProductionAdapter fails
 * closed (see that file) and only EtimsSandboxAdapter is usable.
 */
export interface EtimsClient {
  submitInvoice(
    request: SubmitEtimsInvoiceRequest,
  ): Promise<EtimsInvoiceResult>;
  submitCreditNote(
    request: SubmitEtimsCreditNoteRequest,
  ): Promise<EtimsCreditNoteResult>;
  getDocumentStatus(
    externalReference: string,
  ): Promise<EtimsDocumentStatusResult>;
}
