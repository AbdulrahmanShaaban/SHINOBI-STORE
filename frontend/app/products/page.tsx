import type { Metadata } from 'next';
import Link from 'next/link';
import { getFacets, listProducts } from '@/lib/api';
import { hasActiveFilters, parseShopParams } from '@/lib/shop-url';
import ActiveChips from '@/components/shop/ActiveChips';
import FilterGroups from '@/components/shop/FilterGroups';
import MobileFilters from '@/components/shop/MobileFilters';
import Pagination from '@/components/shop/Pagination';
import ProductGrid from '@/components/shop/ProductGrid';
import { SearchBox, SortMenu } from '@/components/shop/ShopControls';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = parseShopParams(await searchParams);
  return {
    title: 'Shop All Gear — Shinobi Store',
    description:
      'Browse the full Shinobi Store armory: anime-inspired streetwear, figures, posters and accessories.',
    alternates: { canonical: '/products' },
    // Filtered permutations are thin content — crawl the canonical grid only.
    ...(hasActiveFilters(params) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseShopParams(await searchParams);
  const [products, facets] = await Promise.all([listProducts(params), getFacets(params)]);

  const total = products.meta.total;
  const countLine =
    total === 0
      ? 'Nothing found'
      : `${total} artifact${total === 1 ? '' : 's'}${
          params.search ? ` matching “${params.search}”` : ''
        }`;

  return (
    <main id="main" className="mx-auto w-full max-w-[1700px] px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="font-bebas text-5xl sm:text-6xl tracking-wide text-[#F0F0F0]">THE ARMORY</h1>
        <p className="mt-2 text-sm text-[#B8B8CC]" role="status" aria-live="polite">
          {countLine}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox key={params.search ?? ''} initialValue={params.search ?? ''} />
        <div className="hidden lg:block ml-auto">
          <SortMenu />
        </div>
        <div className="lg:hidden ml-auto flex items-center gap-3">
          {/* Sort is reachable natively on mobile; only filters need a sheet. */}
          <div className="hidden min-[480px]:block">
            <SortMenu id="shop-sort-mobile" />
          </div>
          <MobileFilters facets={facets} />
        </div>
      </div>

      <div className="mt-4">
        <ActiveChips params={params} />
      </div>

      <div className="mt-8 flex gap-8">
        <aside aria-label="Product filters" className="hidden lg:block w-56 shrink-0">
          <FilterGroups facets={facets} params={params} />
        </aside>

        <section className="flex-1 min-w-0" aria-label="Products">
          {products.items.length > 0 ? (
            <>
              <ProductGrid items={products.items} />
              <Pagination params={params} totalPages={products.meta.totalPages} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[#2A2A3A] bg-[#12121A] px-6 py-16 text-center">
              <p aria-hidden="true" className="font-bebas text-7xl text-[#2A2A3A]">
                無
              </p>
              <h2 className="font-cinzel text-xl font-bold text-[#F0F0F0] mt-2">
                This jutsu found nothing
              </h2>
              <p className="text-sm text-[#B8B8CC] mt-2 max-w-md mx-auto">
                No products match the current filters. Try loosening a filter or clearing them all.
              </p>
              <Link
                href="/products"
                className="inline-block mt-6 rounded-lg border border-[#FF6B00]/60 bg-[#FF6B00]/10 px-6 py-2.5 font-cinzel text-sm font-bold text-[#FF6B00] hover:bg-[#FF6B00]/20 focus-visible:outline-none focus-visible:border-[#FF6B00] transition-colors"
              >
                CLEAR FILTERS
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
