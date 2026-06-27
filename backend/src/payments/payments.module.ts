import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MpesaModule } from '../mpesa/mpesa.module';
import { OrdersModule } from '../orders/orders.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MpesaModule, OrdersModule, TicketsModule, AuditLogsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
