# ADR: Dixie as Context Enrichment Tier

**Status**: Proposed
**Date**: 2026-02-24
**Source**: Sprint 7 (Level 5 Foundation) — architectural planning
**References**: adr-hounfour-alignment.md, SDD, PRD

## Context

The Loa review infrastructure currently operates in a 3-tier routing model:

```
Hounfour (schemas/validators) --> Codex (review prompts) --> curl (HTTP execution)
```

Each tier has a distinct responsibility:
- **Hounfour**: Protocol definition, schema validation, cross-field invariants
- **Codex**: Review prompt templates, skill definitions, analysis logic
- **curl**: HTTP transport to LLM providers (Anthropic, OpenAI, etc.)

This architecture lacks a **knowledge context enrichment** layer. Review prompts
operate on raw code and schemas without access to project-specific governance
knowledge: conviction tiers, community norms, architectural decisions, soul memory,
or compound learning signals. This gap means reviews are generic rather than
contextually informed.

## Proposal: 4-Tier Architecture with Dixie as Enrichment Tier

```
Hounfour --> Dixie --> Codex --> curl
  (schema)   (context)  (prompt)  (transport)
```

### Tier Responsibilities

| Tier | System | Responsibility | Latency Budget |
|------|--------|---------------|----------------|
| 1 | Hounfour | Schema validation, type checking, cross-field invariants | 0ms (compile-time) |
| 2 | Dixie | Knowledge context enrichment: governance state, soul memory, learning signals | < 50ms |
| 3 | Codex | Review prompt assembly, skill orchestration, analysis routing | < 10ms |
| 4 | curl | HTTP transport to LLM providers | 1-30s (LLM dependent) |

### Dixie's Enrichment Role

Dixie enriches review prompts with contextual knowledge before they reach Codex:

1. **Governance Context**: Current conviction tier distribution, active proposals,
   community voting state. Enables reviews that understand "this change affects
   governance" vs. "this is a routine bugfix."

2. **Soul Memory**: Personality traits, interaction patterns, compound learning
   outcomes. Enables reviews that account for agent behavioral history.

3. **Economic Context**: Budget consumption, pricing trends, cost conservation
   status. Enables reviews that flag economically unsound changes.

4. **Reputation Context**: Agent reputation scores, reliability metrics, sanction
   history. Enables reviews that weight feedback by reviewer credibility.

5. **Conformance Context**: Recent conformance violations, schema drift patterns,
   Level 5 compliance state. Enables reviews that prioritize protocol alignment.

### API Surface Design

#### Enrichment Endpoint

```
POST /api/enrich/review-context
```

**Request**:
```json
{
  "review_type": "sprint" | "audit" | "bridge" | "flatline",
  "scope": {
    "sprint_id": "sprint-7",
    "files_changed": ["app/src/middleware/conformance-middleware.ts"],
    "schemas_touched": ["accessPolicy", "healthStatus"]
  },
  "requestor": {
    "agent_type": "bridgebuilder" | "auditor" | "reviewer",
    "nft_id": "eip155:80084/0x.../1"
  }
}
```

**Response**:
```json
{
  "context": {
    "governance": {
      "conviction_distribution": { "steward": 2, "contributor": 5, "observer": 10 },
      "active_proposals": 3,
      "governance_relevance": "high"
    },
    "conformance": {
      "level": 5,
      "recent_violations": 0,
      "schemas_coverage": 0.95
    },
    "economic": {
      "budget_utilization": 0.45,
      "cost_trend": "stable"
    },
    "reputation": {
      "reviewer_reliability": 0.92,
      "sample_size": 47
    }
  },
  "enrichment_tokens": 350,
  "latency_ms": 12
}
```

#### Conformance Check Endpoint

```
POST /api/enrich/conformance-check
```

Validates a payload against hounfour schemas and returns detailed conformance status.
Used by Codex to verify review outputs before submission.

**Request**:
```json
{
  "schema": "accessPolicy",
  "payload": { "type": "role_based", "roles": ["team"], "audit_required": true, "revocable": false }
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "level": 5,
  "validated_at": "2026-02-24T12:00:00.000Z"
}
```

### Integration Points

#### 1. Codex Integration (Primary)

Codex calls Dixie's enrichment endpoint before assembling review prompts:

```
[Codex skill invocation]
  --> POST /api/enrich/review-context (Dixie)
  <-- { context: { governance, conformance, economic, reputation } }
  --> Assemble prompt with enriched context
  --> POST /v1/messages (Anthropic via curl)
```

The enrichment context is injected as a structured prefix in the review prompt,
similar to how memory context is injected in chat requests today (middleware
position 14).

#### 2. Flatline Integration

Flatline multi-model reviews can use Dixie's enrichment to provide shared context
across all models (Opus, GPT-5.2), ensuring both reviewers have the same
governance knowledge when evaluating changes.

