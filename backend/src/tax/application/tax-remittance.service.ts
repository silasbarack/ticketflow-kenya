import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TaxLiabilityService } from "../infrastructure/repositories/tax-liability.service";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";
import { MockKraPaymentAdapter } from "../integrations/kra-payment/mock-kra-payment.adapter";
import {
  ManualPrnPaymentAdapter,
  RecordExternalConfirmationInput,
} from "../integrations/kra-payment/prn-based-payment.adapter";
import { ApprovedTreasuryPaymentAdapter } from "../integrations/treasury/approved-treasury-payment.adapter";
import { TaxPaymentAdapter } from "../integrations/kra-payment/kra-payment.interface";

/**
 * Application-layer use cases: "initiate-tax-payment" and
 * "confirm-tax-payment". Selects the adapter from
 * CompanyTaxProfile.taxPaymentMode; never lets the API caller choose an
 * adapter or an amount — the amount always comes from the approved
 * TaxLiability row.
 */
@Injectable()
export class TaxRemittanceService {
  constructor(
    private prisma: PrismaService,
    private liabilities: TaxLiabilityService,
    private mockAdapter: MockKraPaymentAdapter,
    private manualAdapter: ManualPrnPaymentAdapter,
    private approvedAdapter: ApprovedTreasuryPaymentAdapter,
    private audit: TaxAuditService,
    private configService: ConfigService,
  ) {}

  private makerCheckerEnabled(): boolean {
    return (
      this.configService.get<string>("TAX_MAKER_CHECKER_ENABLED") !== "false"
    );
  }

  private async selectAdapter(): Promise<{
    adapter: TaxPaymentAdapter;
    adapterType: "MOCK" | "MANUAL_PRN" | "APPROVED_TREASURY";
  }> {
    const profile = await this.prisma.companyTaxProfile.findUnique({
      where: { id: "default" },
    });
    const mode = profile?.taxPaymentMode ?? "MANUAL_PRN";
    if (mode === "SANDBOX")
      return { adapter: this.mockAdapter, adapterType: "MOCK" };
    if (
      mode === "APPROVED_BANK_INTEGRATION" ||
      mode === "APPROVED_MPESA_INTEGRATION"
    ) {
      return {
        adapter: this.approvedAdapter,
        adapterType: "APPROVED_TREASURY",
      };
    }
    return { adapter: this.manualAdapter, adapterType: "MANUAL_PRN" };
  }

