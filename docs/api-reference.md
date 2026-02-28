# Dixie API Reference

> Protocol Version: **X-Protocol-Version: 8.2.0**
> Source: `app/src/services/protocol-version.ts`

All responses include the `X-Protocol-Version` header advertising the current protocol surface.
Clients may send `X-Protocol-Version` in requests to declare compatibility expectations.

---

## Authentication Methods

| Method | Header | Description |
|--------|--------|-------------|
| **JWT** | `Authorization: Bearer <token>` | SIWE-issued JWT. Wallet extracted by middleware, forwarded as `x-wallet-address` header to route handlers. |
| **Admin Key** | `Authorization: Bearer <admin-key>` | Static admin API key. Constant-time comparison via `safeEqual`. |
| **TBA** | `x-agent-tba` + `x-agent-owner` | Token-Bound Account auth for agent-to-agent communication. Middleware sets both headers after verification. |
| **HMAC** | `x-callback-signature` + `x-callback-timestamp` | HMAC-SHA256 callback verification for schedule fire events. |
| **Conviction Tier** | `x-conviction-tier` (set by middleware) | Middleware resolves wallet to BGT staking tier. Routes read the header for access gating. |

## Conviction Tiers

Five-tier commons governance model (monotonic expansion):

| Tier | Access Level |
|------|-------------|
| `observer` | Read-only, restricted rate limits |
| `participant` | Basic participation (e.g., priority voting) |
| `builder` | Extended access (scheduling, enrichment, reputation queries) |
| `architect` | Agent API, fleet spawn, advanced queries |
| `sovereign` | Full access including autonomous mode management |

---

## Middleware Pipeline

All `/api/*` routes pass through a 15-position middleware pipeline in constitutional order (see [ADR-001](adr/001-middleware-pipeline-ordering.md)):

1. `requestId` -- trace ID generation
2. `tracing` -- OpenTelemetry spans
3. `secureHeaders` -- CSP, HSTS, X-Frame-Options
3.5. `protocolVersion` -- X-Protocol-Version header
4. `cors` -- CORS handling
5. `bodyLimit` -- 100KB payload limit
6. `responseTime` -- X-Response-Time header
7. `logger` -- structured logging
8. `jwt` -- wallet extraction from JWT
9. `walletBridge` -- wallet to x-wallet-address header
10. `rateLimit` -- per-wallet/IP rate limiting (Redis-backed when available)
11. `allowlist` -- wallet/API key gate
12. `payment` -- x402 micropayment slot
13. `convictionTier` -- BGT conviction resolution
14. `memoryContext` -- soul memory injection
15. `economicMetadata` -- cost tracking headers

---

## Route Modules

### /api/health

**Source**: `app/src/routes/health.ts`
**Auth**: Public (governance endpoint requires Admin key)
**Governance**: GovernorRegistry aggregation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check with service status, uptime, corpus metadata, infrastructure, reputation, and governance summary |
| GET | `/api/health/governance` | Unified health of all registered resource governors (admin-gated) |

**GET /api/health**

Returns overall system status (`healthy`, `degraded`, `unhealthy`). Finn unreachable = `unhealthy`. Infrastructure service down = `degraded`.

Response:
```json
{
  "status": "healthy | degraded | unhealthy",
  "version": "2.0.0",
  "uptime_seconds": 3600,
  "services": {
    "dixie": { "status": "healthy" },
    "loa_finn": { "status": "healthy", "latency_ms": 12, "circuit_state": "..." },
    "knowledge_corpus": { "corpus_version": "...", "sources": 10, "stale_sources": 0 }
  },
  "infrastructure": {
    "postgresql": { "status": "healthy", "latency_ms": 2 },
    "redis": { "status": "healthy", "latency_ms": 1 },
    "nats": { "status": "healthy" }
  },
  "reputation_service": { "initialized": true, "aggregate_count": 150 },
  "governance": {
    "governor_count": 3,
    "resource_types": ["knowledge_corpus", "knowledge_governor", "fleet"],
    "health": "healthy"
  },
  "timestamp": "2026-02-28T00:00:00.000Z"
}
```

**GET /api/health/governance** (Admin key required)

Returns detailed governor snapshots. Returns 401 without auth header, 403 with invalid key.

Response:
```json
{
  "governors": [ { "resourceType": "...", "health": { "status": "healthy" } } ],
  "totalResources": 3,
  "degradedResources": 0,
  "timestamp": "2026-02-28T00:00:00.000Z"
}
```

