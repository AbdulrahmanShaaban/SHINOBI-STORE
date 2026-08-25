'use client';

/**
 * Shared product search. Two surfaces, one implementation:
 * - `ProductSearchOverlay` (default export): fullscreen dialog opened from the
 *   navbar search icon on ANY route. Never navigates on open.
 * - `useProductSuggestions` + `SearchSuggestions`: the live dropdown used by
 *   both this overlay and the /products ShopControls SearchBox.
 *
 * Contract (deliberate): typing NEVER triggers the full results navigation —
 * the debounced call only populates suggestions. Pressing Enter (form submit)
 * or selecting a suggestion is what executes the full search.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchProductsBrowser, type ProductListItem } from '@/lib/api';
import { formatPrice } from '@/lib/money';
import { shopHref } from '@/lib/shop-url';
import { acquireScrollLock, releaseLock } from '@/lib/scroll-lock';

const SUGGEST_DEBOUNCE_MS = 250;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;

/** Debounced, latest-wins suggestion lookup. Consumers gate on min chars. */
export function useProductSuggestions(query: string): {
  suggestions: ProductListItem[];
  loading: boolean;
} {
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    // All setState happens inside the timer/async callbacks — never sync in
    // the effect body (react-hooks/set-state-in-effect). Stale rows below the
    // min-char threshold are invisible: SearchSuggestions gates on length.
    const timer = setTimeout(() => {
      if (trimmed.length < SUGGEST_MIN_CHARS) {
        seq.current += 1; // invalidate any in-flight request
        setSuggestions([]);
        setLoading(false);
        return;
      }
      const ticket = ++seq.current;
      setLoading(true);
      searchProductsBrowser(trimmed, SUGGEST_LIMIT)
        .then((res) => {
          if (seq.current !== ticket) return; // a newer query already resolved
          setSuggestions(res.items);
          setLoading(false);
        })
        .catch(() => {
          if (seq.current !== ticket) return;
          setSuggestions([]);
          setLoading(false);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return { suggestions, loading };
}

/** Shared suggestion rows: thumbnail + name + price. Selecting runs the full search. */
export function SearchSuggestions({
  suggestions,
  loading,
  query,
  onSelect,
  listId,
}: {
  suggestions: ProductListItem[];
  loading: boolean;
  query: string;
  onSelect: (term: string) => void;
  listId?: string;
}) {
  if (query.trim().length < SUGGEST_MIN_CHARS) return null;

  return (
    <div role="region" aria-label="Search suggestions">
      {loading ? (
        <p className="px-4 py-3 text-sm text-[#6B6B80]" role="status" aria-live="polite">
          Searching…
        </p>
      ) : suggestions.length === 0 ? (
        <p className="px-4 py-3 text-sm text-[#6B6B80]">No products match “{query.trim()}”.</p>
      ) : (
        <ul id={listId} className="divide-y divide-[#2A2A3A]">
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onSelect(product.name)}
                aria-label={`Search for ${product.name}`}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#16161F] focus-visible:bg-[#16161F] focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[#0A0A0F]"
                >
                  {product.primaryImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.primaryImageUrl}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-bebas text-xl text-[#6B6B80]">忍</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-cinzel text-sm font-bold text-[#F0F0F0]">
                  {product.name}
                </span>
                <span className="shrink-0 font-bebas text-lg leading-none text-[#FFB800]">
                  {formatPrice(product.priceFromCents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Fullscreen search dialog. Opens from the navbar on any route; submitting or
 * picking a suggestion navigates to the full results on /products.
 */
export default function ProductSearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const { suggestions, loading } = useProductSuggestions(value);

  // Close from any path (button, backdrop, Escape, selection) resets the
  // draft query in the same event — no setState-in-effect.
  const requestClose = useCallback(() => {
    setValue('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    acquireScrollLock('search-overlay');

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      releaseLock('search-overlay');
      previouslyFocused?.focus?.();
    };
  }, [open, requestClose]);

  if (!open) return null;

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    setValue('');
    onClose();
    router.push(shopHref({ search: trimmed || undefined }));
  };

  return (
    <div className="fixed inset-0 z-[65]" role="presentation">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className="absolute inset-x-4 top-[12vh] mx-auto max-w-xl rounded-xl border border-[#2A2A3A] bg-[#12121A] shadow-2xl"
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(value);
          }}
        >
          <div className="flex items-center gap-2 border-b border-[#2A2A3A] px-4 py-3">
            <svg
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-[#6B6B80]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search the armory…"
              maxLength={100}
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent font-cinzel text-base text-[#F0F0F0] placeholder:text-[#6B6B80] focus:outline-none"
            />
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close search"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[#6B6B80] transition-colors hover:bg-[#16161F] hover:text-[#F0F0F0]"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18 L18 6 M6 6 L18 18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          <SearchSuggestions
            suggestions={suggestions}
            loading={loading}
            query={value}
            onSelect={runSearch}
          />
        </div>
        <p className="border-t border-[#2A2A3A] px-4 py-2 text-xs text-[#6B6B80]">
          Press <kbd className="rounded border border-[#2A2A3A] px-1 font-mono">Enter</kbd> to see
          all results.
        </p>
      </div>
    </div>
  );
}
