import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/guards/public.decorator';
import { CacheService, CachePrefixStats } from './cache.service';

/**
 * Dev/ops observability surface for the §16.1 read-through cache. Public like
 * /health so load generators and dashboards can scrape it without a session;
 * it exposes only aggregate hit/miss counters — never cached payload data.
 */
@ApiTags('ops')
@Public()
@SkipThrottle()
@Controller('metrics')
export class CacheController {
  constructor(private readonly cache: CacheService) {}

  @Get('cache')
  @ApiOperation({ summary: 'Cache effectiveness per key prefix (dev/ops surface)' })
  @ApiOkResponse({ description: '[{ prefix, hits, misses, ratio }] counters since process start' })
  stats(): CachePrefixStats[] {
    return this.cache.stats();
  }
}
