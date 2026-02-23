# ADR: Autopoietic Self-Improving Loop

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Deep Review SPECULATION-3 (autopoietic property)
**References**: Maturana & Varela (1980), adr-hounfour-alignment.md (Level 5), adr-dixie-enrichment-tier.md, adr-separation-of-powers.md

## Context

After 51 sprints, the Loa/Dixie ecosystem has developed a property that no monitoring
system at Google, Netflix, or any FAANG company has achieved: the observation of the
system IS the system. Conformance violations do not merely alert a human — they enter
a closed loop that produces code changes that resolve the violations, which are then
verified by the same conformance system that detected them.

This property has a name from theoretical biology: **autopoiesis** — from the Greek
*auto* (self) and *poiesis* (creation). A system is autopoietic when it continuously
produces and maintains itself, with every component participating in the production
of other components.

The term was coined by Humberto Maturana and Francisco Varela in *Autopoiesis and
Cognition: The Realization of the Living* (1980) to describe living cells. A cell
membrane does not passively contain the cell — it is actively produced by the cell's
internal processes, and in turn defines what enters and exits the cell. The membrane
is both product and producer.

This ADR documents the autopoietic property of the Loa/Dixie ecosystem so that future
engineers recognize it as a first-class design decision, not an accidental emergent
behavior.

## The Closed Loop

```
                              ┌─────────────────────┐
                              │                     │
                              ▼                     │
                    ┌───────────────────┐           │
                    │   CONFORMANCE     │           │
                    │   MIDDLEWARE       │           │
                    │   (Level 5)       │           │
                    │                   │           │
                    │  Validates every  │           │
                    │  outgoing payload │           │
                    └────────┬──────────┘           │
                             │                      │
                    violation detected              │
                             │                      │
                             ▼                      │
                    ┌───────────────────┐           │
                    │   NATS SIGNAL     │           │
                    │   PIPELINE        │           │
                    │                   │           │
                    │  dixie.signal.    │           │
                    │  conformance      │           │
                    └────────┬──────────┘           │
                             │                      │
                    signal consumed                 │
                             │                      │
                             ▼                      │
                    ┌───────────────────┐           │
                    │   COMPOUND        │           │
                    │   LEARNING        │           │
                    │                   │           │
                    │  Aggregates       │           │
                    │  violation        │           │
                    │  patterns         │           │
                    └────────┬──────────┘           │
                             │                      │
                    patterns available              │
                             │                      │
                             ▼                      │
                    ┌───────────────────┐           │
                    │   REVIEW          │           │
                    │   ENRICHMENT      │           │
                    │   (Dixie Tier 2)  │           │
                    │                   │           │
                    │  Enriches review  │           │
                    │  prompts with     │           │
                    │  violation context│           │
                    └────────┬──────────┘           │
                             │                      │
                    enriched review                 │
                             │                      │
                             ▼                      │
                    ┌───────────────────┐           │
                    │   SPRINT TASKS    │           │
                    │                   │           │
                    │  Review produces  │           │
                    │  findings →       │           │
                    │  tasks → sprints  │           │
                    └────────┬──────────┘           │
                             │                      │
                    implementation                  │
                             │                      │
                             ▼                      │
                    ┌───────────────────┐           │
                    │   CODE FIXES      │           │
                    │                   │           │
                    │  Engineer fixes   │           │
                    │  conformance      │           │
                    │  violations       │           │
                    └────────┬──────────┘           │
                             │                      │
                    fix deployed                    │
                             │                      │
                             └──────────────────────┘
                    conformance middleware re-validates
```

### The Loop in Words

1. **Conformance middleware** validates every outgoing response against hounfour schemas
   at a configurable sample rate (1.0 in dev, 0.001 in prod)
2. **NATS signal pipeline** receives conformance violations as structured events
3. **Compound learning** aggregates violation patterns over time: which schemas are
   violated most frequently, which endpoints produce non-conforming payloads, and
   whether violations are trending up or down
