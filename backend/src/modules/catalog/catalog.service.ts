import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { AvailabilityDto, VariantAvailability } from './dto/availability.dto';
import { searchProductIds } from './search.builder';

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  featured: boolean;
  ratingAvg: number;
  reviewCount: number;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  priceFromCents: number | null;
  compareAtPriceCents: number | null;
}

export interface PaginatedProducts {
  items: ProductListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface FacetOption {
  slug: string;
  name: string;
  count: number;
}

/** Faceted counts under the current filter set; each dimension is counted with its own filter removed (§18). */
export interface ProductFacets {
  categories: FacetOption[];
  animes: FacetOption[];
  characters: FacetOption[];
  tags: FacetOption[];
}

type FacetDimension = 'category' | 'anime' | 'character' | 'tag';

const EMPTY_FACETS: ProductFacets = {
  categories: [],
  animes: [],
  characters: [],
  tags: [],
};

const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  featured: true,
  ratingAvg: true,
  reviewCount: true,
  priceFromCents: true,
  images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
} satisfies Prisma.ProductSelect;

const DETAIL_INCLUDE = {
  category: { select: { slug: true, name: true } },
  anime: { select: { slug: true, name: true } },
  character: { select: { slug: true, name: true } },
  tags: { select: { tag: { select: { slug: true, name: true } } } },
  variants: {
    where: { isActive: true },
    orderBy: [{ priceCents: 'asc' }, { sku: 'asc' }],
    select: {
      id: true,
      sku: true,
      optionSize: true,
      optionColor: true,
      priceCents: true,
      compareAtPriceCents: true,
      stockOnHand: true,
      reserved: true,
    },
  },
  images: { orderBy: [{ sortOrder: 'asc' }, { url: 'asc' }] },
} satisfies Prisma.ProductInclude;

/** `relevance` is only meaningful with a search term; without one it is newest. */
function effectiveSort(sort: ProductSort): Exclude<ProductSort, 'relevance'> {
  return sort === 'relevance' ? 'newest' : sort;
}

function emptyPage(page: number, limit: number): PaginatedProducts {
  return { items: [], meta: { page, limit, total: 0, totalPages: Math.max(1, Math.ceil(0 / limit)) } };
}

function paginate(items: ProductListItem[], page: number, limit: number): PaginatedProducts {
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: {
      page,
      limit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / limit)),
    },
  };
}

function mapListItem(p: Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>): ProductListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    featured: p.featured,
    ratingAvg: Number(p.ratingAvg),
    reviewCount: p.reviewCount,
    primaryImageUrl: p.images[0]?.url ?? null,
    primaryImageAlt: p.images[0]?.altText ?? null,
    priceFromCents: p.priceFromCents ?? null,
    compareAtPriceCents: null,
  };
}

