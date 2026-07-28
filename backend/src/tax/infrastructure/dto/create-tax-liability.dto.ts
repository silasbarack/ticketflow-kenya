import {
  IsIn,
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateTaxLiabilityDto {
  @IsOptional()
  @IsString()
  periodId?: string;

  @IsString()
  taxHead!: string;

  @IsOptional()
  @IsString()
  taxSubHead?: string;

  @IsIn(["TICKETFLOW", "ORGANIZER"])
  owner!: "TICKETFLOW" | "ORGANIZER";

  @IsOptional()
  @IsString()
  organizerId?: string;

  @IsNumberString()
  amount!: string; // decimal major-unit string, e.g. "24500.00"

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class RejectTaxLiabilityDto {
  @IsString()
  reason!: string;
}
