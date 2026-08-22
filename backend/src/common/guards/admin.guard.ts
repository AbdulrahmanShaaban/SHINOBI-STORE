import { ExecutionContext, Injectable } from '@nestjs/common';
import { SessionGuard } from './session.guard';

export const ADMIN_ROLES = new Set(['content_manager', 'admin', 'super_admin']);

/**
 * Phase 1 scaffolding for admin routes: extends the (not yet functional)
 * SessionGuard with a role gate. Until Phase 5 ships real sessions this
 * rejects every request — which is exactly the safe default.
 *
 * When sessions land: SessionGuard attaches `req.user`; AdminGuard then
 * verifies the role. The role check below is written now so flipping auth on
 * cannot accidentally leave admin routes role-unprotected.
 */
@Injectable()
export class AdminGuard extends SessionGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context); // throws 401 until Phase 5
    const req = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    return ADMIN_ROLES.has(req.user?.role ?? '');
  }
}
