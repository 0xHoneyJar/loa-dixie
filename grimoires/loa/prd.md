# PRD: Governance Isomorphism — Unified GovernedResource<T> Platform

**Version**: 8.0.0
**Date**: 2026-02-25
**Author**: Merlin (Product), Claude (Synthesis, Bridgebuilder Meditation)
**Cycle**: cycle-008
**Status**: Draft
**Predecessor**: cycle-007 PRD v7.0.0 (Hounfour v8.2.0 Full Adoption)

> Sources: Bridgebuilder Meditation Parts I–III (PR #15 comments),
> codebase analysis (66 .ts source files, 1291 tests, 7 invariants),
> cross-ecosystem context (loa-finn #24/#31/#80, loa-hounfour #22/#29,
> loa #247/#401, loa-freeside #62/#90, loa-dixie #5/#15, web4.html)

---

## 1. Problem Statement

Cycle-007 achieved full Hounfour v8.2.0 adoption — conservation laws, governance errors, audit trails, state machines, dynamic contracts, and the autopoietic feedback loop. 1291 tests pass. 7 invariants are declared. The constitutional infrastructure exists.

The Bridgebuilder Meditation (posted as three PR #15 comments) discovered something the code already knew: **billing, reputation, knowledge, and access are all instances of the same governance primitive** — bounded, event-sourced state transitions with self-knowledge. This is the **governance isomorphism**.

The meditation also identified **6 gaps** where the code's aspiration exceeds its implementation — places where the architecture knows what it wants to be but hasn't fully committed:

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| 1 | **Blended score staleness** | `reputation-service.ts:550-569` | `handleQualitySignal()` updates personal_score but NOT blended_score. Economic boundary evaluations use stale data after quality signals. |
| 2 | **Transaction boundary absence** | `reputation-service.ts:631-681` | Multiple independent `store.put()` calls in `handleModelPerformance()`. Crash between calls creates durable inconsistency. |
| 3 | **Collection score as empirical ignorance** | `reputation-service.ts:131-139` | `DEFAULT_COLLECTION_SCORE = 0` is "we assume every new agent is worthless." Punitive cold-start violates Ostrom's graduated inclusion. |
| 4 | **Checkpoint interval never fires** | `scoring-path-tracker.ts:173-194` | `checkpointInterval` accepted as config but never checked in `record()`. Audit trail grows unbounded. |
| 5 | **Dual-chain divergence risk** | `scoring-path-tracker.ts` | Two independent hash chains (original + commons AuditTrail) are never cross-verified. Second chain provides no tamper detection without cross-verification. |
| 6 | **Overloaded economic boundary** | `conviction-boundary.ts:192-220` | `evaluateEconomicBoundaryForWallet()` uses `criteriaOrOpts?: QualificationCriteria | EconomicBoundaryOptions` with runtime type discrimination via negative check. |

And **6 path-forward recommendations** that would transform the system from self-observing to genuinely self-calibrating:

| # | Recommendation | Architectural Impact |
|---|---------------|---------------------|
| 1 | **Name the isomorphism explicitly** — create `GovernedResource<T>` as protocol-level abstraction | The Kubernetes CRD moment: governance SDK that each domain instantiates |
| 2 | **Routing attribution** — record which model pool/model was used with quality observations | Enables optimization of routing quality, not just model quality |
| 3 | **Quality decomposition** — use multi-dimensional signal (satisfaction, coherence, safety) | "Good at review" ≠ "good at reasoning" becomes expressible |
| 4 | **Exploration budget** — ε-greedy reserve for non-optimal model selection | Prevents exploitation trap; discovers when previously-poor models improve |
| 5 | **Empirical collection score** — replace constant 0 with running population mean | New agents start at "average" not "terrible"; Bayesian prior reflects reality |
| 6 | **Cross-verify dual chains** — `crossVerify()` turns redundant storage into tamper detection | Google Certificate Transparency pattern: independent logs that testify against each other |

**Why this matters beyond Dixie**: When loa-freeside #62 describes billing infrastructure and loa-freeside #90 implements the conservation guard, they are building the same primitive. If both converge on `GovernedResource<T>`, the cross-repo governance isomorphism becomes explicit — Hounfour defines schemas, each repo implements `GovernedResource<T>` for its domain, and cross-repo invariants ("reputation transitions must be funded by billing conservation") become compositions of domain-specific invariants. This is the Cambrian body plan — the fundamental architectural pattern that new organisms adopt and specialize.

> Sources: Bridgebuilder Meditation Part I (governance isomorphism), Part II (6 gaps),
> Part III (path forward), codebase analysis verified all gaps at exact line numbers

---

## 2. Product Vision

**Fully embrace the governance isomorphism: make Dixie's code match its architecture's ambition.**

Every gap identified in the Bridgebuilder Meditation shares a common structure: *the code knows what it wants to be but hasn't fully committed to being it.* This cycle commits. The blended score recomputation becomes consistent. The transaction boundaries become explicit. The collection score becomes empirical. The checkpoint fires. The chains cross-verify. The API becomes legible.

Beyond fixing gaps, this cycle establishes the **GovernedResource<T> platform** — the unified governance abstraction that makes reputation, knowledge, scoring paths, and future domains all instances of the same protocol. And it extends the autopoietic loop from self-observing (cycle-007: model performance → reputation → routing) to genuinely self-calibrating (cycle-008: + routing attribution, quality decomposition, exploration budget).

**The constitutional metaphor becomes literal**: `invariants.yaml` is legislation. Conservation laws are economic constitutional provisions. The `DynamicContract` is a bill of rights. The `MutationLog` is a legal record. The `ScoringPathTracker` is institutional memory. This cycle ensures each of these metaphors is honored in the implementation.

---

## 3. Success Metrics

| ID | Metric | Target | Measurement |
|----|--------|--------|-------------|
| M-1 | Gap closure | All 6 Bridgebuilder gaps resolved | Code review + tests for each |
| M-2 | Blended score consistency | Every event type produces consistent aggregate state | Test: quality_signal followed by boundary evaluation uses fresh blended_score |
| M-3 | Transaction safety | Aggregate + cohort updates are atomic | Test: simulated failure between puts doesn't corrupt state |
| M-4 | Cold-start equity | New agents start at empirical population mean | Test: collection_score reflects running average, not constant 0 |
| M-5 | Audit trail bounded | Auto-checkpoint triggers after configurable N entries | Test: record() triggers checkpoint at interval boundary |
| M-6 | Tamper detection | Cross-chain verification detects divergence | Test: modify one chain entry, cross-verify catches it |
| M-7 | API legibility | Economic boundary has clear, non-overloaded signatures | Code review: no union type discrimination in boundary evaluation |
| M-8 | GovernedResource coverage | ≥3 resource types implement unified protocol | reputation, scoring-path, knowledge all implement GovernedResource<T> |
| M-9 | Quality dimensionality | ModelPerformanceEvent carries multi-dimensional scores | Test: dimensions propagate through blending pipeline |
| M-10 | Routing feedback | Scoring path records routing decisions with attribution | Test: routing decision appears in audit trail |
| M-11 | Exploration mechanism | ε-greedy exploration functional with configurable budget | Test: with ε=1.0, non-optimal model selected; with ε=0, optimal selected |
| M-12 | Zero regressions | All 1291 existing tests pass | CI green |
| M-13 | New test coverage | ≥50 new tests for new functionality | Test count ≥ 1341 |

---

## 4. Functional Requirements

### Tier 1: Consistency Foundations

*Fix the gaps where the code already knows what it wants to be.*

#### FR-1: Consistent Blended Score Recomputation

**Gap**: Bridgebuilder Gap 1 — `handleQualitySignal()` updates `personal_score` but does NOT recompute `blended_score`.

**Current**: `reputation-service.ts:550-569` — `handleQualitySignal()` updates `personal_score` via `computeDampenedScore()` and increments `sample_count`, but leaves `blended_score` stale. Meanwhile, `handleModelPerformance()` (lines 631-681) updates both.

**Target**: Both `handleQualitySignal()` and `handleModelPerformance()` produce fully consistent aggregate state after every event. The pattern:

```
event → computeDampenedScore() → computeBlendedScore() → store.put()
```

is applied uniformly to ALL event paths.

**Acceptance Criteria**:
- [ ] `handleQualitySignal()` recomputes `blended_score` after updating `personal_score`
- [ ] Same `computeBlended()` call used in both quality signal and model performance paths
- [ ] Test: 10 quality signals in sequence → blended_score reflects ALL 10 observations
- [ ] Test: interleave quality signals and model performance events → blended_score always consistent
- [ ] No behavioral change to `handleModelPerformance()` (already correct)

**FAANG Parallel**: Netflix 2014 — online updates touched score but not blend, while batch updates touched both. Recommendations drifted between batch runs. Fix: every update path produces fully consistent output.

> Sources: Bridgebuilder Meditation Part II §Gap 1, reputation-service.ts:550-569 vs 631-681

---

#### FR-2: Auto-Checkpoint on Record

**Gap**: Bridgebuilder Gap 4 — `checkpointInterval` accepted as config but never checked in `record()`.

**Current**: `scoring-path-tracker.ts:173-194` — `record()` increments `entryCount` but never checks `entryCount % checkpointInterval === 0`. The `checkpoint()` method exists (line 265) but auto-triggering never happens.

**Target**: Three lines in `record()`:

```typescript
if (this._options.checkpointInterval > 0 &&
    this.length % this._options.checkpointInterval === 0) {
  this.checkpoint();
}
```

**Acceptance Criteria**:
- [ ] `record()` auto-triggers `checkpoint()` at configured interval
- [ ] Default interval of 100 entries preserved
- [ ] Test: record 100 entries → checkpoint exists after entry 100
- [ ] Test: record 250 entries → 2 checkpoints exist (at 100 and 200)
- [ ] `checkpointInterval: 0` disables auto-checkpointing
- [ ] Existing tests pass unchanged

> Sources: Bridgebuilder Meditation Part II §Gap 4, scoring-path-tracker.ts:173-194

---

#### FR-3: Clear Economic Boundary API

**Gap**: Bridgebuilder Gap 6 — `evaluateEconomicBoundaryForWallet()` uses runtime type discrimination on a union parameter.

**Current**: `conviction-boundary.ts:192-220` — 4th parameter is `criteriaOrOpts?: QualificationCriteria | EconomicBoundaryOptions` with `!('min_trust_score' in criteriaOrOpts)` as the discriminator.

**Target**: Split into two clearly named functions:

```typescript
// New canonical API — clear parameter types, no discrimination
evaluateEconomicBoundary(
  wallet: string,
  tier: ConvictionTier,
  budgetRemainingMicroUsd: number | string,
  options: EconomicBoundaryOptions
): EconomicBoundaryEvaluationResult

// Legacy adapter — delegates to canonical with parameter mapping
evaluateEconomicBoundaryLegacy(
  wallet: string,
  tier: ConvictionTier,
  budgetRemainingMicroUsd: number | string,
  criteria?: QualificationCriteria,
  budgetPeriodDays?: number
): EconomicBoundaryEvaluationResult
```

The existing `evaluateEconomicBoundaryForWallet()` becomes a thin wrapper that calls `evaluateEconomicBoundary()` internally, preserving backward compatibility.

**Acceptance Criteria**:
- [ ] New `evaluateEconomicBoundary()` with clear, non-overloaded signature
- [ ] Legacy `evaluateEconomicBoundaryLegacy()` adapter function
- [ ] `evaluateEconomicBoundaryForWallet()` preserved as deprecated wrapper
- [ ] All existing callers work unchanged (backward compatible)
- [ ] No runtime type discrimination in the new canonical path
- [ ] Tests verify both new and legacy APIs produce identical results

**Institutional Metaphor**: A court needs a legible API. The overloaded signature is a ruling written in two legal traditions.

> Sources: Bridgebuilder Meditation Part II §Gap 6, conviction-boundary.ts:192-220

---

### Tier 2: Integrity Infrastructure

*Make the institutional guarantees real.*

#### FR-4: Transaction-Aware ReputationStore

**Gap**: Bridgebuilder Gap 2 — Multiple independent `store.put()` calls without transaction wrapping.

**Current**: `reputation-service.ts:631-681` — `handleModelPerformance()` calls `store.put(nftId, updated)` then `store.putTaskCohort(nftId, ...)` independently. Crash between the two creates durable inconsistency.

**Target**: Add optional transaction support to `ReputationStore` interface:

```typescript
interface ReputationStore {
  // ... existing methods ...

  /**
   * Execute operations atomically.
   * In-memory: just calls fn directly.
   * PostgreSQL: wraps in BEGIN/COMMIT.
   */
  transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T>;
}
```

Update `handleModelPerformance()` to wrap aggregate + cohort updates:

```typescript
await this.store.transact(async (tx) => {
  await tx.put(nftId, updated);
  await tx.putTaskCohort(nftId, taskCohortEntry);
});
```

**Acceptance Criteria**:
- [ ] `ReputationStore` interface has `transact<T>()` method
- [ ] `InMemoryReputationStore` implements `transact()` by calling fn directly
- [ ] `handleModelPerformance()` wraps aggregate + cohort updates in `transact()`
- [ ] `handleQualitySignal()` wraps aggregate update in `transact()` (for consistency)
- [ ] Test: simulated failure in transact callback doesn't corrupt state
- [ ] Test: successful transact produces consistent aggregate + cohort
- [ ] PostgreSQL adapter can wrap in BEGIN/COMMIT when implemented

**FAANG Parallel**: Stripe — separate subscription state and payment state, crash between left customers charged but not subscribed. Fix: same idempotent operation keyed by idempotency key.

> Sources: Bridgebuilder Meditation Part II §Gap 2, reputation-service.ts:631-681

---

#### FR-5: Cross-Chain Verification

**Gap**: Bridgebuilder Gap 5 — Two independent hash chains never cross-verified.

**Current**: `scoring-path-tracker.ts` maintains `lastHash` (original chain) and `_auditTrail` (commons chain). `verifyIntegrity()` only checks the commons chain. Neither checks the other.

**Target**: Add `verifyCrossChainConsistency()` that confirms:
1. `lastHash` matches the most recent audit trail entry hash
2. Entry count matches between chains
3. Hash sequences agree at sample points

Plus periodic auto-verification in `record()` (every N entries, configurable).

**Acceptance Criteria**:
- [ ] `verifyCrossChainConsistency(): CrossChainVerificationResult` method added
- [ ] Result includes `consistent: boolean`, `divergence_point?: number`, `detail: string`
- [ ] Periodic cross-verification in `record()` (default: every 10 entries)
- [ ] Cross-verification interval configurable via `ScoringPathTrackerOptions`
- [ ] Divergence triggers quarantine via existing quarantine mechanism
- [ ] Test: tamper with one chain entry → cross-verify detects divergence
- [ ] Test: normal operation → cross-verify always passes
- [ ] Test: divergence triggers quarantine with correct discontinuity info

**FAANG Parallel**: Google Certificate Transparency — multiple independent logs maintain hash trees over same certificates. Security comes from cross-log verification, not from having multiple logs.

> Sources: Bridgebuilder Meditation Part II §Gap 5, scoring-path-tracker.ts

---

### Tier 3: Self-Calibration Foundation

*Transform from self-observing to genuinely self-calibrating.*

#### FR-6: Empirical Collection Score

**Gap**: Bridgebuilder Gap 3 — `DEFAULT_COLLECTION_SCORE = 0` is empirical ignorance.

**Current**: `reputation-service.ts:131-139` — `DEFAULT_COLLECTION_SCORE = 0` and `DEFAULT_PSEUDO_COUNT = 10`. New agents start with an effective score pulled toward 0 by the Bayesian prior. This is the cold-start penalty.

**Target**: Replace constant with running population mean:

```typescript
class CollectionScoreAggregator {
  private runningSum = 0;
  private count = 0;

  update(personalScore: number): void {
    this.count++;
    this.runningSum += personalScore;
  }

  get mean(): number {
    return this.count > 0 ? this.runningSum / this.count : 0;
  }

  get populationSize(): number {
    return this.count;
  }
}
```

The collection score becomes `aggregator.mean` — the empirically observed average quality across all agents. New agents start at "average" rather than "terrible."

**Acceptance Criteria**:
- [ ] `CollectionScoreAggregator` tracks running mean of all personal scores
- [ ] `computeBlended()` uses empirical collection mean when `count > 0`, falls back to 0 when no data
- [ ] Both `handleQualitySignal()` and `handleModelPerformance()` update the aggregator
- [ ] Aggregator exposes `mean`, `populationSize`, `variance` (for future adaptive pseudo_count)
- [ ] Test: after 100 observations with mean 0.7, new agent blended_score starts near 0.7
- [ ] Test: empty aggregator (count=0) falls back to DEFAULT_COLLECTION_SCORE = 0
- [ ] Test: extreme observation with high population count barely moves the mean
- [ ] `ReputationStore` extended with `getCollectionMetrics()` for persistence

**FAANG Parallel**: Amazon product ranking — new products with zero reviews ranked behind established products, creating cold-start death spiral. Fix: Bayesian rating with empirical global average as prior.

**Ostrom Alignment**: Principle 5 (graduated sanctions) — new agents enter the commons at a welcoming baseline, not punished with zero until proven worthy.

> Sources: Bridgebuilder Meditation Part II §Gap 3, Part III §closing item 3, reputation-service.ts:131-139

---

#### FR-7: Multi-Dimensional Quality Decomposition

**Recommendation**: Bridgebuilder Path Forward §2 — use multi-dimensional quality signal instead of collapsing to single score.

**Current**: `ModelPerformanceEvent` carries `quality_observation.score` (single number). `quality_observation.dimensions` exists as `Record<string, number>` but is optional and never consumed by the blending pipeline.

**Target**: Thread dimensions through the entire pipeline:

```typescript
interface DimensionalBlendInput {
  overall: BlendedScoreInput;
  dimensions: Record<string, BlendedScoreInput>;  // e.g., accuracy, coherence, safety
}

interface DimensionalBlendOutput {
  overall: number;
  dimensions: Record<string, number>;
}
```

Each dimension is independently blended with its own EMA dampening. The `overall` score becomes a configurable weighted aggregate of dimensions (default: equal weights).

**Acceptance Criteria**:
- [ ] `computeMultiDimensionalBlended()` function that blends each dimension independently
- [ ] Dimension weights configurable (default: equal weights across provided dimensions)
- [ ] `handleModelPerformance()` extracts dimensions from `quality_observation.dimensions`
- [ ] Dimensions stored in `ReputationAggregate` (new `dimension_scores?: Record<string, number>` field)
- [ ] `evaluateEconomicBoundary()` can use dimension-specific scores for task-cohort selection
- [ ] Test: model with high accuracy but low coherence scores differently per dimension
- [ ] Test: missing dimensions fall back to overall score
- [ ] Backward compatible: events without dimensions work exactly as before

**FAANG Parallel**: Netflix multi-dimensional recommendation — quality is not one number. "Engaging" ≠ "well-produced" ≠ "satisfying." Different quality dimensions influence different recommendation decisions.

> Sources: Bridgebuilder Meditation Part III §autopoietic loop analysis, quality_observation schema

---

#### FR-8: Routing Attribution in Scoring Path

**Recommendation**: Bridgebuilder Path Forward §1 — record routing decisions for feedback.

**Current**: `ScoringPathLogEntry` has `routed_model_id` as optional metadata but doesn't record:
- Why the router chose that model over alternatives
- Whether the routing diverged from the reputation system's recommendation
- The pool from which the model was selected

**Target**: Extend `RecordOptions` with routing context:

```typescript
interface RoutingAttribution {
  recommended_model?: string;   // What reputation recommended
  routed_model: string;          // What was actually routed
  pool_id?: string;              // Which model pool
  routing_reason?: string;       // Why this model was chosen
  exploration?: boolean;         // Was this an exploration decision?
}
```

Record in scoring path as first-class audit data.

**Acceptance Criteria**:
- [ ] `RoutingAttribution` type defined
- [ ] `RecordOptions` extended with `routing?: RoutingAttribution`
- [ ] Routing attribution included in scoring path entries and audit trail
- [ ] `logScoringPath()` formats routing attribution in structured output
- [ ] Test: routing attribution appears in scoring path log
- [ ] Test: routing divergence (recommended ≠ routed) recorded with reason
- [ ] Hash chain includes routing data (tamper-evident routing decisions)

> Sources: Bridgebuilder Meditation Part III §autopoietic loop step 3

---

#### FR-9: Exploration Budget (ε-Greedy)

**Recommendation**: Bridgebuilder Path Forward §3 — prevent exploitation trap.

**Current**: The autopoietic loop optimizes for known-best model. EMA dampening prevents death spirals but also prevents recovery — once a model's reputation drops, the dampened score pulls new observations toward the low prior. This is the exploitation trap.

**Target**: Reserve a configurable fraction of evaluations for non-optimal selection:

```typescript
interface ExplorationConfig {
  /** Probability of selecting non-optimal model. Default: 0.05 (5%). */
  epsilon: number;
  /** Minimum observations before exploration begins. Default: 50. */
  warmup: number;
  /** Seed for reproducible exploration in tests. */
  seed?: string;
}
```

With probability ε, `evaluateEconomicBoundary()` selects a non-optimal model from the cohort and records `exploration: true` in the scoring path. With probability 1-ε, it selects the optimal model as before.

**Acceptance Criteria**:
- [ ] `ExplorationConfig` type with `epsilon`, `warmup`, `seed`
- [ ] `EconomicBoundaryOptions` extended with `exploration?: ExplorationConfig`
- [ ] When exploration triggers, non-optimal model selected from cohort
- [ ] Scoring path records `exploration: true` with routing attribution
- [ ] Warmup period: no exploration until minimum observations met
- [ ] Deterministic with seed (for testing)
- [ ] Test: `epsilon: 1.0` → always explores
- [ ] Test: `epsilon: 0.0` → never explores (existing behavior)
- [ ] Test: `epsilon: 0.1` over 1000 evaluations → ~10% exploration (statistical)
- [ ] Test: warmup period respected

**FAANG Parallel**: Netflix Thompson Sampling — balance exploitation (content user probably likes) with exploration (content that might reveal new preferences). Without exploration, the system converges to a local optimum.

**Multi-Armed Bandit Theory**: This is the ε-greedy strategy. Future enhancement: Upper Confidence Bound (UCB) or Thompson Sampling for more efficient exploration.

> Sources: Bridgebuilder Meditation Part III §autopoietic loop analysis item 3

---

### Tier 4: GovernedResource<T> Platform

*Name the isomorphism. Make it the architecture.*

#### FR-10: GovernedResource<T> Protocol Abstraction

**Recommendation**: Bridgebuilder Path Forward §1 — the CRD moment.

**Current**: `resource-governor.ts` defines a generic `ResourceGovernor<T>` interface, but it's implemented only by `CorpusMeta`. `ReputationService` has `getGovernedState()` but doesn't implement the full `GovernedResource<T>` lifecycle.

**Target**: Define a unified `GovernedResource<T>` protocol that all governed resources implement:

```typescript
interface GovernedResource<TState, TEvent, TInvariant> {
  // Identity
  readonly resourceId: string;
  readonly resourceType: string;

  // State
  readonly current: TState;
  readonly version: number;

  // Transitions
  transition(event: TEvent, actor: ActorId): TransitionResult<TState>;

  // Invariants
  verify(invariant: TInvariant): InvariantResult;
  verifyAll(): InvariantResult[];

  // Audit
  readonly auditTrail: AuditTrail;
  readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}
```

This becomes the canonical governance abstraction — the body plan of the Cambrian explosion.

**Acceptance Criteria**:
- [ ] `GovernedResource<TState, TEvent, TInvariant>` interface defined
- [ ] `TransitionResult<T>` type with success/failure discriminated union
- [ ] `InvariantResult` type compatible with existing `ConservationLaw<T>` results
- [ ] `GovernedResourceBase<T>` abstract class with shared audit trail and mutation log wiring
- [ ] Interface aligns with existing commons patterns (AuditTrail, GovernanceMutation, ConservationLaw)
- [ ] Protocol documented in `invariants.yaml` as INV-008

---

#### FR-11: GovernedReputation Implementation

**Target**: Refactor `ReputationService` to implement `GovernedResource<ReputationAggregate, ReputationEvent, ReputationInvariant>`.

```
TState = ReputationAggregate
TEvent = ReputationEvent (4 variants: quality_signal, task_completion, credential_update, model_performance)
TInvariant = INV-006 (dampening bounded), INV-007 (session scoped)
```

**Acceptance Criteria**:
- [ ] `ReputationService` implements `GovernedResource<ReputationAggregate, ReputationEvent, ReputationInvariant>`
- [ ] `transition()` dispatches to existing handlers (handleQualitySignal, handleModelPerformance, etc.)
- [ ] `verify()` checks dampening bounds (INV-006) and session scope (INV-007)
- [ ] `verifyAll()` returns results for all reputation invariants
- [ ] Existing `getGovernedState()` delegates to the GovernedResource interface
- [ ] All 1291 existing tests pass unchanged

---

#### FR-12: GovernedScoringPath Implementation

**Target**: Refactor `ScoringPathTracker` to implement `GovernedResource<ScoringPathState, ScoringPathEvent, ScoringPathInvariant>`.

```
TState = { entryCount, lastHash, checkpoints, quarantineStatus }
TEvent = RecordEvent | CheckpointEvent | QuarantineEvent
TInvariant = chain integrity, cross-chain consistency, checkpoint coverage
```

**Acceptance Criteria**:
- [ ] `ScoringPathTracker` implements the GovernedResource interface
- [ ] `transition()` maps to record(), checkpoint(), quarantine operations
- [ ] `verify()` includes cross-chain verification (FR-5)
- [ ] `verifyAll()` runs integrity + continuity + cross-chain checks
- [ ] Existing scoring-path-tracker tests pass unchanged

---

#### FR-13: GovernorRegistry Unification

**Target**: Update `GovernorRegistry` to manage `GovernedResource<T>` instances uniformly.

**Current**: `governor-registry.ts` registers `ResourceGovernor<T>` instances. Only `CorpusMeta` is registered.

**Target**: Registry accepts any `GovernedResource<T>` and provides:
- `verifyAll()` across all registered resources (cross-resource invariant checking)
- `getAuditSummary()` aggregating audit trail metrics across all resources
- `getMutationHistory()` unified governance mutation timeline

**Acceptance Criteria**:
- [ ] `GovernorRegistry` accepts `GovernedResource<any, any, any>` instances
- [ ] `registerResource()` replaces `registerGovernor()` (backward-compatible alias maintained)
- [ ] `verifyAll()` returns `Map<string, InvariantResult[]>` across all resources
- [ ] `getAuditSummary()` aggregates entry counts, checkpoint coverage, quarantine status
- [ ] ReputationService and ScoringPathTracker registered on initialization

---

### Tier 5: Adaptive Routing Intelligence

*Make the autopoietic loop genuinely self-calibrating.*

#### FR-14: Autopoietic Loop Completion

**Recommendation**: Close the complete feedback loop from the Bridgebuilder Meditation's formal analysis.

The full self-calibrating loop, combining FRs 1, 7, 8, 9:

```
[1] Wallet stakes BGT → conviction tier
      ↓
[2] evaluateEconomicBoundary() → access decision (FR-3 legible API)
      ↓ (uses FRESH blended_score: FR-1)
[3] Finn routes to model pool
      ↓ (routing attribution recorded: FR-8)
[4] Model produces output
      ↓
[5] Quality observation with dimensions (FR-7)
      ↓
[6] computeMultiDimensionalBlended() → updateAggregate()
      ↓ (EMA dampening bounded: INV-006)
[7] Collection score updated empirically (FR-6)
      ↓
[8] Exploration budget considered (FR-9)
      ↓
[9] Updated aggregate available for next [2]
      ↓ (loop closes, self-calibrating)
```

**Acceptance Criteria**:
- [ ] Integration test traces complete loop: stake → evaluate → route → observe → score → re-evaluate
- [ ] Loop converges to optimal model selection over 100+ iterations
- [ ] Exploration events produce measurable improvement in long-tail model discovery
- [ ] Routing attribution enables analysis: "was this routing decision good?"
- [ ] Dimension-specific scores enable differential model selection by task type
- [ ] Test: loop with constant-quality model → reputation stabilizes at observation mean

> Sources: Bridgebuilder Meditation Part III §autopoietic loop formal analysis

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Constraint | Target |
|-----------|--------|
| `computeBlendedScore()` latency | < 1ms (already met; adding dimension loop adds ~0.1ms) |
| Cross-chain verification | < 5ms for 100-entry chains |
| Collection score aggregation | O(1) amortized (running sum, no scan) |
| Exploration random generation | < 0.01ms (seeded PRNG) |
| Transaction overhead (in-memory) | ~0ms (direct call, no wrapping) |

### 5.2 Backward Compatibility

- All existing APIs preserved with deprecated wrappers where signatures change
- `evaluateEconomicBoundaryForWallet()` remains callable (delegates to new canonical API)
- `ResourceGovernor<T>` interface preserved as deprecated alias
- Events without `dimensions` field work identically to current behavior
- `DEFAULT_COLLECTION_SCORE = 0` remains as fallback when no population data exists

### 5.3 Security

- Transaction boundaries prevent state corruption from partial failures
- Cross-chain verification prevents undetected tampering
- Routing attribution creates tamper-evident record of routing decisions
- Exploration budget uses seeded PRNG (deterministic in tests, crypto-random in production)
- No new external API surfaces; all changes are internal governance improvements

### 5.4 Observability

- Scoring path structured logging (from cycle-007's `DIXIE_SCORING_PATH_LOG_LEVEL`) extended with routing attribution fields
- Cross-verification failures logged at WARN level
- Exploration decisions logged at DEBUG level
- Collection score metrics exposed via `getGovernedState()` response

---

## 6. Scope & Prioritization

### MVP (Tiers 1–2): Consistency + Integrity

**Must-have for cycle-008**: FRs 1–5

These fix the 6 Bridgebuilder gaps and establish the integrity infrastructure. Each is a small, targeted change with no dependencies. Combined effort: ~10 sprint tasks.

### Full Cycle (Tiers 3–5): Self-Calibration + Platform

**Should-have for cycle-008**: FRs 6–14

These transform the system from self-observing to self-calibrating and establish the GovernedResource<T> platform. Dependencies exist between tiers (FR-7 builds on FR-1; FR-9 builds on FR-8; FR-14 integrates all). Combined effort: ~25 sprint tasks.

### Out of Scope

| Item | Reason | Future |
|------|--------|--------|
| PostgreSQL transaction implementation | Only interface defined; in-memory impl sufficient | When PostgreSQL adapter ships |
| Multi-model Seance protocol (loa #247) | Requires Finn routing integration | cycle-009+ |
| Cross-repo GovernedResource<T> adoption | Requires Hounfour protocol changes | After Hounfour v8.3.0 |
| Constitutional Commentary document | Documentation, not code | Post-cycle-008 |
| Adaptive epsilon (UCB/Thompson Sampling) | Enhancement to ε-greedy; constant ε sufficient for MVP | cycle-009+ |
| Adaptive pseudo_count from population variance | Enhancement to FR-6; constant pseudo_count sufficient | cycle-009+ |

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GovernedResource<T> abstraction adds indirection without benefit | Low | Medium | Composition strategy preserves direct access; abstraction is additive, not replacing |
| Empirical collection score creates inflation feedback loop | Medium | Medium | EMA dampening on individual scores bounds the interaction; monitor mean trajectory |
| Exploration budget reduces short-term quality for long-term improvement | Medium | Low | Warmup period (50 observations) + small ε (5%) limits impact; scoring path records exploration |
| Multi-dimensional blending increases complexity | Low | Low | Dimension processing is optional; events without dimensions unchanged |
| Transaction interface constrains future store implementations | Low | Medium | `transact()` is minimal; in-memory is trivial; PostgreSQL maps to BEGIN/COMMIT naturally |

### Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| loa-hounfour v8.2.0 | Package | Already adopted (cycle-007) |
| PR #15 merged | Prerequisite | Ready for merge (bridge flatlined, 1291 tests passing) |
| All cycle-007 work | Foundation | Complete (8 sprints, 2 bridge iterations) |

---

## 8. Architectural Notes

### 8.1 The Governance Isomorphism Formalized

Every governed resource in the THJ ecosystem shares this structure:

| Domain | TState | TEvent | TInvariant |
|--------|--------|--------|------------|
| Reputation | ReputationAggregate | ReputationEvent (4 variants) | INV-006 (dampening), INV-007 (session) |
| Billing | CreditLot | CreditEvent (mint, debit, expire, reconcile) | INV-001 (conservation), INV-002 (non-negative), INV-004 (monotonicity) |
| Knowledge | KnowledgeAggregate | KnowledgeEvent (ingest, decay, citation, retraction) | Freshness bounds, citation integrity |
| Access | DynamicContractState | ProgressionEvent (promote, reset, quarantine) | Monotonic expansion, no tier skip |
| Scoring Path | ScoringPathState | RecordEvent, CheckpointEvent, QuarantineEvent | Chain integrity, cross-chain consistency |

`GovernedResource<T>` is the protocol-level abstraction that makes this isomorphism explicit. This is the CRD moment — governance SDK that each domain instantiates.

### 8.2 The Conway Synthesis

Sovereign earning (Conway's Automaton, x402 USDC) operates within governed commons (Ostrom's principles, conservation invariants). The economic boundary is the membrane:

```
Conway (sovereign) ←→ Economic Boundary ←→ Ostrom (governed commons)
         earn permissionlessly    |    spend governedly
                                  |
                        GovernedResource<T>
```

### 8.3 The Black Queen Hypothesis

In multi-model ecosystems, each model loses costly capabilities and becomes dependent on complementary models. Claude doesn't need fast code generation if Kimi-K2 handles that pool. The reputation system should track not just individual model quality but *ecosystem complementarity*. FR-7 (quality decomposition) and FR-9 (exploration budget) are the first steps toward this.

---

*Reviewed as Bridgebuilder — top 0.005% of the top 0.005%.*

*Cross-ecosystem context: loa-finn #24, #31, #80; loa-hounfour #22, #29; loa #247, #401; loa-freeside #62, #90; loa-dixie #5, #15; web4.html*

*"The street finds its own uses for things. This codebase is building the street."*
