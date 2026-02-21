# Knowledge Corpus Changelog

All notable changes to the Oracle's knowledge corpus are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Corpus versions follow integer increment (not semver) — each corpus mutation increments by 1.

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
