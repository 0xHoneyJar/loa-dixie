# ADR: Conviction-to-Currency Progression Path

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Deep Review Supplement (conviction-to-currency path), Web4 Manifesto
**References**: adr-communitarian-agents.md, adr-separation-of-powers.md, meow.bio/web4.html, conviction-boundary.ts

## Context

The Dixie conviction tier system — observer, participant, builder, architect, sovereign —
currently functions as a static mapping from on-chain BGT staking to capability tiers.
A wallet stakes BGT, receives a conviction tier, and the tier determines model pool
access, governance vote weight, and economic boundary qualification.

This is valuable. But it is also the first stage of a four-stage progression that leads
to something more fundamental: conviction as social money. The Deep Review Supplement
identified this progression path, and the Web4 manifesto ("May A Million Monies Bloom")
provides the theoretical framework.

This ADR documents the full progression so that future architects can see where the
current system fits in a larger trajectory — and critically, can see that the path from
here to there requires **parameterization, not re-architecture**.

## The Four-Stage Progression

### Stage 1: Static Conviction Tiers (Current)

**What exists**: Five fixed tiers derived from on-chain BGT staking:

| Tier | BGT Threshold | Trust Score | Vote Weight | Economic Boundary |
|------|--------------|-------------|-------------|-------------------|
| observer | 0 | 0.0 | 0 | Denied |
| participant | >0 | 0.2 | 1 | Denied |
| builder | ≥100 | 0.5 | 3 | Granted |
| architect | ≥1000 | 0.8 | 10 | Granted |
| sovereign | ≥10000 | 1.0 | 25 | Granted |

**Implemented in**: `app/src/services/conviction-boundary.ts` — `CONVICTION_ACCESS_MATRIX`
and `TIER_TRUST_PROFILES`

**Entry criteria for Stage 1** (already met):
- [x] Conviction tiers derived from on-chain BGT staking
- [x] Tiers gate model pool access, governance voting, and economic boundary
- [x] Trust score mapping from tiers to Hounfour's economic boundary evaluation
- [x] Separation of governance voice (voting) from economic access (boundary)

**What changes between stages**: Not the architecture. The `CONVICTION_ACCESS_MATRIX`
and `evaluateEconomicBoundaryForWallet()` remain. What changes is **what feeds into them**
and **who parameterizes them**.

### Stage 2: Dynamic Tiers Influenced by Reputation

**What changes**: The trust score in `TIER_TRUST_PROFILES` is no longer hardcoded. It is
Bayesian-blended with actual reputation data from on-chain interaction history.

**How it works**:
1. Wallet stakes BGT → receives a base conviction tier (same as Stage 1)
2. Wallet interacts with oracles → interactions generate quality events
3. Quality events feed `ReputationService.appendEvent()` → aggregated into per-model,
   per-task reputation scores
4. `evaluateEconomicBoundaryForWallet()` calls `computeBlendedScore()` to combine:
   - Collection prior: tier-based trust score (Stage 1 default)
   - Personal score: reputation aggregate from interaction history
   - Pseudo-count: configurable Bayesian prior strength

**Conviction as demonstrated commitment**: In Stage 1, conviction means "I staked BGT."
In Stage 2, conviction means "I staked BGT AND I have a track record of quality
interactions." The staking is the commitment; the reputation is the demonstration.

**Entry criteria for Stage 2**:
- [x] `ReputationService` with Bayesian blending (Sprint 6, Task 6.2)
- [x] `computeBlendedScore()` integrated into economic boundary evaluation
- [x] Per-model reputation cohorts stored and queryable
- [ ] Per-task-type cohorts (Sprint 10, Task 10.1)
- [ ] Cold start → warm path transition verified end-to-end (Sprint 10, Task 10.6)
- [ ] Reputation persistence beyond in-memory (PostgreSQL adapter)

**What this enables**: An observer who has contributed high-quality interactions
begins to accumulate reputation that could eventually allow their trust score to
approach participant-level, even at the same BGT stake. The system recognizes
demonstrated commitment, not just financial commitment.

### Stage 3: Parameterized CONVICTION_ACCESS_MATRIX Per Community

**What changes**: The `CONVICTION_ACCESS_MATRIX` is no longer a single constant.
Each community (identified by NFT collection or governance domain) can define its
own matrix.

**How it works**:
1. Each community defines a `ConvictionAccessMatrix` configuration:
   - Tier names (communities may use different names: "apprentice" instead of "observer")
   - Tier thresholds (different BGT requirements per community)
   - Vote weights (different governance power distributions)
   - Economic boundary criteria (different access requirements)
2. The matrix is stored on-chain or in a governance-approved configuration store
3. `evaluateEconomicBoundaryForWallet()` accepts a matrix parameter instead of
   using the hardcoded constant
4. Communities can propose and vote on matrix changes through governance

**Conviction as community governance tool**: In Stage 3, conviction is no longer a
system-wide constant — it is a governance primitive that communities use to define
their own social contracts. One community might be egalitarian (equal weights),
another might be meritocratic (reputation-heavy weights), another might be
plutocratic (stake-heavy weights).

