import { IsString, IsUUID } from 'class-validator';

export class InitiateStkPushDto {
  @IsUUID()
  orderId: string;

  @IsString()
  phone: string;
}
