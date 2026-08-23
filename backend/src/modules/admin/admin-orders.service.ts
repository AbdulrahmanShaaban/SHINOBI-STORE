import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, order_status as OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from '../orders/orders.service';
import { AdminOrderQueryDto, OrderTransitionDto } from './dto/admin-orders.dto';

export type TransitionTarget = 'processing' | 'shipped' | 'delivered' | 'cancelled';

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdminOrderQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status as OrderStatus } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q, mode: 'insensitive' } },
              { contactEmail: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalCents: true,
          currency: true,
          createdAt: true,
          contactEmail: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        totalCents: row.totalCents,
        currency: row.currency,
        createdAt: row.createdAt,
        contactEmail: row.contactEmail,
        itemCount: row._count.items,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async detail(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        payments: { select: { status: true } },
      },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    return order;
  }

  /**
   * Resolves the order by its public number first (404 when unknown), then
   * delegates to the whitelisted state machine — illegal moves surface as the
   * service's 409 untouched. Successful moves are audited.
   */
  async transition(
    actorUserId: string,
    ip: string | undefined,
    orderNumber: string,
    body: OrderTransitionDto,
  ): Promise<{ orderNumber: string; status: TransitionTarget }> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true },
    });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    }
    await this.orders.transition(order.id, body.to, {
      actorType: 'admin',
      actorUserId,
      message: body.note,
    });
    await this.audit.record(
      actorUserId,
      'order.transition',
      'order',
      order.id,
      { from: order.status, to: body.to },
      ip,
    );
    return { orderNumber, status: body.to };
  }
}