/**
 * Public catalog reads. Draft/archived products are invisible everywhere —
 * enforced here in the query itself, never by the caller.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductQueryDto): Promise<PaginatedProducts> {
    const search = query.search?.trim();
    if (!search) return this.listUnsearched(query);

    // Search path: ranked candidates are resolved once (bounded), then every
    // structured filter applies through the same Prisma where as the unsearched
    // path — one source of truth for visibility/filter rules.
    const ids = await searchProductIds(this.prisma, search);
    if (ids.length === 0) return emptyPage(query.page, query.limit);

    const rows = await this.prisma.product.findMany({
      where: { ...this.buildWhere(query), id: { in: ids } },
      orderBy: this.buildOrderBy(effectiveSort(query.sort)),
      select: LIST_SELECT,
    });

    let items = rows.map(mapListItem);
    if (query.sort === 'relevance') {
      const rank = new Map(ids.map((id, i) => [id, i] as const));
      items = items.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    }
    return paginate(items, query.page, query.limit);
  }

  private async listUnsearched(query: ProductQueryDto): Promise<PaginatedProducts> {
    const where = this.buildWhere(query);
    const orderBy = this.buildOrderBy(effectiveSort(query.sort));

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        select: LIST_SELECT,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(mapListItem),
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  }

  /**
   * Live purchasability per variant. Only variants of ACTIVE products are
   * returned — absent ids mean "gone" (deleted, draft or archived) and
   * clients must quarantine those cart lines.
   */
  async getAvailability({ variantIds }: AvailabilityDto): Promise<VariantAvailability[]> {
    const rows = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, product: { status: 'active' } },
      select: {
        id: true,
        isActive: true,
        priceCents: true,
        compareAtPriceCents: true,
        stockOnHand: true,
        reserved: true,
        product: { select: { slug: true } },
      },
    });
    return rows.map((v) => ({
      variantId: v.id,
      isActive: v.isActive,
      priceCents: v.priceCents,
      compareAtPriceCents: v.compareAtPriceCents,
      available: Math.max(0, v.stockOnHand - v.reserved),
      productSlug: v.product.slug,
    }));
  }

  /**
   * Counts per taxonomy dimension under the current filter set, minus that
   * dimension's own condition — so a bucket is always selectable from the UI
   * without zeroing the rest of the sidebar.
   */
  async getFacets(query: ProductQueryDto): Promise<ProductFacets> {
    const search = query.search?.trim();
    let scopedIds: string[] | undefined;
    if (search) {
      scopedIds = await searchProductIds(this.prisma, search);
      if (scopedIds.length === 0) return EMPTY_FACETS;
    }

    const base = this.buildWhere(query);
    const facetProductWhere = (dim: FacetDimension): Prisma.ProductWhereInput => {
      const w: Prisma.ProductWhereInput = { ...base };
      if (scopedIds) w.id = { in: scopedIds };
      if (dim === 'category') delete w.category;
      else if (dim === 'anime') delete w.anime;
      else if (dim === 'character') delete w.character;
      else delete w.tags;
      return w;
    };

    const toOptions = (
      rows: { slug: string; name: string; _count: { products: number } }[],
    ): FacetOption[] =>
      rows
        .map((r) => ({ slug: r.slug, name: r.name, count: r._count.products }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const directSelect = (dim: FacetDimension) => ({
      where: { products: { some: facetProductWhere(dim) } },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: facetProductWhere(dim) } } },
      },
    });

    // Tag counts traverse the join table (Tag.products is ProductTag[]).
    const tagWhere = facetProductWhere('tag');
    const tagArgs = {
      where: { products: { some: { product: tagWhere } } },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { product: tagWhere } } } },
      },
    };

    const [categoryRows, animeRows, characterRows, tagRows] = await Promise.all([
      this.prisma.category.findMany(directSelect('category')),
      this.prisma.anime.findMany(directSelect('anime')),
      this.prisma.character.findMany(directSelect('character')),
      this.prisma.tag.findMany(tagArgs),
    ]);

    return {
      categories: toOptions(categoryRows),
      animes: toOptions(animeRows),
      characters: toOptions(characterRows),
      tags: toOptions(tagRows),
    };
  }

  async getBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'active' },
      include: DETAIL_INCLUDE,
    });
    if (!product || product.category === null) {
      // category is guaranteed non-null by the schema; the check keeps TS honest.
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      featured: product.featured,
      ratingAvg: Number(product.ratingAvg),
      reviewCount: product.reviewCount,
      category: product.category,
      anime: product.anime,
      character: product.character,
      tagSlugs: product.tags.map((t) => t.tag),
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        optionSize: v.optionSize,
        optionColor: v.optionColor,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents,
        // available is always computed, never stored (plan §10.2).
        // Raw stockOnHand/reserved stay server-side.
        available: Math.max(0, v.stockOnHand - v.reserved),
      })),
      images: product.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText })),
    };
  }

  private buildWhere(q: ProductQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { status: 'active' };
    if (q.category) where.category = { slug: q.category };
    if (q.anime) where.anime = { slug: q.anime };
    if (q.character) where.character = { slug: q.character };
    if (q.tag) where.tags = { some: { tag: { slug: q.tag } } };
    if (q.featured) where.featured = true;
    // Text matching is NOT expressed here: it resolves to ranked ids in
    // search.builder.ts and merges as an id filter, keeping FTS/trigram SQL
    // in one place and this builder free of raw fragments.
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.variants = {
        some: {
          isActive: true,
          priceCents: {
            ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
            ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
          },
        },
      };
    }
    return where;
  }

  private buildOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        // priceFromCents is trigger-maintained (cheapest active variant);
        // products without active variants sort last.
        return [{ priceFromCents: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
      case 'price_desc':
        return [{ priceFromCents: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
      case 'rating':
        return [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}
