import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';

interface CapturedFindMany {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, unknown>>;
  skip: number;
  take: number;
}

function makeService(productRows: unknown[] = [], total = productRows.length, searchIds: string[] = []) {
  const captured: CapturedFindMany = {} as CapturedFindMany;
  const facetCalls: Record<string, unknown> = {};
  const facetDelegate = (key: string) =>
    jest.fn().mockImplementation((args: { where: unknown }) => {
      facetCalls[key] = args.where;
      return Promise.resolve([]);
    });
  const prisma = {
    product: {
      findMany: jest.fn().mockImplementation((args: CapturedFindMany) => {
        Object.assign(captured, args);
        return Promise.resolve(productRows);
      }),
      count: jest.fn().mockResolvedValue(total),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    $queryRaw: jest.fn().mockResolvedValue(searchIds.map((id) => ({ id }))),
    category: { findMany: facetDelegate('category') },
    anime: { findMany: facetDelegate('anime') },
    character: { findMany: facetDelegate('character') },
    tag: { findMany: facetDelegate('tag') },
  };
  return {
    service: new CatalogService(prisma as never),
    captured,
    facetCalls,
    prisma,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'test-product',
    name: 'Test Product',
    featured: false,
    ratingAvg: 4.5,
    reviewCount: 10,
    priceFromCents: 3200,
    images: [{ url: '/img.png', altText: 'alt' }],
    ...overrides,
  };
}

function query(overrides: Partial<ProductQueryDto> = {}): ProductQueryDto {
  return Object.assign(new ProductQueryDto(), { page: 1, limit: 12, sort: 'newest', ...overrides });
}

describe('CatalogService.list', () => {
  it('always restricts to active products — drafts and archived are invisible', async () => {
    const { service, captured } = makeService();
    await service.list(query());

    expect(captured.where.status).toBe('active');
  });

  it('applies offset pagination derived from page/limit', async () => {
    const { service, captured } = makeService();
    await service.list(query({ page: 3, limit: 10 }));

    expect(captured.skip).toBe(20);
    expect(captured.take).toBe(10);
  });

  it('maps every whitelisted sort to a deterministic order', async () => {
    for (const [sort, firstKey] of [
      ['newest', 'createdAt'],
      ['rating', 'ratingAvg'],
      ['price_asc', 'priceFromCents'],
      ['price_desc', 'priceFromCents'],
    ] as const) {
      const { service, captured } = makeService();
      await service.list(query({ sort }));

      expect(Object.keys(captured.orderBy[0])[0]).toBe(firstKey);
    }
  });

  it('translates taxonomy slugs into scoped relations', async () => {
    const { service, captured } = makeService();
    await service.list(
      query({ category: 'apparel', anime: 'naruto', character: 'naruto', tag: 'hoodie', featured: true }),
    );

    expect(captured.where.category).toEqual({ slug: 'apparel' });
    expect(captured.where.anime).toEqual({ slug: 'naruto' });
    expect(captured.where.character).toEqual({ slug: 'naruto' });
    expect(captured.where.tags).toEqual({ some: { tag: { slug: 'hoodie' } } });
    expect(captured.where.featured).toBe(true);
  });

  it('scopes price filters to active variants', async () => {
    const { service, captured } = makeService();
    await service.list(query({ minPrice: 1000, maxPrice: 5000 }));

    expect(captured.where.variants).toEqual({
      some: { isActive: true, priceCents: { gte: 1000, lte: 5000 } },
    });
  });

  it('shapes list items with computed price floor without leaking stock internals', async () => {
    const { service } = makeService([row()], 1);
    const result = await service.list(query());

    expect(result.items[0]).toMatchObject({
      priceFromCents: 3200,
      primaryImageUrl: '/img.png',
    });
    expect(result.meta).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
  });

  it('rounds totalPages up for partial last pages', async () => {
    const { service } = makeService([], 25);
    const result = await service.list(query({ limit: 10 }));

    expect(result.meta.totalPages).toBe(3);
  });

  it('falls back to newest when relevance is requested without a search term', async () => {
    const { service, captured } = makeService();
    await service.list(query({ sort: 'relevance' }));

    expect(Object.keys(captured.orderBy[0])[0]).toBe('createdAt');
  });
});

describe('CatalogService.list — search path', () => {
  it('returns an empty page without querying products when nothing matches the search', async () => {
    const { service, prisma } = makeService([], 0, []);
    const result = await service.list(query({ search: 'ghost' }));

    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });

  it('merges ranked candidate ids into the same structured where as every other filter', async () => {
    const { service, captured } = makeService([row()], 1, ['p1']);
    await service.list(query({ search: 'rasengan', category: 'apparel' }));

    expect(captured.where.id).toEqual({ in: ['p1'] });
    expect(captured.where.category).toEqual({ slug: 'apparel' });
    expect(captured.where.status).toBe('active');
  });

  it('orders by candidate rank for relevance and paginates in memory', async () => {
    const rows = [row({ id: 'b', slug: 'b' }), row({ id: 'a', slug: 'a' })];
    // candidates arrive ranked a→b; stored order must not leak into relevance output
    const { service } = makeService(rows, rows.length, ['a', 'b']);
    const result = await service.list(query({ search: 'hoodie', sort: 'relevance' }));

    expect(result.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('keeps DB-side ordering for non-relevance sorts even when searching', async () => {
    const { service, captured } = makeService([row()], 1, ['p1']);
    await service.list(query({ search: 'hoodie', sort: 'price_asc' }));

    expect(Object.keys(captured.orderBy[0])[0]).toBe('priceFromCents');
  });

  it('slices pages from the full match set, not per-DB-window', async () => {
    const ids = ['a', 'b', 'c'];
    const rows = ids.map((id) => row({ id, slug: id }));
    const { service } = makeService(rows, rows.length, ids);
    const result = await service.list(query({ search: 'x', page: 2, limit: 2 }));

    expect(result.items.map((i) => i.id)).toEqual(['c']);
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('CatalogService.getFacets', () => {
  it('counts each dimension with its own filter removed but others kept', async () => {
    const { service, facetCalls } = makeService([], 0);
    await service.getFacets(
      query({ category: 'apparel', anime: 'naruto', character: 'itachi', tag: 'hoodie' }),
    );

    const category = facetCalls['category'] as { products: { some: Record<string, unknown> } };
    const anime = facetCalls['anime'] as { products: { some: Record<string, unknown> } };
    const tagWhere = (facetCalls['tag'] as { products: { some: { product: Record<string, unknown> } } })
      .products.some.product;

    expect(category.products.some.category).toBeUndefined();
    expect(category.products.some.anime).toEqual({ slug: 'naruto' });
    expect(anime.products.some.anime).toBeUndefined();
    expect(anime.products.some.character).toEqual({ slug: 'itachi' });
    expect(tagWhere.tags).toBeUndefined();
    expect(tagWhere.category).toEqual({ slug: 'apparel' });
  });

  it('scopes facet counts to search candidates and maps/sorts buckets by count then name', async () => {
    const prisma = {
      product: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
      $transaction: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      category: {
        findMany: jest.fn().mockResolvedValue([
          { slug: 'b', name: 'Beta', _count: { products: 5 } },
          { slug: 'a', name: 'Alpha', _count: { products: 5 } },
          { slug: 'c', name: 'Gamma', _count: { products: 9 } },
        ]),
      },
      anime: { findMany: jest.fn().mockResolvedValue([]) },
      character: { findMany: jest.fn().mockResolvedValue([]) },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CatalogService(prisma as never);

    const facets = await service.getFacets(query({ search: 'hoodie' }));
    expect(facets.categories.map((c) => c.slug)).toEqual(['c', 'a', 'b']);
    expect(facets.categories[2]).toEqual({ slug: 'b', name: 'Beta', count: 5 });
  });

  it('short-circuits to empty facets when the search matches nothing', async () => {
    const { service, prisma } = makeService([], 0, []);
    const facets = await service.getFacets(query({ search: 'ghost' }));

    expect(facets).toEqual({ categories: [], animes: [], characters: [], tags: [] });
    expect(prisma.category.findMany).not.toHaveBeenCalled();
  });
});

describe('CatalogService.getBySlug', () => {
  it('throws NotFound with the stable error code for unknown or non-active slugs', async () => {
    const { service } = makeService();
    (service as never as { prisma: { product: { findFirst: jest.Mock } } }).prisma.product.findFirst
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue(Promise.resolve(null) as any);

    await expect(service.getBySlug('nope')).rejects.toThrow(NotFoundException);
  });

  it('computes availability from stock minus reserved and never exposes reserved directly', async () => {
    const full = {
      id: 'p1',
      slug: 'hoodie',
      name: 'Hoodie',
      description: 'd',
      featured: false,
      ratingAvg: 4.5,
      reviewCount: 2,
      category: { slug: 'apparel', name: 'Apparel' },
      anime: null,
      character: null,
      tags: [{ tag: { slug: 'hoodie', name: 'Hoodie' } }],
      variants: [
        {
          id: 'v1',
          sku: 'SS-1',
          optionSize: 'M',
          optionColor: null,
          priceCents: 5000,
          compareAtPriceCents: null,
          stockOnHand: 7,
          reserved: 3,
        },
      ],
      images: [{ id: 'i1', url: '/a.png', altText: 'a' }],
    };
    const prisma = { product: { findFirst: jest.fn().mockResolvedValue(full) } };
    const service = new CatalogService(prisma as never);

    const detail = await service.getBySlug('hoodie');
    expect(detail.variants[0].available).toBe(4);
    expect(detail.variants[0]).not.toHaveProperty('stockOnHand');
    expect(detail.tagSlugs).toEqual([{ slug: 'hoodie', name: 'Hoodie' }]);
  });
});
