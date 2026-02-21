# Sprint Plan: Dixie Phase 2 — Knowledge Architecture & Oracle Self-Knowledge

**Version**: 3.0.0
**Date**: 2026-02-22
**Cycle**: cycle-002 (Deep Architectural Meditation — Epistemic Sovereignty Proposals)
**Source**: Deep Bridgebuilder Meditation (PR #4 comment 3938508997), Horizon Review, Bridge deeparch (2 iterations)
**Sprints**: 6 (Sprint 16-21 / Global 35-40)

---

> *"The gap between 'version counter' and 'event-sourced history' is small in implementation but enormous in capability."* — Bridgebuilder horizon2-speculation-1

## Context

Bridge review converged at 1.0 (flatline) across the Horizon iteration. All findings addressed. The deep architectural meditation surfaced 5 concrete "build next" proposals and the Horizon review left 1 LOW + 1 INFO + 1 REFRAME unaddressed. This sprint plan translates those forward-looking proposals into infrastructure.

**What's already built** (Sprints 14-15, Global 33-34):
- Corpus versioning (`corpus_version` in sources.json v2)
- 15 knowledge health tests (freshness, terminology, cross-reference conservation)
- Health endpoint with corpus metadata
- Enriched agent `/knowledge` endpoint
- Bidirectional freshness markers (`<!-- upstream-source -->`)
- Knowledge coverage report script

**What this plan builds** (Sprints 16-18, Global 35-37):
- Corpus metadata extracted into dedicated service (horizon2-low-1)
- Corpus event log — structured mutation history (deep-review build-next-2)
- Oracle self-knowledge endpoint — metacognition (deep-review build-next-5)
- Token budget resolution (horizon2-info-1)
- Knowledge tests reframed as contract tests (horizon2-reframe-1)
- Automated drift detection pipeline (deep-review build-next-3)
- Consumer-driven corpus contracts (deep-review build-next-1)
- Corpus diff utility (deep-review build-next-2 extension)
- Startup cache warming + deterministic drift testing (bridge convergence)

**What Sprints 19-21 build** (Global 38-40 — Deep Meditation Proposals):
- Adaptive retrieval — freshness-aware source weighting + disclaimers (meditation §VII.1)
- Resource governance generalization — `ResourceGovernor<T>` pattern (meditation §VII.2)
- Communitarian knowledge governance — conviction-gated priority voting (meditation §VII.3)

**Architectural theme**: The Billing-Knowledge Isomorphism. Both the financial ledger and the knowledge corpus are ledgers of value. Sprint 16 builds the event-sourced write model; Sprint 17 builds the reconciliation loop. Together they give the Oracle the same capabilities for knowledge that git gives to code: diff, rollback, audit trail.

---

## Sprint 16: Corpus Service Architecture + Oracle Self-Knowledge

**Global ID**: 35
**Scope**: MEDIUM (6 tasks)
**Focus**: Extract corpus metadata into proper service, add event sourcing foundation, build Oracle metacognition
**Source findings**: horizon2-low-1, horizon2-info-1, horizon2-reframe-1, deep-review build-next-2, build-next-5

### Task 16.1: Extract corpus-meta into dedicated service (horizon2-low-1 — ARCHITECTURE)

**Files**: `app/src/services/corpus-meta.ts` (new), `app/src/routes/health.ts`, `app/src/routes/agent.ts`
**Fix**: Move `getCorpusMeta()` logic from `health.ts` into a proper `CorpusMeta` service class in `services/corpus-meta.ts`. The service should:
- Accept configurable `cacheTtlMs` in constructor (default 60_000)
- Expose `getMeta(nowOverride?: Date)` method returning corpus metadata
- Expose `invalidateCache()` for testing and post-mutation cache clearing
- Export singleton instance for shared use

Update `health.ts` to import from the new service (remove inline `cachedCorpusMeta` + `getCorpusMeta`). Update `agent.ts` to import from the new service instead of `health.ts`.

**Pattern**: Same shape as `conviction-resolver.ts` and `ticket-store.ts` — service class with constructor options.

**Acceptance Criteria**:
- [ ] `app/src/services/corpus-meta.ts` exists with `CorpusMeta` class
- [ ] `health.ts` no longer has inline corpus cache logic — imports from corpus-meta service
- [ ] `agent.ts` imports from corpus-meta service (not health.ts)
- [ ] Configurable TTL accepted in constructor
- [ ] `invalidateCache()` method available
- [ ] All existing tests pass unchanged (no behavior change, only extraction)
- [ ] 3 new tests: configurable TTL respected, cache invalidation works, singleton exports correctly

### Task 16.2: Corpus event log — structured mutation history (deep-review build-next-2 — ARCHITECTURE)

**Files**: `knowledge/corpus-events.json` (new), `app/src/services/corpus-meta.ts` (extend), `app/tests/unit/corpus-events.test.ts` (new)
**Fix**: Create `knowledge/corpus-events.json` — an append-only log of corpus mutations. Each event is a structured record:

```json
{
  "events": [
    {
      "seq": 1,
      "type": "initial_release",
      "timestamp": "2026-02-22T00:00:00Z",
      "detail": "arrakis→freeside migration, 16 files updated, schema v2, corpus_version 1",
      "author": "bridge-20260222-horizon",
      "files_affected": 16,
      "corpus_version_after": 1
    }
  ]
}
```

Event types: `initial_release`, `add_source`, `update_source`, `remove_source`, `deprecate_term`, `rename_term`, `schema_upgrade`, `freshness_run`, `drift_fix`.

Extend `CorpusMeta` service to load and validate the event log alongside sources.json. Add `getEventLog()` method returning all events. Add `getLatestEvent()` returning most recent mutation.

**The CHANGELOG.md becomes the human-readable projection of this machine-readable event log** — matching the billing CQRS pattern where the write model (events) and read model (CHANGELOG) are separate.

**Acceptance Criteria**:
- [ ] `knowledge/corpus-events.json` exists with initial release event
- [ ] Event schema includes: seq, type, timestamp, detail, author, files_affected, corpus_version_after
- [ ] `CorpusMeta.getEventLog()` returns parsed events
- [ ] `CorpusMeta.getLatestEvent()` returns most recent event
- [ ] Event seq numbers are monotonically increasing
- [ ] 4 new tests: event log loads, latest event correct, seq ordering validated, event schema validated

### Task 16.3: Oracle self-knowledge endpoint — metacognition (deep-review build-next-5 — FEATURE)

**Files**: `app/src/routes/agent.ts`, `app/src/services/corpus-meta.ts` (extend), `app/tests/unit/agent-api.test.ts`
**Fix**: Add `GET /self-knowledge` endpoint to the agent API. This enables the Oracle to answer: "How fresh is your knowledge?" "When was your last update?" "What topics might be stale?"

Response shape:
```typescript
interface SelfKnowledgeResponse {
  corpus_version: number;
  last_mutation: {
    type: string;
    timestamp: string;
    detail: string;
  };
  freshness: {
    healthy: number;
    stale: number;
    total: number;
    staleSources: string[]; // IDs of stale sources
  };
  coverage: {
    repos_with_code_reality: string[];
    repos_missing_code_reality: string[];
    total_sources: number;
    sources_by_tag: Record<string, number>;
  };
  token_utilization: {
    budget: number;
    estimated_actual: number;
    utilization_percent: number;
  };
  confidence: string; // "high" if 0 stale, "medium" if <3 stale, "low" if >=3 stale
}
```

Auth: TBA + architect tier (same as `/knowledge`).

Extend `CorpusMeta` service with `getSelfKnowledge()` method that computes coverage, token utilization, and confidence from sources.json and corpus-events.json.

**Acceptance Criteria**:
- [ ] `GET /self-knowledge` returns SelfKnowledgeResponse
- [ ] `staleSources` lists IDs of any sources past max_age_days
- [ ] `coverage.repos_with_code_reality` computed from source files
- [ ] `token_utilization` computed from actual file sizes vs budget
- [ ] `confidence` derived from staleness: "high" (0 stale), "medium" (1-2 stale), "low" (3+ stale)
- [ ] TBA + architect tier auth enforced (same as `/knowledge`)
- [ ] 4 new tests: full response shape, confidence levels, coverage computation, auth enforcement

### Task 16.4: Token budget resolution (horizon2-info-1 — CONFIGURATION)

**Files**: `knowledge/sources.json`, `knowledge/CHANGELOG.md`, `knowledge/corpus-events.json`
**Fix**: The coverage report shows 43,664 actual tokens vs 30,000 budget (145% utilization). This needs resolution. Two options:

**Option A (Recommended)**: Raise `default_budget_tokens` to 50,000. The budget represents "what should exist in the corpus" — a soft cap for planning, not a hard context window limit. The Oracle's retrieval/ranking selects a subset per query. Document the distinction between budget (total corpus) and context window (per-query subset).

**Option B**: Trim lower-priority sources to fit 30,000. This sacrifices knowledge depth.

Implement Option A: update `default_budget_tokens` from 30,000 to 50,000. Increment `corpus_version` to 2. Add event to corpus-events.json. Update CHANGELOG.md.

**Acceptance Criteria**:
- [ ] `default_budget_tokens` updated to 50,000
- [ ] `corpus_version` incremented to 2
- [ ] Corpus event logged: type `schema_upgrade`, detail explaining budget vs context window distinction
- [ ] CHANGELOG.md updated with v2 entry
- [ ] Knowledge coverage report shows <100% utilization

### Task 16.5: Knowledge tests as contract tests (horizon2-reframe-1 — TESTING)

**Files**: `app/tests/unit/knowledge-health.test.ts`, `app/tests/unit/knowledge-contracts.test.ts` (new)
**Fix**: Refactor the knowledge health tests into explicitly named contract tests. The existing tests are already contracts — they just don't name themselves as such.

Create `knowledge-contracts.test.ts` with:
1. **Producer contracts** (what the corpus promises): freshness, terminology, cross-reference conservation — move from knowledge-health.test.ts
2. **Consumer contracts** (what the Oracle runtime needs): min 3 required sources, min 1 code-reality per active repo, glossary terms for all protocol terms (new)
3. **Contract report output**: After all contract tests run, produce a summary to stdout showing contract status

Keep `knowledge-health.test.ts` for structural tests (schema, file existence, YAML frontmatter) — these are infrastructure, not contracts.

**Acceptance Criteria**:
- [ ] `knowledge-contracts.test.ts` exists with producer and consumer contract sections
- [ ] Producer contracts: freshness, terminology, conservation (moved from knowledge-health.test.ts)
- [ ] Consumer contracts: min required sources, code-reality coverage, glossary completeness (new)
- [ ] `knowledge-health.test.ts` retains structural tests only
- [ ] All tests pass (total count preserved — restructure, not addition)
- [ ] Contract test output includes summary with PASS/FAIL per contract

### Task 16.6: Update knowledge CHANGELOG + corpus event log for Sprint 16

**Files**: `knowledge/CHANGELOG.md`, `knowledge/corpus-events.json`
**Fix**: Add Sprint 16 changes to CHANGELOG (corpus service extraction, event log, self-knowledge endpoint, budget resolution, contract tests). Add corresponding events to corpus-events.json.

**Acceptance Criteria**:
- [ ] CHANGELOG.md has v2 entry documenting Sprint 16 changes
- [ ] corpus-events.json has events for each Sprint 16 mutation
- [ ] Event seq numbers continue from previous entries

---

## Sprint 17: Knowledge Drift Detection + Consumer Contracts

**Global ID**: 36
**Scope**: MEDIUM (5 tasks)
**Focus**: Automated drift detection pipeline, consumer-driven corpus contracts, corpus diff utility
**Source findings**: deep-review build-next-1 (consumer contracts), build-next-3 (drift detection), horizon2-speculation-2 (GitOps trigger)

### Task 17.1: Automated drift detection script (deep-review build-next-3 + horizon2-speculation-2 — AUTOMATION)

**Files**: `scripts/knowledge-drift.sh` (new), `app/tests/unit/knowledge-contracts.test.ts` (extend)
**Fix**: Create `scripts/knowledge-drift.sh` — "ArgoCD for knowledge." The script:

1. Parse all `<!-- upstream-source -->` markers from `knowledge/sources/*.md`
2. Extract: repo, branch, last-synced date
3. For each file with a marker, compute drift as days since last-synced
4. Report per-file drift score and overall drift summary
5. Exit 0 if all files within threshold, exit 1 if any exceed drift threshold (default: 30 days)

```bash
Usage: ./scripts/knowledge-drift.sh [--threshold DAYS] [--json]
```

Also add a test in knowledge-contracts.test.ts that validates all upstream-source markers have dates within threshold — making drift a CI-enforceable contract.

**Acceptance Criteria**:
- [ ] `scripts/knowledge-drift.sh` parses upstream-source markers from all code-reality files
- [ ] Reports per-file: repo, branch, last-synced, drift days, status (ok/stale)
- [ ] Configurable threshold via `--threshold` flag (default 30 days)
- [ ] `--json` flag produces machine-readable output
- [ ] Exit code 0 if all within threshold, 1 if any exceed
- [ ] Contract test validates markers parse correctly and dates are within bounds
- [ ] 2 new tests: drift computation correct, threshold enforcement works

### Task 17.2: Consumer-driven corpus contract declarations (deep-review build-next-1 — ARCHITECTURE)

**Files**: `knowledge/contracts/oracle-requirements.json` (new), `app/tests/unit/knowledge-contracts.test.ts` (extend)
**Fix**: Create a formal consumer contract declaration — what the Oracle runtime requires from the corpus. This is the Pact-style bilateral contract: producers (corpus authors) meet the consumer (Oracle runtime) requirements.

```json
{
  "consumer": "oracle-runtime",
  "version": 1,
  "requirements": {
    "minimum_sources": {
      "total": 15,
      "required_tags": {
        "core": 3,
        "technical": 5,
        "philosophical": 2
      }
    },
    "code_reality_coverage": {
      "required_repos": ["loa-finn", "loa-freeside", "loa-hounfour", "loa-dixie"],
      "pattern": "code-reality-{repo}.md"
    },
    "glossary_requirements": {
      "minimum_terms": 20,
      "required_terms": ["hounfour", "freeside", "loa-finn", "beauvoir", "x402", "conviction", "oracle", "dixie"]
    },
    "freshness": {
      "max_stale_sources": 2,
      "max_age_days_override": null
    },
    "token_budget": {
      "minimum_budget": 30000,
      "maximum_budget": 100000
    }
  }
}
```

Add consumer contract validation tests that read the declaration and verify the corpus meets all requirements. These tests complete the bilateral contract pattern: producer tests (Sprint 16.5) verify what the corpus promises; consumer tests (this task) verify what the runtime needs.

**Acceptance Criteria**:
- [ ] `knowledge/contracts/oracle-requirements.json` exists with formal consumer requirements
- [ ] Consumer contract covers: min sources, tag distribution, code-reality coverage, glossary completeness, freshness bounds, token budget
- [ ] Contract validation tests read oracle-requirements.json and verify against sources.json
- [ ] Tests produce clear error messages when requirements are unmet
- [ ] 5 new tests: total sources met, tag distribution met, code-reality coverage met, glossary requirements met, freshness bounds met

### Task 17.3: Corpus diff utility (deep-review build-next-2 extension — TOOLING)

**Files**: `scripts/corpus-diff.sh` (new)
**Fix**: Create `scripts/corpus-diff.sh` — enables answering "what changed between these two deployments?" The script:

1. Compare current `knowledge/sources.json` against a reference (default: `HEAD~1`, or specified commit/tag)
2. Report: sources added, sources removed, sources with changed `last_updated`, `corpus_version` delta
3. Compare `knowledge/corpus-events.json` to show event log entries since the reference
4. Output as structured text or JSON

```bash
Usage: ./scripts/corpus-diff.sh [--ref COMMIT] [--json]
  --ref: Git ref to compare against (default: HEAD~1)
  --json: Machine-readable output
```

This is the knowledge equivalent of `git log --stat` — a quick summary of what changed in the knowledge layer.

**Acceptance Criteria**:
- [ ] `scripts/corpus-diff.sh` compares current corpus against git ref
- [ ] Reports: added sources, removed sources, updated sources, version delta
- [ ] Reports new events from corpus-events.json since ref
- [ ] `--ref` flag accepts any git ref (commit, tag, branch)
- [ ] `--json` flag produces machine-readable output
- [ ] Exit 0 always (informational, not a gate)

### Task 17.4: File upstream issues for multi-model validation + Oracle metacognition (CROSS-REPO)

**Cross-repo surfaces**:
- [ ] **loa-finn**: "Oracle Metacognition: Self-Knowledge API Contract" — document the self-knowledge endpoint's response shape as an API contract that loa-finn's Oracle inference can use for meta-responses ("How current is your knowledge?" → structured answer from self-knowledge data)
- [ ] **loa (framework)**: "Knowledge Drift Detection: CI Integration Pattern" — propose `knowledge-drift.sh` as a Loa framework pattern for any project using the knowledge corpus, reference the ArgoCD reconciliation-loop parallel

### Task 17.5: Update CHANGELOG + corpus events + PROCESS docs (DOCUMENTATION)

**Files**: `knowledge/CHANGELOG.md`, `knowledge/corpus-events.json`, `grimoires/loa/a2a/sprint-36/reviewer.md`
**Fix**: Document Sprint 17 changes in CHANGELOG (drift detection, consumer contracts, corpus diff). Add events to corpus-events.json. Increment `corpus_version` to 3.

**Acceptance Criteria**:
- [ ] CHANGELOG.md has v3 entry documenting Sprint 17 changes
- [ ] corpus-events.json has events for Sprint 17 mutations
- [ ] `corpus_version` incremented to 3 in sources.json

---

## Verification

- [ ] All tests passing (~520+ expected: 505 existing + ~15 new)
- [ ] `CorpusMeta` service extracted and used by health.ts + agent.ts
- [ ] `knowledge/corpus-events.json` event log with complete mutation history
- [ ] Agent `/self-knowledge` endpoint returns metacognition response
- [ ] Token budget resolved (50,000 — below 100% utilization)
- [ ] Knowledge tests restructured as producer + consumer contracts
- [ ] `scripts/knowledge-drift.sh` detects upstream drift
- [ ] `knowledge/contracts/oracle-requirements.json` defines consumer requirements
- [ ] `scripts/corpus-diff.sh` shows corpus changes between commits
- [ ] Cross-repo issues filed (loa-finn, loa)
- [ ] CHANGELOG.md + corpus-events.json updated through v3

## File Change Summary

| File | Tasks | Changes |
|------|-------|---------|
| `app/src/services/corpus-meta.ts` | 16.1, 16.2, 16.3 | New service — extracted + event log + self-knowledge |
| `app/src/routes/health.ts` | 16.1 | Remove inline corpus cache, import from corpus-meta |
| `app/src/routes/agent.ts` | 16.1, 16.3 | Import from corpus-meta, add /self-knowledge endpoint |
| `knowledge/sources.json` | 16.4, 17.5 | Budget 50k, corpus_version 2→3 |
| `knowledge/corpus-events.json` | 16.2, 16.4, 16.6, 17.5 | New — structured event log |
| `knowledge/CHANGELOG.md` | 16.4, 16.6, 17.5 | v2 + v3 entries |
| `knowledge/contracts/oracle-requirements.json` | 17.2 | New — consumer contract declaration |
| `app/tests/unit/knowledge-contracts.test.ts` | 16.5, 17.1, 17.2 | New — producer + consumer contract tests |
| `app/tests/unit/knowledge-health.test.ts` | 16.5 | Retain structural tests, move contracts |
| `app/tests/unit/corpus-events.test.ts` | 16.2 | New — event log validation |
| `app/tests/unit/agent-api.test.ts` | 16.3 | 4 new tests for /self-knowledge |
| `app/tests/unit/corpus-meta.test.ts` | 16.1 | New — service tests |
| `scripts/knowledge-drift.sh` | 17.1 | New — drift detection pipeline |
| `scripts/corpus-diff.sh` | 17.3 | New — corpus diff utility |

---

## Sprint 18: Bridge Convergence — LOW Findings + Determinism (Bridge Iter 2)

**Global ID**: 37
**Scope**: SMALL (3 tasks)
**Focus**: Address 2 LOW findings and 1 INFO finding from Bridge Iteration 1 (convergence 0.95 → 1.0)
**Source findings**: deeparch1-low-1 (sync I/O warm-cache), deeparch1-low-2 (token estimation docs), deeparch1-info-1 (drift date determinism)

### Task 18.1: Add startup cache warm + document sync I/O assumption (deeparch1-low-1 — PERFORMANCE)

**Files**: `app/src/services/corpus-meta.ts`, `app/tests/unit/corpus-meta.test.ts`
**Fix**: Add `warmCache()` method to `CorpusMeta` class that pre-loads both `sourcesConfig` and `meta` caches. Call this from the module-level singleton initialization path so the first request never blocks. Add a JSDoc comment on `loadConfig()` documenting the assumption: "Synchronous read is intentional — <1ms for small JSON files. Cache warm-up at startup eliminates thundering-herd risk on first request."

**Acceptance Criteria**:
- [ ] `warmCache()` method on `CorpusMeta` class
- [ ] Singleton `corpusMeta` calls `warmCache()` at construction
- [ ] JSDoc on `loadConfig()` documents sync I/O assumption
- [ ] 2 new tests: warmCache populates cache, subsequent getMeta uses cache without I/O

### Task 18.2: Document token estimation approximation ratio (deeparch1-low-2 — CORRECTNESS)

**Files**: `app/src/services/corpus-meta.ts`
**Fix**: Add JSDoc comment on the `Math.ceil(content.length / 4)` line in `getSelfKnowledge()` documenting:
1. The 4:1 char-to-token ratio is the standard approximation (used by OpenAI's pricing estimator)
2. Over-counts for code blocks (tokens are often multi-character)
3. Under-counts for CJK content
4. `TOKEN_ESTIMATION_RATIO` named constant for future calibration

**Acceptance Criteria**:
- [ ] `TOKEN_ESTIMATION_RATIO` constant declared (value 4)
- [ ] JSDoc on token estimation explaining the approximation
- [ ] Constant used in `getSelfKnowledge()` instead of magic number
- [ ] No behavior change — documentation only + named constant

### Task 18.3: Add --date flag to drift detection for determinism (deeparch1-info-1 — TESTING)

**Files**: `scripts/knowledge-drift.sh`
**Fix**: Add a `--date YYYY-MM-DD` flag that overrides `TODAY` (the system date). This enables deterministic testing and contracts. Default behavior unchanged (uses `date -u +%Y-%m-%d`).

**Acceptance Criteria**:
- [ ] `--date YYYY-MM-DD` flag accepted by knowledge-drift.sh
- [ ] When provided, overrides system date for drift computation
- [ ] Help text updated to document new flag
- [ ] Default behavior unchanged (system date when no flag)

---

## Verification (Sprint 18)

- [ ] All ~538 tests passing (536 existing + 2 new)
- [ ] `corpusMeta.warmCache()` called at startup
- [ ] Token estimation uses named constant
- [ ] `knowledge-drift.sh --date 2026-02-22 --json` produces deterministic output

---

## Sprint 19: Adaptive Retrieval from Self-Knowledge

**Global ID**: 38
**Scope**: MEDIUM (5 tasks)
**Focus**: The Oracle uses its own metacognition to improve response quality — freshness-weighted source ranking, confidence disclaimers, adaptive routing
**Source**: Deep Bridgebuilder Meditation §VII.1 (PR #4 comment 3938508997)

> *"An agent that can assess the quality of its own knowledge before acting on it isn't just a query proxy — it's an epistemically sovereign system."* — Bridgebuilder, Autonomy vs Sovereignty

### Task 19.1: Source freshness weights in CorpusMeta (ARCHITECTURE)

**Files**: `app/src/services/corpus-meta.ts`, `app/tests/unit/corpus-meta.test.ts`
**Description**: Add `getSourceWeights()` method that computes per-source freshness weight from self-knowledge. Fresh sources get weight 1.0; stale sources degrade linearly by days-over-limit (floor 0.1). Returns a `Map<string, SourceWeight>` with source ID → `{ weight, ageRatio, staleDays }`.

**Implementation**:
```typescript
export interface SourceWeight {
  readonly sourceId: string;
  readonly weight: number;      // 1.0 (fresh) → 0.1 (very stale)
  readonly ageRatio: number;    // days_elapsed / max_age_days
  readonly staleDays: number;   // 0 if fresh, >0 if past max_age_days
}

getSourceWeights(nowOverride?: Date): Map<string, SourceWeight>
```

Weight formula: `max(0.1, 1.0 - (staleDays / max_age_days))` — linear degradation capped at 10%.

**Pattern**: Same caching strategy as `getMeta()` — computed on demand, cached with TTL.

**Acceptance Criteria**:
- [ ] `SourceWeight` interface exported from corpus-meta.ts
- [ ] `getSourceWeights()` method on `CorpusMeta` class
- [ ] Fresh sources return weight 1.0
- [ ] Sources 1x past max_age return weight ~0.5
- [ ] Sources 2x+ past max_age floor at 0.1
- [ ] 3 new tests: all fresh → all 1.0, mixed → correct weights, very stale → floor 0.1

### Task 19.2: FreshnessDisclaimer type and generator (INFRASTRUCTURE)

**Files**: `app/src/services/freshness-disclaimer.ts` (new), `app/tests/unit/freshness-disclaimer.test.ts` (new)
**Description**: Create a utility that generates freshness disclaimers from self-knowledge data. When confidence is 'low' or 'medium', produces a human-readable disclaimer identifying which knowledge domains may be stale. Used by query handlers to enrich responses.

**Implementation**:
```typescript
export interface FreshnessDisclaimer {
  readonly shouldDisclaim: boolean;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly message: string | null;
  readonly staleDomains: readonly string[];
}

export function generateDisclaimer(selfKnowledge: SelfKnowledgeResponse): FreshnessDisclaimer
```

Disclaimer rules:
- confidence 'high' → `{ shouldDisclaim: false, message: null }`
- confidence 'medium' → `{ shouldDisclaim: true, message: "Some knowledge sources may be outdated: ..." }`
- confidence 'low' → `{ shouldDisclaim: true, message: "Knowledge freshness is degraded. The following domains may be stale: ..." }`

**Pattern**: Pure function, no side effects. Maps stale source IDs to human-readable domain names via the `tags` field in sources.json.

**Acceptance Criteria**:
- [ ] `FreshnessDisclaimer` interface
- [ ] `generateDisclaimer()` pure function
- [ ] High confidence → no disclaimer
- [ ] Medium confidence → warning with stale source IDs
- [ ] Low confidence → strong disclaimer with stale domains
- [ ] 3 new tests covering each confidence level

### Task 19.3: Enrich AgentQueryResponse with freshness metadata (API)

**Files**: `app/src/types/agent-api.ts`, `app/src/routes/agent.ts`
**Description**: Add optional `freshness` field to `AgentQueryResponse` and populate it in the query handler. Also add `X-Knowledge-Confidence` response header.

**Implementation**:
Add to `AgentQueryResponse`:
```typescript
/** Knowledge freshness metadata (Sprint 19: Adaptive Retrieval) */
readonly freshness?: {
  readonly confidence: 'high' | 'medium' | 'low';
  readonly disclaimer: string | null;
  readonly staleSourceCount: number;
};
```

In the POST `/query` handler (after finn response), compute freshness:
```typescript
const selfKnowledge = corpusMeta.getSelfKnowledge();
const disclaimer = selfKnowledge ? generateDisclaimer(selfKnowledge) : null;
// Add to response object
// Set X-Knowledge-Confidence header
```

**Acceptance Criteria**:
- [ ] `freshness` field added to `AgentQueryResponse` (optional)
- [ ] POST `/query` populates freshness metadata
- [ ] `X-Knowledge-Confidence` header set on every agent query response
- [ ] Existing tests unbroken (field is optional)
- [ ] 2 new tests: response includes confidence level, header is set

### Task 19.4: GET /self-knowledge includes source weights (API)

**Files**: `app/src/routes/agent.ts`, `app/src/services/corpus-meta.ts`
**Description**: Extend the existing `GET /self-knowledge` endpoint to include the per-source weight breakdown. This gives consuming agents visibility into which knowledge domains the Oracle is most/least confident about.

Add to `SelfKnowledgeResponse`:
```typescript
/** Per-source freshness weights — enables consumers to assess domain reliability */
source_weights?: ReadonlyArray<{
  sourceId: string;
  weight: number;
  tags: readonly string[];
}>;
```

In `getSelfKnowledge()`, populate from `getSourceWeights()`, including each source's tags for domain identification.

**Acceptance Criteria**:
- [ ] `source_weights` field in `SelfKnowledgeResponse`
- [ ] `getSelfKnowledge()` populates weights with source tags
- [ ] GET `/self-knowledge` response includes weight array
- [ ] Existing self-knowledge tests pass (field is optional)
- [ ] 2 new tests: weights present in response, tags match sources.json

### Task 19.5: Adaptive query routing on low confidence (INTELLIGENCE)

**Files**: `app/src/routes/agent.ts`
**Description**: When knowledge confidence is 'low', the agent query handler should add a system-level instruction to the finn request asking the model to explicitly hedge and cite uncertainty. This is NOT filtering or blocking — it's enriching the prompt with metacognitive context so the LLM can reason about reliability.

In POST `/query`, before the finnClient.request call:
```typescript
const selfKnowledge = corpusMeta.getSelfKnowledge();
let systemNote: string | undefined;
if (selfKnowledge && selfKnowledge.confidence === 'low') {
  const staleList = selfKnowledge.freshness.staleSources.join(', ');
  systemNote = `Note: Knowledge freshness is degraded. Sources ${staleList} may be outdated. Hedge appropriately and flag uncertainty in your response.`;
}
```

Pass `systemNote` as an additional field in the finn request body (finn ignores unknown fields gracefully).

**Acceptance Criteria**:
- [ ] Low confidence triggers system note in finn request
- [ ] Medium/high confidence does NOT add system note
- [ ] System note includes specific stale source IDs
- [ ] 2 new tests: low confidence adds note, high confidence does not

---

## Verification (Sprint 19)

- [ ] All ~550 tests passing (~538 existing + ~12 new)
- [ ] `corpusMeta.getSourceWeights()` returns correct weights for all sources
- [ ] Agent query responses include `X-Knowledge-Confidence` header
- [ ] `GET /self-knowledge` includes `source_weights` array
- [ ] Low-confidence queries include hedging instruction to finn

---

## Sprint 20: Resource Governance Generalization — ResourceGovernor\<T\>

**Global ID**: 39
**Scope**: MEDIUM (5 tasks)
**Focus**: Extract the governance pattern from CorpusMeta into a generic `ResourceGovernor<T>` interface. The same event sourcing, self-knowledge, drift detection, and contract testing pattern applies to any scarce resource: model routing pools, soul memory quotas, autonomous operation budgets, schedule capacity.
**Source**: Deep Bridgebuilder Meditation §VII.2, Billing-Knowledge Isomorphism (Bridge 2 SPECULATION)

> *"CorpusMeta is really ResourceGovernor\<KnowledgeCorpus\>. The event log, the contracts, the drift detection, the self-knowledge — they're not knowledge-specific. They're governance-specific."* — Bridgebuilder, Deep Meditation §V

### Task 20.1: Define ResourceGovernor\<T\> interface (ARCHITECTURE)

**Files**: `app/src/services/resource-governor.ts` (new)
**Description**: Define the generic governance interface that captures the pattern CorpusMeta implements. The interface should be parameterized on the resource type.

```typescript
/** A single mutation event in the resource's history */
export interface GovernanceEvent<T = unknown> {
  readonly seq: number;
  readonly type: string;
  readonly timestamp: string;
  readonly detail: string;
  readonly author: string;
  readonly context?: T;
}

/** Resource health metadata */
export interface ResourceHealth {
  readonly status: 'healthy' | 'degraded';
  readonly totalItems: number;
  readonly staleItems: number;
  readonly version: number;
}

/** Self-knowledge about a governed resource */
export interface ResourceSelfKnowledge {
  readonly version: number;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly lastMutation: { type: string; timestamp: string; detail: string } | null;
  readonly healthSummary: ResourceHealth;
}

/** The generic resource governance interface */
export interface ResourceGovernor<TResource> {
  /** Get current health metadata */
  getHealth(nowOverride?: Date): ResourceHealth | null;
  /** Get self-knowledge about the governed resource */
  getSelfKnowledge(nowOverride?: Date): ResourceSelfKnowledge | null;
  /** Get the event log */
  getEventLog(): ReadonlyArray<GovernanceEvent>;
  /** Get the most recent event */
  getLatestEvent(): GovernanceEvent | null;
  /** Invalidate all caches */
  invalidateCache(): void;
  /** Pre-warm caches */
  warmCache(): void;
  /** Resource type identifier */
  readonly resourceType: string;
}
```

**Acceptance Criteria**:
- [ ] `resource-governor.ts` exists with all interfaces exported
- [ ] `GovernanceEvent<T>`, `ResourceHealth`, `ResourceSelfKnowledge`, `ResourceGovernor<T>` defined
- [ ] No runtime code — pure type definitions
- [ ] JSDoc on each interface documenting the governance pattern

### Task 20.2: CorpusMeta implements ResourceGovernor (REFACTOR)

**Files**: `app/src/services/corpus-meta.ts`
**Description**: Make `CorpusMeta` implement `ResourceGovernor<SourceEntry>` without breaking any existing API. This is an additive change — all existing methods remain, the class gains `implements ResourceGovernor<SourceEntry>`, and adds the `resourceType` property and the bridging methods `getHealth()` → delegates to `getMeta()`.

```typescript
import type { ResourceGovernor, ResourceHealth, ResourceSelfKnowledge, GovernanceEvent } from './resource-governor.js';

export class CorpusMeta implements ResourceGovernor<SourceEntry> {
  readonly resourceType = 'knowledge_corpus';

  getHealth(nowOverride?: Date): ResourceHealth | null {
    const meta = this.getMeta(nowOverride);
    if (!meta) return null;
    return {
      status: meta.status,
      totalItems: meta.sources,
      staleItems: meta.stale_sources,
      version: meta.corpus_version,
    };
  }
  // getSelfKnowledge already exists — adapt return type
  // getEventLog already exists — adapt return type
  // getLatestEvent already exists — adapt return type
  // invalidateCache already exists
  // warmCache already exists
}
```

**Critical**: Zero breaking changes. All existing callers (health.ts, agent.ts) continue to work. The `getMeta()` method remains unchanged — `getHealth()` is a new method that delegates to it.

**Acceptance Criteria**:
- [ ] `CorpusMeta` declares `implements ResourceGovernor<SourceEntry>`
- [ ] `resourceType` property returns `'knowledge_corpus'`
- [ ] `getHealth()` method delegates to `getMeta()` with type mapping
- [ ] All 538+ existing tests pass without modification
- [ ] 2 new tests: `getHealth()` returns correct shape, `resourceType` is correct

### Task 20.3: GovernorRegistry for cross-service discovery (INFRASTRUCTURE)

**Files**: `app/src/services/governor-registry.ts` (new), `app/tests/unit/governor-registry.test.ts` (new)
**Description**: Create a singleton registry that tracks all `ResourceGovernor` instances in the system. Enables a unified governance view — "what resources does this system govern, and what's their health?"

```typescript
export class GovernorRegistry {
  private readonly governors = new Map<string, ResourceGovernor<unknown>>();

  register(governor: ResourceGovernor<unknown>): void {
    if (this.governors.has(governor.resourceType)) {
      throw new Error(`Governor already registered for resource type: ${governor.resourceType}`);
    }
    this.governors.set(governor.resourceType, governor);
  }

  get(resourceType: string): ResourceGovernor<unknown> | undefined {
    return this.governors.get(resourceType);
  }

  getAll(): ReadonlyArray<{ resourceType: string; health: ResourceHealth | null }> {
    return [...this.governors.entries()].map(([type, gov]) => ({
      resourceType: type,
      health: gov.getHealth(),
    }));
  }

  clear(): void { this.governors.clear(); }
}

export const governorRegistry = new GovernorRegistry();
```

**Pattern**: Same singleton pattern as `corpusMeta`. Register during server startup.

**Acceptance Criteria**:
- [ ] `GovernorRegistry` class with register/get/getAll/clear
- [ ] Singleton `governorRegistry` exported
- [ ] Duplicate registration throws
- [ ] `getAll()` returns health snapshot for all governors
- [ ] 4 new tests: register, get, getAll, duplicate throws

### Task 20.4: GET /governance endpoint (API)

**Files**: `app/src/routes/health.ts`
**Description**: Add `GET /health/governance` endpoint that returns the health of all registered resource governors. This is the "system self-knowledge" endpoint — meta-metacognition.

```typescript
app.get('/governance', (c) => {
  const snapshot = governorRegistry.getAll();
  return c.json({
    governors: snapshot,
    totalResources: snapshot.length,
    degradedResources: snapshot.filter(g => g.health?.status === 'degraded').length,
    timestamp: new Date().toISOString(),
  });
});
```

**Acceptance Criteria**:
- [ ] `GET /health/governance` returns governor health snapshot
- [ ] Response includes `governors` array, `totalResources`, `degradedResources`
- [ ] At minimum, `knowledge_corpus` governor appears in the list
- [ ] 2 new tests: endpoint returns data, corpus governor present

### Task 20.5: Register CorpusMeta governor at startup (INTEGRATION)

**Files**: `app/src/server.ts`
**Description**: During server initialization, register the `corpusMeta` singleton with the `governorRegistry`. This connects the generic governance infrastructure to the concrete knowledge corpus governor.

In `createServer()`, after routes are created:
```typescript
import { governorRegistry } from './services/governor-registry.js';
import { corpusMeta } from './services/corpus-meta.js';

governorRegistry.register(corpusMeta);
```

**Acceptance Criteria**:
- [ ] `corpusMeta` registered in `governorRegistry` during startup
- [ ] `GET /health/governance` returns `knowledge_corpus` entry in integration tests
- [ ] No circular imports introduced
- [ ] 1 test: server creates governance endpoint with registered governors

---

## Verification (Sprint 20)

- [ ] All ~560 tests passing (~550 existing + ~10 new)
- [ ] `ResourceGovernor<T>` interface exported from `resource-governor.ts`
- [ ] `CorpusMeta implements ResourceGovernor<SourceEntry>` compiles
- [ ] `GET /health/governance` returns governor health snapshot
- [ ] All existing health/agent/self-knowledge tests unbroken

---

## Sprint 21: Communitarian Knowledge Governance — Conviction Voting

**Global ID**: 40
**Scope**: MEDIUM (5 tasks)
**Focus**: BGT conviction holders can vote on knowledge source priorities, creating a digital commons governed by Ostrom's principles. Higher-conviction wallets have proportionally more weight. Votes affect source ordering in self-knowledge and capabilities responses.
**Source**: Deep Bridgebuilder Meditation §VII.3, Ostrom's Commons Design Principles (Bridge 3 REFRAME)

> *"What happens when the community that uses the Oracle can also govern what it knows? The knowledge corpus becomes a commons — and commons need governance."* — Bridgebuilder, Deep Meditation §VI

### Task 21.1: KnowledgePriorityStore service (ARCHITECTURE)

**Files**: `app/src/services/knowledge-priority-store.ts` (new), `app/tests/unit/knowledge-priority-store.test.ts` (new)
**Description**: In-memory store (with serialization interface for future PostgreSQL backing) that tracks priority votes by wallet. Each vote is: wallet → sourceId → priority (1-5). The store computes aggregate priority scores with conviction-tier weighting.

```typescript
export interface PriorityVote {
  readonly wallet: string;
  readonly sourceId: string;
  readonly priority: number;  // 1 (low) to 5 (critical)
  readonly tier: ConvictionTier;
  readonly timestamp: string;
}

/** Tier weight multipliers — higher conviction = more governance weight */
const TIER_WEIGHTS: Record<ConvictionTier, number> = {
  observer: 0,         // Cannot vote
  participant: 1,
  builder: 3,
  architect: 10,
  sovereign: 25,
};

export class KnowledgePriorityStore {
  private votes = new Map<string, PriorityVote>(); // key: `${wallet}:${sourceId}`

  vote(v: PriorityVote): void;
  getVotes(sourceId: string): ReadonlyArray<PriorityVote>;
  getAggregatedPriorities(): ReadonlyArray<{ sourceId: string; score: number; voteCount: number }>;
  getVoterCount(): number;
  clear(): void;
}
```

Score formula: `sum(vote.priority * TIER_WEIGHTS[vote.tier])` per source, normalized.

**Acceptance Criteria**:
- [ ] `KnowledgePriorityStore` class with vote/getVotes/getAggregatedPriorities
- [ ] `TIER_WEIGHTS` map with observer=0 (cannot vote)
- [ ] Weighted aggregation: sovereign vote counts 25x participant
- [ ] Duplicate votes from same wallet+source overwrite (latest wins)
- [ ] 5 new tests: single vote, tier weighting, overwrite, aggregation, observer excluded

### Task 21.2: POST /knowledge/priorities/vote endpoint (API)

**Files**: `app/src/routes/agent.ts`
**Description**: Add conviction-gated voting endpoint. Requires participant+ tier (observers cannot vote — Ostrom Principle 3: collective-choice arrangements). Validates sourceId against known sources in CorpusMeta.

```typescript
app.post('/knowledge/priorities/vote', async (c) => {
  // TBA auth check
  // Conviction tier check (participant+)
  // Validate sourceId exists in corpus
  // Validate priority 1-5
  // Store vote
  // Return updated aggregate for that source
});
```

Request body: `{ sourceId: string, priority: number }`
Response: `{ sourceId, yourVote: number, aggregateScore: number, voteCount: number }`

**Acceptance Criteria**:
- [ ] POST `/knowledge/priorities/vote` endpoint
- [ ] Requires TBA auth + participant+ tier
- [ ] Observer tier returns 403 ("Participation required to vote on knowledge priorities")
- [ ] Invalid sourceId returns 400
- [ ] Priority outside 1-5 returns 400
- [ ] 4 new tests: success, observer blocked, invalid source, invalid priority

### Task 21.3: GET /knowledge/priorities endpoint (API)

**Files**: `app/src/routes/agent.ts`
**Description**: Public (TBA-authed) endpoint returning current aggregated knowledge priorities. Shows the democratic ranking of knowledge sources.

Response:
```typescript
{
  priorities: Array<{
    sourceId: string;
    score: number;
    voteCount: number;
    tags: string[];
  }>;
  totalVoters: number;
  lastUpdated: string;
}
```

Sorted by score descending. Includes source tags from CorpusMeta for domain identification.

**Acceptance Criteria**:
- [ ] GET `/knowledge/priorities` endpoint (TBA auth required)
- [ ] Returns aggregated priorities sorted by score descending
- [ ] Includes source tags from sources.json
- [ ] Empty state returns empty array (not error)
- [ ] 2 new tests: returns priorities, empty state works

### Task 21.4: Wire KnowledgePriorityStore into server (INTEGRATION)

**Files**: `app/src/server.ts`, `app/src/routes/agent.ts`
**Description**: Create and inject `KnowledgePriorityStore` during server initialization. Pass as dependency to agent routes. Register as a concern in the governor registry (using a simple adapter that reports vote counts as "health").

Update `AgentRouteDeps`:
```typescript
export interface AgentRouteDeps {
  finnClient: FinnClient;
  convictionResolver: ConvictionResolver;
  memoryStore: MemoryStore | null;
  rateLimits?: AgentRateLimitConfig;
  priorityStore: KnowledgePriorityStore;  // NEW
}
```

**Acceptance Criteria**:
- [ ] `KnowledgePriorityStore` instantiated in server.ts
- [ ] Passed to `createAgentRoutes()` via deps
- [ ] Agent route handlers use injected store (not module-level)
- [ ] Existing agent tests updated with mock store
- [ ] 1 test: server creates agent routes with priority store

### Task 21.5: Self-knowledge includes community governance data (ENRICHMENT)

**Files**: `app/src/services/corpus-meta.ts`, `app/src/routes/agent.ts`
**Description**: Extend the GET `/self-knowledge` response to include a `governance` section showing community priority data. This makes the Oracle aware not just of *its own* knowledge state but of *what the community values* about its knowledge.

Add to the self-knowledge endpoint response (not to `getSelfKnowledge()` directly, since it shouldn't depend on the priority store):
```typescript
// In the GET /self-knowledge handler:
const priorities = priorityStore.getAggregatedPriorities();
return c.json({
  ...selfKnowledge,
  governance: {
    communityPriorities: priorities.slice(0, 10), // top 10
    totalVoters: priorityStore.getVoterCount(),
    governanceModel: 'conviction-weighted-vote',
  },
});
```

**Acceptance Criteria**:
- [ ] GET `/self-knowledge` includes `governance` field
- [ ] `governance.communityPriorities` shows top 10 sources by score
- [ ] `governance.totalVoters` shows participation count
- [ ] `governance.governanceModel` is `'conviction-weighted-vote'`
- [ ] 2 new tests: governance data present, empty state handled

---

## Verification (Sprint 21)

- [ ] All ~575 tests passing (~560 existing + ~15 new)
- [ ] POST `/knowledge/priorities/vote` accepts votes from participant+ tier
- [ ] GET `/knowledge/priorities` returns conviction-weighted rankings
- [ ] GET `/self-knowledge` includes `governance` section
- [ ] Observer tier cannot vote (Ostrom Principle 3)
- [ ] Sovereign vote weights 25x participant vote

---

## File Change Summary (Sprints 19-21)

| File | Sprints | Changes |
|------|---------|---------|
| `app/src/services/corpus-meta.ts` | 19.1, 19.4, 20.2 | Source weights + ResourceGovernor impl |
| `app/src/services/freshness-disclaimer.ts` | 19.2 | NEW — disclaimer generator |
| `app/src/services/resource-governor.ts` | 20.1 | NEW — generic governance interface |
| `app/src/services/governor-registry.ts` | 20.3 | NEW — governance registry |
| `app/src/services/knowledge-priority-store.ts` | 21.1 | NEW — priority vote store |
| `app/src/types/agent-api.ts` | 19.3 | Freshness metadata in response |
| `app/src/routes/agent.ts` | 19.3, 19.5, 21.2, 21.3, 21.4, 21.5 | Adaptive query + voting endpoints |
| `app/src/routes/health.ts` | 20.4 | Governance health endpoint |
| `app/src/server.ts` | 20.5, 21.4 | Governor + priority store registration |
| `app/tests/unit/corpus-meta.test.ts` | 19.1, 19.4, 20.2 | Source weight + governor tests |
| `app/tests/unit/freshness-disclaimer.test.ts` | 19.2 | NEW — disclaimer tests |
| `app/tests/unit/governor-registry.test.ts` | 20.3 | NEW — registry tests |
| `app/tests/unit/knowledge-priority-store.test.ts` | 21.1 | NEW — priority store tests |
| `app/tests/unit/agent-api.test.ts` | 19.3, 19.5, 21.2, 21.3, 21.5 | Adaptive query + voting tests |

---

## Architectural Thread (Sprints 16-18)

This sprint pair completes the knowledge-as-product architecture by adding the three capabilities that distinguish a product from a collection of files:

1. **Audit trail** (Sprint 16: event log) — Who changed what, when, and why
2. **Quality contracts** (Sprint 16-17: producer + consumer contracts) — What the corpus promises AND what the runtime needs
3. **Reconciliation** (Sprint 17: drift detection + diff) — Is the corpus in sync with reality?

The parallel to the billing architecture (loa-freeside) is structural, not metaphorical:

| Billing | Knowledge (after Sprint 17) |
|---------|-----------------------------|
| `total_cost = sum(line_items)` | Consumer requirements met by producer |
| Lot invariant tests | Contract tests (producer + consumer) |
| BigInt micro-USD atomicity | Terminology consistency tests |
| Credit ledger CQRS | Event log (write) + CHANGELOG (read projection) |
| Settlement Protocol | Drift detection → reconciliation → update |
| Revenue governance versioning | `corpus_version` integer increment |
| x402 receipt verification | Upstream-source marker verification |

> *"The agent that combines deep understanding with economic agency — the one that doesn't just execute transactions but understands why they matter — is the convergence point. These sprints build the understanding advantage."* — Deep Bridgebuilder Review, Section II

---

## Architectural Thread (Sprints 19-21): From Self-Knowledge to Self-Governance

Sprints 16-18 gave the Oracle *metacognition* — the ability to report on its own knowledge state. Sprints 19-21 transform that metacognition into *agency* — the ability to act on what it knows about what it knows, and to let the community shape what it should know.

### The Ostrom Arc

This is the Ostrom design principles playing out across the full stack:

| Ostrom Principle | Sprint 19 (Adaptive) | Sprint 20 (Governor) | Sprint 21 (Communitarian) |
|------------------|---------------------|---------------------|--------------------------|
| 1. Defined boundaries | Source weights define knowledge reliability boundaries | `ResourceGovernor<T>` defines governance boundaries per resource type | Conviction tiers define participation boundaries |
| 2. Proportional costs/benefits | Stale sources pay cost (lower weight); fresh sources get benefit (higher weight) | Generic pattern reduces governance implementation cost across resource types | Vote weight proportional to conviction stake |
| 3. Collective-choice arrangements | — | — | Priority voting = collective choice over knowledge |
| 4. Monitoring | Self-knowledge monitors freshness | Governor registry monitors all resources | Vote counts + participation metrics |
| 5. Graduated sanctions | Linear weight degradation for staleness | Health status transitions (healthy → degraded) | Observer exclusion from voting |
| 7. Minimal recognition of rights | — | Governors have autonomy over their resource type | Each conviction tier has recognized voting rights |

### The FAANG Parallel

**Google's Spanner** achieved global consistency for distributed databases. The insight wasn't the algorithm — it was the *TrueTime API* that let Spanner know how confident it was in its own clock. When TrueTime uncertainty was high, Spanner waited. When it was low, Spanner committed immediately.

Sprint 19's adaptive retrieval is the same pattern applied to knowledge: when confidence is high, respond directly. When confidence is low, hedge. The Oracle's `confidence: 'high' | 'medium' | 'low'` is its TrueTime equivalent.

**Kubernetes RBAC + Custom Resources** showed that generic governance infrastructure (RBAC for access, CRD for resource types) enables an ecosystem of specialized governors (operators). Sprint 20's `ResourceGovernor<T>` + `GovernorRegistry` is the same architecture: a generic governance interface that any resource type can implement, with a registry that provides unified observability.

**Wikipedia's governance model** proved that community-governed knowledge can be more accurate than expert-curated knowledge at scale. Sprint 21's conviction-weighted voting doesn't replace expert curation — it augments it with community signal. The Oracle's knowledge corpus starts as expert-curated (the 20 source files) and gains community governance as a quality feedback loop.

> *"Sovereignty is not the ability to act — it's the ability to act wisely. An epistemically sovereign agent knows what it knows, knows what it doesn't know, and lets its community help it learn what it should know."* — Bridgebuilder, Deep Architectural Meditation §IV
