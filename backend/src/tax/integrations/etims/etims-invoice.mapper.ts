import { TicketSaleTaxCalculation } from "../../domain/calculation/ticket-sale-tax.types";
import {
  EtimsInvoiceLine,
  SubmitEtimsInvoiceRequest,
} from "./etims-client.interface";

export interface EtimsInvoiceMapperInput {
  calculation: TicketSaleTaxCalculation;
  orderNumber: string;
  eventTitle: string;
  sellerLegalName: string;
  sellerKraPin: string;
  buyerName?: string;
  buyerKraPin?: string;
  invoiceDateTime: string;
}

/**
 * Maps an internal TicketSaleTaxCalculation into the fields eTIMS invoice
 * submission requires per general KRA fiscalisation guidance (seller
 * PIN/name, buyer details where required, invoice number/date, line
 * description/qty/taxable amount/VAT rate/VAT amount/total).
 *
 * IMPORTANT: this is a generic, non-provider-specific shape. The exact
 * OSCU/VSCU wire payload (field names, required headers, signing, unit-of-
 * measure codes, item classification codes, etc.) is defined by KRA's
 * OSCU/VSCU technical specification, which is issued to onboarded/
 * certified taxpayers and is NOT publicly invented here. Whoever
 * completes KRA OSCU/VSCU certification must extend this mapper (or add a
 * provider-specific mapper) to emit that exact payload — see the TODOs
 * below and docs/ticketflow-etims-integration.md.
 *
 * Only TicketFlow's own taxable supply (booking fee + commission, i.e.
 * ticketFlowRevenueExcludingVat / ticketFlowOutputVat) is invoiced here.
 * The organizer's own ticket-VAT liability is the organizer's own
 * fiscalisation responsibility, not TicketFlow's.
 */
export function mapTicketSaleToEtimsInvoiceRequest(
  input: EtimsInvoiceMapperInput,
  idempotencyKey: string,
  externalReference: string,
): SubmitEtimsInvoiceRequest {
  const { calculation } = input;
  const lines: EtimsInvoiceLine[] = [];

  if (calculation.bookingFeeGross.minorUnits > 0n) {
    lines.push({
      description: `Booking fee — order ${input.orderNumber} (${input.eventTitle})`,
      quantity: 1,
      unitPriceMinor: calculation.bookingFeeGross.minorUnits,
      taxableAmountMinor: calculation.bookingFeeNet.minorUnits,
      vatRateBps:
        calculation.bookingFeeVat.minorUnits > 0n
          ? bpsFromAmounts(
              calculation.bookingFeeVat.minorUnits,
              calculation.bookingFeeNet.minorUnits,
            )
          : 0,
      vatAmountMinor: calculation.bookingFeeVat.minorUnits,
      totalMinor: calculation.bookingFeeGross.minorUnits,
    });
  }
  if (calculation.commissionGross.minorUnits > 0n) {
    lines.push({
      description: `Organizer service commission — order ${input.orderNumber} (${input.eventTitle})`,
      quantity: 1,
      unitPriceMinor: calculation.commissionGross.minorUnits,
      taxableAmountMinor: calculation.commissionNet.minorUnits,
      vatRateBps:
        calculation.commissionVat.minorUnits > 0n
          ? bpsFromAmounts(
              calculation.commissionVat.minorUnits,
              calculation.commissionNet.minorUnits,
            )
          : 0,
      vatAmountMinor: calculation.commissionVat.minorUnits,
      totalMinor: calculation.commissionGross.minorUnits,
    });
  }

  return {
    idempotencyKey,
    externalReference,
    sellerLegalName: input.sellerLegalName,
    sellerKraPin: input.sellerKraPin,
    buyerName: input.buyerName,
    buyerKraPin: input.buyerKraPin,
    // TODO(OSCU/VSCU cert): replace with the KRA-issued invoice number format once certified.
    invoiceNumber: input.orderNumber,
    invoiceDateTime: input.invoiceDateTime,
    currency: "KES",
    lines,
    totalTaxableAmountMinor:
      calculation.ticketFlowRevenueExcludingVat.minorUnits,
    totalVatAmountMinor: calculation.ticketFlowOutputVat.minorUnits,
    totalAmountMinor:
      calculation.bookingFeeGross.minorUnits +
      calculation.commissionGross.minorUnits,
  };
}

function bpsFromAmounts(vatMinor: bigint, netMinor: bigint): number {
  if (netMinor === 0n) return 0;
  return Number((vatMinor * 10_000n) / netMinor);
}
