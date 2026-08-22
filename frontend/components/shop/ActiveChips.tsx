import { formatPrice } from '@/lib/money';
import type { ShopParams } from '@/lib/api';
import { shopHref } from '@/lib/shop-url';

/**
 * Active-filter chips — pure links (no client JS): each chip's href is the
 * current URL minus that one filter. Shareable and back-button-safe by design.
 */
export default function ActiveChips({ params }: { params: ShopParams }) {
  const chips: { key: keyof ShopParams; label: string }[] = [];
  if (params.search) chips.push({ key: 'search', label: `“${params.search}”` });
  if (params.category) chips.push({ key: 'category', label: params.category.replace(/-/g, ' ') });
  if (params.anime) chips.push({ key: 'anime', label: params.anime.replace(/-/g, ' ') });
  if (params.character) chips.push({ key: 'character', label: params.character.replace(/-/g, ' ') });
  if (params.tag) chips.push({ key: 'tag', label: `#${params.tag.replace(/-/g, ' ')}` });
  if (params.minPrice !== undefined)
    chips.push({ key: 'minPrice', label: `from ${formatPrice(params.minPrice)}` });
  if (params.maxPrice !== undefined)
    chips.push({ key: 'maxPrice', label: `to ${formatPrice(params.maxPrice)}` });

  if (chips.length === 0) return null;

  const without = (key: keyof ShopParams) => {
    const next = { ...params, page: undefined };
    delete next[key];
    return shopHref(next);
  };

  const clearAll = shopHref({ sort: params.sort });

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <a
            href={without(chip.key)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6B00]/50 bg-[#FF6B00]/10 px-3 py-1 text-xs text-[#F0F0F0] hover:border-[#FF6B00] focus-visible:outline-none focus-visible:border-[#FF6B00] transition-colors"
            aria-label={`Remove filter ${chip.label}`}
          >
            <span className="capitalize">{chip.label}</span>
            <span aria-hidden="true" className="text-[#FF6B00]">
              ✕
            </span>
          </a>
        </li>
      ))}
      <li>
        <a
          href={clearAll}
          className="text-xs text-[#6B6B80] underline underline-offset-4 hover:text-[#B8B8CC]"
        >
          Clear all
        </a>
      </li>
    </ul>
  );
}
