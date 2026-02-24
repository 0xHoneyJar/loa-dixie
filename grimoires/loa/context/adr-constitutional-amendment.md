# ADR: Constitutional Amendment Protocol for Hounfour Schema Evolution

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Sprint 12 — Task 12.4 (Level 6 Foundation)
**References**: adr-hounfour-alignment.md (Level 6 definition), IETF RFC 2026 (Internet Standards Process)

## Context

Hounfour is the constitutional document of the loa ecosystem. Changes to hounfour schemas
affect all consumers (Dixie, Freeside/Arrakis, loa-finn, and any future downstream services).
Unlike internal changes that affect only one service, "constitutional amendments" — changes
to shared protocol schemas — require a higher bar of review, compatibility analysis, and
coordinated rollout.

The existing process for hounfour changes is ad hoc: a PR is opened, reviewed by the hounfour
maintainers, and merged. Consumers discover changes when they bump the dependency version and
their CI fails. This is the "surprise constitution amendment" antipattern — equivalent to
changing the law without notifying the affected citizens.

Sprint 12 introduces the Protocol Diff Engine and Migration Proposal Generator as
technical infrastructure. This ADR defines the governance process that wraps that
infrastructure: when and how constitutional amendments are proposed, reviewed, and ratified.

## The IETF Parallel

The Internet Engineering Task Force (IETF) manages protocol standards through a formal
process defined in RFC 2026 (Bradner, 1996). Key elements:

| IETF Concept | Hounfour Equivalent |
|---|---|
| Internet-Draft | Hounfour PR (draft schema change) |
| Working Group Last Call | Cross-repo conformance check |
| IESG Review | Consumer impact analysis via diff engine |
| Proposed Standard | Migration proposal generated |
| Draft Standard | Review cycle with consumers |
| Internet Standard | Merged and tagged with semver bump |

The key insight from the IETF process is **running code and rough consensus**:
- "Running code" = conformance tests pass in all consumers
- "Rough consensus" = affected teams approve the migration proposal

## Amendment Categories

### Category 1: Patch (Non-Constitutional)

Changes that do not affect the schema contract visible to consumers.

**Examples**: Documentation fixes, internal refactoring, test improvements.

**Process**: Standard PR review. No cross-repo check needed.

**Semver**: PATCH bump (e.g., 7.9.1 -> 7.9.2)

### Category 2: Minor (Additive Amendment)

Changes that add new schemas, optional fields, or new validators without
breaking existing consumers.

**Examples**: New `StakePosition` schema, new optional field on `BillingEntry`,
new cross-field validator for `EscrowEntry`.

**Process**:
1. Hounfour PR with new schema/field
2. Protocol Diff Engine snapshot comparison (automated CI)
3. Migration Proposal generated (automated)
4. Consumer impact analysis: "Does any consumer break?"
5. If no breakage: merge with MINOR bump
6. Consumers adopt at their own pace (additive changes are backward-compatible)

**Semver**: MINOR bump (e.g., 7.9.x -> 7.10.0)

**Backward compatibility**: REQUIRED. New fields MUST be optional. New schemas
do not affect consumers that don't import them.

### Category 3: Major (Breaking Amendment — Constitutional Change)

Changes that modify required fields, remove schemas, change field types, or
alter validator behavior in ways that break existing consumers.

**Examples**: Removing the `conversation` schema, making an optional field required,
changing a field from `string` to `number`, removing a validator.

**Process** (higher bar):
1. Hounfour PR with RFC-style justification:
   - Why the breaking change is necessary
   - What alternatives were considered and rejected
   - Migration path for each affected consumer
2. Protocol Diff Engine produces `breaking_changes` in manifest
3. Migration Proposal generated with `required` priority items
4. Cross-repo conformance check: run each consumer's conformance suite against
   the proposed change (CI matrix)
5. Consumer impact analysis: specific file:line references for breakage
6. Migration proposals reviewed by each consumer team
7. N-1 support period: old version must remain functional for one minor release
8. Merge with MAJOR bump only after all consumers have approved migration plan

**Semver**: MAJOR bump (e.g., 7.x.x -> 8.0.0)

**Backward compatibility**: NOT required, but N-1 support IS required.
The previous minor version must continue to work for at least one release cycle.

## Cross-Repo Conformance Orchestrator

The conformance orchestrator is a CI pipeline concept that validates protocol
changes across all consumers before merge.

### Architecture

```
hounfour PR opened
    |
    v
[Protocol Diff Engine] --> ProtocolChangeManifest
    |
    v
[Migration Proposal Generator] --> MigrationProposal
    |
    v
[Cross-Repo Conformance Matrix]
    |-- dixie: npm install hounfour@PR-branch && npm test
    |-- freeside: npm install hounfour@PR-branch && npm test
    |-- loa-finn: npm install hounfour@PR-branch && npm test
    |
    v
[Conformance Report] --> All pass? --> Merge
                     --> Any fail? --> Block + generate migration tasks
```

### Implementation Phases

**Phase 1 (Current — Sprint 12)**: Manual. Protocol Diff Engine and Migration
Proposal Generator run locally. Developers manually compare snapshots and review
proposals.

**Phase 2 (Future)**: Semi-automated. GitHub Action runs diff engine on hounfour
PRs. Posts migration proposal as PR comment. Consumer conformance is still manual.

**Phase 3 (Future)**: Fully automated. GitHub Action triggers cross-repo CI matrix.
Conformance results posted to hounfour PR. Auto-blocks merge if any consumer fails.

## Backward Compatibility Requirements

| Change Type | Backward Compatible? | N-1 Support? | Consumer Action Required? |
|---|---|---|---|
| Patch | Yes | N/A | None |
| Minor (additive) | Yes | N/A | Optional adoption |
| Major (breaking) | No | Yes (1 release) | Required migration |

### N-1 Support Policy

When a major version is released (e.g., 8.0.0):
- The previous minor version (7.x.y) continues to receive PATCH fixes
- Consumers have until the next minor release (8.1.0) to complete migration
- After 8.1.0, version 7.x.y enters maintenance-only (security fixes)
- After 8.2.0, version 7.x.y is fully sunset

This mirrors the IETF's "two interoperable implementations" requirement:
a new standard is not considered stable until existing implementations
have successfully migrated.

## Decision

Adopt the three-category amendment process with automated tooling:
1. Patch: standard PR review
2. Minor: diff engine + migration proposal (advisory)
3. Major: cross-repo conformance check + consumer approval (blocking)

## Consequences

### Positive
- Protocol changes are no longer surprises to consumers
- Breaking changes require explicit consumer approval
- Migration proposals provide actionable upgrade guidance
- N-1 support prevents forced emergency migrations

### Negative
- Major changes take longer to land (by design)
- Cross-repo CI matrix adds infrastructure complexity
- N-1 support means maintaining two versions simultaneously

### Neutral
- The amendment protocol itself can be amended (meta-amendment)
- The process formalizes what good teams already do informally

## Related Documents

- `app/src/services/protocol-diff-engine.ts` — ProtocolDiffEngine implementation
- `app/src/services/migration-proposal.ts` — MigrationProposal generator
- `grimoires/loa/context/adr-hounfour-alignment.md` — Protocol maturity levels (Level 6)
- `grimoires/loa/context/adr-separation-of-powers.md` — Constitutional governance model
- IETF RFC 2026 — The Internet Standards Process
- Apache Avro Specification, Schema Resolution — Schema evolution rules
- Google Protocol Buffers, Language Guide (proto3), Updating A Message Type
