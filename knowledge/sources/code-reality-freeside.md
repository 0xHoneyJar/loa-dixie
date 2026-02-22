---
generated_date: "2026-02-20"
source_repo: 0xHoneyJar/loa-freeside
provenance: cycle-001-sprint-3
tags: ["technical", "architectural"]
---

<!-- upstream-source: 0xHoneyJar/loa-freeside:main | generated: false | last-synced: 2026-02-22 -->

# Code Reality: loa-freeside (Integration Surface)

Technical knowledge source documenting the loa-freeside infrastructure as observed
from loa-finn's integration points. Formerly known as Arrakis. loa-freeside is a
separate repository (`0xHoneyJar/loa-freeside`); this document captures the
contract surface visible from loa-finn code and Terraform definitions.

---

## 1. Billing Settlement Endpoint

### 1.1 Wire Contract

loa-finn's `BillingFinalizeClient` calls loa-freeside at:

```
POST {billingUrl}/api/internal/finalize
```

Reference: `loa-finn/src/hounfour/billing-finalize-client.ts#sendHTTPFinalize`

Request body (camelCase at wire boundary):

```json
{
  "reservationId": "string",
  "accountId": "string",
  "actualCostMicro": "string",
  "traceId": "string"
}
```

Field mapping from loa-finn internal representation:
- `tenant_id` (snake_case) maps to `accountId` (loa-freeside identity field)
- `reservation_id` maps to `reservationId`
- `actual_cost_micro` maps to `actualCostMicro` (string-serialized BigInt)
- `trace_id` maps to `traceId`

### 1.2 Authentication

S2S JWT bearer token signed by loa-finn's `S2SJwtSigner`.

JWT claims for billing finalize:

```json
{
  "sub": "loa-finn",
  "tenant_id": "...",
  "purpose": "billing_finalize",
  "reservation_id": "...",
  "trace_id": "..."
}
```

- Algorithm: ES256 (asymmetric) or HS256 (symmetric shared secret)
- TTL: 300 seconds (5 minutes)
- `sub` field: `"loa-finn"` in service mode, `tenant_id` in legacy tenant mode
  (gated by `s2sSubjectMode` config)

Reference: `loa-finn/src/hounfour/s2s-jwt.ts#S2SJwtSigner`

### 1.3 Response Codes

| Status | Meaning | loa-finn Behavior |
|--------|---------|-------------------|
| 200 | Settlement finalized | Success path |
| 409 | Already finalized (idempotent) | Treated as success |
| 401 | S2S JWT rejected | Terminal -- DLQ, no retry |
| 404 | Reservation not found | Terminal -- DLQ, no retry |
| 422 | Unprocessable entity | Terminal -- DLQ, no retry |
| 5xx | Server error | Retryable -- DLQ with backoff |

### 1.4 Timeout and Retry

- Default timeout: 1000ms (designed for p99.9 headroom: 10x p99 target of <100ms)
- DLQ backoff schedule: 1m, 2m, 4m, 8m, 10m
- Max retries: 5 (terminal drop after exhaustion)

---

## 2. Health Endpoint

### 2.1 Protocol Handshake

loa-finn calls loa-freeside health at boot time for version compatibility:

```
GET {freesideBaseUrl}/api/internal/health
```

> **Note**: Infrastructure may still use legacy `arrakisBaseUrl` naming in environment variables and Terraform definitions.

Reference: `loa-finn/src/hounfour/protocol-handshake.ts#validateProtocolAtBoot`

Expected response fields:

```json
{
  "contract_version": "1.2.0"
}
```

The `contract_version` field is validated against loa-hounfour's
`validateCompatibility()` function for semver compatibility.

### 2.2 Base URL Derivation

Priority:
1. `ARRAKIS_BASE_URL` environment variable (explicit) *(infrastructure may still use legacy 'arrakis' naming)*
2. `new URL(billingUrl).origin` (derived from billing URL)

Production: missing URL is a fatal error.
Development: missing URL causes handshake skip.

---

## 3. JWT Issuance (loa-freeside to loa-finn)

loa-freeside issues ES256 JWTs for tenant-authenticated requests to loa-finn.

### 3.1 JWKS Discovery

loa-finn fetches loa-freeside public keys from the configured `FINN_JWKS_URL`.
The JWKS state machine tracks key freshness:

| State | Condition | Behavior |
|-------|-----------|----------|
| HEALTHY | Last success < 15 minutes | Accept all valid JWTs |
| STALE | 15 min < age < 24 hours | Accept known kids; refresh for unknown |
| DEGRADED | Age > 24 hours (or 1 hour in compromise mode) | Reject unknown kids |

Reference: `loa-finn/src/hounfour/jwt-auth.ts#JWKSStateMachine`

