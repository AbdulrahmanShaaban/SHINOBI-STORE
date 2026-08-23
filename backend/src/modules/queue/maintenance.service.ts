import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { logger } from '../../common/logger/logger';
import {
  EMPTY_CART_RETENTION_MS,
  SESSION_REVOKED_RETENTION_MS,
} from './queue.constants';

export interface MaintenanceSummary {
  sessionsDeleted: number;
  cartsDeleted: number;
}

/**
 * §17 nightly maintenance. Idempotent deletes only:
 * - sessions past expiry, or revoked longer than 7 days ago;
 * - server-side carts with zero items untouched for 30 days.
 * Safe to re-run/overlap — every predicate is time-based and monotonic.
 */
@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async runOnce(now = new Date()): Promise<MaintenanceSummary> {
    const revokedCutoff = new Date(now.getTime() - SESSION_REVOKED_RETENTION_MS);
    const cartCutoff = new Date(now.getTime() - EMPTY_CART_RETENTION_MS);
    logger.info(
      { revokedCutoff: revokedCutoff.toISOString(), cartCutoff: cartCutoff.toISOString() },
      'maintenance start',
    );

    const sessions = await this.prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedCutoff } }],
      },
    });

    // Orphaned carts: nothing in them for 30 days. `items: none` keeps any
    // cart that still holds lines, regardless of age.
    const carts = await this.prisma.cart.deleteMany({
      where: { updatedAt: { lt: cartCutoff }, items: { none: {} } },
    });

    const summary: MaintenanceSummary = {
      sessionsDeleted: sessions.count,
      cartsDeleted: carts.count,
    };
    logger.info(summary, 'maintenance end');
    return summary;
  }
}
