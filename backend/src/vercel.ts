import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let cachedApp: NestExpressApplication | undefined;

async function getApp(): Promise<NestExpressApplication> {
  if (!cachedApp) {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false,
      rawBody: true,
    });
    await configureApp(app);
    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  const expressInstance = app.getHttpAdapter().getInstance();
  return expressInstance(req, res);
}
