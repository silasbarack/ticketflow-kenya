import { IsOptional, IsString, Matches } from 'class-validator';
import { KENYA_PHONE_REGEX, KENYA_PHONE_MESSAGE } from '../../common/validators/phone.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE })
  phone?: string;
}
