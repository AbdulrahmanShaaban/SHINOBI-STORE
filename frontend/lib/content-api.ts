/**
 * Homepage content & media library API (§Phase 8).
 *
 * Deliberately free of a 'use client' directive: the same helpers serve
 * browser-side admin screens (credentials + CSRF header, like admin-api.ts)
 * and the server-rendered storefront homepage (getHomepage with no-store).
 */

const BASE = `${
  process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:5000'
}/api/v1`;

export class ContentError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ContentError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: {
        accept: 'application/json',
        // Never pin content-type on multipart uploads — the runtime must set
        // the FormData boundary itself.
        ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        'x-csrf-token': '1',
        ...init?.headers,
      },
    });
  } catch {
    throw new ContentError(503, 'API_UNREACHABLE', 'Content service is unreachable');
  }
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    const err = body as { code?: string; message?: string } | null;
    throw new ContentError(
      res.status,
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? res.statusText,
    );
  }
  return body as T;
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

// ───────────────────────────── types ─────────────────────────────

export const SECTION_KEYS = [
  'hero',
  'featured_products',
  'featured_characters',
  'trending_anime',
  'collections',
  'madara',
  'banner',
  'testimonials',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export interface ContentSection {
  key: SectionKey | string;
  isVisible: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
}

export interface SectionPatch {
  isVisible?: boolean;
  sortOrder?: number;
  config?: Record<string, unknown>;
}

export interface HeroConfig {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface FeaturedProductsConfig {
  productSlugs?: string[];
}

export interface FeaturedCharacterItem {
  name: string;
  slug: string;
  imageUrl?: string;
  tagline?: string;
  price?: string;
  originalPrice?: string;
}

export interface FeaturedCharactersConfig {
  items: FeaturedCharacterItem[];
}

export interface TrendingAnimeConfig {
  animeSlugs: string[];
}

export interface CollectionItem {
  title: string;
  href: string;
  imageUrl?: string;
}

export interface CollectionsConfig {
  items: CollectionItem[];
}

export interface BannerConfig {
  title: string;
  message?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
}

export interface TestimonialsConfig {
  items: TestimonialItem[];
}

/** Mirrors the DB enum media_folder — the only folders the server accepts. */
export type MediaFolder =
  | 'products'
  | 'characters'
  | 'hero'
  | 'banners'
  | 'collections'
  | 'general';

export const MEDIA_FOLDERS: readonly MediaFolder[] = [
  'products',
  'characters',
  'hero',
  'banners',
  'collections',
  'general',
];

export interface MediaEntry {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string;
  bytes: number;
  folder: MediaFolder | string;
  altText: string | null;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MediaListResult {
  items: MediaEntry[];
  meta: PageMeta;
}

// ─────────────────────────── wrappers ───────────────────────────

export const contentApi = {
  /** Public storefront composition — visible sections in render order. */
  getHomepage: () => request<ContentSection[]>('/content/homepage'),

  getSections: () => request<ContentSection[]>('/admin/content/sections'),

  updateSection: (key: string, patch: SectionPatch) =>
    request<ContentSection>(`/admin/content/sections/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  listMedia: (folder?: string, page?: number) =>
    request<MediaListResult>(withQuery('/admin/media', { folder, page })),

  uploadMedia: (file: File, folder: MediaFolder, altText?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    if (altText) form.append('altText', altText);
    return request<MediaEntry>('/admin/media', { method: 'POST', body: form });
  },

  deleteMedia: (id: string) =>
    request<{ id: string }>(`/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
