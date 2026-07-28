import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPaymentAdapter } from "./kra-payment.interface";
import {
  ApprovedTaxLiabilityForPayment,
  TaxPaymentReceipt,
  TaxPaymentStatus,
  VerifiedPrnForPayment,
} from "../../domain/remittance/tax-remittance.types";

/**
 * NON-PRODUCTION. Used when CompanyTaxProfile.taxPaymentMode === 'SANDBOX'.
 * Simulates a tax payment for local development/testing/demos. It never
 * reports PAID or KRA_CONFIRMED — only SANDBOX_SIMULATED — so a sandbox
 * run can never be mistaken for a real filed/paid liability downstream
 * (reconciliation explicitly treats SANDBOX_SIMULATED as unpaid).
 */
@Injectable()
export class MockKraPaymentAdapter implements TaxPaymentAdapter {
  private readonly logger = new Logger("MockKraPaymentAdapter");

  constructor(private prisma: PrismaService) {}

  async remit(
    remittanceId: string,
    liability: ApprovedTaxLiabilityForPayment,
    registration: VerifiedPrnForPayment,
  ): Promise<TaxPaymentReceipt> {
    this.logger.warn(
      `SANDBOX tax payment simulated for liability ${liability.id} (remittance ${remittanceId}) — this is NOT a real KRA payment.`,
    );
    await this.prisma.taxRemittance.update({
      where: { id: remittanceId },
      data: {
        status: "SANDBOX_SIMULATED",
        bankReference: `SANDBOX-${remittanceId.slice(0, 8)}`,
      },
    });
    void registration;
    return {
      remittanceId,
      status: "SANDBOX_SIMULATED",
      bankReference: `SANDBOX-${remittanceId.slice(0, 8)}`,
    };
  }

  async checkStatus(remittanceId: string): Promise<TaxPaymentStatus> {
    const remittance = await this.prisma.taxRemittance.findUniqueOrThrow({
      where: { id: remittanceId },
    });
    return {
      remittanceId,
      status: remittance.status as TaxPaymentStatus["status"],
    };
  }
}
