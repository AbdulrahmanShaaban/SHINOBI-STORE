import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let cachedHandler: ReturnType<typeof serverlessExpress> | undefined;

async function createHandler() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      logger: false,
      rawBody: true,
    },
  );

  await configureApp(app);
  await app.init();

  return serverlessExpress({
    app: app.getHttpAdapter().getInstance(),
  });
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await createHandler();
  }

  return new Promise((resolve, reject) => {
    cachedHandler!(req, res, (error: unknown) => {
      if (error) {
        reject(error);
      } else {
        resolve(undefined);
      }
    });
  });
}