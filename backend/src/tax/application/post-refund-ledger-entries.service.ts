import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { LedgerRepository } from "../infrastructure/repositories/ledger.repository";
import { LEDGER_ACCOUNTS } from "../domain/ledger/accounts";
import { JournalLineInput } from "../domain/ledger/journal-entry.types";
import { RefundTaxCalculation } from "../domain/refund/refund-tax.types";

type TxClient = Prisma.TransactionClient;
type PostedEntry = Awaited<ReturnType<LedgerRepository["postEntry"]>>;

/**
 * Posts refund/cancellation journal entries. These are new, forward-dated
 * entries referencing the original sale via sourceType/sourceId — never
 * literal reversals of the original entries — because a refund can be
 * partial and the original entries must stay exactly as posted (see
 * docs/ticketflow-tax-architecture.md "Refund treatment").
 */
@Injectable()
export class RefundLedgerPostingService {
  constructor(private ledger: LedgerRepository) {}

  async postRefund(
    tx: TxClient,
    params: {
      refundCalculation: RefundTaxCalculation;
      orderId: string;
      organizerId: string;
      clearingAccount: string;
      postedBy?: string;
    },
  ) {
    const {
      refundCalculation: calc,
      orderId,
      organizerId,
      clearingAccount,
      postedBy,
    } = params;
    const entries: PostedEntry[] = [];

    const customerRefundTotal =
      calc.refundableTicketFaceValue.minorUnits +
      calc.refundableBookingFee.minorUnits;
    if (customerRefundTotal > 0n) {
      const lines: JournalLineInput[] = [
        {
          accountCode: LEDGER_ACCOUNTS.CUSTOMER_REFUND_PAYABLE,
          debitMinor: customerRefundTotal,
        },
        {
          accountCode: LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
          creditMinor: calc.refundableTicketFaceValue.minorUnits,
          organizerId,
        },
      ];
      if (calc.bookingFeeNetReversal.minorUnits > 0n) {
        lines.push({
          accountCode: LEDGER_ACCOUNTS.BOOKING_FEE_REVENUE,
          creditMinor: calc.bookingFeeNetReversal.minorUnits,
        });
      }
      if (calc.bookingFeeVatReversal.minorUnits > 0n) {
        lines.push({
          accountCode: LEDGER_ACCOUNTS.TICKETFLOW_VAT_PAYABLE,
          creditMinor: calc.bookingFeeVatReversal.minorUnits,
        });
      }
      // Balance the entry: debit total refunded to the customer must equal the sum of the credits above.
      const creditedSoFar = lines
        .slice(1)
        .reduce((s, l) => s + (l.creditMinor ?? 0n), 0n);
      const residual = customerRefundTotal - creditedSoFar;
      if (residual !== 0n) {
        lines.push({
          accountCode: LEDGER_ACCOUNTS.CLIENT_MONEY_ORGANIZER_FUNDS,
          creditMinor: residual,
        });
      }
      entries.push(
        await this.ledger.postEntry(tx, {
          correlationId: calc.calculationId,
          description: `Refund for order ${orderId}`,
          sourceType: "TicketRefund",
          sourceId: calc.refundId,
          postedBy,
          lines,
        }),
      );
    }

    if (
      calc.commissionNetReversal.minorUnits > 0n ||
      calc.commissionVatReversal.minorUnits > 0n
    ) {
      const commissionGrossReversal =
        calc.commissionNetReversal.minorUnits +
        calc.commissionVatReversal.minorUnits;
      entries.push(
        await this.ledger.postEntry(tx, {
          correlationId: calc.calculationId,
          description: `Commission reversal for refunded order ${orderId}`,
          sourceType: "TicketRefundCommission",
          sourceId: calc.refundId,
          postedBy,
          lines: [
            {
              accountCode: LEDGER_ACCOUNTS.COMMISSION_REVENUE,
              debitMinor: calc.commissionNetReversal.minorUnits,
            },
            {
              accountCode: LEDGER_ACCOUNTS.TICKETFLOW_VAT_PAYABLE,
              debitMinor: calc.commissionVatReversal.minorUnits,
            },
            {
              accountCode: LEDGER_ACCOUNTS.ORGANIZER_PAYABLE,
              creditMinor: commissionGrossReversal,
              organizerId,
            },
          ],
        }),
      );
    }

    if (calc.processorChargeTreatment === "ABSORBED_BY_TICKETFLOW") {
      // Processor kept its fee even though the sale was refunded — TicketFlow already expensed it; nothing further to post here.
    }

    void clearingAccount; // reserved for a future direct-to-processor refund adapter
    return entries;
  }
}
