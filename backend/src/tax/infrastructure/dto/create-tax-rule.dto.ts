import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateTaxRuleDto {
  @IsIn([
    "TICKETFLOW_PLATFORM_OUTPUT_VAT",
    "ORGANIZER_TICKET_OUTPUT_VAT",
    "CORPORATION_TAX_PROVISION",
    "SUPPLIER_WITHHOLDING_TAX",
    "PAYE",
    "AFFORDABLE_HOUSING_LEVY",
    "OTHER",
  ])
  code!: string;

  @IsInt()
  @Min(0)
  rateBps!: number;

  @IsISO8601()
  effectiveFrom!: string;

  @IsOptional()
  @IsISO8601()
  effectiveTo?: string;

  @IsOptional()
  @IsIn(["HALF_UP", "DOWN"])
  roundingMode?: "HALF_UP" | "DOWN";

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsString()
  sourceReference!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveTaxRuleDto {}
