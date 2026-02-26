# Sprint Plan: Staging Launch Readiness

**Version**: 14.2.0
**Date**: 2026-02-26
**Cycle**: cycle-014
**PRD**: v14.1.0
**SDD**: v14.1.0
**Total Sprints**: 7
**Global Sprint Range**: 101-107

---

## Sprint 1: Foundation & Infrastructure

**Goal**: Build the staging deployment baseline — OTEL packages, compose, config, advisory lock.

**Acceptance Criteria**:
- `npm install` succeeds with OTEL packages
- `docker compose -f deploy/docker-compose.staging.yml config` validates
- Advisory lock test passes (single-writer semantics)
- `.env.example` documents all 24 variables from `config.ts`
- Environment gate prevents InMemoryReputationStore in staging/production

### Task Ordering (Flatline IMP-001/IMP-002)

Execute in this order to prevent merge conflicts on shared files (especially `server.ts`):
1. **T1** (packages) — no dependencies
2. **T2** (telemetry.ts) — depends on T1
3. **T3** (advisory lock) — independent of T1-T2
4. **T4** (environment gate in server.ts) — do BEFORE T7 (both touch server.ts)
5. **T5** (.env.example) — independent
6. **T6** (compose) — independent
7. **T7** (graceful shutdown in server.ts) — do AFTER T4 (shared file)
8. **T8** (test scaffolding) — independent

### Tasks

| # | Task | File(s) | AC |
|---|------|---------|-----|
| 1 | Add OTEL packages to `package.json` | `app/package.json` | `@opentelemetry/sdk-node@0.57.0`, `exporter-trace-otlp-grpc@0.57.0`, `resources@^1.30.0`, `semantic-conventions@^1.30.0` installed, `npm install` clean |
| 2 | Create `telemetry.ts` with `initTelemetry()` and `shutdownTelemetry()` | `app/src/telemetry.ts` (new) | BatchSpanProcessor used (not Simple), `shutdownTelemetry()` exported, returns null when endpoint is null, unit test passes |
| 3 | Add advisory lock with 30s timeout to `migrate.ts` | `app/src/db/migrate.ts` | `pg_advisory_lock` acquired with `lock_timeout = 30000ms`, clear error on timeout, lock released in finally block, `lock_timeout` reset after acquisition to avoid leaking into connection pool (Flatline IMP-013). Existing migration tests pass |
| 4 | Environment-gate reputation store in `server.ts` | `app/src/server.ts` | InMemory only in dev/test, throws in staging/production when DATABASE_URL missing, all existing tests pass |
| 5 | Create `.env.example` with all 24 variables | `.env.example` (new) | Every variable from `config.ts` documented with type, default, description. Grouped by phase. No secrets. |
| 6 | Create `docker-compose.staging.yml` | `deploy/docker-compose.staging.yml` (new) | All images pinned to semver, healthchecks on all services, `POSTGRES_PASSWORD` required (no insecure default), persistent pgdata volume, internal-only ports for postgres/redis/nats, Tempo in optional `observability` profile, `OTEL_EXPORTER_OTLP_ENDPOINT` wired. E2E tests access dixie-bff via published port 3001; internal services remain unexposed (Flatline IMP-007) |
| 7 | Add graceful shutdown hook for telemetry and connections in `server.ts` | `app/src/server.ts` | SIGTERM/SIGINT calls `shutdownTelemetry()`, stops accepting new requests, drains active connections, closes db pool before process exit (Flatline SKP-002) |
| 8 | Create E2E test scaffolding and helpers | `tests/e2e/staging/setup.ts`, `teardown.ts`, `helpers/wait.ts`, `helpers/http.ts`, `helpers/siwe-wallet.ts` (new) | Test wallet uses Hardhat #0, `wait.ts` polls health with 60s timeout, `http.ts` typed fetch with diagnostics |

---

## Sprint 2: OTEL Instrumentation & PII Sanitization

**Goal**: Wire real OTEL spans to all 6 critical paths with enforced PII sanitization.

**Acceptance Criteria**:
- All 6 instrumentation points emit spans via `startSanitizedSpan()`
- Span-sanitizer unit tests pass (allowlist enforcement, hash verification)
- OTEL SDK no-op when endpoint is null (zero overhead)
- No raw wallet/identity values in exported spans

### Tasks

