import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfig } from '../../common/config/configuration';
import { APP_CONFIG } from '../../common/config/app-config.token';
import { logger } from '../../common/logger/logger';
import {
  EMAIL_BACKOFF_BASE_MS,
  EMAIL_MAX_ATTEMPTS,
  EMAIL_QUEUE,
  EMAIL_SEND_JOB,
} from '../queue/queue.constants';

/**
 * §13.3 queued email introduction. The queue and its minimal worker are
 * created lazily and only when Redis answers — without Redis the service
 * degrades to log-only so email outages never block checkout (§13.3/§16.4).
 * SMTP adapter lands later; until then the worker simulates the send.
 *
 * §17 conventions: job payloads carry ids (never blobs) and handlers log
 * start/end/error. After EMAIL_MAX_ATTEMPTS exhausted attempts BullMQ parks
 * the job in the failed set (the DLQ surfaced under admin/queues).
 */
interface EmailJobPayload {
  type: string;
  ids: Record<string, unknown>;
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly nestLogger = new Logger(NotificationsService.name);
  private queue: Queue<EmailJobPayload> | null = null;
  private worker: Worker<EmailJobPayload, void> | null = null;

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!(await this.redis.isHealthy())) {
      this.nestLogger.warn('notifications: redis unavailable — running in log-only mode');
      return;
    }
    try {
      // Options-based connection (not the shared ioredis client): BullMQ
      // requires maxRetriesPerRequest=null on its connections and enforces it
      // itself when handed plain options.
      const connection = { url: this.config.redisUrl };
      this.queue = new Queue<EmailJobPayload>(EMAIL_QUEUE, { connection });
      this.queue.on('error', (err: Error) => {
        logger.debug({ err: err.message, queue: EMAIL_QUEUE }, 'email queue error');
      });

      // Minimal in-process worker: consumes 'send' jobs so enqueue actually
      // delivers once the SMTP adapter lands. Simulated send for now.
      this.worker = new Worker<EmailJobPayload, void>(
        EMAIL_QUEUE,
        (job) => this.processSendJob(job),
        { connection },
      );
      this.worker.on('error', (err: Error) => {
        logger.warn({ err: err.message, queue: EMAIL_QUEUE }, 'email worker error');
      });
    } catch (err) {
      this.nestLogger.warn({ err: (err as Error).message }, 'email queue unavailable');
      await this.closeAll();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeAll();
  }

  async sendOrderConfirmation(input: {
    orderNumber: string;
    email: string;
    totalCents: number;
  }): Promise<void> {
    if (!this.queue || !this.worker) {
      // Degraded mode: no Redis. Log enough context to trace the order, then
      // move on — email must never block checkout.
      logger.info(
        {
          type: 'order-confirmation',
          orderNumber: input.orderNumber,
          to: input.email,
          totalCents: input.totalCents,
        },
        'email (log-only mode)',
      );
      return;
    }
    // Ids only — the handler re-fetches fresh state when a real adapter lands.
    const payload: EmailJobPayload = {
      type: 'order-confirmation',
      ids: { orderNumber: input.orderNumber },
    };
    await this.queue.add(EMAIL_SEND_JOB, payload, {
      attempts: EMAIL_MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: EMAIL_BACKOFF_BASE_MS },
      removeOnComplete: 100,
    });
  }

  /** Send simulation with structured start/end/error logs (§17). */
  private async processSendJob(job: Job<EmailJobPayload>): Promise<void> {
    const log = { queue: EMAIL_QUEUE, jobId: job.id, type: job.data.type };
    logger.info(log, 'email send start');
    try {
      // SMTP adapter lands later (§13.3): nothing to deliver yet, so the
      // simulation always succeeds and the job completes.
      logger.info({ ...log, attempt: (job.attemptsMade ?? 0) + 1 }, 'email send end');
    } catch (err) {
      logger.error(
        { ...log, err: (err as Error).message },
        'email send error',
      );
      throw err; // surface to BullMQ → retry policy → DLQ
    }
  }

  private async closeAll(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    this.worker = null;
    await this.queue?.close().catch(() => undefined);
    this.queue = null;
  }
}
