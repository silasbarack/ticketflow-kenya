import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TaxAuditService } from "./tax-audit.service";
import { decimalStringFromMinorUnits } from "../../domain/money/money";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function periodBounds(period: string): { start: Date; end: Date } {
  if (!PERIOD_RE.test(period)) {
    throw new BadRequestException(
      `Invalid tax period "${period}" — expected YYYY-MM`,
    );
  }
  const [year, month] = period.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(
    Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1),
  );
  return { start, end };
}

/**
 * Application-layer use cases: "aggregate-vat-period" and
 * "generate-tax-reports". Aggregation is TicketFlow-owned VAT only
 * (organizer-owned ticket VAT is excluded — see
 * docs/ticketflow-tax-architecture.md "TicketFlow-owned vs organizer-owned
 * taxes").
 *
 *   net VAT payable = output VAT
 *                    - allowable input VAT
 *                    - valid withholding VAT credits
 *                    - other valid credits
 *                    + debit adjustments
 *                    - credit adjustments (includes refund credit notes)
 */
@Injectable()
export class TaxPeriodService {
  constructor(
    private prisma: PrismaService,
    private audit: TaxAuditService,
  ) {}

  async prepareDraft(period: string, actorUserId: string) {
    periodBounds(period); // validates format
    const existing = await this.prisma.taxPeriod.findUnique({
      where: { period },
    });
    if (existing) return existing;
    const created = await this.prisma.taxPeriod.create({
      data: { period, status: "DRAFT" },
    });
    await this.audit.log({
      action: "TAX_PERIOD_DRAFT_CREATED",
      entityType: "TaxPeriod",
      entityId: created.id,
      actorUserId,
      metadata: { period },
    });
    return created;
  }

  async aggregate(period: string, actorUserId: string) {
    const { start, end } = periodBounds(period);
    const taxPeriod = await this.prepareDraft(period, actorUserId);
    if (taxPeriod.status === "CLOSED") {
      throw new BadRequestException(
        `Tax period ${period} is CLOSED and cannot be re-aggregated`,
      );
    }

    const sales = await this.prisma.taxCalculation.aggregate({
      where: { transactionDate: { gte: start, lt: end }, isActive: true },
      _sum: {
        ticketFlowRevenueExVatMinor: true,
        ticketFlowOutputVatMinor: true,
      },
    });
    const refunds = await this.prisma.refundTaxCalculation.aggregate({
      where: { transactionDate: { gte: start, lt: end } },
      _sum: {
        ticketFlowRevenueReversalMinor: true,
        ticketFlowVatReversalMinor: true,
      },
    });
    const adjustments = await this.prisma.taxAdjustment.findMany({
      where: { periodId: taxPeriod.id, approvedBy: { not: null } },
    });

    const sumByCategory = (category: string, type: "DEBIT" | "CREDIT") =>
      adjustments
        .filter((a) => a.category === category && a.type === type)
        .reduce((acc, a) => acc + a.amountMinor, 0n);

    const outputVatFromSales = sales._sum.ticketFlowOutputVatMinor ?? 0n;
    const outputVatFromRefunds = refunds._sum.ticketFlowVatReversalMinor ?? 0n;
    const revenueFromSales = sales._sum.ticketFlowRevenueExVatMinor ?? 0n;
    const revenueFromRefunds =
      refunds._sum.ticketFlowRevenueReversalMinor ?? 0n;

    const outputVatMinor = outputVatFromSales - outputVatFromRefunds;
    const taxableRevenueExVatMinor = revenueFromSales - revenueFromRefunds;

    const inputVatMinor = sumByCategory("INPUT_VAT", "CREDIT");
    const withholdingVatCreditsMinor = sumByCategory(
      "WITHHOLDING_VAT_CREDIT",
      "CREDIT",
    );
    const otherCreditsMinor = sumByCategory("OTHER", "CREDIT");
    const debitNotesMinor =
      sumByCategory("DEBIT_NOTE", "DEBIT") + sumByCategory("OTHER", "DEBIT");
    // Credit notes = refund reversals (already netted above) + any manually recorded CREDIT_NOTE adjustments.
    const creditNotesMinor =
      outputVatFromRefunds + sumByCategory("CREDIT_NOTE", "CREDIT");

    const netVatPayableMinor =
      outputVatMinor -
      inputVatMinor -
      withholdingVatCreditsMinor -
      otherCreditsMinor +
      debitNotesMinor -
      sumByCategory("CREDIT_NOTE", "CREDIT");

    const updated = await this.prisma.taxPeriod.update({
      where: { id: taxPeriod.id },
      data: {
        status: "PREPARED",
        taxableRevenueExVatMinor,
        outputVatMinor,
        inputVatMinor,
        withholdingVatCreditsMinor,
        otherCreditsMinor,
        creditNotesMinor,
        debitNotesMinor,
        netVatPayableMinor,
        preparedBy: actorUserId,
        preparedAt: new Date(),
      },
    });

    await this.audit.log({
      action: "TAX_PERIOD_AGGREGATED",
      entityType: "TaxPeriod",
      entityId: updated.id,
      actorUserId,
      metadata: {
        period,
        outputVatMinor: outputVatMinor.toString(),
        netVatPayableMinor: netVatPayableMinor.toString(),
      },
    });

    return updated;
  }

