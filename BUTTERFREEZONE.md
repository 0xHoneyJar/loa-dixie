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
version: loa@v1.39.1
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
    tests[tests]
    Root[Project Root]
    Root --> app
    Root --> deploy
    Root --> docs
    Root --> evals
    Root --> grimoires
    Root --> knowledge
    Root --> persona
    Root --> tests
```
Directory structure:
```
./app
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
./knowledge/sources
./persona
./tests
./tests/e2e
./tests/edge-cases
./tests/fixtures
./tests/gold-set
./tests/helpers
```

## Interfaces
<!-- provenance: DERIVED -->
### HTTP Routes

- **DELETE** `/allowlist/:entry` (`app/src/routes/admin.ts:100`)
- **GET** `/:nftId/audit` (`app/src/routes/autonomous.ts:101`)
- **GET** `/:nftId/gaps` (`app/src/routes/learning.ts:53`)
- **GET** `/:nftId/insights` (`app/src/routes/learning.ts:22`)
- **GET** `/:nftId/permissions` (`app/src/routes/autonomous.ts:34`)
- **GET** `/:nftId/summary` (`app/src/routes/autonomous.ts:133`)
- **GET** `/:nftId` (`app/src/routes/memory.ts:135`)
- **GET** `/` (`app/src/routes/health.ts:25`)
- **GET** `/allowlist` (`app/src/routes/admin.ts:59`)
- **GET** `/capabilities` (`app/src/routes/agent.ts:239`)
- **GET** `/knowledge` (`app/src/routes/agent.ts:292`)
- **GET** `/oracle` (`app/src/routes/identity.ts:47`)
- **GET** `/verify` (`app/src/routes/auth.ts:78`)
- **POST** `/:nftId/seal` (`app/src/routes/memory.ts:171`)
- **POST** `/` (`app/src/routes/chat.ts:51`)

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
| `app/` | 60056 | Source code | \u2014 |
| `deploy/` | 6 | Infrastructure and deployment | \u2014 |
| `docs/` | 9 | Documentation | \u2014 |
| `evals/` | 122 | Benchmarking and regression framework for the Loa agent development system. Ensures framework changes don't degrade agent behavior through | [evals/README.md](evals/README.md) |
| `grimoires/` | 58 | Home to all grimoire directories for the Loa | [grimoires/README.md](grimoires/README.md) |
| `knowledge/` | 23 | Documentation | \u2014 |
| `persona/` | 1 | Persona | \u2014 |
| `tests/` | 156 | Test suites | \u2014 |
| `web/` | 96673 | Web | \u2014 |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L2 — CI Verified**
- 157 test files across 1 suite
- CI/CD: GitHub Actions (0 workflows)
- Security: SECURITY.md present

## Agents
<!-- provenance: DERIVED -->
The project defines 1 specialized agent persona.

| Agent | Identity | Voice |
|-------|----------|-------|
| Bridgebuilder | You are the Bridgebuilder — a senior engineering mentor who has spent decades building systems at scale. | Your voice is warm, precise, and rich with analogy. |
<!-- ground-truth-meta
head_sha: 34580e3d7947f5c09fba3aaf1cfb5d49bc371807
generated_at: 2026-02-21T05:27:50Z
generator: butterfreezone-gen v1.0.0
sections:
  agent_context: 58765014d4b1d2099c2917bbc2958aafa67a8bc0717a2aecab4def9162b97839
  capabilities: ab2576b1f2e7e8141f0e93e807d26ed2b7b155e21c96d787507a3ba933bb9795
  architecture: fdc96e78bd0a06581b17eb997d1593cf88917e37bccbfe10beb9f94e31026a4e
  interfaces: 55125fdf09985fc93e1c8dad1c4cc88dce14287a2bd03d296f3c4d5aff97e7fd
  module_map: fb550c56b7bec2841adc1874734a92024f26f4d53afbba2a65ad7a30a66d6665
  verification: c3957dbf54ca4365ee41e393b8a4d4e24f6e746c31b81b1c9387dc147544664d
  agents: ca263d1e05fd123434a21ef574fc8d76b559d22060719640a1f060527ef6a0b6
-->
