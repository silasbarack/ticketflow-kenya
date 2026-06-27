import { IsString, IsUUID } from 'class-validator';

export class ScanTicketDto {
  // Raw decoded QR payload (JSON string containing { code, orderId })
  @IsString()
  qrData: string;

  @IsUUID()
  eventId: string;
}
