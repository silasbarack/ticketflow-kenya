import {
  IsIn,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class AttachPrnDto {
  @IsString()
  @MinLength(4)
  prn!: string;

  @IsString()
  @MinLength(4)
  taxpayerPin!: string;

  @IsString()
  taxHead!: string;

  @IsOptional()
  @IsString()
  taxSubHead?: string;

  @IsString()
  taxPeriod!: string;

  @IsNumberString()
  amount!: string;

  @IsIn(["KES"])
  currency!: "KES";

  @IsOptional()
  @IsISO8601()
  issuedAt?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsIn(["MANUAL_ENTRY", "FILE_UPLOAD", "APPROVED_API"])
  source?: "MANUAL_ENTRY" | "FILE_UPLOAD" | "APPROVED_API";
}
