// Phase 26E — endpoint-local per-tenant rate limit.
//
// ADR-026D §3.a (ii): per-tenant token-bucket keyed on the AUTHORITATIVE
// tenant id (resolved from authenticated session, not from caller-supplied
// body). Layered on top of the existing /api/* wallet-keyed limiter; this
// limiter is endpoint-local to /api/recall/intake and uses stricter limits
// sourced from config.
//
// Single-instance only (in-memory). Multi-instance posture is satisfied by
// `enforceSingleInstance: true` on the route adapter when configured for
// multi-process deployment (ADR-026D §3.c (ii) is reserved for that path;
// the default Phase 26E posture is per-estate serialization §3.c (i)).

export interface PerTenantRateLimit {
  /** Returns true if the request is allowed; false if rate-limited. */
  consume(tenant_id: string, now: number): boolean;
  /** Test/observability hook — current bucket level for a tenant. */
  inspect(tenant_id: string, now: number): { tokens: number; capacity: number };
}

export interface PerTenantRateLimitConfig {
  /** Refill rate in requests per minute. */
  rpm: number;
  /** Bucket capacity (burst). Defaults to `rpm`. */
  capacity?: number;
  /** Max tracked tenants before LRU eviction. Defaults to 10_000. */
  maxTracked?: number;
}

interface Bucket {
  tokens: number;
  lastRefillMs: number;
  lastAccessMs: number;
}

export function createPerTenantRateLimit(cfg: PerTenantRateLimitConfig): PerTenantRateLimit {
  const capacity = cfg.capacity ?? cfg.rpm;
  const maxTracked = cfg.maxTracked ?? 10_000;
  const refillPerMs = cfg.rpm / 60_000;
  const buckets = new Map<string, Bucket>();

  function refill(b: Bucket, now: number): void {
    const elapsed = now - b.lastRefillMs;
    if (elapsed > 0) {
      b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
      b.lastRefillMs = now;
    }
  }

  function evictIfNeeded(): void {
    if (buckets.size <= maxTracked) return;
    const sorted = [...buckets.entries()].sort((a, b) => a[1].lastAccessMs - b[1].lastAccessMs);
    const target = Math.floor(maxTracked * 0.9);
    while (buckets.size > target && sorted.length > 0) {
      const head = sorted.shift();
      if (head) buckets.delete(head[0]);
    }
  }

  return {
    consume(tenant_id, now) {
      let b = buckets.get(tenant_id);
      if (!b) {
        b = { tokens: capacity, lastRefillMs: now, lastAccessMs: now };
        buckets.set(tenant_id, b);
        evictIfNeeded();
      }
      refill(b, now);
      b.lastAccessMs = now;
      if (b.tokens >= 1) {
        b.tokens -= 1;
        return true;
      }
      return false;
    },
    inspect(tenant_id, now) {
      const b = buckets.get(tenant_id);
      if (!b) return { tokens: capacity, capacity };
      refill(b, now);
      return { tokens: b.tokens, capacity };
    },
  };
}
