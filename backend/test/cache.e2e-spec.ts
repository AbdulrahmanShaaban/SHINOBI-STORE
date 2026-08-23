import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppConfigModule } from '../src/common/config/app-config.module';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RedisService } from '../src/common/redis/redis.service';
import { AuditModule } from '../src/modules/audit/audit.module';
import { configureApp } from '../src/app.setup';
import { CatalogModule } from '../src/modules/catalog/catalog.module';
import { ContentModule } from '../src/modules/content/content.module';

/**
 * §16.1 cache rollout — ROUTE-LEVEL SMOKE through the real HTTP pipeline.
 *
 * The database is stubbed and Redis is replaced with a STATEFUL stub
 * (get/set/del/incr over Maps, never rejecting) so read-through behaviour is
 * deterministic without a live redis. Producer engagement is asserted by call
 * counts on the prisma delegates. Deep unit coverage of CacheService lives in
 * src/modules/cache/cache.service.spec.ts; chaos/degrade cases are covered
 * there and by every other contract suite's rejecting redis stubs.
 */

process.env.NODE_ENV = 'test';

// Unique per run so a live local redis (used by catalog.e2e-spec, which does
// not override RedisService) can never shadow these keys across suites.
const SLUG = `cache-smoke-${randomUUID()}`;

const PRODUCT_DETAIL = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: SLUG,
  name: 'Cache Smoke Hoodie',
  description: 'Read-through fixture',
  featured: true,
  ratingAvg: 4.5,
  reviewCount: 12,
  category: { slug: 'apparel', name: 'Apparel' },
  anime: null,
  character: null,
  tags: [],
  variants: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      sku: 'SMOKE_M',
      optionSize: 'M',
      optionColor: null,
      priceCents: 6900,
      compareAtPriceCents: null,
      stockOnHand: 10,
      reserved: 3,
    },
  ],
  images: [{ id: 'i1', url: '/smoke.png', altText: 'smoke' }],
};

const SECTIONS = [
  { key: 'hero', isVisible: true, sortOrder: 10, config: { title: 'Smoke hero' } },
  { key: 'banner', isVisible: true, sortOrder: 20, config: { title: 'Smoke banner' } },
];

function statefulRedisStub() {
  const store = new Map<string, string>();
  const expiresAt = new Map<string, number>();
  const alive = (key: string) => {
    const exp = expiresAt.get(key);
    if (exp !== undefined && exp <= Date.now()) {
      store.delete(key);
      expiresAt.delete(key);
    }
    return store.has(key);
  };
  return {
    client: {
      get: jest.fn().mockImplementation(async (key: string) => (alive(key) ? store.get(key)! : null)),
      set: jest.fn().mockImplementation(async (key: string, value: string, mode?: string, ttl?: number) => {
        store.set(key, value);
        if (mode === 'EX' && typeof ttl === 'number') expiresAt.set(key, Date.now() + ttl * 1000);
        else expiresAt.delete(key);
        return 'OK';
      }),
      del: jest.fn().mockImplementation(async (...keys: string[]) => {
        let removed = 0;
        for (const key of keys) if (store.delete(key)) removed += 1;
        return removed;
      }),
      incr: jest.fn().mockImplementation(async (key: string) => {
        const next = Number(store.get(key) ?? '0') + 1;
        store.set(key, String(next));
        return next;
      }),
      expire: jest.fn().mockResolvedValue(1),
    },
    isHealthy: jest.fn().mockResolvedValue(true),
    store,
  };
}

function buildDb() {
  return {
    homepageSection: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve(SECTIONS.map((s) => ({ ...s })))),
    },
    product: {
      findFirst: jest.fn().mockImplementation(({ where }: { where: { slug: string; status: string } }) =>
        Promise.resolve(
          where.slug === SLUG && where.status === 'active' ? { ...PRODUCT_DETAIL } : null,
        ),
      ),
    },
    // Facet calls carry a _count select; taxonomy reads do not — counting only
    // facet-shaped calls keeps the probe immune to other surfaces.
    category: { findMany: jest.fn().mockResolvedValue([]) },
    anime: { findMany: jest.fn().mockResolvedValue([]) },
    character: { findMany: jest.fn().mockResolvedValue([]) },
    tag: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
}

