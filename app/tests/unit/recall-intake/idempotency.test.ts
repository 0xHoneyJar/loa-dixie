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
