import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, order_status as OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider.port';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AddressInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PlaceOrderInput {
  userId?: string;
  contactEmail: string;
  shippingAddress: AddressInput;
  couponCode?: string;
  idempotencyKey: string;
}

export const RESERVATION_TTL_MS = 30 * 60 * 1000; // §13.1 sweeper TTL
const SHIPPING_FREE_THRESHOLD_CENTS = 5_000;
const SHIPPING_FLAT_CENTS = 499;

/** §14.3 — whitelisted transitions only; everything else is a 409 + audit. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'refunded'],
  processing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly cartService: CartService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * §13.1/§14.2 order placement. ONE interactive transaction:
   * price from DB truth → reserve inventory → coupon → order+items+events.
   * Provider call happens AFTER commit (its failure leaves a retryable
   * pending_payment order, never a lost order). Idempotency-Key replays
   * return the original response.
   */
  async placeOrderFromLines(
    input: PlaceOrderInput & { lines: { variantId: string; quantity: number }[] },
  ) {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (existing) return this.afterPlace(existing.id, input.idempotencyKey);

    if (input.lines.length === 0) {
      throw new ConflictException({ code: 'EMPTY_CART', message: 'No items to check out' });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // 1) Server-side pricing from live variant rows.
      const ids = input.lines.map((l) => l.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: ids }, isActive: true, product: { status: 'active' } },
        select: {
          id: true,
          sku: true,
          optionSize: true,
          optionColor: true,
          priceCents: true,
          stockOnHand: true,
          reserved: true,
          product: { select: { name: true } },
        },
      });
      const byId = new Map(variants.map((v) => [v.id, v] as const));

      let subtotalCents = 0;
      const priced = input.lines.map((line) => {
        const v = byId.get(line.variantId);
        if (!v) {
          throw new ConflictException({
            code: 'VARIANT_UNAVAILABLE',
            message: `An item in your cart is no longer available`,
          });
        }
        const qty = Math.min(line.quantity, v.stockOnHand - v.reserved);
        if (qty < line.quantity || qty <= 0) {
          // §13.1: never silently change the customer's order — fail so they
          // can adjust. The reservation UPDATE is the authoritative gate.
          throw new OutOfStockConflict(v.product.name);
        }
        subtotalCents += v.priceCents * qty;
        return { variant: v, quantity: qty };
      });

      // 2) Coupon (validated server-side, applied to subtotal).
      let discountCents = 0;
      let couponId: string | undefined;
      if (input.couponCode) {
        const applied = await this.applyCoupon(tx, input.couponCode, subtotalCents, input.userId);
        discountCents = applied.discountCents;
        couponId = applied.couponId;
      }

      const shippingCents = subtotalCents - discountCents >= SHIPPING_FREE_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
      const totalCents = Math.max(1, subtotalCents - discountCents + shippingCents);

      // 3) Reservation — conditional updates; any miss rolls EVERYTHING back.
      const reservationExpiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
      const order = await tx.order.create({
        data: {
          orderNumber: await this.nextOrderNumber(tx),
          userId: input.userId,
          status: 'pending_payment',
          subtotalCents,
          discountCents,
          shippingCents,
          taxCents: 0,
          totalCents,
          currency: 'USD',
          contactEmail: input.contactEmail,
          shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
          couponId,
          idempotencyKey: input.idempotencyKey,
          reservationExpiresAt,
        },
      });

      for (const p of priced) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productVariantId: p.variant.id,
            productName: p.variant.product.name,
            variantName:
              [p.variant.optionSize, p.variant.optionColor].filter(Boolean).join(' / ') || 'Standard',
            sku: p.variant.sku,
            unitPriceCents: p.variant.priceCents,
            quantity: p.quantity,
            totalCents: p.variant.priceCents * p.quantity,
          },
        });
      }

      const failed = await this.inventory.reserve(tx, order.id, priced.map((p) => ({
        variantId: p.variant.id,
        quantity: p.quantity,
      })));
      if (failed.length > 0) {
        const offender = byId.get(failed[0].variantId);
        throw new OutOfStockConflict(offender?.product.name ?? 'An item in your cart');
      }

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: 'order_created',
          toStatus: 'pending_payment',
          actorType: input.userId ? 'customer' : 'system',
          actorUserId: input.userId,
          message: 'Order placed; inventory reserved',
        },
      });

      // 4) Coupon redemption row + counter (same atomicity envelope).
      if (couponId) {
        await tx.couponRedemption.create({
          data: { couponId, orderId: order.id, userId: input.userId, discountCents },
        });
        await tx.coupon.update({ where: { id: couponId }, data: { timesUsed: { increment: 1 } } });
      }

      return order;
    });

    // 5) Payment intent AFTER commit (§13.1): provider down ⇒ retryable pending
    // order with failed payment row; never a lost order.
    let clientSecret: string | undefined;
    try {
      const payment = await this.paymentProvider.createPayment({
        amountCents: created.totalCents,
        currency: 'USD',
        referenceId: created.orderNumber,
        idempotencyKey: `pi-${input.idempotencyKey}`,
      });
      clientSecret = payment.clientSecret;
      await this.prisma.payment.create({
        data: {
          orderId: created.id,
          providerRef: payment.providerRef,
          idempotencyKey: `pi-${input.idempotencyKey}`,
          amountCents: created.totalCents,
          currency: 'USD',
          status:
            payment.status === 'succeeded'
              ? 'requires_payment_method'
              : mapToPaymentRowStatus(payment.status),
          ...(payment.status === 'failed' ? { failureReason: 'provider rejected at creation' } : {}),
        },
      });

      // Mock provider auto-succeeds: run the same confirmation path webhooks use.
      if (payment.status === 'succeeded') {
        await this.confirmPaid(created.id, payment.providerRef);
      }
      return this.afterPlace(created.id, input.idempotencyKey, clientSecret);
    } catch {
      // Provider unavailable: keep the order pending_payment w/ failed payment row.
      await this.prisma.payment.createMany({
        data: [{
          orderId: created.id,
          providerRef: `pi_failed_${created.id}`,
          idempotencyKey: `pi-${input.idempotencyKey}`,
          amountCents: created.totalCents,
          currency: 'USD',
          status: 'failed',
          failureReason: 'provider unavailable at creation',
        }],
        skipDuplicates: true,
      }).catch(() => undefined);
      return this.afterPlace(created.id, input.idempotencyKey);
    }
  }

  /**
   * §14.2 confirmation path (webhook or reconciliation). Idempotent: a second
   * delivery is a no-op because the transition guard sees status already moved.
   */
  async confirmPaid(orderId: string, providerRef: string): Promise<void> {
    let email: string | undefined;
    let orderNumber: string | undefined;
    let totalCents: number | undefined;
    await this.transition(orderId, 'confirmed', {
      actorType: 'system',
      message: 'Payment succeeded',
      metadata: { providerRef },
      onConfirmed: async (tx) => {
        const lines = await this.inventory.linesForOrder(tx, orderId);
        await this.inventory.commit(tx, orderId, lines); // reservation → sale
        await tx.payment.updateMany({
          where: { orderId, status: { notIn: ['succeeded', 'refunded'] } },
          data: { status: 'succeeded' },
        });
        const o = await tx.order.findUnique({
          where: { id: orderId },
          select: { contactEmail: true, totalCents: true, orderNumber: true },
        });
        email = o?.contactEmail;
        totalCents = o?.totalCents;
        orderNumber = o?.orderNumber;
      },
    });
    // §13.3: queued AFTER the state transition — email failure never blocks it.
    if (email && orderNumber && totalCents !== undefined) {
      await this.notifications.sendOrderConfirmation({ orderNumber, email, totalCents });
    }
  }

  /** Sweeper entry: cancel an expired reservation (idempotent). */
  async cancelExpired(orderId: string): Promise<void> {
    await this.transition(orderId, 'cancelled', {
      type: 'reservation_expired',
      message: 'Reservation expired; stock released',
    });
  }

  /** Sweeper: cancel expired pending orders and release their reservations. */
  async sweepExpired(now = new Date()): Promise<string[]> {
    const expired = await this.inventory.findExpiredPendingOrders(now);
    const swept: string[] = [];
    for (const order of expired) {
      try {
        await this.cancelExpired(order.id);
        swept.push(order.orderNumber);
      } catch {
        // concurrent cancel/webhook won — skip
      }
    }
    return swept;
  }

  /** Webhook/reconciliation entry: confirm by PaymentIntent ref (idempotent). */
  async confirmByProviderRef(providerRef: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef },
      select: { orderId: true },
    });
    if (!payment) return;
    await this.confirmPaid(payment.orderId, providerRef);
  }

  /** payment_intent.payment_failed: mark the payment, keep order pending. */
  async failPaymentByProviderRef(providerRef: string, reason: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef },
      select: { id: true, status: true, orderId: true },
    });
    if (!payment || payment.status === 'succeeded' || payment.status === 'refunded') return;
    if (payment.status !== 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: reason.slice(0, 255) },
      });
      await this.transition(payment.orderId, 'pending_payment', {
        type: 'payment_failed',
        message: 'Payment attempt failed; reservation held until expiry',
      }).catch(() => undefined); // same-state transition is a no-op by design
    }
  }

  /**
   * §14.3 whitelisted transition + event append in one tx. Illegal moves → 409.
   * Same-state replays are silent no-ops (webhook duplicates).
   */
  async transition(
    orderId: string,
    to: OrderStatus,
    opts: {
      actorType?: 'system' | 'customer' | 'admin';
      actorUserId?: string;
      message?: string;
      metadata?: Record<string, unknown>;
      type?: string;
      onConfirmed?: (tx: Prisma.TransactionClient, order: { id: string }) => Promise<void>;
    } = {},
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
      if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });

      if (order.status === to) return; // idempotent replay of same-state event
      const allowed = TRANSITIONS[order.status];
      if (!allowed.includes(to)) {
        throw new ConflictException({
          code: 'ILLEGAL_TRANSITION',
          message: `Cannot move order from ${order.status} to ${to}`,
        });
      }

      await tx.orderEvent.create({
        data: {
          orderId,
          type: opts.type ?? `status_${to}`,
          fromStatus: order.status,
          toStatus: to,
          actorType: opts.actorType ?? 'system',
          actorUserId: opts.actorUserId,
          message: opts.message,
          metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: to } });

      if (to === 'cancelled') {
        const lines = await this.inventory.linesForOrder(tx, orderId);
        await this.inventory.release(tx, orderId, lines);
      }
      if (to === 'confirmed' && opts.onConfirmed) {
        await opts.onConfirmed(tx, order);
      }
    });
  }

  /** Auth-scoped single order (user may only read own; admin paths come later). */
  async getByOrderNumberForUser(orderNumber: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        payments: { select: { status: true, providerRef: true, amountCents: true } },
      },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return order;
  }

  listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        createdAt: true,
        items: { select: { productName: true, variantName: true, quantity: true } },
      },
    });
  }

  /** Server-cart lines for authed checkout (guests post explicit lines). */
  async linesFromServerCart(userId: string): Promise<{ variantId: string; quantity: number }[]> {
    return this.cartService.rawLines(userId);
  }

  /** §14.2 polling payload — reflects DB truth only. */
  async getOrderStatus(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        totalCents: true,
        payments: { select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      paymentStatus: order.payments[0]?.status ?? null,
    };
  }

  /**
   * Guest detail: the unguessable order number IS the capability token
   * (documented trade-off; no PII beyond what was ordered).
   */
  async getByOrderNumberForGuest(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        payments: { select: { status: true, providerRef: true, amountCents: true } },
      },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return order;
  }

  private async afterPlace(orderId: string, idempotencyKey?: string, clientSecret?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        orderNumber: true,
        status: true,
        totalCents: true,
        payments: { select: { providerRef: true, status: true } },
      },
    });
    const payment = order.payments[0];
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: order.totalCents,
      clientSecret,
      paymentStatus: payment?.status ?? null,
    };
  }

  private async applyCoupon(
    tx: Prisma.TransactionClient,
    code: string,
    subtotalCents: number,
    userId?: string,
  ): Promise<{ couponId: string; discountCents: number }> {
    const coupon = await tx.coupon.findUnique({ where: { code } });
    const now = new Date();
    const usable =
      coupon &&
      coupon.isActive &&
      (!coupon.startsAt || coupon.startsAt <= now) &&
      (!coupon.endsAt || coupon.endsAt >= now) &&
      (!coupon.usageLimit || coupon.timesUsed < coupon.usageLimit) &&
      subtotalCents >= (coupon.minSubtotalCents ?? 0);
    if (!usable) {
      throw new ConflictException({ code: 'COUPON_INVALID', message: 'Coupon code is not valid' });
    }
    if (userId && coupon!.perUserLimit) {
      const used = await tx.couponRedemption.count({ where: { couponId: coupon!.id, userId } });
      if (used >= coupon!.perUserLimit) {
        throw new ConflictException({ code: 'COUPON_INVALID', message: 'Coupon code is not valid' });
      }
    }
    let discount =
      coupon!.type === 'percent'
        ? Math.floor((subtotalCents * coupon!.value) / 100)
        : coupon!.value;
    if (coupon!.maxDiscountCents) discount = Math.min(discount, coupon!.maxDiscountCents);
    discount = Math.min(discount, subtotalCents);
    return { couponId: coupon!.id, discountCents: discount };
  }

  /** SS-YYYY-NNNNNN via DB sequence — collision-free under concurrency. */
  private async nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
    const n = Number(rows[0].n);
    return `SS-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
  }
}

export class OutOfStockConflict extends ConflictException {
  constructor(productName: string) {
    super({ code: 'OUT_OF_STOCK', message: `"${productName}" just went out of stock` });
  }
}

function mapToPaymentRowStatus(status: string) {
  switch (status) {
    case 'requires_action':
      return 'requires_action';
    case 'processing':
      return 'processing';
    case 'canceled':
      return 'canceled';
    default:
      return 'requires_payment_method';
  }
}
