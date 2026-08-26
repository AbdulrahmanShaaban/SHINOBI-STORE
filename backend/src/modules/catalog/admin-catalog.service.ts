import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';

/**
 * Admin catalog writes. Every mutation goes through an explicit whitelist
 * mapper — callers cannot smuggle unexpected fields into the database.
 * Guarding (roles) is enforced by AdminGuard at the controller boundary.
 */

export interface ProductWriteInput {
  slug?: string;
  name: string;
  description: string;
  categoryId?: string;
  animeId?: string | null;
  characterId?: string | null;
  status?: 'draft' | 'active' | 'archived';
  featured?: boolean;
  price?: string;
  compareAtPrice?: string;
}

export interface TaxonomyWriteInput {
  slug: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  animeId?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
}

export interface ProductImageWriteInput {
  url: string;
  mediaId?: string;
  altText?: string;
  isPrimary?: boolean;
}

const PRODUCT_FIELDS = [
  'slug',
  'name',
  'description',
  'categoryId',
  'animeId',
  'characterId',
  'status',
  'featured',
] as const;

const TAXONOMY_FIELDS: readonly (keyof TaxonomyWriteInput)[] = [
  'slug',
  'name',
  'description',
  'imageUrl',
  'parentId',
  'animeId',
  'sortOrder',
  'isFeatured',
];

