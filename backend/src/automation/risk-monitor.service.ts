import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { OperationalAlertsService } from './operational-alerts.service';

const MIN = 60_000;

export interface RiskThresholds {
  duplicateScans: number;
  badSignatureScans: number;
  paymentFailuresPerHour: number;
  ordersPer10Min: number;
  unpaidOrdersPerDay: number;
  ticketsPerBuyerPerEvent: number;
  eventsPerOrganizerPerDay: number;
  refundRequestsPer30Days: number;
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
  duplicateScans: 2,
  badSignatureScans: 3,
  paymentFailuresPerHour: 5,
  ordersPer10Min: 8,
  unpaidOrdersPerDay: 10,
  ticketsPerBuyerPerEvent: 20,
  eventsPerOrganizerPerDay: 10,
  refundRequestsPer30Days: 3,
};

/**
 * Transparent, rules-based anomaly detection. Each rule is a SQL count with a
 * threshold; when one trips, an alert is raised for manual review with the
 * counts that triggered it. Nothing here bans, blocks, cancels, freezes or
 * rejects anything — those stay human decisions through the normal admin
 * endpoints.
 */
@Injectable()
export class RiskMonitorService {
  private readonly logger = new Logger(RiskMonitorService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: OperationalAlertsService,
    private readonly config: ConfigService,
  ) {}

  get thresholds(): RiskThresholds {
    const override = (key: keyof RiskThresholds, env: string) => {
      const v = parseInt(this.config.get<string>(env) || '', 10);
      return Number.isFinite(v) && v > 0 ? v : DEFAULT_THRESHOLDS[key];
    };
    return {
      duplicateScans: override('duplicateScans', 'RISK_DUPLICATE_SCANS'),
      badSignatureScans: override('badSignatureScans', 'RISK_BAD_SIGNATURE_SCANS'),
      paymentFailuresPerHour: override('paymentFailuresPerHour', 'RISK_PAYMENT_FAILURES_PER_HOUR'),
      ordersPer10Min: override('ordersPer10Min', 'RISK_ORDERS_PER_10_MIN'),
      unpaidOrdersPerDay: override('unpaidOrdersPerDay', 'RISK_UNPAID_ORDERS_PER_DAY'),
      ticketsPerBuyerPerEvent: override('ticketsPerBuyerPerEvent', 'RISK_TICKETS_PER_BUYER_PER_EVENT'),
      eventsPerOrganizerPerDay: override('eventsPerOrganizerPerDay', 'RISK_EVENTS_PER_ORGANIZER_PER_DAY'),
      refundRequestsPer30Days: override('refundRequestsPer30Days', 'RISK_REFUND_REQUESTS_PER_30_DAYS'),
    };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async scheduled() {
    if (this.config.get<string>('AUTOMATION_MONITORS_ENABLED') === 'false' || this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Risk monitor failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private day(now: Date) {
    return now.toISOString().slice(0, 10);
  }

  async run(now = new Date()) {
    const t = this.thresholds;
    const day = this.day(now);
    let raised = 0;
    const raise = async (input: Parameters<OperationalAlertsService['raise']>[0]) => {
      if (await this.alerts.raise(input)) raised++;
    };

    // 1. The same ticket presented again after entry: shared screenshot or resale.
    const dupScans = await this.prisma.auditLog.groupBy({
      by: ['entityId'],
      where: { action: 'TICKET_DUPLICATE_SCAN', createdAt: { gte: new Date(now.getTime() - 24 * 60 * MIN) } },
      _count: { _all: true },
    });
    for (const r of dupScans.filter((r) => r.entityId && r._count._all >= t.duplicateScans)) {
      await raise({
        kind: 'RISK_DUPLICATE_SCAN', severity: 'WARNING', category: 'RISK',
        title: 'Ticket scanned repeatedly after entry',
        dedupeKey: `risk-dup-scan:${r.entityId}:${day}`, entityType: 'Ticket', entityId: r.entityId!,
        details: { ticketId: r.entityId, rejectedScans24h: r._count._all, threshold: t.duplicateScans },
      });
    }

    // 2. QR codes that fail signature checks at one event: counterfeits.
    const badSig = await this.prisma.$queryRaw<{ eventId: string; n: bigint }[]>`
      SELECT metadata->>'eventId' AS "eventId", COUNT(*) AS n FROM audit_logs
      WHERE action = 'TICKET_SCAN_REJECTED' AND metadata->>'reason' = 'BAD_SIGNATURE'
        AND "createdAt" >= ${new Date(now.getTime() - 24 * 60 * MIN)}
      GROUP BY 1 HAVING COUNT(*) >= ${t.badSignatureScans}`;
    for (const r of badSig) {
      await raise({
        kind: 'RISK_COUNTERFEIT_QR', severity: 'CRITICAL', category: 'RISK',
        title: 'Counterfeit or altered QR codes presented at an event',
        dedupeKey: `risk-bad-sig:${r.eventId}:${day}`, entityType: 'Event', entityId: r.eventId,
        details: { eventId: r.eventId, failedSignatureScans24h: Number(r.n), threshold: t.badSignatureScans },
      });
    }

    // 3. Many failed / cancelled payments by one buyer in an hour.
    const failures = await this.prisma.$queryRaw<{ userId: string; n: bigint }[]>`
      SELECT o."userId", COUNT(*) AS n FROM payments p JOIN orders o ON o.id = p."orderId"
      WHERE p.status IN ('FAILED','CANCELLED') AND p."createdAt" >= ${new Date(now.getTime() - 60 * MIN)}
      GROUP BY 1 HAVING COUNT(*) >= ${t.paymentFailuresPerHour}`;
    for (const r of failures) {
      await raise({
        kind: 'RISK_PAYMENT_FAILURES', severity: 'WARNING', category: 'RISK',
        title: 'Excessive payment failures from one account',
        dedupeKey: `risk-pay-fail:${r.userId}:${day}`, entityType: 'User', entityId: r.userId,
        details: { userId: r.userId, failedOrCancelledLastHour: Number(r.n), threshold: t.paymentFailuresPerHour },
      });
    }

    // 4. Order velocity: many orders in ten minutes.
    const velocity = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: new Date(now.getTime() - 10 * MIN) } },
      _count: { _all: true },
    });
    for (const r of velocity.filter((r) => r._count._all >= t.ordersPer10Min)) {
      await raise({
        kind: 'RISK_ORDER_VELOCITY', severity: 'WARNING', category: 'RISK',
        title: 'Unusually fast ordering from one account',
        dedupeKey: `risk-velocity:${r.userId}:${now.toISOString().slice(0, 13)}`, entityType: 'User', entityId: r.userId,
        details: { userId: r.userId, ordersLast10Min: r._count._all, threshold: t.ordersPer10Min },
      });
    }