| # | Task | File(s) | AC |
|---|------|---------|-----|
| 1 | Create `span-sanitizer.ts` with `hashForSpan()`, `sanitizeAttributes()`, `startSanitizedSpan()` | `app/src/utils/span-sanitizer.ts` (new) | SHA-256 truncated to 12 chars. 6 span allowlists: `dixie.request` (method, url, status_code, duration_ms), `dixie.auth` (auth_type, wallet_hash, tier), `dixie.finn.inference` (model, tokens, latency_ms), `dixie.reputation.update` (model_id, score, ema_value), `dixie.fleet.spawn` (task_type, cost, identity_hash), `dixie.governance.check` (resource_type, decision, witness_count). Unknown spans return `{}`. Unit tests verify all paths (Flatline IMP-010) |
| 2 | Create `span-sanitizer.test.ts` | `app/src/utils/__tests__/span-sanitizer.test.ts` (new) | Tests: hash determinism, allowlist filtering, unknown span rejection, `startSanitizedSpan` integration, no raw wallet/identity values |
| 3 | Upgrade `tracing.ts` to real OTEL spans | `app/src/middleware/tracing.ts` | Uses `startSanitizedSpan()` for `dixie.request`, sets `http.status_code` on response, `SpanStatusCode.ERROR` on exception, `span.end()` in finally |
| 4 | Add `dixie.auth` span to JWT middleware | `app/src/middleware/jwt.ts` | Span wraps auth logic, attributes: `auth_type`, `wallet_hash` (hashed), `tier` |
| 5 | Add `dixie.finn.inference` span to Finn client | `app/src/proxy/finn-client.ts` | Span wraps fetch call, attributes: `model`, `tokens`, `latency_ms` |
| 6 | Add `dixie.reputation.update` span to ReputationService | `app/src/services/reputation-service.ts` | Span wraps `recordScore`, attributes: `model_id`, `score`, `ema_value` |
| 7 | Add `dixie.fleet.spawn` span to AgentSpawner | `app/src/services/agent-spawner.ts` | Span wraps `spawnAgent`, attributes: `task_type`, `cost`, `identity_hash` (hashed) |
| 8 | Add `dixie.governance.check` span to FleetGovernor | `app/src/services/fleet-governor.ts` | Span wraps `evaluate`, attributes: `resource_type`, `decision`, `witness_count` |
| 9 | Call `initTelemetry()` in `server.ts` before routes | `app/src/server.ts` | Telemetry initialized before middleware pipeline, no-op test passes when endpoint null |
| 10 | Create `telemetry.test.ts` | `app/src/telemetry.test.ts` (new) | Tests: returns null when no endpoint, SDK starts when endpoint provided, shutdown resolves cleanly |

---

## Sprint 3: E2E Smoke Tests & Deployment Documentation

**Goal**: Validate the full staging stack end-to-end and provide operator runbook.

**Acceptance Criteria**:
- All 6 smoke tests pass against staging docker-compose
- Reputation persists across dixie-bff restart (SM-3)
- `STAGING.md` has concrete migration rollback procedure
- `npm run test:e2e` runs all scenarios
- Zero secrets in `.env.example` or runbook

### Tasks

| # | Task | File(s) | AC |
|---|------|---------|-----|
| 1 | E2E-1: Health check smoke test | `tests/e2e/staging/smoke-health.test.ts` (new) | Status 200, `status === "healthy"`, all deps present in response |
| 2 | E2E-2: SIWE auth smoke test | `tests/e2e/staging/smoke-auth.test.ts` (new) | SIWE nonce issued, JWT returned, JWT contains wallet claim matching test wallet |
| 3 | E2E-3: Chat inference smoke test | `tests/e2e/staging/smoke-chat.test.ts` (new) | Status 200, response body non-empty, content-type includes stream or JSON |
| 4 | E2E-4: Fleet spawn smoke test | `tests/e2e/staging/smoke-fleet.test.ts` (new) | Spawn returns task ID, status transitions to `running` within 10s |
| 5 | E2E-5: Reputation persistence smoke test | `tests/e2e/staging/smoke-reputation.test.ts` (new) | POST returns 201, GET returns matching EMA. Restart test (Flatline IMP-003): POST reputation → `docker compose restart dixie-bff` → poll health until healthy (max 30s) → GET same reputation → assert EMA matches pre-restart value |
| 6 | E2E-6: Governance admission smoke test | `tests/e2e/staging/smoke-governance.test.ts` (new) | Admission check returns `decision` field, budget decremented after spawn |
| 7 | Create `STAGING.md` deployment runbook | `STAGING.md` (new) | 8 sections: prerequisites, env setup, build/start, verify health, migrations, smoke tests, troubleshooting, teardown. Concrete rollback procedure with actual SQL commands. |
| 8 | Add `npm run test:e2e` script + CI workflow | `app/package.json`, `.github/workflows/e2e.yml` (new) | Script runs all 6 smoke tests sequentially, exits non-zero on any failure. GitHub Actions workflow: install → compose up → wait for health → `npm run test:e2e` → compose down (Flatline IMP-009) |
| 9 | Final validation: full staging boot + all smoke tests green | All staging files | `docker compose up` → healthy in <60s → `npm run test:e2e` → 6/6 pass → `docker compose down -v` clean |

---

## Dependency Graph

