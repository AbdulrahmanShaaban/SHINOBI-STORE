import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCouponDto, ListCouponsQueryDto, UpdateCouponDto } from './dto/admin-coupons.dto';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class AdminCouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCouponsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.coupon.count(),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async create(actorUserId: string, ip: string | undefined, input: CreateCouponDto) {
    if (input.type === 'percent' && input.value > 90) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Percent coupons cap at 90',
      });
    }
    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          code: input.code.trim(),
          type: input.type,
          value: input.value,
          minSubtotalCents: input.minSubtotalCents,
          maxDiscountCents: input.maxDiscountCents,
          usageLimit: input.usageLimit,
          perUserLimit: input.perUserLimit,
          startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
          endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        },
      });
      await this.audit.record(
        actorUserId,
        'coupon.create',
        'coupon',
        coupon.id,
        { code: coupon.code, type: coupon.type, value: coupon.value },
        ip,
      );
      return coupon;
    } catch (err) {
      // codes are unique citext — the DB index is the race-safe authority.
      if (isUniqueViolation(err)) {
        throw new ConflictException({
          code: 'COUPON_CODE_TAKEN',
          message: 'A coupon with this code already exists',
        });
      }
      throw err;
    }
  }

  async update(actorUserId: string, ip: string | undefined, id: string, input: UpdateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException({ code: 'COUPON_NOT_FOUND', message: 'Coupon not found' });
    }
    const data: Prisma.CouponUpdateInput = {};
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.endsAt !== undefined) data.endsAt = new Date(input.endsAt);
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    const coupon = await this.prisma.coupon.update({ where: { id }, data });
    const diff: Record<string, unknown> = {};
    if (input.isActive !== undefined) diff.isActive = input.isActive;
    if (input.endsAt !== undefined) diff.endsAt = input.endsAt;
    if (input.usageLimit !== undefined) diff.usageLimit = input.usageLimit;
    await this.audit.record(actorUserId, 'coupon.update', 'coupon', id, diff, ip);
    return coupon;
  }
}
