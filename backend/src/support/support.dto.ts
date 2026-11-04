import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SupportChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1500)
  message!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class SupportFeedbackDto {
  @IsInt()
  @Min(-1)
  @Max(1)
  value!: 1 | -1;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export const SUPPORT_CATEGORIES = ['PAYMENT', 'TICKET_ACCESS', 'REFUND', 'EVENT_INFO', 'ORGANIZER', 'ACCOUNT', 'OTHER'] as const;

export class CreateSupportTicketDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(140)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsIn(SUPPORT_CATEGORIES as unknown as string[])
  category!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  orderNumber?: string;
}

export class AdminUpdateSupportTicketDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsIn(['LOW', 'NORMAL', 'HIGH'])
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  resolutionNote?: string;
}

export class AdminReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
