import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { logger } from '../../common/logger/logger';

/**
 * §13.3 queued email introduction. The queue is created lazily and only when
 * Redis answers — without Redis the service degrades to log-only so email
 * outages never block checkout (§13.3). SMTP adapter lands later.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private queue: Queue | null = null;

  constructor(private readonly redis: RedisService) {}

  async onModuleInit(): Promise<void> {
    if (!(await this.redis.isHealthy())) {
      this.logger.warn('notifications: redis unavailable — running in log-only mode');
      return;
    }
    try {
      this.queue = new Queue('email', { connection: this.redis.client as never });
    } catch (err) {
      this.logger.warn({ err: (err as Error).message }, 'email queue unavailable');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close().catch(() => undefined);
  }

  async sendOrderConfirmation(input: {
    orderNumber: string;
    email: string;
    totalCents: number;
  }): Promise<void> {
    const payload = {
      template: 'order-confirmation',
      to: input.email,
      data: { orderNumber: input.orderNumber, totalCents: input.totalCents },
    };
    if (!this.queue) {
      logger.info(payload, 'email (log-only mode)');
      return;
    }
    await this.queue.add('send', payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100,
    });
  }
}
