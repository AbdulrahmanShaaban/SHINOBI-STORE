import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CACHE_TTL_SECONDS, CacheService } from '../cache/cache.service';
import { SECTION_KEYS, validateConfig } from './section-schemas';

export interface UpdateSectionInput {
  isVisible?: boolean;
  sortOrder?: number;
  config?: Record<string, unknown>;
}

/**
 * §Phase 8 homepage content writes. `config` never touches the DB without
 * passing the per-key schema in section-schemas.ts — that module is the single
 * source of truth; this service is only its enforcement point.
 */
@Injectable()
export class AdminContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  /** All seven sections, ordered by key — stable for admin list screens. */
  listAll() {
    return this.prisma.homepageSection.findMany({ orderBy: { key: 'asc' } });
  }

  async update(
    actorId: string | null,
    ip: string | undefined,
    key: string,
    input: UpdateSectionInput,
  ) {
    if (!SECTION_KEYS.includes(key as (typeof SECTION_KEYS)[number])) {
      throw new NotFoundException({ code: 'SECTION_NOT_FOUND', message: 'Unknown section key' });
    }

    const section = await this.prisma.homepageSection.findUnique({ where: { key } });
    if (!section) {
      throw new NotFoundException({ code: 'SECTION_NOT_FOUND', message: 'Section not found' });
    }

    const data: Prisma.HomepageSectionUncheckedUpdateInput = {};
    const diff: Record<string, unknown> = {};

    if (input.isVisible !== undefined) {
      data.isVisible = input.isVisible;
      diff.isVisible = input.isVisible;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = input.sortOrder;
      diff.sortOrder = input.sortOrder;
    }
    if (input.config !== undefined) {
      // Schema gate — a rejected payload becomes 400 VALIDATION_ERROR + reason.
      const result = validateConfig(key, input.config);
      if (!result.ok) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: result.error });
      }
      data.config = result.value as Prisma.InputJsonValue;
      diff.config = result.value;
    }

    const updated = await this.prisma.homepageSection.update({ where: { key }, data });

    // §16.1: any content mutation invalidates every rendered homepage entry
    // by bumping the generation counter. Best-effort — Redis-down must not
    // fail the mutation (the 24h TTL is the backstop).
    await this.cache.bumpHomeVersion();

    await this.audit.record(actorId, 'content.update', 'homepage_section', section.id, diff, ip);

    return updated;
  }

  /** Public storefront read: visible sections in render order. */
  listVisible() {
    return this.prisma.homepageSection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
      select: { key: true, isVisible: true, sortOrder: true, config: true },
    });
  }

  /**
   * Read-through public homepage (§16.1): versioned key `content:home:v{n}`
   * with a 24h TTL; admin edits take effect immediately via the version bump
   * in update(), not by waiting out the TTL.
   */
  async listVisiblePublic() {
    const key = await this.cache.homeKey();
    return this.cache.cached(key, CACHE_TTL_SECONDS.home, () => this.listVisible());
  }
}
