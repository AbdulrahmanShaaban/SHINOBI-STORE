import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type Tx = Prisma.TransactionClient;

export interface ReserveLine {
  variantId: string;
  quantity: number;
}

/**
 * §15 inventory operations. Every mutation is a SINGLE conditional statement
 * inside the caller's transaction, so overselling is impossible regardless of
 * concurrent checkouts without higher isolation levels:
 *
 *   RESERVE: fails (rowCount 0) when stock_on_hand - reserved < qty → caller rolls back.
 *   COMMIT:  reservation becomes a sale (payment succeeded).
 *   RELEASE: reservation returned (expiry/cancel).
 *   RESTOCK: physical stock returned (refund).
 *
 * Every operation appends an InventoryTransaction row in the same tx — the log
 * is the reconciliation trail.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserves every line inside the caller's transaction.
   * Returns the ids of lines that could NOT be reserved (empty on success).
   * Caller decides rollback vs partial handling — the order flow rolls back.
   */
  async reserve(tx: Tx, orderId: string, lines: ReserveLine[]): Promise<ReserveLine[]> {
    const failed: ReserveLine[] = [];
    for (const line of lines) {
      const rows = await tx.$executeRaw`
        UPDATE product_variants
           SET reserved = reserved + ${line.quantity}
         WHERE id = ${line.variantId}::uuid AND is_active
           AND stock_on_hand - reserved >= ${line.quantity}
      `;
      if (rows !== 1) {
        failed.push(line);
        continue;
      }
      await tx.inventoryTransaction.create({
        data: { variantId: line.variantId, type: 'reserve', quantity: line.quantity, orderId },
      });
    }
    return failed;
  }

  /** Reservation → sale (payment confirmed). */
  async commit(tx: Tx, orderId: string, lines: ReserveLine[]): Promise<void> {
    for (const line of lines) {
      const rows = await tx.$executeRaw`
        UPDATE product_variants
           SET stock_on_hand = stock_on_hand - ${line.quantity},
               reserved      = reserved - ${line.quantity}
         WHERE id = ${line.variantId}::uuid AND reserved >= ${line.quantity}
      `;
      if (rows !== 1) {
        // Reservation ledger and physical stock diverged — surface loudly.
        throw new Error(`inventory commit mismatch for variant ${line.variantId}`);
      }
      await tx.inventoryTransaction.create({
        data: { variantId: line.variantId, type: 'sell', quantity: line.quantity, orderId },
      });
    }
  }

  /** Reservation released (TTL expiry / cancel before payment). */
  async release(tx: Tx, orderId: string, lines: ReserveLine[]): Promise<void> {
    for (const line of lines) {
      await tx.$executeRaw`
        UPDATE product_variants
           SET reserved = reserved - ${line.quantity}
         WHERE id = ${line.variantId}::uuid AND reserved >= ${line.quantity}
      `;
      await tx.inventoryTransaction.create({
        data: { variantId: line.variantId, type: 'release', quantity: line.quantity, orderId },
      });
    }
  }

  /** Physical restock after refund. */
  async restock(tx: Tx, orderId: string, lines: ReserveLine[], actorUserId?: string): Promise<void> {
    for (const line of lines) {
      await tx.$executeRaw`
        UPDATE product_variants
           SET stock_on_hand = stock_on_hand + ${line.quantity}
         WHERE id = ${line.variantId}::uuid
      `;
      await tx.inventoryTransaction.create({
        data: {
          variantId: line.variantId,
          type: 'restock',
          quantity: line.quantity,
          orderId,
          actorType: actorUserId ? 'admin' : 'system',
          actorUserId,
        },
      });
    }
  }

  /** Lines of an order as recorded at creation time (order_items are the source). */
  async linesForOrder(tx: Tx, orderId: string): Promise<ReserveLine[]> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { productVariantId: true, quantity: true },
    });
    return items.map((i) => ({ variantId: i.productVariantId, quantity: i.quantity }));
  }

  /**
   * §15 manual stock correction (admin CRM). Own transaction: one conditional
   * UPDATE clamping at zero, then the ledger row. Unknown variant → 404.
   */
  async adjust(input: {
    variantId: string;
    delta: number;
    reason: string;
    actorUserId?: string;
  }): Promise<{ variantId: string; stockOnHand: number }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$executeRaw`
        UPDATE product_variants
           SET stock_on_hand = GREATEST(0, stock_on_hand + ${input.delta})
         WHERE id = ${input.variantId}::uuid
      `;
      if (rows !== 1) {
        throw new NotFoundException({ code: 'VARIANT_NOT_FOUND', message: 'Variant not found' });
      }
      await tx.inventoryTransaction.create({
        data: {
          variantId: input.variantId,
          type: 'adjust',
          quantity: input.delta,
          note: input.reason.slice(0, 255),
          actorType: input.actorUserId ? 'admin' : 'system',
          actorUserId: input.actorUserId,
        },
      });
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: input.variantId },
        select: { stockOnHand: true },
      });
      return { variantId: input.variantId, stockOnHand: variant.stockOnHand };
    });
  }

  /** Sweeper helper: pending orders whose reservations expired. */
  findExpiredPendingOrders(now = new Date()) {
    return this.prisma.order.findMany({
      where: {
        status: 'pending_payment',
        reservationExpiresAt: { lte: now },
      },
      select: { id: true, orderNumber: true, userId: true },
      take: 100,
    });
  }
}