#### 3. Run Bridge Integration

The run bridge iterative improvement loop can query Dixie for conformance state
before and after each iteration, using the delta as a quality signal.

#### 4. Self-Hosting Property

Dixie is itself a consumer of the review infrastructure. When the review
infrastructure reviews Dixie's own code changes:

```
Hounfour validates Dixie's schemas
  --> Dixie enriches the review with its own governance context
    --> Codex assembles the review prompt
      --> curl sends to LLM
```

This creates a self-referential loop where Dixie's own knowledge improves the
quality of reviews applied to Dixie. This is the self-hosting property:
Dixie reviews itself using context that Dixie provides.

### Quality Event Feedback Loop

Conformance violations detected at runtime (Level 5 middleware) feed back into
the enrichment context, creating a closed-loop quality system:

```
1. Request arrives at Dixie
2. Response generated and returned
3. Conformance middleware samples response (sampleRate)
4. Violation detected --> signal emitted to NATS (dixie.signal.conformance)
5. Compound learning engine aggregates violation patterns
6. Next review request: Dixie enrichment includes "recent_violations: N"
7. Review output is more focused on conformance issues
8. Developer fixes violation
9. Conformance middleware validates fix
10. Violation count decreases --> enrichment reflects improvement
```

This loop means the system gets better at catching the specific types of
conformance issues it has seen before — a self-improving property.

### Latency Budget

The enrichment tier must not significantly impact review latency. Given that
LLM calls (tier 4) take 1-30 seconds, Dixie's budget is 50ms:

| Operation | Budget | Source |
|-----------|--------|--------|
| Governance context lookup | 10ms | Redis projection cache |
| Conformance state summary | 5ms | In-memory metrics |
| Economic context | 10ms | Redis projection cache |
| Reputation lookup | 5ms | In-memory or Redis |
| Response serialization | 5ms | JSON.stringify |
| Network overhead | 15ms | Localhost or same-VPC |
| **Total** | **50ms** | |

At 50ms enrichment latency vs. 5000ms median LLM response time, the enrichment
tier adds < 1% to total review duration.

### Fallback Behavior

If Dixie is unavailable, the review infrastructure degrades gracefully to the
existing 3-tier model:

```
Hounfour --> Codex --> curl (no enrichment, reviews still work)
```

This is implemented via a timeout (100ms) on the enrichment request. On timeout
or error, Codex proceeds without enrichment context. Reviews are less informed
but still functional.

The fallback is critical for the self-hosting property: if Dixie is broken,
reviews of Dixie must still work. A hard dependency would create a deadlock
where broken Dixie cannot be fixed because reviews require working Dixie.

## Implementation Phases

### Phase A: Foundation (Sprint 7 — Current)
- Runtime conformance middleware (Task 7.1)
- Conformance violation signal pipeline (Task 7.3)
- Auto-generated conformance fixtures (Task 7.2)
- This design document (Task 7.5)

### Phase B: Enrichment Endpoint
- Implement `POST /api/enrich/review-context`
- Wire governance, conformance, economic, reputation data sources
- Integration tests with mock Codex consumer

### Phase C: Codex Integration
- Codex skill modifications to call Dixie enrichment
- Prompt template updates to inject enrichment context
- Latency benchmarks

### Phase D: Self-Hosting Loop
- Flatline integration with shared enrichment context
- Run bridge conformance delta tracking
- Compound learning aggregation of violation patterns
- Metrics dashboard for self-improvement velocity

## Decision

We adopt the 4-tier architecture with Dixie as the context enrichment tier.
Sprint 7 delivers the foundation (Phase A). Subsequent sprints implement
Phases B-D incrementally.

## Consequences

**Positive**:
- Reviews become contextually informed (governance, economic, reputation awareness)
- Self-improving quality loop via conformance violation feedback
- Self-hosting property enables Dixie to improve its own review quality
- Graceful degradation preserves existing review capability

**Negative**:
- Additional network hop in review pipeline (mitigated by 50ms budget)
- Complexity of self-referential loop requires careful deadlock avoidance
- Enrichment context token consumption adds to LLM costs (mitigated by 350 token budget)

**Neutral**:
- Hounfour and Codex remain unchanged in Phase A
- Existing review quality is baseline; enrichment is additive

## Related Documents

- `grimoires/loa/context/adr-hounfour-alignment.md` — Protocol maturity levels (1-5)
- `app/src/middleware/conformance-middleware.ts` — Runtime conformance middleware
- `app/src/services/conformance-signal.ts` — Violation signal pipeline
- `app/src/services/conformance-suite.ts` — E2E conformance suite (Level 4)
- `grimoires/loa/context/adr-communitarian-agents.md` — Governance context source
- `grimoires/loa/context/adr-conway-positioning.md` — Architectural positioning
