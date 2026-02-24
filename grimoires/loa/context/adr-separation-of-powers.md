# ADR: Separation of Powers Architecture

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Deep Review REFRAME-1 (constitutional democracy mapping)
**References**: adr-hounfour-alignment.md, adr-communitarian-agents.md, adr-conway-positioning.md, PRD v3.0.0, SDD v3.0.0

## Context

After 51 sprints across 3 cycles, the Loa ecosystem has crystallized into a set of
autonomous systems with distinct jurisdictions. This was not designed top-down; it
emerged from the accumulation of architectural decisions that separated concerns into
independent repositories, each with its own governance contract. The Deep Review
(REFRAME-1) identified that this separation constitutes a **constitutional democracy**
— a system of distributed power with formal boundaries, checks, and balances.

Naming this property matters. Unnamed architectural properties get eroded by convenience.
When a developer shortcuts a boundary because "it's faster to call Dixie directly from
Finn," they are committing the equivalent of a constitutional violation — a breach of
the separation that makes the system governable.

This ADR formalizes the constitutional roles of each system so that future engineers
can identify, defend, and evolve the boundaries deliberately.

## The Six Constitutional Roles

### 1. Hounfour — The Constitution

**Repository**: `loa-hounfour` (v7.9.2)
**Jurisdiction**: Types, validators, evaluators, invariants, schemas
**Constitutional Role**: The written law that all systems must obey

Hounfour is not a library — it is the constitution. It defines the shared type system
(87+ TypeBox schemas), the cross-field invariants (51+ constraint files), and the
evaluation functions (36 builtin evaluators) that every system in the ecosystem must
respect. When a system's payload fails a hounfour validator, the payload is
unconstitutional — not "non-compliant" or "invalid," but a violation of the shared
social contract.

**Key property**: Hounfour changes affect all systems simultaneously. A schema change
in hounfour is a constitutional amendment — it requires review across all consumers
(see: adr-constitutional-amendment.md, Sprint 12).

**Maturity levels** (from adr-hounfour-alignment.md):
- Level 1: Interface (types imported)
- Level 2: Structural (state machines aligned)
- Level 3: Behavioral (runtime validators, evaluators)
- Level 4: Civilizational (E2E cross-system verification)
- Level 5: Runtime Constitutional Enforcement (every payload validated at runtime)

### 2. Finn — The Judiciary

**Repository**: `loa-finn`
**Jurisdiction**: Request evaluation, model routing, session management, agent lifecycle
**Constitutional Role**: Interprets the law and adjudicates each request

Finn receives every request from the ecosystem and adjudicates: which model handles
this? Is the session valid? Does the agent have the right lifecycle state to proceed?
Like a judiciary, Finn does not make the laws (Hounfour) or control the treasury
(Freeside); it applies the laws to specific cases.

**Judicial functions**:
- Request routing: which LLM provider and model serves this request?
- Session management: is this session authorized and within its bounds?
- Agent lifecycle: does this agent's current state permit this operation?
- Circuit breaking: is the upstream provider healthy enough to accept cases?

**Key constraint**: Finn must never bypass Hounfour validators when routing. Every
request must pass the constitutional bar before reaching a model — even if the model
could technically handle a non-conforming request.

### 3. Freeside — The Treasury

**Repository**: `loa-freeside`
**Jurisdiction**: Usage metering, cost computation, conservation verification, billing
**Constitutional Role**: Controls the economic resources of the ecosystem

Freeside manages the financial commons. Its conservation invariants are not performance
optimizations — they are social contracts:

- **I-1**: `committed + reserved + available = limit` — the community's total resources
  are finite and accounted for
- **I-2**: `SUM(lot_entries) per lot = original_micro` — every credit lot is fully
  consumed; nothing disappears
- **I-3**: `Redis.committed ≈ Postgres.usage_events` — fast storage matches durable
  storage; the books balance

The Treasury does not decide who gets access (that is the Judiciary, applying laws from
the Constitution). It tracks how resources flow and verifies that the flows obey
conservation laws.

**Key constraint**: Freeside uses BigInt-only arithmetic for all micro-USD computations.
The `number` type is constitutionally banned from economic calculations because
floating-point precision loss violates conservation invariant I-1.

### 4. Dixie — The Commons

**Repository**: `loa-dixie`
**Jurisdiction**: Shared knowledge, reputation, governance, conformance, context enrichment
**Constitutional Role**: The shared resources and governance institutions of the community

Dixie is the commons — the shared spaces where community knowledge lives, where
reputation is tracked, where governance decisions are made, and where conformance
is verified. Its middleware pipeline is not a technical implementation detail; it is
a constitutional ordering:

