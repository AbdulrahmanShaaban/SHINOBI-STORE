import { Inject, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../../common/redis/redis.service';
import type { AppConfig } from '../../common/config/configuration';
import { APP_CONFIG } from '../../common/config/app-config.token';
import { logger } from '../../common/logger/logger';
import { ADMIN_QUEUE_NAMES } from './queue.constants';

export interface QueueCounts {
  completed: number;
  failed: number;
  active: number;
  waiting: number;
  delayed: number;
}

export interface QueueOverview {
  name: string;
  counts: QueueCounts;
  dlqCount: number;
}

export interface FailedJobView {
  id: string;
  name: string;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number;
}

const ZERO_COUNTS: QueueCounts = {
  completed: 0,
  failed: 0,
  active: 0,
  waiting: 0,
  delayed: 0,
};

const FAILED_PAGE_SIZE = 25;
/** Upper bound for the DLQ scan so huge failed sets cannot stall the API. */
const DLQ_SCAN_CAP = 500;

/**
 * Admin-facing queue introspection (Â§17 DLQ surface). Every Redis touch is
 * individually guarded: when Redis is unreachable the API answers zeroed
 * envelopes instead of failing â€” queues pause, nothing is lost (Â§16.4).
 *
 * A dead-lettered job is a failed job that exhausted its attempts (BullMQ
 * moves those to the failed set automatically once retries are spent);
 * requeue puts it back in line via job.retry().
 */
@Injectable()
export class QueueAdminService implements OnModuleDestroy {
  private readonly instances = new Map<string, Queue>();

  constructor(
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async listQueues(): Promise<QueueOverview[]> {
    const out: QueueOverview[] = [];
    for (const name of ADMIN_QUEUE_NAMES) {
      out.push(await this.overview(name));
    }
    return out;
  }

  async listFailed(name: string, page = 1): Promise<FailedJobView[]> {
    if (!ADMIN_QUEUE_NAMES.includes(name)) return [];
    try {
      if (!(await this.redis.isHealthy())) return [];
      const queue = this.ensureQueue(name);
      if (!queue) return [];

      const safePage = Math.max(1, Math.floor(page));
      const start = (safePage - 1) * FAILED_PAGE_SIZE;
      const jobs = await queue.getFailed(start, start + FAILED_PAGE_SIZE - 1);
      return jobs.map(toFailedView);
    } catch (err) {
      logger.warn({ err: (err as Error).message, queue: name }, 'queue failed-list unavailable');
      return [];
    }
  }

  /**
   * Requeue a dead-lettered job. Unknown queue/job (or Redis down, which makes
   * existence unverifiable) answers 404 QUEUE_JOB_NOT_FOUND rather than a 500.
   */
  async requeue(name: string, jobId: string): Promise<{ id: string; name: string; requeued: true }> {
    if (!ADMIN_QUEUE_NAMES.includes(name)) {
      throw new NotFoundException({
        code: 'QUEUE_JOB_NOT_FOUND',
        message: `No job '${jobId}' in queue '${name}'`,
      });
    }
    if (!(await this.redis.isHealthy())) {
      throw notFound(jobId, name);
    }
    try {
      const queue = this.ensureQueue(name);
      const job = queue ? await queue.getJob(jobId) : null;
      if (!job) throw notFound(jobId, name);
      await job.retry();
      logger.info({ queue: name, jobId }, 'queue job requeued');
      return { id: jobId, name, requeued: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw notFound(jobId, name);
    }
  }

  private async overview(name: string): Promise<QueueOverview> {
    try {
      if (!(await this.redis.isHealthy())) return { name, counts: ZERO_COUNTS, dlqCount: 0 };
      const queue = this.ensureQueue(name);
      if (!queue) return { name, counts: ZERO_COUNTS, dlqCount: 0 };

      const raw = await queue.getJobCounts('completed', 'failed', 'active', 'waiting', 'delayed');
      const counts: QueueCounts = {
        completed: raw.completed ?? 0,
        failed: raw.failed ?? 0,
        active: raw.active ?? 0,
        waiting: raw.waiting ?? 0,
        delayed: raw.delayed ?? 0,
      };
      return { name, counts, dlqCount: await this.countDeadLettered(queue) };
    } catch (err) {
      logger.debug({ err: (err as Error).message, queue: name }, 'queue overview unavailable');
      return { name, counts: ZERO_COUNTS, dlqCount: 0 };
    }
  }

  /** DLQ size = failed jobs whose retries are exhausted. Bounded scan. */
  private async countDeadLettered(queue: Queue): Promise<number> {
    const failed = await queue.getFailed(0, DLQ_SCAN_CAP - 1);
    let dead = 0;
    for (const job of failed) {
      const maxAttempts = job.opts.attempts ?? 1;
      if ((job.attemptsMade ?? 0) >= maxAttempts) dead += 1;
    }
    return dead;
  }

  /**
   * Options-based connection (not the shared client): BullMQ requires
   * maxRetriesPerRequest=null on its connections and enforces it itself when
   * handed plain options.
   */
  private ensureQueue(name: string): Queue | null {
    const existing = this.instances.get(name);
    if (existing) return existing;
    try {
      const queue = new Queue(name, { connection: { url: this.config.redisUrl } });
      queue.on('error', (err: Error) => {
        logger.debug({ err: err.message, queue: name }, 'admin queue connection error');
      });
      this.instances.set(name, queue);
      return queue;
    } catch (err) {
      logger.warn({ err: (err as Error).message, queue: name }, 'admin queue unavailable');
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [name, queue] of this.instances) {
      this.instances.delete(name);
      await queue.close().catch(() => undefined);
    }
  }
}

function notFound(jobId: string, name: string): NotFoundException {
  return new NotFoundException({
    code: 'QUEUE_JOB_NOT_FOUND',
    message: `No job '${jobId}' in queue '${name}'`,
  });
}

function toFailedView(job: {
  id?: string;
  name: string;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
}): FailedJobView {
  return {
    id: String(job.id ?? ''),
    name: job.name,
    failedReason: job.failedReason ?? null,
    attemptsMade: job.attemptsMade ?? 0,
    timestamp: job.timestamp ?? 0,
  };
}
