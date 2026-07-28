import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPaymentAdapter } from "../kra-payment/kra-payment.interface";
import {
  ApprovedTaxLiabilityForPayment,
  TaxPaymentReceipt,
  TaxPaymentStatus,
  VerifiedPrnForPayment,
} from "../../domain/remittance/tax-remittance.types";
import { TaxAuditService } from "../../infrastructure/repositories/tax-audit.service";

export class TaxPaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxPaymentConfigurationError";
  }
}

/**
 * The "real" production tax-payment adapter, used when
 * CompanyTaxProfile.taxPaymentMode is APPROVED_BANK_INTEGRATION or
 * APPROVED_MPESA_INTEGRATION. It is interface-ready but has NO working
 * production implementation, because:
 *
 *  - There is no publicly documented KRA API to programmatically pay a
 *    PRN. Real payment happens via a bank/PayBill channel KRA publishes.
 *  - Wiring a real BankTransferClient/MpesaTaxPaymentClient requires a
 *    signed banking agreement or Safaricom B2B PayBill onboarding this
 *    codebase cannot assume exists.
 *
 * This class therefore ALWAYS fails closed: it never fabricates a
 * successful payment, never marks a liability PAID, and never silently
 * no-ops. It raises TaxPaymentConfigurationError, records a
 * REQUIRES_REVIEW remittance state (not stuck at PENDING) and writes an
 * audit event so operations is notified. See
 * docs/ticketflow-tax-payment-runbook.md "Production readiness checklist"
 * for what must be supplied before this can be completed:
 *   1. A concrete BankTransferClient or MpesaTaxPaymentClient
 *      implementation built against a specific bank/Safaricom B2B
 *      contract (not invented here).
 *   2. KRA_PAYMENT_CHANNEL, KRA_PAYBILL_NUMBER or KRA_TAX_BANK_ACCOUNT_TOKEN
 *      configured and verified against KRA's current published channel
 *      (this changes — ops must re-verify before every production
 *      enablement, not just once).
 *
 * The idempotency key `TAX-PAYMENT:{liabilityId}` is enforced upstream by
 * TaxRemittanceService (unique DB constraint) — this adapter never
 * re-derives or trusts an amount from the caller; it only ever uses
 * `liability.amountMinor` from the already-approved liability record.
 */
@Injectable()
export class ApprovedTreasuryPaymentAdapter implements TaxPaymentAdapter {
  private readonly logger = new Logger("ApprovedTreasuryPaymentAdapter");

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private audit: TaxAuditService,
  ) {}

  async remit(
    remittanceId: string,
    liability: ApprovedTaxLiabilityForPayment,
    registration: VerifiedPrnForPayment,
  ): Promise<TaxPaymentReceipt> {
    void registration;
    const channel = this.configService.get<string>("KRA_PAYMENT_CHANNEL");
    const paybill = this.configService.get<string>("KRA_PAYBILL_NUMBER");
    const bankAccountToken = this.configService.get<string>(
      "KRA_TAX_BANK_ACCOUNT_TOKEN",
    );

    const reason =
      !channel || (!paybill && !bankAccountToken)
        ? "KRA_PAYMENT_CHANNEL / KRA_PAYBILL_NUMBER / KRA_TAX_BANK_ACCOUNT_TOKEN are not fully configured."
        : "No certified BankTransferClient/MpesaTaxPaymentClient production implementation is installed in this deployment.";

    await this.prisma.taxRemittance.update({
      where: { id: remittanceId },
      data: { status: "REQUIRES_REVIEW", failureReason: reason },
    });

    await this.audit.log({
      action: "TAX_PAYMENT_BLOCKED_NOT_CONFIGURED",
      entityType: "TaxRemittance",
      entityId: remittanceId,
      metadata: { liabilityId: liability.id, reason },
    });

    this.logger.error(
      `Refusing to attempt a real tax payment for liability ${liability.id}: ${reason}`,
    );
    throw new TaxPaymentConfigurationError(
      `Cannot process this tax payment automatically: ${reason} Switch CompanyTaxProfile.taxPaymentMode to MANUAL_PRN (or SANDBOX for testing) until a certified integration is installed, or complete the production-readiness checklist in docs/ticketflow-tax-payment-runbook.md.`,
    );
  }

  async checkStatus(remittanceId: string): Promise<TaxPaymentStatus> {
    // A real implementation must treat an ambiguous/timed-out provider
    // response as REQUIRES_REVIEW (never silently retry the transfer and
    // never assume success) — see the runbook's "Recovery after payment
    // uncertainty" section. There is no live provider call to make here.
    const remittance = await this.prisma.taxRemittance.findUniqueOrThrow({
      where: { id: remittanceId },
    });
    return {
      remittanceId,
      status: remittance.status as TaxPaymentStatus["status"],
    };
  }
}
