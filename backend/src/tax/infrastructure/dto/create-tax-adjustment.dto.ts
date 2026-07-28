import { IsIn, IsNumberString, IsOptional, IsString } from "class-validator";

export class CreateTaxAdjustmentDto {
  @IsIn(["DEBIT", "CREDIT"])
  type!: "DEBIT" | "CREDIT";

  @IsIn([
    "INPUT_VAT",
    "WITHHOLDING_VAT_CREDIT",
    "CREDIT_NOTE",
    "DEBIT_NOTE",
    "OTHER",
  ])
  category!:
    | "INPUT_VAT"
    | "WITHHOLDING_VAT_CREDIT"
    | "CREDIT_NOTE"
    | "DEBIT_NOTE"
    | "OTHER";

  @IsNumberString()
  amount!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  evidenceRef?: string;
}
