import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import { hasPermission, type Role } from './permissions';
import type { AuthenticatedUser } from './require-permissions.decorator';

/**
 * Enforces @RequirePermissions metadata. Runs AFTER SessionGuard (which must
 * have attached req.user). Roles never appear in route code — only here,
 * via the matrix.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Routes without permission metadata are not guarded by this class.
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = req.user;
    if (!user) {
      // SessionGuard should have run first; reaching here is a wiring bug.
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Missing authentication' });
    }
    const role = user.role as Role;
    const ok = required.every((permission) => hasPermission(role, permission));
    if (!ok) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    return true;
  }
}
