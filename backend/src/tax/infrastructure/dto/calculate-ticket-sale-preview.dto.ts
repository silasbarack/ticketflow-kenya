import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class MoneyDto {
  @IsIn(["KES"])
  currency!: "KES";

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number; // major units, e.g. 1500.00 — converted server-side, never trusted as the final total
}

export class FeeCalculationDto {
  @IsIn(["FIXED", "PERCENTAGE"])
  kind!: "FIXED" | "PERCENTAGE";

  @ValidateNested()
  @Type(() => MoneyDto)
  @IsOptional()
  amount?: MoneyDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  rateBps?: number;
}

export class FeeSpecDto {
  @ValidateNested()
  @Type(() => FeeCalculationDto)
  calculation!: FeeCalculationDto;

  @IsIn(["VAT_INCLUSIVE", "VAT_EXCLUSIVE"])
  pricingMode!: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";
}

export class TicketSaleLineDto {
  @IsString()
  @IsNotEmpty()
  ticketTypeId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;

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

export class CalculateTicketSalePreviewDto {
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  organizerId!: string;

  @IsISO8601()
  transactionDate!: string;

  @IsIn(["KES"])
  currency!: "KES";

  @IsIn(["DISCLOSED_AGENT", "PRINCIPAL_RESELLER"])
  agencyModel!: "DISCLOSED_AGENT" | "PRINCIPAL_RESELLER";

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketSaleLineDto)
  ticketLines!: TicketSaleLineDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeSpecDto)
  customerBookingFee?: FeeSpecDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FeeSpecDto)
  organizerCommission?: FeeSpecDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  processorCharge?: MoneyDto;

  @IsIn(["TICKETFLOW", "ORGANIZER", "CUSTOMER"])
  processorChargeBearer!: "TICKETFLOW" | "ORGANIZER" | "CUSTOMER";

  @IsIn(["REGISTERED", "NOT_REGISTERED"])
  ticketFlowVatRegistrationStatus!: "REGISTERED" | "NOT_REGISTERED";

  @IsIn(["REGISTERED", "NOT_REGISTERED", "UNKNOWN"])
  organizerVatRegistrationStatus!: "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";
}