---

### /api/auth

**Source**: `app/src/routes/auth.ts`
**Auth**: Public (SIWE signature required for /siwe)
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/siwe` | Verify SIWE signature, check allowlist, issue JWT |
| GET | `/api/auth/verify` | Validate JWT and return wallet address |

**POST /api/auth/siwe**

Request (Zod-validated):
```json
{
  "message": "string (min 1, SIWE-formatted)",
  "signature": "string (min 1, 0x-prefixed)"
}
```

Response (200):
```json
{
  "token": "eyJ...",
  "wallet": "0x...",
  "expiresIn": "1h"
}
```

Errors: 400 (invalid body), 401 (SIWE verification failed), 403 (wallet not on allowlist).

**GET /api/auth/verify** (Bearer token required)

Response (200):
```json
{
  "wallet": "0x...",
  "role": "team",
  "exp": 1709164800
}
```

---

### /api/admin

**Source**: `app/src/routes/admin.ts`
**Auth**: Admin key (all endpoints)
**Governance**: None

Admin key is validated via constant-time `safeEqual`. Returns 403 if admin key is unconfigured (SEC-001 defense-in-depth).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/allowlist` | List current allowlist entries |
| POST | `/api/admin/allowlist` | Add wallet or API key to allowlist |
| DELETE | `/api/admin/allowlist/:entry` | Remove entry from allowlist |

**POST /api/admin/allowlist**

Request:
```json
{
  "type": "wallet | apiKey",
  "value": "string (EIP-55 validated for wallets)"
}
```

Response (201):
```json
{
  "ok": true,
  "data": { "wallets": [...], "apiKeys": [...] }
}
```

---

### /api/chat

