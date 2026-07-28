import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxAuditService } from "./tax-audit.service";

export interface CreateTaxAdjustmentInput {
  periodId: string;
  type: "DEBIT" | "CREDIT";
  category:
    | "INPUT_VAT"
    | "WITHHOLDING_VAT_CREDIT"
    | "CREDIT_NOTE"
    | "DEBIT_NOTE"
    | "OTHER";
  amountMinor: bigint;
  reason: string;
  evidenceRef?: string;
}

/**
 * Finance-entered VAT-period adjustments (imported input VAT, withholding
 * VAT credits, manual debit/credit notes). Not every supplier expense
 * qualifies for input VAT — this module records what finance asserts is
 * allowable; it does not itself validate supplier VAT eligibility.
 */
@Injectable()
export class TaxAdjustmentService {
  constructor(
    private prisma: PrismaService,
    private audit: TaxAuditService,
  ) {}

  async create(input: CreateTaxAdjustmentInput, actorUserId: string) {
    const period = await this.prisma.taxPeriod.findUnique({
      where: { id: input.periodId },
    });
    if (!period) throw new NotFoundException("Tax period not found");
    if (period.status === "CLOSED") {
      throw new Error("Cannot add adjustments to a CLOSED tax period");
    }
    if (input.amountMinor < 0n) {
      throw new Error(
        "Adjustment amount must be non-negative — use `type` to indicate direction",
      );
    }

    const adjustment = await this.prisma.taxAdjustment.create({
      data: {
        periodId: input.periodId,
        type: input.type,
        category: input.category,
        amountMinor: input.amountMinor,
        reason: input.reason,
        evidenceRef: input.evidenceRef,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      action: "TAX_ADJUSTMENT_CREATED",
      entityType: "TaxAdjustment",
      entityId: adjustment.id,
      actorUserId,
      metadata: {
        periodId: input.periodId,
        type: input.type,
        category: input.category,
        amountMinor: input.amountMinor.toString(),
      },
    });

    return adjustment;
  }

  async approve(id: string, actorUserId: string) {
    const adjustment = await this.prisma.taxAdjustment.update({
      where: { id },
      data: { approvedBy: actorUserId },
    });
    await this.audit.log({
      action: "TAX_ADJUSTMENT_APPROVED",
      entityType: "TaxAdjustment",
      entityId: adjustment.id,
      actorUserId,
      metadata: { periodId: adjustment.periodId },
    });
    return adjustment;
  }

  async listForPeriod(periodId: string) {
    return this.prisma.taxAdjustment.findMany({
      where: { periodId },
      orderBy: { createdAt: "desc" },
    });
  }
}
