import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { LedgerRepository } from "../infrastructure/repositories/ledger.repository";
import { LEDGER_ACCOUNTS, LedgerAccountCode } from "../domain/ledger/accounts";
import { JournalLineInput } from "../domain/ledger/journal-entry.types";
import { TicketSaleTaxCalculation } from "../domain/calculation/ticket-sale-tax.types";

type TxClient = Prisma.TransactionClient;
type PostedEntry = Awaited<ReturnType<LedgerRepository["postEntry"]>>;

/**
 * Posts the double-entry journal entries for a paid ticket order, per the
 * disclosed-agent accounting treatment in
 * docs/ticketflow-tax-architecture.md.
 *
 * NOTE on scope: only DISCLOSED_AGENT postings are implemented. TicketFlow
 * ships with PRINCIPAL_RESELLER disabled by default (CompanyTaxProfile);
 * enabling it requires extending this service with a distinct chart-of-
 * accounts treatment (TicketFlow would recognize the full ticket sale as
 * its own revenue) before it can post real entries — see the
 * "Unresolved risks" section of the implementation report.
 *
 * Organizer-owned ticket VAT (`organizerTicketOutputVat`) is deliberately
 * NOT posted to this ledger: it is money the organizer owes KRA directly
 * out of their own settlement, not a TicketFlow asset/liability movement.
 * It remains fully auditable on the immutable TaxCalculation record and in
 * the organizer settlement report.
 */
@Injectable()
export class TicketSaleLedgerPostingService {
  constructor(private ledger: LedgerRepository) {}

  async postTicketSale(
    tx: TxClient,
    params: {
      calculation: TicketSaleTaxCalculation;
      orderId: string;
      organizerId: string;
      clearingAccount: LedgerAccountCode;
      processorChargeBearer: "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";
      postedBy?: string;
    },
  ) {
    if (params.calculation.customerPayment.minorUnits <= 0n) {
      return [] as PostedEntry[];
    }
    const { calculation, orderId, organizerId, clearingAccount, postedBy } =
      params;
    const entries: PostedEntry[] = [];

    // Entry 1: cash/clearing received, split into organizer payable, TicketFlow booking-fee revenue and VAT.
    const entry1Lines: JournalLineInput[] = [
      {
        accountCode: clearingAccount,
        debitMinor: calculation.customerPayment.minorUnits,
      },
      {
        accountCode: LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
        creditMinor: calculation.organizerTicketProceedsGross.minorUnits,
        organizerId,
      },
    ];
    if (calculation.bookingFeeNet.minorUnits > 0n) {
      entry1Lines.push({
        accountCode: LEDGER_ACCOUNTS.BOOKING_FEE_REVENUE,
        creditMinor: calculation.bookingFeeNet.minorUnits,
      });
    }
    if (calculation.bookingFeeVat.minorUnits > 0n) {
      entry1Lines.push({
        accountCode: LEDGER_ACCOUNTS.TICKETFLOW_VAT_PAYABLE,
        creditMinor: calculation.bookingFeeVat.minorUnits,
      });
    }
    if (
      params.processorChargeBearer === "CUSTOMER" &&
      calculation.processorCharge.minorUnits > 0n
    ) {
      entry1Lines.push({
        accountCode: LEDGER_ACCOUNTS.PROCESSOR_PAYABLE_CLEARING,
        creditMinor: calculation.processorCharge.minorUnits,
      });
    }
    entries.push(
      await this.ledger.postEntry(tx, {
        correlationId: calculation.calculationId,
        description: `Ticket sale settlement for order ${orderId}`,
        sourceType: "TicketSale",
        sourceId: orderId,
        postedBy,
        lines: entry1Lines,
      }),
    );

    // Entry 2: organizer commission deduction (only when a commission was charged).
    if (calculation.commissionGross.minorUnits > 0n) {
      const entry2Lines: JournalLineInput[] = [
        {
          accountCode: LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
          debitMinor: calculation.commissionGross.minorUnits,
          organizerId,
        },
      ];
      if (calculation.commissionNet.minorUnits > 0n) {
        entry2Lines.push({
          accountCode: LEDGER_ACCOUNTS.COMMISSION_REVENUE,
          creditMinor: calculation.commissionNet.minorUnits,
        });
      }
      if (calculation.commissionVat.minorUnits > 0n) {
        entry2Lines.push({
          accountCode: LEDGER_ACCOUNTS.TICKETFLOW_VAT_PAYABLE,
          creditMinor: calculation.commissionVat.minorUnits,
        });
      }
      entries.push(
        await this.ledger.postEntry(tx, {
          correlationId: calculation.calculationId,
          description: `Organizer commission for order ${orderId}`,
          sourceType: "TicketSaleCommission",
          sourceId: orderId,
          postedBy,
          lines: entry2Lines,
        }),
      );
    }

    // Entry 3: processor charge, borne by whoever `processorChargeBearer` says.
    if (calculation.processorCharge.minorUnits > 0n) {
      if (params.processorChargeBearer === "TICKETFLOW") {
        entries.push(
          await this.ledger.postEntry(tx, {
            correlationId: calculation.calculationId,
            description: `Payment processor charge (TicketFlow-borne) for order ${orderId}`,
            sourceType: "TicketSaleProcessorCharge",
            sourceId: orderId,
            postedBy,
            lines: [
              {
                accountCode: LEDGER_ACCOUNTS.PAYMENT_PROCESSING_EXPENSE,
                debitMinor: calculation.processorCharge.minorUnits,
              },
              {
                accountCode: LEDGER_ACCOUNTS.PROCESSOR_PAYABLE_CLEARING,
                creditMinor: calculation.processorCharge.minorUnits,
              },
            ],
          }),
        );
      } else if (params.processorChargeBearer === "ORGANIZER") {
        entries.push(
          await this.ledger.postEntry(tx, {
            correlationId: calculation.calculationId,
            description: `Payment processor charge (organizer-borne) for order ${orderId}`,
            sourceType: "TicketSaleProcessorCharge",
            sourceId: orderId,
            postedBy,
            lines: [
              {
                accountCode: LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
                debitMinor: calculation.processorCharge.minorUnits,
                organizerId,
              },
              {
                accountCode: LEDGER_ACCOUNTS.PROCESSOR_PAYABLE_CLEARING,
                creditMinor: calculation.processorCharge.minorUnits,
              },
            ],
          }),
        );
      }
      // CUSTOMER-borne processor charge was already balanced within Entry 1.
    }

    return entries;
  }
}
