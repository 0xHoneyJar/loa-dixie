---
generated_date: "2026-02-17"
source_repo: 0xHoneyJar/loa-finn
provenance: cycle-025-sprint-61-task-2.2
version: "1.0.0"
curator: bridgebuilder
max_age_days: 90
---

# Ecosystem Glossary

Canonical terminology for the 0xHoneyJar ecosystem. Each term includes tag mappings used by the Oracle's keyword classifier for source selection.

---

### Hounfour
**Tags**: technical, architectural
Multi-model provider abstraction layer in loa-finn. Named after the Vodou temple where practitioners gather for ceremony. Routes agent requests through provider pools with budget enforcement, health fallback, and rate limiting. The Hounfour subsystem is the core of loa-finn's routing infrastructure, implementing hexagonal architecture with port/adapter patterns for each model provider. See: `loa-finn/src/hounfour/router.ts#HounfourRouter`.

### Peristyle
**Tags**: architectural
The public-facing gateway of the Hounfour system. Named after the sacred covered space in a hounfour where ceremonies are conducted and the community gathers. In loa-finn, the Peristyle represents the API gateway layer that receives external requests before they enter the routing and enrichment pipeline. Cross-reference: Hounfour, Cheval.

### Cheval
**Tags**: technical
Provider subprocess invoker. Executes model calls in isolated processes with HMAC authentication between the parent router and the child process. French for "horse" — in Vodou tradition, the cheval is the person mounted by a Loa spirit during ceremony. In the codebase, Cheval is the adapter that bridges the Hounfour router to actual model provider APIs. See: `.claude/adapters/cheval.py`.

### Loa
**Tags**: architectural, philosophical
The framework and the agent development system. Named after the spirits in Haitian Vodou tradition who serve as intermediaries. In this ecosystem, "loa" refers to two things: the meta-framework (0xHoneyJar/loa) that provides skills, protocols, and development methodology; and the broader philosophy of agent-driven development. loa-finn is the agent runtime built on the Loa framework. Cross-reference: Finn, Hounfour.

### Finn
**Tags**: technical
The persistent agent runtime built on Pi SDK. Finn is the first production agent in the Loa ecosystem, providing the invoke endpoint, billing integration, and multi-model routing through Hounfour. The name represents the runtime's identity as a distinct operational entity. Repository: 0xHoneyJar/loa-finn. Cross-reference: Loa, Hounfour, Freeside, Dixie.

### Dixie
**Tags**: technical, architectural
The experience orchestration layer (BFF gateway) for the Oracle dNFT agent. Named after the Dixie Flatline from Gibson's Neuromancer — a construct that retains personality and memory. Dixie sits between users and loa-finn, handling JWT authentication, WebSocket proxying, soul memory injection, conviction-gated access, tool event streaming, economic metadata, autonomous operation, NL scheduling, agent API (ERC-6551 TBA), and compound learning. 492 tests across 44 test files. Repository: 0xHoneyJar/loa-dixie. Cross-reference: Finn, Hounfour, Freeside, Oracle.

### Freeside (formerly Arrakis)
**Tags**: architectural, technical
The infrastructure and billing settlement layer. Named after the orbital habitat in Gibson's Neuromancer — a self-contained space station with its own economy and governance. Formerly known as Arrakis. Handles billing finalization, credit ledger CQRS, lot invariant enforcement, usage tracking, and NFT-based access control via x402 micropayments. Graduated identity trust provides 4 levels of verification. Repository: 0xHoneyJar/loa-freeside. Cross-reference: Settlement Protocol, Conservation Invariant, DLQ.

### Settlement Protocol (formerly Spice Gate)
**Tags**: architectural
The billing settlement protocol between loa-finn and Freeside. Uses server-to-server (S2S) JWT authentication with ES256 signing. Formerly named Spice Gate after Dune's spice trade routes. Implements lot invariant conservation (total_cost = sum(line_items)) with atomic counters and DLQ for transient failure recovery. Implemented in BillingFinalizeClient on the loa-finn side. Cross-reference: Freeside, Conservation Invariant.

### Mibera
**Tags**: philosophical
The universe and narrative setting in which the HoneyJar ecosystem exists. Mibera provides the cultural and mythological context for the project — a fictional world where digital entities, economic protocols, and human communities intersect. The lore grounds technical decisions in a coherent narrative tradition. Cross-reference: Web4, finnNFT.

