# Architecture Decision Records

> Architectural decisions for the Dixie BFF, recorded as lightweight ADRs.
> Each ADR captures context, decision, and consequences for a significant architectural choice.

## Index

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [ADR-001](001-middleware-pipeline-ordering.md) | Middleware Pipeline as Constitutional Ordering | Accepted | 2026-02-26 | The 15-position middleware pipeline encodes governance priorities -- allowlist gates payment gates conviction tier -- making reordering an architectural decision, not a refactoring task. |
| [ADR-002](002-circuit-breaker-topology.md) | Circuit Breaker Topology -- Singleton to Fleet | Accepted | 2026-02-26 | FinnClient's in-memory circuit breaker works at single-instance scale; production multi-instance deployment requires Redis-backed shared state or service mesh delegation. |
| [ADR-003](003-span-sanitizer-privacy-constitution.md) | Span Sanitizer as Privacy Constitution | Accepted | 2026-02-26 | The OTEL span sanitizer implements a default-deny allowlist that constitutionally limits what the system can observe about itself, with per-span-type granularity and automatic identity hashing. |
| [ADR-004](004-governance-denial-response.md) | Governance Denial Response with evaluationGap | Accepted | 2026-02-27 | Governance denials include structured `evaluationGap` hints showing the delta between current state and approval requirements, applying Vygotsky's Zone of Proximal Development to agent governance. |
| [ADR-005](005-alpha-ramp-direction.md) | Alpha Ramp Direction -- Conservative-First vs Responsive-First | Accepted | 2026-02-28 | When hounfour extracted Dixie's dampened scoring, the alpha ramp direction inverted; resolved by making ramp direction configurable, defaulting to ascending (current behavior) with three cold-start strategies. |
| [ADR-006](006-chain-bound-hash-migration.md) | Chain-Bound Hash Migration Strategy | Accepted | 2026-02-28 | Dixie and hounfour use different chain-bound hash algorithms; resolved via version-aware verification using the domain tag as algorithm discriminator, avoiding any data migration. |

## Conventions

- ADRs are numbered sequentially (`001`, `002`, ...).
- Each ADR has a **Status** field: `Proposed`, `Accepted`, `Deprecated`, or `Superseded`.
- ADRs are immutable once accepted. Superseding decisions create new ADRs that reference the original.
- Source references use `file:line` format relative to the repository root.
