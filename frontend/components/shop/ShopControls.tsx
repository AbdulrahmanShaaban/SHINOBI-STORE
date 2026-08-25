'use client';

import { useState } from 'react';
import { useShopNav } from '@/lib/use-shop-nav';
import { DEFAULT_SORT, SHOP_SORTS } from '@/lib/shop-url';
import { SearchSuggestions, useProductSuggestions } from '@/components/shared/ProductSearch';

const SORT_LABELS: Record<(typeof SHOP_SORTS)[number], string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  price_asc: 'Price: Low → High',
  price_desc: 'Price: High → Low',
  rating: 'Top Rated',
};

/**
 * Search-on-submit only: typing NEVER re-runs the query — the debounced call
 * while typing populates the live suggestions dropdown exclusively. Enter
 * (form submit) or picking a suggestion executes the full search. Remounts
 * via `key` whenever the URL-backed value changes, so back/forward
 * navigation re-syncs the input.
 */
export function SearchBox({ initialValue = '' }: { initialValue?: string }) {
  const { update } = useShopNav();
  const [value, setValue] = useState(initialValue);
  const { suggestions, loading } = useProductSuggestions(value);
  const showSuggestions = value.trim().length >= 2 && (loading || suggestions.length > 0);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
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
          onChange={(e) => setValue(e.target.value)}
          className="w-full lg:w-72 bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-2 text-sm text-[#F0F0F0] placeholder:text-[#6B6B80] focus:border-[#FF6B00] focus:outline-none"
        />
        {showSuggestions ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-[#2A2A3A] bg-[#12121A] shadow-2xl">
            <SearchSuggestions
              suggestions={suggestions}
              loading={loading}
              query={value}
              onSelect={(term) => update({ search: term })}
            />
          </div>
        ) : null}
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
