import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MARKETING_CHANNELS } from './schemas';

const LANGUAGES = ['en', 'sw'];

export class EventAssistantDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  categoryName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  venue!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @IsOptional()
  @IsDateString()
  endDateTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  targetAudience?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  basicDescription!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(LANGUAGES, { each: true })
  languages!: ('en' | 'sw')[];
}

export class MarketingDto {
  @IsUUID()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsIn(MARKETING_CHANNELS as unknown as string[], { each: true })
  channels!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(LANGUAGES, { each: true })
  languages!: ('en' | 'sw')[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  notes?: string;
}

export class EditDraftDto {
  @IsObject()
  output!: Record<string, unknown>;
}

export class OpsReportDto {
  @IsIn(['daily', 'weekly'])
  period!: 'daily' | 'weekly';
}
