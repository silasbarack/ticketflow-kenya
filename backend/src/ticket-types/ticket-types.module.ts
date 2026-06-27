import { Module } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { TicketTypesController } from './ticket-types.controller';

@Module({
  providers: [TicketTypesService],
  controllers: [TicketTypesController],
  exports: [TicketTypesService],
})
export class TicketTypesModule {}
