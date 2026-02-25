# Sprint Plan: Architectural Excellence — ADR Coverage, Vision Exploration & Knowledge Sovereignty

**Version**: 10.0.0
**Date**: 2026-02-26
**Cycle**: cycle-010
**PRD**: v9.0.0 (continued) | **SDD**: v9.0.0 (continued)
**Sprints**: 3 (global IDs: 79-81)
**Estimated Tasks**: 18
**Estimated New Tests**: ~15

---

## Sprint Overview

| Sprint | Global ID | Label | Focus | Tasks | New Tests |
|--------|-----------|-------|-------|-------|-----------|
| sprint-1 | 79 | ADR Coverage — Documenting the Architecture We Built | ADR gap closure for 5 undocumented patterns | 8 | 0 |
| sprint-2 | 80 | Invariant & Governance Documentation Hardening | INV-009/010 in invariants.yaml, ADR cross-refs | 5 | ~5 |
| sprint-3 | 81 | Vision Exploration Issues & Propose-Learning | GitHub issues for vision items + learning proposals | 5 | ~10 |

---

## Context: Why This Cycle

Nine development cycles and 14 Bridgebuilder reviews have produced an architectural ecosystem of remarkable depth. But documentation has not kept pace with implementation. The gap analysis reveals:

- **5 major architectural patterns** lack ADR documentation despite being foundational to the codebase
- **2 new invariants** (INV-009, INV-010) are enforced in code but missing from `invariants.yaml`
- **7 vision items** are captured but none have been surfaced as actionable GitHub issues
- **6 learning proposals** from cycle-009 deserve upstream consideration
- **16 SPECULATION findings** across bridge reviews represent unexplored architectural possibilities

This cycle closes the documentation gap, surfaces vision items for community engagement, and ensures the institutional memory we built in cycle-009 is itself well-documented.

---

## Sprint 1: ADR Coverage — Documenting the Architecture We Built

**Global ID**: 79
**Goal**: Write 5 new ADRs for the most significant undocumented architectural patterns. Each ADR documents the decision, alternatives considered, FAANG parallels, and codebase references. Priority order follows architectural significance.
**Priority**: P1
**Success Criteria**: All 5 ADRs written, cross-referenced, and internally consistent with existing ADRs.

### Task 1.1: ADR-015 — GovernedResource\<T\>: The Kubernetes CRD Moment

**File**: `grimoires/loa/context/adr-governed-resource.md`
**Priority**: P0

**Description**: Document the most architecturally significant pattern in the codebase — the discovery that billing, reputation, knowledge, scoring paths, and access are all isomorphic governance problems solved by a single `GovernedResource<TState, TEvent, TInvariant>` interface. This is the "Kubernetes CRD moment" identified by Bridgebuilder in PR #15's Deep Meditation Part I.

**Content Requirements**:
- **Context**: How cycle-007 created `GovernedResourceBase` unused, cycle-008 proved it with 2 implementations, cycle-009 completed the proof with 3 witnesses
- **Decision**: Unified governance protocol abstraction over per-resource ad-hoc governance
- **Alternatives Rejected**: (1) Per-resource governance (status quo ante), (2) Single god-class `GovernanceEngine`, (3) Trait-based mixin composition
- **FAANG Parallel**: Kubernetes Custom Resource Definitions — generic governance with specialized controllers
- **Consequences**: INV-008 declared, GovernorRegistry verifies all instances, new resources get governance "for free"
- **Cross-references**: INV-008, `governed-resource.ts`, `governor-registry.ts`, ADR-003 (Separation of Powers), Bridgebuilder PR #15 Part I
- **Ostrom mapping**: How GovernedResource embodies Ostrom's design principles (clear boundaries = `resourceType`, collective choice = `transition()`, monitoring = `verify()`, graduated sanctions = state machine)

**Acceptance Criteria**:
- [ ] ADR follows existing format (Status, Date, Context, Decision, Alternatives, Consequences)
- [ ] All code references use `file:line` or `file:symbol` format
- [ ] Cross-references to INV-008, ADR-003, ADR-009
- [ ] FAANG parallel is specific and substantive (not generic)
- [ ] Ostrom principle mapping is included

