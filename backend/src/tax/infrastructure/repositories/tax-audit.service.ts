import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { NEVER_LOG_KEYS } from "../../domain/audit/tax-audit-event.types";

export interface LogTaxAuditEventParams {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string | null;
  correlationId?: string;
  requestId?: string;
  beforeHash?: string;
  afterHash?: string;
  metadata?: Record<string, unknown>;
  /** Pass the active Prisma transaction client to make this write atomic with the state change it documents. */
  tx?: Prisma.TransactionClient;
}

/**
 * Append-only audit trail for the tax module (separate from the app-wide
 * `AuditLog` table so we can carry correlationId/requestId/before-after
 * hashes without changing existing models). Every write here is additive
 * — there is deliberately no update/delete method.
 */
@Injectable()
export class TaxAuditService {
  private readonly logger = new Logger("TaxAuditService");

  constructor(private prisma: PrismaService) {}

  async log(params: LogTaxAuditEventParams) {
    const client = params.tx ?? this.prisma;
    const metadata = redactSecrets(params.metadata ?? {});
    return client.taxAuditEvent.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorUserId: params.actorUserId ?? null,
        correlationId: params.correlationId ?? randomUUID(),
        requestId: params.requestId,
        beforeHash: params.beforeHash,
        afterHash: params.afterHash,
        metadata: metadata as any,
      },
    });
  }

  async findAll(params: {
    entityType?: string;
    entityId?: string;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.taxAuditEvent.findMany({
      where: { entityType: params.entityType, entityId: params.entityId },
      orderBy: { occurredAt: "desc" },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
    });
  }
}

function redactSecrets(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (NEVER_LOG_KEYS.some((k) => lowerKey.includes(k.toLowerCase()))) {
      redacted[key] = "[REDACTED]";
      continue;
    }
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      redacted[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
