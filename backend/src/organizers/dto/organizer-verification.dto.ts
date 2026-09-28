import { IsEmail, IsIn, IsOptional, IsString, IsUrl, Length, Matches, MinLength } from 'class-validator';
import { KENYA_PHONE_REGEX, KENYA_PHONE_MESSAGE } from '../../common/validators/phone.validator';

export class UpdateCompanyVerificationDto {
  @IsString() @MinLength(2) legalBusinessName: string;
  @IsString() @MinLength(2) registrationNumber: string;
  @IsString() @MinLength(4) businessAddress: string;
  @IsEmail() companyEmail: string;
  @IsString() @Matches(KENYA_PHONE_REGEX, { message: KENYA_PHONE_MESSAGE }) companyPhone: string;
}

export class UpdateVerificationDocumentsDto {
  @IsUrl({ require_protocol: true }) certificateOfIncorporationUrl: string;
  @IsUrl({ require_protocol: true }) officialSearchUrl: string;
  @IsUrl({ require_protocol: true }) kraPinCertificateUrl: string;
}

export class UpdateRepresentativeVerificationDto {
  @IsString() @MinLength(3) representativeFullName: string;
  @IsString() @MinLength(2) representativeRole: string;
  @IsString() @Length(2, 8) representativeIdLast4: string;
  @IsUrl({ require_protocol: true }) representativeIdDocumentUrl: string;
  @IsOptional() @IsUrl({ require_protocol: true }) authorizationLetterUrl?: string;
}

export class UpdatePayoutVerificationDto {
  @IsString() @IsIn(['BANK','MPESA_PAYBILL','MPESA_TILL','OTHER']) payoutMethod: string;
  @IsString() @MinLength(2) payoutAccountName: string;
  @IsString() @MinLength(2) payoutReference: string;
  @IsUrl({ require_protocol: true }) payoutProofUrl: string;
}

export class ReviewOrganizerVerificationDto {
  @IsOptional() @IsString() note?: string;
}
