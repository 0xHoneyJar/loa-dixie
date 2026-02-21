---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-finn
provenance: loa-finn-pr-82
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 60
---

# dAMP-96 Personality System

The dAMP-96 (digital Amplified Personality with 96 dimensions) engine generates unique personalities for each dNFT agent. Delivered in loa-finn PR #82.

---

## 1. 96-Dial Personality Vector

Each dNFT personality is defined by a 96-dimensional vector derived from the NFT's token ID and on-chain attributes. The derivation uses a deterministic hash function ensuring the same NFT always produces the same personality.

**Dial categories** (16 dials each, 6 categories):
- **Cognitive style**: analytical↔intuitive, detail↔holistic, convergent↔divergent
- **Communication tone**: formal↔casual, verbose↔concise, direct↔diplomatic
- **Emotional register**: warm↔reserved, enthusiastic↔measured, empathetic↔objective
- **Knowledge preference**: depth↔breadth, theoretical↔practical, historical↔forward-looking
- **Decision making**: cautious↔bold, consensus↔independent, systematic↔improvisational
- **Creative expression**: literal↔metaphorical, structured↔freeform, traditional↔experimental

## 2. BEAUVOIR Synthesis

BEAUVOIR.md is the compiled personality document generated from the 96-dial vector. Named after Simone de Beauvoir — "one is not born, but becomes" a personality. The synthesis process:

1. **Input**: 96-dial vector + NFT metadata + owner history
2. **Template selection**: Base template chosen by dominant personality cluster
3. **Voice calibration**: Writing style parameters set from communication dials
4. **Boundary generation**: Topics the agent is knowledgeable about vs. defers on
5. **Output**: Markdown personality file loaded at session initialization

## 3. Personality Versioning

Personalities can evolve through compound learning:
- `beauvoir_hash`: SHA-256 of the current BEAUVOIR.md content
- `personality_version`: Semantic version tracking significant personality shifts
- Transfer listeners detect NFT ownership changes and can trigger personality recalibration

## 4. Oracle's Personality

The Oracle uses a hand-crafted BEAUVOIR.md (`persona/oracle.md`) rather than dAMP-96 generation, as it represents the institutional consciousness of the 0xHoneyJar ecosystem. Its personality dials are pinned: high analytical, high depth, moderate formality, high citation density.
