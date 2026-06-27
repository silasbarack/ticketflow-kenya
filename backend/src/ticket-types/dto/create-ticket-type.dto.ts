import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum TicketTypeCategoryDto {
  REGULAR = 'REGULAR',
  VIP = 'VIP',
  VVIP = 'VVIP',
  STUDENT = 'STUDENT',
  EARLY_BIRD = 'EARLY_BIRD',
}

export class CreateTicketTypeDto {
  @IsString()
  name: string;

  @IsEnum(TicketTypeCategoryDto)
  category: TicketTypeCategoryDto;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  description?: string;
}
