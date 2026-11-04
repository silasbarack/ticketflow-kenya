import { HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { AI_FEATURE_INFO, AI_FEATURE_LIST, AiFeature } from './ai-features';
import { estimateCostUsd } from './ai-pricing';
import { AI_PROVIDER, AiProvider, AiProviderError } from './providers/ai-provider.interface';

export interface AiGenerateOptions<T> {
  feature: AiFeature;
  /** Who asked. Null for system-initiated work (counts against the feature only). */
  userId: string | null;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
}

export interface AiGenerateResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/** Thrown when a feature is off, over its limits or out of budget. */
export class AiUnavailableException extends HttpException {
  constructor(
    message: string,
    readonly reason: 'DISABLED' | 'NOT_CONFIGURED' | 'LIMIT' | 'BUDGET' | 'PROVIDER' | 'INVALID_OUTPUT' | 'REFUSED',
    status = HttpStatus.SERVICE_UNAVAILABLE,
  ) {
    super({ statusCode: status, message, reason }, status);
  }
}

const DEFAULT_SETTINGS = {
  enabled: false,
  dailyRequestLimit: 500,
  perUserDailyLimit: 30,
  monthlyBudgetUsd: 25,
};

function startOfUtcDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Statuses that represent a real attempt and count against limits. */
const COUNTED_STATUSES = ['SUCCESS', 'PROVIDER_ERROR', 'INVALID_OUTPUT', 'REFUSED'];

/**
 * The one door to a language model. Every call goes through here so that:
 *  - features can be switched off globally (AI_ENABLED) or per feature (admin);
 *  - per-feature, per-user and monthly-budget limits are enforced;
 *  - output is validated against a schema before any caller sees it;
 *  - token use and cost are logged — but never the prompt or the response.
 *
 * AI output from here is advisory. No caller may use it to change payment,
 * ticket, event, verification or account state.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  private get globallyEnabled(): boolean {
    return this.config.get<string>('AI_ENABLED') === 'true';
  }

  get providerName(): string {
    return this.provider.name;
  }

  async getSettings(feature: AiFeature) {
    const row = await this.prisma.aiFeatureSetting.findUnique({ where: { feature } });
    return {
      feature,
      enabled: row?.enabled ?? DEFAULT_SETTINGS.enabled,
      dailyRequestLimit: row?.dailyRequestLimit ?? DEFAULT_SETTINGS.dailyRequestLimit,
      perUserDailyLimit: row?.perUserDailyLimit ?? DEFAULT_SETTINGS.perUserDailyLimit,
      monthlyBudgetUsd: row ? Number(row.monthlyBudgetUsd) : DEFAULT_SETTINGS.monthlyBudgetUsd,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** Cheap check for UIs: should the AI controls be shown as available? */
  async isFeatureAvailable(feature: AiFeature): Promise<boolean> {
    if (!this.globallyEnabled || !this.provider.isConfigured()) return false;
    return (await this.getSettings(feature)).enabled;
  }

  async generate<T>(options: AiGenerateOptions<T>): Promise<AiGenerateResult<T>> {
    const { feature, userId } = options;
    const model = this.provider.model;

    if (!this.globallyEnabled) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_DISABLED', errorCode: 'AI_DISABLED' });
      throw new AiUnavailableException('AI features are turned off on this environment.', 'DISABLED');
    }
    if (!this.provider.isConfigured()) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_DISABLED', errorCode: 'NOT_CONFIGURED' });
      throw new AiUnavailableException('The AI provider is not configured.', 'NOT_CONFIGURED');
    }

    const settings = await this.getSettings(feature);
    if (!settings.enabled) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_DISABLED', errorCode: 'FEATURE_DISABLED' });
      throw new AiUnavailableException(`${AI_FEATURE_INFO[feature].label} is turned off.`, 'DISABLED');
    }

    await this.enforceLimits(feature, userId, settings, model);

    const startedAt = Date.now();
    let result;
    try {
      result = await this.provider.generateStructured({
        system: options.system,
        user: options.user,
        schema: options.schema,
        maxTokens: options.maxTokens ?? 4000,
        effort: options.effort,
      });
    } catch (error) {
      const code = error instanceof AiProviderError ? error.code : 'UNKNOWN';
      await this.logUsage({ feature, userId, model, status: 'PROVIDER_ERROR', errorCode: code, latencyMs: Date.now() - startedAt });
      this.logger.warn(`AI call for ${feature} failed: ${code}`);
      throw new AiUnavailableException(
        'The AI assistant is unavailable right now. Please try again shortly or continue without it.',
        'PROVIDER',
      );
    }

    const latencyMs = Date.now() - startedAt;
    const costUsd = estimateCostUsd(result.model, result.inputTokens, result.outputTokens, this.costOverride());
    const base = {
      feature,
      userId,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd,
      latencyMs,
    };

    if (result.refused) {
      await this.logUsage({ ...base, status: 'REFUSED', errorCode: 'REFUSAL' });
      throw new AiUnavailableException('The AI assistant could not help with that request.', 'REFUSED', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // Provider-independent validation: never trust that the provider enforced the schema.
    const parsed = options.schema.safeParse(result.output);
    if (!parsed.success) {
      await this.logUsage({ ...base, status: 'INVALID_OUTPUT', errorCode: 'SCHEMA_MISMATCH' });
      throw new AiUnavailableException(
        'The AI assistant returned an unusable answer. Please try again.',
        'INVALID_OUTPUT',
        HttpStatus.BAD_GATEWAY,
      );
    }

    await this.logUsage({ ...base, status: 'SUCCESS' });
    return { data: parsed.data, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd };
  }

  private costOverride() {
    const input = this.config.get<string>('AI_COST_INPUT_PER_MTOK');
    const output = this.config.get<string>('AI_COST_OUTPUT_PER_MTOK');
    return {
      input: input ? parseFloat(input) : undefined,
      output: output ? parseFloat(output) : undefined,
    };
  }

  private async enforceLimits(
    feature: AiFeature,
    userId: string | null,
    settings: Awaited<ReturnType<AiService['getSettings']>>,
    model: string,
  ) {
    const dayStart = startOfUtcDay();
    const [featureToday, userToday, monthSpend] = await Promise.all([
      this.prisma.aiUsageLog.count({ where: { feature, createdAt: { gte: dayStart }, status: { in: COUNTED_STATUSES } } }),
      userId
        ? this.prisma.aiUsageLog.count({
            where: { feature, userId, createdAt: { gte: dayStart }, status: { in: COUNTED_STATUSES } },
          })
        : Promise.resolve(0),
      this.prisma.aiUsageLog.aggregate({
        where: { feature, createdAt: { gte: startOfUtcMonth() } },
        _sum: { costUsd: true },
      }),
    ]);

    if (featureToday >= settings.dailyRequestLimit) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_LIMIT', errorCode: 'FEATURE_DAILY_LIMIT' });
      throw new AiUnavailableException('This AI feature has reached its daily limit. Please try again tomorrow.', 'LIMIT', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (userId && userToday >= settings.perUserDailyLimit) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_LIMIT', errorCode: 'USER_DAILY_LIMIT' });
      throw new AiUnavailableException("You've reached today's limit for this AI feature. Please try again tomorrow.", 'LIMIT', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (Number(monthSpend._sum.costUsd ?? 0) >= settings.monthlyBudgetUsd) {
      await this.logUsage({ feature, userId, model, status: 'BLOCKED_BUDGET', errorCode: 'MONTHLY_BUDGET' });
      throw new AiUnavailableException('This AI feature has reached its monthly budget.', 'BUDGET', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async logUsage(entry: {
    feature: AiFeature;
    userId: string | null;
    model: string;
    status: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    latencyMs?: number;
    errorCode?: string;
  }) {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          feature: entry.feature,
          userId: entry.userId,
          provider: this.provider.name,
          model: entry.model,
          status: entry.status,
          inputTokens: entry.inputTokens ?? 0,
          outputTokens: entry.outputTokens ?? 0,
          costUsd: new Prisma.Decimal((entry.costUsd ?? 0).toFixed(6)),
          latencyMs: entry.latencyMs ?? 0,
          errorCode: entry.errorCode,
        },
      });
    } catch (error) {
      // Usage logging must never break the feature — but budgets depend on it, so be loud.
      this.logger.error(`Failed to record AI usage: ${(error as Error).message}`);
    }
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async listSettings() {
    const rows = await Promise.all(AI_FEATURE_LIST.map((f) => this.getSettings(f)));
    return {
      globallyEnabled: this.globallyEnabled,
      providerConfigured: this.provider.isConfigured(),
      provider: this.provider.name,
      model: this.provider.model,
      features: rows.map((r) => ({ ...r, ...AI_FEATURE_INFO[r.feature as AiFeature] })),
    };
  }

  async updateSettings(
    feature: AiFeature,
    adminId: string,
    patch: Partial<{ enabled: boolean; dailyRequestLimit: number; perUserDailyLimit: number; monthlyBudgetUsd: number }>,
  ) {
    const current = await this.getSettings(feature);
    const next = { ...current, ...patch };
    await this.prisma.aiFeatureSetting.upsert({
      where: { feature },
      create: {
        feature,
        enabled: next.enabled,
        dailyRequestLimit: next.dailyRequestLimit,
        perUserDailyLimit: next.perUserDailyLimit,
        monthlyBudgetUsd: new Prisma.Decimal(next.monthlyBudgetUsd),
        updatedById: adminId,
      },
      update: {
        enabled: next.enabled,
        dailyRequestLimit: next.dailyRequestLimit,
        perUserDailyLimit: next.perUserDailyLimit,
        monthlyBudgetUsd: new Prisma.Decimal(next.monthlyBudgetUsd),
        updatedById: adminId,
      },
    });
    return { before: current, after: await this.getSettings(feature) };
  }

  async usageSummary(days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const [byFeature, byStatus, monthSpend] = await Promise.all([
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['feature', 'status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.aiUsageLog.groupBy({
        by: ['feature'],
        where: { createdAt: { gte: startOfUtcMonth() } },
        _sum: { costUsd: true },
      }),
    ]);

    const daily: { day: Date; requests: bigint; cost: Prisma.Decimal | null }[] = await this.prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS requests, SUM("costUsd") AS cost
      FROM ai_usage_logs WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;

    return {
      days,
      features: AI_FEATURE_LIST.map((feature) => {
        const totals = byFeature.find((r) => r.feature === feature);
        const statuses = Object.fromEntries(
          byStatus.filter((r) => r.feature === feature).map((r) => [r.status, r._count._all]),
        );
        return {
          feature,
          label: AI_FEATURE_INFO[feature].label,
          requests: totals?._count._all ?? 0,
          inputTokens: totals?._sum.inputTokens ?? 0,
          outputTokens: totals?._sum.outputTokens ?? 0,
          costUsd: Number(totals?._sum.costUsd ?? 0),
          monthToDateCostUsd: Number(monthSpend.find((r) => r.feature === feature)?._sum.costUsd ?? 0),
          statuses,
        };
      }),
      daily: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), requests: Number(d.requests), costUsd: Number(d.cost ?? 0) })),
    };
  }
}
