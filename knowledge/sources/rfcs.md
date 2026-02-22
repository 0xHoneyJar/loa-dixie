---
generated_date: "2026-02-16"
source_repo: 0xHoneyJar/loa-finn
provenance: cycle-025-sprint-61-task-2.5
curator: bridgebuilder
max_age_days: 60
---

# RFCs and Design Discussions

Curated summaries of the key Requests for Comments (RFCs) that shaped the loa-finn ecosystem. Each RFC represents a significant architectural decision point with lasting impact on how the system was built.

---

## RFC #31 (loa-finn): Hounfour Multi-Model Architecture

**Status**: Implemented (Phases 0-5 complete across cycles 6-9, 18-20)
**Issue**: `loa-finn#31`
**Related Cycles**: 6, 7, 8, 9, 18, 19, 20

### Summary

The foundational RFC for the multi-model provider abstraction layer. Hounfour (named after the Vodou temple where the loa spirits are served) defines how loa-finn routes agent invocations across multiple AI model providers without coupling agents to any single provider.

### Key Decisions

**1. Provider Registry Pattern**

The system maintains a registry of available model providers, each described by capabilities (context window, tool calling support, thinking traces), cost characteristics, and health status. Agents declare their requirements (minimum context window, tool calling, etc.) and the router resolves the best available provider at invocation time.

This is a port/adapter architecture: the core routing logic knows nothing about specific providers. Each provider implements a standard adapter interface (`loa-hounfour/src/types.ts#AdapterInterface`). Adding a new provider means implementing one adapter — no changes to routing, billing, or agent binding logic.

**2. Cheval Subprocess Model**

The original `cheval.py` adapter demonstrates the subprocess pattern: loa-finn spawns a Python process for model invocation, communicating via JSON over stdin/stdout. This allowed early prototyping with Python model SDKs while the TypeScript adapter layer matured.

The name "cheval" comes from Vodou tradition — the human vessel mounted by a loa spirit. In this context, the subprocess is the vessel that carries the model invocation.

**3. Budget Enforcement**

Multi-level budget enforcement prevents runaway costs:

- **Scope-level budgets**: Each tenant or API key has a cumulative spending limit. The budget circuit breaker (`loa-finn/src/hounfour/router.ts#HounfourRouter`) checks cumulative spend before accepting new requests.
- **Per-request estimation**: Token count estimation (chars/4 heuristic) provides pre-invocation cost estimates.
- **Post-invocation metering**: Actual provider-reported tokens are recorded for accurate billing.
- **Cost ledger**: Append-only cost records with checkpoint-based O(1) recovery.

**4. Health Probing**

Providers are periodically probed for availability. Unhealthy providers are excluded from routing decisions. The health check runs at configurable intervals and uses the provider's native health endpoint or a lightweight inference call.

**5. Pool-Based Routing**

