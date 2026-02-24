# Sprint Plan: Hounfour v7.9.2 Full Adoption

**Cycle**: cycle-003
**PRD**: v3.0.0 — Hounfour v7.9.2 Full Adoption
**SDD**: v3.0.0 — Civilizational Protocol Compliance
**Sprints**: 7 (Global IDs: 43–49)
**Strategy**: Bottom-up adoption → bridge hardening → reputation activation → Level 5 foundation

---

## Sprint 1 (Global #43): Type Foundation & Validator Migration

**Goal**: Expand hounfour type imports. Replace all hand-rolled validators with hounfour's TypeCompiler-cached equivalents. Achieve solid Level 2.

**FR Coverage**: FR-1 (partial), FR-2, FR-5 (partial), FR-7, FR-10

### Tasks

**Task 1.1: Expand types.ts protocol imports**
- Import `AgentDescriptor`, `AgentLifecycleState`, `HealthStatus`, `DomainEvent` from `/core`
- Import `EconomicBoundary`, `QualificationCriteria`, `TrustLayerSnapshot`, `CapitalLayerSnapshot`, `DenialCode` from root
- Import `ReputationScore`, `ReputationAggregate` from `/governance`
- Retain all Dixie-specific types (ServiceHealth, HealthResponse, etc.)
- Remove the local `HounfourCircuitState` from `state-machine.ts`; import from `/core` instead
- **AC**: `tsc --noEmit` passes. No duplicate type definitions between Dixie and hounfour.

**Task 1.2: Replace access-policy-validator.ts with hounfour validate()**
- Replace `validateAccessPolicy()` body with `validate(validators.accessPolicy(), policy, { crossField: true })`
- Keep the `assertValidAccessPolicy()` wrapper (HTTP 400 throwing)
- Remove the hand-rolled switch/case logic (~50 lines deleted)
- **AC**: Existing `access-policy-validator.test.ts` passes. New test: `reputation_gated` and `compound` policy types validated correctly.

**Task 1.3: Replace memory-auth.ts validateSealingPolicy() with hounfour validator**
- Replace `validateSealingPolicy()` body with `validate(validators.conversationSealingPolicy(), policy, { crossField: true })`
- Delete ~35 lines of manual checks
- **AC**: Existing sealing policy tests pass. New test: encryption↔key_rotation cross-field invariant validated.

**Task 1.4: Import protocol stream types in stream-events.ts**
- Import `StreamStart`, `StreamChunk`, `StreamToolCall`, `StreamUsage`, `StreamEnd`, `StreamError` from `/core`
- Re-export as `Hf*` prefixed types for reference
- Add compile-time assignability test in protocol-compliance.test.ts
- Dixie's existing stream event types remain unchanged (BFF-specific enrichments)
- **AC**: Assignability tests pass. No runtime behavior change.

**Task 1.5: State machine protocol alignment**
- Import `CircuitState` from `@0xhoneyjar/loa-hounfour/core` in `state-machine.ts`
- Remove local `HounfourCircuitState` type alias (line 89)
- Import `AGENT_LIFECYCLE_TRANSITIONS` and add test verifying `CircuitStateMachine.transitions` matches hounfour's canonical definition
- **AC**: `tsc --noEmit` passes. Protocol compliance test verifies transition map alignment.

**Task 1.6: NFT identity utilities**
- Import `checksumAddress`, `isValidNftId` from `/economy`
- Replace `wallet.toLowerCase() === other.toLowerCase()` comparisons in `memory-auth.ts` and `nft-transfer-handler.ts` with `checksumAddress(wallet) === checksumAddress(other)`
- Add `isValidNftId()` validation at API boundaries in routes that accept nftId params
- **AC**: All existing wallet comparison tests pass. New test: EIP-55 checksummed addresses compared correctly.

