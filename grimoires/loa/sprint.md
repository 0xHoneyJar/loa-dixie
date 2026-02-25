# Sprint Plan: Cycle-006 Continuation — Bridge Review Adoption

**Cycle**: cycle-006 (Dixie Phase 3 — Production Wiring & Live Integration)
**Sprints**: 5-7 (Global 69-71)
**Source**: Bridgebuilder reviews on PR #11 — Iterations 1, 2, and Deep Meditation
**Date**: 2026-02-25
**Status**: Planned

---

## Context

Sprints 1-4 (Global 65-68) delivered the core Phase 3 implementation: PostgresReputationStore, ES256 JWT migration, payment scaffold, NFT ownership resolver, Terraform wiring, and E2E infrastructure. Bridge review iteration 1 scored 37, iteration 2 achieved flatline at score 1. Seven findings from iteration 1 were fixed in commit 2c4261b.

These continuation sprints address all remaining findings — the unfixed LOW and MEDIUM items from iterations 1-2, the SPECULATION findings that map to concrete architectural improvements, and the deep meditation's vision for event sourcing, multi-currency awareness, and community-scoped cryptographic infrastructure.

### Remaining Findings Inventory

| Source | ID | Severity | Title | Sprint |
|--------|----|----------|-------|--------|
| Iter 1 | MEDIUM-1 | MEDIUM | JWKS cache TTL (in-process regeneration) | 6 |
| Iter 1 | LOW-2 | LOW | Asymmetric health cache TTLs | 5 |
| Iter 2 | LOW-1 | LOW | getEventHistory interface/impl limit divergence | 5 |
| Iter 1 | SPECULATION-1 | SPECULATION | Event-sourced reputation with snapshot compaction | 7 |
| Iter 1 | SPECULATION-2 | SPECULATION | JWKS key rotation via multiple kids | 6 |
| Meditation | §II | SPECULATION | countByState() on ReputationStore interface | 5 |
| Meditation | §IV | SPECULATION | Multi-currency budget awareness (ResourceGovernor) | 7 |
| Meditation | §IV | SPECULATION | Community-scoped JWKS (multiple kids per community) | 6 |
| Meditation | §IV | SPECULATION | Multi-rail payment scaffold | 7 |
| Meditation | §V | SPECULATION | Per-community reputation scoping | 7 |
| Meditation | §I | SPECULATION | getRecentEvents() for DESC + LIMIT + reverse | 5 |

---

## Sprint 5 (Global 69): Reputation Store Maturation

**Theme**: Interface alignment, event query optimization, health resilience
**Goal**: Bring the ReputationStore interface to parity with its PostgreSQL implementation, add optimized event access patterns, and harden health endpoint caching.

### Task 5.1: Align ReputationStore interface with PostgreSQL implementation

**Finding**: Iter 2 LOW-1, Meditation §II
**Files**:
- `app/src/services/reputation-service.ts` — ReputationStore interface
- `app/src/services/reputation-service.ts` — InMemoryReputationStore
- `app/src/db/pg-reputation-store.ts` — PostgresReputationStore (verify conformance)

**Changes**:
1. Add optional `limit` parameter to `getEventHistory` on `ReputationStore` interface:
   ```typescript
   getEventHistory(nftId: string, limit?: number): Promise<ReputationEvent[]>;
   ```
2. Add `countByState()` method to `ReputationStore` interface:
   ```typescript
   countByState(): Promise<Map<string, number>>;
   ```
3. Implement `countByState()` on `InMemoryReputationStore` — iterate store entries and count by state.
4. Update `getEventHistory` on `InMemoryReputationStore` to respect `limit` parameter via `.slice(0, limit)`.

**Acceptance Criteria**:
- `ReputationStore` interface declares both `getEventHistory(nftId, limit?)` and `countByState()`
- `InMemoryReputationStore.getEventHistory('nft-1', 5)` returns at most 5 events
- `InMemoryReputationStore.countByState()` returns correct `Map<string, number>`
- All existing tests pass unchanged (TypeScript structural compatibility preserved)