### 3.2 JWT Claims Structure

loa-freeside-issued JWTs carry the following claims (consumed by loa-finn):

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `iss` | string | Yes | Issuer identifier (validated against allowlist) |
| `aud` | string | Yes | Audience (`loa-finn`, `loa-finn-admin`, `loa-freeside`) |
| `sub` | string | Yes | Subject (tenant or service identity) |
| `tenant_id` | string | Yes | Tenant identifier for data isolation |
| `tier` | string | Yes | `"free"`, `"pro"`, or `"enterprise"` |
| `nft_id` | string | No | NFT identifier for personality routing |
| `model_preferences` | object | No | Task type to pool ID mapping |
| `byok` | boolean | No | Bring-your-own-key flag |
| `req_hash` | string | Yes | `sha256:{hex}` of request body |
| `reservation_id` | string | No | Billing reservation for cost settlement |
| `jti` | string | Conditional | Required for invoke/admin endpoints |
| `pool_id` | string | No | Requested pool (validated by enforcement) |
| `allowed_pools` | string[] | No | Gateway hint (never trusted by loa-finn) |

### 3.3 req_hash Verification

loa-finn verifies that `req_hash` matches `sha256:{hex}` of the raw request
body using timing-safe comparison. This binds the JWT to a specific request
payload, preventing token reuse across different request bodies.

Reference: `loa-finn/src/hounfour/jwt-auth.ts#reqHashMiddleware`

### 3.4 Admin JWKS Invalidation

loa-freeside can trigger JWKS cache invalidation on loa-finn via:

```
POST /admin/jwks/invalidate
```

Requires S2S JWT with `scope: "admin:jwks"` and `aud: "loa-finn-admin"`.
Clears known kids and forces re-fetch from JWKS endpoint.

---

## 4. Token Gating via finnNFT

NFT-based routing is driven by JWT claims from loa-freeside:

1. `nft_id` claim identifies the NFT personality
2. `model_preferences` maps task types to pool IDs
3. `tier` determines base pool access

loa-finn's `NFTRoutingCache` resolves personality-specific pool preferences:
- Per-task routing: chat, analysis, architecture, code, default
- Per-personality preferences: temperature, max_tokens, system_prompt_path

The NFT routing config is validated against loa-hounfour's
`RoutingPolicySchema`. Invalid pool IDs in preferences are silently skipped
(fall through to tier default).

Reference: `loa-finn/src/hounfour/nft-routing-config.ts#NFTRoutingCache`

---

## 5. DLQ Persistence

### 5.1 Port Interface

`loa-finn/src/hounfour/dlq-store.ts#DLQStore` defines the persistence contract:

```typescript
interface DLQStore {
  put(entry: DLQEntry): Promise<void>
  get(reservationId: string): Promise<DLQEntry | null>
  getReady(before: Date): Promise<DLQEntry[]>
  delete(reservationId: string): Promise<void>
  count(): Promise<number>
  oldestEntryAgeMs(): Promise<number | null>
  claimForReplay(reservationId: string): Promise<boolean>
  releaseClaim(reservationId: string): Promise<void>
  incrementAttempt(reservationId: string, nextAttemptAt: string,
    nextAttemptMs: number): Promise<number | null>
  terminalDrop(reservationId: string): Promise<void>
  readonly durable: boolean
}
```

### 5.2 Adapters

| Adapter | Durable | Claim Mechanism | Terminal Handling |
|---------|---------|-----------------|-------------------|
| `InMemoryDLQStore` | No | In-memory Set | Delete (no audit trail) |
| `RedisDLQStore` | Yes | SETNX with TTL | Move to terminal keyspace |

### 5.3 Redis Adapter Details

The Redis DLQ adapter (separate from the port interface) provides:
- Atomic upsert via Lua script (DLQ_UPSERT)
- SETNX-based claim locking for concurrent replay safety
- Terminal keyspace for audit trail of dropped entries
- AOF verification at bootstrap for persistence guarantee

### 5.4 Health Exposure

DLQ metrics are exposed on the `/health` endpoint:

```json
{
  "billing": {
    "dlq_size": 0,
    "dlq_oldest_entry_age_ms": null,
    "dlq_store_type": "redis",
    "dlq_durable": true,
    "dlq_aof_verified": true
  }
}
```

---

## 6. ECS Deployment Topology

Based on `loa-finn/deploy/terraform/finn.tf`:

### 6.1 Infrastructure

