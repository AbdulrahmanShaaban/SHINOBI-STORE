import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { argon2id } from 'hash-wasm';
import { randomBytes, randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

/**
 * Admin CRM contract tests through the real HTTP pipeline: the global guard
 * chain (Throttler → Session → Permissions) plus route-level AdminGuard and
 * @RequirePermissions metadata, against an in-memory prisma stub.
 * Role × permission semantics are pinned in src/common/rbac/permissions.spec.ts;
 * here we prove wiring: 401 without a session, envelopes, audit writes,
 * state-machine passthrough and clamped stock math.
 */

process.env.NODE_ENV = 'test';

const TEST_PASSWORD = 'rasengan1234';

const ADMIN = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  email: 'kakashi@konoha.jp',
  fullName: 'Kakashi Hatake',
  role: 'admin',
};

const MANAGER = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  email: 'iruka@konoha.jp',
  fullName: 'Iruka Umino',
  role: 'order_manager',
};

const CUSTOMER = {
  id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  email: 'naruto@konoha.jp',
  fullName: 'Naruto Uzumaki',
  role: 'customer',
};

const VARIANT_ID = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';

function pick(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in row) out[key] = row[key];
  }
  return out;
}

function buildDb() {
  const users = new Map<string, Record<string, unknown>>();
  for (const u of [ADMIN, MANAGER, CUSTOMER]) {
    users.set(u.email, { ...u, isActive: true, deletedAt: null, passwordHash: '' });
  }

  const sessions = new Map<
    string,
    { id: string; expiresAt: Date; revokedAt: Date | null }
  >();

  // tokenHash → owner user id, so validate() serves the right (current) user.
  const sessionOwners = new Map<string, string>();

  const orderRows: Array<Record<string, unknown>> = [];
  const events: unknown[] = [];
  const inventoryTxns: unknown[] = [];

  function userPublic(email: string) {
    const u = users.get(email)!;
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      deletedAt: u.deletedAt,
    };
  }

  function findOrderBy(where: { id?: string; orderNumber?: string }) {
    return (
      orderRows.find((o) => where.id !== undefined && o.id === where.id) ??
      orderRows.find(
        (o) => where.orderNumber !== undefined && o.orderNumber === where.orderNumber,
      ) ??
      null
    );
  }

  const db = {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) {
          return Promise.resolve(users.get(String(where.email).toLowerCase()) ?? null);
        }
        if (where.id) {
          const hit = [...users.values()].find((u) => u.id === where.id);
          return Promise.resolve(hit ? { ...hit } : null);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(() =>
        Promise.resolve(
          [...users.values()]
            .filter((u) => u.role === 'customer')
            .map((u) => ({ ...u, _count: { orders: 2 } })),
        ),
      ),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockImplementation(({ where, data, select }) => {
        const hit = [...users.values()].find((u) => u.id === where.id);
        if (!hit) return Promise.reject(new Error('user missing'));
        Object.assign(hit, data);
        const row = { ...hit };
        return Promise.resolve(select ? pick(row, Object.keys(select)) : row);
      }),
    },
    session: {
      create: jest.fn().mockImplementation(({ data }) => {
        sessions.set(data.tokenHash, {
          id: `sess-${sessions.size + 1}`,
          expiresAt: data.expiresAt,
          revokedAt: null,
        });
        sessionOwners.set(data.tokenHash, String(data.userId));
        return Promise.resolve({ id: 's1' });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const row = sessions.get(where.tokenHash);
        if (!row) return Promise.resolve(null);
        const ownerEmail = sessionOwners.get(where.tokenHash)!;
        const email = [...users.values()].find((u) => u.id === ownerEmail)!.email as string;
        return Promise.resolve({
          id: row.id,
          expiresAt: row.expiresAt,
          revokedAt: row.revokedAt,
          user: userPublic(email),
        });
      }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          [...sessions.entries()]
            .filter(([hash, row]) => row.revokedAt === null && sessionOwners.get(hash) === String(where.userId))
            .map(([hash]) => ({ tokenHash: hash })),
        ),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    order: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { totalCents: 12_345 } }),
      groupBy: jest.fn().mockResolvedValue([
        { status: 'confirmed', _count: { _all: 3 } },
        { status: 'pending_payment', _count: { _all: 1 } },
      ]),
      findMany: jest.fn().mockImplementation(() =>
        Promise.resolve(
          orderRows.length > 0
            ? orderRows.map((o) => ({ ...o, _count: { items: 2 } }))
            : [
                {
                  orderNumber: 'SS-2026-100001',
                  status: 'confirmed',
                  totalCents: 5_000,
                  createdAt: new Date('2026-08-20T10:00:00Z'),
                  contactEmail: CUSTOMER.email,
                },
              ],
        ),
      ),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const order = findOrderBy(where);
        if (!order) return Promise.resolve(null);
        if (where.orderNumber && (where.include || where.select)) {
          return Promise.resolve({
            ...order,
            items: [],
            events: [],
            payments: [{ status: 'succeeded' }],
          });
        }
        return Promise.resolve({ ...order });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const order = findOrderBy(where);
        if (!order) return Promise.reject(new Error('order missing'));
        Object.assign(order, data);
        return Promise.resolve(order);
      }),
    },
    orderItem: { findMany: jest.fn().mockResolvedValue([]) },
    orderEvent: {
      create: jest.fn().mockImplementation(({ data }) => {
        events.push(data);
        return Promise.resolve(data);
      }),
    },
    inventoryTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        inventoryTxns.push(data);
        return Promise.resolve(data);
      }),
    },
    productVariant: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ stockOnHand: 0 }),
    },
    coupon: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ id: 'coupon-1' }),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'coupon-1', timesUsed: 0, isActive: true, ...data }),
      ),
      update: jest.fn().mockImplementation(({ where, data }) =>
        Promise.resolve({ id: where.id, code: 'SPRING', type: 'percent', value: 10, ...data }),
      ),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        {
          id: randomUUID(),
          actorUserId: ADMIN.id,
          action: 'order.transition',
          entityType: 'order',
          entityId: 'ord-1',
          diff: { to: 'processing' },
          ip: '127.0.0.1',
          createdAt: new Date('2026-08-23T09:00:00Z'),
        },
      ]),
      count: jest.fn().mockResolvedValue(1),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest
      .fn()
      .mockResolvedValue([
        {
          variantId: VARIANT_ID,
          sku: 'SKU-LOW',
          productName: 'Scroll Poster',
          stockOnHand: 3,
          reserved: 1,
        },
      ]),
    $transaction: jest.fn().mockImplementation((fn: (tx: typeof db) => Promise<unknown>) => fn(db)),
  };

  return { db, users, sessions, sessionOwners, orderRows, events, inventoryTxns };
}

