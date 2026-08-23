import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { argon2id, argon2Verify } from 'hash-wasm';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { logger } from '../../common/logger/logger';
import { SessionsService } from './sessions.service';

/**
 * OWASP-aligned argon2id parameters (64 MiB, t=2, p=1).
 */
const ARGON_OPTS = {
  parallelism: 1,
  iterations: 2,
  memorySize: 65536,
  hashLength: 32,
  outputType: 'encoded' as const,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly redis: RedisService,
  ) {}

  async register(input: { email: string; password: string; fullName: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await this.hashPassword(input.password);

    try {
      await this.prisma.user.create({
        data: { email, passwordHash, fullName: input.fullName.trim() },
      });
    } catch (err) {
      // Unique violation → the email already exists. Respond identically to a
      // fresh registration (§12 enumeration resistance), but burn comparable
      // CPU so response timing does not leak existence.
      if (this.isUniqueViolation(err)) {
        await this.hashPassword(input.password).catch(() => undefined);
        return;
      }
      throw err;
    }
  }

  /**
   * Verifies credentials and creates the session. Every failure path returns
   * the identical error with comparable work done — never "no such user" vs
   * "wrong password".
   */
  async login(
    input: { email: string; password: string },
    meta: { userAgent?: string; ip?: string },
  ): Promise<{ token: string; expiresAt: Date; user: { id: string; email: string; fullName: string; role: string } }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, role: true, passwordHash: true, isActive: true, deletedAt: true },
    });

    if (!user || !user.isActive || user.deletedAt) {
      await this.burnCpu();
      throw this.invalidCredentials();
    }

    const valid = await this.verifyPassword(user.passwordHash, input.password);
    if (!valid) throw this.invalidCredentials();

    const { token, expiresAt } = await this.sessions.create(user.id, meta);
    return {
      token,
      expiresAt,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  /** Always succeeds from the caller's perspective (§12 enumeration resistance). */
  async requestPasswordReset(email: string): Promise<{ devToken?: string }> {
    const normalized = email.trim().toLowerCase();
    let devToken: string | undefined;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: normalized },
        select: { id: true, isActive: true, deletedAt: true },
      });
      if (user?.isActive && !user.deletedAt) {
        const token = randomBytes(24).toString('base64url');
        await this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.hashToken(token),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });
        // Phase 6 replaces this with the queued email. Dev/test echo only.
        if (process.env.NODE_ENV !== 'production') devToken = token;
        logger.info({ userId: user.id }, 'password reset requested');
      } else if (!user) {
        // Equalize timing for unknown emails.
        await this.burnCpu();
      }
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'password reset request failed');
    }

    return devToken ? { devToken } : {};
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    // Single-use claim happens atomically in the UPDATE's WHERE clause —
    // two concurrent resets can never both consume one token.
    const claimed = await this.prisma.$queryRaw<{ id: string; user_id: string }[]>`
      UPDATE "password_reset_tokens"
      SET "used_at" = NOW()
      WHERE "token_hash" = ${tokenHash}
        AND "used_at" IS NULL
        AND "expires_at" > NOW()
      RETURNING "id", "user_id"
    `;
    const claim = claimed[0];
    if (!claim) {
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        message: 'This reset link is invalid or has expired',
      });
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: claim.user_id }, data: { passwordHash } }),
      // A password change invalidates every existing session instantly (§11.1).
      this.prisma.session.updateMany({
        where: { userId: claim.user_id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: claim.user_id, usedAt: null }, // other live tokens die too
      }),
    ]);
    // M-1 fix: flush each live session's exact cache key — the DB revoke alone
    // leaves Redis-authenticated stale tokens alive for the cache TTL.
    const stillLive = await this.prisma.session.findMany({
      where: { userId: claim.user_id },
      select: { tokenHash: true },
    });
    for (const row of stillLive) {
      await this.sessions.invalidateCache(row.tokenHash).catch(() => undefined);
    }
  }

  /**
   * Per-identifier throttle (§16): 5 auth attempts / minute / identifier.
   * IP throttling is handled by ThrottlerGuard route decorators. Fails open
   * when Redis is down — availability over strictness, documented trade-off.
   */
  async checkIdentifierThrottle(identifier: string): Promise<boolean> {
    const key = `auth:attempt:${identifier.trim().toLowerCase()}:${Math.floor(Date.now() / 60_000)}`;
    try {
      const count = await this.redis.client.incr(key);
      if (count === 1) await this.redis.client.expire(key, 65);
      return count <= 5;
    } catch {
      return true;
    }
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  }

  private async burnCpu(): Promise<void> {
    await argon2id({
      password: 'timing-equalizer',
      salt: randomBytes(16),
      ...ARGON_OPTS,
    }).catch(() => undefined);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2id({
      password,
      salt: randomBytes(16),
      ...ARGON_OPTS,
    });
  }

  private async verifyPassword(encodedHash: string, password: string): Promise<boolean> {
    try {
      return await argon2Verify({ password, hash: encodedHash });
    } catch {
      return false;
    }
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    );
  }
}
