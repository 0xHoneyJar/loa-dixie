// ADR-026D §3.b (i); §5.b: replay returns prior receipt; replay-cannot-
// alter-authorization; LRU eviction; TTL expiry.

import { describe, expect, it } from 'vitest';
import { createIdempotencyCache } from '../../../src/services/straylight-recall-intake/index.js';
import type { RecallIntakeResponse } from '@loa/straylight/host';

const SERVED_A: RecallIntakeResponse = {
  outcome: 'served',
  pack: { recall_pack_id: 'p_a' } as never,
  receipt: { receipt_id: 'r_a' } as never,
  audit_event_id: 'ae_a',
};
const SERVED_B: RecallIntakeResponse = {
  outcome: 'served',
  pack: { recall_pack_id: 'p_b' } as never,
  receipt: { receipt_id: 'r_b' } as never,
  audit_event_id: 'ae_b',
};
const DENIED_A: RecallIntakeResponse = {
  outcome: 'denied',
  reason: 'class_validation_failed',
  raw_reasons: ['class:bad'],
};

describe('idempotency-cache', () => {
  it('returns prior response on hit (replay-cannot-alter-authorization)', () => {
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    const key = { tenant_id: 'w', caller_actor_id: 'w', request_key: 'k1' };
    cache.put(key, DENIED_A, 0);
    // Even if the world says "now serve it", the cache returns DENIED.
    const got = cache.get(key, 0);
    expect(got).toEqual(DENIED_A);
  });

  it('different request keys do not collide', () => {
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    cache.put({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k1' }, SERVED_A, 0);
    cache.put({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k2' }, SERVED_B, 0);
    expect(cache.get({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k1' }, 0)).toEqual(SERVED_A);
    expect(cache.get({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k2' }, 0)).toEqual(SERVED_B);
  });

  it('different tenants do not collide on same request key', () => {
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    cache.put({ tenant_id: 'w1', caller_actor_id: 'w1', request_key: 'k' }, SERVED_A, 0);
    cache.put({ tenant_id: 'w2', caller_actor_id: 'w2', request_key: 'k' }, SERVED_B, 0);
    expect(cache.get({ tenant_id: 'w1', caller_actor_id: 'w1', request_key: 'k' }, 0)).toEqual(SERVED_A);
    expect(cache.get({ tenant_id: 'w2', caller_actor_id: 'w2', request_key: 'k' }, 0)).toEqual(SERVED_B);
  });

  it('expires entries after ttl', () => {
    const cache = createIdempotencyCache({ ttlSec: 5, maxEntries: 16 });
    const key = { tenant_id: 'w', caller_actor_id: 'w', request_key: 'k' };
    cache.put(key, SERVED_A, 0);
    expect(cache.get(key, 4_000)).toEqual(SERVED_A);
    expect(cache.get(key, 6_000)).toBeUndefined();
  });

  it('evicts to maxEntries (LRU)', () => {
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 2 });
    cache.put({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k1' }, SERVED_A, 0);
    cache.put({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k2' }, SERVED_B, 0);
    cache.put({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k3' }, SERVED_A, 0);
    expect(cache.size()).toBeLessThanOrEqual(2);
    expect(cache.get({ tenant_id: 'w', caller_actor_id: 'w', request_key: 'k1' }, 0)).toBeUndefined();
  });

  it('runOnce: concurrent same-key calls execute callback exactly once', async () => {
    // SKP-002: when two callers race on the same idempotency tuple, only
    // one exec invocation must run. The second caller awaits the same
    // in-flight promise rather than launching a parallel seam call.
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    const key = { tenant_id: 'w', caller_actor_id: 'w', request_key: 'race' };
    let execCount = 0;
    let resolveExec!: (v: RecallIntakeResponse) => void;
    const gate = new Promise<RecallIntakeResponse>((res) => {
      resolveExec = res;
    });
    const exec = async () => {
      execCount += 1;
      return gate;
    };
    const p1 = cache.runOnce(key, 0, exec);
    const p2 = cache.runOnce(key, 0, exec);
    // Allow microtasks to fire — both callers should be queued on the
    // same in-flight slot before exec resolves.
    await Promise.resolve();
    expect(execCount).toBe(1);
    resolveExec(SERVED_A);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(execCount).toBe(1);
    // Both callers receive the SAME settled response object/body.
    expect(r1).toEqual(SERVED_A);
    expect(r2).toEqual(SERVED_A);
    expect(r1).toBe(r2);
  });

  it('runOnce: post-settlement same-key call returns cached value without re-executing', async () => {
    // SKP-002: after the first exec settles, the response is pinned in the
    // cache. A subsequent runOnce with the same key must return the cached
    // value and MUST NOT invoke the supplied exec.
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    const key = { tenant_id: 'w', caller_actor_id: 'w', request_key: 'settle' };
    let execCount = 0;
    const r1 = await cache.runOnce(key, 0, async () => {
      execCount += 1;
      return SERVED_A;
    });
    expect(r1).toEqual(SERVED_A);
    expect(execCount).toBe(1);
    // Wait one microtask cycle so the inflight finally cleanup runs and
    // we cannot accidentally hit the in-flight coalescing path.
    await Promise.resolve();
    await Promise.resolve();
    const r2 = await cache.runOnce(key, 0, async () => {
      execCount += 1;
      return SERVED_B;
    });
    // Cached response wins; exec is not called a second time.
    expect(r2).toEqual(SERVED_A);
    expect(execCount).toBe(1);
  });

  it('runOnce: rejected exec is not cached; next caller may retry', async () => {
    // SKP-002 rejection handling: a failed exec frees the in-flight slot
    // without poisoning the cache. The subsequent caller is free to run
    // its own exec and the result is then cached.
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    const key = { tenant_id: 'w', caller_actor_id: 'w', request_key: 'retry' };
    let attempts = 0;
    const fail = async (): Promise<RecallIntakeResponse> => {
      attempts += 1;
      throw new Error('seam transient failure');
    };
    await expect(cache.runOnce(key, 0, fail)).rejects.toThrow(/seam transient failure/);
    expect(attempts).toBe(1);
    // Yield so the inflight `.finally` clears the in-flight slot before
    // the retry runs (otherwise the retry would coalesce onto the same
    // rejected promise and we would not exercise the retry path).
    await Promise.resolve();
    await Promise.resolve();
    const ok = async () => {
      attempts += 1;
      return SERVED_B;
    };
    const r = await cache.runOnce(key, 0, ok);
    expect(r).toEqual(SERVED_B);
    expect(attempts).toBe(2);
    // And the success is now cached: a third call returns the cached
    // value without invoking exec.
    const r2 = await cache.runOnce(key, 0, async () => {
      attempts += 1;
      return SERVED_A;
    });
    expect(r2).toEqual(SERVED_B);
    expect(attempts).toBe(2);
  });

  it('ambiguous concatenations do not collide (tuple encoding)', () => {
    // Under naive concatenation `${tenant} ${caller} ${key}` (or any single
    // separator-char delimiter), the following three triples all reduce to
    // the same key. With tuple-JSON encoding they remain distinct.
    const cache = createIdempotencyCache({ ttlSec: 60, maxEntries: 16 });
    const triples: Array<{
      key: { tenant_id: string; caller_actor_id: string; request_key: string };
      value: RecallIntakeResponse;
    }> = [
      // "a b" / "c" / "k"
      {
        key: { tenant_id: 'a b', caller_actor_id: 'c', request_key: 'k' },
        value: SERVED_A,
      },
      // "a" / "b c" / "k"
      {
        key: { tenant_id: 'a', caller_actor_id: 'b c', request_key: 'k' },
        value: SERVED_B,
      },
      // "a" / "b" / "c k" — would collide under "${t} ${c} ${k}"
      {
        key: { tenant_id: 'a', caller_actor_id: 'b', request_key: 'c k' },
        value: DENIED_A,
      },
      // Quote/backslash payloads — would collide under naive escape-free
      // delimiter encoding if separators show up inside fields.
      {
        key: { tenant_id: 'x"y', caller_actor_id: 'z', request_key: 'k' },
        value: SERVED_A,
      },
      {
        key: { tenant_id: 'x', caller_actor_id: 'y"z', request_key: 'k' },
        value: SERVED_B,
      },
    ];
    for (const { key, value } of triples) cache.put(key, value, 0);
    for (const { key, value } of triples) {
      expect(cache.get(key, 0)).toEqual(value);
    }
    expect(cache.size()).toBe(triples.length);
  });
});
