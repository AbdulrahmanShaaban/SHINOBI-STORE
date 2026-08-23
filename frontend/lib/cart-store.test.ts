/**
 * Cart reducer math (plan Phase 4): add/merge, clamping, removal,
 * revalidation semantics and purchasable-only selectors.
 * The store is a module-level zustand singleton — each test resets it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { selectHasUnavailable, selectSubtotalCents, selectTotalItems, useCartStore } from './cart-store';
import type { VariantAvailability } from './api';

const line = (overrides: Partial<Parameters<typeof addLine>[0]> = {}) => ({
  variantId: 'v1',
  productId: 'p1',
  slug: 'hoodie',
  name: 'Hoodie',
  variantLabel: 'M',
  priceCents: 2999,
  imageUrl: '/x.png',
  maxQuantity: 10,
  ...overrides,
});

const addLine = useCartStore.getState().addItem;

const state = () => useCartStore.getState();

beforeEach(() => {
  useCartStore.setState({ lines: [], isOpen: false });
});

describe('addItem', () => {
  it('adds a new line with quantity clamped to the availability snapshot', () => {
    addLine(line({ quantity: 99 }));

    expect(state().lines).toHaveLength(1);
    expect(state().lines[0].quantity).toBe(10);
  });

  it('merges same-variant adds into one line', () => {
    addLine(line({ quantity: 2 }));
    addLine(line({ quantity: 3 }));

    expect(state().lines).toHaveLength(1);
    expect(state().lines[0].quantity).toBe(5);
  });

  it('clamped merge cannot exceed maxQuantity', () => {
    addLine(line({ quantity: 8 }));
    addLine(line({ quantity: 8 }));

    expect(state().lines[0].quantity).toBe(10);
  });

  it('revives a quarantined line when the item is re-added', () => {
    addLine(line());
    useCartStore.setState({
      lines: [{ ...state().lines[0], unavailable: true }],
    });

    addLine(line({ quantity: 2 }));

    expect(state().lines[0].unavailable).toBe(false);
  });
});

describe('setQuantity / removeLine', () => {
  it('removes the line at zero or below', () => {
    addLine(line());
    state().setQuantity('v1', 0);

    expect(state().lines).toHaveLength(0);
  });

  it('never exceeds maxQuantity via the stepper', () => {
    addLine(line({ quantity: 5 }));
    state().setQuantity('v1', 50);

    expect(state().lines[0].quantity).toBe(10);
  });

  it('removeLine drops exactly its own variant line', () => {
    addLine(line({ variantId: 'a' }));
    addLine(line({ variantId: 'b' }));
    state().removeLine('a');

    expect(state().lines.map((l) => l.variantId)).toEqual(['b']);
  });
});

describe('revalidate — server truth wins over snapshots', () => {
  it('quarantines lines whose variant is absent from the response', () => {
    addLine(line({ variantId: 'ghost' }));
    state().revalidate([]);

    expect(state().lines[0].unavailable).toBe(true);
    // Quarantined items are invisible to checkout math…
    expect(selectSubtotalCents(state())).toBe(0);
    expect(selectTotalItems(state())).toBe(0);
    // …but stay in the cart so the user can see and remove them.
    expect(state().lines).toHaveLength(1);
  });

  it('flags sold-out and deactivated variants as unavailable', () => {
    addLine(line({ variantId: 'sold' }));
    addLine(line({ variantId: 'off' }));
    const statuses: VariantAvailability[] = [
      { variantId: 'sold', isActive: true, priceCents: 2999, compareAtPriceCents: null, available: 0, productSlug: 'hoodie' },
      { variantId: 'off', isActive: false, priceCents: 2999, compareAtPriceCents: null, available: 5, productSlug: 'hoodie' },
    ];
    state().revalidate(statuses);

    expect(state().lines.every((l) => l.unavailable)).toBe(true);
    expect(selectHasUnavailable(state())).toBe(true);
  });

  it('clamps quantity down to live stock and records the reduction', () => {
    addLine(line({ quantity: 5 }));
    state().revalidate([
      { variantId: 'v1', isActive: true, priceCents: 2999, compareAtPriceCents: null, available: 2, productSlug: 'hoodie' },
    ]);

    expect(state().lines[0].quantity).toBe(2);
    expect(state().lines[0].maxQuantity).toBe(2);
    expect(state().lines[0].notice).toBe('quantity-reduced');
  });

  it('refreshes changed prices and records the change without touching quantity', () => {
    addLine(line({ priceCents: 2999, quantity: 3 }));
    state().revalidate([
      { variantId: 'v1', isActive: true, priceCents: 3499, compareAtPriceCents: null, available: 10, productSlug: 'hoodie' },
    ]);

    expect(state().lines[0].priceCents).toBe(3499);
    expect(state().lines[0].quantity).toBe(3);
    expect(state().lines[0].notice).toBe('price-changed');
    expect(selectSubtotalCents(state())).toBe(3499 * 3);
  });

  it('clears quarantine when stock returns', () => {
    addLine(line({ variantId: 'back' }));
    state().revalidate([]);
    state().revalidate([
      { variantId: 'back', isActive: true, priceCents: 2999, compareAtPriceCents: null, available: 4, productSlug: 'hoodie' },
    ]);

    expect(state().lines[0].unavailable).toBe(false);
    expect(selectTotalItems(state())).toBeGreaterThan(0);
  });

  it('user mutations clear stale notices', () => {
    addLine(line({ quantity: 5 }));
    state().revalidate([
      { variantId: 'v1', isActive: true, priceCents: 2999, compareAtPriceCents: null, available: 2, productSlug: 'hoodie' },
    ]);
    state().setQuantity('v1', 1);

    expect(state().lines[0].notice).toBeNull();
  });
});

describe('selectors', () => {
  it('subtotal counts only purchasable lines at their current prices', () => {
    addLine(line({ variantId: 'ok', quantity: 2 }));
    addLine(line({ variantId: 'dead', quantity: 3, priceCents: 999 }));
    state().revalidate([
      { variantId: 'ok', isActive: true, priceCents: 2999, compareAtPriceCents: null, available: 10, productSlug: 'hoodie' },
    ]);

    expect(selectSubtotalCents(state())).toBe(2999 * 2);
  });
});
