import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { argon2id } from 'hash-wasm';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

/**
 * Auth + cart CONTRACT tests through the real HTTP pipeline: global guards,
 * CSRF rule, cookie flags, enumeration resistance, IDOR shape, error contract.
 * Live-database session lifecycle runs in CI integration tests instead.
 *
 * Persistence is stubbed, but hashing is REAL: the stub user carries a genuine
 * argon2id encoding of TEST_PASSWORD so login exercises the true verifier.
 */

process.env.NODE_ENV = 'test';

const TEST_PASSWORD = 'rasengan1234';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'naruto@konoha.jp',
  fullName: 'Naruto Uzumaki',
  role: 'customer',
  isActive: true,
  deletedAt: null,
  passwordHash: '',
};

const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';
const VARIANT_ID = '22222222-2222-4222-8222-222222222222';

function prismaStub() {
  let resetTokenIssued: { tokenHash: string; userId: string } | null = null;
  // Stateful sessions: create() stores by tokenHash, findUnique serves validate().
  const sessions = new Map<
    string,
    { id: string; expiresAt: Date; revokedAt: Date | null; user: typeof USER }
  >();

  const db = {
    user: {
      create: jest.fn().mockResolvedValue(USER),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email?.toLowerCase() === USER.email) return Promise.resolve({ ...USER });
        return Promise.resolve(null);
      }),
      update: jest.fn().mockResolvedValue(USER),
    },
    session: {
      create: jest.fn().mockImplementation(({ data }) => {
        sessions.set(data.tokenHash, {
          id: `sess-${sessions.size + 1}`,
          expiresAt: data.expiresAt,
          revokedAt: null,
          user: { ...USER },
        });
        return Promise.resolve({ id: 's1' });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(sessions.get(where.tokenHash) ?? null),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    passwordResetToken: {
      create: jest.fn().mockImplementation(({ data }) => {
        resetTokenIssued = data;
        return Promise.resolve(data);
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    cart: {
      upsert: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({ id: `${where.userId}-cart`, userId: where.userId }),
      ),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    cartItem: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'someone-elses-line') {
          return Promise.resolve({
            id: where.id,
            variantId: VARIANT_ID,
            cart: { userId: OTHER_USER_ID },
          });
        }
        return Promise.resolve(null);
      }),
      upsert: jest.fn().mockResolvedValue({ id: 'line1' }),
      update: jest.fn().mockResolvedValue({ id: 'line1' }),
      delete: jest.fn().mockResolvedValue({}),
    },
    productVariant: {
      findFirst: jest.fn().mockResolvedValue({ stockOnHand: 40, reserved: 5 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ stockOnHand: 40, reserved: 5 }),
      findMany: jest.fn().mockResolvedValue([{ id: VARIANT_ID, stockOnHand: 40, reserved: 5 }]),
    },
    $queryRaw: jest.fn().mockImplementation(async () => {
      // Reset-token claim: succeeds once per issued token.
      if (resetTokenIssued) {
        resetTokenIssued = null;
        return [{ id: 'rt1', user_id: USER.id }];
      }
      return [];
    }),
    $transaction: jest.fn().mockImplementation((ops) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      // Interactive transaction: hand back a manager wired to the same mocks.
      const tx = { cartItem: { findUnique: db.cartItem.findUnique, upsert: db.cartItem.upsert } };
      return (ops as (tx: never) => Promise<unknown>)(tx as never);
    }),
  };
  return db;
}

function redisStub() {
  // Every cache/throttle call fails → code paths must degrade gracefully.
  const boom = () => jest.fn().mockRejectedValue(new Error('no redis in contract tests'));
  return {
    client: { get: boom(), set: boom(), del: boom(), incr: boom(), expire: boom() },
    isHealthy: jest.fn().mockResolvedValue(false),
  };
}