**Tests**:
- Unit: `reputation-service.test.ts` — test InMemoryReputationStore limit parameter
- Unit: `reputation-service.test.ts` — test InMemoryReputationStore countByState()
- Verify: existing pg-reputation-store tests still pass

---

### Task 5.2: Add getRecentEvents() method for trend computation

**Finding**: Iter 1 HIGH-1 suggestion, Meditation §I
**Files**:
- `app/src/services/reputation-service.ts` — ReputationStore interface
- `app/src/services/reputation-service.ts` — InMemoryReputationStore
- `app/src/db/pg-reputation-store.ts` — PostgresReputationStore

**Changes**:
1. Add `getRecentEvents(nftId: string, limit: number): Promise<ReputationEvent[]>` to `ReputationStore` interface. Returns the N most recent events in chronological order (oldest first among the recent N).
2. PostgreSQL implementation: `SELECT event FROM reputation_events WHERE nft_id = $1 ORDER BY created_at DESC LIMIT $2` then reverse the array in application code. This uses the index efficiently — PostgreSQL's planner stops after N rows from the index tail.
3. InMemory implementation: `.slice(-limit)` on the event array.

**Acceptance Criteria**:
- `getRecentEvents('nft-1', 10)` returns the 10 most recent events in chronological order
- PostgreSQL query uses `DESC LIMIT` (index-efficient top-N pattern)
- InMemory implementation returns equivalent results
- When fewer than N events exist, returns all events

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify DESC LIMIT query and array reversal
- Unit: `reputation-service.test.ts` — InMemory getRecentEvents with various counts

---

### Task 5.3: Implement asymmetric health cache TTLs

**Finding**: Iter 1 LOW-2
**Files**:
- `app/src/routes/health.ts`

**Changes**:
1. Replace single `CACHE_TTL_MS = 10_000` with two constants:
   - `HEALTHY_CACHE_TTL_MS = 30_000` — cache healthy responses for 30 seconds
   - `UNHEALTHY_CACHE_TTL_MS = 5_000` — cache unhealthy responses for 5 seconds
2. In `getFinnHealth()`, select TTL based on result status:
   ```typescript
   const ttl = result.status === 'healthy' ? HEALTHY_CACHE_TTL_MS : UNHEALTHY_CACHE_TTL_MS;
   cachedFinnHealth = { data: result, expiresAt: now + ttl };
   ```

**Rationale**: Healthy upstream should not be re-probed every 10 seconds during normal operation (reduces load). Unhealthy upstream should be re-probed quickly so recovery is detected within one ALB check interval.

**Acceptance Criteria**:
- Healthy finn response cached for 30 seconds
- Unhealthy finn response cached for 5 seconds
- Existing health endpoint behavior unchanged (same response shape)

**Tests**:
- Unit: `health.test.ts` — verify healthy result uses 30s cache (second call within 30s returns cached)
- Unit: `health.test.ts` — verify unhealthy result uses 5s cache (call after 5s re-probes)

---

### Task 5.4: Add snapshot_version column to reputation_aggregates

**Finding**: Meditation — event-sourced reputation preparation
**Files**:
- `app/src/db/migrations/006_reputation_snapshot.sql` (new file)
- `app/src/db/pg-reputation-store.ts` — update put() to write snapshot_version

**Changes**:
1. Create migration `006_reputation_snapshot.sql`:
   ```sql
   ALTER TABLE reputation_aggregates
     ADD COLUMN IF NOT EXISTS snapshot_version BIGINT NOT NULL DEFAULT 0;
   COMMENT ON COLUMN reputation_aggregates.snapshot_version IS
     'Monotonically increasing version for event-sourced snapshot compaction.
      Incremented on each put(). When replay produces a higher version than
      stored, the aggregate is stale and should be recomputed.';
   ```
2. Update `PostgresReputationStore.put()` to increment snapshot_version:
   ```sql
   INSERT INTO reputation_aggregates (nft_id, state, aggregate, snapshot_version)
   VALUES ($1, $2, $3, 1)
   ON CONFLICT (nft_id) DO UPDATE
   SET state = $2, aggregate = $3, snapshot_version = reputation_aggregates.snapshot_version + 1, updated_at = now()
   ```