**Task 1.7: Migration safety test suite**
- Create `app/tests/unit/migration-safety.test.ts`
- Write test vectors for every replaced function: old behavior snapshot vs new hounfour behavior
- Cover: validateAccessPolicy (5 vectors), validateSealingPolicy (4 vectors), wallet comparison (3 vectors)
- **AC**: All vectors pass, confirming behavioral parity.

---

## Sprint 2 (Global #44): Access Control & Economic Arithmetic

**Goal**: Replace hand-rolled access control evaluation with hounfour. Migrate all economic arithmetic to BigInt. Achieve Level 3 for access control and economics.

**FR Coverage**: FR-1, FR-3

### Tasks

**Task 2.1: Replace memory-auth.ts checkAccessPolicy with evaluateAccessPolicy**
- Replace `checkAccessPolicy()` and the `switch/case` function (~55 lines) with `evaluateAccessPolicy()` from hounfour
- Map `MemoryOperation` to `AccessPolicyContext.action`: read→'read', seal→'write', delete→'delete', history→'read'
- Add optional `previouslyGranted` parameter for hysteresis support
- Delete `checkAccessPolicy()` function entirely
- **AC**: All existing memory-auth tests pass. New tests: `reputation_gated` policy type evaluates correctly, hysteresis prevents oscillation.

**Task 2.2: BigInt pricing migration**
- Rewrite `types/economic.ts`:
  - `MODEL_PRICING` from array of objects with `number` fields → `Map<string, PricingInput>` with string fields
  - `computeCost()` facade preserved (returns `number`), delegates to `computeCostMicroSafe()`
  - New `computeCostBigInt()` for internal BigInt paths
  - New `verifyBilling()` wrapping `verifyPricingConservation()`
- **AC**: `computeCost('claude-sonnet-4-6', 1000, 500)` returns same numeric result as before. Conservation test passes for all model entries.

**Task 2.3: Stream enricher BigInt integration**
- Update `stream-enricher.ts` to call `computeCostBigInt()` internally
- Convert to `number` only at the point of constructing the WebSocket `EconomicEvent`
- **AC**: WebSocket stream format unchanged. Economic metadata values unchanged for real-world token counts.

**Task 2.4: Economic conservation test suite**
- Create `app/tests/unit/economic-conservation.test.ts`
- Test: `computeCostMicro` matches `computeCost` for all MODEL_PRICING entries (within rounding)
- Test: `verifyPricingConservation` passes for Dixie-computed bills
- Test: BigInt → number conversion preserves value for amounts up to $1M (10^12 micro-USD)
- Test: `parseMicroUsd` rejects invalid inputs (leading zeros, negative, non-numeric)
- **AC**: All conservation tests pass.

---

## Sprint 3 (Global #45): Economic Boundary Integration & Integrity

**Goal**: Wire `evaluateEconomicBoundary()` into conviction resolution. Add request hashing and idempotency. Wire reputation foundation.

**FR Coverage**: FR-4, FR-6, FR-8

### Tasks

**Task 3.1: Economic boundary evaluation in conviction resolver**
- Add `evaluateEconomicBoundaryForWallet()` method to `ConvictionResolver` class
- Implement tier → trust score mapping (observer=0.0, participant=0.2, builder=0.5, architect=0.8, sovereign=1.0)
- Implement tier → reputation state mapping (observer→cold, participant→warming, builder→established, architect→established, sovereign→authoritative)
- Load `QualificationCriteria` from BFF config (with sensible defaults)
- **AC**: `evaluateEconomicBoundaryForWallet('0x...', 'builder', 100)` returns evaluation result with correct trust/capital layers.

**Task 3.2: Denial code surfacing in HTTP responses**
- When conviction gating denies access, include `denial_codes` and `evaluation_gap` in 402/403 response body
- Update conviction-tier middleware to propagate evaluation result
- Update route handlers that check conviction to surface denial details
- **AC**: 403 response for insufficient conviction includes `denial_codes: ["TRUST_SCORE_BELOW_THRESHOLD"]` and `evaluation_gap.trust_score_gap`.

