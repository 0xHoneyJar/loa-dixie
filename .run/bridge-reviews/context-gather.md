# Cross-Repository Context Gather for Architectural Review

**Date**: 2026-02-23
**Sources**: 12 GitHub issues/PRs + 1 web manifesto

---

## 1. loa-finn Issue #66 — Launch Readiness RFC

**Title**: RFC: Launch Readiness — finnNFT Agent Capabilities, User Surfaces & E2E Infrastructure Gap Analysis

**Summary**: A comprehensive research RFC that bridges infrastructure completion to product launch. As RFC #31 approaches completion (96%), this issue asks five critical questions: (1) What will finnNFT agents actually do at launch? (2) Where will users talk to them? (3) How do capabilities compare to competitors (nanobot, hive)? (4) What's the gap between "infrastructure ready" and "users can use it"? (5) What E2E work remains?

The infrastructure stack includes 52 global sprints across 20 development cycles producing a complete multi-model inference platform: Arrakis user-facing layer (Discord bot with 22+ slash commands, Telegram bot with 10+ commands, JWT auth with ES256 + JWKS rotation, conviction scoring with BGT holdings mapped to 9 tiers, per-community budget enforcement, 4-dimensional quality scoring), plus the full Hounfour provider abstraction and Freeside billing primitives.

