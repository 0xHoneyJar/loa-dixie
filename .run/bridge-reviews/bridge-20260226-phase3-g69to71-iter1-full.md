# Bridgebuilder Review — Iteration 1
## Bridge: bridge-20260226-phase3-g69to71
## Branch: feature/dixie-phase3-prod-wiring (post G-69 to G-71)

---

There is a moment in every system's evolution when it stops being a prototype and starts being infrastructure. Dixie has arrived at that moment. Across 109 changed files and ~12,000 lines of net addition, what was once a BFF scaffold has become a genuine production system: persistent reputation storage, asymmetric cryptography, event sourcing, multi-currency budgets, and a Terraform footprint that speaks to real deployment.

This review covers the accumulated changes from sprints G-65 through G-71 — the complete Phase 3 body of work. The earlier bridge review (bridge-20260225-phase3) covered G-65 through G-68 and flatlined at score 1. Sprints G-69 through G-71 added snapshot compaction, full event replay, retention automation, multi-currency types, community scoping, and multi-rail payment scaffolding.

The architecture tells a coherent story. Let me walk through what I found.

---

## Architectural Meditations

### The Event Sourcing Boundary

The `PostgresReputationStore` introduces a fascinating split: aggregates are stored as JSONB snapshots (fast reads), while events accumulate in an append-only log (audit trail + reconstruction). The `compactSnapshot()` method correctly uses a dedicated client connection with explicit BEGIN/COMMIT/ROLLBACK — this is textbook CQRS.

But there's a subtle gap at the `appendEvent` boundary. The method runs two independent SQL statements: an INSERT into `reputation_events` followed by an UPDATE to increment `event_count` on `reputation_aggregates`. If the INSERT succeeds but the UPDATE fails (connection timeout, pool exhaustion during contention), `event_count` drifts permanently from the actual event count. The compaction trigger (`needsCompaction`) then makes decisions on stale metadata.

Google's Spanner team learned this lesson with their change-data-capture pipeline: if the metadata that drives a compaction decision is decoupled from the data it describes, eventually the two will diverge. The fix is to wrap both statements in a transaction — the same pattern already used (correctly) in `compactSnapshot`.

### The Type Safety Breach in Event Replay

`reconstructAggregateFromEvents` is doing important work — taking an event stream and producing a mathematically consistent aggregate. But line 531 performs an unsafe cast: `(event as Record<string, unknown>).score as number | undefined`. The `ReputationEvent` type is a discriminated union with three variants (`QualitySignalEvent`, `TaskCompletedEvent`, `CredentialUpdateEvent`). The function should narrow via `event.type === 'quality_signal'` (which it does) and then access `event.score` through the narrowed type — not bypass the type system with `as Record<string, unknown>`.

This matters beyond aesthetics. If Hounfour v7.12 renames `score` to `quality_score` in `QualitySignalEvent`, the cast silently produces `undefined` instead of a compile-time error. In a Bayesian system where `null` means "cold" and `0` means "terrible," silent type erosion is a data integrity risk.

### Terraform's Missing Secrets

The ECS task definition correctly sources `DIXIE_JWT_PRIVATE_KEY`, `DIXIE_ADMIN_KEY`, and `DATABASE_URL` from Secrets Manager. But the ES256 migration and key rotation features introduced in Sprint 2 depend on two additional secrets: `DIXIE_HS256_FALLBACK_SECRET` (migration transition) and `DIXIE_JWT_PREVIOUS_KEY` (key rotation). These are defined in `config.ts` and wired through the entire auth chain, but they have no Secrets Manager references in `dixie.tf`. In production, these environment variables will be empty strings, and the rotation runbook documented in `jwks.ts` will silently fail.

This is a variant of the infrastructure-code gap that caught Stripe's 2019 migration: the application code was ready for the transition, but the deployment manifests weren't.

### The Integration Test Gap