**Task 3.3: Request hashing in finn-client**
- Import `computeReqHash` from `/integrity`
- For POST/PUT/PATCH requests, compute `X-Req-Hash` header from request body
- Log request hash in structured logging for correlation
- **AC**: All mutation requests to loa-finn include `X-Req-Hash` header. Hash is deterministic (same body → same hash).

**Task 3.4: Idempotency key derivation for mutation endpoints**
- Import `deriveIdempotencyKey` from `/integrity`
- For memory write, seal, and schedule endpoints, derive idempotency key from `(nftId, reqHash, 'loa-finn', endpoint)`
- Send as `X-Idempotency-Key` header
- Optional: Check against Redis for duplicate detection (if Redis available)
- **AC**: Mutation endpoints include `X-Idempotency-Key` header. Same request body produces same idempotency key.

**Task 3.5: Reputation service foundation**
- Create `app/src/services/reputation-service.ts`
- Import and wire: `reconstructAggregateFromEvents`, `verifyAggregateConsistency`, `computeEventStreamHash`, `computeCredentialPrior`, `isCredentialExpired`
- Expose as a service class with typed methods (not yet called from routes — foundation wiring)
- **AC**: Service instantiates without error. Unit test exercises each method with synthetic data.

---

## Sprint 4 (Global #46): E2E Conformance & Level 4 Gate

**Goal**: Build conformance test suite that validates all Dixie payloads against hounfour schemas. Achieve Level 4.

**FR Coverage**: FR-9

### Tasks

**Task 4.1: Conformance suite service**
- Create `app/src/services/conformance-suite.ts`
- Import `validate` and `validators` from hounfour
- Method: `validatePayload(schemaName, payload)` — validates any Dixie payload against named hounfour schema
- Method: `runFullSuite()` — validates all protocol-touching payloads
- **AC**: Service instantiates and validates sample payloads.

**Task 4.2: Hounfour conformance test file**
- Create `app/tests/unit/hounfour-conformance.test.ts`
- Tests:
  - AccessPolicy payloads generated by Dixie pass `validators.accessPolicy()`
  - ConversationSealingPolicy payloads pass `validators.conversationSealingPolicy()`
  - EconomicMetadata payloads match hounfour economic event schema shape
  - Stream events structurally compatible with hounfour stream types
  - NFT IDs pass `isValidNftId()` format check
  - Request hashes are deterministic (same input → same output)
  - Idempotency keys are collision-resistant for different inputs
  - State machine transitions match hounfour canonical definitions
  - Billing conservation holds for all pricing paths
- **AC**: All conformance tests pass. This IS the Level 4 gate.

**Task 4.3: Update protocol-compliance.test.ts**
- Expand existing protocol compliance tests to cover all new hounfour integrations
- Add: economic boundary evaluation tests with tier mapping
- Add: stream type assignability tests (Dixie events → hounfour protocol types)
- Add: conservation property tests
- **AC**: Full protocol compliance test suite passes.

**Task 4.4: ADR update and type audit refresh**
- Update `adr-hounfour-alignment.md` — mark Levels 2, 3, 4 as achieved
- Update `types.ts` header comment — type audit table reflects new alignment
- Ensure zero hand-rolled protocol logic remains (grep for patterns that should be gone)
- **AC**: ADR reflects Level 4 achieved. `grep` for old patterns returns 0 matches.

---

## Sprint Dependency Graph

```
Sprint 1 (Types + Validators)
    │
    ├──▶ Sprint 2 (Access Control + Economics)
    │        │
    │        └──▶ Sprint 3 (Boundary + Integrity + Reputation)
    │                 │
    │                 └──▶ Sprint 4 (Conformance + Level 4)
    │
    └──────────────────────▶ Sprint 4 (also depends on Sprint 1 directly)
```

All sprints are sequential — each builds on the previous.

