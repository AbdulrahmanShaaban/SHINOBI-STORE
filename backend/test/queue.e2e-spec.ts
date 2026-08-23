import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { QueueModule } from '../src/modules/queue/queue.module';
import { AppConfigModule } from '../src/common/config/app-config.module';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { RedisModule } from '../src/common/redis/redis.module';
import { AuditModule } from '../src/modules/audit/audit.module';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';
import { PaymentsModule } from '../src/modules/payments/payments.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { configureApp } from '../src/app.setup';

/**
 * §17 queue admin contract tests against a standalone QueueModule harness
 * (the lead wires it into AppModule after this phase). Redis is stubbed DOWN:
 * the suite pins the degradation contract — zeroed envelopes, never errors —
 * plus the authentication boundary and the QUEUE_JOB_NOT_FOUND requeue 404.
 */

process.env.NODE_ENV = 'test';

const ADMIN = {
  id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
  email: 'queues-admin@konoha.jp',
  fullName: 'Queue Keeper',
  role: 'admin',
};

function prismaStub() {
  return {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    session: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    cart: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function redisDownStub() {
  return {
    client: {},
    isHealthy: jest.fn().mockResolvedValue(false),
  };
}

describe('Queue admin API contracts (e2e, redis down)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = ''; // force mock payment provider

    const moduleRef = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        PrismaModule,
        RedisModule,
        AuditModule,
        NotificationsModule,
        PaymentsModule,
        QueueModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub())
      .overrideProvider(RedisService)
      .useValue(redisDownStub())
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);

    // Harness-only auth: the global SessionGuard chain lives in AppModule, so
    // a header-controlled middleware attaches req.user before guards run.
    // No header = anonymous → AdminGuard must answer 401.
    app.use(
      (
        req: { headers: Record<string, unknown>; user?: unknown },
        _res: unknown,
        next: () => void,
      ) => {
        if (req.headers['x-test-auth'] === 'admin') req.user = ADMIN;
        next();
      },
    );

    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  describe('authentication boundary', () => {
    it('rejects an anonymous overview request with UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/queues').expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects an anonymous requeue with UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/queues/email/failed/some-job/requeue')
        .expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('GET /admin/queues (redis down → zeroed envelopes)', () => {
    it('lists every registered queue with zero counts and empty DLQ', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/queues')
        .set('x-test-auth', 'admin')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const entry of res.body as Array<Record<string, unknown>>) {
        expect(typeof entry.name).toBe('string');
        expect(entry.counts).toEqual({
          completed: 0,
          failed: 0,
          active: 0,
          waiting: 0,
          delayed: 0,
        });
        expect(entry.dlqCount).toBe(0);
      }
      const names = (res.body as Array<{ name: string }>).map((q) => q.name);
      expect(names).toContain('email');
    });

    it('returns an empty failed list instead of erroring while redis is down', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/queues/email/failed?page=1')
        .set('x-test-auth', 'admin')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('POST /admin/queues/:name/failed/:jobId/requeue', () => {
    it('answers 404 QUEUE_JOB_NOT_FOUND for an unknown job', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/queues/email/failed/no-such-job/requeue')
        .set('x-test-auth', 'admin')
        .expect(404);

      expect(res.body.code).toBe('QUEUE_JOB_NOT_FOUND');
    });

    it('answers 404 QUEUE_JOB_NOT_FOUND for an unregistered queue', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/queues/not-a-queue/failed/whatever/requeue')
        .set('x-test-auth', 'admin')
        .expect(404);

      expect(res.body.code).toBe('QUEUE_JOB_NOT_FOUND');
    });
  });
});
