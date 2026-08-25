import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import type { AppConfig } from '../../common/config/configuration';
import { APP_CONFIG } from '../../common/config/app-config.token';
import { logger } from '../../common/logger/logger';
import { PaymentReconService } from './payment-recon.service';
import { MaintenanceService } from './maintenance.service';
import {
  MAINTENANCE_CRON,
  MAINTENANCE_JOB,
  PAYMENT_RECON_JOB,
  RECON_REPEAT_EVERY_MS,
  SCHEDULER_QUEUE,
} from './queue.constants';

const REPEAT_HISTORY_LIMIT = 100;

/**
 * Â§17 scheduler: registers the repeatable jobs on the `jobs-scheduler` queue
 * and runs their handlers inline in this process. Everything is created ONLY
 * when Redis answers at boot â€” without Redis the service degrades to
 * log-only mode exactly like notifications, because queues pause but nothing
 * is lost (Â§16.4).
 *
 * Handlers dispatch by job name to PaymentReconService / MaintenanceService,
 * which are idempotent, so overlapping or repeated runs are safe. A later
 * WORKER_MODE split moves only the Worker side into the worker process.
 */
@Injectable()
export class QueueSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly nestLogger = new Logger(QueueSchedulerService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly paymentRecon: PaymentReconService,
    private readonly maintenance: MaintenanceService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!(await this.redis.isHealthy())) {
      this.nestLogger.warn('queue-scheduler: redis unavailable â€” running in log-only mode');
      return;
    }
    try {
      // Options-based connection (not the shared client): BullMQ requires
      // maxRetriesPerRequest=null on its blocking connections and enforces it
      // itself when handed plain options.
      const connection = { url: this.config.redisUrl };

      this.queue = new Queue(SCHEDULER_QUEUE, { connection });
      this.queue.on('error', (err: Error) => {
        logger.debug({ err: err.message, queue: SCHEDULER_QUEUE }, 'scheduler queue error');
      });

      // Scheduler registration is an upsert keyed on the scheduler id:
      // re-registering at every boot is idempotent. Produced jobs are named
      // after their work so handlers can dispatch by job.name.
      await this.queue.upsertJobScheduler(
        PAYMENT_RECON_JOB,
        { every: RECON_REPEAT_EVERY_MS },
        { name: PAYMENT_RECON_JOB, opts: { removeOnComplete: REPEAT_HISTORY_LIMIT } },
      );
      await this.queue.upsertJobScheduler(
        MAINTENANCE_JOB,
        { pattern: MAINTENANCE_CRON },
        { name: MAINTENANCE_JOB, opts: { removeOnComplete: REPEAT_HISTORY_LIMIT } },
      );

      this.worker = new Worker<unknown, void>(SCHEDULER_QUEUE, (job) => this.process(job), {
        connection,
      });
      this.worker.on('error', (err: Error) => {
        logger.warn({ err: err.message, queue: SCHEDULER_QUEUE }, 'scheduler worker error');
      });
    } catch (err) {
      this.nestLogger.warn(
        { err: (err as Error).message },
        'queue-scheduler: registration failed â€” running in log-only mode',
      );
      await this.closeAll();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeAll();
  }

  private async process(job: Job): Promise<void> {
    switch (job.name) {
      case PAYMENT_RECON_JOB:
        logger.info({ jobId: job.id, queue: SCHEDULER_QUEUE }, 'payment-recon job start');
        try {
          const summary = await this.paymentRecon.runOnce();
          logger.info({ jobId: job.id, ...summary }, 'payment-recon job end');
        } catch (err) {
          logger.error({ jobId: job.id, err: (err as Error).message }, 'payment-recon job error');
          throw err;
        }
        break;
      case MAINTENANCE_JOB:
        logger.info({ jobId: job.id, queue: SCHEDULER_QUEUE }, 'maintenance job start');
        try {
          const summary = await this.maintenance.runOnce();
          logger.info({ jobId: job.id, ...summary }, 'maintenance job end');
        } catch (err) {
          logger.error({ jobId: job.id, err: (err as Error).message }, 'maintenance job error');
          throw err;
        }
        break;
      default:
        logger.warn({ jobId: job.id, name: job.name }, 'scheduler received unknown job name');
        break;
    }
  }

  private async closeAll(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    this.worker = null;
    await this.queue?.close().catch(() => undefined);
    this.queue = null;
  }
}
