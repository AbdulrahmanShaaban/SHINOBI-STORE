import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppConfigModule } from '../src/common/config/app-config.module';
import { PrismaModule } from '../src/common/prisma/prisma.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { configureApp } from '../src/app.setup';
import { CatalogModule } from '../src/modules/catalog/catalog.module';

/**
 * Catalog CONTRACT tests through the real HTTP pipeline (validation, guards,
 * filters, error contract) with the database stubbed out. Data-correctness
 * against a live Postgres is covered by test/catalog.int-spec.ts in CI.
 */

const productRow = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'naruto-rasengan-figure',
  name: 'Rasengan Training Hoodie',
  featured: true,
  ratingAvg: Number('4.80'),
  reviewCount: 214,
  priceFromCents: 6900,
  images: [{ url: '/naruto-rasengan.png', altText: 'Naruto forming a Rasengan' }],
};

const detailRow = {
  ...productRow,
  description: 'Heavyweight fleece hoodie.',
  category: { slug: 'apparel', name: 'Apparel' },
  anime: { slug: 'naruto-shippuden', name: 'Naruto Shippuden' },
  character: { slug: 'naruto', name: 'Naruto Uzumaki' },
  tags: [{ tag: { slug: 'hoodie', name: 'Hoodie' } }],
  variants: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      sku: 'SS_TEST_M',
      optionSize: 'M',
      optionColor: null,
      priceCents: 6900,
      compareAtPriceCents: 8900,
      stockOnHand: 40,
      reserved: 5,
    },
  ],
};

function stubPrisma() {
  // Interactive-transaction view (TaxonomiesService): tx.category/tx.product/tx.anime…
  const tx = {
    category: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', slug: 'apparel', name: 'Apparel', parentId: null }]) },
    anime: { findMany: jest.fn().mockResolvedValue([]) },
    product: {
      groupBy: jest.fn().mockImplementation(({ by }: { by: string[] }) =>
        Promise.resolve(by.includes('animeId') ? [] : [{ categoryId: 'c1', _count: { _all: 3 } }]),
      ),
    },
  };
  // Facet calls carry a _count select; taxonomy calls do not.
  const facetRow = { slug: 'apparel', name: 'Apparel', _count: { products: 3 } };
  const categoryFindMany = jest.fn().mockImplementation((args?: { select?: { _count?: unknown } }) =>
    Promise.resolve(args?.select?._count ? [facetRow] : [{ id: 'c1', slug: 'apparel', name: 'Apparel', parentId: null }]),
  );
  return {
    $transaction: jest.fn().mockImplementation((arg: unknown) => {
      if (typeof arg === 'function') return arg(tx);
      return Promise.all(arg as Promise<unknown>[]);
    }),
    $queryRaw: jest.fn().mockResolvedValue([{ id: productRow.id }]),
    product: {
      findMany: jest.fn().mockResolvedValue([productRow]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockImplementation(({ where }: { where: { slug: string; status: string } }) =>
        Promise.resolve(
          where.slug === 'naruto-rasengan-figure' && where.status === 'active' ? detailRow : null,
        ),
      ),
    },
    anime: { findMany: jest.fn().mockResolvedValue([]) },
    character: { findMany: jest.fn().mockResolvedValue([]) },
    tag: { findMany: jest.fn().mockResolvedValue([]) },
    category: { findMany: categoryFindMany },
    productVariant: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          isActive: true,
          priceCents: 6900,
          compareAtPriceCents: 8900,
          stockOnHand: 40,
          reserved: 5,
          product: { slug: 'naruto-rasengan-figure' },
        },
      ]),
    },
  };
}

