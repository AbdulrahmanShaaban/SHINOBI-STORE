import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export const SESSION_COOKIE = 'shinobi_session';

export function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  const cookies = req.headers.cookie;
  if (cookies) {
    for (const pair of cookies.split(';')) {
      const [name, ...rest] = pair.trim().split('=');
      if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

/**
 * SKELETON (Phase 0): authenticates requests via opaque session token
 * (httpOnly cookie for web, Bearer header for future clients) per plan §11.1.
 *
 * The session store does not exist yet — until Phase 5 implements
 * sessions this guard rejects every request. Do not attach it to routes
 * before then; it exists so the auth surface and its tests are shaped now.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // Phase 5: extractToken → sha256 → Redis-cached session lookup → attach req.user.
    throw new UnauthorizedException({
      code: 'SESSIONS_NOT_IMPLEMENTED',
      message: 'Authentication is not available yet',
    });
  }
}
