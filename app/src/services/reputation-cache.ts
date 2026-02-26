/**
 * Write-through LRU cache for reputation scores.
 *
 * Sits between the reputation query endpoint and the ReputationStore,
 * caching blended_score lookups to reduce PG pressure from finn polling.
 *
 * Config: 5s TTL, 10K max entries, LRU eviction.
 * Consistency model: eventual (5s max staleness). The 5s TTL provides a
 * natural consistency window — processEvent writes land in PG immediately
 * but the cache serves the prior value until TTL expires. This is acceptable
 * for finn's polling cadence where sub-second freshness is not required.
 * For tighter consistency, call invalidate(nftId) after processEvent().
 * Negative caching: caches null for cold/missing agents to prevent PG storms.
 *
 * @since cycle-011 — Sprint 83, Task T2.4c
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReputationCacheConfig {
  /** TTL in milliseconds. Default: 5000 (5s) */
  ttlMs?: number;
  /** Maximum cached entries. Default: 10_000 */
  maxEntries?: number;
}

interface CacheEntry {
  value: number | null;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// ReputationCache — LRU with TTL
// ---------------------------------------------------------------------------

export class ReputationCache {
  private readonly _map = new Map<string, CacheEntry>();
  private readonly _ttlMs: number;
  private readonly _maxEntries: number;

  // Metrics
  private _hits = 0;
  private _misses = 0;

  constructor(config: ReputationCacheConfig = {}) {
    this._ttlMs = config.ttlMs ?? 5_000;
    this._maxEntries = config.maxEntries ?? 10_000;
  }

  /**
   * Get cached score. Returns undefined on miss (expired or absent).
   * On hit, promotes key to most-recent position (LRU refresh).
   */
  get(nftId: string): number | null | undefined {
    const key = `reputation:${nftId}`;
    const entry = this._map.get(key);

    if (!entry) {
      this._misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this._map.delete(key);
      this._misses++;
      return undefined;
    }

    // LRU refresh: delete and re-insert to move to end of Map iteration order
    this._map.delete(key);
    this._map.set(key, entry);
    this._hits++;
    return entry.value;
  }

  /**
   * Cache a score (including null for negative caching).
   * Evicts LRU entries if at capacity.
   */
  set(nftId: string, value: number | null): void {
    const key = `reputation:${nftId}`;

    // If key exists, delete first to refresh position
    if (this._map.has(key)) {
      this._map.delete(key);
    }

    // Evict LRU if at capacity
    while (this._map.size >= this._maxEntries) {
      const oldest = this._map.keys().next().value!;
      this._map.delete(oldest);
    }

    this._map.set(key, {
      value,
      expiresAt: Date.now() + this._ttlMs,
    });
  }

  /** Invalidate a specific agent's cached score. */
  invalidate(nftId: string): void {
    this._map.delete(`reputation:${nftId}`);
  }

  /** Clear entire cache. */
  clear(): void {
    this._map.clear();
  }

  /** Current number of entries (including potentially expired). */
  get size(): number {
    return this._map.size;
  }

  /** Cache hit/miss metrics. */
  get metrics(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      size: this._map.size,
      hitRate: total > 0 ? this._hits / total : 0,
    };
  }
}
