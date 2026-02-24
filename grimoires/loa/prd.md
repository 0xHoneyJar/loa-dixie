# PRD: Tag Release v2.0.0 — Constitutional Architecture

**Version**: 4.0.0
**Date**: 2026-02-24
**Author**: Merlin (Product), Claude (Synthesis)
**Cycle**: cycle-004
**Status**: Draft
**Predecessor**: cycle-003 PRD v3.0.0 (Hounfour v7.9.2 Full Adoption)

> Sources: loa-finn#66 (command center — Phase 0: Merge Dixie PR #7),
> cycle-002 (Phase 2 — Experience Orchestrator, 23 sprints),
> cycle-003 (Hounfour v7.9.2 Full Adoption, 12 sprints),
> PR #7 (feature/dixie-phase2, 28 commits, 218 files, +19310/-8044)

---

## 1. Problem Statement

Dixie's `feature/dixie-phase2` branch contains **28 commits across 2 development cycles** (cycle-002 + cycle-003), representing the complete transformation from a BFF proxy to a constitutional architecture with Hounfour Level 6 foundation. This work is reviewed, tested (1011 tests, 62 files), and Bridgebuilder-approved — but not yet merged or tagged.

**The gap**: The branch exists as PR #7 in draft state. There is no version tag, no CHANGELOG entry, no release. The `package.json` still says `1.0.0`. The command center (loa-finn#66) Phase 0 says "Merge Dixie PR #7 — NOW."

**Why v2.0.0 (MAJOR)**:

| Semver Criterion | Evidence |
|---|---|
| New public API surface | `POST /api/enrich/review-context` endpoint (Sprint 53) |
| New type exports | `TaskTypeCohort`, `DixieReputationAggregate`, `ReputationEvent`, `ScoringPathLog` (Sprint 52) |
| Architectural paradigm shift | Level 1 → Level 6 protocol maturity (Level 4 achieved, Level 5-6 foundation) |
| Constitutional governance model | Separation of powers, autopoietic self-improvement loop, conviction-to-currency path |
| Protocol evolution infrastructure | ProtocolDiffEngine, MigrationProposal, constitutional amendment process |
| Economic model change | BigInt-safe pricing, conservation invariants as social contracts, per-model per-task reputation |

This is not a patch or minor release. Dixie has a new constitutional identity.

> Sources: PR #7 merge readiness assessment, loa-finn#66 Phase 0

## 2. Product Vision

**Ship what we built.** Cycle-004 is a release cycle, not a feature cycle. All code is written, tested, and reviewed. The goal is mechanical: merge, version bump, changelog, tag, release notes, command center update.

**One hour. Zero new features. Just ship.**

## 3. Success Metrics

| ID | Metric | Target |
|----|--------|--------|
| R-1 | PR #7 merged to main | Merged, no conflicts |
| R-2 | Version bumped | `package.json` → `2.0.0` |
| R-3 | CHANGELOG updated | v2.0.0 entry with all notable changes from cycles 002+003 |
| R-4 | Git tag created | `v2.0.0` tag on merge commit |
| R-5 | Release notes | GitHub Release with structured summary |
| R-6 | Command center updated | loa-finn#66 Phase 0 marked complete |
| R-7 | Tests pass on main | 1011 tests, 62 files, zero regressions post-merge |

## 4. Functional Requirements

### FR-1: Merge PR #7 to main

**Current**: PR #7 (`feature/dixie-phase2`) is 28 commits ahead of main. CI passing (Socket Security). Bridgebuilder approved. No blockers identified.

**Action**: Merge PR #7 into main.

**Acceptance Criteria**:
- [ ] PR merged cleanly (no conflicts)
- [ ] All CI checks pass post-merge
- [ ] `main` branch contains all cycle-002 + cycle-003 work

### FR-2: Version Bump to 2.0.0

**Current**: `app/package.json` version is `1.0.0`.

**Action**: Bump to `2.0.0` in a post-merge commit on main.

**Acceptance Criteria**:
- [ ] `app/package.json` version field is `"2.0.0"`
- [ ] Commit message: `chore: bump version to 2.0.0`