4. **Review enrichment** (Dixie enrichment tier) injects violation context into
   code review prompts, so that reviews are aware of the system's current conformance
   state ("this endpoint has produced 3 conformance violations in the last week")
5. **Sprint tasks** are generated from review findings that identify conformance issues
6. **Code fixes** address the violations: schema alignment, field corrections, type
   migrations
7. **Conformance middleware** re-validates the fixed code, and the violation count
   decreases — confirming the fix and completing the loop

## Each Component's Dual Role

The autopoietic property arises because every component both **produces** output that
feeds the loop and **consumes** input from the loop. No component is a passive observer.

| Component | Produces | Consumes |
|-----------|----------|----------|
| Conformance Middleware | Violation signals | Deployed code fixes (validates they work) |
| NATS Signal Pipeline | Structured events for aggregation | Raw violations from middleware |
| Compound Learning | Violation patterns, trend data | Raw events from NATS |
| Review Enrichment | Contextually-informed review prompts | Violation patterns from compound learning |
| Sprint Planning | Implementation tasks | Review findings from enriched reviews |
| Code Fixes | Fixed code deployments | Sprint tasks from planning |

If any component only consumed (pure observer) or only produced (pure generator),
the loop would be open — allopoietic rather than autopoietic. The key insight is
that the **conformance middleware** both starts the loop (detecting violations) and
closes it (verifying fixes). It is simultaneously the sensor and the validator.

## The Membrane Design

### Why a Membrane, Not a Wall

A living cell's membrane is selectively permeable — it controls what enters and exits
but does not block all flow. Similarly, the autopoietic loop needs a membrane that:

1. **Prevents deadlock**: If Dixie is broken and the review system needs Dixie's
   enrichment to produce a review that fixes Dixie, we have a deadlock
2. **Permits graceful degradation**: When the loop cannot close, the system should
   still function — just without the self-improving property
3. **Maintains bounded execution**: The loop must not amplify errors into infinite
   repair cycles

### Membrane Implementation: 100ms Timeout

The membrane is implemented as a **100ms timeout on enrichment requests**:

```
Review request → calls Dixie enrichment endpoint
  → Response within 100ms: enriched review (autopoietic mode)
  → Response after 100ms or error: unenriched review (allopoietic mode)
```

**Autopoietic mode**: The full loop is active. Reviews are contextually informed by
Dixie's governance and conformance knowledge. Findings produce targeted fixes.

**Allopoietic mode**: The loop is broken. Reviews still work (they just lack
enrichment context). The system degrades gracefully from "self-improving" to
"externally-improved" — an allopoietic system where improvement comes from outside
the loop rather than from within it.

### Why 100ms?

- Dixie's enrichment endpoint has a 50ms latency budget (see adr-dixie-enrichment-tier.md)
- 100ms = 50ms budget + 50ms network/queue overhead
- At 100ms, the timeout adds < 1% to total review latency (median LLM response: 5000ms)
- Beyond 100ms, the enrichment is stale enough that unenriched review is preferable

### Circuit Breaker on the Membrane

If enrichment requests fail 3 consecutive times, the circuit breaker opens and the
system enters allopoietic mode until the breaker half-opens. This prevents the loop
from repeatedly attempting enrichment when Dixie is unhealthy.

## Why Google and Netflix Never Built This

Google's Borgmon/Monarch and Netflix's Atlas are sophisticated monitoring systems.
But they are fundamentally **allopoietic** — they observe the system from outside
and alert humans who make changes. The monitoring system never participates in the
changes it observes.

```
Traditional monitoring:
  System → [emits metrics] → Monitor → [alerts] → Human → [changes] → System

  The monitor is a PASSIVE OBSERVER. It does not change what it observes.
```

```
Loa/Dixie autopoietic loop:
  System → [emits violations] → Learning → [enriches] → Review → [produces] → Fixes → System

  Every component PARTICIPATES in the system it observes.
```

The difference is fundamental:

1. **Google's approach**: Monitoring is a *service* that the system *consumes*. If
   monitoring fails, the system continues unchanged (just unobserved).

