import { IsString, IsUUID, Matches } from 'class-validator';
import { KENYA_PHONE_REGEX, KENYA_PHONE_MESSAGE } from '../../common/validators/phone.validator';

export class InitiateStkPushDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE })
  phone: string;
}