### FR-3: CHANGELOG Entry

**Current**: `CHANGELOG.md` has Loa framework entries but no Dixie application entries.

**Action**: Add a `## [2.0.0]` entry documenting the constitutional architecture release.

**Acceptance Criteria**:
- [ ] CHANGELOG entry covers all major features from cycle-002 and cycle-003
- [ ] Organized by category: Added, Changed, Architecture
- [ ] References sprint numbers and PR #7
- [ ] Follows Keep a Changelog format

### FR-4: Git Tag v2.0.0

**Action**: Create annotated tag `v2.0.0` on the version bump commit.

**Acceptance Criteria**:
- [ ] Tag `v2.0.0` exists on main
- [ ] Tag is annotated with release summary
- [ ] Tag is pushed to remote

### FR-5: GitHub Release

**Action**: Create a GitHub Release from the `v2.0.0` tag with structured release notes.

**Acceptance Criteria**:
- [ ] GitHub Release created for `v2.0.0`
- [ ] Release notes include: summary, highlights per cycle, test metrics, breaking changes, migration notes
- [ ] Links to PR #7 and command center issue #66

### FR-6: Command Center Update

**Action**: Post completion update on loa-finn#66 marking Phase 0 as done.

**Acceptance Criteria**:
- [ ] Comment on issue #66 with: version tagged, release URL, next phase activation

## 5. Scope

### In Scope
- Merge PR #7
- Version bump to 2.0.0
- CHANGELOG entry
- Annotated git tag
- GitHub Release with notes
- Command center update on loa-finn#66

### Out of Scope
- New feature development
- Bug fixes (none identified)
- Cross-repo propagation (Phase 1+ per roadmap)
- Hounfour upstream changes (Phase 1)
- Finn/Freeside/Arrakis integration (Phases 2-4)

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Merge conflict on main | Low | Low | Branch was recently rebased; 0 conflicts expected |
| Test failure post-merge | Very Low | Medium | 1011 tests passing on branch; run post-merge |
| CHANGELOG scope creep | Medium | Low | Stick to highlights, not exhaustive list |

## 7. Timeline

**Target**: 1 hour

| Task | Est. |
|------|------|
| Merge PR #7 | 5 min |
| Version bump + commit | 5 min |
| CHANGELOG entry | 15 min |
| Tag + push | 5 min |
| GitHub Release notes | 15 min |
| Command center update | 5 min |
| Post-merge test verification | 10 min |

## 8. What Ships in v2.0.0

### From Cycle-002: Experience Orchestrator (23 sprints, globals 20-42)
- Soul Memory API with conviction-gated governance
- Tool event streaming with economic metadata
- BEAUVOIR personality surfacing
- Conviction-gated access (Ostrom's Commons)
- Autonomous operation mode
- NL scheduling with cron integration
- Agent API surface (TBA auth + x402 metering)
- Compound learning pipeline
- ResourceGovernor<T> generalization
- Communitarian knowledge governance
- Shared crypto utility + persistence versioning

### From Cycle-003: Hounfour v7.9.2 Full Adoption (12 sprints, globals 43-54)
- Type foundation & validator migration (Level 2)
- Access control & economic arithmetic (Level 3)
- Economic boundary integration & integrity
- E2E conformance & Level 4 gate
- Protocol hardening (bridge findings)
- Reputation activation & denial code evolution
- Level 5 foundation — runtime constitutional enforcement
- Conformance excellence (74% fixture coverage)
- Constitutional architecture ADRs (separation of powers, autopoiesis, conviction path, convivial code)
- Reputation evolution — per-model per-task cohorts + event sourcing
- Enrichment endpoint — autopoietic loop activation
- Level 6 foundation — protocol diff engine, constitutional amendment

### Test Coverage
- 1011 tests across 62 test files
- Zero regressions across both cycles
- Protocol conformance suite (hounfour v7.9.2)
- Economic conservation invariants verified (BigInt)

> Sources: Sprint ledger (globals 20-54), PR #7 commit history, test output
