import { IsString, IsUUID } from 'class-validator';

export class ManualCheckinDto {
  @IsString()
  ticketCode: string;

  @IsUUID()
  eventId: string;
}
