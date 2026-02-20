---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: loa-freeside-pr-76
version: "1.0.0"
tags: ["core"]
max_age_days: 90
---

# Freeside Glossary

14 glossary entries from loa-freeside PR #76 (Neuromancer Codex).

---

### Freeside
**Tags**: architectural, technical
The infrastructure and billing settlement layer. Named after the orbital habitat in Gibson's Neuromancer — a self-contained space station with its own economy and governance. Formerly known as Arrakis. Repository: 0xHoneyJar/loa-freeside.

### Settlement
**Tags**: technical
The process of finalizing billing for an agent session. loa-finn sends usage data to freeside, which debits credits and records the transaction.

### Lot
**Tags**: technical
A discrete unit of purchased credits with FIFO consumption semantics. Each purchase creates a new lot with amount, timestamp, and optional expiration.

### Dead Letter Queue (DLQ)
**Tags**: technical
Queue for failed settlement transactions. Entries are retried with exponential backoff and eventually require manual review.

### Conviction
**Tags**: architectural, philosophical
Composite score measuring a wallet's community engagement. Determines model tier access and rate limits.

### Stability Tier
**Tags**: technical
NATS event delivery guarantee level: T1 (fire-and-forget), T2 (at-least-once), T3 (exactly-once).

### Neuromancer Codex
**Tags**: philosophical
The documentation initiative in freeside PR #76 that formalized the API surface, economics, and infrastructure as code-equivalent artifacts.

### Conservation Invariant
**Tags**: architectural, philosophical
Any of the 14 LTL properties that must hold true for the billing system to maintain economic integrity.

### Spice Gate
**Tags**: architectural
The billing settlement protocol between loa-finn and freeside. Named for the Dune reference — spice (compute credits) flows through the gate.

### EFS Volume
**Tags**: technical
Elastic File System mount shared between ECS tasks. Used for knowledge corpus synchronization between Dixie and loa-finn.

### S2S JWT
**Tags**: technical
Service-to-service JSON Web Token used for authenticated internal communication between Dixie, loa-finn, and freeside.

### WAF
**Tags**: technical
Web Application Firewall rules protecting the ALB from common attacks (SQL injection, XSS, rate limiting at the edge).

### Capacity Provider
**Tags**: technical
ECS Fargate capacity provider managing task placement and auto-scaling across the cluster.

### Access Point
**Tags**: technical
EFS access point providing a virtual root directory for a specific service. Dixie uses `/dixie-data`, loa-finn uses `/finn-data`.
