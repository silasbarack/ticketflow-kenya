import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TaxRuleRepository } from "../infrastructure/repositories/tax-rule.repository";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";
import { TicketSaleLedgerPostingService } from "./post-ticket-sale-ledger-entries.service";
import {
  calculateTicketSaleTax,
  TicketSaleTaxRates,
} from "../domain/calculation/calculate-ticket-sale-tax.logic";
import {
  CalculateTicketSaleTaxInput,
  TicketSaleTaxCalculation,
} from "../domain/calculation/ticket-sale-tax.types";
import {
  rowToTicketSaleCalculation,
  ticketSaleCalculationToRow,
} from "../infrastructure/serializers/tax-calculation.mapper";
import { LedgerAccountCode } from "../domain/ledger/accounts";

export interface PersistTicketSaleCalculationOptions {
  actorUserId?: string;
  postToLedger: boolean;
  clearingAccount?: LedgerAccountCode;
}

/**
 * Application-layer use case: "calculate-ticket-sale-tax". Resolves the
 * effective-dated TICKETFLOW_PLATFORM_OUTPUT_VAT / ORGANIZER_TICKET_OUTPUT_VAT
 * rules for the transaction date, runs the pure domain calculation, and
 * (for `calculateAndPersist`) stores an immutable TaxCalculation row plus,
 * optionally, the ledger postings — all inside one Prisma transaction so a
 * paid order, its tax calculation and its journal entries either all
 * commit or none do.
 */
@Injectable()
export class CalculateTicketSaleTaxService {
  constructor(
    private prisma: PrismaService,
    private taxRules: TaxRuleRepository,
    private ledgerPosting: TicketSaleLedgerPostingService,
    private audit: TaxAuditService,
  ) {}

  private async resolveRates(
    input: CalculateTicketSaleTaxInput,
  ): Promise<TicketSaleTaxRates> {
    const asOf = new Date(input.transactionDate);
    const [tfRule, orgRule] = await Promise.all([
      this.taxRules.findEffective("TICKETFLOW_PLATFORM_OUTPUT_VAT", asOf),
      this.taxRules.findEffective("ORGANIZER_TICKET_OUTPUT_VAT", asOf),
    ]);
    return {
      ticketFlowVatRateBps: tfRule.rateBps,
      ticketFlowRuleId: tfRule.id,
      ticketFlowRoundingMode: tfRule.roundingMode,
      organizerVatRateBps: orgRule.rateBps,
      organizerRuleId: orgRule.id,
      organizerRoundingMode: orgRule.roundingMode,
    };
  }

  /** Read-only preview — computes but never persists. Used by POST .../preview. */
  async preview(
    input: CalculateTicketSaleTaxInput,
  ): Promise<TicketSaleTaxCalculation> {
    const rates = await this.resolveRates(input);
    return calculateTicketSaleTax(input, rates, uuidv4);
  }

  /**
   * Computes and persists. Idempotent per `transactionId`: if an active
   * calculation already exists for this transaction, it is returned
   * unchanged rather than recalculated (matches "one active tax
   * calculation per transaction and calculation version").
   */
  async calculateAndPersist(
    input: CalculateTicketSaleTaxInput,
    options: PersistTicketSaleCalculationOptions,
  ): Promise<{
    calculation: TicketSaleTaxCalculation;
    alreadyExisted: boolean;
    journalEntryIds: string[];
  }> {
    const rates = await this.resolveRates(input);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.taxCalculation.findFirst({
        where: { transactionId: input.transactionId, isActive: true },
      });
      if (existing) {
        return {
          calculation: rowToTicketSaleCalculation(existing),
          alreadyExisted: true,
          journalEntryIds: [],
        };
      }

      const calculation = calculateTicketSaleTax(input, rates, uuidv4);
      await tx.taxCalculation.create({
        data: ticketSaleCalculationToRow(
          calculation,
          input,
          options.actorUserId,
        ),
      });

      let journalEntryIds: string[] = [];
      if (options.postToLedger) {
        const entries = await this.ledgerPosting.postTicketSale(tx, {
          calculation,
          orderId: input.orderId,
          organizerId: input.organizerId,
          clearingAccount: options.clearingAccount ?? "CASH_MPESA_CLEARING",
          processorChargeBearer: input.processorChargeBearer,
          postedBy: options.actorUserId,
        });
        journalEntryIds = entries.map((e) => e.id);
      }

      await this.audit.log({
        tx,
        action: "TICKET_SALE_TAX_CALCULATED",
        entityType: "TaxCalculation",
        entityId: calculation.calculationId,
        actorUserId: options.actorUserId,
        correlationId: calculation.calculationId,
        afterHash: calculation.calculationHash,
        metadata: {
          orderId: input.orderId,
          transactionId: input.transactionId,
          organizerId: input.organizerId,
          agencyModel: input.agencyModel,
          postedToLedger: options.postToLedger,
          warnings: calculation.warnings,
        },
      });

      return { calculation, alreadyExisted: false, journalEntryIds };
    });
  }

  async findById(
    calculationId: string,
  ): Promise<TicketSaleTaxCalculation | null> {
    const row = await this.prisma.taxCalculation.findUnique({
      where: { id: calculationId },
    });
    return row ? rowToTicketSaleCalculation(row) : null;
  }
}
