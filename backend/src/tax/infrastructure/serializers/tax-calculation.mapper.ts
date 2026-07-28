import { TaxCalculation as PrismaTaxCalculation } from "@prisma/client";
import { money, serializeMoney } from "../../domain/money/money";
import { TicketSaleTaxCalculation } from "../../domain/calculation/ticket-sale-tax.types";
import { CalculateTicketSaleTaxInput } from "../../domain/calculation/ticket-sale-tax.types";

const CCY = "KES" as const;

export function ticketSaleCalculationToRow(
  calc: TicketSaleTaxCalculation,
  input: CalculateTicketSaleTaxInput,
  createdBy?: string,
) {
  return {
    id: calc.calculationId,
    transactionId: input.transactionId,
    orderId: input.orderId,
    eventId: input.eventId,
    organizerId: input.organizerId,
    transactionDate: new Date(input.transactionDate),
    currency: input.currency,
    agencyModel: input.agencyModel,
    ruleVersionIds: calc.ruleVersionIds,
    customerPaymentMinor: calc.customerPayment.minorUnits,
    organizerTicketProceedsGrossMinor:
      calc.organizerTicketProceedsGross.minorUnits,
    organizerTicketNetOfVatMinor: calc.organizerTicketNetOfVat?.minorUnits,
    organizerTicketOutputVatMinor: calc.organizerTicketOutputVat?.minorUnits,
    bookingFeeGrossMinor: calc.bookingFeeGross.minorUnits,
    bookingFeeNetMinor: calc.bookingFeeNet.minorUnits,
    bookingFeeVatMinor: calc.bookingFeeVat.minorUnits,
    commissionGrossMinor: calc.commissionGross.minorUnits,
    commissionNetMinor: calc.commissionNet.minorUnits,
    commissionVatMinor: calc.commissionVat.minorUnits,
    ticketFlowRevenueExVatMinor: calc.ticketFlowRevenueExcludingVat.minorUnits,
    ticketFlowOutputVatMinor: calc.ticketFlowOutputVat.minorUnits,
    processorChargeMinor: calc.processorCharge.minorUnits,
    organizerSettlementBeforeRefundsMinor:
      calc.organizerSettlementBeforeRefunds.minorUnits,
    ticketFlowCashRetainedMinor:
      calc.ticketFlowCashRetainedBeforeOtherCosts.minorUnits,
    components: calc.components.map((c) => ({
      ...c,
      taxBase: serializeMoney(c.taxBase),
      taxAmount: serializeMoney(c.taxAmount),
    })) as any,
    warnings: calc.warnings,
    calculationHash: calc.calculationHash,
    createdBy,
  };
}

export function rowToTicketSaleCalculation(
  row: PrismaTaxCalculation,
): TicketSaleTaxCalculation {
  const components = (row.components as any[]).map((c) => ({
    code: c.code,
    owner: c.owner,
    taxBase: money(BigInt(c.taxBase.minorUnits), CCY),
    rateBps: c.rateBps,
    taxAmount: money(BigInt(c.taxAmount.minorUnits), CCY),
    formula: c.formula,
  }));
  return {
    calculationId: row.id,
    ruleVersionIds: row.ruleVersionIds,
    customerPayment: money(row.customerPaymentMinor, CCY),
    organizerTicketProceedsGross: money(
      row.organizerTicketProceedsGrossMinor,
      CCY,
    ),
    organizerTicketNetOfVat:
      row.organizerTicketNetOfVatMinor != null
        ? money(row.organizerTicketNetOfVatMinor, CCY)
        : undefined,
    organizerTicketOutputVat:
      row.organizerTicketOutputVatMinor != null
        ? money(row.organizerTicketOutputVatMinor, CCY)
        : undefined,
    bookingFeeGross: money(row.bookingFeeGrossMinor, CCY),
    bookingFeeNet: money(row.bookingFeeNetMinor, CCY),
    bookingFeeVat: money(row.bookingFeeVatMinor, CCY),
    commissionGross: money(row.commissionGrossMinor, CCY),
    commissionNet: money(row.commissionNetMinor, CCY),
    commissionVat: money(row.commissionVatMinor, CCY),
    ticketFlowRevenueExcludingVat: money(row.ticketFlowRevenueExVatMinor, CCY),
    ticketFlowOutputVat: money(row.ticketFlowOutputVatMinor, CCY),
    processorCharge: money(row.processorChargeMinor, CCY),
    organizerSettlementBeforeRefunds: money(
      row.organizerSettlementBeforeRefundsMinor,
      CCY,
    ),
    ticketFlowCashRetainedBeforeOtherCosts: money(
      row.ticketFlowCashRetainedMinor,
      CCY,
    ),
    components,
    warnings: row.warnings,
    calculationHash: row.calculationHash,
  };
}

/** API (JSON-safe) representation: every Money field serialized via serializeMoney. */
export function ticketSaleCalculationToApi(calc: TicketSaleTaxCalculation) {
  return {
    calculationId: calc.calculationId,
    ruleVersionIds: calc.ruleVersionIds,
    customerPayment: serializeMoney(calc.customerPayment),
    organizerTicketProceedsGross: serializeMoney(
      calc.organizerTicketProceedsGross,
    ),
    organizerTicketNetOfVat: calc.organizerTicketNetOfVat
      ? serializeMoney(calc.organizerTicketNetOfVat)
      : null,
    organizerTicketOutputVat: calc.organizerTicketOutputVat
      ? serializeMoney(calc.organizerTicketOutputVat)
      : null,
    bookingFeeGross: serializeMoney(calc.bookingFeeGross),
    bookingFeeNet: serializeMoney(calc.bookingFeeNet),
    bookingFeeVat: serializeMoney(calc.bookingFeeVat),
    commissionGross: serializeMoney(calc.commissionGross),
    commissionNet: serializeMoney(calc.commissionNet),
    commissionVat: serializeMoney(calc.commissionVat),
    ticketFlowRevenueExcludingVat: serializeMoney(
      calc.ticketFlowRevenueExcludingVat,
    ),
    ticketFlowOutputVat: serializeMoney(calc.ticketFlowOutputVat),
    processorCharge: serializeMoney(calc.processorCharge),
    organizerSettlementBeforeRefunds: serializeMoney(
      calc.organizerSettlementBeforeRefunds,
    ),
    ticketFlowCashRetainedBeforeOtherCosts: serializeMoney(
      calc.ticketFlowCashRetainedBeforeOtherCosts,
    ),
    components: calc.components.map((c) => ({
      ...c,
      taxBase: serializeMoney(c.taxBase),
      taxAmount: serializeMoney(c.taxAmount),
    })),
    warnings: calc.warnings,
    calculationHash: calc.calculationHash,
  };
}
