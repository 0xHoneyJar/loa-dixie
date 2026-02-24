# ADR: Convivial Code Principles

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Deep Review PRAISE-3 (convivial code formalization)
**References**: Ivan Illich, *Tools for Conviviality* (1973), adr-separation-of-powers.md, adr-communitarian-agents.md

## Context

The Deep Review (PRAISE-3) identified a pattern running through the Dixie codebase:
code that maximizes the reader's autonomy to understand and modify the system. This
is not accidental — it is the necessary consequence of a communitarian architecture.
In a system that governs itself through conviction tiers, governance voting, and
community-weighted reputation, the code IS the governance document. Opaque code is
opaque governance.

Ivan Illich, in *Tools for Conviviality* (1973), argued that tools should enhance
personal autonomy rather than create dependence on experts. A convivial tool is one
that any person can use to accomplish their purposes, without requiring specialized
knowledge controlled by a professional class.

Applied to software: convivial code is code that maximizes the reader's ability to
understand what the system does, why it does it, and how to modify it — without
requiring access to the original author's mental model.

This ADR formalizes conviviality as a constitutional requirement for the Dixie codebase.

## Definition: Code Conviviality

> **Convivial code** is code that grants the reader maximum autonomy to understand,
> evaluate, and modify the system's behavior without depending on tribal knowledge,
> hidden context, or the original author's presence.

### The Illich Test

A piece of code passes the Illich Test if:

1. A new engineer can understand the **purpose** of the code from its documentation
   (JSDoc, ADRs, comments) without asking anyone
2. A new engineer can understand the **constraints** the code operates under from
   the same documentation
3. A new engineer can predict the **consequences** of modifying the code from the
   documentation and test suite
4. A new engineer can make a **correct modification** without introducing regressions,
   guided by the documentation, types, and tests

If any of these require oral tradition ("ask Sarah, she wrote that module"), the code
is not convivial.

## Principles Already Demonstrated

The following principles are not aspirational — they are already implemented in the
Dixie codebase and extracted here as a formal standard.

### Principle 1: JSDoc Explains "Why," Not "What"

**Observed in**: `conviction-boundary.ts`, `memory-auth.ts`, `conformance-middleware.ts`

The codebase consistently uses JSDoc to explain the governance rationale for code
decisions, not just the technical behavior:

```typescript
/**
 * Default budget period in days — matches monthly billing cycle.
 *
 * This determines the `budget_period_end` timestamp in the CapitalLayerSnapshot
 * passed to Hounfour's evaluateEconomicBoundary. A 30-day period aligns with
 * the standard monthly billing cycle used by most cloud/SaaS providers.
 *
 * Override via:
 * - `budgetPeriodDays` parameter on `evaluateEconomicBoundaryForWallet()`
 * - `DIXIE_BUDGET_PERIOD_DAYS` environment variable (global default)
 *
 * @since Sprint 5 — LOW-4 (Bridge iter1 deferred finding)
 */
export const DEFAULT_BUDGET_PERIOD_DAYS = 30;
```

The "why" (matches monthly billing cycle) matters more than the "what" (30). A
reader who knows only the "what" cannot evaluate whether 30 should change. A
reader who knows the "why" can evaluate whether their context still aligns with
monthly billing cycles.

**Checklist item**: Does every constant, configuration value, and non-obvious
implementation choice have a JSDoc comment explaining the rationale?

### Principle 2: ADRs Document Rejected Alternatives

**Observed in**: `adr-communitarian-agents.md`, `adr-conway-positioning.md`,
`adr-hounfour-alignment.md`

The ADR system does not just document what was decided — it documents what was
considered and rejected. The Conway positioning ADR explicitly names the Darwinian
alternative and explains why it was not chosen. This gives future engineers the
full decision space, not just the chosen point.

**Checklist item**: Does every ADR include a "Rejected Alternatives" or "What NOT
to Build" section?

### Principle 3: Bridge Findings Addressed Precisely

**Observed in**: Sprint 5-8 (bridge deferred findings)

When bridge reviews produce findings (LOW, MEDIUM, HIGH, CRITICAL), each finding
is traced to a specific sprint task with a specific code change. The finding is
not acknowledged in a comment and forgotten — it is resolved in code, and the
resolution references the original finding.

Example: `@since Sprint 5 — LOW-4 (Bridge iter1 deferred finding)` — the JSDoc
tag traces the code to the governance process that produced it.

**Checklist item**: Does every bridge finding have a corresponding code change
that references the finding ID?

### Principle 4: Separation of Concerns Through Extensive Comments

**Observed in**: `CONVICTION_ACCESS_MATRIX` in `conviction-boundary.ts` (40+ line
JSDoc block)

The `CONVICTION_ACCESS_MATRIX` constant has a JSDoc comment block that explains:
- The separation of governance voice from economic access
- Why observer can vote but cannot pass economic boundary
- Which systems (knowledge governance vs. economic boundary) consume the same input
  but produce different outputs
