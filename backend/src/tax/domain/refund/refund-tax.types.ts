import { Money } from "../money/money";
import {
  AgencyModel,
  ChargeBearer,
  EventSupplyTreatment,
  TicketPricingMode,
  VatRegistrationStatus,
} from "../calculation/ticket-sale-tax.types";

export type RefundReason =
  | "EVENT_CANCELLED"
  | "EVENT_POSTPONED"
  | "CUSTOMER_REQUEST"
  | "DUPLICATE_PAYMENT"
  | "FRAUD"
  | "CHARGEBACK"
  | "ADMIN_CORRECTION";

export type FeeRefundPolicy = "FULL" | "PRORATED" | "NON_REFUNDABLE";
export type CommissionReversalPolicy = "FULL" | "PRORATED" | "NONE";

export interface RefundTicketLineInput {
  ticketTypeId: string;
  quantity: number;
  quantityRefunded: number;
  unitTicketPrice: Money;
  ticketPricingMode: TicketPricingMode;
  eventSupplyTreatment: EventSupplyTreatment;
}

export interface CalculateRefundTaxInput {
  refundId: string;
  orderId: string;
  originalCalculationId: string;
  reason: RefundReason;
  transactionDate: string;
  currency: "KES";
  agencyModel: AgencyModel;

  refundLines: RefundTicketLineInput[];

  originalBookingFeeGross: Money;
  bookingFeePricingMode: TicketPricingMode;
  bookingFeeRefundPolicy: FeeRefundPolicy;

  originalCommissionGross: Money;
  commissionPricingMode: TicketPricingMode;
  commissionReversalPolicy: CommissionReversalPolicy;

  ticketFlowVatRegistrationStatus: VatRegistrationStatus;
  organizerVatRegistrationStatus: "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";

  processorCharge: Money;
  processorChargeBearer: ChargeBearer;
  processorChargeRefundable: boolean;

  organizerAlreadySettled: boolean;
}

export interface RefundTaxCalculationComponent {
  code: string;
  owner: "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";
  taxBase: Money;
  rateBps: number;
  taxAmount: Money;
  formula: string;
}

export interface RefundTaxCalculation {
  calculationId: string;
  refundId: string;
  originalCalculationId: string;
  ruleVersionIds: string[];

  refundableTicketFaceValue: Money;
  refundableBookingFee: Money;
  nonRefundableFee: Money;

  ticketFlowRevenueReversal: Money;
  ticketFlowVatReversal: Money;
  bookingFeeNetReversal: Money;
  bookingFeeVatReversal: Money;
  commissionNetReversal: Money;
  commissionVatReversal: Money;
  organizerPayableReversal: Money;
  organizerTicketVatReversal?: Money;

  processorChargeTreatment:
    | "REFUNDED_TO_CUSTOMER"
    | "RETAINED_BY_PROCESSOR"
    | "ABSORBED_BY_TICKETFLOW"
    | "ABSORBED_BY_ORGANIZER";

  organizerAlreadySettled: boolean;
  ticketFlowRecoveryRequired: Money;
  refundReserveRequired: Money;
  requiresEtimsCreditNote: boolean;

  components: RefundTaxCalculationComponent[];
  warnings: string[];
  calculationHash: string;
}