  /**
   * Marks the period RECONCILED once ReconciliationService confirms there
   * are no open exceptions for it. Reconciliation itself lives in
   * ReconciliationService — this only performs the state transition, kept
   * here to avoid a circular module dependency.
   */
  async markReconciled(period: string, actorUserId: string) {
    const taxPeriod = await this.getOrThrow(period);
    if (taxPeriod.status !== "PREPARED") {
      throw new BadRequestException(
        `Tax period ${period} must be PREPARED before it can be reconciled (current status: ${taxPeriod.status})`,
      );
    }
    const updated = await this.prisma.taxPeriod.update({
      where: { id: taxPeriod.id },
      data: {
        status: "RECONCILED",
        reconciledBy: actorUserId,
        reconciledAt: new Date(),
      },
    });
    await this.audit.log({
      action: "TAX_PERIOD_RECONCILED",
      entityType: "TaxPeriod",
      entityId: updated.id,
      actorUserId,
      metadata: { period },
    });
    return updated;
  }

  async getOrThrow(period: string) {
    const taxPeriod = await this.prisma.taxPeriod.findUnique({
      where: { period },
    });
    if (!taxPeriod)
      throw new NotFoundException(
        `Tax period ${period} has not been prepared yet`,
      );
    return taxPeriod;
  }

  /** "generate-tax-reports": the admin-interface contract payload for a period. */
  async report(period: string) {
    const taxPeriod = await this.getOrThrow(period);
    const liabilities = await this.prisma.taxLiability.findMany({
      where: { periodId: taxPeriod.id },
      include: { registrations: true, remittances: true },
    });
    const adjustments = await this.prisma.taxAdjustment.findMany({
      where: { periodId: taxPeriod.id },
    });
    const etimsFailures = await this.prisma.etimsDocument.count({
      where: { status: { in: ["REJECTED", "REQUIRES_REVIEW"] } },
    });
    const openExceptions = await this.prisma.reconciliationException.count({
      where: { status: "OPEN", run: { scope: period } },
    });

    return {
      period,
      status: taxPeriod.status,
      taxableRevenueExVat: decimalStringFromMinorUnits(
        taxPeriod.taxableRevenueExVatMinor,
      ),
      outputVat: decimalStringFromMinorUnits(taxPeriod.outputVatMinor),
      inputVatEntered: decimalStringFromMinorUnits(taxPeriod.inputVatMinor),
      withholdingVatCredits: decimalStringFromMinorUnits(
        taxPeriod.withholdingVatCreditsMinor,
      ),
      otherCredits: decimalStringFromMinorUnits(taxPeriod.otherCreditsMinor),
      creditNotes: decimalStringFromMinorUnits(taxPeriod.creditNotesMinor),
      debitNotes: decimalStringFromMinorUnits(taxPeriod.debitNotesMinor),
      netVatPayable: decimalStringFromMinorUnits(taxPeriod.netVatPayableMinor),
      reconciliationStatus:
        taxPeriod.status === "RECONCILED" || taxPeriod.status === "CLOSED"
          ? "RECONCILED"
          : openExceptions > 0
            ? "EXCEPTIONS_OPEN"
            : "PENDING",
      openReconciliationExceptions: openExceptions,
      etimsSubmissionFailures: etimsFailures,
      liabilities: liabilities.map((l) => ({
        id: l.id,
        taxHead: l.taxHead,
        owner: l.owner,
        organizerId: l.organizerId,
        amount: decimalStringFromMinorUnits(l.amountMinor),
        status: l.status,
        approvalStatus: l.approvedBy
          ? "APPROVED"
          : l.rejectedBy
            ? "REJECTED"
            : "PENDING",
        prnStatus: l.registrations[0]?.verificationStatus ?? "NOT_ATTACHED",
        paymentStatus: l.remittances[0]?.status ?? "NOT_STARTED",
        kraConfirmed: l.status === "KRA_CONFIRMED",
        dueDate: l.dueDate,
      })),
      adjustments: adjustments.map((a) => ({
        id: a.id,
        type: a.type,
        category: a.category,
        amount: decimalStringFromMinorUnits(a.amountMinor),
        approved: !!a.approvedBy,
      })),
    };
  }
}
