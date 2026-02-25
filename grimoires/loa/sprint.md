# Sprint Plan: Bridgebuilder Excellence — Post-Review Improvements

**Version**: 7.1.0
**Date**: 2026-02-25
**Cycle**: cycle-007 (continuation)
**PRD**: `grimoires/loa/prd.md` v7.0.0
**SDD**: `grimoires/loa/sdd.md` v7.0.0
**Origin**: Bridgebuilder Review of PR #15 (10 findings: 2 Medium, 4 Low, 3 Praise, 1 Speculation)
**Sprints**: 3 (global IDs 78–80)
**Team**: 1 developer (AI-assisted)
**Sprint Duration**: ~1.5 hours each

---

## Sprint Overview

| Sprint | Global ID | Focus | Findings | Tasks | Dependencies |
|--------|-----------|-------|----------|-------|-------------|
| 1 | 78 | Feedback Dampening & Governance Persistence | F1, F3, F4 | 6 | None |
| 2 | 79 | Decision Trails & Surface Enforcement | F2, F5, F6 | 5 | None (parallel with Sprint 1) |
| 3 | 80 | Observability & Error Taxonomy | F4 residual, console.debug, assertTransition | 4 | Sprints 1, 2 |

### Dependency Graph

```
Sprint 1 (F1, F3, F4)      Sprint 2 (F2, F5, F6)
    │                           │
    └───────────┬───────────────┘
                ▼
            Sprint 3 (observability, error taxonomy, regression sweep)
```

### Finding → Task Mapping

| Finding | Severity | Sprint | Tasks |
|---------|----------|--------|-------|
| F1: Autopoietic feedback loop needs dampening | Medium | 1 | S1-T1, S1-T2 |
| F3: MutationLog in-memory — governance audit trail ephemeral | Medium | 1 | S1-T3, S1-T4 |
| F4: Hardcoded pseudo_count/collection_score in reconstruction | Low | 1 | S1-T5 |
| F2: DynamicContract surface enforcement gap documentation | Low | 2 | S2-T1 |
| F5: handleCredentialUpdate intent needs decision trail | Low | 2 | S2-T2 |
| F6: Recording to quarantined tracker — document trade-off | Low | 2 | S2-T3 |
| console.debug observability gap | Low | 3 | S3-T1 |
| assertTransition plain object throw | Low | 3 | S3-T2 |
| Regression sweep + integration verification | Cross-cutting | 1, 3 | S1-T6, S3-T3, S3-T4 |

---

## Sprint 1: Feedback Dampening & Governance Persistence (Global ID: 78)

**Goal**: Address the two Medium-severity findings — add exponential moving average dampening to the autopoietic feedback loop, extract hardcoded economic parameters, and make the MutationLog lifecycle explicit with persistence-ready interface.

**Findings**: F1 (autopoietic dampening), F3 (MutationLog persistence), F4 (hardcoded reconstruction params)

### Task S1-T1: Extract feedback dampening constants and EMA helper

**Description**: Create a dampening coefficient for the model_performance feedback path. Implement an exponential moving average (EMA) helper that blends new observations with running scores, preventing runaway convergence or death spirals in the autopoietic loop.

The dampening applies specifically in `handleModelPerformance` — instead of directly setting `personal_score = event.quality_observation.score`, the new score is computed as `alpha * new_score + (1 - alpha) * old_score` where `alpha` grows with sample count (low samples = conservative, high samples = responsive).

**Files**: `app/src/services/reputation-service.ts`

**Acceptance Criteria**:
- [ ] `FEEDBACK_DAMPENING_ALPHA_MIN` constant exported (e.g., `0.1` — new agents start conservative)
- [ ] `FEEDBACK_DAMPENING_ALPHA_MAX` constant exported (e.g., `0.5` — mature agents respond faster)
- [ ] `computeDampenedScore(oldScore: number | null, newScore: number, sampleCount: number): number` pure function exported
- [ ] Alpha formula: `alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * Math.min(1, sampleCount / DAMPENING_RAMP_SAMPLES)`
- [ ] `DAMPENING_RAMP_SAMPLES` constant exported (e.g., `50` — samples needed to reach max alpha)
- [ ] When `oldScore` is null (first observation), returns `newScore` directly (no dampening on cold start)
- [ ] Function is pure — no side effects, no Date calls

### Task S1-T2: Wire dampening into handleModelPerformance

**Description**: Replace the direct `personal_score = event.quality_observation.score` assignment in `handleModelPerformance` with the dampened score computation. Also update `handleQualitySignal` for consistency — both paths should dampen.

**Files**: `app/src/services/reputation-service.ts:523-568` (handleModelPerformance), `app/src/services/reputation-service.ts:463-477` (handleQualitySignal)