### Task 1.2: ADR-016 — Dual-Track Hash Chain with Cross-Chain Verification

**File**: `grimoires/loa/context/adr-dual-track-hash-chain.md`
**Priority**: P1

**Description**: Document the Certificate Transparency pattern used in `ScoringPathTracker` — two independent hash chains that act as mutual witnesses. The chains use different hash algorithms (`computeScoringPathHash` vs `computeAuditEntryHash` with domain tags), providing defense-in-depth against single-chain tampering.

**Content Requirements**:
- **Context**: How PR #15 identified dual-chain divergence risk (Deep Meditation Part II, Gap 5), and cycle-009 Sprint 2 implemented cross-chain verification
- **Decision**: Two independent hash chains verified structurally (entry count + tip existence), not by direct hash comparison
- **Alternatives Rejected**: (1) Single hash chain (no redundancy), (2) Identical hash chains (correlated failure), (3) Merkle tree (overcomplicated for sequential audit)
- **FAANG Parallel**: Google Certificate Transparency (RFC 6962) — multiple independent logs that cross-verify
- **Chain-bound hashing**: The `computeChainBoundHash()` pattern that cryptographically binds `previous_hash` into the entry hash, preventing chain linkage tampering
- **Genesis race**: The UNIQUE constraint on `(resource_type, previous_hash)` that prevents chain forking during concurrent first-appends
- **Cross-references**: `scoring-path-tracker.ts`, `audit-trail-store.ts`, bridge-iter1 HIGH-1/HIGH-2

**Acceptance Criteria**:
- [ ] Explains chain-bound hashing with formula: `hash(contentHash + ":" + previousHash)`
- [ ] Documents the TOCTOU fix (FOR UPDATE + serialized transactions)
- [ ] Documents the genesis race fix (UNIQUE constraint)
- [ ] FAANG parallel references RFC 6962 specifically
- [ ] Cross-references bridge iteration findings that motivated the design

### Task 1.3: ADR-017 — Conservation Laws as First-Class Protocol Objects

**File**: `grimoires/loa/context/adr-conservation-laws.md`
**Priority**: P1

**Description**: Document the evolution from inline invariant comments (I-1, I-2, I-3) to protocol-backed `ConservationLaw` instances using Hounfour v8.0.0 commons factories. This transforms the "social contract expressed as verifiable properties" from documentation into executable code.

**Content Requirements**:
- **Context**: Original invariants (cycle-001) were inline comments. Cycle-007 introduced the social contract framing. Cycle-008 moved to typed `ConservationLaw` instances.
- **Decision**: Every economic invariant is a first-class `ConservationLaw` object, not a comment
- **Alternatives Rejected**: (1) Inline comments (status quo, no enforcement), (2) Runtime assertions (crash on violation), (3) Property-based testing only (no production enforcement)
- **FAANG Parallel**: Stripe's double-entry bookkeeping — conservation as a mathematical property of the system, not a policy check
- **The 5 laws**: BUDGET_CONSERVATION, PRICING_CONSERVATION, CACHE_COHERENCE, NON_NEGATIVE_SPEND, BUDGET_MONOTONICITY
- **Cross-references**: `conservation-laws.ts`, `invariants.yaml` INV-001 through INV-004, Bridgebuilder Part II "social contract"

**Acceptance Criteria**:
- [ ] Lists all 5 conservation laws with their mathematical properties
- [ ] Explains the progression: comments → YAML → typed protocol objects
- [ ] FAANG parallel is Stripe-specific (double-entry, not generic)
- [ ] Cross-references invariants.yaml entries

### Task 1.4: ADR-018 — DynamicContract Monotonic Expansion

**File**: `grimoires/loa/context/adr-dynamic-contract.md`
**Priority**: P1

**Description**: Document the decision that protocol surfaces only expand with reputation progression, never contract. This is the "capability ratchet" — once an agent earns a capability, downgrade requires explicit governance action (quarantine), not silent regression.

