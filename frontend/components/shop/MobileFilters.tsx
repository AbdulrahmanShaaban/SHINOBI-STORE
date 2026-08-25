'use client';

import { useEffect, useId, useRef, useState } from 'react';
import FilterGroups from './FilterGroups';
import { useShopNav } from '@/lib/use-shop-nav';
import { acquireScrollLock, releaseLock } from '@/lib/scroll-lock';
import type { ProductFacets } from '@/lib/api';

/**
 * Mobile filter surface (§18: ephemeral open-state stays OUT of the URL).
 * Same dialog discipline as the cart drawer: role=dialog, focus trap,
 * Escape to close, focus restored to the trigger.
 */
export default function MobileFilters({ facets }: { facets: ProductFacets }) {
  const { params } = useShopNav();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    acquireScrollLock('mobile-filters');
    panel?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab' && panel) {
        const focusables = panel.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      releaseLock('mobile-filters');
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="lg:hidden border border-[#2A2A3A] rounded-lg px-4 py-2 text-sm font-cinzel text-[#F0F0F0] hover:border-[#FF6B00]/60 transition-colors"
      >
        FILTERS
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-[#16161F] border-t border-[#2A2A3A] p-6 pb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 id={titleId} className="font-bebas text-2xl tracking-wide text-[#F0F0F0]">
                FILTER THE ARMORY
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#2A2A3A] w-9 h-9 grid place-items-center text-[#B8B8CC] hover:border-[#FF6B00]/60 hover:text-[#FF6B00] transition-colors"
              >
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Close filters</span>
              </button>
            </div>
            <FilterGroups facets={facets} params={params} />
          </div>
        </div>
      ) : null}
    </>
  );
}