**Acceptance Criteria**:
- [ ] `handleModelPerformance` uses `computeDampenedScore(aggregate.personal_score, event.quality_observation.score, aggregate.sample_count)` instead of raw score
- [ ] `handleQualitySignal` uses `computeDampenedScore(aggregate.personal_score, event.score, aggregate.sample_count)` instead of raw score
- [ ] Blended score computation still runs after dampening (dampened personal score feeds into Bayesian blend)
- [ ] `reconstructAggregateFromEvents` updated to apply dampening during replay (consistent with live path)
- [ ] Existing test assertions updated to reflect dampened scores
- [ ] No behavioral change on first observation (alpha at minimum, old_score null → raw score used)

### Task S1-T3: Make MutationLog lifecycle explicit with session-scoped documentation

**Description**: Address F3 by making the MutationLog's ephemeral nature explicit in code and documentation. Add session boundary markers and a `MutationLogPersistence` interface that defines the contract for future persistent implementations.

The key insight from the Bridgebuilder review: the code says "audit trail" but the behavior is "session log." Make the code honest about what it is, and provide the interface for what it should become.

**Files**: `app/src/services/governance-mutation.ts:87-130`

**Acceptance Criteria**:
- [ ] `MutationLog` class JSDoc updated: replace "audit trail" language with "session-scoped mutation log" — explicitly state data does not survive restarts
- [ ] `MutationLogPersistence` interface exported: `{ save(log: ReadonlyArray<GovernanceMutation>): Promise<void>; load(): Promise<GovernanceMutation[]>; }`
- [ ] `MutationLog` constructor accepts optional `persistence?: MutationLogPersistence`
- [ ] When persistence provided: `append()` calls `persistence.save()` after mutation (fire-and-forget with error logging)
- [ ] When persistence absent: behavior unchanged (pure in-memory, zero overhead)
- [ ] `sessionId` readonly property added — `crypto.randomUUID()` generated at construction, included in governed state
- [ ] `getGovernedState()` on ReputationService includes `session_id` field from MutationLog

### Task S1-T4: Add MutationLog persistence tests

**Description**: Test the persistence interface contract and session boundary behavior.

**Files**: `app/src/services/__tests__/governance-mutation.test.ts`

**Acceptance Criteria**:
- [ ] Test: MutationLog without persistence works identically to current behavior
- [ ] Test: MutationLog with mock persistence calls save() on each append()
- [ ] Test: persistence.save() failure is logged but does not throw (fire-and-forget)
- [ ] Test: sessionId is a valid UUID and stable across appends within the same log instance
- [ ] Test: different MutationLog instances have different sessionIds
- [ ] Test: getGovernedState() includes session_id

### Task S1-T5: Extract DEFAULT_PSEUDO_COUNT and DEFAULT_COLLECTION_SCORE constants

**Description**: Address F4 — replace hardcoded `pseudoCount = 10` and `collectionScore = 0` in `reconstructAggregateFromEvents` with named constants. Import and use the same constants in aggregate creation paths for single source of truth.

**Files**: `app/src/services/reputation-service.ts:740-741`

**Acceptance Criteria**:
- [ ] `DEFAULT_PSEUDO_COUNT = 10` exported constant
- [ ] `DEFAULT_COLLECTION_SCORE = 0` exported constant
- [ ] `reconstructAggregateFromEvents` uses the constants instead of magic numbers
- [ ] Constants are documented with their Bayesian interpretation (pseudo_count = prior strength, collection_score = prior mean)
- [ ] All test files that create aggregates with `pseudo_count: 10` import the constant (or at minimum, `reconstructAggregateFromEvents` tests use it)
- [ ] Optional: `reconstructAggregateFromEvents` signature extended with `options?: { pseudoCount?: number; collectionScore?: number }` for parameterization

### Task S1-T6: Dampening unit tests

**Description**: Comprehensive tests for `computeDampenedScore` and the feedback dampening behavior.

**Files**: `app/src/services/__tests__/feedback-dampening.test.ts` (new)