Model pools group instances of the same model across providers. Pool claims (see RFC #27) determine which pools a tenant can access. The router selects from available pools based on the agent's requirements, the pool's capabilities, and current health status.

### Architectural Impact

Hounfour is the backbone of loa-finn. Every agent invocation flows through the Hounfour router. The abstraction enabled:

- Transparent failover between providers
- Cost optimization by routing to cheaper models when requirements allow
- Model sovereignty — tenants can bring their own keys (BYOK) for specific providers
- The Oracle knowledge enrichment pipeline, which inserts between persona load and model invocation within the existing router flow

### Implementation Map

| Phase | Cycle | Key Deliverables |
|-------|-------|-----------------|
| Phase 0: Foundation | 6 | cheval.py, config system, cost ledger |
| Phase 1: Flatline + Budget | 6 | Multi-model adversarial review, budget enforcement |
| Phase 2: Portability + Health | 6 | Provider abstraction, health probing |
| Phase 3: Server Integration | 7 | Sidecar, streaming, Redis state, GPU deployment |
| Phase 4: Freeside Distribution | 8 | ECS gateway, token gating, billing settlement |
| Phase 5: Integration | 18 | Protocol extraction, NativeRuntime, ensemble, finnNFT routing |
| Pool Claim Enforcement | 20 | Confused deputy prevention, composed auth middleware |

---

## RFC #27 (loa-finn): finnNFT Identity and Access

**Status**: Partially implemented (routing implemented in cycle 18; on-chain minting deferred)
**Issue**: `loa-finn#27`
**Related Cycles**: 18 (sprint-46), future cycle for smart contract work

### Summary

Defines the NFT-based per-agent identity and access control model. Each agent persona has a unique identity tied to an NFT, enabling per-agent routing, Bring Your Own Key (BYOK) proxy, and eventually on-chain sovereignty via dynamic NFTs (dNFTs).

### Key Decisions

**1. Per-Agent Routing via NFT Claims**

JWT tokens carry pool claims that map to specific model pools. The pool claim enforcement middleware (`loa-finn/src/hounfour/pool-claim-enforcement.ts`) validates that a request's JWT claims match the pools it attempts to access. This prevents the confused deputy problem — a valid JWT for Agent A cannot be used to access Agent B's model pools.

The pattern mirrors Stripe's idempotency keys: each request carries a cryptographic proof of authorization that is validated before any resource is consumed.

**2. BYOK Proxy**

Bring Your Own Key allows tenants to provide their own API keys for specific model providers. The BYOK proxy routes requests through the tenant's own provider account, bypassing the shared pool. This enables:

- Cost isolation: tenant pays their own provider directly
- Model access: tenant can use models not in the shared pool
- Privacy: prompts never touch the shared billing path

**3. dNFT Vision (Deferred)**

The long-term vision is for agent personas to hold dynamic NFTs that evolve based on usage patterns, knowledge acquisition, and reputation. The Oracle, for example, would eventually hold a dNFT that encodes its knowledge domain, query history, and accuracy metrics.

This requires smart contract work and is explicitly deferred to a future cycle (see PRD non-goal NG3).

### Architectural Impact

finnNFT establishes the identity layer for the agent ecosystem. Pool claim enforcement is the production access control mechanism. The dNFT vision connects the agent runtime to the web4 philosophical framework — agents as on-chain entities with sovereign identity.

### Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Pool claim enforcement | Implemented | `loa-finn/src/hounfour/pool-claim-enforcement.ts` |
| Composed auth middleware | Implemented | `loa-finn/src/hounfour/` |
| BYOK proxy | Implemented | Cycle 18, Sprint-46 |
| JWT pool claims | Implemented | ES256 enforcement, cycle 24 |
| dNFT minting | Deferred | Future cycle |
| On-chain identity | Deferred | Future cycle |

---

## RFC #66 (loa-finn): Launch Readiness and Knowledge Interface

**Status**: Active (cycle 25 in progress)
**Issue**: `loa-finn#66`
**Related Cycles**: 22, 23, 24, 25

### Summary

The command center issue that tracked the transition from infrastructure building to product deployment. Originally focused on launch readiness (E2E verification, shadow deploy, production deploy), it evolved to encompass the Oracle knowledge interface as the first product feature.

### Key Decisions

**1. E2E Verification Before Deploy**

Issue #66 mandated end-to-end billing wire verification before production deployment. Cycle 22 delivered this: proving that JWT auth, model routing, billing metering, and billing finalize all work together against real containers. This caught 5 integration mismatches that unit tests could not have found (JWT algorithm mismatch, field naming conventions, identity field discrepancy, URL path error, Docker configuration).

**2. DLQ Persistence (Ostrom Principle 7)**

The Bridgebuilder Deep Review on PR #71 identified that the dead letter queue (DLQ) for failed billing settlements needed persistence across restarts. The DLQ stores billing records that failed to settle — losing them means losing revenue. The implementation follows Elinor Ostrom's 7th principle for governing commons: graduated sanctions. Failed settlements get progressive retry with exponential backoff, eventually persisting to durable storage for manual intervention.

**3. Conservation Invariant**

The billing conservation invariant states: for every model invocation, the sum of (metered cost + DLQ'd failures) must equal the total cost. No invocation can result in untracked spending. This invariant is enforced at the type level and tested with golden vectors.

**4. The Oracle as First Product**

The pivot from "launch the infrastructure" to "launch a knowledge product" recognized that the best way to demonstrate the agent runtime is to build something useful with it. The Oracle uses every system built across 24 cycles: Hounfour routing, billing, JWT auth, agent personas, and now knowledge enrichment.

### Architectural Impact

Issue #66 is the central coordination point for production readiness. Its Bridgebuilder field reports (46+ comments) contain some of the most architecturally significant observations about the system, including the conservation invariant as social contract and the permission scape concept.

---

## RFC #74 (loa-finn): The Oracle — Unified Knowledge Interface

**Status**: Active (cycle 25, sprint 61 in progress)
**Issue**: `loa-finn#74`
**Related Cycles**: 25

### Summary

The Oracle RFC. Defines a unified knowledge synthesis layer that enables anyone to query the ecosystem at any level of abstraction — from function signatures to philosophical foundations — and receive answers grounded in the actual codebase, design documents, and development history.

### Key Decisions

**1. Option C Architecture: Oracle as Agent Persona**

Three options were evaluated:

- **Option A**: Standalone knowledge service with its own infrastructure
- **Option B**: Separate microservice sharing infrastructure with loa-finn
- **Option C**: Oracle as loa-finn's first knowledge-enhanced agent persona

Option C was selected for the MVP because it requires no new infrastructure (reuses existing ECS, Terraform, billing, JWT), demonstrates the agent runtime's capability (the system was built to host agent personas), and is backward compatible (knowledge enrichment is opt-in per agent binding).

Graduation criteria for moving to Option B: Oracle query volume exceeds 50% of total invoke traffic, knowledge corpus exceeds deployment constraints, or Oracle requires conflicting infrastructure (e.g., GPU for embeddings).

**2. Concatenation Strategy (Phase 1)**

The MVP uses deterministic concatenation with tag-based source selection rather than vector embeddings or semantic search. Each knowledge source declares tags; the enricher classifies user prompts into tag categories; sources are ranked by tag match count, priority, and ID; and sources are included until the token budget is reached.

This strategy is simple, testable, and deterministic (same prompt always selects same sources). Semantic search is deferred to Phase 2.

**3. Trust Boundary Architecture**

Knowledge content is treated as untrusted reference material at runtime, not as instructions. The enriched system prompt uses a structured template that places trusted persona instructions before a clearly delimited `<reference_material>` block containing the knowledge. This data/instruction separation is the primary defense against prompt injection via knowledge content.

A secondary defense is the knowledge loader's injection detection, which scans all knowledge files for injection patterns. Curated content under `grimoires/oracle/` operates in advisory mode (WARN, not block) to avoid false positives from educational content.

**4. Multi-Level Response Capability**

The Oracle adapts response depth based on question type:

- **Technical**: Code-grounded with file paths, type signatures, function names
- **Architectural**: System-level with design rationale, data flows, pattern names
- **Philosophical**: Vision-grounded with web4 connections, Mibera lore, purpose
- **Educational**: Layered explanation starting simple, offering depth progressively

### Architectural Impact

The Oracle RFC establishes knowledge enrichment as a first-class capability of the Hounfour router. Any agent binding can opt in to knowledge enrichment by declaring a `knowledge` configuration — the Oracle is simply the first to do so.

The knowledge registry, loader, and enricher form a reusable subsystem. Future agent personas (e.g., a coding assistant with codebase knowledge, a design reviewer with RFC knowledge) can leverage the same infrastructure with different knowledge corpora and source selections.

### Three Altitude Levels

| Altitude | Scope | Timeline |
|----------|-------|----------|
| Altitude 1 (MVP) | Knowledge-enriched agent persona via existing invoke API | Cycle 25 |
| Altitude 2 | Semantic search, event-driven refresh, multi-model synthesis | Cycle 26+ |
| Altitude 3 | dNFT identity, Discord/Telegram integration, on-chain sovereignty | Cycle 27+ |

---

## RFC loa#247: Meeting Geometries

**Status**: Proposed (8 geometries defined; selection algorithm deferred)
**Issue**: `loa#247`
**Related Cycles**: Referenced in cycle 25 PRD; Meeting Geometry source created for Oracle knowledge corpus

### Summary

Defines 8 configurations for AI-human collaboration, each describing a different topology of interaction between human participants and AI agents. The geometries provide a vocabulary for describing and selecting collaboration patterns.

### Key Decisions

**1. Eight Named Geometries**

The RFC defines eight distinct meeting geometries: Circle of Equals, Master-Apprentice Pair, Constellation, Solo with Witnesses, Council, Relay, Mirror, and Swarm. Each geometry specifies the number and roles of participants, the direction of information flow, and the decision-making authority distribution.

See `grimoires/oracle/meeting-geometries.md` for full definitions of all 8 geometries.

**2. Ecosystem Mapping**

Each geometry maps to existing ecosystem practices:

- **Mirror**: The Bridgebuilder review model — AI reflects human's work with a different perspective
- **Council**: The Flatline Protocol — multiple models deliberate, human has final decision
- **Relay**: The simstim workflow — sequential handoff between agents
- **Swarm**: Agent Teams — parallel decomposed execution
- **Solo with Witnesses**: Standard pair programming with AI observation

**3. Selection Algorithm (Deferred)**

The RFC proposes that the system could automatically select a meeting geometry based on the type of query or task. This selection algorithm is deferred to a future cycle (cycle 27+). For the MVP, the Oracle knowledge source documents the geometries for human understanding, not automated selection.

### Architectural Impact

Meeting Geometries provide the conceptual framework for understanding how different parts of the Loa ecosystem collaborate. The Flatline Protocol (Council geometry), Bridgebuilder reviews (Mirror geometry), and Agent Teams (Swarm geometry) were all built before this RFC — the RFC provides the vocabulary to describe patterns that already existed.

Future impact: when the selection algorithm is implemented, the system could automatically shift between geometries based on task type, complexity, and available agents. A simple code question might use Solo with Witnesses; a complex architectural discussion might use Council; a large implementation sprint might use Swarm.

---

## Cross-RFC Dependencies

```
RFC #31 (Hounfour)
  ├── RFC #27 (finnNFT) — pool claims use Hounfour routing
  ├── RFC #66 (Launch) — production deploy of Hounfour infrastructure
  │     └── RFC #74 (Oracle) — knowledge enrichment in Hounfour router
  └── RFC loa#247 (Geometries) — collaboration patterns for agent interactions

RFC #27 (finnNFT)
  └── RFC #74 (Oracle) — Oracle as first dNFT candidate (Altitude 3)

RFC loa#247 (Geometries)
  └── RFC #74 (Oracle) — meeting geometry knowledge source
```

### Common Themes Across RFCs

**1. Sovereignty**: Each RFC contributes to the theme of agent and user sovereignty. Hounfour enables model sovereignty (choose your provider). finnNFT enables identity sovereignty (own your agent's identity). The Oracle enables knowledge sovereignty (understand what you have built). Meeting Geometries enable collaboration sovereignty (choose how you work together).

**2. Port/Adapter Architecture**: Every major subsystem uses the hexagonal architecture pattern. Hounfour adapters abstract model providers. Bridgebuilder adapters abstract GitHub interaction. The knowledge loader abstracts file access. This consistency means understanding one subsystem's architecture helps understand all of them.

**3. Gradual Formalization**: Patterns emerge in practice before being formalized in RFCs. Bridgebuilder reviews existed before Meeting Geometries named the Mirror pattern. Budget enforcement existed before the conservation invariant was formally specified. The RFCs capture and name existing reality rather than prescribing future behavior.

**4. Security as Architecture**: Pool claim enforcement, trust boundaries in knowledge enrichment, injection detection in loaders, ES256 JWT enforcement — security is not a bolt-on concern but a structural property of the system. Each RFC includes security considerations as architectural decisions, not afterthoughts.
