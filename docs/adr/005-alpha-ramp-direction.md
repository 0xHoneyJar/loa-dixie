# ADR-005: Alpha Ramp Direction — Conservative-First vs Responsive-First

**Status**: Accepted
**Date**: 2026-02-28
**Author**: Claude (Architecture), Merlin (Direction)
**Source**: Bridgebuilder Deep Review (PR #64), Migration Roadmap Appendix
**Issues**: dixie #65, hounfour #40

## Context

When hounfour v8.3.0 extracted Dixie's `computeDampenedScore` into the canonical
shared library, the alpha ramp direction was inverted. This created a behavioral
divergence that didn't exist before extraction — structurally identical to
Google's proto2→proto3 migration where extraction revealed implicit assumptions.

**Dixie's implementation** (conservative-first / ascending):
```
alpha = α_min + (α_max - α_min) × min(1, n / ramp)
```
- At n=0: alpha = 0.1 (conservative — new agents change slowly)
- At n=50: alpha = 0.5 (responsive — mature agents track recent performance)
- Cold start: returns newScore directly (trust first observation)

**Hounfour's canonical** (responsive-first / descending):
```
alpha = α_min + (α_max - α_min) × (1 - min(1, n / ramp))
```
- At n=0: alpha = 0.5 (responsive — fast initial convergence)
- At n=50: alpha = 0.1 (conservative — stable mature populations)
- Cold start: Bayesian pseudo-count prior (pulls toward 0.5)

Both are valid ML strategies. The choice is a product decision about what
social contract Dixie presents to agents in its ecosystem.

## Decision

### Ramp Direction: Configurable, defaulting to ascending (current behavior)

Dixie wraps hounfour's canonical `computeDampenedScore` with a
`FeedbackDampeningConfig` that includes `rampDirection: 'ascending' | 'descending'`.
The default preserves Dixie's current ascending behavior for zero behavioral change.

**Rationale**: Option C from the migration roadmap — propose upstream
configurable `rampDirection` in hounfour (issue hounfour #40), then adopt
responsive-first once the canonical supports both directions natively.

### Cold-Start Strategy: Three-mode support

| Strategy | First Observation (0.95) | Social Signal |
|----------|--------------------------|---------------|
| `direct` (default) | score = 0.95 | "You are what you do" |
| `bayesian` | score ≈ 0.541 | "Prove yourself" |
| `dual-track` | internal = 0.541, display = 0.95 | Both signals, context-appropriate |

The `dual-track` strategy preserves the Bayesian prior for internal governance
decisions (admission, task routing) while displaying the observed score with
observation count for human-facing UI — combining epistemic rigor with social
transparency.

## Alternatives Considered

### Option A: Adopt responsive-first immediately
- **Pro**: Aligns with ML best practice, consistent with Finn's model routing
- **Con**: Temporary score volatility for existing agents during transition
- **Rejected for now**: Premature without upstream support for configurable direction

### Option B: Keep conservative-first permanently
- **Pro**: No behavioral change, protects existing agents
- **Con**: Permanent divergence from canonical, requires custom config on every call
- **Rejected**: Creates maintenance burden and divergence risk

### Option C: Make it configurable (chosen)
- **Pro**: Both philosophies supported, each consumer chooses, ecosystem flexibility
- **Con**: Adds config surface area
- **Accepted**: Filed hounfour #40 for upstream, Dixie wraps with explicit direction

## FAANG Parallel

This is the extraction-convergence paradox: extracting a local implementation
into a shared library necessarily makes implicit assumptions explicit. Google
encountered this with proto2→proto3 (field presence semantics diverged across
teams that had been using the "same" library), and Linux's VFS abstraction
extraction revealed filesystem-specific behaviors that had been silently
customized by each driver.

The resolution pattern is the same: make the divergence point configurable
rather than forcing one side to change.

## Consequences

- `reputation-scoring-engine.ts` gains `FeedbackDampeningConfig` type and
  `computeDixieDampenedScore` wrapper function
- Local `computeDampenedScore` function and constants (ALPHA_MIN, ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES) are deleted — all scoring flows through canonical
- `ReputationScore` type gains optional `observationCount` for dual-track UI
- All 9 existing call sites updated to use wrapper with default config
  (ascending + direct = identical to current behavior, verified by tests)
- Future: when hounfour #40 lands, the wrapper becomes a thin pass-through

## References

- [Bridgebuilder Deep Review](https://github.com/0xHoneyJar/loa-dixie/pull/64#issuecomment-3976266939) — §Alpha Ramp Inversion
- [Migration Roadmap](https://github.com/0xHoneyJar/loa-dixie/pull/64#issuecomment-3976268441) — P1 Decision Framework
- [ADR-001](001-middleware-pipeline-ordering.md) — Middleware ordering (governance context)
- [dixie #65](https://github.com/0xHoneyJar/loa-dixie/issues/65) — ADR tracking issue
- [hounfour #40](https://github.com/0xHoneyJar/loa-hounfour/issues/40) — Upstream configurable ramp direction