**Acceptance Criteria**:
- Migration is idempotent (`ADD COLUMN IF NOT EXISTS`)
- `put()` increments snapshot_version on each upsert
- `get()` does not need to return snapshot_version (internal bookkeeping)
- Existing tests pass unchanged

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify put() query includes snapshot_version increment
- Verify: migration file is syntactically valid SQL

---

### Task 5.5: Add event_count column to reputation_aggregates for compaction signals

**Finding**: Meditation — event-sourced reputation preparation
**Files**:
- `app/src/db/migrations/006_reputation_snapshot.sql` (same file as Task 5.4)
- `app/src/db/pg-reputation-store.ts` — update appendEvent() to increment event_count

**Changes**:
1. Extend migration `006_reputation_snapshot.sql`:
   ```sql
   ALTER TABLE reputation_aggregates
     ADD COLUMN IF NOT EXISTS event_count BIGINT NOT NULL DEFAULT 0;
   COMMENT ON COLUMN reputation_aggregates.event_count IS
     'Count of events appended since last snapshot compaction.
      When event_count exceeds a threshold (e.g., 100), the aggregate
      should be recomputed from the event log and snapshot_version reset.';
   ```
2. Update `appendEvent()` to atomically increment the aggregate's event_count:
   ```sql
   UPDATE reputation_aggregates SET event_count = event_count + 1 WHERE nft_id = $1
   ```
   Execute as a second statement after the INSERT. If no aggregate exists yet, skip (event before aggregate is valid — the count starts when the aggregate is created).

**Acceptance Criteria**:
- Migration adds event_count column with default 0
- appendEvent() increments event_count on the corresponding aggregate row
- Missing aggregate row (no prior put()) does not cause an error
- Existing tests pass unchanged

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify appendEvent() executes UPDATE query
- Unit: `pg-reputation-store.test.ts` — verify no error when aggregate row does not exist

---

## Sprint 6 (Global 70): Cryptographic Operations Hardening -- COMPLETED

**Theme**: JWKS cache TTL, key rotation infrastructure, community-scoped key readiness
**Goal**: Make the cryptographic infrastructure production-resilient with TTL-based cache invalidation, multi-key JWKS support, and the groundwork for community-scoped signing authorities.
**Review**: APPROVED (2 cycles -- Cycle 1: 3 findings, Cycle 2: all resolved)

### Task 6.1: Add TTL-based JWKS in-process cache invalidation [DONE]

**Finding**: Iter 1 MEDIUM-1
**Files**:
- `app/src/routes/jwks.ts`

**Changes**:
1. Replace the permanent module-level `cachedJwks` with a TTL-aware cache:
   ```typescript
   let cachedJwks: { data: { keys: jose.JWK[] }; expiresAt: number } | null = null;
   const JWKS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
   ```
2. In the request handler, check `cachedJwks.expiresAt`:
   ```typescript
   if (!cachedJwks || Date.now() >= cachedJwks.expiresAt) {
     // Regenerate JWKS from PEM
     const publicKey = createPublicKey(createPrivateKey(config.jwtPrivateKey));
     const jwk = await jose.exportJWK(publicKey);
     cachedJwks = {
       data: { keys: [{ ...jwk, kid: 'dixie-es256-v1', use: 'sig', alg: 'ES256' }] },
       expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
     };
   }
   ```
3. Keep `Cache-Control: public, max-age=3600` on the HTTP response (downstream caching is independent of in-process cache).

**Rationale**: In-process cache regeneration every 5 minutes means that a key rotation via Secrets Manager + ECS redeployment is picked up within 5 minutes even if the process survives (blue-green deployment overlap). The HTTP `max-age=3600` governs downstream caching.

**Acceptance Criteria**:
- JWKS response regenerated from PEM every 5 minutes (not just on process restart)
- `resetJwksCache()` still works for tests
- HTTP `Cache-Control` header unchanged
- Existing JWKS tests pass

**Tests**:
- Unit: `jwks.test.ts` — verify cache expiry triggers regeneration (mock Date.now())
- Unit: `jwks.test.ts` — verify cached response returned within TTL window

