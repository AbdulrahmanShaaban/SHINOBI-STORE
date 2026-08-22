'use client';

import { useEffect, useRef, useState } from 'react';
import { useShopNav } from '@/lib/use-shop-nav';
import { DEFAULT_SORT, SHOP_SORTS } from '@/lib/shop-url';

const SORT_LABELS: Record<(typeof SHOP_SORTS)[number], string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  rating: 'Top Rated',
};

/** Debounced search — pushes the URL after typing settles; page always resets.
 *  Remounts via `key` whenever the URL-backed value changes, so back/forward
 *  navigation re-syncs the input without refs during render. */
export function SearchBox({ initialValue = '' }: { initialValue?: string }) {
  const { update } = useShopNav();
  const [value, setValue] = useState(initialValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        update({ search: value.trim() || undefined });
      }}
    >
      <label htmlFor="shop-search" className="sr-only">
        Search products
      </label>
      <div className="relative">
        <input
          id="shop-search"
          type="search"
          value={value}
          placeholder="Search the armory…"
          maxLength={100}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              update({ search: v.trim() || undefined });
            }, 350);
          }}
          className="w-full lg:w-72 bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
        />
      </div>
    </form>
  );
}

export function SortMenu({ id = 'shop-sort' }: { id?: string }) {
  const { params, setSort } = useShopNav();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Sort products
      </label>
      <select
        id={id}
        value={params.sort ?? DEFAULT_SORT}
        onChange={(e) => setSort(e.target.value)}
        className="bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-sm text-[#F0F0F0] focus:border-[#FF6B00] focus:outline-none cursor-pointer"
      >
        {SHOP_SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </>
  );
}