- References to Ostrom's principles

This is not over-documentation. In a communitarian system where conviction tiers
are governance primitives, the mapping from tiers to capabilities IS the governance
policy. A 40-line comment on a 30-line constant is appropriate because the comment
is the policy documentation.

**Checklist item**: Do governance-critical constants include documentation proportional
to their governance impact?

### Principle 5: Types as Documentation

**Observed in**: `types.ts`, `conviction.ts`, `stream-events.ts`

The TypeScript type system is used not just for compiler safety but for reader
understanding. Types are named to convey intent (`ConvictionTier`, not `Tier`;
`EconomicBoundaryEvaluationResult`, not `Result`). Interface fields are documented
individually.

**Checklist item**: Are all exported types named for clarity, with documented fields
for non-obvious properties?

### Principle 6: Test Names as Specifications

**Observed in**: `protocol-compliance.test.ts`, `conviction-boundary.test.ts`,
`hounfour-conformance.test.ts`

Test names in the codebase read as specifications:
- "evaluateEconomicBoundary grants access for builder tier with sufficient budget"
- "observer can vote with weight 0 but cannot pass economic boundary"
- "billing conservation holds for all pricing paths"

A reader can understand the system's invariants from the test names alone, without
reading the implementation.

**Checklist item**: Can a reader understand the system's behavior from test names
alone?

### Principle 7: Provenance Tracking

**Observed in**: `@since` tags, sprint references, bridge finding IDs

Every significant code change includes provenance: which sprint produced it, which
review finding motivated it, which governance decision authorized it. This is the
code equivalent of legislative history — knowing not just what the law says but
why it was enacted and by what process.

**Checklist item**: Do all significant code changes include `@since` tags and
source references?

## Constitutional Framing

In a system that governs itself through conviction tiers, governance voting, and
community-weighted reputation:

> **Code conviviality is governance transparency.**

If the governance rules are encoded in code that only the original author can
understand, the governance is opaque. The community cannot evaluate, challenge,
or amend rules they cannot read.

This is not merely a software quality concern — it is a governance requirement.
Illich's argument applies directly: if the tools of governance (the code) require
expert priests to interpret, the governance is not democratic. It is technocratic.

The convivial code principles above ensure that the governance encoded in Dixie's
codebase is accessible to anyone who can read TypeScript — not just the engineers
who wrote it.

### The Constitutional Chain

```
Hounfour (Constitution) defines types → documented with schemas
Dixie (Commons) implements governance → documented with JSDoc + ADRs
Loa (Legal Process) ensures quality → documented with bridge findings + reviews
Community (Citizens) exercises voice → documented with conviction tiers + votes
```

At every level, documentation is not optional — it is the mechanism by which
governance participants can exercise informed judgment. Removing documentation
is not "reducing noise" — it is **disenfranchising future participants**.

## Code Review Checklist (Extractable)

The following checklist can be applied during code review to evaluate conviviality:

- [ ] **P1 — Rationale**: Does every non-obvious constant/choice have a JSDoc "why" comment?
- [ ] **P2 — Alternatives**: Do design decisions document what was rejected and why?
- [ ] **P3 — Traceability**: Are review findings traced to specific code changes?
- [ ] **P4 — Proportionality**: Is governance-critical code documented proportionally to its impact?
- [ ] **P5 — Type clarity**: Are exported types named for intent with documented fields?
- [ ] **P6 — Specification tests**: Can system behavior be understood from test names?
- [ ] **P7 — Provenance**: Do significant changes include `@since` tags and source references?
- [ ] **Illich Test**: Can a new engineer understand purpose, constraints, consequences, and make correct modifications without tribal knowledge?

## Consequences

### Positive
- Conviviality is now a named, measurable quality attribute
- The checklist provides concrete review criteria
- Future engineers have a vocabulary for arguing against documentation removal
- The constitutional framing connects code quality to governance quality

### Negative
- Documentation maintenance is ongoing work
- Over-documentation is possible (mitigated by the proportionality principle)
- The Illich Test is subjective (mitigated by the specific checklist items)

### Neutral
- The principles were already practiced; this ADR names and formalizes them
- The checklist is advisory, not blocking (review judgment applies)

## Related Documents

- `grimoires/loa/context/adr-separation-of-powers.md` — Constitutional roles requiring transparent governance
- `grimoires/loa/context/adr-communitarian-agents.md` — Why the communitarian model demands transparency
- `grimoires/loa/context/adr-autopoietic-property.md` — The self-improving loop that depends on readable code
- `app/src/services/conviction-boundary.ts` — Example of convivial code (CONVICTION_ACCESS_MATRIX documentation)
- Ivan Illich, *Tools for Conviviality* (1973), Harper & Row
