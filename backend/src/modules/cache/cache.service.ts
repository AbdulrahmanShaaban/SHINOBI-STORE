import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { logger } from '../../common/logger/logger';

/**
 * §16.1 canonical cache keys and TTLs — single source of truth shared by
 * read paths and invalidation call sites.
 */
export const CACHE_KEYS = {
  /** Version counter for homepage payloads; INCR on any content mutation. */
  homeVersion: 'content:home:ver',
  featured: 'catalog:featured',
  facets: 'catalog:facets',
  product: (slug: string): string => `catalog:product:${slug}`,
  home: (version: number): string => `content:home:v${version}`,
} as const;

export const CACHE_TTL_SECONDS = {
  home: 24 * 60 * 60,
  featured: 5 * 60,
  product: 10 * 60,
  facets: 15 * 60,
} as const;

/** Longest-match-first so catalog:product:{slug} never lands in a bucket of its parent namespace. */
const METRIC_PREFIXES = ['catalog:product', 'catalog:featured', 'catalog:facets', 'content:home'] as const;

export type CacheMetricPrefix = (typeof METRIC_PREFIXES)[number] | 'other';

export interface CachePrefixStats {
  prefix: CacheMetricPrefix;
  hits: number;
  misses: number;
  ratio: number;
}

interface PrefixCounters {
  hits: number;
  misses: number;
}

function prefixOf(key: string): CacheMetricPrefix {
  for (const prefix of METRIC_PREFIXES) {
    if (key.startsWith(prefix)) return prefix;
  }
  return 'other';
}

function clampTtl(ttlSeconds: number): number {
  return Number.isFinite(ttlSeconds) ? Math.max(1, Math.floor(ttlSeconds)) : 1;
}

/**
 * Read-through cache over Redis (§16.1). Every Redis interaction is wrapped:
 * an unreachable or rejecting client degrades to "always miss" and the
 * database producer answers instead — cache failures must never fail a
 * request. Metrics are process-local counters exposed via GET /metrics/cache.
 */
@Injectable()
export class CacheService {
  private readonly counters = new Map<CacheMetricPrefix, PrefixCounters>();

  constructor(private readonly redis: RedisService) {
    for (const prefix of [...METRIC_PREFIXES, 'other' as const]) {
      this.counters.set(prefix, { hits: 0, misses: 0 });
    }
  }

  /** JSON round-trip get; corrupt entries count as misses, never throw. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.client.get(key);
      if (raw === null || raw === undefined) {
        this.record(key, 'miss');
        return null;
      }
      this.record(key, 'hit');
      return JSON.parse(raw) as T;
    } catch (err) {
      this.record(key, 'miss');
      logger.debug({ err: (err as Error).message, key }, 'cache get failed — degrading to source');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.client.set(key, JSON.stringify(value), 'EX', clampTtl(ttlSeconds));
    } catch (err) {
      logger.debug({ err: (err as Error).message, key }, 'cache set failed — ignoring');
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.redis.client.del(...keys);
    } catch (err) {
      logger.debug({ err: (err as Error).message, keys }, 'cache del failed — ignoring');
    }
  }

  /**
   * Read-through helper: miss → producer → best-effort set. Producer errors
   * (e.g. NotFound mapping) propagate untouched and are never cached.
   */
  async cached<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit !== null) return hit;
    const fresh = await producer();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /** Bumps the homepage generation; every content:home:v{n} entry goes stale at once. */
  async bumpHomeVersion(): Promise<number | null> {
    try {
      return await this.redis.client.incr(CACHE_KEYS.homeVersion);
    } catch (err) {
      logger.debug({ err: (err as Error).message }, 'home version bump failed — ignoring');
      return null;
    }
  }

  /** Current versioned homepage key; falls back to v0 when Redis is down. */
  async homeKey(): Promise<string> {
    try {
      const raw = await this.redis.client.get(CACHE_KEYS.homeVersion);
      const version = Number.parseInt(raw ?? '0', 10);
      return CACHE_KEYS.home(Number.isFinite(version) && version > 0 ? version : 0);
    } catch {
      return CACHE_KEYS.home(0);
    }
  }

  /**
   * Targeted product-write invalidation: the affected detail page(s) plus the
   * two aggregate reads any create/update/archive can change.
   */
  async invalidateProduct(...slugs: Array<string | null | undefined>): Promise<void> {
    const keys = new Set<string>([CACHE_KEYS.featured, CACHE_KEYS.facets]);
    for (const slug of slugs) {
      if (slug) keys.add(CACHE_KEYS.product(slug));
    }
    await this.del(...keys);
  }

  /** Taxonomy writes only shift facet buckets — no product payload changes. */
  async invalidateFacets(): Promise<void> {
    await this.del(CACHE_KEYS.facets);
  }

  /** Dev/ops surface (GET /metrics/cache): per-prefix effectiveness since boot. */
  stats(): CachePrefixStats[] {
    const row = (prefix: CacheMetricPrefix): CachePrefixStats => {
      const { hits, misses } = this.counters.get(prefix) ?? { hits: 0, misses: 0 };
      const total = hits + misses;
      return { prefix, hits, misses, ratio: total === 0 ? 0 : Math.round((hits / total) * 10000) / 10000 };
    };
    return [...METRIC_PREFIXES.map(row), row('other')];
  }

  private record(key: string, outcome: 'hit' | 'miss'): void {
    const counters = this.counters.get(prefixOf(key));
    if (!counters) return;
    if (outcome === 'hit') counters.hits += 1;
    else counters.misses += 1;
  }
}
