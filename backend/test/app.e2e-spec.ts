import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

/**
 * Boots the REAL application pipeline (helmet, CORS, prefixing, validation,
 * guards, filters) without requiring live PostgreSQL/Redis. Dependency
 * availability is asserted contractually: readiness must be internally
 * consistent whether infrastructure is present (CI services) or absent
 * (local unit-style run).
 */
describe('Shinobi Store API (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health (liveness)', () => {
    it('returns 200 ok without checking dependencies', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.uptimeSec).toBe('number');
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('reports a consistent dependency report', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready');

      expect([200, 503]).toContain(res.status);

      const deps = res.body.dependencies;
      expect(deps.database.status).toMatch(/^(up|down)$/);
      expect(deps.redis.status).toMatch(/^(up|down)$/);

      if (res.status === 200) {
        expect(res.body.status).toBe('ok');
        expect(deps.database.status).toBe('up');
        expect(deps.redis.status).toBe('up');
      } else {
        expect(res.body.status).toBe('unavailable');
        expect(deps.database.status === 'down' || deps.redis.status === 'down').toBe(true);
      }
    });
  });

  describe('error contract', () => {
    it('shapes unknown routes consistently with a correlation id', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.statusCode).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND_ERROR');
      expect(typeof res.body.requestId).toBe('string');
    });

    it('echoes an inbound x-request-id', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .set('x-request-id', 'test-correlation-42');

      expect(res.headers['x-request-id']).toBe('test-correlation-42');
    });

    it('generates a correlation id when none is supplied', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('security headers', () => {
    it('applies helmet baseline headers', async () => {
      const res = await request(app.getHttpServer()).get('/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
