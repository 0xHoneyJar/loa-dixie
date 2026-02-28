# ADR-004: Governance Denial Response with evaluationGap Growth Trajectory

**Status**: Accepted
**Date**: 2026-02-27
**Author**: Claude (Architecture), Merlin (Direction)
**Source**: Bridgebuilder Meditation Part II §2.2 (PR #50), Hounfour #32

## Context

When the FleetGovernor denies an admission request (e.g., tier limit exceeded,
conviction tier not permitted), the current response includes a `denial_reason`
string and a `decision: 'denied'` field. This tells the caller *what* happened
but not *what to do about it*.

In educational psychology, Vygotsky's Zone of Proximal Development (ZPD)
describes the space between what a learner can do independently and what they
can achieve with guidance. The `evaluationGap` pattern applies this concept to
agent governance: when access is denied, the response includes structured hints
about what the agent (or operator) would need to be approved.

No other agent framework currently implements this pattern.

## Decision

When admission is denied, the governance response SHOULD include an
`evaluationGap` object with the following structure:

```typescript
interface EvaluationGap {
  /** Current state that caused denial. */
  current: {
    tier: ConvictionTier;
    reputationScore: number | null;
    taskCount: number;
  };
  /** Requirements for approval. */
  required: {
    minimumTier?: ConvictionTier;
    minimumReputationScore?: number;
    maximumConcurrentTasks?: number;
  };
  /** Human-readable growth trajectory hint. */
  hint: string;
}
```

Example response:
```json
{
  "decision": "denied",
  "denial_reason": "tier_limit_exceeded",
  "evaluationGap": {
    "current": { "tier": "participant", "reputationScore": 0.45, "taskCount": 3 },
    "required": { "minimumTier": "builder", "minimumReputationScore": 0.60 },
    "hint": "Complete 2 more tasks with quality score > 0.7 to reach builder tier"
  }
}
```

## Rationale

1. **Actionable feedback**: Operators and agents receive concrete guidance
   instead of opaque denials.
2. **Incentive alignment**: The growth trajectory motivates quality contributions
   rather than quantity-only strategies.
3. **Observability**: SREs can track which gaps are most common (tier vs.
   reputation vs. concurrent task limits) to tune governance parameters.
4. **Ecosystem pattern**: This bridges the hounfour conviction tier system
   with Dixie's governance enforcement — the ZPD exists at the boundary
   between protocol definition and runtime enforcement.

## Consequences

- FleetGovernor admission responses grow slightly larger (additive, non-breaking)
- The `hint` field requires computing the delta between current and required state
- Future: community-configurable growth trajectories via conviction voting
  (Ostrom Principle 3 — collective-choice arrangements)

## References

- [Bridgebuilder Meditation Part II](https://github.com/0xHoneyJar/loa-dixie/pull/50#issuecomment-3966548487) — §2.2 evaluationGap as ZPD
- [Hounfour #32](https://github.com/0xHoneyJar/loa-hounfour/issues/32) — Structured denial hints
- [ADR-001](001-middleware-pipeline-ordering.md) — Governance middleware ordering context
- Vygotsky, L.S. (1978). *Mind in Society* — Zone of Proximal Development
