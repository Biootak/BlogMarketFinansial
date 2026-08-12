import { describe, expect, it, vi } from 'vitest';
import { safeCache, safeRevalidate, safeRevalidateAll, safeRevalidateTag } from './safe-cache';

// These tests exercise the L1 in-memory semantics that work with Redis
// disabled (UPSTASH_REDIS_REST_URL unset in the test environment).

describe('safeCache', () => {
  it('returns the cached value on a fresh hit without calling fn again', async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const cached = safeCache(fn, 0, { key: 'test:double', ttl: 60 });

    expect(await cached(21)).toBe(42);
    expect(await cached(21)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls fn again after TTL expiry', async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    // ttl in seconds; use a tiny value
    const cached = safeCache(fn, 0, { key: 'test:expire', ttl: 0 });

    expect(await cached(3)).toBe(6);
    expect(await cached(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keys cache slots by arguments — distinct args do not collide', async () => {
    const fn = vi.fn(async (a: number, b: number) => a + b);
    const cached = safeCache(fn, 0, { key: 'test:args', ttl: 60 });

    expect(await cached(1, 2)).toBe(3);
    expect(await cached(2, 1)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns the fallback when fn throws and no stale value exists', async () => {
    const fn = vi.fn(async () => {
      throw new Error('db down');
    });
    const cached = safeCache(fn, 'fallback', { key: 'test:fallback', ttl: 60 });

    expect(await cached()).toBe('fallback');
  });

  it('returns the stale value when fn throws after a successful write', async () => {
    let shouldFail = false;
    const fn = vi.fn(async () => {
      if (shouldFail) throw new Error('db down');
      return 'fresh';
    });
    const cached = safeCache(fn, 'fallback', { key: 'test:stale', ttl: 0 }); // ttl 0 → always miss

    expect(await cached()).toBe('fresh');
    shouldFail = true;
    expect(await cached()).toBe('fresh'); // stale value, not fallback
  });

  it('safeRevalidate purges the slot (L1) so fn is called again', async () => {
    const fn = vi.fn(async () => Math.random());
    const cached = safeCache(fn, 0, { key: 'test:revalidate', ttl: 60 });

    const first = await cached();
    expect(await cached()).toBe(first);
    safeRevalidate('test:revalidate');
    const second = await cached();
    expect(second).not.toBe(first);
  });

  it('safeRevalidateTag purges all slots registered under the tag', async () => {
    const fnA = vi.fn(async () => Math.random());
    const fnB = vi.fn(async () => Math.random());
    const cachedA = safeCache(fnA, 0, { key: 'tagged:a', ttl: 60, tags: ['shared-tag'] });
    const cachedB = safeCache(fnB, 0, { key: 'tagged:b', ttl: 60, tags: ['shared-tag'] });

    const a1 = await cachedA();
    const b1 = await cachedB();
    safeRevalidateTag('shared-tag');
    expect(await cachedA()).not.toBe(a1);
    expect(await cachedB()).not.toBe(b1);
  });

  it('safeRevalidateAll clears everything', async () => {
    const fn = vi.fn(async () => Math.random());
    const cached = safeCache(fn, 0, { key: 'test:all', ttl: 60 });

    const first = await cached();
    safeRevalidateAll();
    expect(await cached()).not.toBe(first);
  });
});

describe('safeCache byte budget', () => {
  it('overwriting an existing key does not double-count its bytes', async () => {
    // 2026-08-12-fix regression test: safeSet on an existing key must
    // subtract the previous weight first, otherwise totalBytes drifts up
    // and evicts entries prematurely (cache thrash).
    process.env.SAFE_CACHE_MAX_BYTES = '1000';
    process.env.SAFE_CACHE_MAX_ENTRIES = '1000';
    vi.resetModules();

    const { safeCache, safeSet } = await import('./safe-cache');

    const payload = 'x'.repeat(200); // ~440 bytes estimated
    // write k1, then OVERWRITE k1 (as the market-rates cron does every minute)
    safeSet('overwrite:k1', { payload }, 60);
    safeSet('overwrite:k1', { payload }, 60);

    // write k2 — if k1's weight was double-counted, k2 would push total
    // over budget and evict k1. With the fix both fit under 1000.
    safeSet('overwrite:k2', { payload }, 60);

    const fn = vi.fn(async () => 'miss');
    const cached = safeCache(fn, null, { key: 'overwrite:k1', ttl: 60 });
    const value = await cached();
    // k1 survived → fn not called → we read the safeSet value, not a miss
    expect(value).toEqual({ payload });
    expect(fn).toHaveBeenCalledTimes(0);

    delete process.env.SAFE_CACHE_MAX_BYTES;
    delete process.env.SAFE_CACHE_MAX_ENTRIES;
  });

  it('evicts the oldest entries when the total byte budget is exceeded', async () => {
    // budget for ~1.5 entries of the payload size → second distinct key
    // pushes total over budget and evicts the oldest (key a)
    process.env.SAFE_CACHE_MAX_BYTES = '800';
    process.env.SAFE_CACHE_MAX_ENTRIES = '1000';
    vi.resetModules();

    // fresh module instance so the env is picked up at module init
    const { safeCache } = await import('./safe-cache');

    const fn = vi.fn(async (n: number) => ({ n, payload: 'x'.repeat(200) }));
    const cached = safeCache(fn, null, { key: 'byte-budget:a', ttl: 60 });

    const first = await cached(1);
    expect(fn).toHaveBeenCalledTimes(1);

    // same key is cached — no second call
    await cached(1);
    expect(fn).toHaveBeenCalledTimes(1);

    // a different key pushes total over budget → oldest (key a) is evicted
    const cachedB = safeCache(fn, null, { key: 'byte-budget:b', ttl: 60 });
    await cachedB(2);

    // re-reading key a now re-invokes fn (was evicted)
    await cached(1);
    expect(fn).toHaveBeenCalledTimes(3);

    delete process.env.SAFE_CACHE_MAX_BYTES;
    delete process.env.SAFE_CACHE_MAX_ENTRIES;
  });
});
