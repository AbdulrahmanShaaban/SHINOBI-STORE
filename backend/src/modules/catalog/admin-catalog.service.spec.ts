import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminCatalogService } from './admin-catalog.service';

function makeService() {
  const prisma = {
    product: {
      create: jest.fn().mockResolvedValue({ id: 'p1' }),
      update: jest.fn().mockResolvedValue({ id: 'p1', status: 'archived' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'p1' }),
    },
    category: { create: jest.fn().mockResolvedValue({ id: 'c1' }) },
    anime: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    character: { create: jest.fn().mockResolvedValue({ id: 'ch1' }) },
    productImage: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    mediaEntry: { count: jest.fn().mockResolvedValue(0) },
  };
  // Interactive transactions run against the same mocked delegates.
  (prisma as Record<string, unknown>).$transaction = jest.fn(
    async (fn: (tx: unknown) => unknown) => fn(prisma),
  );
  // Cache is a pure observer here: mutations must fire targeted invalidation
  // and never let cache failures surface.
  const cache = {
    invalidateProduct: jest.fn().mockResolvedValue(undefined),
    invalidateFacets: jest.fn().mockResolvedValue(undefined),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new AdminCatalogService(prisma as never, cache as never, audit as never),
    prisma,
    cache,
    audit,
  };
}

describe('AdminCatalogService — field whitelisting', () => {
  it('persists only whitelisted product fields, dropping unknown keys', async () => {
    const { service, prisma } = makeService();
    const input = {
      name: 'Hoodie',
      description: 'desc',
      categoryId: 'c-uuid',
      featured: true,
      // hostile extras that must never reach the database:
      status: 'active',
      ratingAvg: 999,
      reviewCount: 99999,
      id: 'forged',
    } as Record<string, unknown>;

    await service.createProduct(input as never);
    const data = (prisma.product.create as jest.Mock).mock.calls[0][0].data;

    expect(data).toEqual({
      name: 'Hoodie',
      description: 'desc',
      categoryId: 'c-uuid',
      featured: true,
      status: 'active',
    });
    expect(data).not.toHaveProperty('ratingAvg');
    expect(data).not.toHaveProperty('reviewCount');
    expect(data).not.toHaveProperty('id');
  });

  it('keeps explicit nulls for nullable relations but drops undefined ones', async () => {
    const { service, prisma } = makeService();
    await service.createProduct({ name: 'x', description: 'y', categoryId: 'c', animeId: null } as never);

    const data = (prisma.product.create as jest.Mock).mock.calls[0][0].data;
    expect(data).toHaveProperty('animeId', null);
    expect(data).not.toHaveProperty('characterId');
  });

  it('archives by status flip and refuses to touch unknown products', async () => {
    const { service, prisma, cache } = makeService();
    await service.archiveProduct('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'archived' },
    });

    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    const callsBefore = cache.invalidateProduct.mock.calls.length;
    await expect(service.updateProduct('ghost', { name: 'x' })).rejects.toThrow(NotFoundException);
    // Failed mutations must not fire invalidation.
    expect(cache.invalidateProduct.mock.calls.length).toBe(callsBefore);
  });

  it('fires targeted cache invalidation for every product mutation path', async () => {
    const { service, prisma, cache } = makeService();

    (prisma.product.create as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'hoodie' });
    await service.createProduct({ name: 'Hoodie', description: 'd', categoryId: 'c-uuid' } as never);
    expect(cache.invalidateProduct).toHaveBeenCalledWith('hoodie');

    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'old-slug' });
    (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'renamed' });
    await service.updateProduct('p1', { slug: 'renamed' });
    expect(cache.invalidateProduct).toHaveBeenCalledWith('old-slug', 'renamed');

    await service.archiveProduct('p1');
    expect(cache.invalidateProduct).toHaveBeenCalledWith('old-slug');
  });

  it('invalidates facets when taxonomy buckets change', async () => {
    const { service, cache } = makeService();

    await service.createCategory({ slug: 'apparel', name: 'Apparel' });
    await service.createAnime({ slug: 'naruto', name: 'Naruto' });
    await service.createCharacter({ slug: 'naruto', name: 'Naruto' });

    expect(cache.invalidateFacets).toHaveBeenCalledTimes(3);
  });
});

describe('AdminCatalogService — setProductImages (replace set)', () => {
  it('writes sortOrder = array index and keeps exactly one primary after reorder', async () => {
    const { service, prisma, cache, audit } = makeService();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'hoodie' });
    (prisma.productImage.findMany as jest.Mock).mockResolvedValue([
      { id: 'i2', url: 'b.jpg', sortOrder: 0, isPrimary: true },
      { id: 'i1', url: 'a.jpg', sortOrder: 1, isPrimary: false },
    ]);

    await service.setProductImages(
      'p1',
      [
        { url: 'b.jpg', isPrimary: true },
        { url: 'a.jpg' },
        { url: 'c.jpg', isPrimary: true }, // second claim must lose
      ],
      'admin-1',
      '127.0.0.1',
    );

    expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(prisma.productImage.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ url: 'b.jpg', sortOrder: 0, isPrimary: true }),
        expect.objectContaining({ url: 'a.jpg', sortOrder: 1, isPrimary: false }),
        expect.objectContaining({ url: 'c.jpg', sortOrder: 2, isPrimary: false }),
      ],
    });
    expect(cache.invalidateProduct).toHaveBeenCalledWith('hoodie');
    expect(audit.record).toHaveBeenCalledWith(
      'admin-1',
      'product.images.replace',
      'product',
      'p1',
      expect.objectContaining({ count: 2, primaryUrl: 'b.jpg' }),
      '127.0.0.1',
    );
  });

  it('defaults the primary to index 0 when nothing is marked', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'hoodie' });

    await service.setProductImages('p1', [{ url: 'x.jpg' }, { url: 'y.jpg', isPrimary: false }]);

    const data = (prisma.productImage.createMany as jest.Mock).mock.calls[0][0].data;
    expect(data[0]).toMatchObject({ url: 'x.jpg', isPrimary: true });
    expect(data[1]).toMatchObject({ url: 'y.jpg', isPrimary: false });
  });

  it('clears the whole set for an empty list without inserting rows', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'hoodie' });

    await service.setProductImages('p1', []);

    expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    expect(prisma.productImage.createMany).not.toHaveBeenCalled();
  });

  it('rejects unknown media references before touching existing rows', async () => {
    const { service, prisma } = makeService();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: 'p1', slug: 'hoodie' });
    (prisma.mediaEntry.count as jest.Mock).mockResolvedValue(0);

    await expect(
      service.setProductImages('p1', [{ url: 'a.jpg', mediaId: 'ghost-media' }]),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.productImage.deleteMany).not.toHaveBeenCalled();
    expect(prisma.productImage.createMany).not.toHaveBeenCalled();
  });

  it('refuses unknown products and records nothing', async () => {
    const { service, prisma, cache, audit } = makeService();
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.setProductImages('ghost', [{ url: 'a.jpg' }])).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.productImage.deleteMany).not.toHaveBeenCalled();
    expect(cache.invalidateProduct).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