**Content Requirements**:
- **Context**: Cycle-004's static tier system → cycle-008's DynamicContract pattern → cycle-009's persistent store with monotonic verification
- **Decision**: `verifyMonotonicExpansion()` runs before every contract save; violations are rejected
- **Alternatives Rejected**: (1) Unrestricted contract modification (allows downgrade attacks), (2) Append-only contract history (storage cost), (3) Soft-delete with versioning (complex)
- **FAANG Parallel**: Kubernetes feature gates — features graduate from alpha → beta → GA but never de-graduate
- **Forward-only alignment**: How monotonic expansion mirrors the forward-only migration framework (ADR for migrate.ts, D-022)
- **Cross-references**: `protocol-version.ts`, `dynamic-contract-store.ts`, D-022 (forward-only migrations)

**Acceptance Criteria**:
- [ ] Explains the 4-tier surface: cold < warming < established < authoritative
- [ ] Documents the monotonic expansion verification algorithm
- [ ] Connects to the forward-only migration philosophy
- [ ] Cross-references D-022 and protocol-version middleware

### Task 1.5: ADR-019 — Feedback Dampening via EMA in the Autopoietic Loop

**File**: `grimoires/loa/context/adr-feedback-dampening.md`
**Priority**: P1

**Description**: Document the decision to bound the autopoietic feedback loop with exponential moving average (EMA) dampening. Without dampening, the loop from `quality signal → reputation update → routing change → quality signal` can enter runaway convergence or death spirals.

**Content Requirements**:
- **Context**: Cycle-007 introduced the autopoietic loop (ADR-009). Bridgebuilder review identified the risk of unbounded feedback. Cycle-008 implemented EMA dampening with INV-006.
- **Decision**: EMA with adaptive alpha ramp from `ALPHA_MIN` to `ALPHA_MAX` over `RAMP_SAMPLES`
- **Alternatives Rejected**: (1) No dampening (runaway risk), (2) Fixed-window moving average (memory-hungry, loses recency), (3) Kalman filter (overcomplicated for scalar scores), (4) Hard clamp on delta (discontinuous)
- **FAANG Parallel**: Google explore/exploit ramp in ad systems — new signals are distrusted until sufficient samples confirm the pattern
- **INV-006 formalization**: `|dampened - old| <= ALPHA_MAX * |new - old|`
- **Cross-references**: `reputation-service.ts:computeDampenedScore`, INV-006, ADR-009 (autopoietic property), `feedback-dampening.test.ts`

**Acceptance Criteria**:
- [ ] EMA formula documented with alpha ramp mechanism
- [ ] Cold start behavior documented (null old_score → no dampening)
- [ ] Death spiral prevention mechanism explained
- [ ] INV-006 property included with mathematical expression
- [ ] Cross-references ADR-009 (autopoietic loop that this dampens)

### Task 1.6: ADR Cross-Reference Index Update

**Priority**: P1

**Description**: Update all existing ADRs that reference the newly documented patterns. Add cross-references from ADR-003 (Separation of Powers) to ADR-015 (GovernedResource), from ADR-009 (Autopoietic) to ADR-019 (Feedback Dampening), from ADR-013 (Hounfour Alignment) to ADR-016 (Dual-Track Hash Chain).

**Acceptance Criteria**:
- [ ] ADR-003 references ADR-015 in "Related Decisions"
- [ ] ADR-009 references ADR-019 in "Related Decisions"
- [ ] ADR-013 references ADR-016 (hash chain as Level 5+ evidence)
- [ ] ADR-012 (Conviction-to-Currency) references ADR-018 (DynamicContract)
- [ ] No broken cross-references

### Task 1.7: ADR Coverage Verification

**Priority**: P1

**Description**: Verify that every service file in `app/src/services/` with a module-level JSDoc comment referencing an architectural pattern has a corresponding ADR. Generate a coverage matrix mapping services → ADRs.

**Acceptance Criteria**:
- [ ] Coverage matrix created as section in NOTES.md
- [ ] Every service with 100+ lines has at least one ADR reference
- [ ] Gap list identifies any remaining undocumented patterns (for future cycles)

### Task 1.8: Sprint 1 Completion Gate

**Priority**: P0

