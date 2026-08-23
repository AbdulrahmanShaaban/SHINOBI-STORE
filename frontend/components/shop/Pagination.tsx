import Link from 'next/link';
import { shopHref } from '@/lib/shop-url';
import type { ShopParams } from '@/lib/api';

function pageHref(params: ShopParams, page: number): string {
  return shopHref({ ...params, page: page > 1 ? page : undefined });
}

/**
 * Link-based pagination — crawlable, client-side navigated via next/link
 * (no document reload), preserves every other §18 param.
 * Windowed to ±2 around the current page.
 */
export default function Pagination({
  params,
  totalPages,
}: {
  params: ShopParams;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const current = params.page ?? 1;
  const windowStart = Math.max(1, Math.min(current - 2, totalPages - 4));
  const windowEnd = Math.min(totalPages, Math.max(current + 2, 5));
  const pages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p);

  const linkClass =
    'min-w-10 h-10 px-3 grid place-items-center rounded-lg border border-[#2A2A3A] text-sm text-[#B8B8CC] hover:border-[#FF6B00]/60 hover:text-[#F0F0F0] focus-visible:outline-none focus-visible:border-[#FF6B00] transition-colors';
  const activeClass =
    'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00] font-bold pointer-events-none';

  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center">
      <ul className="flex items-center gap-2 flex-wrap justify-center">
        <li>
          {current > 1 ? (
            <Link href={pageHref(params, current - 1)} rel="prev" className={linkClass}>
              ←
              <span className="sr-only">Previous page</span>
            </Link>
          ) : (
            <span className={`${linkClass} opacity-30`} aria-disabled="true">
              ←<span className="sr-only">No previous page</span>
            </span>
          )}
        </li>
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={pageHref(params, p)}
              aria-current={p === current ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={`${linkClass} ${p === current ? activeClass : ''}`}
            >
              {p}
            </Link>
          </li>
        ))}
        <li>
          {current < totalPages ? (
            <Link href={pageHref(params, current + 1)} rel="next" className={linkClass}>
              →<span className="sr-only">Next page</span>
            </Link>
          ) : (
            <span className={`${linkClass} opacity-30`} aria-disabled="true">
              →<span className="sr-only">No next page</span>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
