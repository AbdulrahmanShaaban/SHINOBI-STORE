import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './common/config/configuration';
import { AppConfigModule } from './common/config/app-config.module';
import { validateEnv } from './common/config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { SessionGuard } from './common/guards/session.guard';
import { PermissionsGuard } from './common/rbac/permissions.guard';
import { HealthModule } from './modules/health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';

@Module({
  imports: [
    // Fail-fast environment contract — invalid/malformed env aborts boot.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    // Typed config token, available app-wide.
    AppConfigModule,
    // Global rate limiting baseline (per-route overrides arrive with real endpoints).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 100),
      },
    ]),
    PrismaModule,
    RedisModule,
    HealthModule,
    CatalogModule,
    AuthModule,
    CartModule,
  ],
  providers: [
    // Order matters: authentication first (attaches req.user), then
    // authorization (@RequirePermissions metadata). @Public() routes skip auth.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