  async initiate(liabilityId: string, actorUserId: string) {
    const liability = await this.liabilities.getOrThrow(liabilityId);
    const idempotencyKey = `TAX-PAYMENT:${liabilityId}`;

    let remittance = await this.prisma.taxRemittance.findUnique({
      where: { idempotencyKey },
    });

    if (
      remittance &&
      ["PAID", "SANDBOX_SIMULATED"].includes(remittance.status)
    ) {
      return remittance; // already paid — return the existing receipt, never re-pay.
    }
    if (
      remittance &&
      ["PENDING", "AWAITING_EXTERNAL_CONFIRMATION", "SUBMITTED"].includes(
        remittance.status,
      )
    ) {
      return remittance; // already in flight — idempotent no-op.
    }

    if (!remittance) {
      if (liability.status !== "PRN_ATTACHED") {
        throw new BadRequestException(
          `Liability ${liabilityId} is ${liability.status} — a PRN must be attached and verified before payment can be initiated`,
        );
      }
      const registration = await this.prisma.taxPaymentRegistration.findFirst({
        where: { liabilityId, verificationStatus: "VERIFIED" },
        orderBy: { createdAt: "desc" },
      });
      if (!registration)
        throw new BadRequestException(
          "No verified PRN is attached to this liability",
        );

      const { adapterType } = await this.selectAdapter();
      try {
        remittance = await this.prisma.taxRemittance.create({
          data: {
            liabilityId,
            registrationId: registration.id,
            adapter: adapterType,
            status: "PENDING",
            amountMinor: liability.amountMinor,
            currency: liability.currency,
            idempotencyKey,
            initiatedBy: actorUserId,
            requiresSecondApproval: this.makerCheckerEnabled(),
          },
        });
      } catch (error: unknown) {
        // A concurrent request may have won the race on the unique
        // idempotencyKey constraint between our lookup and this create —
        // fall back to the row it created instead of erroring.
        const concurrent = await this.prisma.taxRemittance.findUnique({
          where: { idempotencyKey },
        });
        if (!concurrent) throw error;
        return concurrent;
      }
      await this.liabilities.transitionTo(
        liabilityId,
        "PAYMENT_PROCESSING",
        actorUserId,
        "TAX_PAYMENT_INITIATED",
      );
    } else if (remittance.status === "FAILED") {
      if (liability.status !== "FAILED") {
        throw new BadRequestException(
          `Cannot retry: liability ${liabilityId} is ${liability.status}, expected FAILED`,
        );
      }
      await this.liabilities.transitionTo(
        liabilityId,
        "PAYMENT_PROCESSING",
        actorUserId,
        "TAX_PAYMENT_RETRIED",
      );
    } else {
      // REQUIRES_REVIEW: retrying automatically is not allowed — needs human investigation first.
      throw new BadRequestException(
        `Remittance ${remittance.id} is REQUIRES_REVIEW and cannot be auto-retried — investigate and resolve it first (see docs/ticketflow-tax-payment-runbook.md).`,
      );
    }

    const registration =
      await this.prisma.taxPaymentRegistration.findUniqueOrThrow({
        where: { id: remittance.registrationId! },
      });
    const { adapter } = await this.selectAdapter();

    try {
      await adapter.remit(
        remittance.id,
        {
          id: liability.id,
          amountMinor: liability.amountMinor,
          currency: liability.currency as "KES",
          taxHead: liability.taxHead,
          owner: liability.owner,
          organizerId: liability.organizerId,
        },
        {
          id: registration.id,
          prnEncrypted: registration.prnEncrypted,
          amountMinor: registration.amountMinor,
          currency: registration.currency as "KES",
        },
      );
      await this.audit.log({
        action: "TAX_PAYMENT_REMIT_ATTEMPTED",
        entityType: "TaxRemittance",
        entityId: remittance.id,
        actorUserId,
        metadata: { liabilityId },
      });
    } catch (error: unknown) {
      const refreshed = await this.prisma.taxRemittance.findUnique({
        where: { id: remittance.id },
      });
      if (refreshed?.status === "REQUIRES_REVIEW") {
        await this.liabilities.transitionTo(
          liabilityId,
          "REQUIRES_REVIEW",
          actorUserId,
          "TAX_LIABILITY_REQUIRES_REVIEW_PAYMENT_BLOCKED",
        );
      }
      throw error;
    }

    return this.prisma.taxRemittance.findUniqueOrThrow({
      where: { id: remittance.id },
    });
  }

  async recordExternalConfirmation(
    remittanceId: string,
    input: RecordExternalConfirmationInput,
    actorUserId: string,
  ) {
    const before = await this.prisma.taxRemittance.findUnique({
      where: { id: remittanceId },
    });
    if (!before) throw new NotFoundException("Remittance not found");

    const makerChecker = this.makerCheckerEnabled();
    const updated = await this.manualAdapter.recordExternalConfirmation(
      remittanceId,
      input,
      actorUserId,
      makerChecker,
    );

    if (updated.status === "PAID") {
      await this.finalizePaid(
        updated.liabilityId,
        actorUserId,
        updated.kraConfirmationReference,
      );
    }
    return updated;
  }

  async confirmBySecondApprover(remittanceId: string, actorUserId: string) {
    const updated = await this.manualAdapter.confirmBySecondApprover(
      remittanceId,
      actorUserId,
    );
    await this.finalizePaid(
      updated.liabilityId,
      actorUserId,
      updated.kraConfirmationReference,
    );
    return updated;
  }

  private async finalizePaid(
    liabilityId: string,
    actorUserId: string,
    kraConfirmationReference: string | null,
  ) {
    await this.liabilities.transitionTo(
      liabilityId,
      "PAID",
      actorUserId,
      "TAX_LIABILITY_PAID",
    );
    if (kraConfirmationReference) {
      await this.liabilities.transitionTo(
        liabilityId,
        "KRA_CONFIRMED",
        actorUserId,
        "TAX_LIABILITY_KRA_CONFIRMED",
      );
    }
  }

  async findById(remittanceId: string) {
    const remittance = await this.prisma.taxRemittance.findUnique({
      where: { id: remittanceId },
    });
    if (!remittance) throw new NotFoundException("Remittance not found");
    return remittance;
  }
}
