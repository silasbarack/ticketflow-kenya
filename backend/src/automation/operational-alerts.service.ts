import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AiService } from '../ai/ai.service';
import { AI_FEATURES } from '../ai/ai-features';
import { redactPersonalData, UNTRUSTED_CONTENT_RULE, untrusted } from '../ai/ai-safety';
import { AutomationQueueService } from './automation-queue.service';
import { JOB_TYPES } from './job-types';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertCategory = 'PAYMENT' | 'RISK' | 'VERIFICATION' | 'SUPPORT' | 'SYSTEM';
export type AlertDecision = 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface RaiseAlertInput {
  kind: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  dedupeKey: string;
  entityType?: string;
  entityId?: string;
  /** Ids, counts and amounts only — no names, phones or emails. */
  details: Record<string, unknown>;
}

const ExplanationSchema = z.object({
  summary: z.string().min(1).max(1200),
  likelyCauses: z.array(z.string().max(300)).max(5),
  suggestedChecks: z.array(z.string().max(300)).max(6),
  confidence: z.enum(['low', 'medium', 'high']),
});

/**
 * Anything a human should look at. Rules raise alerts; only an admin can close
 * one, and closing requires a written decision that is audit-logged. Nothing
 * here bans users, cancels tickets, moves money or rejects KYC.
 */
@Injectable()
export class OperationalAlertsService {
  private readonly logger = new Logger(OperationalAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
    private readonly queue: AutomationQueueService,
    private readonly ai: AiService,
  ) {}

  /**
   * Idempotent: the same dedupeKey bumps the existing alert instead of making a
   * new one. An alert an admin already closed stays closed — the detector will
   * not reopen a decision. Never throws, so callers in payment paths are safe.
   */
  async raise(input: RaiseAlertInput) {
    try {
      const existing = await this.prisma.operationalAlert.findUnique({ where: { dedupeKey: input.dedupeKey } });
      if (existing) {
        if (existing.status === 'OPEN' || existing.status === 'ACKNOWLEDGED') {
          return await this.prisma.operationalAlert.update({
            where: { id: existing.id },
            data: { occurrences: { increment: 1 }, lastSeenAt: new Date(), details: input.details as Prisma.InputJsonValue },
          });
        }
        return existing;
      }

      const alert = await this.prisma.operationalAlert.create({
        data: {
          kind: input.kind,
          severity: input.severity,
          category: input.category,
          title: input.title,
          dedupeKey: input.dedupeKey,
          entityType: input.entityType,
          entityId: input.entityId,
          details: input.details as Prisma.InputJsonValue,
        },
      });

      if (alert.severity === 'CRITICAL') {
        await this.queue.enqueueSafely(JOB_TYPES.ADMIN_ALERT_EMAIL, `admin-alert-email:${alert.id}`, { alertId: alert.id });
      }
      return alert;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.operationalAlert.findUnique({ where: { dedupeKey: input.dedupeKey } });
      }
      this.logger.error(`Could not raise alert ${input.kind}: ${(error as Error).message}`);
      return null;
    }
  }

  list(params: { status?: string; category?: string; take?: number }) {
    const statuses = params.status === 'ACTIVE' ? ['OPEN', 'ACKNOWLEDGED'] : params.status ? [params.status] : undefined;
    return this.prisma.operationalAlert.findMany({
      where: {
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(params.category ? { category: params.category } : {}),
      },
      orderBy: [{ lastSeenAt: 'desc' }],
      take: Math.min(params.take ?? 100, 300),
    });
  }

  async counts() {
    const rows = await this.prisma.operationalAlert.groupBy({
      by: ['category', 'severity'],
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ category: r.category, severity: r.severity, count: r._count._all }));
  }

  async decide(id: string, adminId: string, decision: AlertDecision, note: string) {
    if (!note?.trim()) throw new BadRequestException('A decision note is required');
    const alert = await this.prisma.operationalAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    if (alert.status === 'RESOLVED' || alert.status === 'DISMISSED') {
      throw new BadRequestException('This alert has already been closed');
    }

    const updated = await this.prisma.operationalAlert.update({
      where: { id },
      data: { status: decision, decidedById: adminId, decisionNote: note.trim(), decidedAt: new Date() },
    });

    await this.audit.log({
      actorId: adminId,
      action: `ALERT_${decision}`,
      entityType: 'OperationalAlert',
      entityId: id,
      metadata: { kind: alert.kind, previousStatus: alert.status, note: note.trim() },
    });
    return updated;
  }

  /**
   * Readable explanation of an alert for an admin. Strictly advisory: the
   * result is stored as text and has no effect on the alert or the entity.
   */
  async explain(id: string, adminId: string) {
    const alert = await this.prisma.operationalAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');

    const facts = redactPersonalData(
      JSON.stringify({ kind: alert.kind, severity: alert.severity, title: alert.title, occurrences: alert.occurrences, firstSeen: alert.createdAt, lastSeen: alert.lastSeenAt, details: alert.details }),
    );

    const { data } = await this.ai.generate({
      feature: AI_FEATURES.ANOMALY_EXPLAINER,
      userId: adminId,
      maxTokens: 1500,
      system: [
        'You explain operational alerts for the admins of TicketFlow Kenya, an event ticketing platform that takes M-Pesa STK Push payments.',
        'Explain in plain English what the alert most likely means and what an admin should check.',
        'You have no authority: never state that a payment succeeded, failed, or should be reversed, and never recommend banning a user, freezing funds, cancelling tickets or rejecting verification as a conclusion — only as something a human may consider after checking.',
        'Only use the facts provided. If they are insufficient, say so and set confidence to low.',
        UNTRUSTED_CONTENT_RULE,
      ].join('\n'),
      user: `Alert facts:\n${untrusted('alert', facts, 6000)}`,
      schema: ExplanationSchema,
    });

    const text = [
      data.summary,
      data.likelyCauses.length ? `\nLikely causes:\n- ${data.likelyCauses.join('\n- ')}` : '',
      data.suggestedChecks.length ? `\nSuggested checks:\n- ${data.suggestedChecks.join('\n- ')}` : '',
      `\nConfidence: ${data.confidence}`,
    ].join('');

    await this.prisma.operationalAlert.update({ where: { id }, data: { aiSummary: text, aiSummaryAt: new Date() } });
    return { ...data, text };
  }
}