**Description**: Verify all 5 new ADRs are syntactically consistent (same format, sections, cross-references) and that no existing ADR cross-references are broken.

**Acceptance Criteria**:
- [ ] All 5 new ADRs follow the Status/Date/Context/Decision/Alternatives/Consequences format
- [ ] All `file:symbol` references are valid (files exist, symbols exist)
- [ ] No dangling cross-references between ADRs
- [ ] NOTES.md updated with ADR coverage matrix

---

## Sprint 2: Invariant & Governance Documentation Hardening

**Global ID**: 80
**Goal**: Ensure the invariants we enforce in code are fully declared in `invariants.yaml`, add the missing INV-009 and INV-010 entries, and harden the three-witness governance documentation.
**Priority**: P1
**Success Criteria**: `invariants.yaml` has 10+ entries. All invariants have `verified_in` references. Three-witness pattern is fully documented.

### Task 2.1: Add INV-009 and INV-010 to invariants.yaml

**File**: `grimoires/loa/invariants.yaml`
**Priority**: P1

**Description**: Add the two cycle-009 invariants that are enforced in code but missing from the YAML declaration:
- **INV-009**: Knowledge freshness bound — `freshness_score` decreases monotonically between ingestion events (exponential decay with `lambda = 0.023`)
- **INV-010**: Citation integrity — every knowledge citation references an existing source in the corpus

**Acceptance Criteria**:
- [ ] INV-009 entry with `id`, `description`, `severity: important`, `category: bounded`, `properties`, `verified_in`
- [ ] INV-010 entry with `id`, `description`, `severity: important`, `category: referential`, `properties`, `verified_in`
- [ ] `verified_in` references point to `knowledge-governor.ts` symbols
- [ ] Total invariant count is now 10
- [ ] YAML validates cleanly (no syntax errors)

### Task 2.2: Add INV-011 (Chain Integrity) and INV-012 (Three-Witness Quorum)

**File**: `grimoires/loa/invariants.yaml`
**Priority**: P1

