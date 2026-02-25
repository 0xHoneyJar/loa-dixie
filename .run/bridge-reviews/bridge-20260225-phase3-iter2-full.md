# Bridge Review: Dixie Phase 3 — Production Wiring & Live Integration

**PR**: #11 on `0xHoneyJar/loa-dixie`
**Branch**: `feature/dixie-phase3-prod-wiring` based on `feature/hounfour-v7.11.0-adoption`
**Iteration**: 2
**Date**: 2026-02-25
**Reviewer**: Bridgebuilder (claude-opus-4-6)
**Previous Score**: 37 (Iteration 1)
**Current Score**: 1
**Status**: FLATLINE

---

## Opening Context

I have reviewed every fix from Iteration 1, and what I find here is the engineering equivalent of a clean surgical recovery. Nine findings raised; nine findings addressed. Not with the haste of someone checking boxes, but with the precision of someone who understood the underlying concern.

The best indicator of engineering maturity is not the code you write — it is the code you write in response to criticism. And here, every fix demonstrates that the author internalized the *why* behind each finding, not just the *what*.

Let me walk through what I found.

---

## Iteration 1 Fix Verification

### HIGH-1: `getEventHistory` LIMIT clause — VERIFIED

**File**: `app/src/db/pg-reputation-store.ts:92-98`

The fix is clean and correct. The method now accepts an optional `limit` parameter with a default of 1000:

```typescript
async getEventHistory(nftId: string, limit = 1000): Promise<ReputationEvent[]> {
  const result = await this.pool.query(
    `SELECT event FROM reputation_events
     WHERE nft_id = $1 ORDER BY created_at ASC LIMIT $2`,
    [nftId, limit],
  );
```

The parameterized `LIMIT $2` is the right approach — it lets PostgreSQL's planner optimize the index scan to stop after N rows rather than scanning the entire partition for the given `nft_id`. The default of 1000 is generous enough for any reasonable event history query while preventing the table-scan catastrophe.

The test at `pg-reputation-store.test.ts:205` correctly asserts the default parameter:
```typescript
expect(pool.query).toHaveBeenCalledWith(
  expect.stringContaining('ORDER BY created_at ASC'),
  ['nft-1', 1000],
);
```

The interface at `reputation-service.ts:130` still declares `getEventHistory(nftId: string): Promise<ReputationEvent[]>` — the Postgres implementation adds the optional `limit` parameter as a compatible extension. TypeScript allows this (extra optional parameters on an implementation are structurally compatible with a narrower interface). This is intentional and correct.

### HIGH-2: `countByState()` method — VERIFIED

**File**: `app/src/db/pg-reputation-store.ts:105-114`

```typescript
async countByState(): Promise<Map<string, number>> {
  const result = await this.pool.query(
    'SELECT state, COUNT(*)::int AS count FROM reputation_aggregates GROUP BY state',
  );
  const map = new Map<string, number>();
  for (const row of result.rows as Array<{ state: string; count: number }>) {
    map.set(row.state, row.count);
  }
  return map;
}
```

This is exactly the query shape I suggested. The `GROUP BY state` query avoids fetching any JSONB data — it reads only the extracted `state` column, which is covered by the `idx_reputation_aggregates_state` index. The `COUNT(*)::int` cast prevents the BigInt gotcha from PostgreSQL's native COUNT return type. The `Map<string, number>` return type is the right choice over a plain object — it preserves insertion order and provides cleaner semantics for an enumerated key space.

One observation: `countByState()` is not on the `ReputationStore` interface. It lives only on the concrete `PostgresReputationStore` class. This is acceptable — the enrichment service accesses it through the concrete type when the store is Postgres-backed. The original `listAll()` remains on the interface for callers that genuinely need the full data set. This is a proper layering: interface defines the contract, concrete class extends with optimized operations.

### MEDIUM-1: JWKS cache documentation — VERIFIED (operational, no code change)

