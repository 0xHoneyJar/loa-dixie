# ADR: Communitarian Agent Architecture

**Status**: Accepted
**Date**: 2026-02-20
**Source**: Bridgebuilder Persona Review Part III (The Conway Question), Part V (S-2)
**References**: loa-finn#80 (Conway's Automaton), meow.bio/web4.html, loa-finn#66

## Context

The 0xHoneyJar ecosystem contains two competing visions for AI agent architecture:

1. **Conway's Automaton** (loa-finn#80): Autonomous, economically self-sustaining agents that follow the lifecycle `existence → compute → money → value creation → write access`. This is the Darwinian model — agents that survive by generating enough value to fund their own inference.

2. **Dixie's Oracle**: Community-embedded agents that serve the collective, governed by allowlist gates and conviction-based tiers. This is the communitarian model — agents whose access and capabilities are governed by community participation, not market forces.

Dixie implements the communitarian model. This document explains why.

## Decision

Dixie agents are **communitarian (Ostrom)**, not **autonomous (Darwinian/Conway)**.

### The Three Decision Forks

Every agent architecture faces three fundamental forks. Dixie's choices are:

| Fork | Darwinian (Conway) | Communitarian (Dixie) | Code Reference |
|------|--------------------|-----------------------|----------------|
| **Memory** | Brain — agent owns and controls its own memory | Library — memory is a shared resource governed by access policies | `app/src/middleware/allowlist.ts` (AccessPolicy) |
| **Revenue** | Self-funded — agent generates revenue to pay for its own inference | Community-funded — BGT conviction staking converts community participation into AI capability access | `app/src/middleware/payment.ts` (x402 hook) |
| **Personality** | Survive — personality evolves to maximize economic fitness | Serve — personality evolves to maximize community value | BEAUVOIR.md persona system |

### Why Communitarian

1. **The allowlist IS governance.** The `AllowlistStore` in `app/src/middleware/allowlist.ts` is not just an access control list — it's the first governance primitive. Who gets access to the Oracle is a community decision, not a market decision. The `AccessPolicy` type from Hounfour formalizes this.

2. **Conviction-based tiers align incentives.** BGT staking converts long-term community commitment into capability access. This is Elinor Ostrom's design principle #2: "Congruence between appropriation and provision rules." Those who contribute to the commons get more from it.

3. **The middleware pipeline is a constitution.** The ordering in `app/src/server.ts` — `requestId → tracing → security → cors → bodyLimit → logger → jwt → rateLimit → allowlist → payment → routes` — is not arbitrary. It's a constitutional ordering where each layer enforces a different governance concern. Allowlist before payment means community membership gates economic access, not the other way around.

4. **Soul memory is a commons, not property.** When soul memory arrives (Sprint 17 architecture), conversation history will be governed by `AccessPolicy` — not owned by the agent autonomously. Transfer policies, read access, and revocation are community governance decisions.

### What NOT to Build

Future developers and agents: these are anti-patterns for the communitarian model:

- **Do NOT** give agents autonomous economic agency (self-funding, autonomous trading, value extraction)
- **Do NOT** implement market-based access (pay-per-query without community governance)
- **Do NOT** create competitive dynamics between agents (agent A vs agent B for resources)
- **Do NOT** implement personality survival pressure (personality changes to maximize revenue)

### The Web4 Thesis Connection

The Web4 thesis (meow.bio/web4.html) identifies BGT conviction staking as "functional money" — social monies that convert community participation into capabilities. Dixie is the product surface where this thesis becomes tangible:

- Mint a dNFT → Join the community
- Stake BGT → Gain conviction tiers
- Higher tiers → Access to more capable model pools
- Community governance → Shape what the agents do

This is Ostrom's commons governance applied to AI infrastructure.

## Consequences

### Positive
- Clear architectural boundaries for feature development
- Prevents accidental implementation of Darwinian features
- Aligns with 0xHoneyJar's community-first values
- AccessPolicy provides formal governance primitives

### Negative
- Limits agent autonomy (by design)
- Revenue model depends on community growth, not agent productivity
- Soul memory governance adds complexity vs simple agent ownership

### Risks
- Community may want more autonomous agents later (revisit this ADR)
- Conway vision (#80) may prove more economically viable (monitor, don't prematurley optimize)

## Related Documents

- `grimoires/loa/context/adr-conway-positioning.md` — How Dixie relates to Conway
- `grimoires/loa/context/adr-hounfour-alignment.md` — Protocol type alignment strategy
- `app/src/middleware/allowlist.ts` — Governance gate implementation
- `app/src/server.ts` — Constitutional middleware ordering