### finnNFT
**Tags**: technical, architectural
NFT-based identity and access control for agents. Each finnNFT holder receives per-model routing preferences and BYOK proxy access. The NFT functions as both an identity credential and a configuration object — a "soul" for the agent that lives on-chain. Planned for future cycles (see RFC #27). Cross-reference: BYOK, Freeside.

### BYOK
**Tags**: technical
Bring Your Own Key — a feature enabling finnNFT holders to provide their own API keys for direct provider access, bypassing the shared provider pools. This enables power users to use their own model provider accounts while still routing through the Hounfour infrastructure for billing and observability. Cross-reference: finnNFT, Pool.

### DLQ
**Tags**: technical
Dead Letter Queue — persistent store for failed billing finalization attempts. When a billing settlement request to Freeside fails (network error, timeout, transient server error), the failed request is persisted to the DLQ for later retry. Implements Ostrom Principle 7 (graduated sanctions) — failures are handled with escalating retry strategies rather than immediate rejection. Cross-reference: Freeside, Settlement Protocol, Conservation Invariant.

### Conservation Invariant
**Tags**: architectural, philosophical
The billing principle that `total_cost = sum(line_items)` at every state transition. This invariant functions as both an accounting rule (ensuring no value is created or destroyed in billing flows) and a social contract (ensuring users are charged exactly for what they consume). The conservation invariant is enforced across the full billing pipeline from token metering through DLQ recovery. Cross-reference: Freeside, Settlement Protocol, DLQ.

### Permission Scape
**Tags**: philosophical, architectural
The design space for multi-model, multi-agent permission systems. Describes how different agents, models, and humans negotiate authority within the ecosystem. The Permission Scape considers questions like: who authorizes a model call? Who bears the cost? Who controls the routing preferences? The concept bridges technical access control with philosophical questions about agency and sovereignty. Cross-reference: finnNFT, BYOK, Web4.

### Web4
**Tags**: philosophical
Monetary pluralism on programmable infrastructure. The guiding philosophy expressed as: "Money must be scarce, but monies can be infinite." Web4 posits that the next evolution of internet infrastructure enables communities to create their own economic protocols — not one global currency, but many purpose-specific value systems coexisting on shared programmable rails. Cross-reference: Mibera, Conservation Invariant, Permission Scape.

### Bridgebuilder
**Tags**: technical, architectural
Autonomous PR review agent that provides multi-perspective code review with educational depth. The Bridgebuilder produces field reports containing FAANG parallels, architectural insights, and teachable moments. It operates through the Run Bridge system (`/run-bridge`) to deliver iterative improvement cycles with kaironic (right-moment) termination. Cross-reference: Oracle, Flatline Protocol.

### Oracle
**Tags**: technical, architectural
Knowledge-enriched agent persona providing unified understanding across the 0xHoneyJar ecosystem. The Oracle loads curated knowledge sources at startup (glossary, architecture docs, code reality snapshots, development history, RFCs, philosophical grounding) and enriches system prompts with relevant context based on tag-based classification. Deployed as a loa-finn agent binding with knowledge enrichment enabled. Cross-reference: Hounfour, Bridgebuilder, Ensemble.

### Ensemble
**Tags**: technical
Multi-model orchestration pattern. Routes requests across multiple models with consensus, fallback, and specialization strategies. In the Hounfour system, ensemble patterns enable a single agent request to leverage different models for different aspects of a response — for example, using one model for factual retrieval and another for synthesis. Cross-reference: Hounfour, Pool.

### Pool
**Tags**: technical
Provider resource allocation unit. Maps tenants to specific model configurations with budget limits, rate limits, and health thresholds. Each pool defines a set of available models, their priority ordering, and the budget envelope within which requests are authorized. Pools enable multi-tenant isolation — different users or teams can have different model access profiles. Cross-reference: Hounfour, Ensemble, BYOK.

### Meeting Geometries
**Tags**: philosophical
Eight distinct configurations for AI-human collaboration defined in loa#247. Each geometry describes a different spatial and relational arrangement for how agents and humans interact: Circle (equal voices), Pair (deep dialogue), Constellation (networked collaboration), and others. The geometries provide a vocabulary for designing agent interaction patterns with intentionality. Cross-reference: Permission Scape, Oracle.

### Ground Truth
**Tags**: technical
Factual GTM skill pack for verifiable, provenance-tracked documentation. Ground Truth files contain claims that cite `file:line` source references, ensuring that every assertion can be traced back to its origin in the codebase. The system distinguishes between grounded claims (verified against source) and derived claims (synthesized from multiple sources). Cross-reference: Oracle, Bridgebuilder.

### Flatline Protocol
**Tags**: technical
Multi-model adversarial review system. Pairs Opus and GPT-5.2 for cross-scoring of design documents and code reviews. When both models reach HIGH_CONSENSUS on a finding, it is auto-integrated. When either model raises a BLOCKER, autonomous workflows halt for human review. Named after the flatline EEG — the protocol operates at the boundary between automatic and manual intervention. Cross-reference: Bridgebuilder, Simstim.

### Simstim
**Tags**: technical
HITL (Human-In-The-Loop) accelerated development workflow. The human drives planning phases (PRD, SDD, sprint planning) while Flatline reviews auto-integrate during implementation. Named after the simulated stimulation technology in William Gibson's Neuromancer — the human experiences the development process through the agent's execution while maintaining strategic control. Cross-reference: Flatline Protocol, Bridgebuilder.
