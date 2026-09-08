import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { PaymentsService } from './payments.service';

/** Only sweep payments old enough that a callback should already have landed. */
const SWEEP_MIN_AGE_SECONDS = 20;
const SWEEP_BATCH_SIZE = 25;

/**
 * Settles M-Pesa payments the callback never resolved.
 *
 * The Daraja callback is delivered over the public internet to a URL that may
 * be asleep (free-tier instances spin down), tunnelled through an address that
 * has since rotated, or simply unreachable for a minute. Every one of those
 * leaves an order PENDING with its stock reserved and its buyer staring at a
 * spinner. This sweep asks Safaricom directly, so a payment always reaches a
 * final state — whether the buyer's tab is still open or not.
 *
 * It never invents a result: PaymentsService.reconcile only settles on what
 * Daraja actually reports, or on the absolute expiry cut-off.
 */
@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger('PaymentReconciliation');

  /** Guards against a slow sweep overlapping the next tick. */
  private running = false;

  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
    private configService: ConfigService,
  ) {}

  private get enabled(): boolean {
    return this.configService.get<string>('MPESA_RECONCILIATION_ENABLED') !== 'false';
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepPendingPayments() {
    if (!this.enabled || this.running) return;
    this.running = true;

    try {
      const cutoff = new Date(Date.now() - SWEEP_MIN_AGE_SECONDS * 1000);
      const stale = await this.prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING, provider: 'MPESA', createdAt: { lt: cutoff } },
        orderBy: { createdAt: 'asc' },
        take: SWEEP_BATCH_SIZE,
      });
      if (stale.length === 0) return;

      let settled = 0;
      for (const payment of stale) {
        try {
          const result = await this.payments.reconcile(payment);
          if (result.status !== PaymentStatus.PENDING) settled++;
        } catch (error) {
          this.logger.warn(`Reconciling payment ${payment.id} failed: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Reconciled ${stale.length} pending M-Pesa payment(s); ${settled} reached a final state`);
    } finally {
      this.running = false;
    }
  }
}
