import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import {
  EtimsClient,
  EtimsCreditNoteResult,
  EtimsDocumentStatusResult,
  EtimsInvoiceResult,
  SubmitEtimsCreditNoteRequest,
  SubmitEtimsInvoiceRequest,
} from "./etims-client.interface";

export class EtimsNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EtimsNotConfiguredError";
  }
}

/**
 * Real OSCU/VSCU production adapter — DISABLED until TicketFlow is
 * onboarded, tested and certified by KRA for system-to-system eTIMS
 * integration (see docs/ticketflow-etims-integration.md "eTIMS sandbox
 * onboarding").
 *
 * This class deliberately implements NO wire protocol: KRA's OSCU/VSCU
 * technical specification (payload shape, transport, signing) is only
 * issued to onboarded taxpayers and must not be guessed at here. It only
 * checks that the required configuration (ETIMS_BASE_URL, ETIMS_CLIENT_ID,
 * ETIMS_CLIENT_SECRET, ETIMS_CERTIFICATE_PATH, ETIMS_PRIVATE_KEY_PATH) is
 * present and, even then, always fails closed with a clear error — it
 * never fabricates a SUBMITTED/ACCEPTED result. Wiring the real HTTP/mTLS
 * calls is the integration work that must happen after certification.
 */
@Injectable()
export class EtimsProductionAdapter implements EtimsClient {
  private readonly logger = new Logger("EtimsProductionAdapter");

  constructor(private configService: ConfigService) {}

  private checkConfiguration(): string[] {
    const missing: string[] = [];
    for (const key of [
      "ETIMS_BASE_URL",
      "ETIMS_CLIENT_ID",
      "ETIMS_CLIENT_SECRET",
      "ETIMS_CERTIFICATE_PATH",
      "ETIMS_PRIVATE_KEY_PATH",
    ]) {
      const value = this.configService.get<string>(key);
      if (!value) {
        missing.push(key);
        continue;
      }
      if (
        (key === "ETIMS_CERTIFICATE_PATH" ||
          key === "ETIMS_PRIVATE_KEY_PATH") &&
        !fs.existsSync(value)
      ) {
        missing.push(`${key} (file not found at "${value}")`);
      }
    }
    return missing;
  }

  private failClosed(operation: string): never {
    const missing = this.checkConfiguration();
    const reason =
      missing.length > 0
        ? `Missing/invalid configuration: ${missing.join(", ")}.`
        : "Configuration present, but no certified OSCU/VSCU wire implementation is installed in this codebase (KRA's technical specification is only issued after onboarding — see docs/ticketflow-etims-integration.md).";
    this.logger.error(`Refusing to ${operation}: ${reason}`);
    throw new EtimsNotConfiguredError(
      `eTIMS ${operation} is not available: ${reason}`,
    );
  }

  async submitInvoice(
    _request: SubmitEtimsInvoiceRequest,
  ): Promise<EtimsInvoiceResult> {
    this.failClosed("submit an eTIMS invoice");
  }

  async submitCreditNote(
    _request: SubmitEtimsCreditNoteRequest,
  ): Promise<EtimsCreditNoteResult> {
    this.failClosed("submit an eTIMS credit note");
  }

  async getDocumentStatus(
    _externalReference: string,
  ): Promise<EtimsDocumentStatusResult> {
    this.failClosed("query eTIMS document status");
  }
}
