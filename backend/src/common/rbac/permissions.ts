/**
 * §11.2 — the single source of authorization truth. Adding a role means
 * editing this matrix and assigning the enum value; scattered role checks
 * (`if (isAdmin)`) are explicitly banned.
 */
export const ROLES = ['customer', 'content_manager', 'order_manager', 'admin', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS: Record<Role, readonly string[]> = {
  super_admin: ['*'],
  admin: [
    'products:r',
    'products:w',
    'orders:*',
    'customers:r',
    'inventory:w',
    'reviews:w',
    'coupons:w',
    'content:w',
    'media:w',
    'admins:r',
  ],
  content_manager: [
    'products:r',
    'content:w',
    'media:w',
    'categories:w',
    'anime:w',
    'characters:w',
    'reviews:w',
  ],
  order_manager: [
    'orders:r',
    'orders:transition',
    'customers:r',
    'inventory:adjust',
    'refunds:request',
    'coupons:r',
  ],
  customer: ['orders:own', 'reviews:create', 'cart:*', 'account:w'],
};

/** Wildcard-aware check: grant 'orders:*' satisfies 'orders:w'. */
export function hasPermission(role: Role, required: string): boolean {
  const grants = PERMISSIONS[role] ?? [];
  const [domain] = required.split(':');
  return (
    grants.includes('*') ||
    grants.includes(required) ||
    grants.includes(`${domain}:*`)
  );
}