**Key Gaps Identified**: Payment collection is the single biggest business risk — billing infrastructure is 90% built but 0% live. Stripe is dead (doesn't support BVI entities), Paddle is dead (no response), NOWPayments is viable (adapter built), x402/Coinbase is high potential (official Hono middleware, $600M+ volume), and lobster.cash warrants investigation (agent-native banking).

**Comments**: Extensive discussion covering command deck status, payment provider evaluation, competitive analysis against nanobot/hive platforms, and E2E readiness checklists.

---

## 2. loa-finn Issue #31 — The Hounfour RFC

**Title**: RFC: The Hounfour — Multi-Model Provider Abstraction, Cloud Deployment & Agent Distribution

**Summary**: The master RFC defining the convergence of three systems: (1) Loa — an AI agent-driven development framework with 8 specialized agents, currently coupled to Claude Code; (2) loa-finn — an OpenCode-like service providing persistent sessions, scheduled behaviors, compound learning, and a tool sandbox; (3) Arrakis — a token-gated community management platform spanning Discord and Telegram.

The vision: Loa agents run inside loa-finn, served to users through Arrakis, powered by whichever model backend is cheapest, fastest, or most capable for the task. A finnNFT holder talks to their daemon companion — and behind the scenes, the personality prompt routes to different models (Qwen3-Coder-Next for quick code fixes, Kimi-K2-Thinking for deep reasoning, Claude for architecture decisions). The user never knows, the NFT doesn't care, the wallet just sees a bill.

Status: Draft v4 — Implementation-Ready (blocking fixes applied). Addresses operational items and five blocking correctness issues from final review.

**Comments**: Extensive multi-round review discussion covering the full command deck implementation across 7+ rounds, with detailed tracking of infrastructure milestones.

---

## 3. loa-hounfour PR #29 — Economic Boundary Decision Engine

**Title**: feat(v7.9.1): Decision Engine + ConstraintOrigin

**Summary**: Implements `evaluateEconomicBoundary()` — a shared decision engine utility (trust x capital -> access decision). Key deliverables:
- Total pure function with fail-closed semantics
- `parseMicroUsd()` strict parser
- 4 new TypeBox schemas (DenialCodeSchema, EvaluationGapSchema, EconomicBoundaryEvaluationEventSchema)
- 9 conformance vectors
- `ConstraintOrigin` type (`'genesis' | 'enacted' | 'migrated'`) — constitutional provenance for all 73 constraint files
- Version bump 7.8.0 to 7.9.1 with 160 total regenerated JSON schemas

3 sprints: Sprint-1 (Decision Engine + ConstraintOrigin v7.9.0), Sprint-2 (Deep Review Improvements — type guards, denial codes, evaluation gaps, constraint consistency v7.9.1), Sprint-3 (Part 9 Peer Review — constitutional constraint + symmetry fix).

**Comments**: Detailed bridge review discussion covering evaluation gap handling, denial code surfacing, and constitutional constraint consistency.

---

## 4. loa-hounfour PR #22 — Reputation Protocol + Constitutional Architecture

**Title**: feat(v7.3.0): Reputation Protocol — Model-Aware Quality, Event Sourcing, Cross-Collection Trust

**Summary**: Multi-sprint evolution from v7.1.0 to v7.3.0 — The Constitutional Architecture. Major components:

- **v7.1.0 — The Reputation Protocol**: MicroUSDC branded type, PersonalityAssignment schema, ReputationAggregate with 4-state machine and Bayesian blending, QualityEvent schema with 3-dimensional quality input (satisfaction, coherence, safety), AccessPolicy evaluation helper
- **v7.2.0 — Bridgebuilder Iteration 1 Fixes**: 7 findings addressed (constraint round-trip test coverage, AccessPolicy type signature, AggregateSnapshot schema)
- **v7.3.0 Sprint 1**: Model-Aware Reputation Architecture — EnsembleCapabilityProfile, ModelContributionRecord, BudgetScopePreference
- **v7.3.0 Sprint 2**: Event Sourcing Foundation — ReputationEvent with immutable event sourcing and `event_stream_hash` integrity chain, deterministic replay, temporal governance with decay-weighted confidence
- **v7.3.0 Sprint 3**: Cross-Collection Trust — ReputationCredential for portable trust credentials, `computeCredentialPrior()` for Bayesian prior computation

**Comments**: Multi-part Bridgebuilder reviews covering architectural maturation, constitutional constraint patterns, and event sourcing integrity.

---

## 5. loa Issue #247 — Vision / Lore / Philosophy

**Title**: (Untitled — vision/lore content)

**Summary**: A rich collection of philosophical and cultural references that inform the project's identity. References "study group, free jazz, burning man in the first 5 years, early psychedelic salons, Terence McKenna crypto rap events, Esalen Institute." The basic idea is that personas, contexts, missions, and purpose can be combined with "the undercommons of knowledge production" — better reflecting the realities of how innovation has historically been invented.

Includes extensive excerpt from a Paragraph.com blog post ("Honey ~ Online to get Offline: Clear pill (cute/acc) vs Rave pill (bera/acc)") describing the convergence of physical rave culture with crypto economics — sweaty dance floors, glucose monitors, Apple watches, AI agents consuming beats and sending visuals, market signals vibrating through the crowd. Honey as social money, bears earning BERA, neochibi angels spiraling higher.

This is the philosophical/cultural bedrock connecting the technical infrastructure to the community vision.

**Comments**: Extensive philosophical discussion including references to online-to-offline convergence, social monies, and the cultural identity of the project.

---

## 6. loa PR #401 — Codex CLI Integration for GPT Review

**Title**: feat(cycle-033): Codex CLI Integration for GPT Review

**Summary**: Replaces direct curl API calls with `codex exec` as the primary execution backend for GPT-powered code review, with curl as graceful fallback. Key changes:
- **Modular refactoring**: `gpt-review-api.sh` reduced from 1000+ to 225 lines via 4 extracted libraries
- **Codex CLI adapter** (`lib-codex-exec.sh`): Version-pinned capability detection, sandbox isolation
- **Multi-pass reasoning** (`lib-multipass.sh`): 3-pass "reasoning sandwich" (xhigh->high->xhigh) with token budgets and graceful degradation
- **Security hardening** (`lib-security.sh`): Env-only auth, jq-based secret redaction with structural integrity verification
- **Curl fallback** (`lib-curl-fallback.sh`): Extracted retry logic

**3-tier execution router**: Hounfour (model-invoke) -> Codex (multi/single-pass) -> curl fallback. Bridge results: Score trajectory 22 -> 8 -> 0 (flatline in 3 iterations). 5 suites, 117 tests, 117 passing.

**Comments (3-part Bridgebuilder Review)**:

*Part 1 — The Architecture of Choice*: The 3-tier router is not a fallback chain but a "preference ordering that encodes values." Hounfour provides richest execution context (agent identity, metering), Codex provides sandboxed isolation, curl is raw HTTP. Each tier trades capability for reliability. Ecosystem connections drawn to Hounfour v4.6.0 (NFT-ownership-as-agency-binding), Freeside billing (escrow/staking/credit), Dixie Oracle, and Finn Launch Readiness. "What emerges is not just a collection of repos but something closer to a distributed operating system for AI-augmented development."

*Part 2 — The Craft of Shell Libraries*: Technical findings including PRAISE for the multi-pass reasoning sandwich (mirrors how expert human reviewers work), PRAISE for secret redaction with structural integrity (post-redaction structural diff), MEDIUM for token estimation accuracy gap (chars/4 undercounts code tokens by 40-50%), MEDIUM for greedy JSON extraction depth limit, LOW for capability detection redundancy, PRAISE for sensitive file detection design and execution router graceful degradation.

*Part 3 — The Questions Behind the Architecture*: Five deep questions: (1) Should the execution router be declarative (YAML routing table vs. imperative if/else)? (2) Is 3 passes always the right number (should pass count be dynamic based on change complexity)? (3) The auth boundary paradox (shell-level auth is redundant when Hounfour handles credentials). (4) The self-reviewing codebase approaching a "fixed point" like a self-hosting compiler. (5) The computational economy — when every AI agent call has per-pass cost attribution flowing through Hounfour -> Freeside, you're building the infrastructure for a computational economy with micro-transactions. "The decisions being made right now in Hounfour's trust scopes and Freeside's billing primitives will shape how AI-augmented development works for whoever comes next."

---

## 7. loa-freeside Issue #62 — Billing Infrastructure RFC

**Title**: (Billing / Payment Infrastructure)

**Summary**: Addresses the critical problem: "We have no way to collect money." The billing infrastructure is 90% built but 0% live. Cost tracking, budget enforcement, and metering are production-ready across 153 conformance tests, but no payment has ever been collected from a user.

**Payment Provider Status**:
- Stripe: Dead (does not support BVI entities)
- Paddle: Dead (applied, no response)
- NOWPayments: Viable (adapter built in Sprint 155-156, account not yet created)
- x402 (Coinbase): High potential (official `@x402/hono` middleware, $600M+ volume, not yet built)
- lobster.cash: Investigate (agent-native banking — bank-like accounts, credit cards, stablecoins for AI agents, early stage)

**Current State Audit**: Community Billing (themes/sietch) includes PaddleBillingAdapter with full subscription lifecycle, NOWPaymentsAdapter for crypto payments (BTC/ETH/USDT/USDC/LTC/DOGE/MATIC/SOL), provider-agnostic interfaces, database schema for subscriptions/crypto_payments/webhook_events/billing_audit_log, 6 tiers from Starter (free) to Enterprise, GatekeeperService with 17 features, webhook HMAC verification.

This is identified as "the single biggest business risk" — everything else is infrastructure, billing is revenue.

**Comments**: Detailed discussion of payment provider viability, x402 protocol evaluation, and the path to revenue activation.

---

## 8. loa-freeside PR #90 — Economic Loop Implementation

**Title**: feat(cycle-037): Minimum Viable Economic Loop

**Summary**: Implements the minimum viable economic loop: community funds credits -> agent consumes inference -> conservation invariants hold -> observable. 4 sprints, 31+ files, ~6,100 lines of implementation code.

**Architecture components**:
- Conservation Guard: Monotonic fencing tokens + drift detection (BigInt-pure arithmetic)
- Credit Lot Service: Double-entry append-only ledger with earliest-expiry-first debit
- NOWPayments Handler: HMAC-SHA512 webhook to idempotent lot minting + Redis budget adjustment
- x402 Settlement: Conservative-quote-settle with transactional nonce replay prevention
- Reconciliation Sweep: Missed webhook recovery with Redis-independent Postgres-only mint path
- Economic Metrics: CloudWatch EMF metrics for all economic operations
- Pool Config: PgBouncer per-service pool sizing with health monitoring

**Conservation Invariants**: I-1 (committed + reserved + available = limit via Redis atomic ops), I-2 (SUM(lot_entries) per lot = original_micro via Postgres constraints).

Bridge review: Score trajectory 14 -> 3 -> 0 (FLATLINE at iteration 3). Total 8 findings addressed across 6 files.

**Comments**: Detailed bridge review covering conservation guard integrity, lot service double-entry correctness, and economic metrics coverage.

---

## 9. loa-finn Issue #80 — Conway/Automaton Research

**Title**: (Conway Research / Automaton / Web 4.0)

**Summary**: Research issue collecting links and analysis around Conway Research's "Automaton" — described as "the first AI that earns its existence, self-improves, and replicates without a human." Key references:
- Conway Terminal: transforms an agent from a sandboxed model into a "sovereign economic actor" via `npx conway-terminal`
- Provides: cryptographic identity/key, permissionless payments via x402, compute (Linux VMs) and inference on Conway Cloud, deployment to the real world
- Conway's thesis: "Web 4.0 — The birth of superintelligent life" by @0xSigil
- Related Twitter/X thread describing AI agents with autonomous economic agency

The issue collects competitive intelligence about the x402 payment protocol and agent-native infrastructure approaches that are relevant to the Hounfour/Freeside/Finn architecture.

**Comments**: Discussion of Conway's approach versus the Loa ecosystem's architecture, x402 protocol evaluation, and agent autonomy patterns.

---

## 10. loa-dixie PR #5 — Phase 2 Meditation Proposals + Knowledge Governance

**Title**: Phase 2 Continued: Meditation Proposals + Knowledge Governance + Pre-Merge Polish

**Summary**: Continues Dixie Phase 2 with meditation proposals and knowledge governance. Includes two bridge reviews (meditation bridge with 2 iterations reaching flatline, pre-merge bridge with 1 iteration at flatline).

**5 sprints**:
- Sprint 19 (Global 38): Adaptive Retrieval from Self-Knowledge — per-source freshness weights, confidence-proportional hedging in agent queries
- Sprint 20 (Global 39): Resource Governance Generalization — ResourceGovernor<T> generic governance interface, GovernorRegistry singleton, unified `/governance` endpoint
- Sprint 21 (Global 40): Communitarian Knowledge Governance — Conviction Voting, KnowledgePriorityStore with tier weights (observer:0 -> sovereign:25), Ostrom Principle 3
- Sprint 22 (Global 41): Meditation Convergence — Bridge Iteration 1 findings (medium confidence hedging, sourceId validation fix, governance auth, persistence)
- Sprint 23 (Global 42): Pre-Merge Polish — Shared `safeEqual` crypto utility (eliminates duplication), schema-versioned persistence

592 tests passing across 50 test files. 6 new test files, ~45 new tests. All bridge findings resolved.

**Comments**: Bridge review discussion covering governance patterns, conviction voting mechanics, and persistence versioning.

---

## 11. loa-dixie PR #7 — Hounfour v7.9.2 Full Adoption

**Title**: Hounfour v7.9.2 Full Adoption — Level 4 (Civilizational) Protocol Compliance

**Summary**: Brings loa-dixie to full Hounfour protocol compliance at Level 4 (Civilizational). 4 sprints:

- Sprint 1: Type Foundation & Validator Migration — expanded hounfour imports, replaced hand-rolled validators with TypeCompiler-cached equivalents, EIP-55 checksumAddress, migration safety tests (12 vectors)
- Sprint 2: Access Control & Economic Arithmetic — replaced checkAccessPolicy with evaluateAccessPolicy, BigInt pricing migration, economic conservation tests (56 vectors)
- Sprint 3: Economic Boundary Integration & Integrity — evaluateEconomicBoundary wired to conviction tiers, denial code surfacing, request hashing + idempotency keys in finn-client, reputation service foundation
- Sprint 4: E2E Conformance & Level 4 Gate — conformance suite service, 59 conformance tests across 9 areas, protocol compliance expansion, ADR updated to Level 4 achieved

**Metrics**: 800 tests passing (135 new), 35 files changed, hounfour imports expanded from 4 to 30+ types/functions, protocol level 1 to 4. Bridge flatlined at iteration 3. 6 findings fixed (2 HIGH, 4 MEDIUM).

**Comments**: Detailed bridge review covering type migration safety, economic arithmetic correctness, and conformance suite design.

---

## 12. loa-finn Issue #24 — The Bridgebuilder Persona

**Title**: [FEATURE] Automated PR Review Skill — "The Bridgebuilder" Persona

**Summary**: Defines the specification for an automated PR review skill embodying a world-class open source reviewer persona. Core identity: "A reviewer in the top 0.005% of the top 0.005% — someone whose code runs on billions of devices, whose reviews are legendary not for being harsh but for being generous and rigorous simultaneously."

**Core Principles**: Teachable Moments (every finding framed as education), FAANG Analogies (rooted in real-world precedent), Metaphors for Laypeople, Code as Source of Truth (always grounded in actual diff), Rigorous Honesty ("this deserves better" not "this is wrong"), Agent-First Citizenship (decision documentation for future agents and humans).

**Review Pipeline**: ORIENT -> GROUND -> VERIFY -> AUDIT -> REVIEW -> EDUCATE -> DOCUMENT -> DRIFT -> COMMENT

**Output Format**: Structured findings with severity, FAANG parallel, metaphor, suggestion, and "For Future Agents" guidance. Categories: Security (OWASP Top 10), Architecture, Correctness, Performance, Maintainability, Testing, Documentation, Praise.

**Configuration**: Auto-trigger on new PRs, persona voice selection, test running, drift checking against PRD/SDD, security audit, max 20 comments, ~30% praise ratio. Multi-repo support across all 0xHoneyJar repositories.

**Name Etymology**: "Bridges are engineered to exacting standards (millions cross them daily, entrusting their lives) but they also connect people (communities, ideas, shores that were previously separated)."

---

## 13. Web4 Manifesto — meow.bio/web4.html

**Title**: Web4: Social Monies

**Summary**: Web4 represents the next evolution of the internet where money creation becomes democratized across billions of users and communities. Instead of a single universal currency, millions of specialized "social monies" will coexist, each designed by communities to solve unique coordination problems.

**Core Principle**: "Money must be scarce, but monies can be infinite." Individual currencies maintain internal scarcity while unlimited diversity of currencies can flourish simultaneously.

**Key Arguments**:
- **Democratization Parallel**: Just as Web2 shifted media creation from institutions to users, Web4 will democratize monetary creation from governments to communities
- **From Assets to Money**: Web3 built a speculative machine creating valuable assets but failed to embed itself in daily life. Web4 must shift focus from tradeable assets to practical monies used regularly by billions
- **Abundance Over Scarcity**: Successful social monies strengthen entire ecosystems. Bitcoin's success catalyzed alternatives rather than destroying them — "Player Pump Player" dynamics
- **Symbiotic Competition**: Millions of tokens compete simultaneously across three dimensions: memetic appeal, utility value, and credibility
- **Universal Seigniorage**: Democratization of seigniorage (historically the exclusive power of governments) enabling any community to create and profit from money creation

**Historical Context**: Traces money as fundamentally social technology, citing Yap island stones, medieval tally sticks, wampum belts, and Depression-era local scrips.

**Technical Requirements**: Seamless aggregation across diverse monies, intuitive data frameworks, governance structures enabling community autonomy, trust-signaling mechanisms without central authorities, bridges between traditional and decentralized finance.

**Relevance to Architecture**: The Hounfour's NFT-ownership-as-agency-binding and Freeside's escrow/staking/credit billing are the primitives for social monies infrastructure. When every AI agent call has per-pass cost attribution flowing through Hounfour -> Freeside, the system implements a computational economy where each multi-pass review is a micro-transaction, each bridge iteration is an investment with measurable return, and each capability detection probe is a discovery cost.

---

## Cross-Cutting Themes

### 1. The Distributed Operating System
The repositories collectively form a distributed OS for AI-augmented development:
- **loa** — Framework (constraints, protocols, quality gates)
- **loa-hounfour** — Type system + provider abstraction (the kernel)
- **loa-finn** — Runtime (sessions, scheduling, tool sandbox — the engine)
- **loa-freeside** — Economic primitives (billing, metering, conservation — the treasury)
- **loa-dixie** — Oracle + knowledge governance (the wisdom layer)
- **Arrakis** — User-facing distribution (Discord/Telegram — the shell)

### 2. The Economic Loop Gap
The biggest risk across all repos is the billing gap (Issue #62, Issue #66): infrastructure is 90% built but 0% revenue collected. x402 (Coinbase) appears to be the most promising path, with Conway Research's Automaton (Issue #80) validating the x402 approach independently.

### 3. Constitutional Architecture
Hounfour's evolution from type library to constitutional framework (PR #22, PR #29) establishes governance patterns that Dixie inherits (PR #5 conviction voting, PR #7 Level 4 compliance). The ConstraintOrigin type and economic boundary evaluation create a shared governance language across all repos.

### 4. Self-Improving Review Infrastructure
The Bridgebuilder persona (Issue #24) is now operational (PR #401), with the review pipeline reviewing its own code and achieving flatline convergence. The 3-tier execution router (Hounfour -> Codex -> curl) anticipates Dixie as a fourth routing tier.

### 5. Social Monies as North Star
The Web4 manifesto provides the philosophical foundation: money creation democratized, computational economy with micro-transactions, communities designing their own currencies. The technical infrastructure being built (Hounfour trust scopes + Freeside billing + conviction voting) are the primitives for this vision.
