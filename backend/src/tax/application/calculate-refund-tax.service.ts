import { Injectable, NotFoundException } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TaxRuleRepository } from "../infrastructure/repositories/tax-rule.repository";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";
import { RefundLedgerPostingService } from "./post-refund-ledger-entries.service";
import {
  calculateRefundTax,
  RefundTaxRates,
} from "../domain/refund/calculate-refund-tax.logic";
import {
  CalculateRefundTaxInput,
  RefundTaxCalculation,
} from "../domain/refund/refund-tax.types";
import {
  refundCalculationToRow,
  rowToRefundCalculation,
} from "../infrastructure/serializers/refund-tax.mapper";

export interface PersistRefundCalculationOptions {
  actorUserId?: string;
  postToLedger: boolean;
}

/**
 * Application-layer use case: "calculate-refund-tax". Reuses the SAME
 * historical tax rules the original sale was calculated with (looked up
 * from the original TaxCalculation.ruleVersionIds), never today's rates —
 * a refund of a two-year-old sale must reverse exactly what was charged
 * then, even if VAT rates have since changed.
 */
@Injectable()
export class CalculateRefundTaxService {
  constructor(
    private prisma: PrismaService,
    private taxRules: TaxRuleRepository,
    private ledgerPosting: RefundLedgerPostingService,
    private audit: TaxAuditService,
  ) {}

  private async resolveHistoricalRates(
    originalRuleVersionIds: string[],
  ): Promise<RefundTaxRates> {
    const rules = await Promise.all(
      originalRuleVersionIds.map((id) => this.taxRules.findById(id)),
    );
    const tfRule = rules.find(
      (r) => r?.code === "TICKETFLOW_PLATFORM_OUTPUT_VAT",
    );
    const orgRule = rules.find(
      (r) => r?.code === "ORGANIZER_TICKET_OUTPUT_VAT",
    );
    if (!tfRule || !orgRule) {
      throw new NotFoundException(
        "Could not resolve the historical tax rules used by the original sale — the original TaxCalculation may be corrupted or the rules were deleted (rules should only ever be disabled, never deleted).",
      );
    }
    return {
      ticketFlowVatRateBps: tfRule.rateBps,
      ticketFlowRuleId: tfRule.id,
      ticketFlowRoundingMode: tfRule.roundingMode,
      organizerVatRateBps: orgRule.rateBps,
      organizerRuleId: orgRule.id,
      organizerRoundingMode: orgRule.roundingMode,
    };
  }

  async preview(
    input: CalculateRefundTaxInput,
    originalRuleVersionIds: string[],
  ): Promise<RefundTaxCalculation> {
    const rates = await this.resolveHistoricalRates(originalRuleVersionIds);
    return calculateRefundTax(input, rates, uuidv4);
  }

  async calculateAndPersist(
    input: CalculateRefundTaxInput,
    originalRuleVersionIds: string[],
    options: PersistRefundCalculationOptions,
  ): Promise<{
    calculation: RefundTaxCalculation;
    alreadyExisted: boolean;
    journalEntryIds: string[];
  }> {
    const rates = await this.resolveHistoricalRates(originalRuleVersionIds);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.refundTaxCalculation.findUnique({
        where: { refundId: input.refundId },
      });
      if (existing) {
        return {
          calculation: rowToRefundCalculation(existing),
          alreadyExisted: true,
          journalEntryIds: [],
        };
      }

      const calculation = calculateRefundTax(input, rates, uuidv4);
      await tx.refundTaxCalculation.create({
        data: refundCalculationToRow(calculation, input, options.actorUserId),
      });

      let journalEntryIds: string[] = [];
      if (options.postToLedger) {
        const organizerRow = await tx.taxCalculation.findUnique({
          where: { id: input.originalCalculationId },
        });
        const organizerId = organizerRow?.organizerId ?? "UNKNOWN";
        const entries = await this.ledgerPosting.postRefund(tx, {
          refundCalculation: calculation,
          orderId: input.orderId,
          organizerId,
          clearingAccount: "CASH_MPESA_CLEARING",
          postedBy: options.actorUserId,
        });
        journalEntryIds = entries.map((e) => e.id);
      }

      await this.audit.log({
        tx,
        action: "REFUND_TAX_CALCULATED",
        entityType: "RefundTaxCalculation",
        entityId: calculation.calculationId,
        actorUserId: options.actorUserId,
        correlationId: calculation.calculationId,
        afterHash: calculation.calculationHash,
        metadata: {
          orderId: input.orderId,
          refundId: input.refundId,
          reason: input.reason,
          organizerAlreadySettled: input.organizerAlreadySettled,
          postedToLedger: options.postToLedger,
          warnings: calculation.warnings,
        },
      });

      return { calculation, alreadyExisted: false, journalEntryIds };
    });
  }
}
