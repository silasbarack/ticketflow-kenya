import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  BankTransferClient,
  BankTransferRequest,
  BankTransferResult,
} from "./bank-transfer.interface";
import {
  MpesaTaxPaymentClient,
  MpesaTaxPaymentRequest,
  MpesaTaxPaymentResult,
} from "./mpesa-tax-payment.interface";

/**
 * NON-PRODUCTION. Simulates a treasury rail (bank transfer or M-Pesa
 * B2B/PayBill) purely for local dev/test wiring of
 * ApprovedTreasuryPaymentAdapter. It is intentionally not registered
 * anywhere that could reach a real tax payment path in production — see
 * ApprovedTreasuryPaymentAdapter, which never uses this class and instead
 * fails closed until a real, config-guarded implementation is supplied.
 */
@Injectable()
export class MockTreasuryAdapter
  implements BankTransferClient, MpesaTaxPaymentClient
{
  private readonly logger = new Logger("MockTreasuryAdapter");

  async transfer(request: BankTransferRequest): Promise<BankTransferResult> {
    this.logger.warn(
      `MOCK treasury bank transfer for ${request.idempotencyKey} — not a real transfer.`,
    );
    return {
      reference: `MOCK-BANK-${randomUUID().slice(0, 8)}`,
      status: "SUBMITTED",
    };
  }

  async pay(request: MpesaTaxPaymentRequest): Promise<MpesaTaxPaymentResult> {
    this.logger.warn(
      `MOCK treasury M-Pesa tax payment for ${request.idempotencyKey} — not a real payment.`,
    );
    return { mpesaReceiptNumber: `MOCK${Date.now()}`, status: "SUBMITTED" };
  }

  async checkStatus(): Promise<BankTransferResult & MpesaTaxPaymentResult> {
    return {
      reference: "MOCK",
      mpesaReceiptNumber: "MOCK",
      status: "SUBMITTED",
    };
  }
}
