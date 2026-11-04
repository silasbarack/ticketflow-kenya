import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationJob, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export type JobHandler = (payload: any, job: AutomationJob) => Promise<void>;

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

/** Base delay for retry backoff; doubles per attempt, capped at one hour. */
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 60 * 60_000;
/** A RUNNING job untouched for this long belonged to a worker that died. */
const STALE_LOCK_MS = 10 * 60_000;
const BATCH_SIZE = 10;

export function backoffDelayMs(attempts: number, random = Math.random): number {
  const exp = Math.min(BACKOFF_BASE_MS * 2 ** Math.max(attempts - 1, 0), BACKOFF_CAP_MS);
  return exp + Math.floor(random() * 0.2 * exp);
}

/**
 * A small durable job queue on Postgres — no Redis on Render's free tier.
 *
 * - Idempotent enqueue: `idempotencyKey` is unique; enqueuing an existing key
 *   returns the existing job and does nothing else.
 * - Safe concurrency: workers claim with `FOR UPDATE SKIP LOCKED`, so two
 *   instances never run the same job at once.
 * - Retries with exponential backoff + jitter; after `maxAttempts` a job moves
 *   to DEAD (the dead-letter state) for an admin to inspect and retry.
 * - Recovery: RUNNING jobs whose worker vanished are returned to the queue.
 *
 * Delivery is at-least-once: a handler that crashes after its side effect but
 * before completion will run again, so handlers must be idempotent.
 */
@Injectable()
export class AutomationQueueService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AutomationQueueService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get enabled() {
    return this.config.get<string>('AUTOMATION_WORKER_ENABLED') !== 'false';
  }

  onApplicationBootstrap() {
    this.logger.log(`Automation worker ${this.enabled ? 'enabled' : 'disabled'}; handlers: ${[...this.handlers.keys()].join(', ') || 'none'}`);
  }

  registerHandler(type: string, handler: JobHandler) {
    this.handlers.set(type, handler);
  }

  async enqueue(type: string, idempotencyKey: string, payload: Record<string, unknown>, options: EnqueueOptions = {}) {
    try {
      return await this.prisma.automationJob.create({
        data: {
          type,
          idempotencyKey,
          payload: payload as Prisma.InputJsonValue,
          runAt: options.runAt ?? new Date(),
          maxAttempts: options.maxAttempts ?? 5,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.automationJob.findUniqueOrThrow({ where: { idempotencyKey } });
      }
      throw error;
    }
  }

  /** Enqueue that never throws — for hooks inside critical paths (payments). */
  async enqueueSafely(type: string, idempotencyKey: string, payload: Record<string, unknown>, options?: EnqueueOptions) {
    try {
      return await this.enqueue(type, idempotencyKey, payload, options);
    } catch (error) {
      this.logger.error(`Could not enqueue ${type} (${idempotencyKey}): ${(error as Error).message}`);
      return null;
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick() {
    if (!this.enabled || this.running) return;
    this.running = true;
    try {
      await this.recoverStaleJobs();
      const jobs = await this.claimBatch();
      for (const job of jobs) await this.runJob(job);
    } catch (error) {
      this.logger.error(`Automation tick failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async claimBatch(limit = BATCH_SIZE): Promise<AutomationJob[]> {
    return this.prisma.$queryRaw<AutomationJob[]>`
      UPDATE automation_jobs SET status = 'RUNNING', "lockedAt" = NOW(), attempts = attempts + 1, "updatedAt" = NOW()
      WHERE id IN (
        SELECT id FROM automation_jobs
        WHERE status = 'QUEUED' AND "runAt" <= NOW()
        ORDER BY "runAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *`;
  }

  async recoverStaleJobs() {
    const cutoff = new Date(Date.now() - STALE_LOCK_MS);
    const recovered = await this.prisma.automationJob.updateMany({
      where: { status: 'RUNNING', lockedAt: { lt: cutoff } },
      data: { status: 'QUEUED', lockedAt: null, lastError: 'Recovered after worker interruption' },
    });
    if (recovered.count) this.logger.warn(`Recovered ${recovered.count} interrupted automation job(s)`);
  }

  async runJob(job: AutomationJob) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      await this.prisma.automationJob.update({
        where: { id: job.id },
        data: { status: 'DEAD', lockedAt: null, lastError: `No handler registered for ${job.type}` },
      });
      return;
    }

    try {
      await handler(job.payload, job);
      await this.prisma.automationJob.update({
        where: { id: job.id },
        data: { status: 'SUCCEEDED', lockedAt: null, completedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = ((error as Error)?.message || 'Unknown error').slice(0, 500);
      const dead = job.attempts >= job.maxAttempts;
      await this.prisma.automationJob.update({
        where: { id: job.id },
        data: dead
          ? { status: 'DEAD', lockedAt: null, lastError: message }
          : { status: 'QUEUED', lockedAt: null, lastError: message, runAt: new Date(Date.now() + backoffDelayMs(job.attempts)) },
      });
      this.logger.warn(`Job ${job.type} ${job.id} attempt ${job.attempts}/${job.maxAttempts} failed${dead ? ' — moved to dead letter' : ''}: ${message}`);
    }
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  list(params: { status?: string; type?: string; take?: number }) {
    return this.prisma.automationJob.findMany({
      where: { ...(params.status ? { status: params.status } : {}), ...(params.type ? { type: params.type } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(params.take ?? 50, 200),
    });
  }

  async counts() {
    const rows = await this.prisma.automationJob.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }

  /** Puts a dead or cancelled job back on the queue with a fresh attempt budget. */
  async retry(id: string) {
    const job = await this.prisma.automationJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    const updated = await this.prisma.automationJob.updateMany({
      where: { id, status: { in: ['DEAD', 'CANCELLED'] } },
      data: { status: 'QUEUED', attempts: 0, runAt: new Date(), lockedAt: null },
    });
    return { retried: updated.count === 1, job: await this.prisma.automationJob.findUnique({ where: { id } }) };
  }

  async cancel(id: string) {
    const updated = await this.prisma.automationJob.updateMany({
      where: { id, status: 'QUEUED' },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: updated.count === 1 };
  }
}
