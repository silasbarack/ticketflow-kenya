import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AiAssistController } from './ai-assist.controller';
import { AiAssistService } from './ai-assist.service';
import { AiDraftsService } from './ai-drafts.service';
import { SalesAnalyticsService } from './sales-analytics.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [AiAssistController],
  providers: [AiAssistService, AiDraftsService, SalesAnalyticsService],
})
export class AiAssistModule {}
