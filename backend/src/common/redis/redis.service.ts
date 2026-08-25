import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { AppConfig } from '../config/configuration';
import { APP_CONFIG } from '../config/app-config.token';
import { logger } from '../logger/logger';

/**
 * Redis connection for cache / rate limiting / BullMQ (plan Â§16).
 * Deliberately resilient to absence: lazy connect, bounded retries, and a
 * `ping()` probe with timeout so an unreachable Redis degrades health/readiness
 * instead of hanging requests or crash-looping the API.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 250, 1000)),
    });

    // ioredis emits 'error' on every failed reconnect; without a listener it
    // becomes an unhandled exception. We log at debug level only â€” readiness
    // reporting owns surfacing the outage.
    this.client.on('error', (err: Error) => {
      logger.debug({ err: err.message }, 'redis connection error');
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      logger.warn('redis not reachable at boot â€” readiness will report it down');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }

  async isHealthy(timeoutMs = 1500): Promise<boolean> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('redis probe timed out')), timeoutMs),
    );
    try {
      const pong = await Promise.race([this.client.ping(), timeout]);
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