describe('Cache rollout (e2e, db-stubbed + stateful redis)', () => {
  let app: NestExpressApplication;
  let db: ReturnType<typeof buildDb>;
  let redis: ReturnType<typeof statefulRedisStub>;

  /** Facet-shaped category.findMany invocations = how often the facet producer ran. */
  const facetProducerCalls = () =>
    db.category.findMany.mock.calls.filter(
      (args) => (args[0] as { select?: { _count?: unknown } } | undefined)?.select?._count,
    ).length;

  beforeAll(async () => {
    db = buildDb();
    redis = statefulRedisStub();

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, AuditModule, CatalogModule, ContentModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(RedisService)
      .useValue(redis)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /products/:slug — read-through detail page', () => {
    it('invokes the producer once for repeated requests and serves identical payloads', async () => {
      const first = await request(app.getHttpServer()).get(`/api/v1/products/${SLUG}`).expect(200);
      const second = await request(app.getHttpServer()).get(`/api/v1/products/${SLUG}`).expect(200);

      expect(first.body).toMatchObject({ slug: SLUG, name: 'Cache Smoke Hoodie' });
      expect(second.body).toEqual(first.body);
      expect(second.body.variants[0].available).toBe(7);
      expect(db.product.findFirst).toHaveBeenCalledTimes(1);
    });

    it('re-invokes the producer after a targeted del of the product key', async () => {
      expect(await redis.client.del(`catalog:product:${SLUG}`)).toBe(1);

      await request(app.getHttpServer()).get(`/api/v1/products/${SLUG}`).expect(200);

      expect(db.product.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('GET /products/facets — single-key caching for unfiltered requests', () => {
    it('caches the unfiltered facet payload behind one producer run', async () => {
      await request(app.getHttpServer()).get('/api/v1/products/facets').expect(200);
      await request(app.getHttpServer()).get('/api/v1/products/facets').expect(200);

      expect(facetProducerCalls()).toBe(1);
    });
  });

  describe('GET /content/homepage — versioned read-through', () => {
    it('caches the homepage payload and reflects an INCR version bump immediately', async () => {
      const first = await request(app.getHttpServer()).get('/api/v1/content/homepage').expect(200);
      const second = await request(app.getHttpServer()).get('/api/v1/content/homepage').expect(200);
      expect(db.homepageSection.findMany).toHaveBeenCalledTimes(1);

      // Simulate the admin content mutation path at the redis boundary:
      // AdminContentService.update() issues exactly this INCR (stub INCR).
      expect(await redis.client.incr('content:home:ver')).toBe(1);

      const third = await request(app.getHttpServer()).get('/api/v1/content/homepage').expect(200);
      expect(third.body).toEqual(first.body);
      expect(second.body.map((s: { key: string }) => s.key)).toEqual(['hero', 'banner']);
      expect(db.homepageSection.findMany).toHaveBeenCalledTimes(2);
      expect(third.headers['cache-control']).toContain('public');
    });
  });

  describe('GET /metrics/cache — dev/ops surface', () => {
    it('reports per-prefix hit/miss/ratio counters accumulated by the traffic above', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/metrics/cache').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const byPrefix = Object.fromEntries(res.body.map((row: { prefix: string }) => [row.prefix, row]));

      // 2 misses (cold, post-invalidation) + 1 hit from the detail-page flow.
      expect(byPrefix['catalog:product']).toMatchObject({ hits: 1, misses: 2 });
      // Unfiltered facets: 1 miss then 1 hit.
      expect(byPrefix['catalog:facets']).toMatchObject({ hits: 1, misses: 1 });
      // Homepage: miss+hit, then miss after the version bump.
      expect(byPrefix['content:home']).toMatchObject({ hits: 1, misses: 2 });
      // No featured-list traffic yet in this suite.
      expect(byPrefix['catalog:featured']).toMatchObject({ hits: 0, misses: 0, ratio: 0 });

      for (const row of res.body) {
        expect(typeof row.hits).toBe('number');
        expect(typeof row.misses).toBe('number');
        expect(row.ratio).toBeGreaterThanOrEqual(0);
        expect(row.ratio).toBeLessThanOrEqual(1);
      }
    });
  });
});
