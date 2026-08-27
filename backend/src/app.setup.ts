import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { APP_CONFIG } from './common/config/app-config.token';
import type { AppConfig } from './common/config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';

/**
 * Shared HTTP bootstrap applied identically by the real server (main.ts),
 * the OpenAPI generator script and the e2e test harness — so tests always
 * exercise the production request pipeline: correlation ids, access logs,
 * the error contract, security headers, validation and versioning.
 *
 * Rate limiting (ThrottlerGuard) is intentionally NOT registered here —
 * it requires ThrottlerModule storage/options from the host AppModule.
 */
export async function configureApp(app: NestExpressApplication): Promise<AppConfig> {
  const config = app.get<AppConfig>(APP_CONFIG);

  // Correlation ids first — every log line and error response depends on them.
  const requestContext = new RequestContextMiddleware();
  app.use((req: unknown, res: unknown, next: () => void) => requestContext.use(req as never, res as never, next));

  // Prevent caching of API responses — avoids stale 304s from Vercel edge cache.
  app.use((req: unknown, res: unknown, next: () => void) => {
    const r = res as { setHeader: (name: string, value: string) => void };
    r.setHeader('Cache-Control', 'private, no-store');
    next();
  });

  // Security headers. CSP is intentionally not set here: this is a JSON API;
  // browser-facing CSP belongs to the frontend/edge layer.
  // HSTS only makes sense behind TLS in production; maxAge is in SECONDS
  // (180 days), subdomains included. Non-production bootstraps omit it so
  // plain-http local/test traffic never gets poisoned with the policy.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      strictTransportSecurity: config.isProduction
        ? { maxAge: 180 * 24 * 60 * 60, includeSubDomains: true }
        : false,
    }),
  );

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  app.useBodyParser('json', { limit: '1mb' });

  // Health probes stay unversioned for platform conventions.
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready'],
  });

  // Global filter/interceptor instances (no DI needed — they use the shared
  // logger). Registered here rather than via APP_* tokens so every bootstrap
  // path gets identical behavior.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!config.isProduction || process.env.SWAGGER_ENABLED === 'true') {
    const document = buildOpenApiDocument(app);
    SwaggerModule.setup('api-docs', app, document);
  }

  app.enableShutdownHooks();

  return config;
}

export function buildOpenApiDocument(app: INestApplication) {
  const documentConfig = new DocumentBuilder()
    .setTitle('Shinobi Store API')
    .setDescription(
      'Authoritative API for Shinobi Store — storefront, admin CRM and future clients.',
    )
    .setVersion('0.1')
    .addBearerAuth()
    .addCookieAuth('shinobi_session')
    .build();

  return SwaggerModule.createDocument(app, documentConfig);
}
