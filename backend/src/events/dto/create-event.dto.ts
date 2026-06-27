import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsString()
  venue: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsDateString()
  startDateTime: string;

  @IsDateString()
  endDateTime: string;
}