---

## Acceptance Criteria Summary

| Metric (from PRD) | Sprint | Test |
|--------------------|--------|------|
| H-1: 100% protocol type imports | 1 | `tsc --noEmit`, grep for hand-rolled types |
| H-2: 100% validator replacement | 1 | Existing tests pass with hounfour validators |
| H-3: evaluateAccessPolicy + evaluateEconomicBoundary | 2, 3 | Unit tests for both evaluators |
| H-4: 0 number-typed micro-USD computations | 2 | Conservation tests |
| H-5: Stream type compatibility | 1 | Assignability tests |
| H-6: Integrity utilities integrated | 3 | Request hash determinism tests |
| H-7: Cross-field constraints pass | 1, 2 | Migration safety + conformance tests |
| H-8: E2E validator pass | 4 | Conformance suite |
| H-9: Economic boundary gating | 3 | Denial code tests |
| H-10: Zero custom protocol logic | 4 | grep audit |

---

## Sprint 5 (Global #47): Protocol Hardening — Bridge Deferred Findings

**Goal**: Address all accepted LOW findings from bridge iteration 1, harden MEDIUM-1 with observability, and reconcile the conviction voting × economic boundary interaction (Bridgebuilder Q4). This sprint closes every deferred finding from the bridge review.

**Source**: Bridge iter1 LOW-1, LOW-3, LOW-4, MEDIUM-1 (partial), Bridgebuilder Deep Review Q4

### Tasks

**Task 5.1: CircuitState mapping utility** *(LOW-1)*
- Create `toProtocolCircuitState()` function in `types.ts` or `state-machine.ts`
- Maps Dixie's `'half-open'` (kebab) → hounfour's `'half_open'` (snake), passes through `'closed'`/`'open'` unchanged
- Use the mapping in any code path that reports circuit state to protocol-level consumers (e.g., health responses)
- Add reverse mapping `fromProtocolCircuitState()` for completeness
- **AC**: `toProtocolCircuitState('half-open') === 'half_open'`. All existing CircuitState usages compile. Health response emits protocol-compatible circuit state when reporting to hounfour-consuming services.

**Task 5.2: BffError class with stack traces** *(LOW-3)*
- Create `BffError` class extending `Error` in a new `app/src/errors.ts` module
- Carries `status: number` and `body: ErrorResponse` (same shape as current plain objects)
- Provides `Error.stack` for monitoring tools (Sentry, Datadog) while preserving HTTP error mapping
- Migrate `finn-client.ts` thrown objects to `new BffError(status, body)`
- Migrate `access-policy-validator.ts:assertValidAccessPolicy()` to throw `BffError`
- Update catch handlers that inspect `'status' in err` to also handle `instanceof BffError`
- **AC**: `BffError` instances have `.stack` property. Existing error handling behavior unchanged. `err instanceof BffError` works in catch blocks. `String(err)` produces readable output.

**Task 5.3: Configurable budget period** *(LOW-4)*
- Extract hardcoded `30 * 24 * 60 * 60 * 1000` in `conviction-boundary.ts:89` to a named constant `DEFAULT_BUDGET_PERIOD_DAYS = 30`
- Add optional `budgetPeriodDays` parameter to `evaluateEconomicBoundaryForWallet()`
- Document the 30-day assumption in JSDoc with rationale ("matches monthly billing cycle")
- Make overridable from BFF config (environment variable `DIXIE_BUDGET_PERIOD_DAYS`)
- **AC**: Default behavior unchanged. `evaluateEconomicBoundaryForWallet(wallet, tier, budget, criteria, 7)` uses 7-day period. Named constant is documented.

