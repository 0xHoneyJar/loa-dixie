# SDD: Tag Release v2.0.0 — Release Process

**Version**: 4.0.0
**Date**: 2026-02-24
**Author**: Merlin (Product), Claude (Architecture)
**Cycle**: cycle-004
**Status**: Draft
**PRD Reference**: `grimoires/loa/prd.md` v4.0.0
**Predecessor**: SDD v3.0.0 (cycle-003, Hounfour v7.9.2 Full Adoption)

---

## 1. Executive Summary

This is a **release SDD**, not a feature SDD. No new code is written. The architecture documents the mechanical process of merging PR #7, bumping the version, generating a changelog, tagging, and creating a GitHub release.

## 2. Release Process Architecture

```
feature/dixie-phase2 (28 commits)
        │
        ▼
   Merge PR #7 ──→ main
        │
        ▼
   Version bump (1.0.0 → 2.0.0)
        │
        ▼
   CHANGELOG.md update
        │
        ▼
   git tag v2.0.0
        │
        ▼
   GitHub Release (with notes)
        │
        ▼
   Command center update (finn#66)
```

## 3. Version Bump Strategy

### 3.1 File: `app/package.json`

Single field change: `"version": "1.0.0"` → `"version": "2.0.0"`

### 3.2 Semver Justification

MAJOR version bump per [SemVer 2.0.0](https://semver.org/):

| Criterion | Details |
|-----------|---------|
| New public API | `POST /api/enrich/review-context` endpoint |
| New type exports | `TaskTypeCohort`, `DixieReputationAggregate`, `ReputationEvent` |
| Paradigm shift | BFF proxy → constitutional architecture with Level 6 foundation |
| Economic model | Number arithmetic → BigInt conservation invariants |

## 4. CHANGELOG Structure

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

Entry structure:
```markdown
## [2.0.0] — 2026-02-24 — Constitutional Architecture

### Added
[New capabilities from cycle-002 + cycle-003]

### Changed
[Modified behaviors]

### Architecture
[Constitutional/governance additions — non-standard but warranted]
```

### 4.1 Change Categories

**From cycle-002** (23 sprints, globals 20-42): Soul Memory, Tool Streaming, BEAUVOIR, Conviction Gating, Autonomous Mode, Scheduling, Agent API, Compound Learning, ResourceGovernor<T>, Knowledge Governance.

**From cycle-003** (12 sprints, globals 43-54): Hounfour type migration, BigInt economics, Level 4 E2E conformance, Level 5 runtime enforcement, Level 6 protocol evolution, reputation evolution, enrichment endpoint, constitutional ADRs.

## 5. Tag Strategy

- **Annotated tag**: `git tag -a v2.0.0 -m "..."` (not lightweight)
- **Tag on**: The version bump commit on main
- **Push**: `git push origin v2.0.0`

## 6. GitHub Release Structure

```markdown
# Dixie v2.0.0 — Constitutional Architecture

[Summary paragraph]

## Highlights
[Top 5-7 features with one-line descriptions]

## What's New (Cycle-002: Experience Orchestrator)
[Bullet list of cycle-002 features]

## What's New (Cycle-003: Hounfour v7.9.2 Full Adoption)
[Bullet list of cycle-003 features]

## Test Coverage
[1011 tests, 62 files stats]

## Breaking Changes
[New endpoint, new types — additive, not destructive]

## Migration
[None required — additive changes only]

## Full Changelog
[Link to PR #7]
```

## 7. Constraints

- Zero new code
- Zero test changes
- Main branch only for version bump + CHANGELOG + tag
- PR #7 merged as-is (already reviewed + approved)
