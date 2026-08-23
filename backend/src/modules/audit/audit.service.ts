import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { logger } from '../../common/logger/logger';

export interface AuditListQuery {
  page?: number;
  limit?: number;
  action?: string;
}

/**
 * Append-only audit trail for staff mutations (§11.4). Recording must never
 * break the business flow it observes: failures are logged, not rethrown.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorUserId: string | null,
    action: string,
    entityType: string,
    entityId?: string,
    diff?: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: actorUserId ?? undefined,
          action,
          entityType,
          entityId,
          diff: (diff ?? undefined) as Prisma.InputJsonValue | undefined,
          ip,
        },
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message, action, entityType, entityId },
        'audit log write failed',
      );
    }
  }

  /** Viewer listing — newest first, hard-capped page size. */
  async list(query: AuditListQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where = query.action ? { action: query.action } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }
}