    // 5. Repeated checkouts that never pay — holds stock away from real buyers.
    const unpaid = await this.prisma.$queryRaw<{ userId: string; unpaid: bigint; paid: bigint }[]>`
      SELECT "userId",
        COUNT(*) FILTER (WHERE status <> 'PAID') AS unpaid,
        COUNT(*) FILTER (WHERE status = 'PAID') AS paid
      FROM orders WHERE "createdAt" >= ${new Date(now.getTime() - 24 * 60 * MIN)}
      GROUP BY 1 HAVING COUNT(*) FILTER (WHERE status <> 'PAID') >= ${t.unpaidOrdersPerDay}`;
    for (const r of unpaid) {
      await raise({
        kind: 'RISK_ABUSIVE_CHECKOUT', severity: Number(r.paid) === 0 ? 'WARNING' : 'INFO', category: 'RISK',
        title: 'Many unpaid checkouts from one account',
        dedupeKey: `risk-unpaid:${r.userId}:${day}`, entityType: 'User', entityId: r.userId,
        details: { userId: r.userId, unpaidOrders24h: Number(r.unpaid), paidOrders24h: Number(r.paid), threshold: t.unpaidOrdersPerDay },
      });
    }

    // 6. One buyer holding a large block of tickets for one event: possible resale.
    const bulk = await this.prisma.$queryRaw<{ userId: string; eventId: string; n: bigint }[]>`
      SELECT t."userId", o."eventId", COUNT(*) AS n FROM tickets t JOIN orders o ON o.id = t."orderId"
      JOIN events e ON e.id = o."eventId"
      WHERE t.status = 'ACTIVE' AND e."startDateTime" > ${now}
      GROUP BY 1, 2 HAVING COUNT(*) >= ${t.ticketsPerBuyerPerEvent}`;
    for (const r of bulk) {
      await raise({
        kind: 'RISK_BULK_PURCHASE', severity: 'INFO', category: 'RISK',
        title: 'One buyer holds a large block of tickets for an event',
        dedupeKey: `risk-bulk:${r.userId}:${r.eventId}`, entityType: 'Event', entityId: r.eventId,
        details: { userId: r.userId, eventId: r.eventId, activeTickets: Number(r.n), threshold: t.ticketsPerBuyerPerEvent },
      });
    }

    // 7. Organiser creating events at an unusual rate.
    const organizers = await this.prisma.event.groupBy({
      by: ['organizerId'],
      where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * MIN) } },
      _count: { _all: true },
    });
    for (const r of organizers.filter((r) => r._count._all >= t.eventsPerOrganizerPerDay)) {
      await raise({
        kind: 'RISK_ORGANIZER_ACTIVITY', severity: 'WARNING', category: 'RISK',
        title: 'Organiser created an unusual number of events',
        dedupeKey: `risk-organizer:${r.organizerId}:${day}`, entityType: 'OrganizerProfile', entityId: r.organizerId,
        details: { organizerId: r.organizerId, eventsCreated24h: r._count._all, threshold: t.eventsPerOrganizerPerDay },
      });
    }

    // 8. Repeated refund requests (raised through support tickets).
    const refunds = await this.prisma.supportTicket.groupBy({
      by: ['userId'],
      where: { category: 'REFUND', userId: { not: null }, createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * MIN) } },
      _count: { _all: true },
    });
    for (const r of refunds.filter((r) => r.userId && r._count._all >= t.refundRequestsPer30Days)) {
      await raise({
        kind: 'RISK_REFUND_REQUESTS', severity: 'INFO', category: 'RISK',
        title: 'Unusual number of refund requests from one account',
        dedupeKey: `risk-refunds:${r.userId}:${now.toISOString().slice(0, 7)}`, entityType: 'User', entityId: r.userId!,
        details: { userId: r.userId, refundRequests30d: r._count._all, threshold: t.refundRequestsPer30Days },
      });
    }

    return { raised };
  }
}
