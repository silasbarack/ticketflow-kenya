import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SupportService } from './support.service';
import { SupportAdminController, SupportMeController, SupportPublicController } from './support.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [SupportPublicController, SupportMeController, SupportAdminController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
