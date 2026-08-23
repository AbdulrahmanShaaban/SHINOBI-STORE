import { CACHE_KEYS, CACHE_TTL_SECONDS, CacheService } from './cache.service';

/**
 * Unit coverage for the §16.1 read-through CacheService. The redis mock is
 * stateful (real get/set/del/incr semantics over Maps) so read-through,
 * versioning and invalidation behave like the real client; the chaos cases
 * swap in an all-rejecting client to pin the degrade-to-DB guarantee.
 */

interface ClockableRedis {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  incr: jest.Mock;
  expire: jest.Mock;
}

function statefulRedis() {
  const store = new Map<string, string>();
  const expiresAt = new Map<string, number>();
  let now = Date.now();

  const alive = (key: string): boolean => {
    const exp = expiresAt.get(key);
    if (exp !== undefined && exp <= now) {
      store.delete(key);
      expiresAt.delete(key);
    }
    return store.has(key);
  };

  const client: ClockableRedis = {
    get: jest.fn().mockImplementation(async (key: string) => (alive(key) ? store.get(key)! : null)),
    set: jest.fn().mockImplementation(async (key: string, value: string, mode?: string, ttl?: number) => {
      store.set(key, value);
      if (mode === 'EX' && typeof ttl === 'number') expiresAt.set(key, now + ttl * 1000);
      else expiresAt.delete(key);
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) if (store.delete(key)) removed += 1;
      return removed;
    }),
    incr: jest.fn().mockImplementation(async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    }),
    expire: jest.fn().mockResolvedValue(1),
  };

  return { service: new CacheService({ client } as never), client, store, advanceMs: (ms: number) => (now += ms) };
}

function chaosRedis() {
  const boom = () => jest.fn().mockRejectedValue(new Error('redis is down'));
  return { client: { get: boom(), set: boom(), del: boom(), incr: boom(), expire: boom() } as ClockableRedis };
}

describe('CacheService — primitives', () => {
  it('stores JSON under EX ttl and round-trips objects on get', async () => {
    const { service, client } = statefulRedis();
    const payload = { items: [1, 2], nested: { ok: true } };

    await service.set('catalog:featured', payload, CACHE_TTL_SECONDS.featured);

    expect(client.set).toHaveBeenCalledWith(
      'catalog:featured',
      JSON.stringify(payload),
      'EX',
      CACHE_TTL_SECONDS.featured,
    );
    await expect(service.get<typeof payload>('catalog:featured')).resolves.toEqual(payload);
  });

  it('returns null on miss', async () => {
    const { service } = statefulRedis();
    await expect(service.get('catalog:product:nope')).resolves.toBeNull();
  });

  it('treats corrupt stored payloads as a miss instead of throwing', async () => {
    const { service, store } = statefulRedis();
    store.set('catalog:featured', '{not-json');

    await expect(service.get('catalog:featured')).resolves.toBeNull();
  });

  it('clamps non-positive TTLs to a safe minimum', async () => {
    const { service, client } = statefulRedis();

    await service.set('catalog:facets', {}, 0);

    expect(client.set).toHaveBeenCalledWith('catalog:facets', '{}', 'EX', 1);
  });
});