Acknowledged in Iteration 1 as an operational concern. The module-level cache combined with `Cache-Control: public, max-age=3600` is acceptable for the initial deployment. Key rotation requires redeployment, which invalidates the in-process cache. The 1-hour HTTP cache-control means downstream verifiers will pick up the new key within one hour. Documented appropriately.

### MEDIUM-2: ES256 key caching single-PEM limitation — VERIFIED

**File**: `app/src/routes/auth.ts:137-139`

The comment has been improved:
```typescript
// NOTE: Single-PEM assumption — cache ignores the `pem` parameter after first call.
// Call resetAuthKeyCache() between tests with different keys.
// In production, createDixieApp is called once, so this is safe.
```

This is a model documentation comment. It explains (a) the limitation, (b) the testing mitigation, and (c) why it is safe in production. A future developer reading this code will immediately understand the contract.

### MEDIUM-3: `hs256FallbackSecret` wiring — VERIFIED

This was the most architecturally significant fix. The old HS256 secret must be available at two verification points: the middleware (pre-route JWT extraction) and the auth routes (explicit /verify endpoint). Both are now wired:

**Middleware** (`server.ts:280-283`):
```typescript
app.use('/api/*', createJwtMiddleware(
  config.jwtPrivateKey, 'dixie-bff', config.isEs256,
  config.hs256FallbackSecret ?? undefined,
));
```

**Auth routes** (`server.ts:331-337`):
```typescript
app.route('/api/auth', createAuthRoutes(allowlistStore, {
  jwtPrivateKey: config.jwtPrivateKey,
  issuer: 'dixie-bff',
  expiresIn: '1h',
  isEs256: config.isEs256,
  hs256FallbackSecret: config.hs256FallbackSecret ?? undefined,
}));
```

**Config** (`config.ts:53-54, 181-183`):
```typescript
hs256FallbackSecret: string | null;
// ...
hs256FallbackSecret: process.env.DIXIE_HS256_FALLBACK_SECRET ?? null,
```

The `?? undefined` coercion at the call sites converts `null` (config's representation of "not set") to `undefined` (the parameter's default), which is clean. The JWT middleware's handling is also correct — line 21 of `jwt.ts`:

```typescript
const hs256Secret = new TextEncoder().encode(hs256FallbackSecret ?? jwtSecret);
```

When `hs256FallbackSecret` is `undefined` (not in transition), this falls back to `jwtSecret`, preserving HS256 verification with the primary key. When it is a string (in transition), ES256 tries first, then falls back to verifying with the old HS256 secret. This is a robust dual-algorithm transition.

### MEDIUM-4: Health endpoint try-catch on `count()` — VERIFIED

**File**: `app/src/routes/health.ts:61-66`

```typescript
let aggregateCount: number;
try {
  aggregateCount = await deps.reputationService.store.count();
} catch {
  aggregateCount = -1; // Store unreachable — degrade gracefully
}
```

The sentinel value of `-1` is the conventional signal for "unknown/unreachable" in health check responses. This prevents a failed `count()` query from crashing the health endpoint — which is critical because health endpoints are the last line of defense for observability. An ALB that cannot reach the health endpoint will take the entire service out of rotation.

### MEDIUM-5: Retention strategy comment in migration — VERIFIED

**File**: `app/src/db/migrations/005_reputation.sql:36-39`

```sql
-- RETENTION STRATEGY: Events older than 90 days should be archived or pruned.
-- Consider partitioning by month when event volume exceeds 1M rows.
-- UUIDv4 PK creates random write patterns; migrate to UUIDv7 or BIGSERIAL
-- when insert throughput warrants sequential key performance.
```

This goes beyond what I asked for. Not only does it document the retention strategy, it anticipates two additional scaling concerns: the partitioning inflection point (1M rows) and the UUIDv4 write amplification problem. The UUIDv7 callout is particularly informed — UUIDv7 preserves lexicographic ordering (monotonic per-host) while maintaining global uniqueness, giving you both the distributed-safe IDs of UUIDs and the sequential write patterns of BIGSERIAL. This is the kind of forward-looking comment that saves a team weeks when they hit the scaling threshold.

