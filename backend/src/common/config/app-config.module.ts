import { Global, Module } from '@nestjs/common';
import configuration, { AppConfig } from './configuration';
import { APP_CONFIG } from './app-config.token';

/**
 * Typed application configuration, available app-wide via the APP_CONFIG token.
 * Validation has already run (ConfigModule.forRoot validate) before this factory
 * is consumed, so values are guaranteed well-formed.
 */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: (): AppConfig => configuration() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
