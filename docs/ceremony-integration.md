# Ceremony Integration — Knowledge Routing for Meeting Geometries

> Extracted from Bridgebuilder analysis of loa#247

## The Missing Participant

Every ceremony geometry assumes that all participants start from the same information. This creates hidden homogeneity — even though the *models* are different, the *knowledge* they reason over is identical.

The Oracle changes this by providing:

1. **Domain-classified context** before a ceremony begins
2. **Participant-specific knowledge budgets** based on each model's context window
3. **Role-appropriate source selection** (skeptic gets security sources, builder gets architectural sources)
4. **Trust-bounded inter-model communication** using the `<reference_material>` pattern

## Ceremony-Specific Knowledge Topologies

### Seance (Collaborative Escalation)

```
Round 1: All participants get shared context (diff + PR description)
Round 2: Oracle enriches each participant with sources relevant to
         their previous contribution's domain
Round 3: Oracle detects emerging themes and provides cross-cutting
         sources as conversation converges
```

### Divination (Adversarial + Collaborative)

```
Phase 1 (Flatline): Security/correctness-focused sources
Phase 2 (Seance):   Architecture/opportunity-focused sources
Phase 3 (Synthesis): Cross-cutting context from both phases
```

### Dojo (Mentorship)

```
Mentor model: Full knowledge corpus, architectural context, design rationale
Student model: Task-specific context, code reality, acceptance criteria
```

### Free Jazz (Improvisational)

```
Each participant: Different random subset of knowledge sources
Overlap: Guaranteed minimum shared context (glossary + architecture)
Divergence: Each participant sees sources the others don't
```

## Interface

```typescript
interface CeremonyKnowledgeProvider {
  prepareContext(
    subject: CeremonySubject,
    participants: CeremonyParticipant[],
    geometry: CeremonyGeometry
  ): Promise<Map<ParticipantId, EnrichmentResult>>;

  enrichRound(
    roundNumber: number,
    previousOutputs: Map<ParticipantId, string>,
    geometry: CeremonyGeometry
  ): Promise<Map<ParticipantId, EnrichmentResult>>;
}
```

## The Undercommons Connection

Fred Moten and Stefano Harney's concept of the "undercommons" — knowledge produced outside formal institutional channels. The ceremony engine is a computational model of this insight. The Oracle provides the material conditions for informal knowledge production:

- **Shared vocabulary** (glossary, 24+ terms)
- **Shared history** (development-history, 24 cycles)
- **Shared references** (RFCs, architectural decisions)
- **Shared culture** (web4 manifesto, naming mythology)

A jazz jam session doesn't work if the musicians don't share a common vocabulary of chords, scales, and rhythmic patterns. The Oracle's knowledge corpus is the Real Book of the ceremony engine.
