import { IsOptional, IsString } from "class-validator";

export class RecordPaymentConfirmationDto {
  @IsOptional()
  @IsString()
  bankReference?: string;

  @IsOptional()
  @IsString()
  mpesaReference?: string;

  @IsOptional()
  @IsString()
  evidenceFileRef?: string;

  @IsOptional()
  @IsString()
  kraConfirmationReference?: string;
}
