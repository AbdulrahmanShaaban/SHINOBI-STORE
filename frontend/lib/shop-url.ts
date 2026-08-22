import type { ShopParams } from './api';

/**
 * §18 URL contract — single source of truth for reading/writing shop state.
 * Any filtered view must be copy-paste shareable and survive
 * back/forward/refresh exactly (Phase 3 exit criteria).
 */

export const SHOP_SORTS = ['relevance', 'newest', 'price_asc', 'price_desc', 'rating'] as const;
export const DEFAULT_SORT = 'relevance';
export const PAGE_SIZE = 12;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ShopSearchParams {
  [key: string]: string | string[] | undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function slug(value: string | string[] | undefined): string | undefined {
  const v = first(value);
  return v !== undefined && SLUG_RE.test(v) ? v : undefined;
}

/** Mirrors backend ProductQueryDto validation so bad URLs degrade to defaults. */
export function parseShopParams(sp: ShopSearchParams): ShopParams {
  const sortRaw = first(sp.sort);
  const pageRaw = Number.parseInt(first(sp.page) ?? '1', 10);
  const minPriceRaw = Number.parseInt(first(sp.minPrice) ?? '', 10);
  const maxPriceRaw = Number.parseInt(first(sp.maxPrice) ?? '', 10);
  // Search is free text (backend caps at 100); only strip control noise here.
  const search = first(sp.search)?.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);

  return {
    search: search || undefined,
    category: slug(sp.category),
    anime: slug(sp.anime),
    character: slug(sp.character),
    tag: slug(sp.tag),
    minPrice: Number.isInteger(minPriceRaw) && minPriceRaw >= 0 ? minPriceRaw : undefined,
    maxPrice: Number.isInteger(maxPriceRaw) && maxPriceRaw >= 0 ? maxPriceRaw : undefined,
    sort:
      sortRaw && (SHOP_SORTS as readonly string[]).includes(sortRaw)
        ? sortRaw
        : undefined,
    page: Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 500) : undefined,
  };
}

/** Canonical querystring; defaults are omitted to keep URLs clean and stable. */
export function buildShopQuery(params: ShopParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.category) sp.set('category', params.category);
  if (params.anime) sp.set('anime', params.anime);
  if (params.character) sp.set('character', params.character);
  if (params.tag) sp.set('tag', params.tag);
  if (params.minPrice !== undefined) sp.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) sp.set('maxPrice', String(params.maxPrice));
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set('sort', params.sort);
  const page = params.page ?? 1;
  if (page > 1) sp.set('page', String(page));
  const q = sp.toString();
  return q ? `?${q}` : '';
}

export function shopHref(params: ShopParams): string {
  return `/products${buildShopQuery(params)}`;
}

/** True when anything beyond the bare grid is active (drives noindex/empty states). */
export function hasActiveFilters(params: ShopParams): boolean {
  return Boolean(
    params.search ||
      params.category ||
      params.anime ||
      params.character ||
      params.tag ||
      params.minPrice !== undefined ||
      params.maxPrice !== undefined,
  );
}
