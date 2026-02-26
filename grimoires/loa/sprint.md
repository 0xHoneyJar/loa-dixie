# Sprint Plan: Staging Launch Readiness

**Version**: 14.1.0
**Date**: 2026-02-26
**Cycle**: cycle-014
**PRD**: v14.1.0
**SDD**: v14.1.0
**Total Sprints**: 4
**Global Sprint Range**: 101-104

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
