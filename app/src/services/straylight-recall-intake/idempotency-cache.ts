// Phase 26E — idempotency / replay cache.
//
// ADR-026D §3.b (i): for matching `(authoritative tenant, authoritative
// caller, Idempotency-Key header)`, return the prior `RecallIntakeResponse`
// rather than appending duplicate state. Bounded LRU + TTL.
//
// Replay-cannot-alter-authorization invariant: a hit returns the prior
// response verbatim. The route never re-executes the runtime seam on a hit
// and never mutates the cached response on retry.
//
// SKP-002 — same-key concurrent execution must not double-execute the
// seam. The cache exposes `runOnce(key, exec, now)`: at most one `exec`
// runs per key while it is in-flight; concurrent callers with the same
// key await the same promise. The first completion populates the cache;
// subsequent callers (in-flight or cached) observe the same response.

import type { RecallIntakeResponse } from '@loa/straylight/host';

export interface IdempotencyKey {
  tenant_id: string;
  caller_actor_id: string;
  request_key: string;
}

export interface IdempotencyCache {
  get(key: IdempotencyKey, now: number): RecallIntakeResponse | undefined;
  put(key: IdempotencyKey, value: RecallIntakeResponse, now: number): void;
  /**
   * Atomic same-key execution gate (SKP-002). When called concurrently
   * with the same `key`, only the first call invokes `exec`; the rest
   * await the same in-flight promise. After completion, the result is
   * cached and subsequent calls return the cached response without
   * re-executing.
   *
   * Rejection is NOT cached — a failed exec frees the in-flight slot so
   * the next caller can retry. This is intentional: idempotency caches
   * successful replay state, not failures.
   */
  runOnce(
    key: IdempotencyKey,
    now: number,
    exec: () => Promise<RecallIntakeResponse>,
  ): Promise<RecallIntakeResponse>;
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
  const inflight = new Map<string, Promise<RecallIntakeResponse>>();

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

  function getInternal(k: string, now: number): RecallIntakeResponse | undefined {
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
  }

  function putInternal(k: string, value: RecallIntakeResponse, now: number): void {
    evictExpired(now);
    map.delete(k);
    map.set(k, { value, expiresAtMs: now + ttlMs });
    evictLruIfNeeded();
  }

  return {
    get(key, now) {
      return getInternal(composeKey(key), now);
    },
    put(key, value, now) {
      putInternal(composeKey(key), value, now);
    },
    runOnce(key, now, exec) {
      const k = composeKey(key);
      // Cache hit short-circuits before launching exec.
      const cached = getInternal(k, now);
      if (cached !== undefined) return Promise.resolve(cached);
      // Coalesce concurrent same-key calls onto a single in-flight promise.
      const existing = inflight.get(k);
      if (existing) return existing;
      const p: Promise<RecallIntakeResponse> = (async () => {
        try {
          const result = await exec();
          // Populate cache before any other waiter observes resolution so
          // a same-key follow-up that arrives after this resolves but
          // before the inflight slot is cleared still hits the cache.
          putInternal(k, result, Date.now());
          return result;
        } finally {
          // Free the in-flight slot whether exec succeeded or threw. A
          // rejected exec is NOT cached — next caller is free to retry.
          // (The slot is identified by reference equality with the
          // current promise, so a later caller that already started a new
          // exec is not affected.)
          // Note: `inflight.set(k, p)` runs synchronously after this IIFE
          // is constructed but before any await resumes, so by the time
          // this `finally` block executes, `inflight.get(k)` is `p`.
        }
      })();
      inflight.set(k, p);
      // Attach a cleanup tap that fires after the IIFE settles. We use
      // `.finally` here (not inside the IIFE) because the IIFE body must
      // be able to refer to `p`, but the closure assignment of `p` is
      // not visible to TS flow analysis from inside the IIFE.
      // The trailing `.catch(() => {})` swallows the cleanup chain's own
      // rejection — `p` itself is awaited by the caller (who handles or
      // re-throws), so this branch only exists to free the in-flight
      // slot without producing an unhandled rejection.
      void p
        .finally(() => {
          if (inflight.get(k) === p) inflight.delete(k);
        })
        .catch(() => undefined);
      return p;
    },
    size() {
      return map.size;
    },
  };
}
