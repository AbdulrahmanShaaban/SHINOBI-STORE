import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Public taxonomy reads for storefront navigation/filters.
 * Counts are computed with bounded groupBy queries (no N+1).
 */
@Injectable()
export class TaxonomiesService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.$transaction(async (tx) => {
      const [categories, counts] = await Promise.all([
        tx.category.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true, parentId: true },
        }),
        tx.product.groupBy({
          by: ['categoryId'],
          where: { status: 'active' },
          _count: { _all: true },
        }),
      ]);
      const countByCategory = new Map(counts.map((c) => [c.categoryId, c._count._all]));
      return categories.map(({ id, ...c }) => ({ ...c, productCount: countByCategory.get(id) ?? 0 }));
    });
  }

  listAnimes() {
    return this.prisma.$transaction(async (tx) => {
      const [animes, counts] = await Promise.all([
        tx.anime.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true, imageUrl: true, isFeatured: true },
        }),
        tx.product.groupBy({
          by: ['animeId'],
          where: { status: 'active', animeId: { not: null } },
          _count: { _all: true },
        }),
      ]);
      const countByAnime = new Map(
        counts.flatMap((c) => (c.animeId !== null ? [[c.animeId, c._count._all] as const] : [])),
      );
      return animes.map(({ id, ...a }) => ({ ...a, productCount: countByAnime.get(id) ?? 0 }));
    });
  }

  listCharacters() {
    return this.prisma.character.findMany({
      orderBy: { name: 'asc' },
      select: {
        slug: true,
        name: true,
        imageUrl: true,
        anime: { select: { slug: true, name: true } },
      },
    });
  }

  listTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    });
  }
}
