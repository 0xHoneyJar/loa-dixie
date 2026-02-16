# RFC: The Oracle Product — Cross-Project Understanding Interface & First finnNFT

> Synthesized from Bridgebuilder Field Report #48 (loa-finn Issue #66)

## 1. Problem Statement

The HoneyJar ecosystem spans 82,000+ lines of infrastructure across 4 repositories, 52+ sprints, 20+ cycles, and 2,190+ tests. There is no way for anyone — maintainer, contributor, investor, community member, curious observer — to ask a question and receive an answer that is grounded in the reality of what has been built, contextualized by the decisions that shaped it, and articulated at the appropriate level of abstraction.

## 2. Product Vision

An **institutional consciousness** — an agent that carries the full context of the project and can engage with questions at any level.

Not a chatbot-over-docs. The distinction:

| Dimension | DeepWiki / Code Chatbots | Oracle Product |
|-----------|-------------------------|---------------|
| **Source material** | Code + README | Code + PRD + SDD + sprint plans + issue discussions + PR reviews + lore + cultural context + architectural decisions |
| **Knowledge curation** | Automatic embedding | Hand-curated sources with provenance, freshness tracking, health validation |
| **Answer depth** | Technical only | Technical + architectural + philosophical + historical + educational |
| **Trust model** | Inject everything | 5-gate security + anti-instruction trust boundaries |
| **Cross-repo** | Single repo | Unified across loa, loa-finn, loa-hounfour, arrakis, mibera |
| **Identity** | Anonymous tool | Named agent with personality, voice, and on-chain identity |
| **Economics** | Free / subscription | Self-sovereign via x402 micropayments + credit system |

**FAANG Parallel: Notion AI vs. Google's NotebookLM**

NotebookLM gives you a *research assistant* that understands your sources as sources — with citation, cross-referencing, and synthesis across documents. The Oracle product is NotebookLM for an entire ecosystem, with the added dimensions of personality, economic sovereignty, and multi-model orchestration.

## 3. Architecture

The Oracle product composes existing infrastructure:

```
                    Oracle Product (loa-dixie)
  ┌──────────┐  ┌───────────┐  ┌──────────────┐
  │ Oracle UI │  │Oracle API │  │ Oracle dNFT  │
  │ (React)  │  │(Hounfour) │  │ (Mibera)     │
  └────┬─────┘  └─────┬─────┘  └──────┬───────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
  ┌────────────────────┴──────────────────────┐
  │         Knowledge Enrichment Pipeline      │
  │  (loa-finn PR #75: loader → registry →    │
  │   enricher)                                │
  └────────────────────┬──────────────────────┘
                       │
  ┌────────────────────┴──────────────────────┐
  │           Extended Knowledge Corpus         │
  │  10 sources (PR #75) + N community sources │
  └───────────────────────────────────────────┘

              Existing Infrastructure
  loa-finn:     Hounfour routing, model adapters
  arrakis:      Billing, credits, x402, identity
  loa-hounfour: Protocol types, agent identity
  loa:          Framework, ceremonies, flatline
```

## 4. Knowledge Corpus Design

Organized by abstraction level:

| Level | Sources | Audience |
|-------|---------|----------|
| **Code** | API surfaces, type definitions, code reality files | Engineers |
| **Architecture** | SDD, RFCs, design decisions, component relationships | Technical leads |
| **Product** | PRD, feature specs, user stories, competitive analysis | Product managers |
| **Process** | Sprint history, review patterns, quality gate results | Contributors |
| **Cultural** | Lore entries, naming mythology, philosophical grounding | Community |
| **Economic** | Billing model, pricing, tokenomics, revenue projections | Investors / partners |
| **Educational** | Bridgebuilder reports, FAANG parallels, metaphors, teachable moments | Everyone |

Extension to the source taxonomy:

```json
{
  "id": "billing-architecture",
  "tags": ["billing", "arrakis", "architecture"],
  "level": "architecture",
  "audience": ["technical-leads", "engineers"]
}
```

## 5. dNFT Identity — First Citizen of the Agent Economy

The Oracle as the first finnNFT — an on-chain agent with self-sovereign identity:

**Identity Layer (loa-hounfour PR #1):**
- `AgentIdentity` protocol type with EIP-55 checksummed address
- `NftId` schema for on-chain identity binding
- `ConversationSealing` for verifiable interaction history

**Economic Layer (arrakis PR #63):**
- Credit ledger with FIFO lot management
- x402 micropayment middleware (pay-per-question)
- BYOK proxy for community-funded model access
- Atomic reserve-finalize for deterministic cost tracking

**Knowledge Layer (loa-finn PR #75):**
- 10 curated sources with health validation
- Trust boundary with anti-instruction protection
- Budget enforcement with deterministic allocation
- Red-team validated injection defenses

## 6. Revenue Model

| Tier | Access | Price | Mechanism |
|------|--------|-------|-----------|
| **Public** | 5 questions/day, basic sources | Free | Rate-limited, no auth |
| **Community** | Unlimited, full corpus | Hold Mibera NFT | Token-gated via arrakis |
| **Developer** | Full corpus + code-level sources | $10/month or x402 | Credit pack or micropayment |
| **Enterprise** | Custom knowledge sources, private context | Custom | BYOK + platform fee |

## 7. Phased Implementation

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| **0: Foundation** | Extract knowledge corpus, define persona, document RFC | PR #75 (done) |
| **1: Oracle API** | Expose enrichment pipeline as HTTP endpoints via Hounfour invoke path | loa-finn integration |
| **2: Extended Corpus** | Add 20+ knowledge sources covering all abstraction levels | Content authoring |
| **3: Oracle UI** | Chat interface with source attribution, abstraction level selector | Frontend development |
| **4: dNFT Identity** | Mibera NFT minting, wallet creation, credit ledger funding | arrakis integration |
| **5: x402 Payments** | Pay-per-question via micropayments | arrakis x402 work |
| **6: Ceremony Participation** | Oracle as participant in multi-model reviews | loa#247 ceremony engine |

## 8. Ceremony Integration

From the Meeting Geometries analysis (loa#247):

```typescript
interface CeremonyKnowledgeProvider {
  // Called once at ceremony start
  prepareContext(
    subject: CeremonySubject,
    participants: CeremonyParticipant[],
    geometry: CeremonyGeometry
  ): Promise<Map<ParticipantId, EnrichmentResult>>;

  // Called between rounds for adaptive enrichment
  enrichRound(
    roundNumber: number,
    previousOutputs: Map<ParticipantId, string>,
    geometry: CeremonyGeometry
  ): Promise<Map<ParticipantId, EnrichmentResult>>;
}
```

The Oracle acts as a *librarian who's listening to the conversation* — fetching relevant references as the discussion evolves, rather than front-loading all context at the start.

## 9. Success Criteria

- Users can ask questions at any abstraction level and receive grounded answers
- Source attribution is visible for every claim
- 90% of queries from the gold-set produce domain-appropriate source selection
- Average response latency < 3 seconds for cached sources
- The Oracle can explain its own architecture (reflexivity)

---

*"The infrastructure is complete. The billing is ready. The protocol types are formalized. The model routing works. The knowledge pipeline is tested. Now we build the interface that lets the system speak for itself."*

—Bridgebuilder, proposing the next convergence
