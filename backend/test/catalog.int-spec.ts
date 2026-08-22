import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Integration tests against a LIVE database (runs in CI after
 * `prisma migrate deploy` + seed). Verifies data correctness end-to-end:
 * visibility rules, the filter matrix, trigger-maintained columns and
 * computed fields — none of which the db-stubbed contract suite can cover.
 *
 * Requires DATABASE_URL (and Redis) to be reachable. Locally without Docker
 * these tests self-skip with a warning instead of failing confusingly.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const prisma = new PrismaClient();

// Seed anchors (prisma/seed.ts) — deliberate hardcodes that catch drift.
const ACTIVE_TOTAL = 21;
const DRAFT_SLUGS = ['kurama-mode-figure', 'pain-gods-cape-poster'];
const ARCHIVED_SLUGS = ['hidden-leaf-lanyard'];
const INVISIBLE_SLUGS = [...DRAFT_SLUGS, ...ARCHIVED_SLUGS];
const CATEGORY_COUNTS: Record<string, number> = {
  apparel: 12,
  accessories: 2,
  figures: 3,
  posters: 4,
};
const ANIME_COUNTS: Record<string, number> = {
  naruto: 7,
  'naruto-shippuden': 14,
};

describe('Catalog API against live Postgres', () => {
  let app: NestExpressApplication;
  let dbUp = false;

  beforeAll(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbUp = true;
    } catch {
      console.warn('[catalog.int] Database unreachable — skipping integration suite.');
      return;
    }

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect().catch(() => undefined);
  });

  const itDb = (name: string, fn: () => Promise<void>): jest.ProvidesCallback => {
    return async function (this: jest.Context) {
      if (!dbUp) return this.skip();
      await fn.call(this);
    } as unknown as jest.ProvidesCallback;
  };

  describe('GET /api/v1/products', () => {
    it(
      'serves exactly the seeded active products',
      itDb(async () => {
        const res = await request(app.getHttpServer()).get('/api/v1/products?limit=50').expect(200);
        expect(res.body.meta.total).toBe(ACTIVE_TOTAL);
        const slugs: string[] = res.body.items.map((i: { slug: string }) => i.slug);
        for (const slug of INVISIBLE_SLUGS) expect(slugs).not.toContain(slug);
        expect(slugs).toContain('naruto-rasengan-hoodie');
      }),
    );

    it(
      'applies the category filter matrix',
      itDb(async () => {
        for (const [category, expected] of Object.entries(CATEGORY_COUNTS)) {
          const res = await request(app.getHttpServer())
            .get(`/api/v1/products?category=${category}&limit=50`)
            .expect(200);
          expect(res.body.meta.total).toBe(expected);
        }
      }),
    );

    it(
      'applies anime, character and tag filters',
      itDb(async () => {
        for (const [anime, expected] of Object.entries(ANIME_COUNTS)) {
          const res = await request(app.getHttpServer())
            .get(`/api/v1/products?anime=${anime}&limit=50`)
            .expect(200);
          expect(res.body.meta.total).toBe(expected);
        }
        const uchiha = await request(app.getHttpServer())
          .get('/api/v1/products?tag=uchiha&limit=50')
          .expect(200);
        expect(uchiha.body.meta.total).toBeGreaterThan(0);
        const sasuke = await request(app.getHttpServer())
          .get('/api/v1/products?character=sasuke&limit=50')
          .expect(200);
        expect(sasuke.body.meta.total).toBeGreaterThanOrEqual(3);
      }),
    );

    it(
      'sorts by trigger-maintained price floor monotonically',
      itDb(async () => {
        const asc = await request(app.getHttpServer())
          .get('/api/v1/products?sort=price_asc&limit=50')
          .expect(200);
        const pricesAsc: (number | null)[] = asc.body.items.map((i: { priceFromCents: number | null }) => i.priceFromCents);
        const defined = pricesAsc.filter((p): p is number => p !== null);
        for (let i = 1; i < defined.length; i++) {
          expect(defined[i]).toBeGreaterThanOrEqual(defined[i - 1]);
        }

        const desc = await request(app.getHttpServer())
          .get('/api/v1/products?sort=price_desc&limit=50')
          .expect(200);
        const pricesDesc: number[] = desc.body.items.map((i: { priceFromCents: number }) => i.priceFromCents);
        for (let i = 1; i < pricesDesc.length; i++) {
          expect(pricesDesc[i]).toBeLessThanOrEqual(pricesDesc[i - 1]);
        }
        expect(desc.body.items[0].slug).toBe('itachi-mangekyou-figure');
      }),
    );

    it(
      'paginates deterministically across pages',
      itDb(async () => {
        const page1 = await request(app.getHttpServer()).get('/api/v1/products?page=1&limit=10&sort=newest').expect(200);
        const page2 = await request(app.getHttpServer()).get('/api/v1/products?page=2&limit=10&sort=newest').expect(200);
        expect(page1.body.items).toHaveLength(10);
        expect(page1.body.meta.totalPages).toBe(3);
        const seen = new Set([...page1.body.items, ...page2.body.items].map((i: { id: string }) => i.id));
        expect(seen.size).toBe(20);
      }),
    );

    it(
      'matches full-text and tag-weighted terms while never surfacing invisible products',
      itDb(async () => {
        const rasengan = await request(app.getHttpServer())
          .get('/api/v1/products?search=rasengan&limit=50')
          .expect(200);
        expect(rasengan.body.meta.total).toBeGreaterThanOrEqual(1);
        expect(rasengan.body.items[0].slug).toBe('naruto-rasengan-hoodie');

        // 'akatsuki' lives in tags/anime names, not the keycap's own text.
        const akatsuki = await request(app.getHttpServer())
          .get('/api/v1/products?search=akatsuki&limit=50')
          .expect(200);
        const slugs: string[] = akatsuki.body.items.map((i: { slug: string }) => i.slug);
        expect(slugs.length).toBeGreaterThan(0);
        for (const slug of INVISIBLE_SLUGS) {
          expect(slugs).not.toContain(slug);
          const forced = await request(app.getHttpServer())
            .get(`/api/v1/products?search=${slug.replace(/-/g, '+')}`)
            .expect(200);
          expect(forced.body.meta.total).toBe(0);
        }
      }),
    );

    it(
      'survives typos via the trigram fallback',
      itDb(async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/products?search=rasengen')
          .expect(200);
        expect(res.body.items.map((i: { slug: string }) => i.slug)).toContain('naruto-rasengan-hoodie');
      }),
    );
  });

  describe('GET /api/v1/products/facets', () => {
    it(
      'counts each dimension excluding its own filter but keeping the others',
      itDb(async () => {
        const facets = await request(app.getHttpServer())
          .get('/api/v1/products/facets?category=apparel')
          .expect(200);

        // Own dimension is NOT zeroed by its own filter…
        const apparel = facets.body.categories.find((c: { slug: string }) => c.slug === 'apparel');
        expect(apparel.count).toBe(CATEGORY_COUNTS.apparel);
        // …and other dimensions stay selectable with positive counts.
        expect(facets.body.animes.every((a: { count: number }) => a.count > 0)).toBe(true);
        expect(facets.body.animes.reduce((sum: number, a: { count: number }) => sum + a.count, 0)).toBeLessThanOrEqual(
          CATEGORY_COUNTS.apparel,
        );

        const unfiltered = await request(app.getHttpServer()).get('/api/v1/products/facets').expect(200);
        const apparelAll = unfiltered.body.categories.find((c: { slug: string }) => c.slug === 'apparel');
        expect(apparelAll.count).toBe(CATEGORY_COUNTS.apparel);
      }),
    );

    it(
      'scopes facet counts to the current search term',
      itDb(async () => {
        const facets = await request(app.getHttpServer())
          .get('/api/v1/products/facets?search=rasengan')
          .expect(200);

        const hoodieTag = facets.body.tags.find((t: { slug: string }) => t.slug === 'hoodie');
        expect(hoodieTag).toBeDefined();
        expect(hoodieTag.count).toBeGreaterThanOrEqual(1);
        const totalMatches = facets.body.categories.reduce(
          (sum: number, c: { count: number }) => sum + c.count,
          0,
        );
        expect(totalMatches).toBeLessThan(ACTIVE_TOTAL);
      }),
    );
  });

  describe('GET /api/v1/products/:slug', () => {
    it(
      'hides draft and archived products behind 404s',
      itDb(async () => {
        for (const slug of INVISIBLE_SLUGS) {
          const res = await request(app.getHttpServer()).get(`/api/v1/products/${slug}`).expect(404);
          expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
        }
      }),
    );

    it(
      'computes availability from stock minus reserved on the seeded hoodie',
      itDb(async () => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/products/naruto-rasengan-hoodie')
          .expect(200);
        const large = res.body.variants.find((v: { optionSize: string | null }) => v.optionSize === 'L');
        // Seeded: stockOnHand 35, reserved 3 → available 32.
        expect(large.available).toBe(32);
        expect(large).not.toHaveProperty('stockOnHand');
        expect(res.body.category.slug).toBe('apparel');
        expect(res.body.anime.slug).toBe('naruto-shippuden');
        expect(res.body.tagSlugs.map((t: { slug: string }) => t.slug)).toContain('hoodie');
      }),
    );
  });

  describe('database-maintained columns', () => {
    it(
      'populates price_from_cents via the variant sync trigger',
      itDb(async () => {
        const rows = await prisma.$queryRaw<{ price_from_cents: number | null; min_active: number | null }[]>`
          SELECT p."price_from_cents",
                 (SELECT MIN(v."price_cents") FROM "product_variants" v
                  WHERE v."product_id" = p."id" AND v."is_active") AS min_active
          FROM "products" p WHERE p."slug" = 'naruto-rasengan-hoodie'`;
        expect(rows[0].min_active).not.toBeNull();
        expect(Number(rows[0].price_from_cents)).toBe(Number(rows[0].min_active));
      }),
    );

    it(
      'maintains the tsvector search column including taxonomy names',
      itDb(async () => {
        const rows = await prisma.$queryRaw<{ hits: number }[]>`
          SELECT COUNT(*)::int AS hits FROM "products"
          WHERE "search" @@ to_tsquery('english', 'rasengan') AND "slug" = 'naruto-rasengan-hoodie'`;
        expect(rows[0].hits).toBe(1);

        const tagWeighted = await prisma.$queryRaw<{ hits: number }[]>`
          SELECT COUNT(*)::int AS hits FROM "products"
          WHERE "search" @@ to_tsquery('english', 'akatsuki') AND "slug" = 'akatsuki-cloud-keycap'`;
        // 'akatsuki' comes from a TAG, proving the B-weight join works.
        expect(tagWeighted[0].hits).toBe(1);
      }),
    );

    it(
      'refreshes price_from_cents when variants change',
      itDb(async () => {
        const product = await prisma.product.findUnique({
          where: { slug: 'sharingan-deskmat' },
          select: { id: true },
        });
        const variant = await prisma.productVariant.findFirstOrThrow({
          where: { productId: product!.id },
          select: { id: true, priceCents: true },
        });

        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { priceCents: variant.priceCents + 1000 },
        });
        try {
          const refreshed = await prisma.product.findUniqueOrThrow({
            where: { slug: 'sharingan-deskmat' },
            select: { priceFromCents: true },
          });
          expect(refreshed.priceFromCents).toBe(variant.priceCents + 1000);
        } finally {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { priceCents: variant.priceCents },
          });
        }
      }),
    );
  });

  describe('GET /api/v1/taxonomies/*', () => {
    it(
      'lists taxonomies with consistent counts',
      itDb(async () => {
        const cats = await request(app.getHttpServer()).get('/api/v1/taxonomies/categories').expect(200);
        expect(cats.body).toHaveLength(Object.keys(CATEGORY_COUNTS).length);
        const apparel = cats.body.find((c: { slug: string }) => c.slug === 'apparel');
        expect(apparel.productCount).toBe(CATEGORY_COUNTS.apparel);

        const animes = await request(app.getHttpServer()).get('/api/v1/taxonomies/animes').expect(200);
        expect(animes.body).toHaveLength(2);
      }),
    );
  });
});
