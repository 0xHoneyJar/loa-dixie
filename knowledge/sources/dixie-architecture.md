---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-dixie
provenance: cycle-001-sprint-3
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 30
---

<!-- upstream-source: 0xHoneyJar/loa-dixie:feature/dixie-phase2 | generated: false | last-synced: 2026-02-22 -->

# Dixie Architecture

Dixie is the BFF gateway and first dNFT experience layer for the 0xHoneyJar ecosystem. It composes loa-finn (inference, identity, personality), freeside (billing, infrastructure), and mibera (NFT contracts).

---

## 1. Design Principle

**Compose, don't duplicate.** Dixie adds three things:
1. Allowlist-gated access layer (team-only Phase 1)
2. Web chat frontend (React SPA with streaming)
3. Knowledge corpus curation and deployment

All inference, identity, personality, billing, routing, and tool execution remain in loa-finn.

## 2. BFF Gateway

Built on Hono (same as loa-finn). Middleware chain:
- Request ID (UUID v4)
- Secure headers
- CORS
- JWT extraction
- Rate limiting (sliding window, 100 RPM default)
- Allowlist gate (API key or wallet check)

## 3. Proxy Architecture

- **HTTP**: FinnClient with circuit breaker (5 failures / 30s → open, 10s cooldown → half-open)
- **WebSocket**: Bidirectional passthrough for streaming chat
- **Error mapping**: loa-finn errors translated to user-friendly responses

## 4. Knowledge Corpus

20+ curated sources baked into Docker image, synced to shared EFS volume at deploy time. loa-finn reads sources via `FINN_ORACLE_SOURCES_CONFIG` environment variable pointing to the synced `sources.json`.

## 5. Deployment

ECS Fargate task on freeside's shared infrastructure:
- ALB listener rule for `dixie.thj.dev`
- CPU 256, Memory 512MB
- Auto-scaling: 1-3 tasks, CPU target 70%
- Init container syncs knowledge corpus to EFS

## 6. Knowledge-as-Product Architecture

The Oracle's knowledge corpus is not documentation about the product — it IS the product. This follows the Twilio parallel: Twilio's API documentation is inseparable from Twilio's value proposition. The accuracy of docs/guides directly determines developer success, which determines revenue. Similarly, the Oracle's ability to answer questions about Berachain, DeFi governance, and the HoneyJar ecosystem is only as good as its knowledge corpus.

### Conservation Invariant

Every claim in the corpus must be grounded in a verifiable source. This is the knowledge analogue of a billing system's `total_cost = sum(line_items)` — an invariant that, if violated, breaks the product's trustworthiness. The conservation invariant is enforced through:

- **Cross-reference tests**: All `0xHoneyJar/*` references match the 5-repo constellation
- **Terminology linting**: Deprecated terms (e.g., `arrakis`) caught outside historical annotations
- **Source file existence**: Every entry in `sources.json` maps to a file on disk

### Corpus Versioning

`sources.json` schema v2 introduces `corpus_version` — an integer that increments on every corpus mutation. This enables:

- **Version drift detection**: Clients can compare `corpus_version` from the health endpoint against their cached value
- **Deployment verification**: After EFS sync, verify the deployed corpus matches the expected version
- **Freshness validation**: Per-source `last_updated` + `max_age_days` computes staleness

### Freshness as Reliability

Knowledge freshness is treated as a reliability metric, not a documentation concern. The health endpoint reports `knowledge_corpus.stale_sources` alongside finn health and infrastructure status. A stale corpus degrades the Oracle's response quality just as surely as a down database degrades query performance.

### Competitive Positioning

Most NFT/DeFi projects treat knowledge as an afterthought — a static FAQ or docs site maintained separately from infrastructure. Dixie's approach treats knowledge with the same engineering rigor as application code: versioned, tested, monitored, and deployed through CI/CD. This depth of knowledge infrastructure is a durable competitive advantage, analogous to how Stripe's documentation quality became a moat that competitors struggle to replicate.
