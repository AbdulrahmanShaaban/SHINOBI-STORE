'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VariantAvailability } from './api';

export interface CartLine {
  /** A cart line is a concrete purchasable variant — never a bare product. */
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  /** Human label of the chosen options, e.g. "M / Akatsuki Red". */
  variantLabel: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
  /** Availability snapshot; re-checked against the server when the drawer opens. */
  maxQuantity: number;
  /**
   * Set by revalidate(): the variant no longer exists, was deactivated or is
   * sold out. Quarantined lines are excluded from subtotal/count and block
   * checkout until removed.
   */
  unavailable?: boolean;
  /** Ephemeral revalidation notice; cleared by any user mutation. */
  notice?: 'price-changed' | 'quantity-reduced' | null;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  addItem: (
    line: Omit<CartLine, 'quantity' | 'unavailable' | 'notice'> & { quantity?: number },
  ) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
  /** Applies live availability truth to every line (drawer-open revalidation). */
  revalidate: (statuses: VariantAvailability[]) => void;
  openCart: () => void;
  closeCart: () => void;
}

const clamp = (n: number, max: number) => Math.min(Math.max(1, Math.round(n)), Math.max(1, max));

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      addItem: (line) =>
        set((state) => {
          const qty = line.quantity ?? 1;
          const existing = state.lines.find((l) => l.variantId === line.variantId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.variantId === line.variantId
                  ? {
                      ...l,
                      unavailable: false,
                      notice: null,
                      quantity: clamp(l.quantity + qty, l.maxQuantity),
                    }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              { ...line, quantity: clamp(qty, line.maxQuantity), unavailable: false, notice: null },
            ],
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId
                    ? { ...l, quantity: clamp(quantity, l.maxQuantity), notice: null }
                    : l,
                ),
        })),
      removeLine: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      /**
       * Server truth wins over snapshots. Lines whose variant is absent from
       * the response are quarantined; present ones get fresh price/maxQuantity.
       * Notices record what changed so the drawer can show honest feedback.
       */
      revalidate: (statuses) =>
        set((state) => {
          const byId = new Map(statuses.map((s) => [s.variantId, s] as const));
          return {
            lines: state.lines.map((line) => {
              const live = byId.get(line.variantId);
              if (!live || !live.isActive || live.available <= 0) {
                if (line.unavailable) return line;
                return { ...line, unavailable: true, notice: null };
              }
              const notices: CartLine['notice'][] = [];
              const quantity = Math.min(line.quantity, live.available);
              if (quantity < line.quantity) notices.push('quantity-reduced');
              if (live.priceCents !== line.priceCents) notices.push('price-changed');
              return {
                ...line,
                unavailable: false,
                priceCents: live.priceCents,
                maxQuantity: live.available,
                quantity,
                notice: notices[0] ?? null,
              };
            }),
          };
        }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'shinobi-cart-v1',
      storage: createJSONStorage(() => localStorage),
      // Only lines persist — drawer open-state must not survive a reload,
      // and notices are ephemeral session feedback (nulled on write).
      partialize: (state) => ({
        lines: state.lines.map((l) => ({ ...l, notice: null })),
      }),
      // partialize governs writes only; persist's default shallow merge would
      // happily read stale keys back in (e.g. an old stored isOpen:true).
      // Constrain reads explicitly so older/corrupt entries can't leak fields.
      merge: (persisted, current) => ({
        ...current,
        lines:
          (Array.isArray((persisted as { lines?: CartLine[] })?.lines)
            ? (persisted as { lines: CartLine[] }).lines
            : current.lines) ?? [],
      }),
      // Hydration happens in <CartHydration /> after mount so SSR markup and
      // first client render agree (no hydration-mismatch flash).
      skipHydration: true,
    },
  ),
);

/** Purchasable items only — quarantined lines do not exist for checkout math. */
export const selectTotalItems = (s: CartState): number =>
  s.lines.reduce((sum, l) => sum + (l.unavailable ? 0 : l.quantity), 0);

export const selectSubtotalCents = (s: CartState): number =>
  s.lines.reduce((sum, l) => sum + (l.unavailable ? 0 : l.priceCents * l.quantity), 0);

export const selectHasUnavailable = (s: CartState): boolean =>
  s.lines.some((l) => l.unavailable);
