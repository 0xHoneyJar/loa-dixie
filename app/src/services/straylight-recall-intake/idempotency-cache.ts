// Phase 26E — idempotency / replay cache.
//
// ADR-026D §3.b (i): for matching `(authoritative tenant, authoritative
// caller, Idempotency-Key header)`, return the prior `RecallIntakeResponse`
// rather than appending duplicate state. Bounded LRU + TTL.
//
// Replay-cannot-alter-authorization invariant: a hit returns the prior
// response verbatim. The route never re-executes the runtime seam on a hit
// and never mutates the cached response on retry.

import type { RecallIntakeResponse } from '@loa/straylight/host';

export interface IdempotencyKey {
  tenant_id: string;
  caller_actor_id: string;
  request_key: string;
}

export interface IdempotencyCache {
  get(key: IdempotencyKey, now: number): RecallIntakeResponse | undefined;
  put(key: IdempotencyKey, value: RecallIntakeResponse, now: number): void;
  size(): number;
}

export interface IdempotencyCacheConfig {
  ttlSec: number;
  maxEntries: number;
}

interface Entry {
  value: RecallIntakeResponse;
  expiresAtMs: number;
}

function composeKey(k: IdempotencyKey): string {
  // Tuple-encoded so concatenation-style ambiguities (e.g. a tenant_id
  // containing a separator, or a caller_actor_id whose suffix matches
  // another tenant's prefix) cannot collide with a different
  // (tenant, caller, key) triple. JSON-encoded array preserves field
  // boundaries through escaping.
  return JSON.stringify([k.tenant_id, k.caller_actor_id, k.request_key]);
}

export function createIdempotencyCache(cfg: IdempotencyCacheConfig): IdempotencyCache {
  const ttlMs = cfg.ttlSec * 1000;
  const map = new Map<string, Entry>();

  function evictExpired(now: number): void {
    for (const [k, e] of map) {
      if (e.expiresAtMs <= now) map.delete(k);
    }
  }

  function evictLruIfNeeded(): void {
    while (map.size > cfg.maxEntries) {
      const oldest = map.keys().next();
      if (oldest.done) break;
      map.delete(oldest.value);
    }
  }

  return {
    get(key, now) {
      const k = composeKey(key);
      const e = map.get(k);
      if (!e) return undefined;
      if (e.expiresAtMs <= now) {
        map.delete(k);
        return undefined;
      }
      // Refresh LRU position without changing expiry.
      map.delete(k);
      map.set(k, e);
      return e.value;
    },
    put(key, value, now) {
      const k = composeKey(key);
      evictExpired(now);
      map.delete(k);
      map.set(k, { value, expiresAtMs: now + ttlMs });
      evictLruIfNeeded();
    },
    size() {
      return map.size;
    },
  };
}
