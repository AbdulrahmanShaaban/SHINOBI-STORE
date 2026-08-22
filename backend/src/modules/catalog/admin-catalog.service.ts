import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  createProduct(input: ProductWriteInput) {
    const data = pick(input, PRODUCT_FIELDS) as Prisma.ProductUncheckedCreateInput;
    return this.prisma.product.create({ data });
  }

  async updateProduct(id: string, input: Partial<ProductWriteInput>) {
    await this.assertProductExists(id);
    const data = pick(input, PRODUCT_FIELDS) as Prisma.ProductUncheckedUpdateInput;
    return this.prisma.product.update({ where: { id }, data });
  }

  /** Soft visibility flip — archived products vanish from public reads only. */
  async archiveProduct(id: string) {
    await this.assertProductExists(id);
    return this.prisma.product.update({ where: { id }, data: { status: 'archived' } });
  }

  createCategory(input: TaxonomyWriteInput) {
    return this.prisma.category.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.CategoryUncheckedCreateInput,
    });
  }

  createAnime(input: TaxonomyWriteInput) {
    return this.prisma.anime.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.AnimeUncheckedCreateInput,
    });
  }

  createCharacter(input: TaxonomyWriteInput) {
    return this.prisma.character.create({
      data: pick(input, TAXONOMY_FIELDS) as Prisma.CharacterUncheckedCreateInput,
    });
  }

  /** Fetch any product regardless of status — admin eyes only. */
  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
    return product;
  }

  private async assertProductExists(id: string): Promise<void> {
    const exists = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }
  }
}
