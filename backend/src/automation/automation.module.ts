import { Global, Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EmailModule } from '../email/email.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PersonaIdentityModule } from '../identity/persona-identity.module';
import { AutomationQueueService } from './automation-queue.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { AutomationHandlersService } from './automation-handlers.service';
import { PaymentMonitorService } from './payment-monitor.service';
import { EventReminderService } from './event-reminder.service';
import { VerificationAutomationService } from './verification-automation.service';
import { RiskMonitorService } from './risk-monitor.service';
import { AutomationActivityService } from './automation-activity.service';
import { AutomationAdminController } from './automation-admin.controller';
import { OrganizerVerificationInsightController } from './organizer-verification-insight.controller';

/**
 * Global so payments, check-ins and support can raise alerts and enqueue jobs
 * without importing this module (which itself depends on tickets & email).
 */
@Global()
@Module({
  imports: [AuditLogsModule, EmailModule, TicketsModule, PersonaIdentityModule],
  controllers: [AutomationAdminController, OrganizerVerificationInsightController],
  providers: [
    AutomationQueueService,
    OperationalAlertsService,
    AutomationHandlersService,
    PaymentMonitorService,
    EventReminderService,
    VerificationAutomationService,
    RiskMonitorService,
    AutomationActivityService,
  ],
  exports: [AutomationQueueService, OperationalAlertsService],
})
export class AutomationModule {}
