import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata ? (params.metadata as any) : undefined,
      },
    });
  }

  async findAll(params: { entityType?: string; take?: number; skip?: number }) {
    return this.prisma.auditLog.findMany({
      where: params.entityType ? { entityType: params.entityType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
      include: { actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
    });
  }
}