| Resource | Configuration |
|----------|--------------|
| Compute | ECS Fargate (single task, desired_count=1) |
| CPU / Memory | 512 CPU units / 1024 MiB (configurable) |
| Storage | EFS-backed `/data` volume (encrypted, transit encryption) |
| Load Balancer | ALB with HTTPS listener, host-header rule: `finn.arrakis.community` *(infrastructure may still use legacy 'arrakis' naming)* |
| Service Discovery | Cloud Map: `finn.arrakis.local` (DNS A record, TTL 10s) *(infrastructure may still use legacy 'arrakis' naming)* |
| Logs | CloudWatch: `/ecs/finn` (30-day retention) |

### 6.2 Network Architecture

```
Internet --> ALB (443/HTTPS) --> finn SG (3000/TCP) --> ECS Task
                                      |
                                      +--> Redis SG (6379) --> ElastiCache
                                      +--> EFS SG (2049) --> EFS
                                      +--> Tempo SG (4317) --> Tempo OTLP
                                      +--> 0.0.0.0:443 --> Provider APIs / ECR
```

Security group rules:
- **Ingress**: ALB to port 3000 only
- **Egress**: HTTPS (443) for provider APIs, Redis (6379), EFS NFS (2049),
  Tempo OTLP gRPC (4317)
- No public IP assignment (private subnets only)

### 6.3 Secrets Management

All secrets pulled from AWS Secrets Manager at task startup:

| Secret | Env Var |
|--------|---------|
| Anthropic API key | `ANTHROPIC_API_KEY` |
| S2S private key (ES256) | `FINN_S2S_PRIVATE_KEY` |
| Auth bearer token | `FINN_AUTH_TOKEN` |
| Redis connection URL | `REDIS_URL` |

### 6.4 Scaling Constraint

`desired_count = 1` is an intentional constraint: the JSONL cost ledger is
a local file on EFS. Multi-task deployment would produce inconsistent usage
views because each task would have its own append position. This constraint
remains until the ledger is centralized to a shared store (Redis or database).

### 6.5 Health Check Chain

Three layers of health checking:

1. **ECS container health**: HTTP GET `http://127.0.0.1:3000/health` every
   30s (start period 60s, 3 retries)
2. **ALB target group**: HTTP GET `/health` every 30s (healthy threshold 2,
   unhealthy threshold 3)
3. **Application level**: `HealthAggregator.check()` aggregates model
   provider health, session state, and billing DLQ metrics

---

## 7. Observability Integration

### 7.1 OTLP Tracing

loa-finn sends traces to Tempo via gRPC OTLP:

```
OTLP_ENDPOINT=http://tempo.arrakis.local:4317
```

> **Note**: Infrastructure may still use legacy 'arrakis' naming in DNS and Cloud Map namespaces.

The Tempo service is discovered via Cloud Map within the `arrakis.local`
namespace *(infrastructure may still use legacy 'arrakis' naming)*. Optional dependency (`@opentelemetry/sdk-trace-node` in
optionalDependencies).

### 7.2 Structured Logging

All billing and pool enforcement events use structured JSON logging
for Datadog/Grafana ingestion via CloudWatch Logs.

---

## 8. S2S Trust Boundary

The S2S communication between loa-finn and loa-freeside follows a mutual
authentication pattern:

| Direction | Mechanism | Purpose |
|-----------|-----------|---------|
| loa-freeside to loa-finn | ES256 JWT via JWKS | Tenant authentication, pool authorization |
| loa-finn to loa-freeside | ES256/HS256 S2S JWT | Billing finalize, usage reports |

loa-finn publishes its public key at `/.well-known/jwks.json` for loa-freeside
to verify S2S JWTs if needed.

Key rotation support:
- JWKS state machine handles dual-key rotation windows (unknown kid triggers
  JWKS re-fetch and retry)
- `kid` field includes version suffix (e.g., `loa-finn-v1`) for
  deterministic key selection

---

## 9. Integration Points Summary

| Integration | Direction | Protocol | Endpoint |
|-------------|-----------|----------|----------|
| Invoke | loa-freeside to finn | HTTPS + ES256 JWT | `POST /api/v1/invoke` |
| Usage query | loa-freeside to finn | HTTPS + ES256 JWT | `GET /api/v1/usage` |
| Billing finalize | finn to loa-freeside | HTTPS + S2S JWT | `POST /api/internal/finalize` |
| Health/version | finn to loa-freeside | HTTPS (no auth) | `GET /api/internal/health` |
| JWKS discovery | finn from loa-freeside | HTTPS | Configured JWKS URL |
| JWKS publish | loa-freeside from finn | HTTPS | `GET /.well-known/jwks.json` |
| JWKS invalidation | loa-freeside to finn | HTTPS + admin JWT | `POST /admin/jwks/invalidate` |
| Service discovery | finn to loa-freeside | DNS (Cloud Map) | `finn.arrakis.local` *(legacy naming)* |
