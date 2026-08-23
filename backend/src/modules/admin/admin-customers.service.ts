import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../auth/sessions.service';
import { AdminCustomerQueryDto, BanCustomerDto } from './dto/admin-customers.dto';

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
  ) {}

  async list(query: AdminCustomerQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.UserWhereInput = {
      role: 'customer',
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { fullName: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map(({ _count, ...user }) => ({ ...user, orderCount: _count.orders })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { orderNumber: true, status: true, totalCents: true, createdAt: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }
    return user;
  }

  /** Banning is customer-scoped: staff accounts are out of reach (404 alike). */
  async ban(actorUserId: string, ip: string | undefined, id: string, body: BanCustomerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'customer') {
      throw new NotFoundException({ code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' });
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
    // A banned account loses every live session immediately.
    await this.sessions.revokeAllForUser(id);
    await this.audit.record(
      actorUserId,
      'customer.ban',
      'user',
      id,
      { reason: body.reason.slice(0, 255) },
      ip,
    );
    return updated;
  }
}