**Source**: `app/src/routes/chat.ts`
**Auth**: JWT required
**Governance**: None (conviction tier passed as response header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a chat message (creates session if no sessionId provided) |

**POST /api/chat**

Request (Zod-validated):
```json
{
  "prompt": "string (1-10000 chars)",
  "sessionId": "string (optional, alphanumeric/hyphen/underscore, max 128)"
}
```

Response (200):
```json
{
  "sessionId": "abc-123",
  "messageId": "req-uuid"
}
```

Response headers: `X-Model-Pool`, `X-Memory-Tokens`, `X-Conviction-Tier`.

Emits `dixie.signal.interaction` to NATS (fire-and-forget) for compound learning pipeline.

---

### /api/sessions

**Source**: `app/src/routes/sessions.ts`
**Auth**: JWT required
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions (proxied to loa-finn) |
| GET | `/api/sessions/:id` | Get session details (proxied to loa-finn) |

Path params validated via `isValidPathParam` (SEC-002: prevents path traversal before URL interpolation).

---

### /api/identity

**Source**: `app/src/routes/identity.ts`
**Auth**: JWT required
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/identity/oracle` | Oracle dNFT identity (name, dAMP-96 summary, beauvoir hash) |

Response (200):
```json
{
  "nftId": "oracle",
  "name": "The Oracle",
  "damp96_summary": { ... } | null,
  "beauvoir_hash": "..." | null
}
```

Cached for 5 minutes. Falls back to placeholder if identity graph unavailable.

---

### /api/ws/ticket

**Source**: `app/src/routes/ws-ticket.ts`
**Auth**: JWT required (wallet extracted by upstream middleware)
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ws/ticket` | Issue a single-use WebSocket authentication ticket |

Response (200):
```json
{
  "ticket": "random-token",
  "expires_in": 30
}
```

Prevents token leakage via server logs, browser history, and referrer headers. Rate limited per wallet (429 if too many outstanding tickets).

---

### /api/personality

**Source**: `app/src/routes/personality.ts`
**Auth**: JWT required (evolution endpoint requires wallet)
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personality/:nftId` | BEAUVOIR personality display (traits, anti-narration, dAMP-96) |
| GET | `/api/personality/:nftId/evolution` | Personality change history (wallet required) |

**GET /api/personality/:nftId**

Returns personality data or 404 if not found.

**GET /api/personality/:nftId/evolution**

Response (200):
```json
{
  "nftId": "abc",
  "evolution": [...],
  "count": 5
}
```

---

### /api/memory

**Source**: `app/src/routes/memory.ts`
**Auth**: JWT required + NFT ownership verification
**Governance**: AccessPolicy-based authorization (per-operation: read, seal, history, delete)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/memory/:nftId` | Current memory projection (active context, topics, access policy) |
| POST | `/api/memory/:nftId/seal` | Seal a conversation with encryption policy (owner-only) |
| GET | `/api/memory/:nftId/history` | Paginated conversation history |
| DELETE | `/api/memory/:nftId/:conversationId` | Delete a conversation (owner-only) |

**POST /api/memory/:nftId/seal** (Zod-validated)

Request:
```json
{
  "conversationId": "string (1-128 chars)",
  "sealingPolicy": {
    "encryption_scheme": "aes-256-gcm",
    "key_derivation": "hkdf-sha256",
    "key_reference": "string (optional)",
    "access_audit": true,
    "access_policy": {
      "type": "none | read_only | time_limited | role_based",
      "duration_hours": 24,
      "roles": ["owner"],
      "audit_required": true,
      "revocable": true
    }
  }
}
```

**GET /api/memory/:nftId/history** (Zod-validated query params)

Query params: `limit` (1-100, default 20), `cursor` (string, max 256), `includeSealed` (boolean, default false).

---

### /api/autonomous

**Source**: `app/src/routes/autonomous.ts`
**Auth**: JWT required + wallet ownership/delegation
**Governance**: ConvictionTier (sovereign required for permission updates)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/autonomous/:nftId/permissions` | Get current autonomous permissions (owner/delegate) |
| PUT | `/api/autonomous/:nftId/permissions` | Update autonomous permissions (sovereign tier + owner) |
| GET | `/api/autonomous/:nftId/audit` | Audit trail for autonomous actions (owner/delegate) |
| GET | `/api/autonomous/:nftId/summary` | Daily summary of autonomous activity (owner/delegate) |

**GET /api/autonomous/:nftId/audit**

Query params: `limit` (default 100, max 500).

Response:
```json
{
  "nftId": "abc",
  "entries": [...],
  "count": 42
}
```

---

### /api/schedule

**Source**: `app/src/routes/schedule.ts`
**Auth**: JWT required + builder+ conviction tier
**Governance**: ConvictionTier (builder+), HMAC for callbacks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/schedule` | Create a schedule from natural language expression |
| GET | `/api/schedule/:nftId` | List schedules for an NFT (ownership-verified) |
| DELETE | `/api/schedule/:scheduleId` | Cancel a schedule |
| GET | `/api/schedule/:scheduleId/history` | Get execution history for a schedule |
| POST | `/api/schedule/callback` | Receive loa-finn cron fire events (HMAC-authenticated) |

**POST /api/schedule**

Request:
```json
{
  "nftId": "string",
  "nlExpression": "string (e.g., 'every day at 9am')",
  "prompt": "string",
  "name": "string (optional)",
  "maxFires": "number (optional)"
}
```

**POST /api/schedule/callback** (HMAC-authenticated)

Headers: `x-callback-signature`, `x-callback-timestamp`.
Signature computed over `scheduleId:timestamp` using shared secret.

Request:
```json
{
  "scheduleId": "string",
  "messageId": "string (optional)"
}
```

---

### /api/agent

**Source**: `app/src/routes/agent.ts`
**Auth**: TBA required (x-agent-tba + x-agent-owner headers)
**Governance**: ConvictionTier (architect+ via owner wallet), per-agent rate limiting

Agent API endpoints for organism-to-organism communication. All endpoints require TBA authentication and architect+ conviction tier (verified via the agent's owner wallet).

Rate limits: per-agent RPM and RPD with LRU eviction (max 1000 tracked agents).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/query` | Agent-to-Oracle query with cost tracking and x402 receipts |
| GET | `/api/agent/capabilities` | Agent capability discovery (skills, rate limits, pricing) |
| GET | `/api/agent/knowledge` | Knowledge corpus metadata (merged local + finn) |
| GET | `/api/agent/self-knowledge` | Oracle metacognition with community governance data |
| POST | `/api/agent/knowledge/priorities/vote` | Conviction-gated knowledge priority voting (participant+) |
| GET | `/api/agent/knowledge/priorities` | Aggregated community knowledge priorities |
| POST | `/api/agent/schedule` | Agent-initiated schedule creation |

**POST /api/agent/query**

Request:
```json
{
  "query": "string (max 10000 chars)",
  "format": "text | json | structured (default: text)",
  "maxTokens": "integer (10-8192, optional)",
  "knowledgeDomain": "string (max 256 chars, optional)",
  "sessionId": "string (optional)",
  "maxCostMicroUsd": "number (optional, pre-flight budget check)"
}
```

Response:
```json
{
  "response": "...",
  "format": "text",
  "sources": [{ "id": "...", "title": "...", "relevance": 0.95 }],
  "cost": {
    "modelUsed": "claude-sonnet-4-6",
    "inputTokens": 200,
    "outputTokens": 400,
    "costMicroUsd": 50
  },
  "receipt": {
    "receiptId": "rcpt-...",
    "payer": "0x...",
    "payee": "dixie-oracle",
    "amountMicroUsd": 50,
    "timestamp": "2026-02-28T00:00:00.000Z"
  },
  "freshness": {
    "confidence": "high | medium | low",
    "disclaimer": "string | null",
    "staleSourceCount": 0
  }
}
```

Response headers: `X-Cost-Micro-USD`, `X-Model-Used`, `X-Receipt-Id`, `X-Knowledge-Confidence`, `X-Budget-Warning`.

**POST /api/agent/knowledge/priorities/vote** (participant+ tier)

Request:
```json
{
  "sourceId": "string (must match canonical source list)",
  "priority": "integer (1-5)"
}
```

---

### /api/learning

**Source**: `app/src/routes/learning.ts`
**Auth**: JWT required + NFT ownership verification
**Governance**: None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/learning/:nftId/insights` | Learning insights for an NFT (ownership-verified) |
| GET | `/api/learning/:nftId/gaps` | Knowledge gaps for an NFT with alerting thresholds |

**GET /api/learning/:nftId/insights**

Query params: `limit` (default 10).

Response:
```json
{
  "nftId": "abc",
  "insights": [...],
  "count": 10,
  "pendingSignals": 3
}
```

**GET /api/learning/:nftId/gaps**

Response:
```json
{
  "nftId": "abc",
  "gaps": [{ "missRate": 0.4, ... }],
  "alerting": true,
  "alertCount": 2
}
```

Alerting triggers when any gap has `missRate > 0.3`.

---

### /api/reputation

**Source**: `app/src/routes/reputation.ts`
**Auth**: JWT required (builder+ for agent queries, Admin key for population)
**Governance**: ConvictionTier (builder+), GovernedResource (ReputationService)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reputation/query` | Lightweight score query for finn bridge (routing key lookup) |
| GET | `/api/reputation/population` | Population statistics (admin-gated) |
| GET | `/api/reputation/:nftId` | Full reputation aggregate (builder+ conviction tier) |
| GET | `/api/reputation/:nftId/cohorts` | Per-model task cohorts with cross-model score (builder+) |

**GET /api/reputation/query**

Query params: `routingKey` (format: `nft:<id>`).

Response:
```json
{
  "score": 0.85 | null
}
```

Cache-aside pattern: checks ReputationCache first (5s TTL, 10K max entries). Negative caching for cold agents prevents PG storms.

**GET /api/reputation/:nftId** (builder+ required)

Response:
```json
{
  "blended_score": 0.85,
  "personal_score": 0.82,
  "sample_count": 150,
  "state": "established",
  "reliability": { ... },
  "dimensions": [...],
  "snapshot_at": "2026-02-28T00:00:00.000Z"
}
```

**GET /api/reputation/population** (Admin key required)

Response:
```json
{
  "mean": 0.65,
  "variance": 0.02,
  "population_size": 500,
  "store_count": 500
}
```

---

### /api/enrich

**Source**: `app/src/routes/enrich.ts`
**Auth**: JWT required + builder+ conviction tier
**Governance**: ConvictionTier (builder+)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/enrich/review-context` | Assemble governance context for review prompt enrichment |

**POST /api/enrich/review-context**

Latency budget: 50ms. Returns partial context with `partial: true` on timeout.

Request:
```json
{
  "nft_id": "string",
  "review_type": "bridge | flatline | audit",
  "scope": "string (optional)"
}
```

Response:
```json
{
  "conviction_context": {
    "tier_distribution": { "observer": 0, "participant": 0, "builder": 0, "architect": 0, "sovereign": 0 },
    "total_bgt_staked": 0,
    "snapshot_at": "..."
  },
  "conformance_context": { "violation_rate": 0, "top_violated_schemas": [], ... },
  "reputation_context": { "trajectory": "cold", "blended_score": null, ... },
  "knowledge_context": { "active_votes": 0, "priority_rankings": [], ... },
  "assembled_at": "...",
  "partial": false
}
```

Response header: `X-Enrichment-Latency-Ms`.

---

### /api/fleet -- Phase 2 (defined but not wired in server.ts)

**Source**: `app/src/routes/fleet.ts`
**Auth**: Operator ID + Operator Tier headers (set by upstream proxy)
**Governance**: ConvictionTier (tier-gated spawn limits), FleetGovernor (GovernedResource)
**Status**: Route module defined. FleetGovernor registered for governance health. Routes NOT mounted in server.ts.

> **Note**: Fleet routes are defined in the codebase but are not currently served.
> The FleetGovernor is registered and participates in `/api/health/governance`,
> but the HTTP endpoints below are not accessible. They will be wired when
> fleet orchestration is activated.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fleet/spawn` | Create a new fleet task (conviction-gated spawn limits) |
| GET | `/api/fleet/status` | Fleet status summary (tenant-scoped, ?all=true for admin) |
| GET | `/api/fleet/tasks/:id` | Task detail (tenant-isolated) |
| POST | `/api/fleet/tasks/:id/stop` | Stop a running task |
| GET | `/api/fleet/tasks/:id/logs` | Task logs (max 10000 lines) |
| DELETE | `/api/fleet/tasks/:id` | Delete a completed/cancelled task |

**POST /api/fleet/spawn**

Headers: `x-operator-id`, `x-operator-tier`.

Request:
```json
{
  "description": "string (required)",
  "taskType": "bug_fix | feature | refactor | review | docs",
  "repository": "string (required)",
  "agentType": "claude_code | codex | gemini (optional)",
  "model": "string (optional)",
  "baseBranch": "string (optional)",
  "maxRetries": "number (optional)",
  "timeoutMinutes": "number (optional)",
  "contextOverrides": "Record<string, string> (optional)"
}
```

Response (201): task object with ID, status, metadata.

Error (403): `SpawnDeniedError` when conviction tier limit exceeded (includes `tier`, `activeCount`, `tierLimit`).

---

## Endpoint Summary

| Module | Mount Point | Endpoints | Auth | Status |
|--------|-------------|-----------|------|--------|
| health | `/api/health` | 2 | Public / Admin | Active |
| auth | `/api/auth` | 2 | Public | Active |
| admin | `/api/admin` | 3 | Admin key | Active |
| chat | `/api/chat` | 1 | JWT | Active |
| sessions | `/api/sessions` | 2 | JWT | Active |
| identity | `/api/identity` | 1 | JWT | Active |
| ws-ticket | `/api/ws/ticket` | 1 | JWT | Active |
| personality | `/api/personality` | 2 | JWT | Active |
| memory | `/api/memory` | 4 | JWT + ownership | Active |
| autonomous | `/api/autonomous` | 4 | JWT + ownership | Active |
| schedule | `/api/schedule` | 5 | JWT + builder+ | Active |
| agent | `/api/agent` | 7 | TBA + architect+ | Active |
| learning | `/api/learning` | 2 | JWT + ownership | Active |
| reputation | `/api/reputation` | 4 | JWT + builder+ / Admin | Active |
| enrich | `/api/enrich` | 1 | JWT + builder+ | Active |
| fleet | `/api/fleet` | 6 | Operator headers | **Not wired** |
| **Total** | | **47** | | **41 active, 6 pending** |

---

## Error Response Format

All error responses follow a consistent shape:

```json
{
  "error": "error_code",
  "message": "Human-readable description"
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Insufficient permissions or conviction tier |
| `invalid_request` | 400 | Malformed request body or parameters |
| `not_found` | 404 | Resource not found |
| `rate_limited` | 429 | Rate limit exceeded (includes `Retry-After` header) |
| `budget_exceeded` | 402 | Estimated cost exceeds budget (agent API) |
| `internal_error` | 500 | Server error |
| `spawn_denied` | 403 | Fleet spawn limit exceeded |
| `conflict` | 409 | Cannot delete active task |

---

## Common Response Headers

| Header | Description |
|--------|-------------|
| `X-Protocol-Version` | Dixie protocol version (8.2.0) |
| `X-Request-Id` | Unique request trace ID |
| `X-Response-Time` | Request processing duration |
| `X-Conviction-Tier` | Resolved conviction tier for authenticated user |
| `X-Model-Pool` | Model pool used for inference |
| `X-Cost-Micro-USD` | Request cost in micro-USD (agent API) |
| `X-Receipt-Id` | x402 payment receipt ID (agent API) |
| `X-Knowledge-Confidence` | Knowledge freshness confidence (agent API) |
| `X-Enrichment-Latency-Ms` | Enrichment assembly latency (enrich API) |