### LOW-1: Docker Compose `version` key removed — VERIFIED

**File**: `deploy/docker-compose.integration.yml`

The file no longer contains the deprecated `version` key. Clean.

### LOW-2: Health cache TTL — VERIFIED (acceptable, no code change)

The 10-second TTL on the finn health cache is appropriate for ALB health checks at 5-second intervals. This prevents the health endpoint from DDoSing the upstream service while still detecting failures within two check intervals.

---

## New Issue Scan

I re-examined the key files with fresh eyes, looking specifically for:
1. Issues introduced by the iteration 1 fixes
2. Issues that were obscured by the larger iteration 1 concerns
3. Edge cases in the new code paths

### JWT Middleware (`jwt.ts`)

The fallback logic is correct. One subtle detail worth noting: when `isEs256` is true and `hs256FallbackSecret` is provided, the middleware tries ES256 first, catches any error silently, then falls back to HS256. The only diagnostic is the structured log at lines 57-70 — but that log only fires if *both* algorithms fail. There is no log for "ES256 failed, HS256 fallback succeeded." This is a minor observability gap but not worth a finding — once the transition is complete and the fallback is removed, the log is exactly right. During transition, operators can correlate JWT algorithm usage via the `alg` header in the tokens themselves.

### JWKS Routes (`jwks.ts`)

Clean. No new issues.

### Payment Middleware (`payment.ts`)

Clean. The scaffold is appropriately minimal. Setting headers after `await next()` is correct middleware positioning.

### NFT Ownership Resolver (`nft-ownership-resolver.ts`)

Clean. All three methods have try-catch with null returns, which matches the graceful degradation contract.

### Auth Routes (`auth.ts`)

The dual-path verification in `/verify` (lines 94-113) mirrors the middleware logic but differs in one way: the middleware silently continues on failure (allowing downstream middleware to handle auth), while `/verify` returns a 401. This asymmetry is correct — the middleware is a cooperative participant in a pipeline, while `/verify` is an explicit authentication check.

### Reputation Store (`pg-reputation-store.ts`)

The `listAll()` method at line 52 still has no LIMIT clause, but this was the subject of HIGH-2 in iteration 1 — the response was to add `countByState()` as an optimized alternative for the tier distribution use case. The `listAll()` itself remains for cases where the full dataset is genuinely needed. This is an acceptable resolution: the hot-path caller now uses `countByState()`, and `listAll()` exists for administrative/batch operations where loading the full dataset is intentional.

---

## Findings