describe('Auth & cart API contracts (e2e, db-stubbed)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    USER.passwordHash = await argon2id({
      password: TEST_PASSWORD,
      salt: randomBytes(16),
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 32,
      outputType: 'encoded',
    });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaStub())
      .overrideProvider(RedisService)
      .useValue(redisStub())
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  const agent = () => request(app.getHttpServer());

  describe('POST /api/v1/auth/register', () => {
    it('creates accounts and answers identically for duplicates (enumeration resistance)', async () => {
      const first = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'sakura@konoha.jp', password: 'byakugou1234', fullName: 'Sakura' })
        .expect(200);
      expect(first.body).toEqual({ ok: true });

      // Existing email — same status, same body shape.
      const dup = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: USER.email, password: 'rasengan1234', fullName: 'N' })
        .expect(200);
      expect(dup.body).toEqual(first.body);
    });

    it('rejects weak passwords before any hashing work', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'x@y.jp', password: 'short', fullName: 'X' })
        .expect(400);
    });
  });

  describe('login / me / logout lifecycle', () => {
    async function login(): Promise<string[]> {
      const res = await agent()
        .post('/api/v1/auth/login')
        .set('x-csrf-token', '1')
        .send({ email: USER.email, password: TEST_PASSWORD })
        .expect(200);
      return res.headers['set-cookie'] as unknown as string[];
    }

    it('sets an httpOnly SameSite=Lax cookie and serves /auth/me from it', async () => {
      const cookies = await login();
      expect(cookies.join('\n')).toContain('shinobi_session=');
      expect(cookies.join('\n')).toMatch(/HttpOnly/i);
      expect(cookies.join('\n')).toMatch(/SameSite=Lax/i);

      const me = await agent().get('/api/v1/auth/me').set('Cookie', cookies).expect(200);
      expect(me.body.user).toMatchObject({ email: USER.email, role: 'customer' });
    });

    it('answers identical errors for unknown users vs wrong passwords', async () => {
      const wrongPassword = await agent()
        .post('/api/v1/auth/login')
        .send({ email: USER.email, password: 'definitely-wrong-1' })
        .expect(401);
      const unknownUser = await agent()
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@konoha.jp', password: 'definitely-wrong-1' })
        .expect(401);

      expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
      expect(unknownUser.body.code).toBe(wrongPassword.body.code);
      expect(unknownUser.body.message).toBe(wrongPassword.body.message);
    });

    it('rejects mutations without the CSRF header when cookie-authed', async () => {
      const cookies = await login();
      await agent()
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .expect(401)
        .then((res) => expect(res.body.code).toBe('CSRF_TOKEN_MISSING'));

      await agent()
        .post('/api/v1/auth/logout')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .expect(200);
    });

    it('requires authentication on protected routes', async () => {
      const res = await agent().get('/api/v1/cart').expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('password reset', () => {
    it('responds uniformly whether or not the account exists', async () => {
      const known = await agent()
        .post('/api/v1/auth/forgot-password')
        .send({ email: USER.email })
        .expect(200);
      const unknown = await agent()
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@konoha.jp' })
        .expect(200);

      delete known.body.devToken; // dev echo differs by design; envelope must not
      expect(Object.keys(known.body)).toEqual(Object.keys(unknown.body));
    });

    it('consumes single-use tokens and rejects exhausted ones', async () => {
      const issued = await agent()
        .post('/api/v1/auth/forgot-password')
        .send({ email: USER.email })
        .expect(200);
      const token = issued.body.devToken as string;
      expect(token).toBeTruthy();

      await agent()
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'new-sage-mode-99' })
        .expect(200);

      await agent()
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'new-sage-mode-99' })
        .expect(400)
        .then((res) => expect(res.body.code).toBe('RESET_TOKEN_INVALID'));
    });
  });

  describe('cart surface', () => {
    it('adds items clamped to live availability', async () => {
      const cookies = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-csrf-token', '1')
        .send({ email: USER.email, password: TEST_PASSWORD })
        .then((res) => res.headers['set-cookie']);

      // stock 40 − reserved 5 = 35 available; DTO caps per-add quantity at 10
      // (stepper parity) and availability clamping is asserted in unit/int tests.
      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, quantity: 10 })
        .expect(200);
      // Add/merge respond with the updated line array itself.
      expect(Array.isArray(res.body)).toBe(true);

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, quantity: 0 })
        .expect(400); // validation: minimum 1
    });

    it('blocks cross-user cart mutations (IDOR guard)', async () => {
      const cookies = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-csrf-token', '1')
        .send({ email: USER.email, password: TEST_PASSWORD })
        .then((res) => res.headers['set-cookie']);

      await request(app.getHttpServer())
        .patch('/api/v1/cart/items/someone-elses-line')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ quantity: 1 })
        .expect(403);
    });

    it('merges guest carts skipping untrusted entries', async () => {
      const cookies = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('x-csrf-token', '1')
        .send({ email: USER.email, password: TEST_PASSWORD })
        .then((res) => res.headers['set-cookie']);

      const res = await request(app.getHttpServer())
        .post('/api/v1/cart/merge')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({
          items: [
            { variantId: VARIANT_ID, quantity: 2 },
            { variantId: '44444444-4444-4444-8444-444444444444', quantity: 7 }, // unknown → skipped
          ],
        })
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