---

### Task 6.2: Refactor JWKS to support multiple keys in the key set [DONE]

**Finding**: Iter 1 SPECULATION-2, Meditation §IV
**Files**:
- `app/src/routes/jwks.ts`
- `app/src/config.ts` — add DIXIE_JWT_PREVIOUS_KEY env var

**Changes**:
1. Add `jwtPreviousKey` to `DixieConfig`:
   ```typescript
   /** Previous ES256 PEM key for key rotation grace period. Null when not rotating. */
   jwtPreviousKey: string | null;
   ```
2. Add env var parsing in `loadConfig()`:
   ```typescript
   jwtPreviousKey: process.env.DIXIE_JWT_PREVIOUS_KEY ?? null,
   ```
3. Update `JwksConfig` interface to accept optional previous key.
4. Update JWKS handler to serve both keys when previous key is present:
   - Current key: `kid: 'dixie-es256-v1'` (or versioned from config)
   - Previous key: `kid: 'dixie-es256-v0'` with `use: 'sig'`
   - Both served in the `keys` array
5. Update `createJwksRoutes` to accept the new config shape.

**Acceptance Criteria**:
- When only current key configured: JWKS serves single key (existing behavior)
- When both current and previous keys configured: JWKS serves both with different kids
- Previous key marked for verification only in JWKS metadata
- Config loads `DIXIE_JWT_PREVIOUS_KEY` from environment

**Tests**:
- Unit: `jwks.test.ts` — single key returns 1-element keys array
- Unit: `jwks.test.ts` — dual keys return 2-element keys array with distinct kids
- Unit: `config.test.ts` — verify previous key loads from env

---

### Task 6.3: Add key rotation runbook documentation [DONE]

**Finding**: Iter 1 MEDIUM-1 suggestion, SPECULATION-2
**Files**:
- `app/src/routes/jwks.ts` — inline JSDoc
- `app/src/routes/auth.ts` — inline JSDoc

**Changes**:
1. Add a block comment at the top of `jwks.ts` documenting the key rotation procedure:
   ```
   KEY ROTATION RUNBOOK:
   1. Generate new EC P-256 keypair
   2. Set DIXIE_JWT_PREVIOUS_KEY = current DIXIE_JWT_PRIVATE_KEY
   3. Set DIXIE_JWT_PRIVATE_KEY = new private key PEM
   4. Deploy — JWKS now serves both keys, new tokens signed with new key
   5. Wait for max JWT TTL (1 hour) to let old tokens expire
   6. Remove DIXIE_JWT_PREVIOUS_KEY — JWKS returns to single key
   7. Verify: curl /api/auth/.well-known/jwks.json | jq '.keys | length'
   ```
2. Add JSDoc to `auth.ts` `getEs256PrivateKey` explaining that the cache is invalidated by process restart during key rotation deploys.

**Acceptance Criteria**:
- Runbook documented inline in jwks.ts
- Auth.ts key caching behavior documented relative to rotation
- No code changes (documentation only)

**Tests**: None (documentation task).

---

### Task 6.4: Wire previous key for JWT verification fallback chain [DONE]

**Finding**: Iter 1 SPECULATION-2
**Files**:
- `app/src/middleware/jwt.ts`
- `app/src/routes/auth.ts`
- `app/src/server.ts` — wire new config field

**Changes**:
1. Update `createJwtMiddleware` to accept optional `previousEs256Key` parameter.
2. Extend the ES256 verification path: try current key first, then previous key, then HS256 fallback.
3. Update `createAuthRoutes` `/verify` endpoint with the same three-step verification chain.
4. Wire `config.jwtPreviousKey` through `server.ts` to both middleware and routes.

**Acceptance Criteria**:
- Three-step verification: current ES256 -> previous ES256 -> HS256 fallback
- When no previous key configured: existing two-step behavior (current ES256 -> HS256)
- Structured log indicates which algorithm succeeded (for rotation monitoring)
- Existing tests pass unchanged

