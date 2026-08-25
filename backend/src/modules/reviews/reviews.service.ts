import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { hasPermission, type Role } from '../../common/rbac/permissions';
import { CreateReviewDto } from './dto/review.dto';

/**
 * §10.3 product reviews. Plain request/response — no realtime anywhere: a new
 * review becomes visible to other visitors only after it is APPROVED by staff
 * and the page is refetched. That is the intended behavior, not a gap.
 *
 * Visibility model:
 * - create  → authenticated customers only (`reviews:create`), one per user
 *             per product (DB unique [userId, productId]; surfaced as a clean
 *             409, never a raw constraint error). New reviews start `pending`.
 * - list    → public; non-staff see `approved` only. Staff (`reviews:w`) also
 *             see pending/rejected so they can preview before moderating.
 * - moderate→ staff (`reviews:w`); approving/rejecting recomputes the
 *             product's ratingAvg/reviewCount from APPROVED reviews only, so
 *             the storefront aggregate always reflects live truth instead of
 *             seed data.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForProduct(slug: string, viewer?: { role: Role }) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }

    const staff = viewer ? hasPermission(viewer.role, 'reviews:w') : false;
    const [items, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId: product.id, ...(staff ? {} : { status: 'approved' }) },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { fullName: true } } },
      }),
      this.prisma.review.aggregate({
        where: { productId: product.id, status: 'approved' },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      items: items.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: review.status,
        createdAt: review.createdAt,
        author: review.user.fullName,
      })),
      average: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : null,
      total: aggregate._count,
    };
  }

  async create(slug: string, userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!product || product.status !== 'active') {
      throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'Product not found' });
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          productId: product.id,
          userId,
          rating: dto.rating,
          title: dto.title?.trim() || undefined,
          body: dto.body.trim(),
          // status defaults to `pending` — staff approval gates visibility.
        },
        select: { id: true, status: true, createdAt: true },
      });
      return review;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'REVIEW_EXISTS',
          message: 'You have already reviewed this product.',
        });
      }
      throw err;
    }
  }

  async listAdmin(status: 'pending' | 'approved' | 'rejected' | undefined, page = 1) {
    const limit = 20;
    const where = status ? { status } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
          product: { select: { slug: true, name: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    return {
      items: items.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
        status: review.status,
        createdAt: review.createdAt,
        author: review.user.fullName,
        authorEmail: review.user.email,
        productSlug: review.product.slug,
        productName: review.product.name,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  /**
   * Approve/reject + aggregate write-back in ONE transaction so the storefront
   * aggregate can never drift from the approved set. Idempotent: moderating
   * to the current status is a no-op that still returns fresh aggregates.
   */
  async moderate(
    id: string,
    status: 'approved' | 'rejected',
    actorUserId: string,
    ip?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({ where: { id }, select: { id: true, productId: true, status: true } });
      if (!review) {
        throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Review not found' });
      }
      await tx.review.update({ where: { id }, data: { status } });
      const aggregate = await tx.review.aggregate({
        where: { productId: review.productId, status: 'approved' },
        _avg: { rating: true },
        _count: true,
      });
      await tx.product.update({
        where: { id: review.productId },
        data: {
          ratingAvg: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(2)) : 0,
          reviewCount: aggregate._count,
        },
        select: { slug: true },
      });
      return { previousStatus: review.status, average: aggregate._avg.rating, count: aggregate._count };
    });

    // Audit AFTER commit; failures are swallowed by AuditService by design.
    await this.audit?.record(
      actorUserId,
      `review.${status === 'approved' ? 'approve' : 'reject'}`,
      'review',
      id,
      { from: result.previousStatus, to: status },
      ip,
    );

    return { id, status, ...result };
  }
}
