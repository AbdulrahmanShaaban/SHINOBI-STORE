import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

/**
 * RedisModule is imported explicitly (it is @Global) so module graphs that
 * pull Catalog/Content standalone — e.g. contract-test harnesses — resolve
 * CacheService's dependency without booting AppModule.
 */
@Module({
  imports: [RedisModule],
  controllers: [CacheController],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
