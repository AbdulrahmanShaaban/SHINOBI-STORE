import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
    rawBody: true,
  });

  await configureApp(app);
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (event: unknown, context: Context, callback: Callback) => {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }
  return cachedHandler(event, context, callback);
};
