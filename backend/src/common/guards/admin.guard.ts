import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Role } from '../rbac/permissions';

export const ADMIN_ROLES: readonly Role[] = ['content_manager', 'order_manager', 'admin', 'super_admin'];

/**
 * Staff-role gate. Runs AFTER the global SessionGuard has attached req.user.
 * When used standalone (harnesses without the global chain) an absent user is
 * still a 401 — authentication state must never masquerade as authorization
 * failure. Routes needing finer control use @RequirePermissions.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    const role = req.user?.role as Role | undefined;
    if (!req.user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentication required' });
    }
    if (!role || !ADMIN_ROLES.includes(role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Staff access required' });
    }
    return true;
  }
}