function pick<T extends object>(input: T, allowed: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const key of allowed) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  async createProduct(input: ProductWriteInput) {
    const { price, compareAtPrice, ...productInput } = input;
    const data = pick(productInput, PRODUCT_FIELDS) as Prisma.ProductUncheckedCreateInput;

    // categoryId is required by the DB; throw a clear error if missing.
    if (!data.categoryId) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'categoryId is required' });
    }

    const created = await this.prisma.product.create({ data });

    // If a price was provided, create a default "Standard" variant so the
    // product has a buyable price from the start.
    if (price) {
      const priceCents = Math.round(parseFloat(price) * 100);
      if (!isNaN(priceCents) && priceCents > 0) {
        const compareAtCents = compareAtPrice
          ? Math.round(parseFloat(compareAtPrice) * 100)
          : undefined;
        const sku = `${created.slug}-std`.toUpperCase().slice(0, 40);
        await this.prisma.productVariant.create({
          data: {
            productId: created.id,
            sku,
            priceCents,
            compareAtPriceCents: compareAtCents && !isNaN(compareAtCents) ? compareAtCents : null,
            stockOnHand: 0,
            isActive: true,
          },
        });
      }
    }

    // New rows shift the featured/facet aggregates even though no stale
    // detail page exists yet (§16.1 targeted invalidation).
    await this.cache.invalidateProduct(created.slug);
    return created;
  }

  async updateProduct(id: string, input: Partial<ProductWriteInput>) {
    const existing = await this.assertProductExists(id);
    const data = pick(input, PRODUCT_FIELDS) as Prisma.ProductUncheckedUpdateInput;
    const updated = await this.prisma.product.update({ where: { id }, data });
    // Slug renames orphan the old detail key; both faces are dropped.
    await this.cache.invalidateProduct(existing.slug, updated.slug);
    return updated;
  }

  /** Soft visibility flip — archived products vanish from public reads only. */
  async archiveProduct(id: string) {
    const existing = await this.assertProductExists(id);
    const archived = await this.prisma.product.update({ where: { id }, data: { status: 'archived' } });
    await this.cache.invalidateProduct(existing.slug);
    return archived;
  }

  async createCategory(input: TaxonomyWriteInput) {
    const created = await this.prisma.category.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.CategoryUncheckedCreateInput,
    });
    await this.cache.invalidateFacets();
    return created;
  }

  async createAnime(input: TaxonomyWriteInput) {
    const created = await this.prisma.anime.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.AnimeUncheckedCreateInput,
    });
    await this.cache.invalidateFacets();
    return created;
  }

  async createCharacter(input: TaxonomyWriteInput) {
    const created = await this.prisma.character.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.CharacterUncheckedCreateInput,
    });
    await this.cache.invalidateFacets();
    return created;
  }

  /** Fetch any product regardless of status — admin eyes only. */
  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }

  /**
   * REPLACE semantics for the product's image set: the previous rows are
   * deleted and the incoming list is inserted with sortOrder = array index.
   * At most one primary survives; when none is marked, index 0 wins (the
   * partial unique index on (product_id) WHERE is_primary makes this a hard
   * DB invariant, so we normalize before writing).
   */
  async setProductImages(
    productId: string,
    images: ProductImageWriteInput[],
    actorUserId?: string,
    ip?: string,
  ) {
    const existing = await this.assertProductExists(productId);

    // Referenced media must exist — a dangling FK would otherwise surface as a 500.
    const mediaIds = images
      .map((img) => img.mediaId)
      .filter((id): id is string => typeof id === 'string');
    if (mediaIds.length > 0) {
      const found = await this.prisma.mediaEntry.count({
        where: { id: { in: [...new Set(mediaIds)] } },
      });
      if (found < new Set(mediaIds).size) {
        throw new BadRequestException({
          code: 'MEDIA_NOT_FOUND',
          message: 'One or more referenced media entries do not exist',
        });
      }
    }

    const marked = images.findIndex((img) => img.isPrimary === true);
    const rows = images.map((img, index) => ({
      productId,
      url: img.url,
      mediaId: img.mediaId ?? null,
      altText: img.altText ?? null,
      sortOrder: index,
      isPrimary: index === (marked === -1 ? 0 : marked),
    }));

    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } });
      if (rows.length > 0) {
        await tx.productImage.createMany({ data: rows });
      }
      return tx.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
    });

    await this.cache.invalidateProduct(existing.slug);
    await this.audit.record(
      actorUserId ?? null,
      'product.images.replace',
      'product',
      productId,
      {
        count: saved.length,
        urls: saved.map((img) => img.url),
        primaryUrl: saved.find((img) => img.isPrimary)?.url ?? null,
      },
      ip,
    );
    return { images: saved };
  }

  /** Update the first variant's price/compareAtPrice for a product. */
  async updateProductVariantPricing(
    productId: string,
    price?: string,
    compareAtPrice?: string,
  ) {
    await this.assertProductExists(productId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { productId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!variant) {
      throw new NotFoundException({ code: 'VARIANT_NOT_FOUND', message: 'No active variant found for this product' });
    }

    const data: Prisma.ProductVariantUncheckedUpdateInput = {};
    if (price !== undefined) {
      const priceCents = Math.round(parseFloat(price) * 100);
      if (!isNaN(priceCents) && priceCents > 0) data.priceCents = priceCents;
    }
    if (compareAtPrice !== undefined) {
      const compareAtCents = compareAtPrice
        ? Math.round(parseFloat(compareAtPrice) * 100)
        : null;
      data.compareAtPriceCents = compareAtCents && !isNaN(compareAtCents) ? compareAtCents : null;
    }

    return this.prisma.productVariant.update({
      where: { id: variant.id },
      data,
    });
  }

  /** Admin list with optional q (name/slug contains) + status filter, paginated. */
  async listProducts(opts: { q?: string; status?: string; page: number; limit: number }) {
    const where: Prisma.ProductWhereInput = {};
    if (opts.q) {
      where.OR = [
        { name: { contains: opts.q, mode: 'insensitive' } },
        { slug: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    if (
      opts.status &&
      ['draft', 'active', 'archived'].includes(opts.status)
    ) {
      where.status = opts.status as 'draft' | 'active' | 'archived';
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          featured: true,
          priceFromCents: true,
          createdAt: true,
        },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows,
      meta: {
        page: opts.page,
        limit: opts.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / opts.limit)),
      },
    };
  }


  private async assertProductExists(id: string): Promise<{ slug: string }> {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }
}
