import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Revenue counts delivered orders only — never pending_payment/cancelled/refunded. */
const REVENUE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'] as const;
const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_LIMIT = 20;
const RECENT_ORDERS_LIMIT = 10;

interface LowStockRow {
  variantId: string;
  sku: string;
  productName: string;
  stockOnHand: number;
  reserved: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [revenueAgg, statusGroups, lowStock, recentOrders] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: [...REVENUE_STATUSES] } },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      // stock_on_hand − reserved is the sellable number; not expressible as a
      // Prisma column-vs-column filter, so raw SQL it is.
      this.prisma.$queryRaw<LowStockRow[]>`
        SELECT v.id AS "variantId",
               v.sku AS "sku",
               p.name AS "productName",
               v.stock_on_hand AS "stockOnHand",
               v.reserved AS "reserved"
          FROM product_variants v
          JOIN products p ON p.id = v.product_id
         WHERE v.is_active
           AND v.stock_on_hand - v.reserved <= ${LOW_STOCK_THRESHOLD}
         ORDER BY v.stock_on_hand - v.reserved ASC, v.sku ASC
         LIMIT ${LOW_STOCK_LIMIT}
      `,
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_ORDERS_LIMIT,
        select: {
          orderNumber: true,
          status: true,
          totalCents: true,
          createdAt: true,
          contactEmail: true,
        },
      }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    for (const group of statusGroups) {
      ordersByStatus[group.status] = group._count._all;
    }

    return {
      revenueCents: revenueAgg._sum.totalCents ?? 0,
      ordersByStatus,
      lowStock,
      recentOrders,
    };
  }
}
