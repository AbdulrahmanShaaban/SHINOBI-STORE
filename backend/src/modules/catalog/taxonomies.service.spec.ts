import { TaxonomiesService } from './taxonomies.service';

function makeService() {
  const tx = {
    category: { findMany: jest.fn().mockResolvedValue([{ id: 'c1', slug: 'apparel', name: 'Apparel', parentId: null }]) },
    product: { groupBy: jest.fn().mockResolvedValue([{ categoryId: 'c1', _count: { _all: 7 } }]) },
    anime: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', slug: 'naruto', name: 'Naruto', imageUrl: '/n.png', isFeatured: true },
        { id: 'a2', slug: 'shippuden', name: 'Shippuden', imageUrl: null, isFeatured: false },
      ]),
    },
    character: {
      findMany: jest.fn().mockResolvedValue([{ id: 'ch1', slug: 'naruto', name: 'Naruto Uzumaki', imageUrl: '/x.png', anime: { slug: 'naruto', name: 'Naruto' } }]),
    },
    tag: { findMany: jest.fn().mockResolvedValue([{ slug: 'hoodie', name: 'Hoodie' }]) },
  };
  const prisma = {
    character: tx.character,
    tag: tx.tag,
    $transaction: jest.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
  };
  return { service: new TaxonomiesService(prisma as never), tx, prisma };
}

describe('TaxonomiesService', () => {
  it('joins active-product counts onto categories by id', async () => {
    const { service, tx } = makeService();
    const rows = await service.listCategories();

    expect(tx.product.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['categoryId'], where: { status: 'active' } }),
    );
    expect(rows).toEqual([{ id: 'c1', slug: 'apparel', name: 'Apparel', parentId: null, productCount: 7 }]);
  });

  it('matches anime counts to animes by internal id — never by slug', async () => {
    // Regression guard: counts are keyed by animeId; slugs must not be used as lookup keys.
    const { service, tx } = makeService();
    (tx.anime.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', slug: 'slug-a', name: 'A', imageUrl: null, isFeatured: false },
    ]);
    (tx.product.groupBy as jest.Mock).mockResolvedValue([{ animeId: 'a1', _count: { _all: 3 } }]);

    const rows = await service.listAnimes();
    expect(rows[0]).toEqual({ id: 'a1', slug: 'slug-a', name: 'A', imageUrl: null, isFeatured: false, productCount: 3 });
  });

  it('defaults missing anime counts to zero without dropping the anime', async () => {
    const { service, tx } = makeService();
    (tx.product.groupBy as jest.Mock).mockResolvedValue([]);

    const rows = await service.listAnimes();
    expect(rows.map((r) => r.productCount)).toEqual([0, 0]);
  });

  it('lists characters with their anime reference and tags plainly', async () => {
    const { service, tx } = makeService();

    expect(await service.listCharacters()).toHaveLength(1);
    expect(await service.listTags()).toEqual([{ slug: 'hoodie', name: 'Hoodie' }]);
    expect(tx.character.findMany).toHaveBeenCalled();
  });
});
