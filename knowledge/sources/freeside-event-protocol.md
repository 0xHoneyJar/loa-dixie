---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: loa-freeside-pr-76
version: "1.0.0"
tags: ["technical"]
max_age_days: 60
---

# Freeside Event Protocol

NATS-based event system connecting services in the 0xHoneyJar ecosystem. From loa-freeside PR #76.

---

## 1. NATS Stability Tiers

Events are classified by reliability requirements:

| Tier | Delivery | Use Case |
|------|----------|----------|
| **T1: Fire-and-forget** | At-most-once | Analytics, metrics |
| **T2: Reliable** | At-least-once (JetStream) | Billing settlement, identity updates |
| **T3: Ordered** | Exactly-once (JetStream + dedup) | Governance state changes |

## 2. Event Schemas

Key event subjects:
- `billing.settle.{wallet}` — Settlement request (T2)
- `billing.purchase.{wallet}` — Credit purchase confirmed (T2)
- `identity.transfer.{nftId}` — NFT ownership transfer (T3)
- `session.created.{agentId}` — New chat session (T1)
- `session.completed.{agentId}` — Session finished with usage (T1)
- `conviction.updated.{wallet}` — Conviction score changed (T2)

## 3. Cross-Service Communication

```
loa-finn ──NATS──→ freeside (billing settlement)
loa-finn ──NATS──→ freeside (session analytics)
freeside ──NATS──→ loa-finn (conviction updates)
mibera   ──NATS──→ loa-finn (NFT transfer events)
```

Dixie does not publish or subscribe to NATS directly — it communicates with loa-finn via HTTP/WebSocket, and loa-finn handles all event publishing.