**Tests**:
- Unit: `jwt.test.ts` — token signed with "previous" key verifies via fallback
- Unit: `auth.test.ts` — /verify endpoint handles previous key tokens
- Verify: middleware falls through correctly when only current key is set

---

### Task 6.5: Apply asymmetric cache TTLs to all health probes [DONE]

**Finding**: Iter 1 LOW-2 (extended from Task 5.3 to all probes)
**Files**:
- `app/src/routes/health.ts`

**Changes**:
1. Extract the asymmetric TTL pattern from `getFinnHealth` (Task 5.3) into a utility:
   ```typescript
   function cacheTtl(status: string): number {
     return status === 'healthy' ? HEALTHY_CACHE_TTL_MS : UNHEALTHY_CACHE_TTL_MS;
   }
   ```
2. Apply asymmetric caching to `getDbHealth()` and `getRedisHealth()`:
   - Add module-level caches for DB and Redis health probes
   - Use the same healthy=30s / unhealthy=5s pattern
3. NATS health is synchronous (no caching needed).

**Acceptance Criteria**:
- DB health probe cached asymmetrically (30s healthy, 5s unhealthy)
- Redis health probe cached asymmetrically (30s healthy, 5s unhealthy)
- Finn health probe uses asymmetric cache from Task 5.3
- Health endpoint overall latency reduced under normal operation (cached probes)

**Tests**:
- Unit: `health.test.ts` — verify DB health uses asymmetric cache TTLs
- Unit: `health.test.ts` — verify Redis health uses asymmetric cache TTLs
- Verify: existing health endpoint tests pass

---

## Sprint 7 (Global 71): Event Sourcing Foundation -- COMPLETED

**Theme**: Snapshot compaction, aggregate reconstruction, multi-currency scaffolding
**Goal**: Build the event-sourced reputation infrastructure that enables algorithm-change replays, and lay the groundwork for multi-currency and per-community reputation scoping.
**Review**: APPROVED (1 cycle -- zero findings)

### Task 7.1: Implement snapshot compaction trigger [DONE]

**Finding**: Iter 1 SPECULATION-1, Meditation §II
**Files**:
- `app/src/db/pg-reputation-store.ts`

**Changes**:
1. Add a `compactSnapshot(nftId: string, aggregate: ReputationAggregate): Promise<void>` method:
   - Writes the aggregate via `put()` (which increments snapshot_version)
   - Resets `event_count` to 0 on the aggregate row
   - Uses a single transaction (BEGIN...COMMIT) to ensure atomicity
2. Add a `needsCompaction(nftId: string, threshold?: number): Promise<boolean>` method:
   - Reads `event_count` from `reputation_aggregates`
   - Returns `true` if `event_count >= threshold` (default: 100)

**Acceptance Criteria**:
- `compactSnapshot()` atomically updates aggregate and resets event_count
- `needsCompaction()` returns true when event_count exceeds threshold
- Transaction rollback on failure (no partial compaction)
- Default compaction threshold is 100 events

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify compactSnapshot resets event_count
- Unit: `pg-reputation-store.test.ts` — verify needsCompaction threshold logic
- Unit: `pg-reputation-store.test.ts` — verify transaction wraps both operations

---

### Task 7.2: Implement full event replay in reconstructAggregateFromEvents [DONE]

**Finding**: Iter 1 SPECULATION-1
**Files**:
- `app/src/services/reputation-service.ts` — `reconstructAggregateFromEvents()`

**Changes**:
1. Replace the current stub with actual event replay logic:
   - Start with a cold aggregate (existing behavior)
   - For each `QualitySignalEvent`: update personal_score via Bayesian blending, increment sample_count
   - For each `TaskCompletedEvent`: update model cohort score
   - For each `CredentialUpdateEvent`: update reputation credentials
   - Apply state transitions based on sample count thresholds
2. Use Hounfour governance functions (`computeBlendedScore`, `isValidReputationTransition`) for computation.
3. Accept an optional `options: { pseudoCount?: number; collectionScore?: number }` parameter for reconstruction configuration.

**Acceptance Criteria**:
- Replay of N quality signal events produces an aggregate with `sample_count === N`
- Replay produces valid state transitions (cold -> warming -> established)
- Blended score computed using Hounfour's `computeBlendedScore`
- `contract_version` set to current protocol version
- Stub comment removed

