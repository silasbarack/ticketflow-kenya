import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { KENYA_PHONE_REGEX, KENYA_PHONE_MESSAGE } from '../../common/validators/phone.validator';

export class AttendeeDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  nationalId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE })
  phone!: string;
}

export class OrderItemDto {
  @IsUUID()
  ticketTypeId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendeeDto)
  attendees?: AttendeeDto[];
}

export class CreateOrderDto {
  @IsUUID()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE })
  customerPhone?: string;
}
