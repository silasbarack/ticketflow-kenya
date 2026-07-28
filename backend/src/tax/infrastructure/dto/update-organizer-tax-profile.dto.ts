import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class UpdateOrganizerTaxProfileDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  kraPin?: string;

  @IsOptional()
  @IsIn(["REGISTERED", "NOT_REGISTERED", "UNKNOWN"])
  vatRegistrationStatus?: "REGISTERED" | "NOT_REGISTERED" | "UNKNOWN";

  @IsOptional()
  @IsIn([
    "STANDARD_RATED",
    "ZERO_RATED",
    "EXEMPT",
    "OUT_OF_SCOPE",
    "REQUIRES_REVIEW",
  ])
  eventSupplyTreatment?:
    | "STANDARD_RATED"
    | "ZERO_RATED"
    | "EXEMPT"
    | "OUT_OF_SCOPE"
    | "REQUIRES_REVIEW";

  @IsOptional()
  @IsIn(["VAT_INCLUSIVE", "VAT_EXCLUSIVE"])
  ticketPricingMode?: "VAT_INCLUSIVE" | "VAT_EXCLUSIVE";

  @IsOptional()
  @IsBoolean()
  delegatedTaxPaymentAuthority?: boolean;

  @IsOptional()
  @IsString()
  delegatedAuthorityDocumentId?: string;
}