```
Sprint 1 (Foundation)
  ├── T1-T2: OTEL packages + telemetry.ts ──→ Sprint 2 T3-T8 (instrumentation)
  ├── T3: Advisory lock ──→ Sprint 3 T5 (reputation persistence)
  ├── T4: Environment gate ──→ Sprint 3 T5 (reputation persistence)
  ├── T5: .env.example ──→ Sprint 3 T7 (STAGING.md)
  ├── T6: Staging compose ──→ Sprint 3 T1-T6 (E2E tests)
  └── T8: Test scaffolding ──→ Sprint 3 T1-T6 (E2E tests)

Sprint 2 (Instrumentation)
  ├── T1-T2: Sanitizer ──→ T3-T8 (all spans use startSanitizedSpan)
  └── T9: initTelemetry() ──→ Sprint 3 T1 (health check includes span validation)

Sprint 3 (E2E + Docs)
  ├── T1-T6: Smoke tests (all independent, run in parallel)
  └── T7-T9: Documentation + final validation
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| loa-finn image pull fails | Pin to semver, cache in CI, fallback to local build |
| E2E test flakiness (timing) | Generous timeouts (30s), idempotent tests, failure diagnostics |
| OTEL 0.x breaking changes | Pinned to exact 0.57.0 (Flatline IMP-015) |
| PII leak in spans | startSanitizedSpan() enforcement, unit tests verify allowlist |
| Advisory lock contention | 30s timeout with clear error message (Flatline IMP-003) |

## Success Metrics Mapping

| PRD Metric | Sprint | Task |
|------------|--------|------|
| SM-1: 6+ E2E scenarios green | Sprint 3 | T1-T6 |
| SM-2: Staging boots healthy <60s | Sprint 1 | T6 |
| SM-3: Reputation survives restart | Sprint 3 | T5 |
| SM-4: .env.example covers 24 vars | Sprint 1 | T5 |
| SM-5: Traces visible in Tempo | Sprint 2 | T3-T8 |
| SM-6: Zero manual deploy steps | Sprint 3 | T7 |

---

## Sprint 4: Bridgebuilder Excellence — Observability Correctness & Staging Hardening

**Goal**: Address all Bridgebuilder review findings from PR #50 — trace correlation, span enrichment, test resilience, documentation gaps.

**Acceptance Criteria**:
- Traceparent response headers use actual OTEL span context IDs (not independent UUIDs)
- Circuit breaker state recorded on inference spans
- Reputation spans capture computed scores post-transaction
- Governance spans include denial reason for failed admissions
- Span nesting verified by integration test (parent-child chain)
- Smoke tests idempotent across repeated runs
- STAGING.md documents NATS and cross-service trace correlation
- Traceparent header forwarded on Dixie→Finn requests

### Task Ordering

Execute in this order to build on shared dependencies:

1. **T1** (traceparent fix) — foundational; all other span work depends on correct trace context
2. **T2** (allowlist expansions) — must land before T3/T4/T5 use new attributes
3. **T3** (circuit breaker span) — uses new `circuit_state` attribute from T2
4. **T4** (reputation span enrichment) — uses existing `addSanitizedAttributes`
5. **T5** (governance denial reason) — uses new `denial_reason` attribute from T2
6. **T6** (traceparent forwarding) — depends on T1 for correct trace IDs
7. **T7** (span nesting test) — depends on T1/T6 for correct context propagation
8. **T8** (smoke test idempotency) — independent
9. **T9** (STAGING.md updates) — independent, do last

### Tasks

| # | Task | File(s) | AC |
|---|------|---------|-----|
| 1 | Fix traceparent/OTEL ID divergence — use `span.spanContext()` for response headers | `app/src/middleware/tracing.ts` | `traceparent` response header uses actual OTEL `traceId` and `spanId` from `span.spanContext()`. `x-trace-id` header matches OTEL trace ID. Incoming traceparent still validated and used for context propagation. Existing tracing tests pass. |
| 2 | Expand span allowlists — `circuit_state`, `denial_reason` | `app/src/utils/span-sanitizer.ts` | `dixie.finn.inference` allowlist includes `circuit_state`. `dixie.governance.check` allowlist includes `denial_reason`. Existing sanitizer tests pass. New tests added for the expanded attributes. |
| 3 | Record circuit breaker state on inference spans | `app/src/proxy/finn-client.ts` | `circuit_state` attribute set at span creation with current `this.circuitState` value (`closed`/`open`/`half-open`). Attribute passes through allowlist (verified in existing test). |
| 4 | Capture computed scores on reputation spans | `app/src/services/reputation-service.ts` | After transaction completes, call `addSanitizedAttributes()` to record actual `score` and `ema_value` from computed aggregate. Span no longer shows placeholder `score: 0`. |
| 5 | Add denial reason to governance spans | `app/src/services/fleet-governor.ts` | When admission is denied, set `denial_reason` attribute on span (e.g., `tier_limit_exceeded`, `tier_not_permitted`). Attribute passes through allowlist. |
| 6 | Forward traceparent to Finn on outbound requests | `app/src/proxy/finn-client.ts` | `request()` reads active span context and includes `traceparent` header in outbound fetch to loa-finn. End-to-end trace correlation: Dixie request span → Finn inference span share the same trace ID. |
| 7 | Span nesting integration test — verify parent-child chain | `app/src/utils/__tests__/span-nesting.test.ts` (new) | Mock tracer records span start/end events. Send request through tracing middleware → JWT middleware → route handler. Assert `dixie.auth` span is child of `dixie.request` span (same traceId, parent spanId matches). |
| 8 | Smoke test idempotency — unique IDs per test run | `tests/e2e/staging/smoke-reputation.test.ts`, `tests/e2e/staging/smoke-fleet.test.ts`, `tests/e2e/staging/smoke-governance.test.ts` | Each test run generates a unique UUID prefix for `nftId` and `operatorId` values. Tests can run repeatedly against same staging environment without collisions. |
| 9 | STAGING.md — NATS docs, trace correlation, topology gaps | `STAGING.md` | Section added for NATS connection string and debugging with `nats-cli`. Section added for cross-service trace verification (how to confirm Dixie→Finn traces in Tempo). Note on staging vs production topology differences. |

---

## Dependency Graph (Updated)

```
Sprint 1-3 (Complete — PR #50)
  └──→ Sprint 4 (Bridgebuilder Excellence)
         ├── T1: Traceparent fix ──→ T6 (forwarding), T7 (nesting test)
         ├── T2: Allowlist expansion ──→ T3 (circuit_state), T5 (denial_reason)
         ├── T3: Circuit breaker span (depends T2)
         ├── T4: Reputation span enrichment (independent of T2)
         ├── T5: Governance denial reason (depends T2)
         ├── T6: Traceparent forwarding (depends T1)
         ├── T7: Span nesting test (depends T1, T6)
         ├── T8: Smoke test idempotency (independent)
         └── T9: STAGING.md updates (independent)
```

---

## Sprint 5: Bridgebuilder Deep Review — Governance Excellence & Architectural Extraction

**Goal**: Address all findings from the Bridgebuilder Deep Review (BB-DEEP-01 through BB-DEEP-08) plus deferred LOWs from bridge iterations. Elevate governance observability, extract god objects, formalize ADRs, and lay the foundation for cross-governor coordination.

**Source**: Bridgebuilder Deep Review — PR #50 ([Part I](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3965979758) | [Part II](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3966002756) | [Part III](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3966005321))

**Acceptance Criteria**:
- FleetGovernor appears in `GET /health/governance` response
- `verifyAllResources()` checks fleet invariants (INV-014, 015, 016)
- ReputationService extracted into 3+ focused modules (<400 lines each)
- All existing tests pass after extraction (zero behavior change)
- Advisory lock ID derived from app name hash (collision-resistant)
- Two ADR documents created (middleware pipeline + span sanitizer privacy)
- GovernorRegistry has `coordinate()` stub with typed event interface
- Zero raw `span.setAttribute()` calls in fleet-governor (all sanitized)
- Production topology table in STAGING.md matches actual staging stack

### Task Ordering

Execute in this order to manage dependencies on shared files:

1. **T1** (FleetGovernor registration) — foundational; changes `server.ts`
2. **T2** (fleet-governor sanitizer adoption) — changes `fleet-governor.ts`, depends on T1 for registration context
3. **T3** (circuit breaker docs) — independent, documentation only
4. **T4** (ReputationService extraction: scoring engine) — largest task, no file conflicts
5. **T5** (ReputationService extraction: event store) — depends on T4 for module boundary design
6. **T6** (ReputationService re-export barrel) — depends on T4+T5, updates imports in `server.ts`
7. **T7** (advisory lock ID) — independent, changes `migrate.ts`
8. **T8** (middleware pipeline ADR) — independent, new file
9. **T9** (span sanitizer privacy ADR) — independent, new file
10. **T10** (GovernorRegistry coordination) — depends on T1 for registration pattern context
11. **T11** (tracing test dedup + topology docs) — independent, do last

### Tasks

| # | Task | File(s) | AC | Finding |
|---|------|---------|-----|---------|
| 1 | Register FleetGovernor in GovernorRegistry | `app/src/server.ts` | After FleetGovernor construction, call `governorRegistry.registerResource(fleetGovernor)`. `GET /health/governance` includes `fleet-governor` in response. `verifyAllResources()` runs INV-014/015/016. Idempotent guard: skip if already registered. | BB-DEEP-01 |
| 2 | Replace raw `span.setAttribute()` in FleetGovernor with `addSanitizedAttributes()` | `app/src/services/fleet-governor.ts` | All 5 `span.setAttribute()` calls in `admitAndInsert()` replaced with `addSanitizedAttributes('dixie.governance.check', ...)`. Behavior unchanged — same attributes set. Existing fleet governor tests pass. | BB-S4-003 |
| 3 | Document singleton circuit breaker limitation + production roadmap | `app/src/proxy/finn-client.ts`, `docs/adr/002-circuit-breaker-topology.md` | JSDoc comment on `FinnClient` class documents singleton limitation. ADR documents 3 production options: (a) Redis-backed state, (b) service mesh delegation, (c) NATS-coordinated health. ADR links to Netflix Hystrix→Envoy migration pattern. | BB-DEEP-02 |
| 4 | Extract `ReputationScoringEngine` — pure scoring computation | `app/src/services/reputation-scoring-engine.ts` (new), `app/src/services/reputation-service.ts` | Extract `computeBlendedScore()`, `computeEma()`, `computeCohortScore()`, `computeCollectionScore()` into dedicated module. ReputationService delegates to scoring engine. All existing reputation tests pass unchanged. New module has unit tests for edge cases (empty collections, NaN guards). | BB-DEEP-03 |
| 5 | Extract `ReputationEventStore` — event sourcing operations | `app/src/services/reputation-event-store.ts` (new), `app/src/services/reputation-service.ts` | Extract `appendEvent()`, `reconstructFromEvents()`, `verifyEventChain()` into dedicated module. ReputationService delegates to event store. All existing event sourcing tests pass unchanged. New module <200 lines. | BB-DEEP-03 |
| 6 | ReputationService re-export barrel + import updates | `app/src/services/reputation-service.ts`, `app/src/server.ts` | ReputationService re-exports `ReputationScoringEngine` and `ReputationEventStore` for backward compatibility. Direct imports updated where appropriate. ReputationService reduced to <500 lines (lifecycle + CRUD + orchestration). All tests pass. | BB-DEEP-03 |
| 7 | Derive advisory lock ID from app name hash | `app/src/db/migrate.ts` | Lock ID computed as `Math.abs(hashCode('dixie-bff:migration')) & 0x7FFFFFFF` with deterministic `hashCode()` function. Comment documents collision-resistance. Hardcoded `42_000_014` replaced. Migration integration tests pass. | BB-DEEP-04 |
| 8 | Extract middleware pipeline to first-class ADR | `docs/adr/001-middleware-pipeline-ordering.md` (new) | ADR documents 15-position middleware ordering with rationale per position. References Zanzibar, TAO, Ostrom. Status: Accepted. Source code comment updated to reference ADR. RTFM-validatable. | BB-DEEP-05 |
| 9 | Extract span sanitizer privacy constitution ADR | `docs/adr/003-span-sanitizer-privacy-constitution.md` (new) | ADR documents default-deny allowlist architecture, PII hashing strategy, per-span-type granularity. References GDPR purpose limitation, Stripe PCI telemetry. Identifies future governance target (configurable allowlists). Status: Accepted. | BB-DEEP-06 |
| 10 | GovernorRegistry `coordinate()` foundation + typed event interface | `app/src/services/governor-registry.ts`, `app/src/services/__tests__/governor-registry-coordinate.test.ts` (new) | Add `GovernorCoordinationEvent` type with `source`, `target`, `eventType`, `payload`. Add `coordinate(event)` method that dispatches to registered resource governors. Initial implementation: logging + span emission only (no cross-governor side effects yet). Unit tests verify event dispatch, unknown target handling. | BB-DEEP-08 |
| 11 | Deduplicate tracing tests + fix production topology table | `app/tests/unit/tracing.test.ts`, `STAGING.md` | Remove duplicate test case (malformed traceparent test that duplicates test 3). Production topology table in STAGING.md Section 10 updated: verify all service names match actual compose services, add missing NATS monitoring note. | BB-S4-008, BB-S4-013 |

---

## Dependency Graph (Updated with Sprint 5)

```
Sprint 1-3 (Complete — PR #50)
  └──→ Sprint 4 (Complete — Bridgebuilder Excellence)
         └──→ Sprint 5 (Deep Review — Governance Excellence)
                ├── T1: FleetGovernor registration (server.ts)
                │    ├──→ T2: Fleet-governor sanitizer adoption
                │    └──→ T10: GovernorRegistry coordinate()
                ├── T4: Extract ReputationScoringEngine
                │    └──→ T5: Extract ReputationEventStore
                │         └──→ T6: Re-export barrel + import cleanup
                ├── T3: Circuit breaker ADR (independent)
                ├── T7: Advisory lock ID hash (independent)
                ├── T8: Middleware pipeline ADR (independent)
                ├── T9: Span sanitizer privacy ADR (independent)
                └── T11: Test dedup + topology fix (independent)
```

## Risk Mitigation (Sprint 5)

| Risk | Mitigation |
|------|------------|
| ReputationService extraction breaks consumers | Re-export barrel preserves all public APIs; extraction is internal refactoring only |
| Advisory lock ID change breaks running staging | New lock ID is a different number; no conflict with existing locks. Old lock auto-releases on disconnect |
| GovernorRegistry coordinate() introduces coupling | Initial implementation is logging-only with no side effects — foundation for future cross-governor governance |
| ADR documents become stale | RTFM-validatable format; middleware ordering comment references ADR for bidirectional link |

---

## Sprint 6: Final Convergence — Deferred LOWs, Flatline Remainders & Excellence Polish

**Goal**: Address all remaining observations across bridge iterations, deferred Flatline findings, and Bridgebuilder Meditation actionable items. Zero known technical debt remaining in cycle-014.

**Sources**:
- Sprint 105 Bridge Iteration 3 (3 LOWs — flatlined, unaddressed)
- Cycle-012/013 Bridge (2 LOWs — BF-008, BF-009)
- Deferred Flatline PRD Findings (IMP-004, IMP-007, IMP-014)
- Deferred Flatline Sprint Findings (IMP-012)
- Bridgebuilder Meditation Horizons ([Part I](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3966426082) | [Part III](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3966560508))

**Acceptance Criteria**:
- GovernorRegistry broadcast produces deduplicated target list
- Lock client released on all error paths in migrate.ts (no pool leaks)
- Branch names deterministic for identical spawn requests
- AGENT_SPAWNED events carry model and routing metadata
- Barrel re-exports have @deprecated JSDoc with removal timeline
- E2E health test validates OTEL trace export when Tempo is up
- Structured log output includes trace_id for correlation
- STAGING.md documents pool sizing guidance and boot-time expectations
- Governance ADR documents evaluationGap growth trajectory pattern

### Task Ordering

Execute in this order to manage shared file dependencies:

1. **T1** (governor-registry dedup) — modifies coordinate(), independent
2. **T2** (migrate.ts lock leak) — modifies migrate.ts, independent
3. **T3** (branch determinism) — modifies conductor-engine.ts, independent
4. **T4** (saga routing metadata) — modifies fleet-saga.ts, depends on T3 for context
5. **T5** (barrel deprecation) — modifies reputation-service.ts, independent
6. **T6** (OTEL E2E validation) — modifies smoke-health.test.ts, independent
7. **T7** (log-trace correlation) — modifies middleware/tracing.ts, independent
8. **T8** (STAGING.md pool sizing + boot time) — modifies STAGING.md, independent
9. **T9** (governance ADR update) — modifies existing ADR, independent

### Tasks

| # | Task | File(s) | AC | Source |
|---|------|---------|-----|--------|
| 1 | Deduplicate broadcast targets in `coordinate()` — use `Set` to merge governor and governedResource keys | `app/src/services/governor-registry.ts` | `allTypes` built via `new Set([...this.governors.keys(), ...this.governedResources.keys()])`. No duplicate entries when same resource type appears in both maps. Existing coordinate tests pass. New test verifies dedup when type registered in both maps. | Sprint-105 Bridge Iter 3 LOW |
| 2 | Fix lock client leak on `SET lock_timeout` reset failure — move reset inside outer try block | `app/src/db/migrate.ts` | Move `SET lock_timeout = '0'` (line 178) from the inner try into the outer try block (after lock acquisition, before migration work). If the reset fails, the outer finally still releases the advisory lock and the client. All migration tests pass. Test verifies client release on lock_timeout reset failure. | Sprint-105 Bridge Iter 3 LOW |
| 3 | Derive branch name from idempotency token instead of `Date.now()` | `app/src/services/conductor-engine.ts` | Branch name: `fleet/${operatorId}-${idempotencyToken.slice(0, 8)}` instead of `fleet/${operatorId}-${Date.now()}`. Two identical spawn requests produce the same branch name. Existing conductor tests pass. New test verifies deterministic branch for identical requests. | BF-008 (cycle-012/013 bridge) |
| 4 | Include routing metadata (`model`, `routingReason`) in saga `AGENT_SPAWNED` event | `app/src/services/fleet-saga.ts`, `app/src/types/fleet.ts` | AGENT_SPAWNED event metadata includes `model` (from `input.model`) and `routingReason` (new optional field on `CreateFleetTaskInput`). Downstream consumers can reconstruct which model was selected and why. Existing saga tests updated. | BF-009 (cycle-012/013 bridge) |
| 5 | Add `@deprecated` JSDoc + removal timeline to barrel re-exports | `app/src/services/reputation-service.ts` | All re-export blocks at lines 49-64 have `@deprecated` JSDoc with message: "Import directly from reputation-scoring-engine.ts / reputation-event-store.ts. Re-exports will be removed in cycle-016." Existing import tests pass. | Sprint-105 Bridge Iter 3 LOW |
| 6 | Add OTEL trace validation to E2E health smoke test | `tests/e2e/staging/smoke-health.test.ts` | When `OTEL_EXPORTER_OTLP_ENDPOINT` is set and Tempo is running (observability profile), E2E health test queries Tempo API (`/api/search?tags=service.name%3Ddixie-bff`) and asserts at least 1 trace exists. Skipped gracefully when Tempo is not available. | Flatline PRD IMP-004 |
| 7 | Add log-trace correlation — inject `trace_id` into structured log output | `app/src/middleware/tracing.ts`, `app/src/utils/logger.ts` (if exists, else tracing.ts only) | When OTEL span is active, the tracing middleware sets `c.set('traceId', span.spanContext().traceId)`. Structured log entries in downstream handlers can include `traceId` from context. Unit test verifies traceId is set on Hono context when span active, and absent when no SDK. | Flatline SDD IMP-014 |
| 8 | Document connection pool sizing + boot-time expectations in STAGING.md | `STAGING.md` | New subsection in Troubleshooting: **Connection Pool Sizing** — documents default pool size (from pg defaults), how to tune via `DATABASE_POOL_SIZE` env var, symptoms of pool exhaustion, and monitoring query (`SELECT * FROM pg_stat_activity`). New subsection: **Boot-Time Expectations** — staging stack boots healthy in <60s; document per-service boot order and expected timing. CI workflow should use 60s health timeout. | Flatline PRD IMP-007, Sprint IMP-012 |
| 9 | Update governance ADR with evaluationGap growth trajectory pattern | `docs/adr/004-governance-denial-response.md` (new) | New ADR documenting the pattern: when admission is denied, the response includes structured hints about what the agent would need to be approved (evaluationGap as Vygotsky's Zone of Proximal Development). References Bridgebuilder Meditation Part II §2.2 and Hounfour #32. Status: Proposed (roadmap for future implementation). Links to existing ADR-001 (middleware pipeline) for governance context. | Bridgebuilder Meditation Part II |

---

---

## Sprint 7: Pre-Merge Polish — Type Safety, Config Hardening & Test Hygiene

**Goal**: Final pass before merging PR #50 to main. Address all remaining MEDIUM findings from comprehensive pre-merge sweep. Zero regressions, zero new TS errors.

**Source**: Pre-merge comprehensive sweep (bridge iteration 3 post-flatline)

**Acceptance Criteria**:
- fleet.ts JSDoc accurately reflects actual code (header reads, not c.get())
- All parseInt config values validated: NaN → default, negative → default, clamped to sane ranges
- ConvictionTier from request headers validated against known enum values before use
- DATABASE_POOL_SIZE documented in .env.example
- fleet-monitor.test.ts mock typing resolved — 0 TS errors in test file
- Overall TypeScript error count remains at 0

### Task Ordering

All tasks are independent — no shared file dependencies:

1. **T1** (fleet.ts JSDoc) — modifies fleet.ts only
2. **T2** (config parseInt hardening) — modifies config.ts only
3. **T3** (ConvictionTier validation) — modifies enrich.ts and fleet.ts
4. **T4** (.env.example update) — modifies .env.example only
5. **T5** (fleet-monitor.test.ts mock typing) — modifies test file only

### Tasks

| # | Task | File(s) | AC | Source |
|---|------|---------|-----|--------|
| 1 | Fix fleet.ts JSDoc — update middleware documentation to reflect actual header-based reads | `app/src/routes/fleet.ts` | JSDoc block at route definition accurately documents that `operatorId` and `operatorTier` are read from `c.req.header('x-operator-id')` and `c.req.header('x-operator-tier')` respectively, not from `c.get()`. Existing tests pass. | Pre-merge sweep M-2 |
| 2 | Add parseInt bounds validation to all config env vars — clamp to safe defaults on NaN/negative | `app/src/config.ts` | Every `parseInt()` call wrapped in a helper that: (1) returns default on `NaN`, (2) returns default on negative values, (3) clamps to documented maximum where applicable (e.g., port ≤ 65535, pool size ≤ 100). Existing config tests pass. New unit tests verify NaN → default, negative → default, out-of-range → clamped. | Pre-merge sweep M-3 |
| 3 | Validate ConvictionTier from request headers — reject invalid values with 400 | `app/src/routes/enrich.ts`, `app/src/routes/fleet.ts` | Header value validated against known ConvictionTier enum values (`observer`, `holder`, `staker`, `governor`, etc.) before cast. Invalid/unknown values: enrich.ts defaults to `'observer'`, fleet.ts uses `undefined`. No `as ConvictionTier` without prior validation. Existing tests pass. | Pre-merge sweep M-4 |
| 4 | Add DATABASE_POOL_SIZE to .env.example | `.env.example` | `DATABASE_POOL_SIZE` documented in the Database section with type (integer), default (10), and description. Grouped with existing `DATABASE_URL`. | Pre-merge sweep M-5 |
| 5 | Fix fleet-monitor.test.ts mock typing — use proper vitest mock types | `app/src/services/__tests__/fleet-monitor.test.ts` | Mock factory functions return properly typed mocks using `vi.fn()` with correct generic parameters or `as unknown as MockedType` pattern. All `mockResolvedValue`, `mockRejectedValue`, `mockImplementation` calls resolve without TS errors. File has 0 TypeScript errors. All existing tests pass. | Pre-merge sweep M-6 |

---

## Dependency Graph (Updated with Sprint 7)

```
Sprint 1-3 (Complete — PR #50)
  └──→ Sprint 4 (Complete — Bridgebuilder Excellence)
         └──→ Sprint 5 (Complete — Deep Review — Governance Excellence)
                └──→ Sprint 6 (Complete — Final Convergence — All LOWs + Deferred)
                       └──→ Sprint 7 (Pre-Merge Polish — Type Safety & Config Hardening)
                              ├── T1: fleet.ts JSDoc fix (independent)
                              ├── T2: config parseInt hardening (independent)
                              ├── T3: ConvictionTier validation (independent)
                              ├── T4: .env.example DATABASE_POOL_SIZE (independent)
                              └── T5: fleet-monitor.test.ts mock typing (independent)
```

## Risk Mitigation (Sprint 6)

| Risk | Mitigation |
|------|------------|
| CreateFleetTaskInput type change breaks consumers | `routingReason` is optional field — additive, non-breaking |
| @deprecated annotations confuse IDE users | Clear message with timeline and alternative import paths |
| OTEL E2E validation flaky without Tempo | Gated on Tempo availability — skips cleanly when not running |
| Lock client leak fix changes error behavior | Only changes cleanup path, not happy path — existing tests validate both |
| Governance ADR is speculative | Marked as "Proposed" status, not "Accepted" — signals roadmap intent |

---

## Flatline Protocol Review Record

**Version**: v14.0.0 → v14.1.0
**Models**: Opus, GPT-5.3-codex, Gemini-2.5-Pro
**Confidence**: full (3 of 3 active, 76% agreement)

### Integrated (8 findings)

| ID | Finding | Integration |
|----|---------|-------------|
| IMP-001 | Explicit intra-sprint task ordering | Sprint 1: Task Ordering section added |
| IMP-002 | server.ts touchpoint coordination | Sprint 1: T4 before T7 ordering noted |
| IMP-003 | Deterministic container restart mechanics | Sprint 3 T5: Explicit restart + poll + assert sequence |
| IMP-007 | Internal networking vs E2E access strategy | Sprint 1 T6: E2E via published port 3001, internal unexposed |
| IMP-009 | CI wiring for E2E tests | Sprint 3 T8: GitHub Actions e2e.yml workflow added |
| IMP-010 | Enumerate allowlists in sanitizer AC | Sprint 2 T1: All 6 allowlists enumerated in AC |
| IMP-013 | lock_timeout scope for connection pool | Sprint 1 T3: Reset lock_timeout after acquisition |
| SKP-002 | Graceful shutdown beyond telemetry | Sprint 1 T7: Drain connections + close db pool |

### Disputed (3 findings)

| ID | Score | Description | Decision |
|----|-------|-------------|----------|
| IMP-011 | 480 | Risk register completeness | Deferred — low ROI |
| IMP-012 | 650 | Boot-time performance assertions | Deferred — CI environment variability makes strict timing unreliable |
| IMP-013 | 700 | lock_timeout scope for pooled connections | Accepted — added to Sprint 1 T3 AC |

### Blockers (7 findings)

| ID | Severity | Description | Resolution |
|----|----------|-------------|------------|
| SKP-006 | 720 | JWT smoke test lacks negative cases | Override — E2E suite is smoke testing (happy path), not security audit. Negative auth testing is covered by existing unit tests in `jwt.test.ts`. |
| SKP-001a | 740 | No migration rollback strategy | Already resolved — SDD v14.1.0 Section 3.8 has concrete rollback procedure (Flatline IMP-013 from SDD review) |
| SKP-003 | 890 | PII sanitization limited to spans | Override — PRD scopes PII redaction to OTEL spans (FR-5). Log/header redaction is future cycle scope. Structured logging already excludes wallet addresses. |
| SKP-012 | 710 | No deploy automation mechanism | Override — `docker compose up` IS the automation. STAGING.md documents the single-command deploy. CI workflow (IMP-009) automates E2E validation. |
| SKP-005 | 760 | Missing container security hardening | Override — Dockerfile already uses multi-stage build with non-root user. Additional seccomp/apparmor is production concern, not staging MVP. |
| SKP-002 | 750 | Graceful shutdown only handles telemetry | Accepted — Sprint 1 T7 expanded to include connection draining and db pool shutdown |
| SKP-001b | 950 | No secret management strategy | Partially addressed — PRD NFR-4 requires Docker secrets guidance in STAGING.md. `.env` files gitignored. Sprint 3 T7 runbook includes secret management section. |