**Tests**:
- Unit: `reputation-service.test.ts` — replay 0 events returns cold aggregate
- Unit: `reputation-service.test.ts` — replay 5 quality events produces warming state
- Unit: `reputation-service.test.ts` — replay produces correct blended score
- Unit: `reputation-service.test.ts` — mixed event types processed correctly

---

### Task 7.3: Add retention automation query helpers [DONE]

**Finding**: Iter 1 MEDIUM-5 (retention strategy follow-up)
**Files**:
- `app/src/db/pg-reputation-store.ts`

**Changes**:
1. Add `countEventsBefore(cutoff: Date): Promise<number>` — count events older than cutoff date. Used for retention monitoring dashboards.
2. Add `deleteEventsBefore(cutoff: Date): Promise<number>` — delete events older than cutoff date, return count deleted. Guarded by a `dryRun` parameter that defaults to `true`.
3. Add `getOldestEventDate(): Promise<Date | null>` — return created_at of the oldest event. Useful for retention alerting.

**Acceptance Criteria**:
- `countEventsBefore` uses parameterized query: `SELECT COUNT(*) FROM reputation_events WHERE created_at < $1`
- `deleteEventsBefore` with `dryRun: true` (default) returns count without deleting
- `deleteEventsBefore` with `dryRun: false` performs `DELETE FROM reputation_events WHERE created_at < $1`
- `getOldestEventDate` returns null when table is empty

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify countEventsBefore query shape
- Unit: `pg-reputation-store.test.ts` — verify deleteEventsBefore dryRun returns count
- Unit: `pg-reputation-store.test.ts` — verify deleteEventsBefore execute deletes
- Unit: `pg-reputation-store.test.ts` — verify getOldestEventDate null on empty

---

### Task 7.4: Multi-currency budget type scaffold (ResourceGovernor preparation) [DONE]

**Finding**: Meditation §IV — "monies can be infinite"
**Files**:
- `app/src/types/multi-currency.ts` (new file)

**Changes**:
1. Define the multi-currency type foundation:
   ```typescript
   export interface Currency {
     readonly code: string;       // e.g., 'micro-usd', 'review-tokens', 'imagination-credits'
     readonly decimals: number;   // precision (6 for micro-usd, 0 for tokens)
     readonly community?: string; // optional community scope
   }

   export interface CurrencyAmount<C extends Currency = Currency> {
     readonly currency: C;
     readonly amount: bigint;
   }

   export interface MultiBudget {
     readonly balances: ReadonlyMap<string, CurrencyAmount>;
     readonly defaultCurrency: string;
   }

   /** Standard currencies used in the THJ ecosystem */
   export const MICRO_USD: Currency = { code: 'micro-usd', decimals: 6 };
   ```
2. Add JSDoc explaining the multi-currency vision and its relationship to `ResourceGovernor<T>`.

**Acceptance Criteria**:
- Types are exported and importable
- `MICRO_USD` constant matches current config's `autonomousBudgetDefaultMicroUsd` semantics
- Types are extensible for community-scoped currencies
- No runtime code changes (type definitions only + constants)

**Tests**:
- Unit: `multi-currency.test.ts` — verify type exports compile correctly
- Unit: `multi-currency.test.ts` — verify MICRO_USD constant shape

---

### Task 7.5: Per-community reputation scoping type definitions [DONE]

**Finding**: Meditation §V
**Files**:
- `app/src/types/reputation-evolution.ts` — extend existing types

**Changes**:
1. Add an optional `community_id` field to `DixieReputationAggregate`:
   ```typescript
   /** Community scope for this aggregate. Null = global (cross-community). */
   community_id?: string;
   ```
2. Add a `CommunityReputationKey` type:
   ```typescript
   export interface CommunityReputationKey {
     readonly nftId: string;
     readonly communityId: string;
   }
   ```
3. Document the vision: per-community reputation means an agent's reputation as a code reviewer in Community A is tracked independently from their reputation as a creative writer in Community B. The `TaskTypeCohort` already provides the task dimension — `community_id` adds the community dimension.

