import { RefundTaxCalculation as PrismaRefundTaxCalculation } from "@prisma/client";
import { money, serializeMoney } from "../../domain/money/money";
import {
  CalculateRefundTaxInput,
  RefundTaxCalculation,
} from "../../domain/refund/refund-tax.types";

const CCY = "KES" as const;

export function refundCalculationToRow(
  calc: RefundTaxCalculation,
  input: CalculateRefundTaxInput,
  createdBy?: string,
) {
  return {
    id: calc.calculationId,
    refundId: input.refundId,
    originalCalculationId: input.originalCalculationId,
    orderId: input.orderId,
    reason: input.reason,
    transactionDate: new Date(input.transactionDate),
    currency: input.currency,
    refundableTicketFaceValueMinor: calc.refundableTicketFaceValue.minorUnits,
    refundableBookingFeeMinor: calc.refundableBookingFee.minorUnits,
    nonRefundableFeeMinor: calc.nonRefundableFee.minorUnits,
    ticketFlowRevenueReversalMinor: calc.ticketFlowRevenueReversal.minorUnits,
    ticketFlowVatReversalMinor: calc.ticketFlowVatReversal.minorUnits,
    organizerPayableReversalMinor: calc.organizerPayableReversal.minorUnits,
    organizerTicketVatReversalMinor:
      calc.organizerTicketVatReversal?.minorUnits,
    processorChargeTreatment: calc.processorChargeTreatment,
    organizerAlreadySettled: calc.organizerAlreadySettled,
    ticketFlowRecoveryRequiredMinor: calc.ticketFlowRecoveryRequired.minorUnits,
    refundReserveRequiredMinor: calc.refundReserveRequired.minorUnits,
    requiresEtimsCreditNote: calc.requiresEtimsCreditNote,
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

export function rowToRefundCalculation(
  row: PrismaRefundTaxCalculation,
): RefundTaxCalculation {
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
    refundId: row.refundId,
    originalCalculationId: row.originalCalculationId,
    ruleVersionIds: [],
    refundableTicketFaceValue: money(row.refundableTicketFaceValueMinor, CCY),
    refundableBookingFee: money(row.refundableBookingFeeMinor, CCY),
    nonRefundableFee: money(row.nonRefundableFeeMinor, CCY),
    ticketFlowRevenueReversal: money(row.ticketFlowRevenueReversalMinor, CCY),
    ticketFlowVatReversal: money(row.ticketFlowVatReversalMinor, CCY),
    bookingFeeNetReversal: money(0n, CCY),
    bookingFeeVatReversal: money(0n, CCY),
    commissionNetReversal: money(0n, CCY),
    commissionVatReversal: money(0n, CCY),
    organizerPayableReversal: money(row.organizerPayableReversalMinor, CCY),
    organizerTicketVatReversal:
      row.organizerTicketVatReversalMinor != null
        ? money(row.organizerTicketVatReversalMinor, CCY)
        : undefined,
    processorChargeTreatment:
      row.processorChargeTreatment as RefundTaxCalculation["processorChargeTreatment"],
    organizerAlreadySettled: row.organizerAlreadySettled,
    ticketFlowRecoveryRequired: money(row.ticketFlowRecoveryRequiredMinor, CCY),
    refundReserveRequired: money(row.refundReserveRequiredMinor, CCY),
    requiresEtimsCreditNote: row.requiresEtimsCreditNote,
    components,
    warnings: row.warnings,
    calculationHash: row.calculationHash,
  };
}

export function refundCalculationToApi(calc: RefundTaxCalculation) {
  return {
    calculationId: calc.calculationId,
    refundId: calc.refundId,
    originalCalculationId: calc.originalCalculationId,
    ruleVersionIds: calc.ruleVersionIds,
    refundableTicketFaceValue: serializeMoney(calc.refundableTicketFaceValue),
    refundableBookingFee: serializeMoney(calc.refundableBookingFee),
    nonRefundableFee: serializeMoney(calc.nonRefundableFee),
    ticketFlowRevenueReversal: serializeMoney(calc.ticketFlowRevenueReversal),
    ticketFlowVatReversal: serializeMoney(calc.ticketFlowVatReversal),
    organizerPayableReversal: serializeMoney(calc.organizerPayableReversal),
    organizerTicketVatReversal: calc.organizerTicketVatReversal
      ? serializeMoney(calc.organizerTicketVatReversal)
      : null,
    processorChargeTreatment: calc.processorChargeTreatment,
    organizerAlreadySettled: calc.organizerAlreadySettled,
    ticketFlowRecoveryRequired: serializeMoney(calc.ticketFlowRecoveryRequired),
    refundReserveRequired: serializeMoney(calc.refundReserveRequired),
    requiresEtimsCreditNote: calc.requiresEtimsCreditNote,
    components: calc.components.map((c) => ({
      ...c,
      taxBase: serializeMoney(c.taxBase),
      taxAmount: serializeMoney(c.taxAmount),
    })),
    warnings: calc.warnings,
    calculationHash: calc.calculationHash,
  };
}
