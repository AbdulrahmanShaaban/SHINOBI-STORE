import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionsService } from '../../modules/auth/sessions.service';
import type { AuthenticatedUser } from '../rbac/require-permissions.decorator';

export const SESSION_COOKIE = 'shinobi_session';

export function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  const cookies = req.headers.cookie;
  if (cookies) {
    for (const pair of cookies.split(';')) {
      const [name, ...rest] = pair.trim().split('=');
      if (name !== SESSION_COOKIE) continue;
      // Malformed percent-encoding must yield a clean 401, never a 500 (L-6).
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

const CSRF_HEADER = 'x-csrf-token';

/**
 * Real session authentication (§11.1): opaque token → SHA-256 → Redis-cached
 * lookup with DB fallback → attaches req.user. Rejects expired/revoked
 * sessions and inactive users.
 *
 * CSRF defense-in-depth for cookie-authenticated browsers: non-GET requests
 * must carry a custom header, which cross-site classic forms cannot set.
 * SameSite=Lax is the primary control; this is the belt to its braces.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser; sessionId?: string }>();
    const token = extractToken(req);
    if (!token) {
      throw unauthorized();
    }

    const session = await this.sessions.validate(token);
    if (!session) {
      throw unauthorized();
    }

    const method = req.method.toUpperCase();
    const usesCookie = !req.headers.authorization;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && usesCookie) {
      if (!req.headers[CSRF_HEADER]) {
        throw new UnauthorizedException({
          code: 'CSRF_TOKEN_MISSING',
          message: 'Missing CSRF header',
        });
      }
    }

    req.user = session.user;
    req.sessionId = session.sessionId;
    return true;
  }
}

function unauthorized(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'UNAUTHENTICATED',
    message: 'Authentication required',
  });
}
