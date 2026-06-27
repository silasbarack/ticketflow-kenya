import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TicketTypeCategoryDto } from './create-ticket-type.dto';

export class UpdateTicketTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TicketTypeCategoryDto)
  category?: TicketTypeCategoryDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