**Acceptance Criteria**:
- [ ] Test: cold start (null old score) returns new score unmodified
- [ ] Test: low sample count produces conservative alpha (close to ALPHA_MIN)
- [ ] Test: high sample count (>= DAMPENING_RAMP_SAMPLES) produces responsive alpha (close to ALPHA_MAX)
- [ ] Test: dampened score is always between old and new score (weighted average property)
- [ ] Test: repeated identical observations converge to that value
- [ ] Test: single outlier observation is dampened (doesn't dominate immediately)
- [ ] Test: EMA property — order of observations matters (recent observations weighted more)
- [ ] Test: integration with handleModelPerformance (via ReputationService.processEvent)

---

## Sprint 2: Decision Trails & Surface Enforcement (Global ID: 79)

**Goal**: Address the Low-severity findings that deal with missing documentation, decision trail gaps, and semantic subtleties. These are code quality improvements that make the codebase self-documenting for future agents and humans.

**Findings**: F2 (DynamicContract enforcement gap), F5 (credential_update intent), F6 (quarantine recording trade-off)

### Task S2-T1: Document DynamicContract enforcement delegation

**Description**: Address F2 — the DynamicContract declares surface boundaries but the middleware only advertises the version. Add explicit documentation that surface enforcement is delegated to the routing layer (Finn), not enforced at the HTTP boundary. This prevents future agents from assuming this middleware is the enforcement point.

**Files**: `app/src/services/protocol-version.ts:28-61, 72-85`

**Acceptance Criteria**:
- [ ] `DIXIE_CONTRACT` JSDoc expanded with: `NOTE: Surface enforcement is delegated to the routing layer (Finn's tier-gated middleware). This contract declares the capability surfaces but does not enforce them at the HTTP boundary. See: loa-finn RFC #31 (Multi-Model Provider Abstraction).`
- [ ] `protocolVersionMiddleware` JSDoc expanded with: `This middleware advertises the protocol version — it does not enforce surface boundaries. Enforcement is the routing layer's responsibility (defense-in-depth: Finn validates tier before forwarding).`
- [ ] Add a `// ENFORCEMENT: routing-layer (not this middleware)` inline comment at the middleware function level
- [ ] Add test that verifies middleware does NOT filter response bodies (documenting the deliberate non-enforcement)

### Task S2-T2: Expand handleCredentialUpdate decision trail

**Description**: Address F5 — the credential_update no-op is intentional but the architectural reason is not documented. Add comprehensive decision trail explaining why credentials and scores are orthogonal, what credentials DO affect (access policy), and what future work might change this.

**Files**: `app/src/services/reputation-service.ts:505-511`

**Acceptance Criteria**:
- [ ] `handleCredentialUpdate` JSDoc expanded to include:
  - **Current behavior**: Event recorded in event log, no aggregate change
  - **Architectural rationale**: Credentials operate on the trust layer (access policy evaluation), scores operate on the quality layer (Bayesian blending). Mixing them couples "who you are" with "how well you perform."
  - **OIDC parallel**: This mirrors the separation between identity claims and authorization scopes
  - **Future consideration**: If credentials should contribute to reputation (e.g., verified API key as trust signal), add a `credential_weight` parameter to the blending function rather than mixing into quality scores
- [ ] Add a `// ADR: credentials ⊥ scores — see Bridgebuilder F5 (PR #15)` inline comment

### Task S2-T3: Document quarantine recording trade-off and strengthen quarantine tests

**Description**: Address F6 — recording to a quarantined tracker is semantically subtle. Document the trade-off explicitly (visibility vs. integrity) and add a test that verifies the quarantine fallback records are auditable despite the broken chain.

**Files**: `app/src/services/conviction-boundary.ts:256-282`, `app/src/services/__tests__/quarantine.test.ts`

**Acceptance Criteria**:
- [ ] Add JSDoc block at the quarantine fallback section explaining:
  - **Trade-off**: Recording to a quarantined trail means entries link to a broken chain, but NOT recording makes the quarantine period invisible to audit
  - **Design choice**: Visibility > purity — analogous to Bitcoin's orphaned block preservation
  - **Consumer guidance**: Check `integrity_status` before trusting chain integrity; quarantine entries are individually valid but the chain they link to has a known break
- [ ] New test in quarantine.test.ts: "records during quarantine are individually hashable"
  - Record entries, enter quarantine, record more entries, verify the post-quarantine entries have valid individual hashes
- [ ] New test: "quarantine fallback produces tier_default scoring path"
  - Verify the scoring path entry recorded during quarantine has `path: 'tier_default'` and includes quarantine reason

### Task S2-T4: Add enforcement non-enforcement test for protocol middleware

**Description**: Add a test that explicitly verifies the protocol version middleware does NOT filter or restrict response content based on reputation tier. This documents the deliberate delegation to the routing layer.

**Files**: `app/src/services/__tests__/protocol-version.test.ts`

**Acceptance Criteria**:
- [ ] Test: middleware allows full response body regardless of client protocol version
- [ ] Test: middleware does not inspect or modify response body
- [ ] Test: middleware only adds the X-Protocol-Version response header
- [ ] Test name clearly states intent: "does not enforce surface boundaries (delegated to routing layer)"

### Task S2-T5: Add credential_update event processing test

**Description**: Add explicit test coverage for the credential_update handler that documents it as a conscious no-op (event logged but no aggregate change).

**Files**: `app/tests/unit/reputation-evolution.test.ts` or `app/src/services/__tests__/reputation-service.test.ts`

**Acceptance Criteria**:
- [ ] Test: processEvent with credential_update does not change aggregate personal_score
- [ ] Test: processEvent with credential_update does not change aggregate sample_count
- [ ] Test: processEvent with credential_update IS recorded in event history (appendEvent called)
- [ ] Test name includes "no-op" or "audit-only" to document intent

---

## Sprint 3: Observability & Error Taxonomy (Global ID: 80)

**Goal**: Address the remaining improvements — replace `console.debug` with structured logging, improve error throwing patterns, and run a full regression sweep.

### Task S3-T1: Replace console.debug with structured scoring path logger

**Description**: The `console.debug` calls in `conviction-boundary.ts` (lines 263, 354) are invisible in production unless debug logging is enabled. Replace with a structured logger that can be configured per environment.

**Files**: `app/src/services/conviction-boundary.ts:263-269, 354-360`

**Acceptance Criteria**:
- [ ] Create `scoringPathLogger` utility — a thin wrapper that:
  - In development: `console.debug` (current behavior)
  - In production: structured JSON log at INFO level (so it appears in CloudWatch/Datadog)
  - Always includes: `{ wallet, tier, path, blending_used, quarantined?, timestamp }`
- [ ] Replace both `console.debug('[conviction-boundary] scoring_path:', ...)` calls with `scoringPathLogger.log(...)`
- [ ] Logger respects `DIXIE_SCORING_PATH_LOG_LEVEL` env var (default: 'info' in production, 'debug' in development)
- [ ] No behavioral change — same data logged, just via structured path
- [ ] Test: logger produces valid JSON output in all configurations

### Task S3-T2: Wrap assertTransition throw in proper Error subclass

**Description**: `assertTransition` throws a plain object `{ status: 409, body: {...} }` instead of an Error subclass. While this works for Hono's HTTP error handling, it confuses error monitoring tools (Sentry, Datadog) that expect Error instances with stack traces. Create a `TransitionError` class that extends Error and carries the HTTP metadata.

**Files**: `app/src/services/state-machine.ts:77-95`

**Acceptance Criteria**:
- [ ] `TransitionError` class exported, extends `Error`
- [ ] Properties: `status: number`, `body: { error: string; message: string; from: string; to: string; machine: string }`
- [ ] `assertTransition` throws `TransitionError` instead of plain object
- [ ] Error `message` is set to the transition error string (for stack traces)
- [ ] Error `name` is `'TransitionError'` (for error monitoring categorization)
- [ ] Existing test updated: `catch (err)` block checks `err instanceof TransitionError`
- [ ] Backward compatible: `err.status` and `err.body` still accessible (Hono error handlers work unchanged)

### Task S3-T3: Full regression sweep

**Description**: Run the complete test suite after all changes, verify zero regressions, and document the final test count.

**Files**: All test files

**Acceptance Criteria**:
- [ ] `npm test` passes with zero failures
- [ ] No new TypeScript compilation errors (`npx tsc --noEmit`)
- [ ] Total test count documented (expected: ~1280+ given new tests)
- [ ] No pre-existing type errors worsened

### Task S3-T4: Update invariants.yaml with new verified_in entries

**Description**: The new dampening function and persistence interface are additions to the governance surface. Add verified_in entries for the dampening invariant (feedback loop bounded) and session-scoped mutation tracking.

**Files**: `grimoires/loa/invariants.yaml`

**Acceptance Criteria**:
- [ ] New invariant or verified_in entry for feedback dampening: "model_performance feedback loop is bounded by EMA dampening — score cannot jump more than alpha_max * delta per observation"
- [ ] Updated INV-004 (budget monotonicity) verified_in to include MutationLog session_id for traceability
- [ ] Protocol version remains `loa-hounfour@8.2.0`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dampening alpha tuning needs adjustment | Medium | Low | Constants are exported and parameterizable; can tune without code change |
| MutationLog persistence interface too simple | Low | Low | Interface is minimal by design; extend when PostgreSQL adapter is built |
| Structured logger adds latency | Low | Low | Logger is async/fire-and-forget; no request path impact |
| TransitionError breaks Hono error handling | Low | Medium | Error carries same .status and .body properties; backward compatible |

## Success Metrics

| ID | Metric | Target |
|----|--------|--------|
| B-1 | All Bridgebuilder findings addressed | 10/10 (F1-F10) |
| B-2 | Zero regressions | All existing tests pass |
| B-3 | New test coverage | 15+ new tests across 3 new/extended test files |
| B-4 | Feedback dampening operational | EMA bounds verified in tests |
| B-5 | MutationLog lifecycle honest | Session-scoped language, persistence interface ready |
| B-6 | Decision trails complete | All no-ops and delegations documented with rationale |
