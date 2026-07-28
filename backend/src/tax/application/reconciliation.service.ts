import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerRepository } from "../infrastructure/repositories/ledger.repository";
import { TaxEncryptionService } from "../domain/crypto/tax-encryption.service";
import { TaxAuditService } from "../infrastructure/repositories/tax-audit.service";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ReconciliationExceptionDraft {
  type:
    | "MISSING_ETIMS_INVOICE"
    | "DUPLICATE_ETIMS_INVOICE"
    | "AMOUNT_MISMATCH"
    | "VAT_MISMATCH"
    | "MISSING_CREDIT_NOTE"
    | "ORPHAN_PAYMENT"
    | "DUPLICATE_PAYMENT"
    | "PRN_MISMATCH"
    | "ORGANIZER_PIN_MISMATCH"
    | "UNBALANCED_LEDGER"
    | "MISSING_SETTLEMENT";
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * "reconcile-tax-period" and the daily payment reconciliation. Every
 * discrepancy becomes a ReconciliationException row instead of a silent
 * adjustment — see docs/ticketflow-tax-reconciliation.md.
 */
@Injectable()
export class ReconciliationService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerRepository,
    private encryption: TaxEncryptionService,
    private audit: TaxAuditService,
  ) {}

  async runDaily(date: string, actorUserId?: string) {
    if (!DATE_RE.test(date))
      throw new Error(`Invalid date "${date}" — expected YYYY-MM-DD`);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const exceptions: ReconciliationExceptionDraft[] = [];

    const successfulPayments = await this.prisma.payment.findMany({
      where: { status: "SUCCESS", updatedAt: { gte: start, lt: end } },
      include: { order: true },
    });

    const paymentsByOrder = new Map<string, typeof successfulPayments>();
    for (const payment of successfulPayments) {
      const list = paymentsByOrder.get(payment.orderId) ?? [];
      list.push(payment);
      paymentsByOrder.set(payment.orderId, list);
    }
    for (const [orderId, payments] of paymentsByOrder) {
      if (payments.length > 1) {
        exceptions.push({
          type: "DUPLICATE_PAYMENT",
          entityType: "Order",
          entityId: orderId,
          description: `Order ${orderId} has ${payments.length} SUCCESS payments recorded on ${date}`,
          metadata: { paymentIds: payments.map((p) => p.id) },
        });
      }
    }

    for (const payment of successfulPayments) {
      const calculation = await this.prisma.taxCalculation.findFirst({
        where: { orderId: payment.orderId, isActive: true },
      });
      if (!calculation) {
        exceptions.push({
          type: "ORPHAN_PAYMENT",
          entityType: "Payment",
          entityId: payment.id,
          description: `Payment ${payment.id} succeeded for order ${payment.orderId} but no active TaxCalculation exists for that order`,
        });
        continue;
      }
      const paymentMinor = BigInt(Math.round(Number(payment.amount) * 100));
      if (paymentMinor !== calculation.customerPaymentMinor) {
        exceptions.push({
          type: "AMOUNT_MISMATCH",
          entityType: "TaxCalculation",
          entityId: calculation.id,
          description: `Payment ${payment.id} amount (${payment.amount}) does not match calculated customer payment for order ${payment.orderId}`,
          metadata: {
            paymentMinor: paymentMinor.toString(),
            calculatedMinor: calculation.customerPaymentMinor.toString(),
          },
        });
      }
    }

    const activeCalculationsToday = await this.prisma.taxCalculation.findMany({
      where: { transactionDate: { gte: start, lt: end }, isActive: true },
    });
    for (const calc of activeCalculationsToday) {
      const hasSuccessfulPayment = await this.prisma.payment.findFirst({
        where: { orderId: calc.orderId, status: "SUCCESS" },
      });
      if (!hasSuccessfulPayment) {
        exceptions.push({
          type: "MISSING_SETTLEMENT",
          entityType: "TaxCalculation",
          entityId: calc.id,
          description: `Tax was calculated for order ${calc.orderId} but no successful payment settlement was found`,
        });
      }
    }

    const unbalanced = await this.ledger.unbalancedEntryIds();
    for (const entryId of unbalanced) {
      exceptions.push({
        type: "UNBALANCED_LEDGER",
        entityType: "JournalEntry",
        entityId: entryId,
        description: `Journal entry ${entryId} does not balance`,
      });
    }

    return this.persistRun("DAILY", date, exceptions, actorUserId);
  }

  async runMonthly(period: string, actorUserId?: string) {
    if (!PERIOD_RE.test(period))
      throw new Error(`Invalid period "${period}" — expected YYYY-MM`);
    const [year, month] = period.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(
      Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1),
    );
    const exceptions: ReconciliationExceptionDraft[] = [];

    const sales = await this.prisma.taxCalculation.findMany({
      where: { transactionDate: { gte: start, lt: end }, isActive: true },
    });
    for (const sale of sales) {
      if (sale.bookingFeeGrossMinor === 0n && sale.commissionGrossMinor === 0n)
        continue; // nothing TicketFlow-taxable to invoice
      const invoices = await this.prisma.etimsDocument.findMany({
        where: { orderId: sale.orderId, documentType: "INVOICE" },
      });
      if (invoices.length === 0) {
        exceptions.push({
          type: "MISSING_ETIMS_INVOICE",
          entityType: "TaxCalculation",
          entityId: sale.id,
          description: `No eTIMS invoice document exists for order ${sale.orderId}`,
        });
      } else if (invoices.length > 1) {
        exceptions.push({
          type: "DUPLICATE_ETIMS_INVOICE",
          entityType: "Order",
          entityId: sale.orderId,
          description: `${invoices.length} eTIMS invoice documents exist for order ${sale.orderId}`,
          metadata: { documentIds: invoices.map((d) => d.id) },
        });
      }
    }

    const refunds = await this.prisma.refundTaxCalculation.findMany({
      where: {
        transactionDate: { gte: start, lt: end },
        requiresEtimsCreditNote: true,
      },
    });
    for (const refund of refunds) {
      const creditNotes = await this.prisma.etimsDocument.findMany({
        where: { refundId: refund.refundId, documentType: "CREDIT_NOTE" },
      });
      if (creditNotes.length === 0) {
        exceptions.push({
          type: "MISSING_CREDIT_NOTE",
          entityType: "RefundTaxCalculation",
          entityId: refund.id,
          description: `Refund ${refund.refundId} requires an eTIMS credit note but none has been submitted`,
        });
      }
    }

    const taxPeriod = await this.prisma.taxPeriod.findUnique({
      where: { period },
    });
    if (taxPeriod) {
      const recomputedOutputVat = sales.reduce(
        (acc, s) => acc + s.ticketFlowOutputVatMinor,
        0n,
      );
      const refundVat = refunds.reduce(
        (acc, r) => acc + r.ticketFlowVatReversalMinor,
        0n,
      );
      const liveOutputVat = recomputedOutputVat - refundVat;
      if (liveOutputVat !== taxPeriod.outputVatMinor) {
        exceptions.push({
          type: "VAT_MISMATCH",
          entityType: "TaxPeriod",
          entityId: taxPeriod.id,
          description: `Period ${period} aggregated output VAT (${taxPeriod.outputVatMinor}) does not match currently recomputed output VAT (${liveOutputVat}) — new/refunded transactions may have been recorded after the period was prepared. Re-run aggregate-vat-period.`,
          metadata: {
            aggregatedMinor: taxPeriod.outputVatMinor.toString(),
            recomputedMinor: liveOutputVat.toString(),
          },
        });
      }

      const liabilities = await this.prisma.taxLiability.findMany({
        where: { periodId: taxPeriod.id },
        include: { registrations: true },
      });
      for (const liability of liabilities) {
        for (const registration of liability.registrations) {
          if (registration.amountMinor !== liability.amountMinor) {
            exceptions.push({
              type: "PRN_MISMATCH",
              entityType: "TaxPaymentRegistration",
              entityId: registration.id,
              description: `PRN ${registration.id} amount does not match liability ${liability.id} amount`,
            });
          }
        }
        if (liability.owner === "ORGANIZER" && liability.organizerId) {
          const organizerProfile =
            await this.prisma.organizerTaxProfile.findUnique({
              where: { organizerId: liability.organizerId },
            });
          if (organizerProfile?.kraPinEncrypted) {
            const expectedMask = this.encryption.mask(
              this.encryption.decrypt(organizerProfile.kraPinEncrypted),
            );
            for (const registration of liability.registrations) {
              if (registration.taxpayerPinMasked !== expectedMask) {
                exceptions.push({
                  type: "ORGANIZER_PIN_MISMATCH",
                  entityType: "TaxPaymentRegistration",
                  entityId: registration.id,
                  description: `PRN taxpayer PIN for liability ${liability.id} does not match organizer ${liability.organizerId}'s registered KRA PIN`,
                });
              }
            }
          }
        }
      }
    }

    const unbalanced = await this.ledger.unbalancedEntryIds();
    for (const entryId of unbalanced) {
      exceptions.push({
        type: "UNBALANCED_LEDGER",
        entityType: "JournalEntry",
        entityId: entryId,
        description: `Journal entry ${entryId} does not balance`,
      });
    }

    return this.persistRun("MONTHLY", period, exceptions, actorUserId);
  }

  private async persistRun(
    type: "DAILY" | "MONTHLY",
    scope: string,
    exceptions: ReconciliationExceptionDraft[],
    actorUserId?: string,
  ) {
    const run = await this.prisma.reconciliationRun.create({
      data: {
        type,
        scope,
        createdBy: actorUserId,
        summary: {
          exceptionCount: exceptions.length,
          byType: countByType(exceptions),
        } as any,
        exceptions: {
          create: exceptions.map((e) => ({
            type: e.type,
            entityType: e.entityType,
            entityId: e.entityId,
            description: e.description,
            metadata: e.metadata as any,
          })),
        },
      },
      include: { exceptions: true },
    });

    await this.audit.log({
      action:
        type === "DAILY"
          ? "DAILY_RECONCILIATION_RUN"
          : "MONTHLY_RECONCILIATION_RUN",
      entityType: "ReconciliationRun",
      entityId: run.id,
      actorUserId,
      metadata: { scope, exceptionCount: exceptions.length },
    });

    return run;
  }

  async resolveException(
    exceptionId: string,
    actorUserId: string,
    note: string,
  ) {
    const updated = await this.prisma.reconciliationException.update({
      where: { id: exceptionId },
      data: {
        status: "RESOLVED",
        resolvedBy: actorUserId,
        resolvedAt: new Date(),
        resolutionNote: note,
      },
    });
    await this.audit.log({
      action: "RECONCILIATION_EXCEPTION_RESOLVED",
      entityType: "ReconciliationException",
      entityId: exceptionId,
      actorUserId,
      metadata: { note },
    });
    return updated;
  }

  async listOpenExceptions(params: { type?: string } = {}) {
    return this.prisma.reconciliationException.findMany({
      where: { status: "OPEN", type: params.type as any },
      orderBy: { createdAt: "desc" },
    });
  }
}

function countByType(
  exceptions: ReconciliationExceptionDraft[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of exceptions) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return counts;
}
