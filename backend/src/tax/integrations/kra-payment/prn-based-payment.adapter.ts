import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxPaymentAdapter } from "./kra-payment.interface";
import {
  ApprovedTaxLiabilityForPayment,
  TaxPaymentReceipt,
  TaxPaymentStatus,
  VerifiedPrnForPayment,
} from "../../domain/remittance/tax-remittance.types";
import { assertDifferentActors } from "../../domain/permissions/tax-permission.types";
import { TaxAuditService } from "../../infrastructure/repositories/tax-audit.service";

export interface RecordExternalConfirmationInput {
  bankReference?: string;
  mpesaReference?: string;
  evidenceFileRef?: string;
  kraConfirmationReference?: string;
}

/**
 * Default production-capable adapter (CompanyTaxProfile.taxPaymentMode ===
 * 'MANUAL_PRN'). TicketFlow has no automated way to pay a PRN — Kenyan tax
 * payment against a PRN happens through a bank, M-Pesa PayBill, or iTax
 * itself, initiated by a human. This adapter's job is to track that
 * out-of-band payment with an auditable, maker-checker-controlled record,
 * NOT to perform it.
 *
 * remit() only marks the remittance AWAITING_EXTERNAL_CONFIRMATION — an
 * authorised finance user must actually make the payment through the
 * verified official channel, then call recordExternalConfirmation() with
 * evidence. If TAX_MAKER_CHECKER_ENABLED, the user recording the evidence
 * (maker) and the user confirming it (checker) must differ.
 */
@Injectable()
export class ManualPrnPaymentAdapter implements TaxPaymentAdapter {
  private readonly logger = new Logger("ManualPrnPaymentAdapter");

  constructor(
    private prisma: PrismaService,
    private audit: TaxAuditService,
  ) {}

  async remit(
    remittanceId: string,
    liability: ApprovedTaxLiabilityForPayment,
    registration: VerifiedPrnForPayment,
  ): Promise<TaxPaymentReceipt> {
    this.logger.log(
      `Tax liability ${liability.id} now awaiting manual external payment via PRN registration ${registration.id} (remittance ${remittanceId}).`,
    );
    await this.prisma.taxRemittance.update({
      where: { id: remittanceId },
      data: { status: "AWAITING_EXTERNAL_CONFIRMATION" },
    });
    return { remittanceId, status: "AWAITING_EXTERNAL_CONFIRMATION" };
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

  /**
   * Records that an authorised finance user actually made the payment
   * through the bank/M-Pesa/iTax channel, with evidence. This is the
   * "maker" step — recordConfirmationApproval() below is the "checker"
   * step that finalises PAID.
   */
  async recordExternalConfirmation(
    remittanceId: string,
    input: RecordExternalConfirmationInput,
    recordedBy: string,
    makerCheckerEnabled: boolean,
  ) {
    const remittance = await this.prisma.taxRemittance.findUnique({
      where: { id: remittanceId },
    });
    if (!remittance) throw new NotFoundException("Remittance not found");
    if (remittance.status !== "AWAITING_EXTERNAL_CONFIRMATION") {
      throw new BadRequestException(
        `Remittance is ${remittance.status} — expected AWAITING_EXTERNAL_CONFIRMATION`,
      );
    }
    if (!input.bankReference && !input.mpesaReference) {
      throw new BadRequestException(
        "A bank or M-Pesa payment reference is required as evidence of the external payment",
      );
    }

    const updated = await this.prisma.taxRemittance.update({
      where: { id: remittanceId },
      data: {
        bankReference: input.bankReference,
        mpesaReference: input.mpesaReference,
        evidenceFileRef: input.evidenceFileRef,
        kraConfirmationReference: input.kraConfirmationReference,
        status: makerCheckerEnabled ? "SUBMITTED" : "PAID",
        confirmedBy: makerCheckerEnabled ? undefined : recordedBy,
        confirmedAt: makerCheckerEnabled ? undefined : new Date(),
      },
    });

    await this.audit.log({
      action: "TAX_PAYMENT_EXTERNAL_CONFIRMATION_RECORDED",
      entityType: "TaxRemittance",
      entityId: remittanceId,
      actorUserId: recordedBy,
      metadata: {
        bankReference: input.bankReference,
        mpesaReference: input.mpesaReference,
        requiresSecondApproval: makerCheckerEnabled,
      },
    });

    return updated;
  }

  /** The "checker" step — required whenever maker-checker is enabled and skipped only when it's disabled (recordExternalConfirmation already finalised PAID in that case). */
  async confirmBySecondApprover(remittanceId: string, confirmedBy: string) {
    const remittance = await this.prisma.taxRemittance.findUnique({
      where: { id: remittanceId },
    });
    if (!remittance) throw new NotFoundException("Remittance not found");
    if (remittance.status !== "SUBMITTED") {
      throw new BadRequestException(
        `Remittance is ${remittance.status} — expected SUBMITTED (awaiting second-approver confirmation)`,
      );
    }
    assertDifferentActors(
      "TAX_PAYMENT_CONFIRM",
      remittance.initiatedBy,
      confirmedBy,
    );

    const updated = await this.prisma.taxRemittance.update({
      where: { id: remittanceId },
      data: { status: "PAID", confirmedBy, confirmedAt: new Date() },
    });

    await this.audit.log({
      action: "TAX_PAYMENT_CONFIRMED",
      entityType: "TaxRemittance",
      entityId: remittanceId,
      actorUserId: confirmedBy,
      metadata: { liabilityId: remittance.liabilityId },
    });

    return updated;
  }
}
