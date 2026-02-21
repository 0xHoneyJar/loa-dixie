# ADR: Conway Competitive Positioning

**Status**: Accepted
**Date**: 2026-02-20
**Source**: Bridgebuilder Persona Review Part III (The Conway Question), Part V (Decision Trail Gap)
**References**: loa-finn#80 (Conway's Automaton), loa-freeside#62 (Billing RFC)

## Context

Conway's Automaton (loa-finn#80) envisions a maximalist agent lifecycle:

```
existence → compute → money → value creation → write access
```

Each stage grants the agent more autonomy. An agent that can earn money can fund its own inference. An agent that creates value earns trust. An agent with trust gets write access to systems.

Dixie rejects autonomous economic agency in favor of community governance. This document explains the *relationship* between the two visions — not a competition, but a deliberate architectural fork.

## Conway's Agent Lifecycle vs Dixie's Governance Model

| Conway Stage | Conway Behavior | Dixie Equivalent | Key Difference |
|--------------|-----------------|------------------|----------------|
| Existence | Agent created by minting | dNFT minted with BEAUVOIR persona | Same |
| Compute | Agent requests inference tokens | Oracle proxied via BFF to loa-finn | Same mechanism, different governance |
| Money | Agent earns/manages its own funds | Community funds via BGT conviction staking | **Fork point**: community vs self |
| Value Creation | Agent produces outputs that have market value | Oracle produces knowledge that has community value | **Fork point**: market vs commons |
| Write Access | Agent earns trust to modify external systems | Oracle earns trust via community governance (AccessPolicy) | **Fork point**: earned vs granted |

## The x402 Bridge: Where Conway Meets Ostrom

The Billing RFC (loa-freeside#62) introduces x402 micropayments. This creates a bridge between the two models:

- **Community provides social capital**: BGT staking, governance participation, conviction tiers
- **x402 provides economic plumbing**: Micropayment infrastructure, cost attribution, billing entries

The hybrid model: community governance decides WHO gets access, x402 handles HOW costs flow. The payment middleware hook point in `app/src/middleware/payment.ts` is positioned *after* the allowlist gate — you must be a community member before the economic layer activates.

```
allowlist (community) → payment (economic) → routes (capability)
```

This ordering is constitutional, not incidental.

## Can Dixie Agents Become Economically Autonomous?

**Nuanced answer**: Not in the current architecture, and not without deliberate revisitation of the communitarian ADR.

The path would require:
1. Agents earning revenue (x402 receipts attributed to agent TBA)
2. Agents deciding how to spend revenue (autonomous inference budget)
3. Agents choosing which tasks to prioritize (value maximization)
4. Community accepting reduced governance control

Each step is technically possible with the existing infrastructure (loa-finn supports agent TBA billing, x402 supports attribution). But each step moves further from the communitarian model.

**Recommendation**: Monitor Conway's progress in loa-finn#80. If autonomous economic agency proves valuable for certain agent types, create a NEW agent class (not Oracle) that implements Conway's lifecycle. The Oracle remains communitarian.

## Implications for Development

### What This Means for Feature Decisions

| Feature | Communitarian Approach | Darwinian Approach (NOT this) |
|---------|------------------------|-------------------------------|
| Model pool access | Conviction tier determines pool | Agent's earned revenue determines pool |
| Knowledge curation | Community curates corpus | Agent curates its own knowledge |
| Tool access | Governance grants tool permissions | Agent earns tool permissions |
| Personality evolution | Shaped by community interaction patterns | Shaped by economic fitness |
| Revenue distribution | Commons dividend to stakers | Agent retains surplus |

### The Bright Line

The architectural bright line: **agents do not make economic decisions**. They may *participate* in economic flows (billing attribution, cost tracking), but they do not *decide* to spend, earn, or optimize revenue. Economic decisions flow from community governance.

## Related Documents

- `grimoires/loa/context/adr-communitarian-agents.md` — Why communitarian
- `app/src/middleware/payment.ts` — x402 hook point (bridge infrastructure)
- `app/src/middleware/allowlist.ts` — Governance gate (community-first ordering)
