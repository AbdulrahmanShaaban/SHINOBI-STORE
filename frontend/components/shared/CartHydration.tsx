'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart-store';

/** Rehydrates the persisted cart after mount (see skipHydration in cart-store). */
export default function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
