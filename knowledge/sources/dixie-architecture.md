---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-dixie
provenance: cycle-001-sprint-3
version: "1.0.0"
tags: ["technical", "architectural"]
max_age_days: 30
---

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
