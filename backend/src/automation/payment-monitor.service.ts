import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { AutomationQueueService } from './automation-queue.service';
import { OperationalAlertsService } from './operational-alerts.service';
import { JOB_TYPES } from './job-types';

const MIN = 60_000;

/**
 * Looks for money and tickets that disagree, and for ticket emails that never
 * went out. It repairs only what the payment rules already guarantee — a PAID
 * order with a SUCCESS payment is owed its tickets — and reports everything
 * else for a human. It never changes a payment's status.
 */
@Injectable()
export class PaymentMonitorService {
  private readonly logger = new Logger(PaymentMonitorService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly queue: AutomationQueueService,
    private readonly alerts: OperationalAlertsService,
    private readonly config: ConfigService,
  ) {}

  private get enabled() {
    return this.config.get<string>('AUTOMATION_MONITORS_ENABLED') !== 'false';
  }

  private get hardExpirySeconds() {
    return parseInt(this.config.get<string>('MPESA_STK_HARD_EXPIRY_SECONDS') || '900', 10);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduled() {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Payment monitor failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async run() {
    const results = {
      ticketsRecovered: await this.recoverMissingTickets(),
      ticketEmailsQueued: await this.queueUndeliveredTicketEmails(),
      missingCommissions: await this.flagMissingCommissions(),
      stuckPending: await this.flagStuckPendingPayments(),
      failureSpike: await this.flagFailureSpike(),
    };
    return results;
  }

  /** PAID + SUCCESS payment + no tickets = issuance crashed. Re-run it (idempotent). */
  async recoverMissingTickets() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        updatedAt: { lt: new Date(Date.now() - 3 * MIN) },
        tickets: { none: {} },
        payments: { some: { status: 'SUCCESS' } },
      },
      select: { id: true },
      take: 20,
    });
    let recovered = 0;
    for (const order of orders) {
      try {
        await this.tickets.generateForOrder(order.id);
        recovered++;
        await this.alerts.raise({
          kind: 'TICKETS_RECOVERED',
          severity: 'INFO',
          category: 'PAYMENT',
          title: 'Missing tickets were issued for a paid order',
          dedupeKey: `tickets-recovered:${order.id}`,
          entityType: 'Order',
          entityId: order.id,
          details: { orderId: order.id },
        });
      } catch (error) {
        await this.alerts.raise({
          kind: 'TICKETS_MISSING',
          severity: 'CRITICAL',
          category: 'PAYMENT',
          title: 'Paid order has no tickets and issuance keeps failing',
          dedupeKey: `tickets-missing:${order.id}`,
          entityType: 'Order',
          entityId: order.id,
          details: { orderId: order.id, error: (error as Error).message.slice(0, 200) },
        });
      }
    }
    return recovered;
  }

  async queueUndeliveredTicketEmails() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        emailSentAt: null,
        status: 'ACTIVE',
        order: { status: 'PAID' },
        createdAt: { lt: new Date(Date.now() - 10 * MIN), gt: new Date(Date.now() - 3 * 24 * 60 * MIN) },
      },
      select: { id: true },
      take: 50,
    });
    for (const t of tickets) {
      await this.queue.enqueue(JOB_TYPES.TICKET_EMAIL, `ticket-email:${t.id}`, { ticketId: t.id }, { maxAttempts: 6 });
    }
    return tickets.length;
  }

  async flagMissingCommissions() {
    const rows = await this.prisma.$queryRaw<{ orderId: string }[]>`
      SELECT DISTINCT p."orderId" FROM payments p
      LEFT JOIN platform_commissions c ON c."orderId" = p."orderId"
      WHERE p.status = 'SUCCESS' AND c.id IS NULL AND p."updatedAt" < NOW() - INTERVAL '10 minutes'
      LIMIT 50`;
    for (const r of rows) {
      await this.alerts.raise({
        kind: 'COMMISSION_MISSING',
        severity: 'WARNING',
        category: 'PAYMENT',
        title: 'Successful payment has no platform commission record',
        dedupeKey: `commission-missing:${r.orderId}`,
        entityType: 'Order',
        entityId: r.orderId,
        details: { orderId: r.orderId },
      });
    }
    return rows.length;
  }

  async flagStuckPendingPayments() {
    const cutoff = new Date(Date.now() - (this.hardExpirySeconds + 15 * 60) * 1000);
    const stuck = await this.prisma.payment.findMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      select: { id: true, orderId: true, createdAt: true },
      take: 50,
    });
    for (const p of stuck) {
      await this.alerts.raise({
        kind: 'PAYMENT_STUCK_PENDING',
        severity: 'WARNING',
        category: 'PAYMENT',
        title: 'Payment still pending long after its hard expiry',
        dedupeKey: `stuck-pending:${p.id}`,
        entityType: 'Payment',
        entityId: p.id,
        details: { paymentId: p.id, orderId: p.orderId, createdAt: p.createdAt, note: 'Check that MPESA_RECONCILIATION_ENABLED is on and Daraja is reachable.' },
      });
    }
    return stuck.length;
  }

  /** A sudden platform-wide failure rate usually means M-Pesa or our config, not customers. */
  async flagFailureSpike() {
    const since = new Date(Date.now() - 60 * MIN);
    const rows = await this.prisma.payment.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since }, provider: 'MPESA' },
      _count: { _all: true },
    });
    const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    const failed = count('FAILED');
    const total = rows.reduce((n, r) => n + r._count._all, 0);
    if (failed >= 10 && failed / total > 0.5) {
      await this.alerts.raise({
        kind: 'PAYMENT_FAILURE_SPIKE',
        severity: 'CRITICAL',
        category: 'PAYMENT',
        title: 'More than half of M-Pesa payments failed in the last hour',
        dedupeKey: `failure-spike:${new Date().toISOString().slice(0, 13)}`,
        details: { windowMinutes: 60, failed, total },
      });
      return true;
    }
    return false;
  }
}