describe('CacheService.cached — read-through', () => {
  it('serves the producer on miss and the cache on repeat — producer called once', async () => {
    const { service } = statefulRedis();
    const producer = jest.fn().mockResolvedValue({ slug: 'hoodie', priceCents: 6900 });

    const first = await service.cached(CACHE_KEYS.product('hoodie'), CACHE_TTL_SECONDS.product, producer);
    const second = await service.cached(CACHE_KEYS.product('hoodie'), CACHE_TTL_SECONDS.product, producer);

    expect(first).toEqual({ slug: 'hoodie', priceCents: 6900 });
    expect(second).toEqual(first);
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it('re-invokes the producer after a targeted del (invalidation)', async () => {
    const { service } = statefulRedis();
    const producer = jest.fn().mockResolvedValue({ facets: ['a'] });
    await service.cached(CACHE_KEYS.facets, CACHE_TTL_SECONDS.facets, producer);

    await service.del(CACHE_KEYS.facets);
    await service.cached(CACHE_KEYS.facets, CACHE_TTL_SECONDS.facets, producer);

    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('expires entries after their TTL elapses', async () => {
    const { service, advanceMs } = statefulRedis();
    const producer = jest.fn()
      .mockResolvedValueOnce({ gen: 1 })
      .mockResolvedValueOnce({ gen: 2 });

    const fresh = await service.cached(CACHE_KEYS.facets, CACHE_TTL_SECONDS.facets, producer);
    advanceMs((CACHE_TTL_SECONDS.facets + 1) * 1000);
    const stale = await service.cached(CACHE_KEYS.facets, CACHE_TTL_SECONDS.facets, producer);

    expect(fresh).toEqual({ gen: 1 });
    expect(stale).toEqual({ gen: 2 });
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('never caches producer failures — NotFound-style errors propagate untouched', async () => {
    const { service } = statefulRedis();
    const producer = jest.fn().mockRejectedValue(new Error('PRODUCT_NOT_FOUND'));

    await expect(
      service.cached(CACHE_KEYS.product('ghost'), CACHE_TTL_SECONDS.product, producer),
    ).rejects.toThrow('PRODUCT_NOT_FOUND');
    // Nothing was stored, so nothing can shadow a later successful read.
    await expect(service.get(CACHE_KEYS.product('ghost'))).resolves.toBeNull();
  });
});

describe('CacheService — Redis-down chaos (degrade to DB)', () => {
  it('still returns the producer value when every redis op rejects', async () => {
    const service = new CacheService({ client: chaosRedis().client } as never);
    const producer = jest.fn().mockResolvedValue({ db: true });

    const first = await service.cached('content:home:v0', CACHE_TTL_SECONDS.home, producer);
    const second = await service.cached('content:home:v0', CACHE_TTL_SECONDS.home, producer);

    expect(first).toEqual({ db: true });
    expect(second).toEqual({ db: true });
    // No cache engagement → DB answers every request.
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('swallows failures from set/del/bump/homeKey instead of throwing', async () => {
    const service = new CacheService({ client: chaosRedis().client } as never);

    await expect(service.set('catalog:featured', { x: 1 }, 300)).resolves.toBeUndefined();
    await expect(service.del('catalog:featured')).resolves.toBeUndefined();
    await expect(service.bumpHomeVersion()).resolves.toBeNull();
    await expect(service.homeKey()).resolves.toBe('content:home:v0');
    await expect(service.get('catalog:featured')).resolves.toBeNull();
  });
});

describe('CacheService — homepage versioning', () => {
  it('starts at v0 and follows INCR bumps', async () => {
    const { service } = statefulRedis();

    await expect(service.homeKey()).resolves.toBe('content:home:v0');
    await service.bumpHomeVersion();
    await expect(service.homeKey()).resolves.toBe('content:home:v1');
    await service.bumpHomeVersion();
    await expect(service.homeKey()).resolves.toBe('content:home:v2');
  });

  it('isolates cached payloads per generation — a bump forces a fresh read', async () => {
    const { service } = statefulRedis();
    let generation = 0;
    const producer = jest.fn().mockImplementation(async () => ({ generation }));

    await service.cached(await service.homeKey(), CACHE_TTL_SECONDS.home, producer);
    generation += 1; // admin edit landed in the DB…
    await service.bumpHomeVersion(); // …and the mutation bumped the version
    const afterBump = await service.cached(await service.homeKey(), CACHE_TTL_SECONDS.home, producer);

    expect(afterBump).toEqual({ generation: 1 });
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it('treats garbage in the version key as v0 rather than crashing reads', async () => {
    const { service, store } = statefulRedis();
    store.set(CACHE_KEYS.homeVersion, 'not-a-number');

    await expect(service.homeKey()).resolves.toBe('content:home:v0');
  });
});

describe('CacheService.stats — hit/miss metrics per prefix', () => {
  it('aggregates hits/misses/ratio for every known prefix', async () => {
    const { service } = statefulRedis();
    const producer = jest.fn().mockResolvedValue({ ok: true });

    await service.cached('catalog:product:a', 600, producer); // miss
    await service.cached('catalog:product:a', 600, producer); // hit
    await service.get('catalog:featured'); // miss
    await service.get('catalog:facets'); // miss
    await service.get('content:home:v0'); // miss

    const byPrefix = Object.fromEntries(service.stats().map((row) => [row.prefix, row]));
    expect(byPrefix['catalog:product']).toMatchObject({ hits: 1, misses: 1, ratio: 0.5 });
    expect(byPrefix['catalog:featured']).toMatchObject({ hits: 0, misses: 1, ratio: 0 });
    expect(byPrefix['catalog:facets']).toMatchObject({ hits: 0, misses: 1 });
    expect(byPrefix['content:home']).toMatchObject({ hits: 0, misses: 1 });
  });

  it('buckets unknown keys under "other" and reports zero-traffic prefixes as zeros', async () => {
    const { service } = statefulRedis();

    expect(service.stats()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ prefix: 'other', hits: 0, misses: 0, ratio: 0 }),
        expect.objectContaining({ prefix: 'catalog:product', hits: 0, misses: 0, ratio: 0 }),
      ]),
    );

    await service.get('sessions:abc');
    expect(service.stats()).toEqual(expect.arrayContaining([expect.objectContaining({ prefix: 'other', misses: 1 })]));
  });

  it('keeps counting after redis failure (misses are signal too)', async () => {
    const service = new CacheService({ client: chaosRedis().client } as never);
    const producer = jest.fn().mockResolvedValue(42);

    await service.cached('catalog:featured', 300, producer);
    await service.cached('catalog:featured', 300, producer);

    expect(service.stats()).toEqual(
      expect.arrayContaining([expect.objectContaining({ prefix: 'catalog:featured', hits: 0, misses: 2 })]),
    );
  });
});
