/**
 * Generates the OpenAPI spec without binding a port, so contract types can be
 * regenerated in CI or locally with no running server.
 *
 * Usage: pnpm --filter backend openapi:generate
 * Writes ../packages/contracts/openapi.json
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/app.setup';

async function main(): Promise<void> {
  // Codegen placeholder env — validation only checks shape; no real connections are made.
  process.env.NODE_ENV ??= 'development';
  process.env.DATABASE_URL ??= 'postgresql://codegen:codegen@localhost:5432/codegen';
  process.env.REDIS_URL ??= 'redis://localhost:6379';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });

  // Mirror the real global prefix so paths in the spec match production.
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });

  const document = buildOpenApiDocument(app);

  const outPath = resolve(__dirname, '../../packages/contracts/openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n', 'utf8');

  await app.close();
  console.log(`openapi.json written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
