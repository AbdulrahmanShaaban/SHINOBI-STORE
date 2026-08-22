'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ShopParams } from './api';
import { DEFAULT_SORT, parseShopParams, shopHref } from './shop-url';

/**
 * Client-side navigation over the §18 URL contract.
 * The URL is the single source of truth: every control derives its state from
 * searchParams and mutates by pushing a canonical href — shareable,
 * back/forward-safe by construction.
 */
export function useShopNav() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const params = parseShopParams(Object.fromEntries(searchParams.entries()));

  /** Pushes a new shop URL. Page resets unless the caller is paginating. */
  const update = useCallback(
    (changes: Partial<ShopParams>, options?: { keepPage?: boolean }) => {
      const next: ShopParams = { ...params, ...changes };
      if (!options?.keepPage && !('page' in changes)) next.page = undefined;
      router.push(shopHref(next), { scroll: false });
    },
    [params, router],
  );

  const toggleDimension = useCallback(
    (dimension: 'category' | 'anime' | 'character' | 'tag', slug: string | null) =>
      update({ [dimension]: slug ?? undefined }),
    [update],
  );

  const setSort = useCallback((sort: string) => update({ sort: sort === DEFAULT_SORT ? undefined : sort }), [update]);

  return { params, update, toggleDimension, setSort };
}
