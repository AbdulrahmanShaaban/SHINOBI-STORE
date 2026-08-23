import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';

/** Absolute session lifetime (§11.1). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Sliding renewal: sessions extended when less than this remains. */
const RENEWAL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_TTL_S = 5 * 60;

export interface ValidSession {
  sessionId: string;
  user: AuthenticatedUser;
  expiresAt: Date;
  renewed: boolean;
}

const sha256 = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex');

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Opaque 32-byte token; only its hash is ever persisted. */
  async create(userId: string, meta: { userAgent?: string; ip?: string }): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt,
        userAgent: meta.userAgent?.slice(0, 255),
        ip: meta.ip,
      },
    });
    return { token, expiresAt };
  }

  /**
   * Cache-first validation. Returns null for unknown/expired/revoked sessions
   * and inactive users. Extends sliding window lazily when close to expiry.
   */
  async validate(token: string): Promise<ValidSession | null> {
    if (!token || token.length < 20 || token.length > 128) return null;
    const tokenHash = sha256(token);

    const cached = await this.fromCache(tokenHash);
    if (cached) return cached;

    const row = await this.prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: { id: true, email: true, fullName: true, role: true, isActive: true, deletedAt: true },
        },
      },
    });
    if (!row || row.revokedAt || row.expiresAt <= new Date()) return null;
    if (!row.user.isActive || row.user.deletedAt) return null;

    const session: ValidSession = {
      sessionId: row.id,
      expiresAt: row.expiresAt,
      renewed: false,
      user: {
        id: row.user.id,
        email: row.user.email,
        fullName: row.user.fullName,
        role: row.user.role as AuthenticatedUser['role'],
      },
    };

    await this.toCache(tokenHash, session);

    // Sliding renewal (fire-and-forget): extend when inside the renewal window.
    if (row.expiresAt.getTime() - Date.now() < RENEWAL_WINDOW_MS) {
      const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
      void this.prisma.session
        .update({ where: { id: row.id }, data: { expiresAt: newExpiry } })
        .catch(() => undefined);
      session.expiresAt = newExpiry;
      session.renewed = true;
    }
    return session;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.invalidateCache(tokenHash);
  }

  async revokeById(sessionId: string): Promise<void> {
    const row = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { tokenHash: true },
    });
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (row) await this.invalidateCache(row.tokenHash);
  }

  /** "Logout all" — revokes every live session for the user instantly. */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Cache entries carry no revocation info — flush the namespace.
    await this.redis.client.del('sessions:*').catch(() => undefined);
    return result.count;
  }

  private cacheKey(tokenHash: string): string {
    return `session:${tokenHash}`;
  }

  private async fromCache(tokenHash: string): Promise<ValidSession | null> {
    try {
      const raw = await this.redis.client.get(this.cacheKey(tokenHash));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { sessionId: string; user: AuthenticatedUser; expiresAt: string };
      const expiresAt = new Date(parsed.expiresAt);
      if (expiresAt <= new Date()) return null;
      return { sessionId: parsed.sessionId, user: parsed.user, expiresAt, renewed: false };
    } catch {
      return null; // cache is best-effort
    }
  }

  private async toCache(tokenHash: string, session: ValidSession): Promise<void> {
    try {
      await this.redis.client.set(
        this.cacheKey(tokenHash),
        JSON.stringify({ sessionId: session.sessionId, user: session.user, expiresAt: session.expiresAt }),
        'EX',
        CACHE_TTL_S,
      );
    } catch {
      // cache is best-effort
    }
  }

  private async invalidateCache(tokenHash: string): Promise<void> {
    try {
      await this.redis.client.del(this.cacheKey(tokenHash));
    } catch {
      // cache is best-effort
    }
  }
}
