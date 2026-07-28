import { RefundTaxCalculation } from "../../domain/refund/refund-tax.types";
import {
  EtimsInvoiceLine,
  SubmitEtimsCreditNoteRequest,
} from "./etims-client.interface";

export interface EtimsCreditNoteMapperInput {
  refundCalculation: RefundTaxCalculation;
  orderNumber: string;
  eventTitle: string;
  originalInvoiceExternalReference: string;
  sellerLegalName: string;
  sellerKraPin: string;
  buyerName?: string;
  buyerKraPin?: string;
  creditNoteDateTime: string;
}

/**
 * Maps a refund's TicketFlow-owned revenue/VAT reversal into an eTIMS
 * credit-note submission request. Same caveat as
 * etims-invoice.mapper.ts: the exact OSCU/VSCU wire shape must come from
 * KRA's issued specification once TicketFlow is certified — see the TODO
 * below.
 */
export function mapRefundToEtimsCreditNoteRequest(
  input: EtimsCreditNoteMapperInput,
  idempotencyKey: string,
  externalReference: string,
): SubmitEtimsCreditNoteRequest {
  const { refundCalculation } = input;
  const lines: EtimsInvoiceLine[] = [];

  if (
    refundCalculation.bookingFeeNetReversal.minorUnits > 0n ||
    refundCalculation.bookingFeeVatReversal.minorUnits > 0n
  ) {
    const gross =
      refundCalculation.bookingFeeNetReversal.minorUnits +
      refundCalculation.bookingFeeVatReversal.minorUnits;
    lines.push({
      description: `Booking fee credit note — order ${input.orderNumber} (${input.eventTitle})`,
      quantity: 1,
      unitPriceMinor: gross,
      taxableAmountMinor: refundCalculation.bookingFeeNetReversal.minorUnits,
      vatRateBps: bpsFromAmounts(
        refundCalculation.bookingFeeVatReversal.minorUnits,
        refundCalculation.bookingFeeNetReversal.minorUnits,
      ),
      vatAmountMinor: refundCalculation.bookingFeeVatReversal.minorUnits,
      totalMinor: gross,
    });
  }
  if (
    refundCalculation.commissionNetReversal.minorUnits > 0n ||
    refundCalculation.commissionVatReversal.minorUnits > 0n
  ) {
    const gross =
      refundCalculation.commissionNetReversal.minorUnits +
      refundCalculation.commissionVatReversal.minorUnits;
    lines.push({
      description: `Organizer commission credit note — order ${input.orderNumber} (${input.eventTitle})`,
      quantity: 1,
      unitPriceMinor: gross,
      taxableAmountMinor: refundCalculation.commissionNetReversal.minorUnits,
      vatRateBps: bpsFromAmounts(
        refundCalculation.commissionVatReversal.minorUnits,
        refundCalculation.commissionNetReversal.minorUnits,
      ),
      vatAmountMinor: refundCalculation.commissionVatReversal.minorUnits,
      totalMinor: gross,
    });
  }

  return {
    idempotencyKey,
    externalReference,
    originalInvoiceExternalReference: input.originalInvoiceExternalReference,
    sellerLegalName: input.sellerLegalName,
    sellerKraPin: input.sellerKraPin,
    buyerName: input.buyerName,
    buyerKraPin: input.buyerKraPin,
    // TODO(OSCU/VSCU cert): replace with the KRA-issued credit-note number format once certified.
    creditNoteNumber: `CN-${input.orderNumber}`,
    creditNoteDateTime: input.creditNoteDateTime,
    reason: "REFUND",
    currency: "KES",
    lines,
    totalTaxableAmountMinor:
      refundCalculation.ticketFlowRevenueReversal.minorUnits,
    totalVatAmountMinor: refundCalculation.ticketFlowVatReversal.minorUnits,
    totalAmountMinor:
      refundCalculation.ticketFlowRevenueReversal.minorUnits +
      refundCalculation.ticketFlowVatReversal.minorUnits,
  };
}

function bpsFromAmounts(vatMinor: bigint, netMinor: bigint): number {
  if (netMinor === 0n) return 0;
  return Number((vatMinor * 10_000n) / netMinor);
}