**Acceptance Criteria**:
- `DixieReputationAggregate` type extended with optional `community_id`
- `CommunityReputationKey` type exported
- Existing code unaffected (field is optional)
- JSDoc explains the per-community scoping vision

**Tests**:
- Verify: all existing tests pass (optional field, backward compatible)
- Unit: `reputation-evolution.test.ts` — verify type includes community_id field

---

### Task 7.6: Multi-rail payment type scaffold [DONE]

**Finding**: Meditation §IV
**Files**:
- `app/src/middleware/payment.ts` — extend PaymentContext types

**Changes**:
1. Define payment rail types:
   ```typescript
   export type PaymentRail = 'x402' | 'nowpayments' | 'stripe-connect' | 'conviction-gated';

   export interface PaymentContext {
     readonly rail: PaymentRail;
     readonly currency: string;
     readonly wallet?: string;
     readonly communityId?: string;
   }
   ```
2. Extend the scaffold middleware to set `X-Payment-Rail: x402` header when enabled (currently the only rail).
3. Add JSDoc documenting the three revenue paths from Freeside #62: x402 micropayments, NOWPayments crypto subscriptions, Stripe Connect fiat bridge.

**Acceptance Criteria**:
- `PaymentRail` and `PaymentContext` types exported
- Scaffold sets `X-Payment-Rail: x402` header alongside existing `X-Payment-Status: scaffold`
- Existing payment tests pass (additional header does not break assertions)
- Types are extensible for future payment rails

**Tests**:
- Unit: `payment.test.ts` — verify X-Payment-Rail header set when enabled
- Unit: `payment.test.ts` — verify PaymentContext type shape
- Verify: existing payment noop tests pass unchanged

---

---

## Sprint 8 (Global 72): Bridge Convergence — Data Integrity & Infrastructure Completeness

**Theme**: Fix transactional gaps, type safety, infrastructure deployment gaps
**Goal**: Address all 7 convergence findings from bridge iteration 1 (score 19) — 2 HIGH, 4 MEDIUM, 1 LOW.
**Source**: Bridgebuilder review bridge-20260226-phase3-g69to71, iteration 1

### Task 8.1: Wrap appendEvent in a transaction [HIGH-1]

**Finding**: appendEvent runs INSERT + UPDATE as independent statements; event_count can drift.
**Files**:
- `app/src/db/pg-reputation-store.ts`

**Changes**:
1. Wrap the INSERT (event) and UPDATE (event_count) in a BEGIN/COMMIT transaction using a dedicated client
2. Match the compactSnapshot transaction pattern

**Acceptance Criteria**:
- appendEvent uses a dedicated client with BEGIN/COMMIT/ROLLBACK
- On INSERT failure, no UPDATE occurs
- On UPDATE failure, event INSERT is rolled back
- All existing tests pass unchanged

**Tests**:
- Unit: `pg-reputation-store.test.ts` — verify transaction wraps both operations

---

### Task 8.2: Fix unsafe type cast in reconstructAggregateFromEvents [HIGH-2]

**Finding**: `(event as Record<string, unknown>).score` bypasses discriminated union narrowing.
**Files**:
- `app/src/services/reputation-service.ts` — `reconstructAggregateFromEvents()`

**Changes**:
1. Replace `(event as Record<string, unknown>).score` with proper discriminated union access
2. Use `QualitySignalEvent` type narrowing after `event.type === 'quality_signal'` check
3. If QualitySignalEvent doesn't have a `score` field, extract it from the appropriate payload field

**Acceptance Criteria**:
- No `as Record<string, unknown>` cast in the function
- Event fields accessed through narrowed discriminated union type
- Existing reconstruction tests pass unchanged

**Tests**:
- Verify: existing `reputation-service.test.ts` reconstruction tests pass

---

### Task 8.3: Add Terraform Secrets Manager references for ES256 migration [MEDIUM-1]

**Finding**: DIXIE_HS256_FALLBACK_SECRET and DIXIE_JWT_PREVIOUS_KEY missing from task definition.
**Files**:
- `deploy/terraform/dixie.tf`

