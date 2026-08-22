'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  /** Availability snapshot at add-time; clamped again when availability is re-checked. */
  maxQuantity: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  addItem: (line: Omit<CartLine, 'quantity'> & { quantity?: number }) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeLine: (variantId: string) => void;
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
                  ? { ...l, quantity: clamp(l.quantity + qty, l.maxQuantity) }
                  : l,
              ),
            };
          }
          return {
            lines: [...state.lines, { ...line, quantity: clamp(qty, line.maxQuantity) }],
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId
                    ? { ...l, quantity: clamp(quantity, l.maxQuantity) }
                    : l,
                ),
        })),
      removeLine: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'shinobi-cart-v1',
      storage: createJSONStorage(() => localStorage),
      // Only lines persist — drawer open-state must not survive a reload.
      partialize: (state) => ({ lines: state.lines }),
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

export const selectTotalItems = (s: CartState): number =>
  s.lines.reduce((sum, l) => sum + l.quantity, 0);

export const selectSubtotalCents = (s: CartState): number =>
  s.lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
