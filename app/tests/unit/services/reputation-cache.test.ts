/**
 * ReputationCache tests (cycle-011, Sprint 83, T2.4c).
 *
 * Tests LRU eviction, TTL expiry, negative caching, invalidation, and metrics.
 *
 * @since cycle-011 — Sprint 83, Task T2.4c
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReputationCache } from '../../../src/services/reputation-cache.js';

describe('ReputationCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined on cache miss', () => {
    const cache = new ReputationCache();
    expect(cache.get('unknown')).toBeUndefined();
  });

  it('caches and returns a score', () => {
    const cache = new ReputationCache();
    cache.set('nft-1', 0.75);
    expect(cache.get('nft-1')).toBe(0.75);
  });

  it('supports negative caching (null scores)', () => {
    const cache = new ReputationCache();
    cache.set('nft-cold', null);
    expect(cache.get('nft-cold')).toBeNull();
  });

  it('expires entries after TTL', () => {
    const cache = new ReputationCache({ ttlMs: 1000 });
    cache.set('nft-1', 0.5);
    expect(cache.get('nft-1')).toBe(0.5);

    vi.advanceTimersByTime(1001);
    expect(cache.get('nft-1')).toBeUndefined();
  });

  it('invalidates a specific entry', () => {
    const cache = new ReputationCache();
    cache.set('nft-1', 0.8);
    cache.set('nft-2', 0.6);

    cache.invalidate('nft-1');

    expect(cache.get('nft-1')).toBeUndefined();
    expect(cache.get('nft-2')).toBe(0.6);
  });

  it('clears all entries', () => {
    const cache = new ReputationCache();
    cache.set('nft-1', 0.8);
    cache.set('nft-2', 0.6);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('nft-1')).toBeUndefined();
  });

  it('evicts LRU entries when at capacity', () => {
    const cache = new ReputationCache({ maxEntries: 3 });
    cache.set('nft-1', 0.1);
    cache.set('nft-2', 0.2);
    cache.set('nft-3', 0.3);

    // nft-1 is LRU — adding nft-4 should evict it
    cache.set('nft-4', 0.4);

    expect(cache.get('nft-1')).toBeUndefined();
    expect(cache.get('nft-2')).toBe(0.2);
    expect(cache.get('nft-3')).toBe(0.3);
    expect(cache.get('nft-4')).toBe(0.4);
    expect(cache.size).toBe(3);
  });

  it('refreshes LRU position on get', () => {
    const cache = new ReputationCache({ maxEntries: 3 });
    cache.set('nft-1', 0.1);
    cache.set('nft-2', 0.2);
    cache.set('nft-3', 0.3);

    // Access nft-1 to promote it — nft-2 becomes LRU
    cache.get('nft-1');

    // Adding nft-4 should evict nft-2 (now LRU), not nft-1
    cache.set('nft-4', 0.4);

    expect(cache.get('nft-1')).toBe(0.1);
    expect(cache.get('nft-2')).toBeUndefined();
    expect(cache.get('nft-3')).toBe(0.3);
    expect(cache.get('nft-4')).toBe(0.4);
  });

  it('overwrites existing key and refreshes position', () => {
    const cache = new ReputationCache({ maxEntries: 3 });
    cache.set('nft-1', 0.1);
    cache.set('nft-2', 0.2);
    cache.set('nft-3', 0.3);

    // Overwrite nft-1 — promotes it to most recent
    cache.set('nft-1', 0.9);

    // nft-2 is now LRU
    cache.set('nft-4', 0.4);

    expect(cache.get('nft-1')).toBe(0.9);
    expect(cache.get('nft-2')).toBeUndefined();
  });

  it('tracks hit/miss metrics', () => {
    const cache = new ReputationCache();
    cache.set('nft-1', 0.5);

    cache.get('nft-1');     // hit
    cache.get('nft-1');     // hit
    cache.get('unknown');   // miss

    const m = cache.metrics;
    expect(m.hits).toBe(2);
    expect(m.misses).toBe(1);
    expect(m.hitRate).toBeCloseTo(2 / 3, 5);
    expect(m.size).toBe(1);
  });

  it('defaults to 5s TTL and 10K max entries', () => {
    const cache = new ReputationCache();
    cache.set('nft-1', 0.5);

    // Should still be cached at 4999ms
    vi.advanceTimersByTime(4999);
    expect(cache.get('nft-1')).toBe(0.5);

    // Should expire at 5001ms
    vi.advanceTimersByTime(2);
    expect(cache.get('nft-1')).toBeUndefined();
  });
});
