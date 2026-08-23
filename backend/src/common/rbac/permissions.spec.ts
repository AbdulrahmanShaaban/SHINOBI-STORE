import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, PERMISSIONS, ROLES } from './permissions';
import { PermissionsGuard } from './permissions.guard';

/**
 * §11.2 — the role × permission matrix is the single authorization truth.
 * This spec pins its observable contract: every role against a representative
 * permission from each domain, wildcard semantics, and the guard's wiring.
 */

describe('hasPermission — matrix (role × representative permission)', () => {
  it('exposes exactly the five declared roles', () => {
    expect([...ROLES]).toEqual([
      'customer',
      'content_manager',
      'order_manager',
      'admin',
      'super_admin',
    ]);
  });

  describe('super_admin', () => {
    it('satisfies every permission via the * grant', () => {
      expect(hasPermission('super_admin', '*')).toBe(true);
      expect(hasPermission('super_admin', 'orders:r')).toBe(true);
      expect(hasPermission('super_admin', 'inventory:adjust')).toBe(true);
      expect(hasPermission('super_admin', 'coupons:w')).toBe(true);
      expect(hasPermission('super_admin', 'admins:r')).toBe(true);
    });
  });

  describe('admin', () => {
    it('grants staff domains incl. the orders:* wildcard family', () => {
      expect(hasPermission('admin', 'products:w')).toBe(true);
      expect(hasPermission('admin', 'orders:r')).toBe(true);
      expect(hasPermission('admin', 'orders:transition')).toBe(true);
      expect(hasPermission('admin', 'customers:r')).toBe(true);
      expect(hasPermission('admin', 'inventory:w')).toBe(true);
      expect(hasPermission('admin', 'coupons:w')).toBe(true);
      expect(hasPermission('admin', 'admins:r')).toBe(true);
    });

    it('does not hold inventory:adjust (matrix gap: only order_manager does)', () => {
      expect(hasPermission('admin', 'inventory:adjust')).toBe(false);
    });
  });

  describe('order_manager', () => {
    it('runs fulfillment: orders read/transition, adjust, refund requests', () => {
      expect(hasPermission('order_manager', 'orders:r')).toBe(true);
      expect(hasPermission('order_manager', 'orders:transition')).toBe(true);
      expect(hasPermission('order_manager', 'customers:r')).toBe(true);
      expect(hasPermission('order_manager', 'inventory:adjust')).toBe(true);
      expect(hasPermission('order_manager', 'refunds:request')).toBe(true);
      expect(hasPermission('order_manager', 'coupons:r')).toBe(true);
    });

    it('cannot write products/coupons or read admin management', () => {
      expect(hasPermission('order_manager', 'products:w')).toBe(false);
      expect(hasPermission('order_manager', 'coupons:w')).toBe(false);
      expect(hasPermission('order_manager', 'admins:r')).toBe(false);
      expect(hasPermission('order_manager', 'inventory:w')).toBe(false);
    });
  });

  describe('content_manager', () => {
    it('owns catalog content but nothing commerce-side', () => {
      expect(hasPermission('content_manager', 'products:r')).toBe(true);
      expect(hasPermission('content_manager', 'content:w')).toBe(true);
      expect(hasPermission('content_manager', 'media:w')).toBe(true);

      expect(hasPermission('content_manager', 'orders:r')).toBe(false);
      expect(hasPermission('content_manager', 'customers:r')).toBe(false);
      expect(hasPermission('content_manager', 'coupons:r')).toBe(false);
    });
  });

  describe('customer', () => {
    it('has self-service grants only, with cart:* as a domain wildcard', () => {
      expect(hasPermission('customer', 'orders:own')).toBe(true);
      expect(hasPermission('customer', 'reviews:create')).toBe(true);
      expect(hasPermission('customer', 'account:w')).toBe(true);
      expect(hasPermission('customer', 'cart:add')).toBe(true);
      expect(hasPermission('customer', 'cart:anything')).toBe(true);
    });

    it('lacks every staff permission (orders:r included)', () => {
      expect(hasPermission('customer', 'orders:r')).toBe(false);
      expect(hasPermission('customer', 'orders:transition')).toBe(false);
      expect(hasPermission('customer', 'customers:r')).toBe(false);
      expect(hasPermission('customer', 'coupons:w')).toBe(false);
      expect(hasPermission('customer', 'admins:r')).toBe(false);
      expect(hasPermission('customer', 'inventory:adjust')).toBe(false);
    });
  });
});

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  function contextWith(user?: { id: string; email: string; fullName: string; role: string }) {
    return {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  function guardFor(required: string[] | undefined) {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(required);
    return new PermissionsGuard(reflector);
  }

  const staff = { id: 'u1', email: 'n@k.jp', fullName: 'N', role: 'order_manager' };
  const customer = { id: 'u2', email: 'c@k.jp', fullName: 'C', role: 'customer' };

  it('passes routes without permission metadata', () => {
    expect(guardFor(undefined).canActivate(contextWith())).toBe(true);
    expect(guardFor([]).canActivate(contextWith(customer))).toBe(true);
  });

  it('requires ALL listed permissions', () => {
    // order_manager holds both → passes
    expect(guardFor(['orders:r', 'orders:transition']).canActivate(contextWith(staff))).toBe(
      true,
    );
    // holds one of two → fails
    expect(() =>
      guardFor(['orders:r', 'coupons:w']).canActivate(contextWith(staff)),
    ).toThrow(ForbiddenException);
  });

  it('rejects missing authentication with FORBIDDEN (wiring bug signal)', () => {
    expect(() => guardFor(['orders:r']).canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects insufficient roles with the stable error code', () => {
    try {
      guardFor(['orders:r']).canActivate(contextWith(customer));
      fail('expected ForbiddenException');
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
  });

  it('mirrors the matrix through the guard for each role', () => {
    const cases: Array<[string, string[], boolean]> = [
      ['super_admin', ['admins:r'], true],
      ['admin', ['coupons:w'], true],
      ['order_manager', ['inventory:adjust'], true],
      ['content_manager', ['content:w'], true],
      ['customer', ['orders:own'], true],
      ['customer', ['orders:r'], false],
      ['order_manager', ['admins:r'], false],
    ];
    for (const [role, required, expected] of cases) {
      const activate = () =>
        guardFor(required).canActivate(
          contextWith({ id: 'x', email: 'x@k.jp', fullName: 'X', role }),
        );
      if (expected) expect(activate()).toBe(true);
      else expect(activate).toThrow(ForbiddenException);
    }
  });

  it('keeps every declared role resolvable (no dangling matrix entries)', () => {
    for (const role of ROLES) {
      expect(Array.isArray(PERMISSIONS[role])).toBe(true);
    }
  });
});
