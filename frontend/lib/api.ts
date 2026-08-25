/**
 * Typed client for the Shinobi Store API.
 * - Server components use API_URL (private network, cached via next.revalidate).
 * - Browser code (cart revalidation) uses NEXT_PUBLIC_API_URL; backend CORS
 *   must list the storefront origin.
 */
const SERVER_BASE = `${process.env.API_URL ?? 'http://localhost:5000'}/api/v1`;
const BROWSER_BASE = `${
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:5000'
}/api/v1`;

/** Shop URL params (§18) plus server-side paging knobs. minRating/inStock arrive with reviews later. */
export interface ShopParams {
  search?: string;
  category?: string;
  anime?: string;
  character?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  /** Server-side only override; the shop UI always uses PAGE_SIZE. */
  limit?: number;
}

export class ApiError extends Error {
  public readonly cause?: unknown;

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.cause = cause;
  }
}

export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  featured: boolean;
  ratingAvg: number;
  reviewCount: number;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  priceFromCents: number | null;
  compareAtPriceCents: number | null;
}

export interface PaginatedProducts {
  items: ProductListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface FacetOption {
  slug: string;
  name: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetOption[];
  animes: FacetOption[];
  characters: FacetOption[];
  tags: FacetOption[];
}

export interface VariantView {
  id: string;
  sku: string;
  optionSize: string | null;
  optionColor: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  available: number;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
}

export interface TaxonomyRef {
  slug: string;
  name: string;
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  featured: boolean;
  ratingAvg: number;
  reviewCount: number;
  category: TaxonomyRef;
  anime: TaxonomyRef;
  character: TaxonomyRef | null;
  tagSlugs: TaxonomyRef[];
  variants: VariantView[];
  images: ProductImage[];
}

async function request<T>(
  path: string,
  revalidate: number,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  return rawRequest<T>(SERVER_BASE, path, { ...init, revalidate });
}

async function rawRequest<T>(
  base: string,
  path: string,
  opts: { method?: string; body?: unknown; revalidate: number },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      headers: {
        accept: 'application/json',
        ...(opts.body ? { 'content-type': 'application/json' } : {}),
      },
      method: opts.method ?? 'GET',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      next: { revalidate: opts.revalidate },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new ApiError(503, 'API_UNREACHABLE', 'Catalog service is unreachable', cause);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;
    throw new ApiError(res.status, body?.code ?? `HTTP_${res.status}`, body?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export function listProducts(params: ShopParams): Promise<PaginatedProducts> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.anime) search.set('anime', params.anime);
  if (params.character) search.set('character', params.character);
  if (params.tag) search.set('tag', params.tag);
  if (params.search) search.set('search', params.search);
  if (params.minPrice !== undefined) search.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) search.set('maxPrice', String(params.maxPrice));
  if (params.sort && params.sort !== 'relevance') search.set('sort', params.sort);
  search.set('limit', String(params.limit ?? 12));
  const page = params.page ?? 1;
  if (page > 1) search.set('page', String(page));
  return request<PaginatedProducts>(`/products?${search.toString()}`, 60);
}

/** Faceted taxonomy counts under the current filter set (§18). */
export function getFacets(params: ShopParams): Promise<ProductFacets> {
  const search = new URLSearchParams();
  if (params.category) search.set('category', params.category);
  if (params.anime) search.set('anime', params.anime);
  if (params.character) search.set('character', params.character);
  if (params.tag) search.set('tag', params.tag);
  if (params.search) search.set('search', params.search);
  return request<ProductFacets>(`/products/facets?${search.toString()}`, 60);
}

/** Live purchasability per variant. Absent ids mean "gone" — quarantine those lines. */
export interface VariantAvailability {
  variantId: string;
  isActive: boolean;
  priceCents: number;
  compareAtPriceCents: number | null;
  available: number;
  productSlug: string;
}

/** Browser-facing (no HTTP cache); used by cart drawer revalidation. */
export async function checkAvailability(variantIds: string[]): Promise<VariantAvailability[]> {
  return rawRequest<VariantAvailability[]>(BROWSER_BASE, '/products/availability', {
    revalidate: 0,
    method: 'POST',
    body: { variantIds },
  });
}

/**
 * Browser-facing product search for live suggestions (navbar/shop overlays).
 * Uses NEXT_PUBLIC_API_URL — the storefront origin must be CORS-allowlisted,
 * exactly like checkAvailability. Server components keep using listProducts.
 */
export function searchProductsBrowser(query: string, limit = 6): Promise<PaginatedProducts> {
  const search = new URLSearchParams();
  if (query) search.set('search', query);
  search.set('limit', String(limit));
  return rawRequest<PaginatedProducts>(BROWSER_BASE, `/products?${search.toString()}`, {
    revalidate: 0,
  });
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return request<ProductDetail>(
    `/products/${encodeURIComponent(slug)}`,
    30,
  );
}
