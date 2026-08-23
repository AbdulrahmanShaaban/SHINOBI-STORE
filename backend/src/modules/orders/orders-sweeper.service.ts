import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OrdersService } from './orders.service';

const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // §15.3

/**
 * Reservation sweeper (§15.3): cancels pending orders past their reservation
 * TTL and releases stock. sweepExpired() is idempotent — only touches orders
 * still in pending_payment past expiry, so overlapping runs are safe.
 *
 * Single-instance interval now; move to a BullMQ repeatable job when the
 * deployment is multi-instance (Redis guaranteed there).
 */
@Injectable()
export class OrdersSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersSweeperService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly orders: OrdersService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.runOnce();
    }, SWEEP_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<string[]> {
    try {
      const swept = await this.orders.sweepExpired();
      if (swept.length > 0) this.logger.warn({ swept }, 'expired reservations cancelled');
      return swept;
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, 'sweeper run failed');
      return [];
    }
  }
}
