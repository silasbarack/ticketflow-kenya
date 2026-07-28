import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  EtimsClient,
  EtimsCreditNoteResult,
  EtimsDocumentStatusResult,
  EtimsInvoiceResult,
  SubmitEtimsCreditNoteRequest,
  SubmitEtimsInvoiceRequest,
} from "./etims-client.interface";

/**
 * NON-PRODUCTION. Used when CompanyTaxProfile.etimsMode === 'SANDBOX'.
 * Simulates KRA eTIMS accepting an invoice/credit-note so the rest of the
 * pipeline (outbox, reconciliation, reporting) can be developed and
 * demoed without OSCU/VSCU certification. Every result is explicitly
 * SANDBOX_SIMULATED — never ACCEPTED — so it can never be mistaken for a
 * real fiscalised document downstream.
 */
@Injectable()
export class EtimsSandboxAdapter implements EtimsClient {
  private readonly logger = new Logger("EtimsSandboxAdapter");
  private readonly simulatedStore = new Map<
    string,
    EtimsDocumentStatusResult
  >();

  async submitInvoice(
    request: SubmitEtimsInvoiceRequest,
  ): Promise<EtimsInvoiceResult> {
    this.logger.warn(
      `SANDBOX eTIMS invoice submitted for ${request.externalReference} — NOT a real KRA fiscalisation.`,
    );
    const result: EtimsInvoiceResult = {
      externalReference: request.externalReference,
      status: "SANDBOX_SIMULATED",
      providerReference: `SANDBOX-INV-${randomUUID().slice(0, 8)}`,
    };
    this.simulatedStore.set(request.externalReference, {
      externalReference: request.externalReference,
      status: result.status,
    });
    return result;
  }

  async submitCreditNote(
    request: SubmitEtimsCreditNoteRequest,
  ): Promise<EtimsCreditNoteResult> {
    this.logger.warn(
      `SANDBOX eTIMS credit note submitted for ${request.externalReference} — NOT a real KRA fiscalisation.`,
    );
    const result: EtimsCreditNoteResult = {
      externalReference: request.externalReference,
      status: "SANDBOX_SIMULATED",
      providerReference: `SANDBOX-CN-${randomUUID().slice(0, 8)}`,
    };
    this.simulatedStore.set(request.externalReference, {
      externalReference: request.externalReference,
      status: result.status,
    });
    return result;
  }

  async getDocumentStatus(
    externalReference: string,
  ): Promise<EtimsDocumentStatusResult> {
    return (
      this.simulatedStore.get(externalReference) ?? {
        externalReference,
        status: "PENDING_SUBMISSION",
      }
    );
  }
}
