import { IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_POLICY_REGEX } from '../../common/validators/password.validator';

export class ResetPasswordDto {
  /** The authorisation returned by verify-code: 32 random bytes, base64url. */
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'Invalid or expired reset session' })
  resetToken: string;

  @IsString()
  @MaxLength(128)
  @Matches(PASSWORD_POLICY_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;
}
