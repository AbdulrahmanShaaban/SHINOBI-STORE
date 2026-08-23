import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ServerCartLine {
  id: string;
  variantId: string;
  quantity: number;
  slug: string;
  name: string;
  variantLabel: string | null;
  priceCents: number;
  available: number;
}

const LINE_SELECT = {
  id: true,
  variantId: true,
  quantity: true,
  variant: {
    select: {
      optionSize: true,
      optionColor: true,
      priceCents: true,
      stockOnHand: true,
      reserved: true,
      isActive: true,
      product: { select: { slug: true, name: true, status: true } },
    },
  },
} satisfies Prisma.CartItemSelect;

/** Raw cart lines for order placement (server-cart checkout source). */
export interface ServerCartRawLine {
  variantId: string;
  quantity: number;
}

/** Purchasability clamp shared by add/update/merge — server-side quantity authority. */
export function clampToAvailability(quantity: number, stockOnHand: number, reserved: number): number {
  return Math.max(0, Math.min(quantity, stockOnHand - reserved));
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** One cart per user, created lazily. */
  private async ensureCart(userId: string): Promise<string> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
    return cart.id;
  }

  async getCart(userId: string): Promise<{ items: ServerCartLine[] }> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: { items: { orderBy: { createdAt: 'asc' }, select: LINE_SELECT } },
    });
    return { items: (cart?.items ?? []).map(mapLine).filter((l): l is ServerCartLine => l !== null) };
  }

  /** Raw purchasable lines — the checkout source for authed users. */
  async rawLines(userId: string): Promise<ServerCartRawLine[]> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          select: { variantId: true, quantity: true, variant: { select: { isActive: true } } },
        },
      },
    });
    return (cart?.items ?? [])
      .filter((i) => i.variant.isActive)
      .map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
  }

  async addItem(userId: string, variantId: string, quantity: number): Promise<ServerCartLine[]> {
    const variant = await this.purchasableVariant(variantId);
    const available = clampToAvailability(quantity, variant.stockOnHand, variant.reserved);
    if (available <= 0) {
      throw new NotFoundException({
        code: 'VARIANT_UNAVAILABLE',
        message: 'This item is not currently available',
      });
    }

    const cartId = await this.ensureCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
      select: { quantity: true },
    });
    const desired = clampToAvailability(
      (existing?.quantity ?? 0) + quantity,
      variant.stockOnHand,
      variant.reserved,
    );

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity: desired },
      create: { cartId, variantId, quantity: desired },
    });

    return (await this.getCart(userId)).items;
  }

  async updateItem(userId: string, itemId: string, quantity: number): Promise<void> {
    const owned = await this.ownLine(userId, itemId);
    const variant = await this.prisma.productVariant.findUniqueOrThrow({
      where: { id: owned.variantId },
      select: { stockOnHand: true, reserved: true },
    });
    const clamped = clampToAvailability(quantity, variant.stockOnHand, variant.reserved);
    if (clamped <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return;
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity: clamped } });
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    await this.ownLine(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  /**
   * Merge a guest cart at login. Guest input is untrusted: unknown/inactive
   * variants are skipped silently, quantities are summed per variant and
   * clamped to live availability. Idempotent under retry by construction.
   */
  async merge(userId: string, guestItems: { variantId: string; quantity: number }[]): Promise<ServerCartLine[]> {
    if (guestItems.length === 0) return (await this.getCart(userId)).items;

    const ids = [...new Set(guestItems.map((i) => i.variantId))];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids }, isActive: true, product: { status: 'active' } },
      select: { id: true, stockOnHand: true, reserved: true },
    });
    const availability = new Map(
      variants.map((v) => [v.id, clampToAvailability(Number.MAX_SAFE_INTEGER, v.stockOnHand, v.reserved)] as const),
    );

    // Sum duplicate guest entries per variant before clamping.
    const wanted = new Map<string, number>();
    for (const item of guestItems) {
      if (!availability.has(item.variantId)) continue;
      wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.quantity);
    }

    const cartId = await this.ensureCart(userId);
    await this.prisma.$transaction(async (tx) => {
      for (const [variantId, guestQty] of wanted) {
        const existing = await tx.cartItem.findUnique({
          where: { cartId_variantId: { cartId, variantId } },
          select: { quantity: true },
        });
        const max = availability.get(variantId)!;
        const desired = Math.min(max, (existing?.quantity ?? 0) + guestQty);
        if (desired <= 0) continue;
        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId, variantId } },
          update: { quantity: desired },
          create: { cartId, variantId, quantity: desired },
        });
      }
    });

    return (await this.getCart(userId)).items;
  }

  private async purchasableVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, isActive: true, product: { status: 'active' } },
      select: { stockOnHand: true, reserved: true },
    });
    if (!variant) {
      throw new NotFoundException({
        code: 'VARIANT_UNAVAILABLE',
        message: 'This item is not currently available',
      });
    }
    return variant;
  }

  /** Ownership check — IDOR guard: the line must belong to the caller's cart. */
  private async ownLine(userId: string, itemId: string) {
    const line = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      select: { id: true, variantId: true, cart: { select: { userId: true } } },
    });
    if (!line || line.cart.userId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your cart' });
    }
    return line;
  }
}

function mapLine(raw: {
  id: string;
  variantId: string;
  quantity: number;
  variant: {
    optionSize: string | null;
    optionColor: string | null;
    priceCents: number;
    stockOnHand: number;
    reserved: number;
    isActive: boolean;
    product: { slug: string; name: string; status: string };
  };
}): ServerCartLine | null {
  const v = raw.variant;
  if (!v.isActive || v.product.status !== 'active') return null; // dead lines vanish server-side too
  return {
    id: raw.id,
    variantId: raw.variantId,
    quantity: raw.quantity,
    slug: v.product.slug,
    name: v.product.name,
    variantLabel:
      [v.optionSize, v.optionColor].filter(Boolean).join(' / ') || null,
    priceCents: v.priceCents,
    available: clampToAvailability(Number.MAX_SAFE_INTEGER, v.stockOnHand, v.reserved),
  };
}
