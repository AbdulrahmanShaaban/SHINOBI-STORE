import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
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
  categoryId: string;
  animeId?: string | null;
  characterId?: string | null;
  status?: 'draft' | 'active' | 'archived';
  featured?: boolean;
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

const PRODUCT_FIELDS: readonly (keyof ProductWriteInput)[] = [
  'slug',
  'name',
  'description',
  'categoryId',
  'animeId',
  'characterId',
  'status',
  'featured',
];

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
  ) {}

  async createProduct(input: ProductWriteInput) {
    const data = pick(input, PRODUCT_FIELDS) as Prisma.ProductUncheckedCreateInput;
    const created = await this.prisma.product.create({ data });
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
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }

  private async assertProductExists(id: string): Promise<{ slug: string }> {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { slug: true } });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }
}
