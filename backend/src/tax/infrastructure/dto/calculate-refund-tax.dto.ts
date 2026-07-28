import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { MoneyDto } from "./calculate-ticket-sale-preview.dto";

export class RefundLineDto {
  @IsString()
  @IsNotEmpty()
  ticketTypeId!: string;

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsInt()
  @Min(0)
  quantityRefunded!: number;

  @ValidateNested()
  @Type(() => MoneyDto)
  unitTicketPrice!: MoneyDto;

  @IsIn(["VAT_INCLUSIVE", "VAT_EXCLUSIVE"])
  ticketPricingMode!: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";

  @IsIn([
    "STANDARD_RATED",
    "ZERO_RATED",
    "EXEMPT",
    "OUT_OF_SCOPE",
    "REQUIRES_REVIEW",
  ])
  eventSupplyTreatment!:
    | "STANDARD_RATED"
    | "ZERO_RATED"
    | "EXEMPT"
    | "OUT_OF_SCOPE"
    | "REQUIRES_REVIEW";
}

export class CalculateRefundTaxDto {
  @IsString()
  @IsNotEmpty()
  refundId!: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  originalCalculationId!: string;

  @IsIn([
    "EVENT_CANCELLED",
    "EVENT_POSTPONED",
    "CUSTOMER_REQUEST",
    "DUPLICATE_PAYMENT",
    "FRAUD",
    "CHARGEBACK",
    "ADMIN_CORRECTION",
  ])
  reason!: string;

  @IsISO8601()
  transactionDate!: string;

  @IsIn(["KES"])
  currency!: "KES";

  @IsIn(["DISCLOSED_AGENT", "PRINCIPAL_RESELLER"])
  agencyModel!: "DISCLOSED_AGENT" | "PRINCIPAL_RESELLER";

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RefundLineDto)
  refundLines!: RefundLineDto[];

  @ValidateNested()
  @Type(() => MoneyDto)
  originalBookingFeeGross!: MoneyDto;

  @IsIn(["VAT_INCLUSIVE", "VAT_EXCLUSIVE"])
  bookingFeePricingMode!: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";

  @IsIn(["FULL", "PRORATED", "NON_REFUNDABLE"])
  bookingFeeRefundPolicy!: "FULL" | "PRORATED" | "NON_REFUNDABLE";

  @ValidateNested()
  @Type(() => MoneyDto)
  originalCommissionGross!: MoneyDto;

  @IsIn(["VAT_INCLUSIVE", "VAT_EXCLUSIVE"])
  commissionPricingMode!: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";

  @IsIn(["FULL", "PRORATED", "NONE"])
  commissionReversalPolicy!: "FULL" | "PRORATED" | "NONE";

  @IsIn(["REGISTERED", "NOT_REGISTERED"])
  ticketFlowVatRegistrationStatus!: "REGISTERED" | "NOT_REGISTERED";

  @IsIn(["REGISTERED", "NOT_REGISTERED", "UNKNOWN"])
  organizerVatRegistrationStatus!: "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";

  @ValidateNested()
  @Type(() => MoneyDto)
  processorCharge!: MoneyDto;

  @IsIn(["TICKETFLOW", "ORGANIZER", "CUSTOMER"])
  processorChargeBearer!: "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";

  @IsBoolean()
  processorChargeRefundable!: boolean;

  @IsBoolean()
  organizerAlreadySettled!: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originalRuleVersionIds?: string[];
}
