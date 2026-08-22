import { NotFoundException } from '@nestjs/common';
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
  };
  return { service: new AdminCatalogService(prisma as never), prisma };
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
    const { service, prisma } = makeService();
    await service.archiveProduct('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'archived' },
    });

    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.updateProduct('ghost', { name: 'x' })).rejects.toThrow(NotFoundException);
  });
});
