# Sprint Plan: Dixie Phase 2 — Knowledge Architecture & Oracle Self-Knowledge

**Version**: 2.4.0
**Date**: 2026-02-22
**Cycle**: cycle-002 (Deep Review — "What I'd Build Next" proposals + Horizon unaddressed findings)
**Source**: Deep Bridgebuilder Meditation (PR #4 comment 3938429415), Horizon Review (iter 1), Field Report #42
**Sprints**: 2 (Sprint 16-17 / Global 35-36)

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

**What this plan builds** (Sprints 16-17, Global 35-36):
- Corpus metadata extracted into dedicated service (horizon2-low-1)
- Corpus event log — structured mutation history (deep-review build-next-2)
- Oracle self-knowledge endpoint — metacognition (deep-review build-next-5)
- Token budget resolution (horizon2-info-1)
- Knowledge tests reframed as contract tests (horizon2-reframe-1)
- Automated drift detection pipeline (deep-review build-next-3)
- Consumer-driven corpus contracts (deep-review build-next-1)
- Corpus diff utility (deep-review build-next-2 extension)

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

## Architectural Thread

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
