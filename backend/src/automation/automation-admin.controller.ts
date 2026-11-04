import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/enums/roles.enum';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AutomationQueueService } from './automation-queue.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { AutomationActivityService } from './automation-activity.service';
import { PaymentMonitorService } from './payment-monitor.service';
import { RiskMonitorService } from './risk-monitor.service';
import { VerificationAutomationService } from './verification-automation.service';
import { EventReminderService } from './event-reminder.service';
import { AlertDecisionDto } from './dto';

@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/automation')
export class AutomationAdminController {
  constructor(
    private readonly queue: AutomationQueueService,
    private readonly alerts: OperationalAlertsService,
    private readonly activity: AutomationActivityService,
    private readonly payments: PaymentMonitorService,
    private readonly risk: RiskMonitorService,
    private readonly verification: VerificationAutomationService,
    private readonly reminders: EventReminderService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get('overview')
  async overview() {
    const [jobs, alerts] = await Promise.all([this.queue.counts(), this.alerts.counts()]);
    return { jobs, alerts, riskThresholds: this.risk.thresholds };
  }

  @Get('activity')
  feed(@Query('take') take?: string) {
    return this.activity.feed(Math.min(parseInt(take || '80', 10) || 80, 200));
  }

  @Get('jobs')
  jobs(@Query('status') status?: string, @Query('type') type?: string) {
    return this.queue.list({ status, type });
  }

  @Post('jobs/:id/retry')
  async retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.queue.retry(id);
    await this.audit.log({
      actorId: user.userId,
      action: 'AUTOMATION_JOB_RETRIED',
      entityType: 'AutomationJob',
      entityId: id,
      metadata: { retried: result.retried },
    });
    return result;
  }

  @Post('jobs/:id/cancel')
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const result = await this.queue.cancel(id);
    await this.audit.log({
      actorId: user.userId,
      action: 'AUTOMATION_JOB_CANCELLED',
      entityType: 'AutomationJob',
      entityId: id,
      metadata: result,
    });
    return result;
  }

  /** Runs a detector now. Detectors only read, raise alerts and queue notices. */
  @Post('monitors/:name/run')
  async runMonitor(@CurrentUser() user: AuthenticatedUser, @Param('name') name: string) {
    const runners: Record<string, () => Promise<unknown>> = {
      payments: () => this.payments.run(),
      risk: () => this.risk.run(),
      verification: () => this.verification.run(),
      reminders: () => this.reminders.run(),
    };
    const runner = runners[name];
    if (!runner) throw new BadRequestException('Unknown monitor');
    const result = await runner();
    await this.audit.log({
      actorId: user.userId,
      action: 'AUTOMATION_MONITOR_RUN',
      entityType: 'Monitor',
      entityId: name,
      metadata: { result: result as Record<string, unknown> },
    });
    return result;
  }

  @Get('alerts')
  listAlerts(@Query('status') status?: string, @Query('category') category?: string) {
    return this.alerts.list({ status, category });
  }

  @Post('alerts/:id/decision')
  decide(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AlertDecisionDto) {
    return this.alerts.decide(id, user.userId, dto.decision, dto.note);
  }

  @Post('alerts/:id/explain')
  explain(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alerts.explain(id, user.userId);
  }
}
