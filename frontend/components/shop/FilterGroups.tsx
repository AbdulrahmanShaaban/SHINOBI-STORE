'use client';

import { useShopNav } from '@/lib/use-shop-nav';
import type { ProductFacets, ShopParams } from '@/lib/api';

const DIMENSIONS = [
  { key: 'category', label: 'Category' },
  { key: 'anime', label: 'Anime' },
  { key: 'character', label: 'Character' },
  { key: 'tag', label: 'Tags' },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]['key'];

const FACET_KEY: Record<DimensionKey, keyof ProductFacets> = {
  category: 'categories',
  anime: 'animes',
  character: 'characters',
  tag: 'tags',
};

function optionsFor(facets: ProductFacets, dimension: DimensionKey) {
  return facets[FACET_KEY[dimension]];
}

/**
 * Single-select filter groups rendered as native radios inside fieldsets:
 * keyboard roving focus and screen-reader grouping for free. Each dimension's
 * facet counts are computed server-side with that dimension's own filter
 * removed, so the active choice never zeroes out its own group.
 */
export default function FilterGroups({
  facets,
  params,
}: {
  facets: ProductFacets;
  params: ShopParams;
}) {
  const { toggleDimension } = useShopNav();

  return (
    <div className="space-y-6">
      {DIMENSIONS.map(({ key, label }) => {
        const options = optionsFor(facets, key);
        if (options.length === 0) return null;
        const selected = params[key];
        return (
          <fieldset key={key}>
            <legend className="font-cinzel text-sm font-bold text-[#F0F0F0] mb-2">{label}</legend>
            <div className="space-y-1">
              <label className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-[#1D1D2A] has-checked:bg-[#1D1D2A]">
                <input
                  type="radio"
                  name={`shop-${key}`}
                  checked={!selected}
                  onChange={() => toggleDimension(key, null)}
                  className="accent-[#FF6B00]"
                />
                <span className="text-sm text-[#B8B8CC]">All</span>
              </label>
              {options.map((opt) => {
                const isActive = selected === opt.slug;
                return (
                  <label
                    key={opt.slug}
                    className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-[#1D1D2A] has-checked:bg-[#1D1D2A]"
                  >
                    <input
                      type="radio"
                      name={`shop-${key}`}
                      checked={isActive}
                      onChange={() => toggleDimension(key, opt.slug)}
                      className="accent-[#FF6B00]"
                    />
                    <span className={`text-sm flex-1 ${isActive ? 'text-[#FF6B00]' : 'text-[#B8B8CC]'}`}>
                      {opt.name}
                    </span>
                    <span className="text-xs text-[#6B6B80]">
                      {opt.count}
                      <span className="sr-only"> products</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
