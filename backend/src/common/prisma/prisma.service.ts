import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/logger';

/**
 * Single Prisma connection for the API process.
 * Connection is lazy: an unavailable database degrades health/readiness
 * (503) instead of crash-looping the whole API.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      logger.warn({ err }, 'database not reachable at boot — readiness will report it down');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(timeoutMs = 2000): Promise<boolean> {
    const probe = this.$queryRaw`SELECT 1`;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('database probe timed out')), timeoutMs),
    );
    try {
      await Promise.race([probe, timeout]);
      return true;
    } catch {
      return false;
    }
  }
}