**Changes**:
1. Add `data.aws_secretsmanager_secret` for `dixie/hs256-fallback-secret` and `dixie/jwt-previous-key`
2. Add them to the IAM policy resource list
3. Add them to the `secrets` block in container_definitions

**Acceptance Criteria**:
- Both secrets referenced from Secrets Manager
- IAM policy grants access to both
- Container definition includes both as environment variable secrets
- `terraform plan` would show additive changes only

---

### Task 8.4: Add database migration to docker-compose.integration.yml [MEDIUM-2]

**Finding**: PostgreSQL starts with empty database; reputation tables not created.
**Files**:
- `deploy/docker-compose.integration.yml`

**Changes**:
1. Mount migration SQL files into postgres service
2. Add init script that runs migrations on startup

**Acceptance Criteria**:
- PostgreSQL starts with reputation tables created
- Both 005_reputation.sql and 006_reputation_snapshot.sql applied
- dixie-bff can use PostgresReputationStore without manual migration

---

### Task 8.5: Make min_sample_count configurable in reconstructAggregateFromEvents [MEDIUM-3]

**Finding**: Hardcoded `min_sample_count = 10` should be in options.
**Files**:
- `app/src/services/reputation-service.ts`

**Changes**:
1. Add `minSampleCount?: number` to the options parameter
2. Default to 10 (matching DixieReputationAggregate.min_sample_count)
3. Use the option value instead of the magic number

**Acceptance Criteria**:
- `options.minSampleCount` overrides the default 10
- Default behavior unchanged when option not provided
- Existing tests pass unchanged

**Tests**:
- Unit: `reputation-service.test.ts` — verify custom minSampleCount respected

---

### Task 8.6: Consolidate NftOwnershipResolver duplicate methods [MEDIUM-4]

**Finding**: resolveNftId and resolveOwnership call the same endpoint with different return types.
**Files**:
- `app/src/services/nft-ownership-resolver.ts`

**Changes**:
1. Have `resolveNftId` delegate to `resolveOwnership`
2. Extract nftId from the result: `(await this.resolveOwnership(wallet))?.nftId ?? null`

**Acceptance Criteria**:
- resolveNftId delegates to resolveOwnership (single network call path)
- Behavior unchanged for callers
- All existing tests pass

---

### Task 8.7: Fix ROLLBACK error shadowing in compactSnapshot [LOW-1]

**Finding**: If ROLLBACK fails, it shadows the original error.
**Files**:
- `app/src/db/pg-reputation-store.ts`

**Changes**:
1. Wrap the ROLLBACK in its own try-catch
2. Original error re-thrown regardless of ROLLBACK success

**Acceptance Criteria**:
- ROLLBACK failure does not shadow original error
- Original error propagated to caller
- All existing tests pass

---

## Dependencies

| Task | Depends On | Reason |
|------|-----------|--------|
| 5.2 | 5.1 | getRecentEvents uses interface updated in 5.1 |
| 5.5 | 5.4 | Same migration file |
| 6.2 | 6.1 | Multi-key builds on TTL cache refactor |
| 6.4 | 6.2 | Verification chain needs multi-key config |
| 7.1 | 5.4, 5.5 | Compaction uses snapshot_version and event_count columns |
| 7.2 | 5.2 | Reconstruction benefits from getRecentEvents |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Migration 006 on production DB | `ADD COLUMN IF NOT EXISTS` ensures idempotency |
| Multi-key JWKS cache invalidation | TTL-based cache from Task 6.1 handles rotation |
| Event replay correctness | Hounfour governance functions used (same as live path) |
| Type-only changes breaking tests | All new fields optional; strict backward compatibility |
| deleteEventsBefore misuse | Default `dryRun: true` prevents accidental deletion |

## Test Summary

| Sprint | New Tests (est.) | Modified Tests (est.) |
|--------|----------------:|--------------------:|
| Sprint 5 | 10-12 | 2-3 |
| Sprint 6 | 8-10 | 3-4 |
| Sprint 7 | 12-15 | 2-3 |
| **Total** | **30-37** | **7-10** |
