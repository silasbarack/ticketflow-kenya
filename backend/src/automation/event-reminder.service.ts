import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AutomationQueueService } from './automation-queue.service';
import { JOB_TYPES } from './job-types';

const HOUR = 3_600_000;

/**
 * Queues one "your event is tomorrow" email per paid order. The idempotency
 * key makes the hourly scan safe to overlap: an order is reminded once.
 */
@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AutomationQueueService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduled() {
    if (this.config.get<string>('EVENT_REMINDERS_ENABLED') === 'false') return;
    try {
      await this.run();
    } catch (error) {
      this.logger.error(`Event reminder scan failed: ${(error as Error).message}`);
    }
  }

  async run(now = new Date()) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'PAID',
        event: {
          status: 'PUBLISHED',
          startDateTime: { gte: new Date(now.getTime() + 20 * HOUR), lte: new Date(now.getTime() + 28 * HOUR) },
        },
      },
      select: { id: true },
      take: 2000,
    });
    for (const o of orders) {
      await this.queue.enqueue(JOB_TYPES.EVENT_REMINDER, `event-reminder:${o.id}:24h`, { orderId: o.id }, { maxAttempts: 4 });
    }
    if (orders.length) this.logger.log(`Queued ${orders.length} event reminder(s)`);
    return orders.length;
  }
}
