import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryEventsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  @IsOptional()
  @IsNumberString()
  take?: string;

  @IsOptional()
  @IsNumberString()
  skip?: string;

  /**
   * Public listings hide events that have already finished. Set to `true` to
   * include them — used by search/archive views, never by the catalogue.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includePast?: boolean;
}