describe('Catalog API contracts (e2e, db-stubbed)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, CatalogModule],
    })
      .overrideProvider(PrismaService)
      .useValue(stubPrisma())
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    await configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/products', () => {
    it('returns the paginated envelope with mapped list items', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);

      expect(res.body.meta).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
      expect(res.body.items[0]).toMatchObject({
        slug: 'naruto-rasengan-figure',
        priceFromCents: 6900,
        primaryImageUrl: '/naruto-rasengan.png',
      });
      expect(res.body.items[0]).not.toHaveProperty('description');
    });

    it('rejects non-whitelisted sorts with the stable validation code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?sort=DROP_TABLE_products')
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(typeof res.body.requestId).toBe('string');
    });

    it('rejects out-of-bounds pagination', async () => {
      await request(app.getHttpServer()).get('/api/v1/products?limit=500').expect(400);
      await request(app.getHttpServer()).get('/api/v1/products?page=0').expect(400);
    });

    it('accepts the §18 search param and routes it through FTS candidate resolution', async () => {
      const prisma = app.get(PrismaService) as unknown as { $queryRaw: jest.Mock };
      const res = await request(app.getHttpServer())
        .get('/api/v1/products?search=rasengan&sort=relevance')
        .expect(200);

      expect(res.body.meta).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      // The FTS path is used (not an ILIKE fallback), and the search term can
      // only travel as a bind value of the Prisma.Sql object — its static
      // text carries placeholders, never interpolated input.
      const [rawSql] = prisma.$queryRaw.mock.calls[0] as unknown as [{ sql: string }];
      expect(rawSql.sql).toContain('websearch_to_tsquery');
    });

    it('rejects oversized search terms', async () => {
      await request(app.getHttpServer()).get(`/api/v1/products?search=${'x'.repeat(101)}`).expect(400);
    });
  });

  describe('GET /api/v1/products/facets', () => {
    // Route ordering contract: "facets" must never be captured by :slug.
    it('returns all four facet dimensions with mapped counts and no internal ids', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products/facets').expect(200);

      for (const key of ['categories', 'animes', 'characters', 'tags']) {
        expect(Array.isArray(res.body[key])).toBe(true);
      }
      expect(res.body.categories[0]).toEqual({ slug: 'apparel', name: 'Apparel', count: 3 });
      expect(res.body.categories[0]).not.toHaveProperty('id');
    });
  });

  describe('POST /api/v1/products/availability', () => {
    it('returns computed availability without leaking stock internals', async () => {
      const prisma = app.get(PrismaService) as unknown as {
        productVariant: { findMany: jest.Mock };
      };
      prisma.productVariant.findMany.mockResolvedValue([
        {
          id: '11111111-1111-4111-8111-111111111111',
          isActive: true,
          priceCents: 6900,
          compareAtPriceCents: 8900,
          stockOnHand: 40,
          reserved: 5,
          product: { slug: 'naruto-rasengan-figure' },
        },
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/products/availability')
        .send({ variantIds: ['11111111-1111-4111-8111-111111111111'] })
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        variantId: '11111111-1111-4111-8111-111111111111',
        available: 35,
        priceCents: 6900,
        productSlug: 'naruto-rasengan-figure',
      });
      expect(res.body[0]).not.toHaveProperty('stockOnHand');
      expect(res.body[0]).not.toHaveProperty('reserved');
    });

    it('validates batch shape and uuid format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/products/availability')
        .send({ variantIds: [] })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/products/availability')
        .send({ variantIds: ['not-a-uuid'] })
        .expect(400);
      const ids = Array.from({ length: 51 }, () => '11111111-1111-4111-8111-111111111111');
      await request(app.getHttpServer())
        .post('/api/v1/products/availability')
        .send({ variantIds: ids })
        .expect(400);
    });
  });

  describe('GET /api/v1/products/:slug', () => {
    it('serves active products with computed availability only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/products/naruto-rasengan-figure')
        .expect(200);

      expect(res.body.variants[0]).toMatchObject({
        sku: 'SS_TEST_M',
        priceCents: 6900,
        available: 35,
      });
      expect(res.body.variants[0]).not.toHaveProperty('stockOnHand');
      expect(res.body.variants[0]).not.toHaveProperty('reserved');
    });

    it('answers 404 with the stable error contract for unknown slugs', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products/does-not-exist').expect(404);

      expect(res.body.code).toBe('PRODUCT_NOT_FOUND');
      expect(res.body.statusCode).toBe(404);
      expect(typeof res.body.requestId).toBe('string');
    });
  });

  describe('GET /api/v1/taxonomies/*', () => {
    it('exposes taxonomy lists without leaking internal ids', async () => {
      const cats = await request(app.getHttpServer()).get('/api/v1/taxonomies/categories').expect(200);
      expect(cats.body[0]).toMatchObject({ slug: 'apparel', productCount: 3 });
      expect(cats.body[0]).not.toHaveProperty('id');
      await request(app.getHttpServer()).get('/api/v1/taxonomies/animes').expect(200);
      await request(app.getHttpServer()).get('/api/v1/taxonomies/characters').expect(200);
      await request(app.getHttpServer()).get('/api/v1/taxonomies/tags').expect(200);
    });
  });

  describe('Admin surface', () => {
    it('rejects unauthenticated admin mutations with the stable auth code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/products')
        .send({ name: 'x' })
        .expect(401);

      expect(res.body.code).toBe('UNAUTHENTICATED');
    });
  });
});
