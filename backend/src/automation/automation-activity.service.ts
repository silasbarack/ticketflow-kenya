import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ActivityItem {
  id: string;
  at: Date;
  source: 'JOB' | 'ALERT' | 'AI' | 'AUDIT';
  title: string;
  status: string;
  detail?: string;
}

const AUTOMATION_AUDIT_ACTIONS = [
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'PAYMENT_EXPIRED',
  'PAYMENT_CALLBACK_REJECTED',
  'VERIFICATION_STATUS_SYNCED',
  'AI_SETTINGS_UPDATED',
  'ALERT_ACKNOWLEDGED',
  'ALERT_RESOLVED',
  'ALERT_DISMISSED',
  'SUPPORT_ESCALATED',
  'SUPPORT_TICKET_UPDATED',
  'AI_DRAFT_ACCEPTED',
  'AUTOMATION_JOB_RETRIED',
  'AUTOMATION_MONITOR_RUN',
];

/** One chronological feed of what the automation engine and AI have done. */
@Injectable()
export class AutomationActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(take = 80): Promise<ActivityItem[]> {
    const [jobs, alerts, ai, audits] = await Promise.all([
      this.prisma.automationJob.findMany({ orderBy: { updatedAt: 'desc' }, take }),
      this.prisma.operationalAlert.findMany({ orderBy: { lastSeenAt: 'desc' }, take }),
      this.prisma.aiUsageLog.findMany({ orderBy: { createdAt: 'desc' }, take }),
      this.prisma.auditLog.findMany({
        where: { action: { in: AUTOMATION_AUDIT_ACTIONS } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    const items: ActivityItem[] = [
      ...jobs.map((j) => ({
        id: `job:${j.id}`,
        at: j.updatedAt,
        source: 'JOB' as const,
        title: j.type.replace(/_/g, ' ').toLowerCase(),
        status: j.status,
        detail: j.lastError ? `Attempt ${j.attempts}/${j.maxAttempts}: ${j.lastError}` : `Attempt ${j.attempts}/${j.maxAttempts}`,
      })),
      ...alerts.map((a) => ({
        id: `alert:${a.id}`,
        at: a.lastSeenAt,
        source: 'ALERT' as const,
        title: a.title,
        status: `${a.severity} · ${a.status}`,
        detail: a.occurrences > 1 ? `Seen ${a.occurrences} times` : undefined,
      })),
      ...ai.map((u) => ({
        id: `ai:${u.id}`,
        at: u.createdAt,
        source: 'AI' as const,
        title: `${u.feature.replace(/_/g, ' ').toLowerCase()} request`,
        status: u.status,
        detail:
          u.status === 'SUCCESS'
            ? `${u.inputTokens + u.outputTokens} tokens · $${Number(u.costUsd).toFixed(4)}`
            : (u.errorCode ?? undefined),
      })),
      ...audits.map((l) => ({
        id: `audit:${l.id}`,
        at: l.createdAt,
        source: 'AUDIT' as const,
        title: l.action.replace(/_/g, ' ').toLowerCase(),
        status: l.entityType,
      })),
    ];
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
  }
}
