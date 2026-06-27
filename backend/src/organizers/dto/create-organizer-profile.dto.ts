import { IsOptional, IsString } from 'class-validator';

export class UpdateOrganizerProfileDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
