import {
  money,
  Money,
  minorUnitsFromDecimalString,
} from "../../domain/money/money";
import { CalculateTicketSaleTaxInput } from "../../domain/calculation/ticket-sale-tax.types";
import { CalculateRefundTaxInput } from "../../domain/refund/refund-tax.types";
import {
  CalculateTicketSalePreviewDto,
  MoneyDto,
} from "./calculate-ticket-sale-preview.dto";
import { CalculateRefundTaxDto } from "./calculate-refund-tax.dto";

export function moneyDtoToMoney(dto: MoneyDto): Money {
  // amount arrives as a validated JS number (max 2dp) from class-validator;
  // route it through the exact decimal-string parser rather than doing
  // float arithmetic on it directly.
  return money(
    minorUnitsFromDecimalString(dto.amount.toFixed(2)),
    dto.currency,
  );
}

export function mapPreviewDtoToInput(
  dto: CalculateTicketSalePreviewDto,
): CalculateTicketSaleTaxInput {
  return {
    transactionId: dto.transactionId,
    orderId: dto.orderId,
    eventId: dto.eventId,
    organizerId: dto.organizerId,
    transactionDate: dto.transactionDate,
    currency: dto.currency,
    agencyModel: dto.agencyModel,
    ticketLines: dto.ticketLines.map((line) => ({
      ticketTypeId: line.ticketTypeId,
      quantity: line.quantity,
      unitTicketPrice: moneyDtoToMoney(line.unitTicketPrice),
      ticketPricingMode: line.ticketPricingMode,
      eventSupplyTreatment: line.eventSupplyTreatment,
    })),
    customerBookingFee: dto.customerBookingFee
      ? {
          calculation:
            dto.customerBookingFee.calculation.kind === "FIXED"
              ? {
                  kind: "FIXED",
                  amount: moneyDtoToMoney(
                    dto.customerBookingFee.calculation.amount!,
                  ),
                }
              : {
                  kind: "PERCENTAGE",
                  rateBps: dto.customerBookingFee.calculation.rateBps!,
                },
          pricingMode: dto.customerBookingFee.pricingMode,
        }
      : undefined,
    organizerCommission: dto.organizerCommission
      ? {
          calculation:
            dto.organizerCommission.calculation.kind === "FIXED"
              ? {
                  kind: "FIXED",
                  amount: moneyDtoToMoney(
                    dto.organizerCommission.calculation.amount!,
                  ),
                }
              : {
                  kind: "PERCENTAGE",
                  rateBps: dto.organizerCommission.calculation.rateBps!,
                },
          pricingMode: dto.organizerCommission.pricingMode,
        }
      : undefined,
    processorCharge: dto.processorCharge
      ? moneyDtoToMoney(dto.processorCharge)
      : undefined,
    processorChargeBearer: dto.processorChargeBearer,
    ticketFlowVatRegistrationStatus: dto.ticketFlowVatRegistrationStatus,
    organizerVatRegistrationStatus: dto.organizerVatRegistrationStatus,
  };
}

export function mapRefundDtoToInput(
  dto: CalculateRefundTaxDto,
): CalculateRefundTaxInput {
  return {
    refundId: dto.refundId,
    orderId: dto.orderId,
    originalCalculationId: dto.originalCalculationId,
    reason: dto.reason as CalculateRefundTaxInput["reason"],
    transactionDate: dto.transactionDate,
    currency: dto.currency,
    agencyModel: dto.agencyModel,
    refundLines: dto.refundLines.map((line) => ({
      ticketTypeId: line.ticketTypeId,
      quantity: line.quantity,
      quantityRefunded: line.quantityRefunded,
      unitTicketPrice: moneyDtoToMoney(line.unitTicketPrice),
      ticketPricingMode: line.ticketPricingMode,
      eventSupplyTreatment: line.eventSupplyTreatment,
    })),
    originalBookingFeeGross: moneyDtoToMoney(dto.originalBookingFeeGross),
    bookingFeePricingMode: dto.bookingFeePricingMode,
    bookingFeeRefundPolicy: dto.bookingFeeRefundPolicy,
    originalCommissionGross: moneyDtoToMoney(dto.originalCommissionGross),
    commissionPricingMode: dto.commissionPricingMode,
    commissionReversalPolicy: dto.commissionReversalPolicy,
    ticketFlowVatRegistrationStatus: dto.ticketFlowVatRegistrationStatus,
    organizerVatRegistrationStatus: dto.organizerVatRegistrationStatus,
    processorCharge: moneyDtoToMoney(dto.processorCharge),
    processorChargeBearer: dto.processorChargeBearer,
    processorChargeRefundable: dto.processorChargeRefundable,
    organizerAlreadySettled: dto.organizerAlreadySettled,
  };
}
