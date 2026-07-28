import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateCompanyTaxProfileDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  kraPin?: string;

  @IsOptional()
  @IsIn(["REGISTERED", "NOT_REGISTERED", "PENDING"])
  vatRegistrationStatus?: "REGISTERED" | "NOT_REGISTERED" | "PENDING";

  @IsOptional()
  @IsIn(["DISCLOSED_AGENT", "PRINCIPAL_RESELLER"])
  agencyModel?: "DISCLOSED_AGENT" | "PRINCIPAL_RESELLER";

  @IsOptional()
  @IsIn(["DISABLED", "SANDBOX", "OSCU", "VSCU"])
  etimsMode?: "DISABLED" | "SANDBOX" | "OSCU" | "VSCU";

  @IsOptional()
  @IsIn([
    "MANUAL_PRN",
    "SANDBOX",
    "APPROVED_BANK_INTEGRATION",
    "APPROVED_MPESA_INTEGRATION",
  ])
  taxPaymentMode?:
    | "MANUAL_PRN"
    | "SANDBOX"
    | "APPROVED_BANK_INTEGRATION"
    | "APPROVED_MPESA_INTEGRATION";
}