**Task 5.4: translateReason observability logging** *(MEDIUM-1 partial)*
- Add structured logging when `translateReason` hits the fallback path (`'unknown_access_policy_type'`)
- Log the raw hounfour reason string at `warn` level for substring match failures
- Include `{ event: 'translate_reason_fallback', hounfour_reason, policy_type, operation }` in structured log
- Add a metric counter for fallback hits (can feed into alerting when hounfour upgrades break string matching)
- **AC**: When a new hounfour version changes reason wording, the fallback triggers a log warning. Metric counter tracks frequency of fallback hits.

**Task 5.5: Conviction voting × economic boundary access reconciliation** *(Bridgebuilder Q4)*
- Audit all places where conviction tiers gate access: (a) knowledge governance voting (PR #5), (b) economic boundary evaluation (this PR)
- Document the design intent: these are separate concerns (governance voice vs. economic access) that share the same input (conviction tier) but produce different outputs
- Add a `ConvictionAccessMatrix` constant that explicitly maps which tiers can do what across both systems
- Write test that exercises the case where a wallet has enough conviction to vote but not enough to pass economic boundary (confirming this is by-design, not a bug)
- **AC**: `ConvictionAccessMatrix` constant exists with explicit tier → capability mapping. Test confirms observer can vote (weight 0) but cannot pass builder economic boundary. Documentation explains the separation of concerns.

**Task 5.6: Protocol hardening test suite**
- Create `app/tests/unit/protocol-hardening.test.ts`
- Tests: CircuitState mapping (both directions), BffError class behavior, configurable budget period, translateReason fallback logging, conviction access matrix consistency
- **AC**: All protocol hardening tests pass.

---

## Sprint 6 (Global #48): Reputation Activation & Denial Code Evolution

**Goal**: Wire the ReputationService foundation from Sprint 3 into live routes. Evolve translateReason from fragile substring matching toward structured denial codes. Establish the sunset plan for the Strangler Fig translation layer.

**Source**: Bridge iter1 LOW-2, MEDIUM-1 (deep), Bridgebuilder Deep Review Q1, Q3

### Tasks

**Task 6.1: ReputationService persistence layer** *(LOW-2, Q3)*
- Add a lightweight in-memory persistence layer to `ReputationService` (upgrade from stateless to stateful)
- `ReputationStore` interface with `get(nftId)`, `put(nftId, aggregate)`, `listCold()` methods
- Default implementation: `InMemoryReputationStore` (Map-backed, suitable for single-instance BFF)
- Constructor injection: `new ReputationService(store)` — preserves testability
- PostgreSQL adapter as TODO placeholder (interface ready, wired when Dixie gains persistent storage)
- **AC**: `ReputationService` accepts a store. `InMemoryReputationStore` passes CRUD test. Service class is no longer stateless. Interface contract documented for future PostgreSQL adapter.

**Task 6.2: Wire ReputationService to health and governance routes** *(Q3)*
- Instantiate `ReputationService` in the BFF service container (DI or module-level singleton)
- Wire `checkReliability()` into the health endpoint: include `reputation_service: { initialized, aggregate_count }` in health response
- Wire `computeBlended()` into the conviction-boundary evaluation: when a reputation aggregate exists for a wallet, blend the personal score with the tier-based collection prior instead of using the hardcoded tier score
- When no aggregate exists (cold start), fall back to the existing tier-based score (backward compatible)
- **AC**: Health endpoint includes reputation service status. Conviction boundary uses blended score when aggregate available. All existing tests pass (cold start path unchanged).

**Task 6.3: Structured denial code mapping in translateReason** *(MEDIUM-1 deep, Q1)*
- Refactor `translateReason` to prefer structured denial codes from hounfour's `AccessPolicyResult` when available
- Check if `result.denial_code` (or equivalent structured field) exists on the hounfour result — if so, map directly instead of substring matching
- Fall back to substring matching only when structured codes are absent (backward compat with older hounfour versions)
- Document which hounfour version introduces structured denial codes and the version at which substring matching can be removed
- **AC**: When hounfour provides structured denial codes, `translateReason` uses them directly. Substring matching remains as fallback. Version dependency documented.

**Task 6.4: translateReason sunset plan documentation** *(Q1)*
- Create `grimoires/loa/context/adr-translateReason-sunset.md`
- Document: (1) Why translateReason exists (Strangler Fig migration from hand-rolled to hounfour), (2) Current state (substring matching with observability from Task 5.4), (3) Target state (direct structured denial codes), (4) Sunset criteria ("remove when all consumers speak denial codes natively AND hounfour ≥ vX.Y.Z"), (5) API version tracking approach (inspired by Stripe's API compatibility layer)
- Include a consumer audit: which callers of `authorizeMemoryAccess` inspect the `reason` field, and what values they depend on
- **AC**: ADR documents the full lifecycle. Consumer audit identifies all reason-string-dependent code paths. Sunset criteria are measurable and specific.

**Task 6.5: Reputation-gated access policy end-to-end test**
- Write an integration-style test that exercises the full path: wallet → conviction tier → reputation blended score → evaluateEconomicBoundary → access decision
- Cover: cold start (no aggregate → tier-based), warm start (aggregate exists → blended), transition (cold → warming after quality events)
- Verify that reputation_gated policy type works end-to-end with the new ReputationService
- **AC**: Test passes for all three scenarios. Reputation-gated policy evaluation produces correct allow/deny with blended scores.

---

## Sprint 7 (Global #49): Level 5 Foundation — Runtime Constitutional Enforcement

**Goal**: Build the foundation for Level 5 (Runtime Constitutional Enforcement) — runtime conformance middleware with sampling, auto-generated conformance fixtures from hounfour, and the architectural plan for Dixie as a context enrichment tier in the self-improving review infrastructure.

**Source**: Bridge iter1 MEDIUM-4, SPECULATION-1, Bridgebuilder Deep Review Q2, Q5

### Tasks

**Task 7.1: Runtime conformance middleware** *(SPECULATION-1, MEDIUM-4)*
- Create `app/src/middleware/conformance-middleware.ts`
- Hono middleware factory: `createConformanceMiddleware({ sampleRate, schemas, onViolation })`
- Validates outgoing response bodies against hounfour schemas at configurable sample rate
- `sampleRate: 1.0` in development/staging (validate every response), `0.001` in production (1 in 1000)
- `onViolation: 'log' | 'reject' | 'signal'` — log to structured logger, reject the response (dev only), or emit to NATS signal pipeline
- Violation event: `{ event: 'conformance_violation', schema, path, error, sample_rate, timestamp }`
- Middleware is opt-in per route or globally via config
- **AC**: Middleware validates responses in dev. Sampling works correctly (1000 requests at 0.001 rate ≈ 1 validation). Violations logged with schema name and error path. No measurable latency impact at production sample rate.

**Task 7.2: Conformance fixture auto-generation from hounfour** *(Q2)*
- Create `app/scripts/generate-conformance-fixtures.ts` — script that introspects hounfour's exported validators and schemas
- For each schema in hounfour's `validators` object, generate a minimal valid sample payload using TypeBox's `Value.Create()` from `@sinclair/typebox/value`
- Output to `app/tests/fixtures/hounfour-generated-samples.json`
- Update `conformance-suite.ts:getSamplePayloads()` to merge hand-crafted samples with auto-generated ones
- When hounfour adds a new schema, re-running the script automatically generates new samples → conformance suite grows automatically
- **AC**: Script generates valid samples for all hounfour schemas. Auto-generated samples pass `validatePayload()`. Adding a new schema to hounfour and re-running script produces a new test vector without manual intervention.

**Task 7.3: Conformance violation signal pipeline**
- Wire conformance violations from the middleware (Task 7.1) into the existing NATS signal pipeline
- New signal type: `ConformanceViolationSignal` extending `InteractionSignal` pattern
- Include: schema name, error path, request endpoint, response status, sample rate
- Observable via the same telemetry infrastructure that handles `InteractionSignal`
- **AC**: Conformance violations appear in NATS topic. Signal includes enough context for automated alerting (which schema, which endpoint, how often).

**Task 7.4: Level 5 maturity model documentation + ADR update**
- Update `adr-hounfour-alignment.md` with Level 5 definition:
  - **Level 5 (Runtime Constitutional Enforcement)**: Every payload that crosses a protocol boundary is validated at runtime. Invalid payloads are rejected or logged. Conformance is mechanical, not social.
- Document the Level 4 → Level 5 progression: what's needed (runtime middleware deployed), what's the cost (latency from validation), what's the benefit (drift detection, mechanical guarantee)
- Include the Kubernetes admission webhook analogy: Level 4 = conformance tests (CI), Level 5 = admission controllers (runtime)
- **AC**: ADR defines Level 5. Progression criteria are measurable. Cost/benefit tradeoff documented.

**Task 7.5: Dixie as context enrichment tier — architecture design** *(Q5)*
- Create `grimoires/loa/context/adr-dixie-enrichment-tier.md`
- Design document for Dixie as the fourth routing tier in the review infrastructure:
  - Current state: Hounfour → Codex → curl (3-tier router from PR #401)
  - Proposed: Hounfour → Dixie → Codex → curl (Dixie provides knowledge context enrichment)
  - Dixie's role: enrich review prompts with knowledge governance context (conviction-weighted corpus relevance, reputation-informed quality priors)
  - Quality event feedback loop: bridge review quality → reputation aggregate → conviction tier → review access
  - Self-hosting property: the review infrastructure improves the knowledge that improves the review infrastructure
- Include: API surface design, integration points with loa-finn's router, latency budget, fallback behavior
- This is a design document, NOT implementation — foundation for a future cycle
- **AC**: Design document covers the 4-tier architecture, integration points, latency constraints, and the self-improving loop. Peer reviewable by the team.

---

## Updated Sprint Dependency Graph

```
Sprint 1 (Types + Validators) ──── COMPLETED
    │
    ├──▶ Sprint 2 (Access Control + Economics) ──── COMPLETED
    │        │
    │        └──▶ Sprint 3 (Boundary + Integrity + Reputation) ──── COMPLETED
    │                 │
    │                 └──▶ Sprint 4 (Conformance + Level 4) ──── COMPLETED
    │
    └──────────────────────▶ Sprint 4 ──── COMPLETED

Sprint 4 (Level 4 achieved)
    │
    ├──▶ Sprint 5 (Protocol Hardening — deferred findings)
    │        │
    │        └──▶ Sprint 6 (Reputation Activation + Denial Evolution)
    │                 │
    │                 └──▶ Sprint 7 (Level 5 Foundation)
    │
    └──────────────────────▶ Sprint 7 (also depends on Sprint 4 conformance suite)
```

Sprints 5–7 are sequential and build on the Level 4 foundation established in Sprints 1–4.

---

## Updated Acceptance Criteria Summary

| Metric | Sprint | Test |
|--------|--------|------|
| H-1 through H-10 | 1–4 | See above (all COMPLETED) |
| All LOW findings addressed | 5 | CircuitState mapping, BffError class, budget period, access matrix |
| MEDIUM-1 hardened | 5, 6 | Observability logging (5), structured codes + sunset plan (6) |
| MEDIUM-4 addressed | 7 | Runtime conformance middleware with sampling |
| SPECULATION-1 implemented | 7 | Runtime middleware + signal pipeline |
| Reputation service activated | 6 | Wired to routes, persistence layer, blended scoring |
| Conviction × economic boundary reconciled | 5 | ConvictionAccessMatrix + separation-of-concerns test |
| translateReason sunset plan | 6 | ADR with measurable sunset criteria |
| Level 5 maturity model | 7 | ADR with definition + progression criteria |
| Self-improving review design | 7 | Architecture design document |