function redisStub() {
  const boom = () => jest.fn().mockRejectedValue(new Error('no redis in contract tests'));
  return {
    client: { get: boom(), set: boom(), del: boom(), incr: boom(), expire: boom() },
    isHealthy: jest.fn().mockResolvedValue(false),
  };
}

describe('Admin API contracts (e2e, db-stubbed)', () => {
  let app: NestExpressApplication;
  let harness: ReturnType<typeof buildDb>;

  const adminCookies = async (): Promise<string[]> => await loginAs(ADMIN.email);
  const managerCookies = async (): Promise<string[]> => await loginAs(MANAGER.email);

  async function loginAs(email: string): Promise<string[]> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-csrf-token', '1')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return res.headers['set-cookie'] as unknown as string[];
  }

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = ''; // force mock payment provider
    harness = buildDb();

    for (const staff of [ADMIN, MANAGER]) {
      const row = harness.users.get(staff.email)!;
      row.passwordHash = await argon2id({
        password: TEST_PASSWORD,
        salt: randomBytes(16),
        parallelism: 1,
        iterations: 2,
        memorySize: 19456,
        hashLength: 32,
        outputType: 'encoded',
      });
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(harness.db)
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

  describe('authentication boundary', () => {
    it('rejects an anonymous dashboard request with UNAUTHENTICATED', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/admin/dashboard').expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it.each([
      ['GET', '/api/v1/admin/dashboard'],
      ['POST', `/api/v1/admin/orders/SS-2026-100001/transition`],
      ['POST', '/api/v1/admin/inventory/adjustments'],
      ['POST', '/api/v1/admin/coupons'],
      ['POST', `/api/v1/admin/customers/${CUSTOMER.id}/ban`],
      ['GET', '/api/v1/admin/audit-log'],
    ])('answers %s %s without a session with 401', async (method, url) => {
      const req = request(app.getHttpServer());
      const res =
        method === 'GET'
          ? await req.get(url).expect(401)
          : await req.post(url).send({}).expect(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('still demands the CSRF header from cookie-authenticated mutations', async () => {
      const cookies = await adminCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Cookie', cookies)
        .send({ code: 'NOCSRF', type: 'fixed', value: 5 })
        .expect(401)
        .then((res) => expect(res.body.code).toBe('CSRF_TOKEN_MISSING'));
    });
  });

  describe('GET /admin/dashboard', () => {
    it('returns the frozen overview envelope for staff', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body).toEqual({
        revenueCents: 12_345,
        ordersByStatus: { confirmed: 3, pending_payment: 1 },
        lowStock: [
          {
            variantId: VARIANT_ID,
            sku: 'SKU-LOW',
            productName: 'Scroll Poster',
            stockOnHand: 3,
            reserved: 1,
          },
        ],
        recentOrders: [
          {
            orderNumber: 'SS-2026-100001',
            status: 'confirmed',
            totalCents: 5_000,
            createdAt: '2026-08-20T10:00:00.000Z',
            contactEmail: CUSTOMER.email,
          },
        ],
      });
    });
  });

  describe('POST /admin/orders/:orderNumber/transition', () => {
    beforeEach(() => {
      harness.orderRows.length = 0;
      harness.events.length = 0;
    });

    it('moves an order through the whitelisted machine and audits it', async () => {
      harness.orderRows.push({
        id: 'ord-1',
        orderNumber: 'SS-2026-100001',
        status: 'confirmed',
      });
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/orders/SS-2026-100001/transition')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ to: 'processing', note: 'warehouse picked' })
        .expect(200);

      expect(res.body).toEqual({ orderNumber: 'SS-2026-100001', status: 'processing' });
      expect(harness.orderRows[0].status).toBe('processing');
      expect(
        harness.events.some((e) => (e as { toStatus: string }).toStatus === 'processing'),
      ).toBe(true);
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: ADMIN.id,
            action: 'order.transition',
            entityType: 'order',
            entityId: 'ord-1',
          }),
        }),
      );
    });

    it('surfaces illegal transitions as 409 from the state machine', async () => {
      harness.orderRows.push({
        id: 'ord-2',
        orderNumber: 'SS-2026-100002',
        status: 'cancelled',
      });
      const cookies = await adminCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/orders/SS-2026-100002/transition')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ to: 'processing' })
        .expect(409)
        .then((res) => expect(res.body.code).toBe('ILLEGAL_TRANSITION'));
      expect(harness.orderRows[0].status).toBe('cancelled');
    });

    it('404s unknown order numbers', async () => {
      const cookies = await adminCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/orders/SS-2026-999999/transition')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ to: 'shipped' })
        .expect(404)
        .then((res) => expect(res.body.code).toBe('ORDER_NOT_FOUND'));
    });

    it('rejects DTO-foreign targets before touching the state machine', async () => {
      const cookies = await adminCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/orders/SS-2026-100001/transition')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ to: 'refunded' })
        .expect(400);
    });
  });

  describe('POST /admin/inventory/adjustments', () => {
    // Matrix truth: inventory:adjust belongs to order_manager (+super_admin);
    // a plain admin holds inventory:w but not :adjust, so the guard rejects.
    it('clamps negative corrections at zero and audits them', async () => {
      const cookies = await managerCookies();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/inventory/adjustments')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, delta: -9_999, reason: 'damaged in storage' })
        .expect(200);

      expect(res.body).toEqual({ variantId: VARIANT_ID, stockOnHand: 0 });
      expect(harness.inventoryTxns.some((t) => (t as { type: string }).type === 'adjust')).toBe(
        true,
      );
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'inventory.adjust',
            entityType: 'product_variant',
            entityId: VARIANT_ID,
          }),
        }),
      );
    });

    it('rejects staff roles lacking inventory:adjust', async () => {
      const cookies = await adminCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/inventory/adjustments')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, delta: -1, reason: 'matrix gap proof' })
        .expect(403);
    });

    it('validates delta bounds and zero deltas', async () => {
      const cookies = await managerCookies();
      await request(app.getHttpServer())
        .post('/api/v1/admin/inventory/adjustments')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, delta: 0, reason: 'noop' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/admin/inventory/adjustments')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ variantId: VARIANT_ID, delta: 10_001, reason: 'too much' })
        .expect(400);
    });
  });

  describe('coupons CRUD', () => {
    it('creates coupons and answers 409 COUPON_CODE_TAKEN on duplicates', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ code: 'SPRING10', type: 'percent', value: 10 })
        .expect(200);
      expect(res.body.code).toBe('SPRING10');
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'coupon.create', entityType: 'coupon' }),
        }),
      );

      // citext unique index violation → stable conflict code.
      harness.db.coupon.create.mockRejectedValueOnce({ code: 'P2002' });
      await request(app.getHttpServer())
        .post('/api/v1/admin/coupons')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ code: 'spring10', type: 'percent', value: 15 })
        .expect(409)
        .then((res) => expect(res.body.code).toBe('COUPON_CODE_TAKEN'));
    });

    it('patches lifecycle fields and lists coupons paginated', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .patch('/api/v1/admin/coupons/coupon-1')
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ isActive: false })
        .expect(200);
      expect(res.body.isActive).toBe(false);

      const list = await request(app.getHttpServer())
        .get('/api/v1/admin/coupons?page=1&limit=20')
        .set('Cookie', cookies)
        .expect(200);
      expect(list.body).toEqual({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    });
  });

  describe('customers surface', () => {
    it('lists customers with order counts', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/customers')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.items[0]).toMatchObject({
        id: CUSTOMER.id,
        email: CUSTOMER.email,
        fullName: CUSTOMER.fullName,
        isActive: true,
        orderCount: 2,
      });
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('bans a customer, revoking sessions, and audits it', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/customers/${CUSTOMER.id}/ban`)
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ reason: 'chargeback abuse' })
        .expect(200);

      expect(res.body).toEqual({
        id: CUSTOMER.id,
        email: CUSTOMER.email,
        fullName: CUSTOMER.fullName,
        isActive: false,
      });
      expect(harness.db.session.updateMany).toHaveBeenCalled();
      expect(harness.db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'customer.ban', entityType: 'user' }),
        }),
      );
    });

    it('lets order_manager read customers but NOT ban them', async () => {
      const cookies = await managerCookies();
      await request(app.getHttpServer())
        .get('/api/v1/admin/customers')
        .set('Cookie', cookies)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/customers/${CUSTOMER.id}/ban`)
        .set('Cookie', cookies)
        .set('x-csrf-token', '1')
        .send({ reason: 'not allowed' })
        .expect(403);
    });
  });

  describe('GET /admin/audit-log', () => {
    it('serves the newest-first trail with pagination meta', async () => {
      const cookies = await adminCookies();
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log?page=1&action=order.transition')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(res.body.items[0]).toEqual({
        id: expect.any(String),
        actorUserId: ADMIN.id,
        action: 'order.transition',
        entityType: 'order',
        entityId: 'ord-1',
        diff: { to: 'processing' },
        ip: '127.0.0.1',
        createdAt: '2026-08-23T09:00:00.000Z',
      });
    });

    it('is closed to staff without admins:r', async () => {
      const cookies = await managerCookies();
      await request(app.getHttpServer())
        .get('/api/v1/admin/audit-log')
        .set('Cookie', cookies)
        .expect(403);
    });
  });
});
