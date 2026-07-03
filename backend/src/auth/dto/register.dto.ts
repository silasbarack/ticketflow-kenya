import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '../../common/enums/roles.enum';
import { KENYA_PHONE_REGEX, KENYA_PHONE_MESSAGE } from '../../common/validators/phone.validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  companyName?: string;
}
