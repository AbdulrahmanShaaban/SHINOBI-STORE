import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';

/**
 * §13.1/§20.3 order-placement contract tests through the real HTTP pipeline
 * with the database stubbed as an in-memory relational-ish store. The mock
 * payment provider (no STRIPE_SECRET_KEY) auto-succeeds, driving the full
 * placement → confirmation path. True concurrency races run in CI int-spec
 * against real Postgres.
 */

process.env.NODE_ENV = 'test';

const VARIANT_A = { id: 'aaaaaaaa-1111-4111-8111-111111111111', stock: 10 };
const VARIANT_B = { id: 'bbbbbbbb-2222-4222-8222-222222222222', stock: 2 };

function buildDb() {
  type Variant = { id: string; isActive: boolean; priceCents: number; stockOnHand: number; reserved: number; sku: string; optionSize: string | null; optionColor: null; product: { name: string; status: string } };
  const variants = new Map<string, Variant>();
  const seed = (id: string, stock: number) =>
    variants.set(id, {
      id,
      isActive: true,
      priceCents: 2500,
      stockOnHand: stock,
      reserved: 0,
      sku: `SKU-${id.slice(0, 4)}`,
      optionSize: 'M',
      optionColor: null,
      product: { name: `Product ${id.slice(0, 4)}`, status: 'active' },
    });
  seed(VARIANT_A.id, VARIANT_A.stock);
  seed(VARIANT_B.id, VARIANT_B.stock);

  let orderSeq = 100000;
  const orders = new Map<string, Record<string, unknown>>();
  const payments = new Map<string, Record<string, unknown>>();
  const events: unknown[] = [];

  const db = {
    // --- used inside the interactive tx (passed as the tx manager itself) ---
    productVariant: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        const ids = where.id.in as string[];
        return Promise.resolve(
          ids.map((id) => variants.get(id)).filter((v): v is Variant => !!v),
        );
      }),
    },
    order: {
      create: jest.fn().mockImplementation(({ data }) => {
        const row = { id: randomUUID(), status: 'pending_payment', ...data };
        orders.set(row.idempotencyKey as string, row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const found = [...orders.values()].find((o) => o.id === where.id);
        if (found) Object.assign(found, data);
        return Promise.resolve(found);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found =
          orders.get(where.idempotencyKey ?? '') ||
          [...orders.values()].find((o) => o.id === where.id || o.orderNumber === where.orderNumber);
        if (!found) return Promise.resolve(null);
        return Promise.resolve({
          ...found,
          payments: [...payments.values()].filter((p) => p.orderId === found.id),
        });
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(({ where }) => {
        const found = [...orders.values()].find((o) => o.id === where.id);
        if (!found) return Promise.reject(new Error('not found'));
        return Promise.resolve({
          ...found,
          payments: [...payments.values()].filter((p) => p.orderId === found.id),
        });
      }),
    },
    orderItem: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    orderEvent: { create: jest.fn().mockImplementation(({ data }) => { events.push(data); return Promise.resolve(data); }) },
    coupon: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    couponRedemption: { create: jest.fn().mockResolvedValue({}), count: jest.fn().mockResolvedValue(0) },
    inventoryTransaction: { create: jest.fn().mockResolvedValue({}) },
    $executeRaw: jest.fn().mockImplementation(async () => 1), // reserve succeeds by default
    // order_number_seq via SELECT nextval
    $queryRaw: jest.fn().mockImplementation(async () => [{ n: BigInt(100000 + orders.size + 1) }]),

    // --- non-tx surfaces ---
    payment: {
      create: jest.fn().mockImplementation(({ data }) => {
        const row = { id: randomUUID(), ...data };
        payments.set(data.providerRef as string, row);
        return Promise.resolve(row);
      }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        let count = 0;
        for (const row of payments.values()) {
          if (where.orderId && row.orderId !== where.orderId) continue;
          if (where.status?.notIn && where.status.notIn.includes(row.status)) continue;
          Object.assign(row, data);
          count++;
        }
        return Promise.resolve({ count });
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    webhookEvent: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    cart: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    cartItem: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn(), update: jest.fn() },
  };

  // Interactive transactions execute against the same in-memory db.
  Object.assign(db, {
    $transaction: async (fn: (tx: typeof db) => Promise<unknown>) => fn(db),
  });

  return { db, orders, payments, events };
}

describe('Orders — placement failure matrix (§13.1)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = ''; // force mock provider
    const { db } = buildDb();
    const boom = () => jest.fn().mockRejectedValue(new Error('no redis in contract tests'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(RedisService)
      .useValue({
        client: { get: boom(), set: boom(), del: boom(), incr: boom(), expire: boom() },
        isHealthy: jest.fn().mockResolvedValue(false),
      })
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  function payload(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      lines: [{ variantId: VARIANT_A.id, quantity: 2 }],
      contactEmail: 'guest@konoha.jp',
      shippingAddress: {
        fullName: 'Guest Ninja',
        line1: '1 Hokage Rock',
        city: 'Konoha',
        postalCode: '12345',
        country: 'US',
      },
      idempotencyKey: randomUUID(),
      ...overrides,
    };
  }

  it('places an order, reserves inventory and auto-confirms via the mock provider', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/orders').send(payload()).expect(200);
    expect(res.body.orderNumber).toMatch(/^SS-\d{4}-\d{6}$/);
    expect(res.body.status).toBe('confirmed');
    expect(typeof res.body.totalCents).toBe('number');
  });

  it('rejects empty carts', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send(payload({ lines: [] }))
      .expect(400); // DTO min size
  });

  it('validates address + email shapes', async () => {
    const bad = payload({ contactEmail: 'not-an-email' });
    await request(app.getHttpServer()).post('/api/v1/orders').send(bad).expect(400);

    const badCountry = payload({ shippingAddress: { fullName: 'a', line1: 'b', city: 'c', postalCode: 'd', country: 'USA' } });
    await request(app.getHttpServer()).post('/api/v1/orders').send(badCountry).expect(400);
  });

  it('requires an idempotency key', async () => {
    const noKey = payload();
    delete (noKey as Record<string, unknown>).idempotencyKey;
    await request(app.getHttpServer()).post('/api/v1/orders').send(noKey).expect(400);
  });

  it('unknown variant → conflict naming availability', async () => {
    const ghost = payload({ lines: [{ variantId: 'cccccccc-3333-4333-8333-333333333333', quantity: 1 }] });
    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send(ghost)
      .expect(409)
      .then((res) => expect(res.body.code).toBe('VARIANT_UNAVAILABLE'));
  });

  it('order detail is reachable by order-number possession (guest capability)', async () => {
    const placed = await request(app.getHttpServer()).post('/api/v1/orders').send(payload()).expect(200);
    await request(app.getHttpServer()).get(`/api/v1/orders/${placed.body.orderNumber}`).expect(200);
  });

  it('status polling reflects DB truth', async () => {
    const placed = await request(app.getHttpServer()).post('/api/v1/orders').send(payload()).expect(200);
    const res = await request(app.getHttpServer()).get(`/api/v1/orders/status/${placed.body.orderNumber}`).expect(200);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.paymentStatus).toBe('succeeded');
  });
});
