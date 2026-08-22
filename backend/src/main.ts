import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { logger } from './common/logger/logger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  const config = await configureApp(app);

  await app.listen(config.port);

  logger.info(
    { port: config.port, env: config.nodeEnv },
    `Shinobi Store API listening on :${config.port} — health: /health, readiness: /health/ready`,
  );
}

bootstrap().catch((err) => {
  logger.error({ err }, 'fatal: failed to start Shinobi Store API');
  process.exit(1);
});
