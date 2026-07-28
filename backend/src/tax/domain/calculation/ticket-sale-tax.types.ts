import { Money } from "../money/money";

export type VatRegistrationStatus = "REGISTERED" | "NOT_REGISTERED";
export type OrganizerVatRegistrationStatus =
  "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";
export type AgencyModel = "DISCLOSED_AGENT" | "PRINCIPAL_RESELLER";
export type TicketPricingMode = "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";
export type EventSupplyTreatment =
  | "STANDARD_RATED"
  | "ZERO_RATED"
  | "EXEMPT"
  | "OUT_OF_SCOPE"
  | "REQUIRES_REVIEW";
export type ChargeBearer = "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";
export type ComponentOwner = "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";

export type FeeCalculation =
  { kind: "FIXED"; amount: Money } | { kind: "PERCENTAGE"; rateBps: number };

export interface TicketSaleLineInput {
  ticketTypeId: string;
  quantity: number;
  unitTicketPrice: Money;
  ticketPricingMode: TicketPricingMode;
  eventSupplyTreatment: EventSupplyTreatment;
}

export interface CalculateTicketSaleTaxInput {
  transactionId: string;
  orderId: string;
  eventId: string;
  organizerId: string;
  transactionDate: string; // ISO date-time; used to select effective-dated tax rules
  currency: "KES";

  agencyModel: AgencyModel;

  ticketLines: TicketSaleLineInput[];

  customerBookingFee?: {
    calculation: FeeCalculation;
    pricingMode: TicketPricingMode;
  };

  organizerCommission?: {
    calculation: FeeCalculation;
    pricingMode: TicketPricingMode;
  };

  processorCharge?: Money;
  processorChargeBearer: ChargeBearer;

  ticketFlowVatRegistrationStatus: VatRegistrationStatus;
  organizerVatRegistrationStatus: OrganizerVatRegistrationStatus;

  /** Who/what triggered this calculation, for audit purposes. */
  requestedBy?: string;
}

export interface TaxCalculationComponent {
  code: string;
  owner: ComponentOwner;
  taxBase: Money;
  rateBps: number;
  taxAmount: Money;
  formula: string;
}

export interface TicketSaleTaxCalculation {
  calculationId: string;
  ruleVersionIds: string[];

  customerPayment: Money;

  organizerTicketProceedsGross: Money;
  organizerTicketNetOfVat?: Money;
  organizerTicketOutputVat?: Money;

  bookingFeeGross: Money;
  bookingFeeNet: Money;
  bookingFeeVat: Money;

  commissionGross: Money;
  commissionNet: Money;
  commissionVat: Money;

  ticketFlowRevenueExcludingVat: Money;
  ticketFlowOutputVat: Money;

  processorCharge: Money;
  organizerSettlementBeforeRefunds: Money;
  ticketFlowCashRetainedBeforeOtherCosts: Money;

  components: TaxCalculationComponent[];

  warnings: string[];
  calculationHash: string;
}
