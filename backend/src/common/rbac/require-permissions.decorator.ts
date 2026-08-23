import { SetMetadata } from '@nestjs/common';
import type { Role } from './permissions';

export const PERMISSIONS_KEY = 'required_permissions';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/**
 * Declares the permissions a route requires, e.g.
 *   @RequirePermissions('products:w')
 * Multiple arguments = ALL of them must hold. Ownership-scoped needs like
 * 'orders:own' are satisfied for the owning user via resource guards.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