`docker-compose.integration.yml` correctly adds PostgreSQL alongside Redis and loa-finn. But it doesn't run the migration SQL files (`005_reputation.sql`, `006_reputation_snapshot.sql`). When `dixie-bff` starts with `DATABASE_URL` set, the `PostgresReputationStore` will attempt queries against tables that don't exist. The health endpoint will report PostgreSQL as healthy (the `SELECT 1` probe passes), but any reputation operation will fail.

---

<!-- bridge-findings-start -->
```json
{
  "schema_version": 1,
  "bridge_id": "bridge-20260226-phase3-g69to71",
  "iteration": 1,
  "findings": [
    {
      "id": "high-1",
      "title": "appendEvent is non-transactional — event_count can drift from actual event count",
      "severity": "HIGH",
      "category": "data-integrity",
      "file": "app/src/db/pg-reputation-store.ts:86-98",
      "description": "appendEvent runs INSERT (event) and UPDATE (event_count) as two independent statements. If the UPDATE fails after a successful INSERT, event_count permanently drifts. needsCompaction() then makes decisions on stale metadata. compactSnapshot() already demonstrates the correct transactional pattern.",
      "suggestion": "Wrap the INSERT and UPDATE in a BEGIN/COMMIT transaction using a dedicated client, matching the compactSnapshot pattern.",
      "faang_parallel": "Google Spanner's change-data-capture pipeline: metadata that drives compaction must be transactionally consistent with the data it describes.",
      "teachable_moment": "When two SQL statements must succeed or fail together, they belong in a transaction. The existence of compactSnapshot's transaction makes appendEvent's absence conspicuous."
    },
    {
      "id": "high-2",
      "title": "Unsafe type cast in reconstructAggregateFromEvents bypasses discriminated union narrowing",
      "severity": "HIGH",
      "category": "type-safety",
      "file": "app/src/services/reputation-service.ts:531",
      "description": "The expression `(event as Record<string, unknown>).score` bypasses TypeScript's discriminated union narrowing. After checking `event.type === 'quality_signal'`, the event should be narrow-typed to QualitySignalEvent and its fields accessed through the narrowed type. The current cast will silently produce undefined if the upstream type changes field names.",
      "suggestion": "Replace the cast with proper discriminated union narrowing: `if (event.type === 'quality_signal') { const qe = event as QualitySignalEvent; const score = qe.score; ... }` — or check if QualitySignalEvent has a `score` field and add it if not.",
      "faang_parallel": "TypeScript discriminated unions exist precisely for this pattern — Stripe's API SDK enforces type narrowing on webhook event variants for the same reason.",
      "teachable_moment": "Type casts through Record<string, unknown> are escape hatches that defeat the purpose of discriminated unions. If the type doesn't have the field you need, that's a signal to extend the type, not bypass it."
    },
    {
      "id": "medium-1",
      "title": "Terraform missing Secrets Manager references for ES256 migration secrets",
      "severity": "MEDIUM",
      "category": "infrastructure",
      "file": "deploy/terraform/dixie.tf:338-351",
      "description": "The ECS task definition sources DIXIE_JWT_PRIVATE_KEY, DIXIE_ADMIN_KEY, and DATABASE_URL from Secrets Manager. But DIXIE_HS256_FALLBACK_SECRET (ES256 transition) and DIXIE_JWT_PREVIOUS_KEY (key rotation) have no Secrets Manager references. These env vars will be empty in production, making the documented key rotation runbook in jwks.ts non-functional.",
      "suggestion": "Add data.aws_secretsmanager_secret references for dixie/hs256-fallback-secret and dixie/jwt-previous-key. Add them as conditional secrets in the container definition (only populated during rotation).",
      "faang_parallel": "Stripe's 2019 migration gap: application code ready for transition but deployment manifests not updated.",
      "teachable_moment": "When application code references environment variables, the deployment manifest must provide them. A feature is not 'production-ready' until the infrastructure can deliver it."
    },
    {
      "id": "medium-2",
      "title": "Integration test docker-compose missing database migrations",
      "severity": "MEDIUM",
      "category": "testing",
      "file": "deploy/docker-compose.integration.yml:16-29",
      "description": "PostgreSQL service starts with an empty database. The reputation tables (005_reputation.sql, 006_reputation_snapshot.sql) are never applied. PostgresReputationStore queries will fail against non-existent tables, but the health probe (SELECT 1) will report healthy.",
      "suggestion": "Add an init container or entrypoint script that runs the migration SQL files against the postgres service before dixie-bff starts. Alternatively, mount the migration files and use psql in the healthcheck initialization.",
      "teachable_moment": "Integration tests that skip database migrations test a configuration that doesn't match production. The health check's SELECT 1 masks the actual broken state."
    },
    {
      "id": "medium-3",
      "title": "reconstructAggregateFromEvents hardcodes min_sample_count = 10",
      "severity": "MEDIUM",
      "category": "maintainability",
      "file": "app/src/services/reputation-service.ts:545",
      "description": "The magic number 10 for min_sample_count is hardcoded inside the function body. This should either be a constant, a parameter in the options object, or read from the aggregate's own min_sample_count field. Currently, if Hounfour changes the default or a community wants a different threshold, this function produces inconsistent aggregates.",
      "suggestion": "Add min_sample_count to the options parameter with a default of 10, matching the DixieReputationAggregate.min_sample_count field.",
      "teachable_moment": "Magic numbers in event replay are particularly dangerous because the replay must be deterministic — if the threshold changes between replays, you get different aggregates from the same event stream."
    },
    {
      "id": "medium-4",
      "title": "NftOwnershipResolver has near-duplicate resolveNftId and resolveOwnership methods",
      "severity": "MEDIUM",
      "category": "maintainability",
      "file": "app/src/services/nft-ownership-resolver.ts:24-52",
      "description": "resolveNftId and resolveOwnership call the same endpoint (/api/identity/wallet/{wallet}/nft) and differ only in return type (string | null vs { nftId: string } | null). This duplication means two network calls for what could be one, and the methods could diverge silently.",
      "suggestion": "Have resolveNftId delegate to resolveOwnership: `async resolveNftId(wallet: string) { return (await this.resolveOwnership(wallet))?.nftId ?? null; }`",
      "teachable_moment": "When two methods call the same endpoint, consolidate to one that returns the full response, and have the other extract what it needs."
    },
    {
      "id": "low-1",
      "title": "ROLLBACK error shadowing in compactSnapshot catch block",
      "severity": "LOW",
      "category": "resilience",
      "file": "app/src/db/pg-reputation-store.ts:160-163",
      "description": "If ROLLBACK itself fails (connection dropped), the await throws and shadows the original error. The caller sees 'ROLLBACK failed' instead of the actual data error. Both the audit and previous bridge noted this as informational.",
      "suggestion": "Wrap the ROLLBACK in its own try-catch: `try { await client.query('ROLLBACK'); } catch { /* log but don't shadow */ }`",
      "teachable_moment": "Error handling in error handling is a common blind spot. The ROLLBACK is cleanup — it should never mask the original failure."
    },
    {
      "id": "praise-1",
      "severity": "PRAISE",
      "title": "Asymmetric health cache TTLs — Netflix Eureka pattern",
      "file": "app/src/routes/health.ts:22-29",
      "description": "Healthy upstream cached 30s (reduce probe load), unhealthy cached 5s (detect recovery within one ALB check interval). This is exactly the pattern Netflix's Eureka service registry uses, and it elegantly balances observability against upstream load.",
      "suggestion": "No changes needed — this is exemplary.",
      "praise": true,
      "teachable_moment": "Asymmetric cache TTLs encode operational knowledge: healthy state is stable (cache longer), unhealthy state is volatile (refresh faster). The insight is that the cost of a stale 'healthy' reading is low, but the cost of a stale 'unhealthy' reading is high."
    },
    {
      "id": "praise-2",
      "severity": "PRAISE",
      "title": "Three-step JWT verification chain with documented intentional asymmetry",
      "file": "app/src/middleware/jwt.ts:49-73",
      "description": "Current ES256 → previous ES256 → HS256 fallback. The documented difference between jwt.ts (always falls through to HS256) and auth.ts /verify (only HS256 when hs256FallbackSecret set) is intentional and well-explained. This is mature migration engineering.",
      "suggestion": "No changes needed — the documentation at auth.ts:101-104 explaining the intentional asymmetry is excellent.",
      "praise": true,
      "faang_parallel": "Stripe's idempotency key migration used the same dual-path pattern: new path for new requests, old path for in-flight.",
      "teachable_moment": "Migration asymmetry between middleware (lenient, UX-focused) and verification endpoints (strict, security-focused) is a valid architectural choice when documented."
    },
    {
      "id": "praise-3",
      "severity": "PRAISE",
      "title": "Event-sourced reputation with snapshot compaction — textbook CQRS",
      "file": "app/src/db/pg-reputation-store.ts:145-166",
      "description": "Append-only event log for audit trail and reconstruction, periodic snapshot compaction with transactional integrity, monotonic snapshot_version. This is the right architecture for a reputation system that needs both fast reads and full auditability.",
      "suggestion": "No changes needed — this is exemplary.",
      "praise": true,
      "faang_parallel": "Apache Kafka's log compaction provides the same pattern at a different scale — append-only events with periodic snapshot compaction.",
      "teachable_moment": "The key insight is that events are facts (immutable) and aggregates are interpretations (derived). Keeping both means you can always re-derive from ground truth."
    },
    {
      "id": "praise-4",
      "severity": "PRAISE",
      "title": "Defensive dryRun=true default on deleteEventsBefore",
      "file": "app/src/db/pg-reputation-store.ts:209",
      "description": "Making destructive operations opt-in (dryRun defaults to true) prevents accidental data loss. The caller must explicitly pass `dryRun: false` to actually delete. This is the kind of API design that prevents 2am incidents.",
      "suggestion": "No changes needed — this is exemplary.",
      "praise": true,
      "teachable_moment": "Destructive operations should be opt-in, not opt-out. A function that deletes data by default is a footgun."
    },
    {
      "id": "speculation-1",
      "severity": "SPECULATION",
      "title": "Community-scoped reputation + multi-currency budgets = emergent economic protocol",
      "description": "DixieReputationAggregate.community_id + CommunityReputationKey + Currency.community + MultiBudget collectively describe a multi-tenant reputation marketplace. If communities can issue their own currencies AND track independent reputation, the natural evolution is to parameterize ResourceGovernor<T> by both currency and community — creating per-community economic policies.",
      "suggestion": "Consider whether ResourceGovernor should evolve to ResourceGovernor<Currency, Community> in a future sprint, enabling communities to define their own budget policies and reputation thresholds.",
      "speculation": true,
      "teachable_moment": "When multiple type scaffolds independently converge on the same dimension (community), it often signals an emergent architectural concept that should be made explicit."
    }
  ]
}
```
<!-- bridge-findings-end -->

---

## Closing Reflections

Dixie's Phase 3 is a strong body of work. The architecture shows disciplined thinking: hexagonal ports (ReputationStore interface), graceful degradation (InMemory fallback), defensive APIs (dryRun defaults), and production-aware patterns (asymmetric cache TTLs, blue-green rotation runbooks).

The findings are primarily about closing the gap between what the application code is ready to do and what the infrastructure can deliver. The `appendEvent` transactionality fix is the highest-priority item — it's a data integrity issue in the core event sourcing path. The Terraform secrets gap is the second priority — without it, the entire ES256 migration story is incomplete at the deployment layer.

The type safety breach in `reconstructAggregateFromEvents` is more subtle but equally important: in a system where Bayesian scores are computed from event replay, silent type erosion means silent data corruption.

Everything else is polish. And that's a good sign — when the review's findings are about transactional boundaries and infrastructure completeness rather than architectural confusion, the system is in good shape.

The convergence score for this iteration: **2 HIGH + 4 MEDIUM + 1 LOW = 19 weighted points** (HIGH=5, MEDIUM=2, LOW=1).

---

*Bridgebuilder — bridge-20260226-phase3-g69to71, iteration 1*