```
requestId → tracing → security → cors → bodyLimit → logger → jwt → rateLimit
  → allowlist → payment → routes
```

This ordering encodes: identity first, then community membership (allowlist), then
economic access (payment), then capabilities (routes). Reordering this pipeline is
a constitutional change.

**Commons resources managed by Dixie**:
- Soul memory (governed by AccessPolicy — not owned by agents)
- Knowledge corpus (governed by conviction-weighted voting)
- Reputation aggregates (Bayesian-blended, per-model, per-task)
- Conformance state (Level 5 runtime validation)
- Governance context (conviction tiers, community proposals)

**Key constraint**: Dixie agents are communitarian (Ostrom), not autonomous (Darwinian).
See adr-communitarian-agents.md. Agents do not make economic decisions; economic
decisions flow from community governance.

### 5. Arrakis — The Agora

**Repository**: `arrakis` (freeside frontend)
**Jurisdiction**: Public-facing interaction surface, user experience
**Constitutional Role**: The public square where citizens interact with the system

Arrakis is the agora — the market square where community members mint dNFTs, stake
BGT, vote on governance proposals, and interact with their oracles. It does not
interpret the law (Finn), manage the treasury (Freeside), or govern the commons (Dixie).
It provides the interface through which citizens exercise their constitutional rights.

**Key constraint**: Arrakis must never embed business logic that bypasses the BFF layer.
If the frontend can do something the backend doesn't validate, the constitution has a
hole. Every user action flows through the constitutional pipeline:
Arrakis → Dixie (BFF) → Finn → Freeside.

### 6. Loa — Legal Process

**Repository**: `loa-dixie/.claude/` (framework), `.loa.config.yaml`
**Jurisdiction**: PRD → SDD → sprint → review → audit lifecycle
**Constitutional Role**: The process by which laws are enacted and amended

Loa is the legal process — the formal procedure for changing the codebase. It ensures
that changes go through:
1. Requirements analysis (PRD) — the legislative proposal
2. Architecture design (SDD) — the drafting committee
3. Sprint planning — the legislative calendar
4. Implementation — the writing of the law
5. Review — the committee hearing
6. Audit — the constitutional review
7. Deployment — the enactment

Skipping any step is a procedural violation. The process exists not to slow development
down but to ensure that every change to the system has been examined for constitutional
conformance before it takes effect.

**Key constraint**: Code written outside of `/implement` skill invocation bypasses review
and audit gates. This is the equivalent of legislation enacted without committee review.

## Cross-Boundary Communication Criteria

When is it legitimate for one system to communicate directly with another?

### Permitted Cross-Boundary Communication

| From → To | Mechanism | When Permitted | Example |
|-----------|-----------|----------------|---------|
| Arrakis → Dixie | HTTP API | Always (Arrakis is the citizen interface) | User mints dNFT, stakes BGT |
| Dixie → Finn | HTTP/gRPC | For request proxying and session management | BFF forwards chat request |
| Dixie → Freeside | HTTP API | For billing verification and economic boundary checks | Verify conservation before billing |
| Finn → Freeside | Internal API | For cost attribution and usage metering | Attribute model usage to tenant |
| Any → Hounfour | Import | Always (Hounfour is the shared type system) | Import validators, types, evaluators |
| Dixie → Dixie (self) | NATS signals | For internal event propagation | Conformance violations, quality events |

### Prohibited Cross-Boundary Communication

These patterns are constitutional violations:

| Pattern | Why Prohibited |
|---------|---------------|
| Finn → Dixie direct query | Judiciary should not depend on the Commons for adjudication. If Finn needs governance context, it flows through the request, not a back-channel. |
| Arrakis → Finn direct | Citizens must go through the BFF (Dixie). Direct-to-judiciary access bypasses community governance gates. |
| Arrakis → Freeside direct | Citizens must not interact with the treasury directly. All economic operations flow through the governance pipeline. |
| Any system modifying Hounfour schemas at runtime | The constitution is amended through process (PRs, reviews), not through runtime modification. |
| Freeside → Dixie for access decisions | The treasury does not decide who gets access. Access is a governance decision (Dixie) informed by law (Hounfour). |

## Anti-Patterns

### 1. "It's Faster to Call Directly"

**Pattern**: Developer adds a direct HTTP call from Finn to Dixie to check reputation
before routing, because adding the context to the request would require interface changes.

**Why it's corrosive**: Creates a runtime dependency between the Judiciary and the Commons.
If Dixie is down, Finn's routing breaks — violating the principle that each system can
operate independently with graceful degradation.