**Entry criteria for Stage 3**:
- [ ] `CONVICTION_ACCESS_MATRIX` parameterized per governance domain
- [ ] Matrix configurations storable on-chain or in governance-approved store
- [ ] Community governance proposal flow for matrix changes
- [ ] Multiple matrix instances running simultaneously for different communities
- [ ] Matrix migration/versioning infrastructure

**What this enables**: The key phrase from the Web4 manifesto — "May A Million Monies
Bloom." Each parameterized conviction matrix IS a different monetary system. The
parameters define: what counts as wealth (BGT stake? reputation? both?), how wealth
translates to power (vote weights), and what power grants (economic boundary criteria).

### Stage 4: Conviction Tier IS the Social Money

**What changes**: The distinction between "conviction tier" and "money" dissolves.
The tier itself becomes the unit of account for community exchange.

**How it works**:
1. Conviction tiers are no longer just access gates — they are **transferable,
   fungible social tokens** within a community
2. "Builder-level conviction" becomes a thing you can hold, earn, transfer, and
   spend — not just a capability label
3. Inter-community exchange rates emerge: "1 builder in Community A = 0.7 architect
   in Community B" based on relative conviction parameters
4. The x402 micropayment infrastructure (already built for economic plumbing)
   denominates in conviction units, not just USD

**Conviction as social money**: The Web4 manifesto describes "functional money" —
tokens that derive their value not from scarcity or backing but from what they
enable. BGT conviction tiers are functional money: they enable model access,
governance voice, and economic participation. In Stage 4, this functional role
becomes explicit — conviction IS the money, not a gateway to using money.

**Entry criteria for Stage 4**:
- [ ] Conviction tiers transferable between wallets within community rules
- [ ] Inter-community conviction exchange protocol
- [ ] x402 integration denominates in conviction units
- [ ] Community-defined conviction creation/destruction rules
- [ ] Economic conservation invariants adapted for conviction-denominated transactions

## What Stays the Same Across All Stages

The critical insight: **the architecture does not change**. What changes is the
**parameterization**.

| Component | Stage 1 | Stage 2 | Stage 3 | Stage 4 |
|-----------|---------|---------|---------|---------|
| `evaluateEconomicBoundaryForWallet()` | Tier → trust → boundary | Tier + reputation → trust → boundary | Community matrix → trust → boundary | Conviction → trust → boundary |
| `CONVICTION_ACCESS_MATRIX` | Single constant | Single constant + reputation | Per-community parameter | Per-community parameter |
| `evaluateEconomicBoundary()` | Hounfour function | Same | Same | Same |
| Hounfour types | `QualificationCriteria`, `TrustLayerSnapshot` | Same | Same | Same |
| Conservation invariants | I-1, I-2, I-3 | Same | Same (per community) | Same (per conviction unit) |

The separation of powers (adr-separation-of-powers.md) holds at every stage:
- Hounfour defines the evaluation functions (Constitution)
- Finn routes requests (Judiciary)
- Freeside tracks economic flows (Treasury)
- Dixie manages conviction state (Commons)
- Arrakis provides the interface (Agora)

## The Web4 Connection: "May A Million Monies Bloom"

The Web4 manifesto argues that the future of digital economies is not a single global
currency but a proliferation of community-specific functional monies. Each community
defines what "wealth" means in their context:

- A creative community might weight reputation from art curation highest
- A developer community might weight code review quality highest
- A governance community might weight proposal participation highest

The parameterized `CONVICTION_ACCESS_MATRIX` (Stage 3) is the infrastructure for this
vision. Each community's matrix parameters define a different monetary system — a
different answer to "what counts as wealth, and what does wealth buy?"

Stage 4 makes this explicit: the conviction tier IS the money. The parameters ARE the
monetary policy. The governance process for changing parameters IS the central bank.

**The progression is not from simple to complex — it is from implicit to explicit.**
Stage 1's static tiers already encode a monetary policy (BGT stake = wealth, tiers =
purchasing power). Stage 4 merely names what was already true and makes it governable.

## Consequences

### Positive
- The full progression path is documented and discoverable
- Each stage has measurable entry criteria
- Future architects can evaluate which stage to target without re-discovering the path
- The connection to Web4 social monies is explicit, not buried in code comments

### Negative
- Stages 3 and 4 are speculative and may never be implemented
- Documenting a progression path creates expectation pressure to advance along it
- Inter-community exchange (Stage 4) introduces significant complexity

### Neutral
- Stages 1 and 2 are already implemented or in progress
- The architecture supports all stages without structural changes
- Each stage provides standalone value; no stage depends on completing all subsequent stages

## Related Documents

- `grimoires/loa/context/adr-communitarian-agents.md` — Communitarian model rationale
- `grimoires/loa/context/adr-separation-of-powers.md` — Constitutional roles (unchanged across stages)
- `grimoires/loa/context/adr-convivial-code.md` — Code transparency as governance transparency
- `app/src/services/conviction-boundary.ts` — Current Stage 1/2 implementation
- `app/src/services/reputation-service.ts` — Stage 2 reputation infrastructure
- `meow.bio/web4.html` — Web4 manifesto ("May A Million Monies Bloom")
