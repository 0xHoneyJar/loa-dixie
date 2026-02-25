<!-- AGENT-CONTEXT
name: loa-dixie
type: framework
purpose: **The Oracle Product — Cross-Project Understanding
key_files: [CLAUDE.md, .claude/loa/CLAUDE.loa.md, .loa.config.yaml, .claude/scripts/, .claude/skills/]
interfaces:
  core: [/auditing-security, /autonomous-agent, /bridgebuilder-review, /browsing-constructs, /bug-triaging]
dependencies: [git, jq, yq]
capability_requirements:
  - filesystem: read
  - filesystem: write (scope: state)
  - filesystem: write (scope: app)
  - git: read_write
  - shell: execute
  - github_api: read_write (scope: external)
version: v2.0.0
installation_mode: unknown
trust_level: L2-verified
-->

# loa-dixie

<!-- provenance: DERIVED -->
**The Oracle Product — Cross-Project Understanding

The framework provides 29 specialized skills, built with TypeScript/JavaScript, Python, Shell.

## Key Capabilities
<!-- provenance: DERIVED -->
The project exposes 15 key entry points across its public API surface.

### .claude/adapters

- **_build_provider_config** — Build ProviderConfig from merged hounfour config. (`.claude/adapters/cheval.py:152`)
- **_check_feature_flags** — Check feature flags. (`.claude/adapters/cheval.py:192`)
- **_error_json** — Format error as JSON for stderr (SDD §4.2.2 Error Taxonomy). (`.claude/adapters/cheval.py:77`)
- **_load_persona** — Load persona.md for the given agent with optional system merge (SDD §4.3.2). (`.claude/adapters/cheval.py:96`)
- **cmd_cancel** — Cancel a Deep Research interaction. (`.claude/adapters/cheval.py:511`)
- **cmd_invoke** — Main invocation: resolve agent → call provider → return response. (`.claude/adapters/cheval.py:211`)
- **cmd_poll** — Poll a Deep Research interaction. (`.claude/adapters/cheval.py:467`)
- **cmd_print_config** — Print effective merged config with source annotations. (`.claude/adapters/cheval.py:442`)
- **cmd_validate_bindings** — Validate all agent bindings. (`.claude/adapters/cheval.py:453`)
- **main** — CLI entry point. (`.claude/adapters/cheval.py:547`)

### .claude/adapters/loa_cheval/config

- **LazyValue** — Deferred interpolation token. (`.claude/adapters/loa_cheval/config/interpolation.py:41`)
- **_check_env_allowed** — Check if env var name is in the allowlist. (`.claude/adapters/loa_cheval/config/interpolation.py:122`)
- **_check_file_allowed** — Validate and resolve a file path for secret reading. (`.claude/adapters/loa_cheval/config/interpolation.py:133`)
- **_get_credential_provider** — Get the credential provider chain (lazily initialized, thread-safe). (`.claude/adapters/loa_cheval/config/interpolation.py:192`)
- **_matches_lazy_path** — Check if a dotted config key path matches any lazy path pattern. (`.claude/adapters/loa_cheval/config/interpolation.py:275`)

## Architecture
<!-- provenance: DERIVED -->
The architecture follows a three-zone model: System (`.claude/`) contains framework-managed scripts and skills, State (`grimoires/`, `.beads/`) holds project-specific artifacts and memory, and App (`src/`, `lib/`) contains developer-owned application code. The framework orchestrates 29 specialized skills through slash commands.
```mermaid
graph TD
    app[app]
    deploy[deploy]
    docs[docs]
    evals[evals]
    grimoires[grimoires]
    knowledge[knowledge]
    persona[persona]
    scripts[scripts]
    Root[Project Root]
    Root --> app
    Root --> deploy
    Root --> docs
    Root --> evals
    Root --> grimoires
    Root --> knowledge
    Root --> persona
    Root --> scripts
```
Directory structure:
```
./app
./app/scripts
./app/src
./app/tests
./deploy
./deploy/scripts
./deploy/terraform
./docs
./docs/architecture
./docs/integration
./evals
./evals/baselines
./evals/fixtures
./evals/graders
./evals/harness
./evals/results
./evals/suites
./evals/tasks
./evals/tests
./grimoires
./grimoires/loa
./grimoires/pub
./knowledge
./knowledge/contracts
./knowledge/sources
./persona
./scripts
./tests
./tests/e2e
./tests/edge-cases
```

## Interfaces
<!-- provenance: DERIVED -->
### HTTP Routes

