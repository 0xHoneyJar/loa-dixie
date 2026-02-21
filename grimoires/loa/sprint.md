# Sprint Plan: Dixie Phase 2 — Knowledge Product Surface (Bridgebuilder Horizon Findings)

**Version**: 2.3.0
**Date**: 2026-02-22
**Cycle**: cycle-002 (Bridge Horizon — SPECULATION + REFRAME findings from PR #4 review)
**Source**: Bridgebuilder PR #4 review (3 SPECULATION, 1 REFRAME, 4 PRAISE) + loa-finn#24 Field Report #40
**Sprints**: 2 (Sprint 14-15 / Global 33-34)

---

> *"The right question isn't 'is the documentation accurate?' but 'is the product truthful?' — and the answer requires treating truth as a first-class engineering concern."* — Bridgebuilder reframe-1

## Context

Bridge review converged at 1.0 across 3 iterations (sprints 11-13). All HIGH, MEDIUM, and LOW findings addressed. PR #4 (knowledge freshness) received a Horizon-mode Bridgebuilder review that surfaced 3 SPECULATION findings and 1 REFRAME finding — forward-looking architectural insights about the knowledge corpus as a product surface.

The central insight: **the Oracle's knowledge corpus is not documentation about the product — it IS the product** (Twilio parallel). Corpus accuracy, versioning, and freshness deserve the same engineering rigor as application code.

These sprints formalize that insight with concrete infrastructure, tests, and product surface improvements.

---

## Sprint 14: Knowledge Conservation Infrastructure

**Global ID**: 33
**Scope**: MEDIUM (6 tasks)
**Focus**: Formalize corpus versioning, freshness validation, and conservation invariants
**Source findings**: reframe-1 (docs as product release), speculation-1 (corpus versioning)

### Task 14.1: Upgrade sources.json schema — corpus versioning (reframe-1 + speculation-1 — ARCHITECTURE)

**File**: `knowledge/sources.json`
**Fix**: Bump schema `version` to 2. Add top-level `corpus_version` (integer, starts at 1, increments on every corpus mutation). Add per-source `last_updated` (ISO date string). Add per-source `source_file` field mapping to `knowledge/sources/` filename for authoring-path resolution.

**Acceptance Criteria**:
- [x] `version` field is 2
- [x] `corpus_version` field exists with integer value
- [x] Every source entry has `last_updated` ISO date
- [x] Every source entry has `source_file` pointing to `knowledge/sources/` filename
- [x] Existing fields preserved (backward compatible)

### Task 14.2: Create knowledge corpus CHANGELOG (reframe-1 — DX)

**File**: `knowledge/CHANGELOG.md` (new)
**Fix**: Create corpus changelog documenting: PR #4 freshness run (arrakis→freeside migration, 16 files, 4→5 repo expansion), Sprint 13 cross-repo issues, and this sprint's schema upgrade. Follow Keep a Changelog format.

**Acceptance Criteria**:
- [x] `knowledge/CHANGELOG.md` exists
- [x] Documents PR #4 freshness run as a corpus release
- [x] Documents Sprint 14 schema upgrade
- [x] Uses [Keep a Changelog](https://keepachangelog.com/) format

### Task 14.3: Add freshness validation tests (speculation-1 — QUALITY GATE)

**File**: `app/tests/unit/knowledge-health.test.ts` (extend existing)
**Fix**: Add tests that parse `last_updated` from sources.json and validate against `max_age_days`. Test: no source exceeds its max age. Test: freshness calculation is correct. Use test date injection for deterministic behavior.

**Acceptance Criteria**:
- [x] Test: all sources within max_age_days of their last_updated
- [x] Test: freshness calculation returns correct stale/healthy status
- [x] Tests use deterministic date injection (no flaky clock dependency)

### Task 14.4: Add terminology consistency tests (praise-1 pattern — QUALITY GATE)

**File**: `app/tests/unit/knowledge-health.test.ts` (extend existing)
**Fix**: Add tests that scan all `knowledge/sources/*.md` files for deprecated terminology. Blocklist: `arrakis` (not in historical context), `0xHoneyJar/arrakis`, `spice gate protocol` (vs. Settlement Protocol). The bridge praised the annotation pattern — these tests enforce it.

**Acceptance Criteria**:
- [x] Test: no knowledge source contains raw `arrakis` outside of historical/legacy annotations
- [x] Test: no knowledge source references `0xHoneyJar/arrakis` as a live URL
- [x] Blocklist is extensible (array of `{pattern, allowed_context}` pairs)

### Task 14.5: Add cross-reference conservation tests (conservation invariant — QUALITY GATE)

**File**: `app/tests/unit/knowledge-health.test.ts` (extend existing)
**Fix**: Add tests that verify: all GitHub repo references in knowledge sources match the 5-repo constellation (`loa`, `loa-finn`, `loa-freeside`, `loa-hounfour`, `loa-dixie`). All `0xHoneyJar/*` URLs reference existing repos. No dead cross-references between knowledge sources.

**Acceptance Criteria**:
- [x] Test: all `0xHoneyJar/*` references match known repos
- [x] Test: no knowledge source references a repo not in the constellation
- [x] Test: internal source references (source-id mentions) resolve to actual sources in sources.json

### Task 14.6: Populate health endpoint knowledge_corpus (speculation-1 — OBSERVABILITY)

**File**: `app/src/routes/health.ts`, `app/tests/unit/health.test.ts`
**Fix**: Read `knowledge/sources.json` at startup. Compute: `corpus_version`, `sources` count, `stale_sources` count (by comparing `last_updated` + `max_age_days` against current date). Populate the existing `knowledge_corpus` field in the health response. The type already exists in `types.ts` — just need to populate it.

**Pattern**: Use cached read (like `cachedFinnHealth` pattern already in health.ts)

**Acceptance Criteria**:
- [x] Health response includes `knowledge_corpus` object
- [x] `corpus_version` matches sources.json value
- [x] `sources` count matches actual source count
- [x] `stale_sources` accurately reflects freshness state
- [x] 3 new tests: corpus present, version correct, stale count accurate

---

## Sprint 15: Knowledge Product Surface & Bidirectional Freshness

**Global ID**: 34
**Scope**: MEDIUM (5 tasks)
**Focus**: Knowledge coverage mapping, bidirectional freshness markers, and competitive positioning
**Source findings**: speculation-2 (bidirectional freshness), speculation-3 (competitive positioning)

### Task 15.1: Add knowledge coverage report (speculation-3 — OBSERVABILITY)

**File**: `scripts/knowledge-coverage.sh` (new)
**Fix**: Shell script that reads `knowledge/sources.json` and reports: total sources, sources per tag category, which of the 5 repos have dedicated code-reality files, which repos are missing coverage, total estimated token budget vs. actual. Output as structured text suitable for inclusion in bridge reviews.

**Acceptance Criteria**:
- [ ] Script reports source count by tag
- [ ] Script identifies repos with/without code-reality coverage
- [ ] Script reports token budget utilization
- [ ] Script exits 0 (informational, not a gate)

### Task 15.2: Add code-reality generation markers (speculation-2 — ARCHITECTURE)

**Files**: `knowledge/sources/code-reality-finn.md`, `knowledge/sources/code-reality-freeside.md`, `knowledge/sources/code-reality-hounfour.md`, `knowledge/sources/dixie-architecture.md`
**Fix**: Add `<!-- upstream-source: {repo}:{branch} | generated: false | last-synced: {date} -->` HTML comment markers to the top of each code-reality file. These markers enable future automation: a script can compare `last-synced` against upstream HEAD to detect drift. Mark `generated: false` to indicate manual curation (future: `generated: true` for auto-generated from /ride output).

**Acceptance Criteria**:
- [ ] All 4 code-reality files have upstream-source markers
- [ ] Markers include repo, branch, generated flag, last-synced date
- [ ] Existing content unchanged (markers added as HTML comments)

### Task 15.3: Enrich agent /knowledge endpoint (speculation-1 + speculation-2 — FEATURE)

**File**: `app/src/routes/agent.ts:291`, `app/tests/unit/agent-api.test.ts`
**Fix**: When finn /knowledge/metadata returns successfully, merge local corpus metadata: `corpus_version`, freshness summary (`{healthy, stale, expired}` counts), and source count. Return enriched response. On finn failure, return local-only corpus metadata instead of empty object.

**Acceptance Criteria**:
- [ ] Response includes `corpus_version` field
- [ ] Response includes `freshness` object with healthy/stale/expired counts
- [ ] Graceful degradation returns local corpus metadata when finn unavailable
- [ ] 3 new tests: enriched response, freshness counts, graceful degradation

### Task 15.4: Document knowledge-as-product architecture (reframe-1 + speculation-3 — DESIGN)

**File**: `knowledge/sources/dixie-architecture.md`
**Fix**: Add section documenting the knowledge-as-product pattern: the Oracle's corpus as product surface (Twilio parallel), corpus versioning, conservation invariant (every claim grounded in verifiable source), freshness as reliability, competitive positioning through knowledge depth (vs. infrastructure-only approaches). Reference the Bridgebuilder review findings and the Cambrian context (Conway Automaton comparison).

**Acceptance Criteria**:
- [ ] New "Knowledge-as-Product Architecture" section added
- [ ] Documents conservation invariant
- [ ] References Twilio parallel and competitive positioning
- [ ] Grounded in actual architecture (corpus_version, freshness validation, coverage)

### Task 15.5: File upstream issues for corpus freshness CI (speculation-2 — CROSS-REPO)

**Cross-repo surfaces**:
- [ ] loa (framework): "Knowledge Corpus Freshness: Automated CI Validation" — propose vitest-based corpus health checks as a Loa framework pattern, applicable to any project with knowledge/ directory
- [ ] loa-finn: "Oracle API: Corpus Version Contract" — propose x-corpus-version response header from Oracle API, enabling clients to detect version drift across surfaces

---

## Verification

- [ ] ~505 tests passing (492 existing + ~13 new)
- [ ] `knowledge/sources.json` schema version 2 with corpus versioning
- [ ] `knowledge/CHANGELOG.md` exists
- [ ] Health endpoint reports `knowledge_corpus` metadata
- [ ] Agent `/knowledge` endpoint enriched with corpus version
- [ ] All knowledge sources pass freshness, terminology, and conservation tests
- [ ] Cross-repo issues filed

## File Change Summary

| File | Tasks | Changes |
|------|-------|---------|
| `knowledge/sources.json` | 14.1 | Schema v2 + corpus_version + per-source last_updated + source_file |
| `knowledge/CHANGELOG.md` | 14.2 | New file — corpus changelog |
| `app/tests/unit/knowledge-health.test.ts` | 14.3, 14.4, 14.5 | ~7 new tests (freshness, terminology, conservation) |
| `app/src/routes/health.ts` | 14.6 | Populate knowledge_corpus field |
| `app/tests/unit/health.test.ts` | 14.6 | 3 new tests (corpus in health response) |
| `scripts/knowledge-coverage.sh` | 15.1 | New script — coverage report |
| `knowledge/sources/code-reality-finn.md` | 15.2 | Add upstream-source marker |
| `knowledge/sources/code-reality-freeside.md` | 15.2 | Add upstream-source marker |
| `knowledge/sources/code-reality-hounfour.md` | 15.2 | Add upstream-source marker |
| `knowledge/sources/dixie-architecture.md` | 15.2, 15.4 | Add upstream-source marker + knowledge-as-product section |
| `app/src/routes/agent.ts` | 15.3 | Enrich /knowledge endpoint with corpus metadata |
| `app/tests/unit/agent-api.test.ts` | 15.3 | 3 new tests (enriched knowledge response) |