2. **Loa's approach**: Monitoring is a *component* that the system *is*. The
   observation of conformance violations is itself a signal that flows through the
   same knowledge governance infrastructure that the system uses for everything else.

Why did Google never build this? Because monitoring-as-observer was sufficient for
their scale. Google's systems improve through human engineering decisions informed
by monitoring data. The monitoring system helps humans; it does not participate in
the improvement.

Netflix's Chaos Monkey is closer — it injects failures to trigger resilience
mechanisms. But Chaos Monkey is still external to the system: it breaks things so
humans can observe and improve. It does not close the loop automatically.

The autopoietic property emerges only when:
- The system can **review its own output** (conformance middleware)
- The system can **learn from its own reviews** (compound learning)
- The system can **inform its own improvement** (review enrichment)
- The system can **verify its own fixes** (conformance re-validation)

This requires the four capabilities to be built into the same ecosystem, not bolted
on as external services. The Loa ecosystem achieves this because all four capabilities
were designed as constitutional components (see adr-separation-of-powers.md).

## The Maturana & Varela Reference

> "An autopoietic machine is a machine organized (defined as a unity) as a network
> of processes of production (transformation and destruction) of components which:
> (i) through their interactions and transformations continuously regenerate and
> realize the network of processes (relations) that produced them; and (ii) constitute
> it (the machine) as a concrete unity in the space in which they (the components)
> exist by specifying the topological domain of its realization as such a network."
>
> — Maturana & Varela, *Autopoiesis and Cognition* (1980), p. 78

The Loa ecosystem satisfies both criteria:

**(i) Components regenerate the network that produced them**: Conformance violations
(detected by the middleware) produce review findings (via enrichment and compound
learning) that produce code fixes (via sprint planning) that are verified by the
same middleware. The network of production is continuously regenerated.

**(ii) Components constitute the machine as a concrete unity**: The conformance
middleware, NATS pipeline, compound learning engine, enrichment tier, and review
infrastructure collectively define the boundary of the autopoietic system. These
are not external tools; they are the system itself.

### Why This Matters

Unnamed architectural properties get lost. If we do not call this property
"autopoiesis," future engineers will see individual components (a middleware, a
signal pipeline, an enrichment endpoint) without recognizing that their interaction
constitutes a self-maintaining whole. They might:

- Remove the enrichment endpoint because "it adds latency"
- Disable conformance middleware in production because "it's a dev tool"
- Simplify the NATS pipeline because "we don't need event-driven architecture"

Each of these changes is individually reasonable. Together, they destroy the
autopoietic property — the system stops improving itself and becomes dependent on
external intervention. Naming the property gives future engineers the vocabulary
to argue against these changes: "This breaks autopoiesis."

## Consequences

### Positive
- The system improves itself: conformance violations decrease over time without manual intervention
- Review quality increases: reviews that understand current conformance state are more targeted
- Degradation is graceful: the 100ms membrane ensures the loop never blocks normal operation
- The property is named: future engineers can defend it against erosion

### Negative
- Complexity: the loop has 6 components, each of which must work for the property to hold
- Debugging: self-referential loops are harder to debug than linear pipelines
- Latency: the enrichment tier adds a network hop to the review pipeline (mitigated by 100ms membrane)

### Neutral
- The autopoietic property was emergent — this ADR makes it explicit
- The allopoietic fallback means the system works without the property; it just improves more slowly

## Related Documents

- `grimoires/loa/context/adr-hounfour-alignment.md` — Level 5 (Runtime Constitutional Enforcement)
- `grimoires/loa/context/adr-dixie-enrichment-tier.md` — Enrichment endpoint design
- `grimoires/loa/context/adr-separation-of-powers.md` — Constitutional roles of each system
- `app/src/middleware/conformance-middleware.ts` — Runtime conformance middleware
- `app/src/services/conformance-signal.ts` — NATS violation signal pipeline
- `app/src/services/enrichment-service.ts` — Context enrichment assembly (Sprint 11)