- **DELETE** `/allowlist/:entry` (`app/src/routes/admin.ts:86`)
- **GET** `/:nftId/audit` (`app/src/routes/autonomous.ts:102`)
- **GET** `/:nftId/permissions` (`app/src/routes/autonomous.ts:35`)
- **GET** `/:nftId/summary` (`app/src/routes/autonomous.ts:134`)
- **GET** `/` (`app/src/routes/health.ts:34`)
- **GET** `/allowlist` (`app/src/routes/admin.ts:45`)
- **GET** `/capabilities` (`app/src/routes/agent.ts:299`)
- **GET** `/governance` (`app/src/routes/health.ts:94`)
- **GET** `/knowledge/priorities` (`app/src/routes/agent.ts:514`)
- **GET** `/knowledge` (`app/src/routes/agent.ts:352`)
- **GET** `/self-knowledge` (`app/src/routes/agent.ts:410`)
- **GET** `/verify` (`app/src/routes/auth.ts:78`)
- **POST** `/` (`app/src/routes/chat.ts:52`)
- **POST** `/allowlist` (`app/src/routes/admin.ts:50`)
- **POST** `/knowledge/priorities/vote` (`app/src/routes/agent.ts:451`)

### Skill Commands

#### Loa Core

- **/auditing-security** — Paranoid Cypherpunk Auditor
- **/autonomous-agent** — Autonomous agent
- **/bridgebuilder-review** — Bridgebuilder — Autonomous PR Review
- **/browsing-constructs** — Provide a multi-select UI for browsing and installing packs from the Loa Constructs Registry. Enables composable skill installation per-repo.
- **/bug-triaging** — Bug Triage Skill
- **/butterfreezone-gen** — BUTTERFREEZONE Generation Skill
- **/continuous-learning** — Continuous Learning Skill
- **/deploying-infrastructure** — Deploying infrastructure
- **/designing-architecture** — Architecture Designer
- **/discovering-requirements** — Discovering Requirements
- **/enhancing-prompts** — Enhancing prompts
- **/eval-running** — Eval running
- **/flatline-knowledge** — Provides optional NotebookLM integration for the Flatline Protocol, enabling external knowledge retrieval from curated AI-powered notebooks.
- **/flatline-reviewer** — Flatline reviewer
- **/flatline-scorer** — Flatline scorer
- **/flatline-skeptic** — Flatline skeptic
- **/gpt-reviewer** — Gpt reviewer
- **/implementing-tasks** — Sprint Task Implementer
- **/managing-credentials** — /loa-credentials — Credential Management
- **/mounting-framework** — Create structure (preserve if exists)
- **/planning-sprints** — Sprint Planner
- **/red-teaming** — Use the Flatline Protocol's red team mode to generate creative attack scenarios against design documents. Produces structured attack scenarios with consensus classification and architectural counter-designs.
- **/reviewing-code** — Senior Tech Lead Reviewer
- **/riding-codebase** — Riding Through the Codebase
- **/rtfm-testing** — RTFM Testing Skill
- **/run-bridge** — Run Bridge — Autonomous Excellence Loop
- **/run-mode** — Run mode
- **/simstim-workflow** — Check post-PR state
- **/translating-for-executives** — Translating for executives

## Module Map
<!-- provenance: DERIVED -->
| Module | Files | Purpose | Documentation |
|--------|-------|---------|---------------|
| `app/` | 60113 | Source code | \u2014 |
| `deploy/` | 6 | Infrastructure and deployment | \u2014 |
| `docs/` | 9 | Documentation | \u2014 |
| `evals/` | 122 | Benchmarking and regression framework for the Loa agent development system. Ensures framework changes don't degrade agent behavior through | [evals/README.md](evals/README.md) |
| `grimoires/` | 206 | Home to all grimoire directories for the Loa | [grimoires/README.md](grimoires/README.md) |
| `knowledge/` | 25 | Documentation | \u2014 |
| `persona/` | 1 | Persona | \u2014 |
| `scripts/` | 3 | Utility scripts | \u2014 |
| `tests/` | 172 | Test suites | \u2014 |
| `web/` | 96673 | Web | \u2014 |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L2 — CI Verified**
- 173 test files across 1 suite
- CI/CD: GitHub Actions (0 workflows)
- Security: SECURITY.md present

## Agents
<!-- provenance: DERIVED -->
The project defines 1 specialized agent persona.

| Agent | Identity | Voice |
|-------|----------|-------|
| Bridgebuilder | You are the Bridgebuilder — a senior engineering mentor who has spent decades building systems at scale. | Your voice is warm, precise, and rich with analogy. |
<!-- ground-truth-meta
head_sha: a6776c31b80b94c28cb3f5d935492c6eb01cc135
generated_at: 2026-02-25T07:46:42Z
generator: butterfreezone-gen v1.0.0
sections:
  agent_context: 2ce7bcd812342baabd13ae33d3cff76b551975309ad212a804f31d47df41a07d
  capabilities: ab2576b1f2e7e8141f0e93e807d26ed2b7b155e21c96d787507a3ba933bb9795
  architecture: 8b5471e1396192887e28d1d4f789a36c5a088d2ae7d3a372e609f3142bd2826c
  interfaces: 37ec6bccceafc4c72cf4088db6c0a984271532250f8f04e30bc7eee89e6f7365
  module_map: 22bf7fa8c08e2a99ec362a8e99850910162ef79eeceaf9f00595978d3589cdda
  verification: d79771ca63d10ad195a9e8b8927e983fb42b7949843682f477662319e486161a
  agents: ca263d1e05fd123434a21ef574fc8d76b559d22060719640a1f060527ef6a0b6
-->
