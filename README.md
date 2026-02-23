# loa-dixie

**The Oracle Product — Cross-Project Understanding Interface**

> *"A construct is a ROM personality — a recorded consciousness that can be consulted for expertise. The Dixie Flatline remembered everything."* — William Gibson, Neuromancer

loa-dixie is the educational and knowledge interface for the HoneyJar ecosystem. Named after McCoy Pauley's ROM construct personality in Neuromancer, it carries the institutional memory of everything built across five interconnected repositories — and makes that knowledge queryable by anyone, at any level of abstraction.

## What This Is

Not a chatbot-over-docs. Not a code search. An **institutional consciousness** — an agent that carries the full context of the project and can engage with questions at any level:

- **Engineer**: "How does the Hounfour route models?" → code paths, type signatures, data flow
- **Product**: "What does the billing system do?" → feature description, user stories, business logic
- **Investor**: "What's the revenue model?" → x402 micropayments, credit system, pricing tiers
- **Philosopher**: "Why Vodou cosmology?" → web4 manifesto, naming mythology, cultural context
- **Community**: "What makes my bear NFT talk?" → finnNFT personas, model routing, agent identity

## Architecture

loa-dixie composes existing infrastructure from across the ecosystem:

```
loa-dixie (this repo)
  Oracle UI          — Chat interface with source attribution
  Knowledge Corpus   — 10+ curated sources spanning code to philosophy
  Oracle Persona     — Voice, citation format, honesty protocol

loa-finn (enrichment engine)
  Knowledge Pipeline — loader → registry → enricher
  Hounfour Routing   — Model selection, provider abstraction
  Trust Boundaries   — <reference_material> anti-instruction envelope

loa-freeside (economics)
  Credit Ledger      — FIFO lot management, atomic reserve-finalize
  x402 Middleware     — Pay-per-question micropayments
  BYOK Proxy         — Community-funded model access

loa-hounfour (protocol types)
  Agent Identity     — EIP-55 checksummed addresses, NftId schema
  Billing Entries    — Economic protocol types
  Conversation Sealing — Verifiable interaction history
```

## Knowledge Corpus

The Oracle's knowledge spans 7 abstraction levels:

| Level | Sources | Audience |
|-------|---------|----------|
| **Code** | API surfaces, type definitions, code reality files | Engineers |
| **Architecture** | SDD, RFCs, design decisions, component relationships | Technical leads |
| **Product** | PRD, feature specs, user stories | Product managers |
| **Process** | Sprint history, review patterns, quality gates | Contributors |
| **Cultural** | Lore entries, naming mythology, philosophical grounding | Community |
| **Economic** | Billing model, pricing, tokenomics | Investors / partners |
| **Educational** | Bridgebuilder reports, FAANG parallels, teachable moments | Everyone |

## Naming

The HoneyJar ecosystem draws from two mythological traditions:

**Vodou (loa, hounfour, cheval, peristyle)**
Spirits (loa) ride horses (cheval) in the temple (hounfour). Models are spirits, adapters are horses, the platform is the temple.

**Neuromancer (finn, flatline, dixie, simstim, ICE)**
The Finn knows the street. The Dixie Flatline is a ROM construct — a recorded consciousness that can be consulted. Simstim lets you experience another's sensorium. ICE protects boundaries.

**Neuromancer (freeside, ICE, wintermute)**
Freeside is the orbital habitat with its own economy. The billing and settlement layer controls the flow of value.

loa-dixie is the Dixie Flatline of the ecosystem: institutional memory in queryable form.

## Status

**Phase 2: Experience Orchestrator** (complete)
- 13 sprints, 492 tests across 44 test files
- Soul memory, conviction-gated access, autonomous operation, agent API, compound learning
- Bridge-converged at 1.0 (3 iterations, 19/19 findings addressed)
- See [PR #3](https://github.com/0xHoneyJar/loa-dixie/pull/3) for full Phase 2 scope

See [docs/rfc.md](docs/rfc.md) for the full product vision and phased implementation plan.

## Cross-References

| Repo | Role | Key Issues/PRs |
|------|------|----------------|
| [loa-finn](https://github.com/0xHoneyJar/loa-finn) | Knowledge enrichment pipeline | PR #75 (Oracle), Issue #31 (Permission Scape), Issue #66 (Launch) |
| [loa-freeside](https://github.com/0xHoneyJar/loa-freeside) | Billing & identity | Issue #62 (Billing), PR #63 (Credit Ledger) |
| [loa-hounfour](https://github.com/0xHoneyJar/loa-hounfour) | Protocol types | PR #1 (Types), PR #2 (Agent Economy) |
| [loa](https://github.com/0xHoneyJar/loa) | Framework & ceremonies | Issue #247 (Meeting Geometries) |


## Maintainer

[@janitooor](https://github.com/janitooor)

## License

[AGPL-3.0](LICENSE.md) — Use, modify, distribute freely. Network service deployments must release source code.

Commercial licenses are available for organizations that wish to use Loa without AGPL obligations.


Ridden with [Loa](https://github.com/0xHoneyJar/loa)