**Description**: Declare two additional invariants identified during bridge reviews:
- **INV-011**: Chain integrity — `computeChainBoundHash(entry, domainTag, previousHash)` is deterministic and tamper-evident. Recomputing any entry's hash from its content and predecessor must match the stored hash.
- **INV-012**: Three-witness quorum — The GovernorRegistry must have `>= 3` registered resource types for the governance isomorphism to provide Byzantine fault tolerance. (Proposed by Bridgebuilder Meditation on PR #26.)

**Acceptance Criteria**:
- [ ] INV-011 entry with verified_in references to `audit-trail-store.ts:computeChainBoundHash` and `scoring-path-tracker.ts:verifyIntegrity`
- [ ] INV-012 entry with verified_in references to `governor-registry.ts:verifyAllGovernors` and `governance-three-witness.test.ts`
- [ ] Total invariant count is now 12
- [ ] YAML validates cleanly

### Task 2.3: Invariant Test Coverage Verification

**Priority**: P1

**Description**: For each invariant in `invariants.yaml`, verify that the `verified_in` references point to actual test files and symbols that exercise the invariant property. Add test references where missing.

**Acceptance Criteria**:
- [ ] Every invariant has at least one test file in `verified_in`
- [ ] All test file references exist and contain the referenced symbol
- [ ] Coverage report: "12/12 invariants have test coverage"
- [ ] Any gaps documented in NOTES.md

### Task 2.4: Three-Witness Governance Documentation

**Priority**: P1

**Description**: Add a section to NOTES.md documenting the three-witness governance pattern as implemented: Reputation (ReputationService), Knowledge (KnowledgeGovernor), and Corpus Meta (CorpusMetaGovernor). Include the governor registry verification flow and the Bridgebuilder's "Byzantine fault tolerance minimum quorum" framing.

**Acceptance Criteria**:
- [ ] Three witnesses listed with their `resourceType` values
- [ ] GovernedResource interface contract summarized
- [ ] INV-008 (isomorphism) and INV-012 (quorum) referenced
- [ ] Bridgebuilder meditation cited as source of the pattern name

### Task 2.5: Sprint 2 Completion Gate

**Priority**: P0

**Description**: Verify all invariants.yaml changes are syntactically valid and that test references resolve.

**Acceptance Criteria**:
- [ ] `invariants.yaml` parses as valid YAML
- [ ] All 12 invariants have complete entries
- [ ] All `verified_in` file references exist
- [ ] Tests pass: `npx vitest run` (all existing + any new tests)

---

## Sprint 3: Vision Exploration Issues & Propose-Learning

**Global ID**: 81
**Goal**: Surface vision items, speculation findings, and learning proposals as GitHub issues for community engagement and future cycle planning. Transform captured institutional knowledge into actionable backlog items.
**Priority**: P2
**Success Criteria**: All vision items filed as issues. Learning proposals filed. Issues are labeled and cross-referenced.

### Task 3.1: File Vision Items as GitHub Issues

**Priority**: P2

**Description**: Create GitHub issues for each of the 7 captured vision items. Each issue should include the full vision description, origin context (which PR/bridge review captured it), FAANG parallel if available, and a "How to Explore" section suggesting next steps.

**Vision Items to File**:
1. **vision-001**: Pluggable credential provider registry
2. **vision-002**: Bash Template Rendering Anti-Pattern (safety fix)
3. **vision-003**: Context Isolation as Prompt Injection Defense
4. **vision-004**: Conditional Constraints for Feature-Flagged Behavior (already exploring)
5. **vision-005**: Pre-Swarm Research Planning (`/plan-research`)
6. **vision-006**: Symbiotic Layer — Convergence Detection & Intent Modeling
7. **vision-007**: Operator Skill Curve & Progressive Orchestration Disclosure

**Acceptance Criteria**:
- [ ] 7 GitHub issues created with `[VISION]` prefix
- [ ] Each issue references the vision entry file
- [ ] Each issue has a "How to Explore" section
- [ ] Issues labeled with `vision` and `enhancement`
- [ ] Vision index.md updated with issue URLs

### Task 3.2: File Bridge Speculation Findings as GitHub Issues

**Priority**: P2

**Description**: Create GitHub issues for the most architecturally significant SPECULATION findings from bridge reviews that haven't been addressed. These represent ideas the Bridgebuilder identified as worth exploring in future cycles.

**Top Speculation Items to File**:
1. **Advisory lock for audit chain serialization** — `pg_advisory_xact_lock(hashtext(resource_type))` to serialize per-chain without blocking other chains
2. **PG-backed KnowledgeGovernor** — Complete the persistence story using the existing `knowledge_freshness` table
3. **Chain verification pagination** — Large chains need paginated verification to avoid memory issues
4. **Event-sourced MutationLog** — Append-only semantics for the PG adapter (Kafka compacted topics pattern)
5. **Cross-governor event coordination** — Publish-subscribe on GovernorRegistry for reactive governance
6. **Meta-governor** — Governance of governance (deferred from cycle-009, D-023)
7. **Adaptive retrieval from self-knowledge** — Oracle hedging responses based on epistemic state

**Acceptance Criteria**:
- [ ] 7 GitHub issues created with `[SPECULATION]` prefix
- [ ] Each issue references the bridge review that identified it
- [ ] Each issue includes the FAANG parallel where available
- [ ] Issues labeled with `speculation` and `enhancement`

### Task 3.3: File Propose-Learning Issue

**Priority**: P2

**Description**: Create a GitHub issue proposing that key learnings from cycle-009 be contributed upstream to the Loa framework. The learnings cover patterns that are generalizable beyond this specific project.

**Learnings to Propose**:
- **L-023**: Forward-only migrations align with DynamicContract monotonic expansion — the pattern that "governance decisions don't roll back" applies to database schema, protocol surfaces, and institutional memory alike
- **L-024**: Mock pool pattern for PG store testing — `createMockPool()` with query-text matching enables full ReputationStore testing without a database. Generalizable to any project with PG stores.
- **L-025**: Welford's algorithm extends cleanly to pairwise covariance — the co-moment update pattern is a reusable statistical primitive
- **L-026**: Hash chain verification with domain separation — using Hounfour's `computeAuditEntryHash` with domain tags enables multi-chain verification without exposing crypto internals

**Acceptance Criteria**:
- [ ] GitHub issue created with `[PROPOSE-LEARNING]` prefix
- [ ] Each learning includes: discovery context, generalization argument, code reference
- [ ] Issue suggests which learnings might become Loa framework patterns vs project-specific
- [ ] Issue labeled with `learning` and `upstream`

### Task 3.4: File Bridgebuilder Deep Meditation Gaps as Issues

**Priority**: P2

**Description**: Create GitHub issues for the remaining gaps identified in the Bridgebuilder's Deep Meditation on PR #15 that haven't been fully resolved. These represent known architectural improvements with specific implementation guidance.

**Gaps to File**:
1. **Blended score staleness** — `handleQualitySignal()` updates personal_score but not blended_score. Needs recompute in both paths.
2. **Collection score as empirical running mean** — Replace `DEFAULT_COLLECTION_SCORE = 0` with Welford's population mean (infrastructure built in cycle-009, wiring deferred)
3. **Auto-checkpoint in ScoringPathTracker** — `checkpointInterval` parameter accepted but never auto-triggered in `record()`

**Acceptance Criteria**:
- [ ] 3 GitHub issues created with `[BRIDGE-GAP]` prefix
- [ ] Each issue references the specific Bridgebuilder meditation section
- [ ] Each issue includes implementation guidance (the Bridgebuilder already specified the fix)
- [ ] Issues labeled with `bridge-gap` and `bug` or `enhancement` as appropriate

### Task 3.5: Sprint 3 Completion Gate

**Priority**: P0

**Description**: Verify all GitHub issues are created, properly labeled, and cross-referenced. Update NOTES.md with the issue URLs.

**Acceptance Criteria**:
- [ ] Total of ~20 GitHub issues created across Tasks 3.1-3.4
- [ ] All issues have appropriate labels
- [ ] NOTES.md updated with "Filed Issues" section listing all new issue URLs
- [ ] Vision index.md updated with issue cross-references
- [ ] Tests pass: `npx vitest run` (no regressions from documentation changes)

---

## Dependencies

```
Sprint 1 (ADR Coverage)
    |
    +---> Sprint 2 (Invariants + Governance Docs)
    |         |
    |         +---> Sprint 3 (GitHub Issues)
    |
    +---> Sprint 3 (GitHub Issues) [partially independent]
```

**Critical path**: Sprint 1 → Sprint 2 → Sprint 3
**Note**: Sprint 3 tasks 3.1, 3.2, 3.3 can begin in parallel with Sprint 2 since they don't depend on invariants.yaml changes.

---

## Risk Assessment

| Risk | Sprint | Likelihood | Impact | Mitigation |
|------|--------|------------|--------|------------|
| ADR format inconsistency across 19 ADRs | 1 | Medium | Low | Use template from existing ADR-001, review at gate |
| Cross-reference rot (ADRs referencing moved/renamed files) | 1 | Low | Medium | Verify all file:symbol refs with grep |
| invariants.yaml schema version incompatibility | 2 | Low | Low | Extend existing schema, don't change version |
| GitHub issue creation rate-limited | 3 | Low | Medium | Batch creation with delays between calls |
| Vision items too vague for actionable issues | 3 | Medium | Low | Each issue includes "How to Explore" section |

---

## Success Metrics

| # | Criterion | Sprint | Verification |
|---|-----------|--------|-------------|
| 1 | 5 new ADRs covering undocumented patterns | 1 | File count in grimoires/loa/context/adr-*.md |
| 2 | All ADR cross-references valid | 1 | Completion gate verification |
| 3 | invariants.yaml has 12 entries | 2 | YAML parse + count |
| 4 | All invariants have test coverage refs | 2 | Coverage report in NOTES.md |
| 5 | ~20 GitHub issues filed | 3 | `gh issue list` count |
| 6 | Vision index updated with issue URLs | 3 | Vision index.md verification |
| 7 | All existing tests still pass | 1-3 | vitest regression gates |

---

*"The architecture knows what it wants to be. Our job is to write it down before we forget."*

*— cycle-010 Sprint Plan*
