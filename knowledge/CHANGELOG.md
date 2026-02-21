# Knowledge Corpus Changelog

All notable changes to the Oracle's knowledge corpus are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Corpus versions follow integer increment (not semver) — each corpus mutation increments by 1.

---

## [3] - 2026-02-22

### Added
- `scripts/knowledge-drift.sh` — automated drift detection ("ArgoCD for knowledge")
- `knowledge/contracts/oracle-requirements.json` — consumer-driven corpus contract declaration
- `scripts/corpus-diff.sh` — corpus diff utility ("git log --stat for knowledge")
- Declaration-driven consumer contract tests reading from oracle-requirements.json
- Upstream drift marker contract tests (parseable dates, 30-day threshold)

### Changed
- `corpus_version` incremented to 3
- Contract tests extended: +7 declaration-driven + 2 drift marker tests

### Cross-Repo
- loa-finn#95: Oracle Metacognition — Self-Knowledge API Contract
- loa#399: Knowledge Drift Detection — CI Integration Pattern

### Architecture
- Bilateral contract pattern complete: producer tests (what corpus promises) + consumer tests (what runtime needs) + declaration file (formal requirements)
- Drift detection completes the reconciliation loop: event log (audit trail) + contracts (quality) + drift (sync)

---

## [2] - 2026-02-22

### Added
- `corpus-events.json` — append-only mutation log (CQRS write model; CHANGELOG is the read projection)
- `CorpusMeta` service class (`app/src/services/corpus-meta.ts`) — extracted from health.ts
- `GET /self-knowledge` endpoint — Oracle metacognition (corpus version, freshness, coverage, confidence)
- Knowledge contract tests (`knowledge-contracts.test.ts`) — bilateral producer/consumer pattern
- Contract report output summarizing pass/fail per contract

### Changed
- `default_budget_tokens` raised from 30,000 to 50,000 (budget ≠ per-query context window; total corpus capacity with retrieval selecting subset per query)
- `corpus_version` incremented to 2
- Knowledge health tests restructured: structural tests stay in `knowledge-health.test.ts`, contracts moved to `knowledge-contracts.test.ts`
- `agent.ts` imports `getCorpusMeta` from `corpus-meta` service (not health.ts)
- `health.ts` delegates corpus metadata to `CorpusMeta` service

### Architecture
- Billing-Knowledge Isomorphism: event log (write) + CHANGELOG (read projection) mirrors CQRS billing pattern
- Contract tests parallel Pact-style bilateral contracts: producer promises + consumer requirements

---

## [1] - 2026-02-22

### Changed
- Migrated all references from `arrakis` to `loa-freeside` across 16 knowledge source files
- Expanded ecosystem from 4 repositories to 5 (added `loa-dixie`)
- Updated development history with Phase 5 (Dixie cycles 26-27)
- Refreshed ecosystem statistics: 27 cycles, 93 sprints, ~620 tasks, 5 repos
- Upgraded `sources.json` to schema version 2 with `corpus_version`, per-source `last_updated`, and `source_file` fields
- Updated glossary: "Spice Gate" → "Settlement Protocol (formerly Spice Gate)", "Arrakis" → "Freeside (formerly Arrakis)"

### Added
- `dixie-architecture` knowledge source (priority 20)
- `corpus_version` field in `sources.json` for multi-surface consistency
- Per-source `last_updated` timestamps for freshness tracking
- Per-source `source_file` field mapping deployment paths to authoring paths
- Knowledge conservation tests (freshness, terminology, cross-reference)
- Corpus metadata in health endpoint response

### Fixed
- All `0xHoneyJar/arrakis` GitHub URLs updated to `0xHoneyJar/loa-freeside`
- Legacy infrastructure naming annotations added where DNS/env vars still use old names
- Freeside code-reality file: removed duplicate of arrakis version, kept updated content

### Removed
- `knowledge/sources/code-reality-arrakis.md` (superseded by `code-reality-freeside.md`)
