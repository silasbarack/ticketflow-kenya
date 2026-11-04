import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/**
 * Storage and review workflow for AI drafts. A draft is only ever text the
 * organiser asked for; accepting it records the decision — the content is
 * applied by the organiser through the normal event form, never by us.
 */
@Injectable()
export class AiDraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogsService,
  ) {}

  create(data: { feature: string; ownerId: string; eventId?: string | null; language?: string; input: unknown; output: unknown }) {
    return this.prisma.aiDraft.create({
      data: {
        feature: data.feature,
        ownerId: data.ownerId,
        eventId: data.eventId ?? null,
        language: data.language,
        input: data.input as Prisma.InputJsonValue,
        output: data.output as Prisma.InputJsonValue,
      },
    });
  }

  list(ownerId: string, filter: { feature?: string; eventId?: string }) {
    return this.prisma.aiDraft.findMany({
      where: { ownerId, ...(filter.feature ? { feature: filter.feature } : {}), ...(filter.eventId ? { eventId: filter.eventId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async getOwned(id: string, ownerId: string) {
    const draft = await this.prisma.aiDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.ownerId !== ownerId) throw new ForbiddenException('You do not own this draft');
    return draft;
  }

  /** Organiser edits keep the same shape as the model output (validated). */
  async edit(id: string, ownerId: string, output: unknown, schema: z.ZodTypeAny) {
    const draft = await this.getOwned(id, ownerId);
    if (draft.status !== 'DRAFT') throw new BadRequestException('Only open drafts can be edited');
    const current = draft.output as Record<string, unknown>;
    const parsed = schema.safeParse({ ...current, ...(output as object), warnings: undefined });
    if (!parsed.success) throw new BadRequestException('The edited draft is not in the expected format');
    return this.prisma.aiDraft.update({
      where: { id },
      data: { output: { ...(parsed.data as object), warnings: current.warnings ?? [], edited: true } as Prisma.InputJsonValue },
    });
  }

  async decide(id: string, ownerId: string, decision: 'ACCEPTED' | 'DISCARDED') {
    const draft = await this.getOwned(id, ownerId);
    if (draft.status !== 'DRAFT') throw new BadRequestException('This draft has already been decided');
    const updated = await this.prisma.aiDraft.update({ where: { id }, data: { status: decision, decidedAt: new Date() } });
    if (decision === 'ACCEPTED') {
      await this.audit.log({
        actorId: ownerId,
        action: 'AI_DRAFT_ACCEPTED',
        entityType: 'AiDraft',
        entityId: id,
        metadata: { feature: draft.feature, eventId: draft.eventId },
      });
    }
    return updated;
  }
}