**Constitutional fix**: Reputation context flows through the request payload (enrichment
tier pattern, see adr-dixie-enrichment-tier.md). Finn never queries Dixie; Dixie enriches
the request before it reaches Finn.

### 2. "The Frontend Can Validate"

**Pattern**: Arrakis implements client-side validation of access policies using JavaScript
versions of Hounfour validators.

**Why it's corrosive**: Client-side validation is advisory, not authoritative. If the
BFF (Dixie) doesn't validate, any payload that bypasses the frontend reaches the system
unconstitutionally. Additionally, client-side Hounfour validators may drift from the
server-side version.

**Constitutional fix**: All validation happens in the BFF. The frontend may provide UX
hints using the same schemas, but authoritative validation is always server-side.

### 3. "We'll Share the Database"

**Pattern**: Finn and Dixie connect to the same PostgreSQL instance to avoid network
round-trips for shared data.

**Why it's corrosive**: A shared database is a shared mutable state that creates implicit
coupling. Schema changes in one system's tables affect the other's queries. Migration
ordering becomes a coordination problem. Most critically, it makes the two systems
inseparable — you cannot deploy one without the other.

**Constitutional fix**: Each system owns its data. Cross-system data access flows through
APIs with well-defined contracts (Hounfour types). This is slower but governable.

### 4. "The Agent Can Decide"

**Pattern**: An agent in Dixie autonomously decides to spend budget on a higher-tier
model because the current model is performing poorly.

**Why it's corrosive**: This violates the communitarian principle
(adr-communitarian-agents.md). Agents do not make economic decisions. Economic access
is governed by conviction tiers, which are community governance primitives — not agent
optimization metrics.

**Constitutional fix**: The conviction tier determines the model pool. If the community
wants agents to access better models, they governance-vote to adjust tier boundaries.

## Constitutional Health Check Concept

A CI job that mechanically verifies the separation of powers at build time:

### Import Boundary Verification

```
For each repository R in {dixie, finn, freeside, arrakis}:
  For each import I in R's source files:
    Verify I is permitted by the cross-boundary communication table above.
    Flag any import that creates a prohibited dependency.
```

**Concrete checks**:
1. Dixie imports from Hounfour: PERMITTED
2. Dixie imports from Finn internals: PROHIBITED (should only use Finn's HTTP API)
3. Arrakis imports from Freeside: PROHIBITED (should only use Dixie BFF API)
4. All systems import Hounfour types: PERMITTED (constitution is universal)
5. No system modifies `@0xhoneyjar/loa-hounfour` at runtime: VERIFIED

### Runtime Dependency Verification

```
For each HTTP call C in production traffic:
  Verify C follows a permitted communication path.
  Flag any call that creates a prohibited cross-boundary dependency.
```

This can be implemented using OpenTelemetry trace data: each span includes the
source system and destination system, and a policy evaluator checks the path against
the permitted communication table.

### Constitutional Metrics Dashboard

| Metric | Healthy | Warning | Violation |
|--------|---------|---------|-----------|
| Cross-boundary import count | 0 prohibited | 1-2 (documented exceptions) | 3+ |
| Direct Finn→Dixie calls | 0 | 0 | Any |
| Arrakis→Freeside calls | 0 | 0 | Any |
| Hounfour version skew | All same version | 1 minor version behind | 2+ versions behind |
| Runtime schema validation rate | 100% (dev), >0.1% (prod) | <0.1% (prod) | 0% |

## Consequences

### Positive
- Future engineers can identify which system owns a decision
- Boundary violations are detectable, not just philosophically wrong
- Graceful degradation is preserved: each system can operate when others are unavailable
- The constitutional health check prevents architectural erosion over time

### Negative
- Some operations are slower (API calls vs shared database)
- New features may require changes in multiple systems (constitutional amendment process)
- Developers must learn the constitutional model to make good design decisions

### Neutral
- The separation was already emergent; this ADR makes it explicit
- Hounfour's role as constitution was already de facto; this ADR names it

## Related Documents

- `grimoires/loa/context/adr-hounfour-alignment.md` — Protocol maturity levels
- `grimoires/loa/context/adr-communitarian-agents.md` — Why communitarian, not Darwinian
- `grimoires/loa/context/adr-conway-positioning.md` — Relationship to Conway's Automaton
- `grimoires/loa/context/adr-dixie-enrichment-tier.md` — Legitimate cross-boundary enrichment
- `grimoires/loa/context/adr-autopoietic-property.md` — The self-improving loop that connects all systems
- `grimoires/loa/context/adr-conviction-currency-path.md` — How conviction evolves toward social money
- `app/src/server.ts` — Constitutional middleware ordering
- `app/src/services/conviction-boundary.ts` — Economic boundary integration
