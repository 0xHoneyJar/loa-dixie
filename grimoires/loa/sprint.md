# Sprint Plan: Finn Docker Rebuild & Hounfour v8.3.0 Upgrade

**Cycle**: cycle-019
**PRD**: v19.0.0
**SDD**: v19.0.0
**Sprints**: 7
**Total Tasks**: 44

> Sprints 1-3 completed the pin upgrade and initial adoption. Sprints 4-7 implement
> the full canonical migration identified in the Bridgebuilder deep review
> (PR #64 comments). Migration approach informed by blast radius analysis:
> 5 GovernedResource importers, 9 computeDampenedScore call sites, 2 chain-bound
> hash files, 1 advisory lock file.
>
> **Branch**: `feature/hounfour-v830-canonical-migration` (new, from `main` after PR #64 merges)
> **Source**: Bridge deep review + migration roadmap (PR #64 comments)
> **Issues**: dixie #65, #66, #67, hounfour #40

---

## Sprint 1: Finn Docker Rebuild (Cross-Repo Operational) ✅ COMPLETED

**Global ID**: 116
**Goal**: Rebuild Finn's Docker image with complete hounfour dist, push to ECR,
redeploy to ECS, verify health. Zero code changes — purely operational.

**Repo**: `/home/merlin/Documents/thj/code/loa-finn`
**Branch**: N/A (operational, no code changes)

### Tasks

#### T1.1: Verify Finn Local Hounfour Dist Complete ✅
- **Description**: Confirm all hounfour subpath exports exist in
  `node_modules/@0xhoneyjar/loa-hounfour/dist/` (commons, core, economy,
  governance, model, graph, composition, constraints, test-infrastructure)
- **Acceptance**: All 9 subdirectories present with .js and .d.ts files
- **Effort**: XS

#### T1.2: Docker Build ✅
- **Description**: Build Finn Docker image from current source.
  `docker build -f deploy/Dockerfile -t loa-finn-armitage .`
- **Acceptance**: Docker build completes without error. Image tagged with current git SHA.
- **Effort**: S

#### T1.3: ECR Push ✅
- **Description**: Login to ECR, tag image, push to
  `891376933289.dkr.ecr.us-east-1.amazonaws.com/loa-finn-armitage`
- **Acceptance**: Image appears in ECR with git SHA tag
- **Effort**: S

#### T1.4: ECS Redeploy ✅
- **Description**: Force new ECS deployment with the fresh image.
  `aws ecs update-service --cluster arrakis-staging-cluster --service loa-finn-armitage --force-new-deployment`
- **Acceptance**: ECS service stable with new task running the fresh image
- **Effort**: S

#### T1.5: Health Verification ✅
- **Description**: Verify Finn health endpoint returns 200 after deployment.
  `curl https://finn-armitage.arrakis.community/health`
- **Acceptance**: Health check returns 200 with protocol version and no error indicators
- **Effort**: XS

#### T1.6: Rollback Verification ✅
- **Description**: Confirm previous ECR image tag (`abbb4cb`) remains available
  for rollback if needed.
- **Acceptance**: Previous image tag listed in ECR, immutable tag policy confirmed
- **Effort**: XS

---

## Sprint 2: Dixie Hounfour v8.3.0 Upgrade ✅ COMPLETED

**Global ID**: 117
**Goal**: Upgrade Dixie's hounfour pin to v8.3.0. Pin upgrade only — local
implementation replacements deferred due to incompatibilities.

**Repo**: `/home/merlin/Documents/thj/code/loa-dixie`
**Branch**: `feature/hounfour-v830-upgrade` (from `main`)

### Tasks

#### T2.1: Create Branch & Upgrade Package ✅
- **Description**: Create `feature/hounfour-v830-upgrade` from `main`.
  Update hounfour pin: `cd app && npm install github:0xHoneyJar/loa-hounfour#v8.3.0`
- **Acceptance**: Branch created, `package.json` shows `v8.3.0` tag pin,
  `package-lock.json` updated, `npm ls @0xhoneyjar/loa-hounfour` resolves correctly
- **Effort**: S

#### T2.2: Verify v8.3.0 Canonical Exports Exist ✅
- **Description**: Confirm the new exports are present in the installed package:
  `commons/governed-resource-runtime`, `commons/feedback-dampening`,
  `commons/chain-bound-hash`. Read type signatures, verify interface compatibility.
- **Acceptance**: All 3 canonical modules resolve. Type signatures documented for
  migration compatibility assessment.
- **Effort**: S

#### T2.3: Replace GovernedResource with Canonical Base — DEFERRED
- **Description**: Update `governed-resource.ts` to re-export from hounfour's
  `GovernedResourceBase`. Use re-export/adapter pattern to preserve import paths
  for 13 existing importers. If method names differ, add thin adapter class.
- **Acceptance**: All 13 importers compile. `GovernedResource` interface and
  `GovernedResourceBase` abstract class available from same import path.
  No importer file changes needed.
- **Effort**: M
- **DEFERRED REASON**: Interface mismatch discovered in T2.2. Canonical uses
  `transition(event, context: MutationContext)` vs Dixie's `transition(event, actorId: string)`.
  Field names differ: `InvariantResult.holds` vs `.satisfied`, `TransitionResult.newState` vs `.state`.
  Requires adapter layer affecting 13 importers — too risky for pin-upgrade PR.
- **RESOLVED IN**: Sprint 5

#### T2.4: Replace EMA Dampening with computeDampenedScore — DEFERRED
- **Description**: In `reputation-scoring-engine.ts`, replace local
  `computeDampenedScore` function (lines 67-83) and constants (lines 33-48) with
  canonical import from `commons/feedback-dampening`. Preserve re-export chain in
  `reputation-service.ts` so existing test imports continue working.
- **Acceptance**: `feedback-dampening.test.ts` passes. All 3 call sites in
  `reputation-service.ts` (lines 695, 746, 778) continue working.
  Constants match: ALPHA_MIN=0.1, ALPHA_MAX=0.5, RAMP=50.
- **Effort**: M
- **DEFERRED REASON**: Behavioral difference discovered in T2.2. Alpha ramp is
  INVERTED: canonical goes responsive→conservative, Dixie goes conservative→responsive.
  Cold-start uses Bayesian pseudo-count prior (pulls toward 0.5), Dixie returns newScore
  directly. Not a drop-in replacement — requires deliberate scoring behavior decision.
- **RESOLVED IN**: Sprint 4

#### T2.5: Replace Chain-Bound Hash with Canonical Export — DEFERRED
- **Description**: In `audit-trail-store.ts`, replace local `computeChainBoundHash`
  wrapper (lines 39-62) with canonical import from `commons/chain-bound-hash`.
  Verify hash output is identical (both use `sha256:` prefix, both delegate to
  `computeAuditEntryHash`). Run `verifyIntegrity()` test to confirm chain compatibility.
- **Acceptance**: `audit-trail-store.test.ts` passes. Hash format unchanged
  (`sha256:<64 hex>`). Chain verification produces identical results.
- **Effort**: M
- **DEFERRED REASON**: Algorithm difference discovered in T2.2. Canonical uses simple
  `sha256(contentHash:previousHash)` concatenation. Dixie uses double-hash through
  `computeAuditEntryHash()` with synthetic chain-binding entry. Different algorithms
  produce different hashes — swapping would invalidate existing audit chains.
- **RESOLVED IN**: Sprint 6

#### T2.6: Evaluate Optional Utilities ✅
- **Description**: Check if `validateAuditTimestamp` and `computeAdvisoryLockKey`
  from v8.3.0 are worth adopting. Review `audit-trail-store.ts` for ad-hoc
  timestamp validation and `app/src/db/migrate.ts` for advisory lock key generation.
- **Acceptance**: Decision documented (adopt or defer) for each utility.
  If adopted, tests pass.
- **Effort**: S
- **Result**: Both DEFERRED. `validateAuditTimestamp` — no local equivalent exists,
  available for future use. `computeAdvisoryLockKey` — Dixie's `computeLockId()` uses
  SHA-256→31-bit, canonical uses FNV-1a 32-bit signed. Swapping changes lock IDs,
  risks concurrent migration issues during rolling deploys.

#### T2.7: Run Full Test Suite ✅
- **Description**: Run `npm test` from `app/` directory. All 2373+ existing tests
  must pass with zero regressions.
- **Acceptance**: All tests green. No new test failures. No type errors.
- **Effort**: S

#### T2.8: Create PR ✅
- **Description**: Push branch, create PR to `main` with summary of changes:
  hounfour pin update, compatibility analysis, deferred decisions.
- **Acceptance**: PR #64 created with clear description. CI passes.
- **Effort**: XS

---

## Sprint 3: Bridge Iteration 1 — Bridgebuilder Findings ✅ COMPLETED

**Global ID**: 118
**Goal**: Address actionable Bridgebuilder findings from iteration 1.
Adopt `validateAuditTimestamp` from v8.3.0 (zero-risk quick win).
Note @noble/hashes transitive dependency for security audit.

**Source**: bridge-20260228-c019-hounfour iteration 1 findings
**Actionable findings**: 2 MEDIUM (advisory), 3 LOW (1 actionable)

### Tasks

#### T3.1: Adopt validateAuditTimestamp in AuditTrailStore.append() ✅
- **Description**: Import `validateAuditTimestamp` from
  `@0xhoneyjar/loa-hounfour/commons/audit-timestamp`. Call it in
  `AuditTrailStore.append()` before the INSERT statement. Throw a typed
  `AuditTimestampError` if validation fails.
- **Finding**: HF830-LOW-02
- **Acceptance**: AuditTrailStore.append() validates timestamps. Malformed
  timestamps rejected at ingestion boundary. All existing tests pass
  (existing timestamps are valid ISO 8601 from `new Date().toISOString()`).
  Review test fixtures for synthetic timestamps that might fail validation.
- **Effort**: S

#### T3.2: Review Test Fixtures for Timestamp Compatibility ✅
- **Description**: Before T3.1, scan all test files that call AuditTrailStore
  or create audit entries. Verify synthetic timestamps in fixtures pass
  `validateAuditTimestamp`. Fix any that don't.
- **Acceptance**: All test fixtures use valid ISO 8601 timestamps compatible
  with the new validation.
- **Effort**: S

#### T3.3: Document @noble/hashes Transitive Dependency ✅
- **Description**: Note in security documentation that v8.3.0 introduces
  @noble/hashes as a transitive dependency. It is well-audited and benign
  but should be tracked.
- **Finding**: HF830-LOW-01
- **Acceptance**: Dependency noted in PR description or ADR.
- **Effort**: XS

#### T3.4: Run Full Test Suite ✅
- **Description**: Run `npm test` from `app/` directory. All 2373+ existing tests
  must pass with zero regressions after timestamp validation addition.
- **Acceptance**: All tests green.
- **Effort**: S

---

## Sprint 4: Alpha Ramp ADR & Dampened Score Canonical Migration (P1)

**Global ID**: 119
**Goal**: Resolve the alpha ramp direction product decision via ADR. Implement
configurable dampened scoring that adopts hounfour's canonical `computeDampenedScore`
with explicit ramp direction control. File all ecosystem tracking issues.

**Branch**: `feature/hounfour-v830-canonical-migration`
**Resolves**: T2.4 (DEFERRED), P1 from migration roadmap
**Blast Radius**: 9 call sites across 6 files (reputation-scoring-engine.ts,
reputation-event-store.ts, reputation-service.ts + 3 test files)

### Context

The alpha ramp inversion is a product decision, not a bug. Dixie's conservative-first
(0.1→0.5) gives new agents stability before responsiveness. Hounfour's responsive-first
(0.5→0.1) gives fast convergence then stability — aligning with ML best practice.
The bridge deep review recommended Option C (propose upstream configurable `rampDirection`),
then Option A (adopt responsive-first for Dixie once configurable).

Until hounfour supports `rampDirection`, Dixie wraps the canonical function with
explicit direction config, preserving the ability to switch later.

### Tasks

#### T4.1: Write ADR-005 — Alpha Ramp Direction Decision
- **Description**: Create `docs/adr/005-alpha-ramp-direction.md` documenting the
  decision framework from the bridge deep review. Document all three options
  (A: adopt responsive-first, B: keep conservative-first, C: propose upstream
  configurable). Record the decision: adopt Option C first (propose upstream),
  then Option A when configurable. Include the cold-start prior decision
  (dual-track: internal Bayesian + display observed with observation count badge).
- **Acceptance**: ADR follows existing format (see `docs/adr/001-*` through `004-*`).
  Decision rationale includes FAANG parallel (Google proto2→proto3 migration).
  Cold-start dual-track approach documented with examples.
- **Effort**: M

#### T4.2: File GitHub Tracking Issues
- **Description**: Create 4 tracking issues as identified in the bridge migration roadmap:
  1. dixie: "ADR: Alpha ramp direction — conservative-first vs responsive-first"
  2. dixie: "feat: GovernedResourceBase migration to hounfour canonical"
  3. dixie: "feat: Chain-bound hash version-aware verification"
  4. hounfour: "feat: configurable ramp direction for computeDampenedScore"
  Each issue links to PR #64's deep review and migration roadmap comments.
- **Acceptance**: 4 issues created with correct labels, cross-references, and
  priority annotations. Hounfour issue includes ecosystem context (Dixie, Finn,
  Freeside all benefit from configurable ramp).
- **Effort**: S

#### T4.3: Create `FeedbackDampeningConfig` Type & Configurable Wrapper
- **Description**: In `reputation-scoring-engine.ts`, create a
  `FeedbackDampeningConfig` type with `rampDirection: 'ascending' | 'descending'`
  and `coldStartStrategy: 'direct' | 'bayesian' | 'dual-track'` fields.
  Create a `computeDixieDampenedScore()` wrapper that delegates to hounfour's
  canonical `computeDampenedScore` but applies Dixie's configured ramp direction
  by transforming the `sampleCount` parameter (inverting the ramp curve).
  Export config as module-level constant with current behavior as default
  (ascending = conservative-first, coldStart = direct).
- **Acceptance**: `computeDixieDampenedScore(config, oldScore, newScore, sampleCount)`
  produces identical output to current local implementation when config uses
  `{rampDirection: 'ascending', coldStartStrategy: 'direct'}`. Type-safe config
  prevents invalid combinations.
- **Effort**: L

#### T4.4: Implement Cold-Start Dual-Track Scoring
- **Description**: When `coldStartStrategy: 'dual-track'`, compute both the
  canonical Bayesian prior score (internal, for governance decisions) and the
  direct observed score (display, with observation count). Add an
  `observationCount` field to `ReputationScore` type for UI consumption.
  When `coldStartStrategy: 'direct'`, preserve current behavior (return newScore
  for first observation). When `coldStartStrategy: 'bayesian'`, use canonical
  pseudo-count prior.
- **Acceptance**: First observation (score=0.95) produces:
  - `direct`: score=0.95
  - `bayesian`: score≈0.541 (pseudo-count=10 pulls toward 0.5)
  - `dual-track`: internalScore≈0.541, displayScore=0.95, observationCount=1
  Tests cover all three strategies.
- **Effort**: L

#### T4.5: Migrate Call Sites to Configurable Wrapper
- **Description**: Replace all 9 call sites of local `computeDampenedScore` with
  `computeDixieDampenedScore` using the default config. Files to update:
  - `reputation-scoring-engine.ts` (definition + internal calls)
  - `reputation-event-store.ts`
  - `reputation-service.ts` (re-export chain)
  - `feedback-dampening.test.ts`
  - `reputation-scoring-engine.test.ts`
  - `reputation-service.test.ts`
  Delete the local `computeDampenedScore` function and constants (ALPHA_MIN,
  ALPHA_MAX, DAMPENING_RAMP_SAMPLES). Preserve re-export chain in
  `reputation-service.ts` for backward compatibility.
- **Acceptance**: No local dampening implementation remains. All call sites use
  the canonical-backed configurable wrapper. All existing tests pass with
  identical scoring behavior (ascending ramp + direct cold-start = current).
- **Effort**: M

#### T4.6: Shadow Comparison Tests
- **Description**: Add test cases that run both ramp directions (ascending vs
  descending) and all cold-start strategies against the same input sequences.
  Verify that switching from ascending to descending is a safe operation
  (no score corruption, just different convergence curves). These tests serve
  as the evidence base for the eventual switch to responsive-first.
- **Acceptance**: Test file `feedback-dampening-migration.test.ts` with ≥10
  test cases covering:
  - Identical output for ascending + direct (regression guard)
  - Descending ramp convergence behavior documented
  - Bayesian prior cold-start behavior documented
  - Dual-track strategy correctness
  - Edge cases: sampleCount=0, sampleCount=RAMP, score boundaries
- **Effort**: M

#### T4.7: Run Full Test Suite
- **Description**: Run `npm test` from `app/` directory. All 2374+ tests must pass.
- **Acceptance**: All tests green. Zero regressions.
- **Effort**: S

---

## Sprint 5: GovernedResourceBase Canonical Migration (P2)

**Global ID**: 120
**Goal**: Migrate Dixie's local `GovernedResourceBase` to hounfour's canonical
implementation via an adapter pattern, then incrementally migrate all implementors.
Delete local `governed-resource.ts` when complete.

**Branch**: `feature/hounfour-v830-canonical-migration`
**Resolves**: T2.3 (DEFERRED), P2 from migration roadmap
**Blast Radius**: 5 source files import from `governed-resource.ts`:
`governor-registry.ts`, `reputation-service.ts`, `scoring-path-tracker.ts`,
`fleet-governor.ts`, `sovereignty-engine.ts`

### Context

This is Dixie's "Spring Boot moment" — the canonical version inverts control.
Instead of subclasses manually calling `verify()` and managing transitions,
the canonical base manages the lifecycle while subclasses implement business logic
via `applyEvent()` and `defineInvariants()`.

Key type mappings (Dixie → Hounfour):
- `TransitionResult.state` → `TransitionResult.newState`
- `InvariantResult.satisfied` → `InvariantResult.holds`
- `InvariantResult.detail` (required) → `InvariantResult.detail` (optional)
- `transition(event, actorId: string)` → `transition(event, context: MutationContext)`

`MutationContext` subsumes `actorId` — the adapter wraps `actorId` into
`{ actorId, timestamp: new Date().toISOString(), source: 'dixie' }`.

### Tasks

#### T5.1: Create HounfourGovernedResourceAdapter
- **Description**: In `governed-resource.ts`, create an adapter class that extends
  hounfour's canonical `GovernedResourceBase` and re-exports Dixie's existing
  type interface. The adapter maps:
  - `transition(event, actorId)` → `transition(event, { actorId, timestamp, source })`
  - `TransitionResult.newState` → `TransitionResult.state` (Dixie's field name)
  - `InvariantResult.holds` → `InvariantResult.satisfied` (Dixie's field name)
  - `InvariantResult.detail` optional → required (adapter provides default)
  Re-export all types and the adapter as `GovernedResourceBase` so existing
  import paths continue working unchanged.
- **Acceptance**: `import { GovernedResourceBase, TransitionResult, InvariantResult }
  from '../governed-resource'` resolves identically for all 5 importers.
  Adapter compiles. Existing tests pass with zero changes.
- **Effort**: L

#### T5.2: Migrate ScoringPathTracker (Simplest Implementor)
- **Description**: `scoring-path-tracker.ts` extends `GovernedResourceBase`.
  Verify it works through the adapter layer. If the adapter is transparent,
  no changes needed. If method signatures changed (e.g., `applyEvent` vs
  custom transition), update to use canonical lifecycle methods.
  Update corresponding tests.
- **Acceptance**: ScoringPathTracker compiles and passes all tests through
  the adapter. Governance transitions (state changes, invariant checks)
  produce identical behavior.
- **Effort**: S

#### T5.3: Migrate FleetGovernor
- **Description**: `fleet-governor.ts` extends `GovernedResourceBase`.
  Same migration pattern as T5.2. Verify governance transitions for
  fleet lifecycle management (agent spawning, health monitoring, scaling).
- **Acceptance**: FleetGovernor compiles and passes all tests through adapter.
  Fleet governance invariants verified.
- **Effort**: M

#### T5.4: Migrate SovereigntyEngine (Most Complex)
- **Description**: `sovereignty-engine.ts` extends `GovernedResourceBase` and
  has the most complex governance logic (constitutional enforcement, capability
  evolution, delegation hierarchies). Verify all sovereignty invariants pass
  through the adapter. This is the highest-risk migration — if any invariant
  subtlety depends on Dixie's specific lifecycle ordering, it will surface here.
- **Acceptance**: SovereigntyEngine compiles and passes all tests through adapter.
  Constitutional invariants verified. Capability evolution paths unchanged.
- **Effort**: L

#### T5.5: Update GovernorRegistry & ReputationService Imports
- **Description**: `governor-registry.ts` and `reputation-service.ts` import
  the `GovernedResource` type (not the base class). Verify these type-only
  imports resolve correctly through the adapter's re-exports. Update if
  the canonical type shape differs.
- **Acceptance**: Both files compile. GovernorRegistry can register and query
  governed resources. ReputationService's governance integration unchanged.
- **Effort**: S

#### T5.6: Thin Down Adapter → Direct Canonical Usage
- **Description**: After all implementors are migrated, evaluate whether the
  adapter can be thinned or eliminated. If all implementors work with canonical
  method names and type shapes, update them to import directly from hounfour
  and delete the adapter layer. If Dixie-specific field names are deeply embedded,
  keep the adapter as a thin type-mapping barrel (acceptable long-term).
  Delete the original local implementation code from `governed-resource.ts`.
- **Acceptance**: Local `GovernedResourceBase` implementation deleted (~80 LOC).
  Either: (a) all imports point to canonical + adapter is deleted, or
  (b) adapter reduced to pure type re-exports (<30 LOC).
  `governed-resource.ts` contains only imports/re-exports, no business logic.
- **Effort**: M

#### T5.7: Run Full Test Suite
- **Description**: Run `npm test` from `app/` directory. All 2374+ tests must pass.
- **Acceptance**: All tests green. Zero regressions. No type errors in any
  of the 5 migrated files or their test companions.
- **Effort**: S

---

## Sprint 6: Chain-Bound Hash Version-Aware Verification (P3)

**Global ID**: 121
**Goal**: Implement version-aware hash verification so existing audit chains
remain valid (legacy algorithm) while new entries use the canonical algorithm.
This is a data integrity migration — correctness is non-negotiable.

**Branch**: `feature/hounfour-v830-canonical-migration`
**Resolves**: T2.5 (DEFERRED), P3 from migration roadmap
**Blast Radius**: 2 files (`audit-trail-store.ts`, `audit-trail-store.test.ts`)

### Context

Dixie's local `computeChainBoundHash` uses a double-hash strategy: content hash
via `computeAuditEntryHash`, then chain-binding via a synthetic entry. Hounfour's
canonical uses simple `sha256(contentHash:previousHash)` concatenation. These
produce **different hashes for identical inputs** — swapping in-place would
invalidate every existing audit chain entry.

The solution is version-aware verification using `CONTRACT_VERSION` in the
hash domain tag. Entries with version ≤9.x.x use the legacy algorithm;
entries with version ≥10.0.0 use canonical. The `verifyIntegrity()` method
dispatches based on version extracted from the domain tag.

This is structurally identical to TLS cipher suite negotiation — both sides
advertise capabilities, verify with the algorithm that was used to create.

### Tasks

#### T6.1: Write ADR-006 — Chain-Bound Hash Migration Strategy [DONE]
- **Description**: Create `docs/adr/006-chain-bound-hash-migration.md` documenting:
  - Why in-place swap is unsafe (different algorithms, chain invalidation)
  - Version-aware verification design (dispatch on CONTRACT_VERSION)
  - Legacy preservation guarantee (existing chains always verifiable)
  - Forward compatibility (new chains use canonical, cross-service verifiable)
  - TLS cipher suite negotiation parallel
- **Acceptance**: ADR follows existing format. Algorithm difference documented
  with concrete hash output examples showing divergence.
- **Effort**: M

#### T6.2: Preserve Legacy Algorithm as `computeChainBoundHash_v9` [DONE]
- **Description**: Rename the existing local `computeChainBoundHash` to
  `computeChainBoundHash_v9` in `audit-trail-store.ts`. Mark it as
  `@deprecated` with migration note. This preserves the exact algorithm
  for verifying existing chain entries while making room for the canonical.
- **Acceptance**: Function renamed. All existing callers updated. Existing
  tests pass unchanged (same algorithm, different function name).
- **Effort**: S

#### T6.3: Add CONTRACT_VERSION to Hash Domain Tags [DONE]
- **Description**: Update the `appendEntry()` method in `AuditTrailStore` to
  include `CONTRACT_VERSION: '10.0.0'` in the hash domain tag for new entries.
  Import and use canonical `computeChainBoundHash` from hounfour for new
  entries. Existing entries (without CONTRACT_VERSION or with ≤9.x.x) continue
  using the legacy `computeChainBoundHash_v9`.
- **Acceptance**: New entries have `CONTRACT_VERSION` in domain tag and use
  canonical hash algorithm. Existing entries unmodified.
- **Effort**: M

#### T6.4: Version-Aware `verifyIntegrity()` Dispatch [DONE]
- **Description**: Update `verifyIntegrity()` to extract `CONTRACT_VERSION`
  from each entry's `hash_domain_tag`. Dispatch to the correct algorithm:
  - No version or ≤9.x.x → `computeChainBoundHash_v9` (legacy)
  - ≥10.0.0 → canonical `computeChainBoundHash` from hounfour
  A chain may contain entries from both eras — each entry is verified with
  the algorithm that created it.
- **Acceptance**: `verifyIntegrity()` passes for:
  - Pure legacy chains (all v9)
  - Pure canonical chains (all v10)
  - Mixed chains (v9 entries followed by v10 entries)
  - Chain with transition point (last v9 entry → first v10 entry)
- **Effort**: L

#### T6.5: Cross-Version Verification Tests [DONE]
- **Description**: Create comprehensive test suite for version-aware verification.
  Test cases must include:
  - Legacy chain (pre-migration data)
  - Canonical chain (post-migration data)
  - Mixed chain with transition boundary
  - Tampered entry detection (both algorithms)
  - Missing CONTRACT_VERSION defaults to legacy
  - Invalid CONTRACT_VERSION handling
- **Acceptance**: Test file with ≥12 test cases covering all scenarios.
  100% of verification paths covered.
- **Effort**: L

#### T6.6: Run Full Test Suite [DONE]
- **Description**: Run `npm test` from `app/` directory. All 2374+ tests must pass.
- **Acceptance**: All tests green. No chain verification regressions.
  Existing audit trail integration tests pass without modification
  (they use legacy algorithm, which is preserved).
- **Effort**: S

---

## Sprint 7: Advisory Lock Canonical Swap & Cross-Repo Coordination (P4)

**Global ID**: 122
**Goal**: Swap advisory lock computation to canonical algorithm. File
hounfour upstream issue for configurable ramp direction. Finalize
cross-repo coordination and update ecosystem tracking.

**Branch**: `feature/hounfour-v830-canonical-migration`
**Resolves**: P4 from migration roadmap
**Blast Radius**: 1 file (`app/src/db/migrate.ts` — `computeLockId` at line 27)

### Context

The advisory lock swap is the simplest migration technically — replace SHA-256→31-bit
with FNV-1a 32-bit signed. But it requires deployment coordination: lock IDs change,
so old and new instances use different hash spaces. During a rolling deploy, an old
instance holding a legacy lock won't conflict with a new instance's canonical lock.
This is actually SAFE for advisory locks (they prevent concurrent migrations, and
only one migration runs at a time), but the change should be deliberate.

Blue-green deploy via Route 53 weighted routing on Armitage Ring ensures atomic
cutover. Post-deploy verification: run migration with `--dry-run` to confirm
lock acquisition succeeds.

### Tasks

#### T7.1: Replace `computeLockId` with Canonical `computeAdvisoryLockKey`
- **Description**: In `app/src/db/migrate.ts`, replace the local `computeLockId`
  function (SHA-256→31-bit unsigned) with hounfour's canonical
  `computeAdvisoryLockKey` (FNV-1a 32-bit signed). Import from
  `@0xhoneyjar/loa-hounfour/commons/advisory-lock-key`.
  Delete the local `computeLockId` function and the `crypto` import.
- **Acceptance**: `migrate.ts` uses canonical lock key computation.
  `computeLockId` function deleted. `crypto` import removed (if no other
  usage). Migration still acquires advisory lock successfully.
- **Effort**: S

#### T7.2: Advisory Lock Migration Tests
- **Description**: Add/update tests for migration advisory lock behavior.
  Verify that `computeAdvisoryLockKey('dixie')` returns a valid 32-bit signed
  integer. Verify that `pg_advisory_lock()` accepts the canonical key.
  Document the old→new lock ID mapping for operational awareness.
- **Acceptance**: Test verifies canonical lock key for 'dixie' input.
  Migration test (or dry-run) confirms lock acquisition.
  Comment in code documents the lock ID change.
- **Effort**: S

#### T7.3: File Hounfour Upstream Issue — Configurable Ramp Direction
- **Description**: Create issue on `0xHoneyJar/loa-hounfour` proposing
  `rampDirection: 'ascending' | 'descending'` config field for
  `computeDampenedScore`. Include ecosystem context: Dixie uses ascending
  (conservative-first), Finn may prefer descending (responsive-first for
  model routing). Reference bridge deep review analysis and ADR-005.
- **Acceptance**: Issue created on hounfour repo with clear proposal,
  API design sketch, ecosystem justification, and backward compatibility note.
- **Effort**: S

#### T7.4: Update Cross-Repo Coordination Checklist
- **Description**: Update PR #64 (or new PR) with the completed migration
  status. Check off completed items in the cross-repo coordination checklist.
  Update dixie #63 with migration completion status. Cross-reference all
  tracking issues (dixie + hounfour).
- **Acceptance**: All tracking issues cross-referenced. PR description
  includes per-sprint migration summary. Checklist reflects actual state.
- **Effort**: S

#### T7.5: Run Full Test Suite
- **Description**: Run `npm test` from `app/` directory. All 2374+ tests must pass.
- **Acceptance**: All tests green. Complete migration verified.
- **Effort**: S

---

## Summary

| Sprint | Label | Tasks | Effort | Status |
|--------|-------|-------|--------|--------|
| 1 | Finn Docker Rebuild | 6 | ~30min operational | ✅ COMPLETED |
| 2 | Dixie Hounfour v8.3.0 Upgrade | 8 | ~2h code change | ✅ COMPLETED |
| 3 | Bridge Iter 1 — validateAuditTimestamp | 4 | ~1h code change | ✅ COMPLETED |
| 4 | Alpha Ramp ADR & Dampened Score Migration (P1) | 7 | ~4h code + ADR | PENDING |
| 5 | GovernedResourceBase Canonical Migration (P2) | 7 | ~6h code + tests | PENDING |
| 6 | Chain-Bound Hash Version-Aware Verification (P3) | 6 | ~6h code + ADR | PENDING |
| 7 | Advisory Lock Swap & Cross-Repo Coordination (P4) | 5 | ~2h code + issues | PENDING |

**Risk Register**:

| Risk | Impact | Probability | Sprint | Mitigation |
|------|--------|-------------|--------|------------|
| Alpha ramp switch causes score volatility | MEDIUM | MEDIUM | 4 | Shadow comparison tests; configurable wrapper defaults to current behavior |
| GovernedResourceBase adapter leaks abstraction | MEDIUM | LOW | 5 | Incremental migration (simplest → complex); adapter can remain as thin barrel |
| Chain hash version dispatch has edge cases | HIGH | LOW | 6 | Comprehensive cross-version test suite; legacy algorithm preserved unchanged |
| Advisory lock ID change during rolling deploy | LOW | LOW | 7 | Advisory locks are single-writer; blue-green deploy for atomic cutover |
| Hounfour rejects ramp direction proposal | LOW | LOW | 7 | Dixie's configurable wrapper works regardless; just won't be canonical |

**Dependency Graph**:
```
Sprint 4 (P1: Dampened Score) ──→ Sprint 5 (P2: GovernedResource)
                                         ↓
                              Sprint 6 (P3: Chain Hash)
                                         ↓
                              Sprint 7 (P4: Advisory Lock + Finalization)
```

Sprint 4 should complete first (smallest behavioral change, validates the pattern).
Sprint 5 depends on Sprint 4 completing to reduce the governance surface area.
Sprint 6 is independent of Sprint 5 but sequenced after for focus.
Sprint 7 bundles the simplest code change with cross-repo coordination.

**Cross-References**:
- Bridge deep review: PR #64 comment (2026-02-28)
- Migration roadmap: PR #64 comment (2026-02-28)
- Existing ADRs: `docs/adr/001-*` through `004-*`
- Finn hounfour upgrade: loa-finn#113
- Freeside hounfour upgrade: loa-freeside#108
