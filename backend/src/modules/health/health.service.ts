import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

export interface DependencyStatus {
  status: 'up' | 'down';
  latencyMs?: number;
}

export interface ReadinessReport {
  status: 'ok' | 'unavailable';
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async readiness(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      this.timedProbe(() => this.prisma.isHealthy()),
      this.timedProbe(() => this.redis.isHealthy()),
    ]);

    const allUp = database.status === 'up' && redis.status === 'up';

    return {
      status: allUp ? 'ok' : 'unavailable',
      dependencies: { database, redis },
    };
  }

  private async timedProbe(probe: () => Promise<boolean>): Promise<DependencyStatus> {
    const startedAt = Date.now();
    try {
      const up = await probe();
      return up
        ? { status: 'up', latencyMs: Date.now() - startedAt }
        : { status: 'down' };
    } catch {
      return { status: 'down' };
    }
  }
}