<!-- bridge-findings-start -->
```json
{
  "schema_version": 1,
  "bridge_iteration": 2,
  "pr_number": 11,
  "timestamp": "2026-02-25T14:00:00Z",
  "convergence_score": 1,
  "previous_score": 37,
  "status": "FLATLINE",
  "findings": [
    {
      "id": "low-1",
      "title": "getEventHistory interface/implementation signature divergence",
      "severity": "LOW",
      "category": "api-contract",
      "file": "app/src/services/reputation-service.ts:130",
      "description": "The ReputationStore interface declares `getEventHistory(nftId: string): Promise<ReputationEvent[]>` (no limit parameter), while PostgresReputationStore implements `getEventHistory(nftId: string, limit = 1000)`. TypeScript allows this because extra optional parameters are structurally compatible. However, callers using the interface type cannot pass a limit — only callers with a reference to the concrete PostgresReputationStore can. If a future caller needs to control the limit, they will need to either (a) cast to the concrete type or (b) update the interface. This is a minor contract asymmetry, not a bug.",
      "suggestion": "Consider adding the optional `limit` parameter to the ReputationStore interface: `getEventHistory(nftId: string, limit?: number): Promise<ReputationEvent[]>`. The InMemoryReputationStore can ignore the parameter (or use it to slice the array). This keeps the contract symmetric. Low priority — current callers all use the default.",
      "teachable_moment": "Interface/implementation parameter mismatches are a code smell that TypeScript's structural typing system makes easy to create and hard to detect. The fix is always to surface optional parameters in the interface, even if some implementations ignore them."
    },
    {
      "id": "praise-1",
      "severity": "PRAISE",
      "title": "Exemplary dual-algorithm JWT transition architecture",
      "description": "The HS256-to-ES256 migration across jwt.ts, auth.ts, config.ts, and server.ts is a textbook algorithm transition. Auto-detection from PEM prefix, fallback verification with the old secret, kid headers for future key rotation, and clean wiring through config to both verification points. This is the kind of zero-downtime migration that large-scale systems require.",
      "suggestion": "No changes needed. This is reference-quality implementation.",
      "praise": true,
      "faang_parallel": "Google's IAM key rotation follows this exact pattern: newest key first, fallback to key ring, kid-based selection. Stripe's API key versioning uses the same progressive-enhancement approach for their v1→v2 key migration.",
      "teachable_moment": "The secret to zero-downtime key migration is dual-verification during the transition window. The new algorithm is always tried first (performance path), with the old algorithm as fallback (compatibility path). Once all in-flight tokens have expired, the fallback is removed."
    },
    {
      "id": "praise-2",
      "severity": "PRAISE",
      "title": "Defensive health endpoint with graceful degradation",
      "description": "The health endpoint's try-catch around `store.count()` returning -1 on failure is precisely the right pattern for health checks that aggregate multiple subsystem statuses. A health endpoint that crashes when a subsystem is down is a health endpoint that lies — it reports the service as unreachable when it is merely degraded.",
      "suggestion": "No changes needed.",
      "praise": true,
      "teachable_moment": "Health endpoints must be the most resilient code in your system. Every dependency they check is a potential failure point. The pattern is: try-catch every probe, use sentinel values for failures, and let the overall status computation handle the degradation logic."
    },
    {
      "id": "praise-3",
      "severity": "PRAISE",
      "title": "Migration comments demonstrate production foresight",
      "description": "The retention strategy, partitioning threshold, and UUIDv4→v7 migration notes in 005_reputation.sql go beyond documenting what the code does — they document when and why it will need to change. This is the difference between code that survives and code that thrives.",
      "suggestion": "No changes needed. This is how production migrations should be annotated.",
      "praise": true,
      "teachable_moment": "Migrations are the most permanent code in a system. Schema changes accumulate forever. Comments in migrations are not just for the next reader — they are for the team that inherits the system three years from now and needs to understand the scaling trajectory."
    }
  ]
}
```
<!-- bridge-findings-end -->

---

## Convergence Analysis

| Iteration | Score | HIGH | MEDIUM | LOW | PRAISE |
|-----------|-------|------|--------|-----|--------|
| 1         | 37    | 2    | 5      | 2   | 0      |
| 2         | 1     | 0    | 0      | 1   | 3      |

**Score computation**: 0 HIGH (x10) + 0 MEDIUM (x3) + 1 LOW (x1) + 0 PRAISE (x0) = **1**

**Verdict**: FLATLINE achieved. Convergence score 1 <= 2.

The single remaining LOW finding is a minor interface/implementation asymmetry that has no functional impact. All HIGH and MEDIUM findings from iteration 1 have been addressed correctly and completely.

---

## Closing Reflection

There is a concept in structural engineering called "proof loading" — you apply a load slightly above the expected maximum to verify the structure can handle real-world conditions. Iteration 1 of this review was the proof loading. We pushed on every edge: unbounded queries, missing error boundaries, configuration wiring gaps, key rotation semantics.

The structure held. Every fix addressed the root cause, not just the symptom. The `LIMIT` clause did not just cap a query — it introduced a parameter that lets callers control the bound. The `countByState()` method did not just optimize a hot path — it established the pattern for index-only queries against JSONB tables. The retention strategy comment did not just acknowledge the concern — it provided a roadmap for the next three scaling inflection points.

This is production-ready code. Not because it is perfect — production code never is — but because it demonstrates the engineering judgment to know where the risks are, how to mitigate them, and when to document what cannot yet be resolved. Ship it.

---

*Bridgebuilder — claude-opus-4-6 — 2026-02-25 Iteration 2*
