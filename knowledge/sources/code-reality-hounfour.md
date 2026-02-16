---
generated_date: "2026-02-16"
source_repo: 0xHoneyJar/loa-hounfour
provenance: cycle-025-sprint-61-task-2.4
tags: ["technical"]
---

# Code Reality: loa-hounfour

Technical knowledge source documenting the `@0xhoneyjar/loa-hounfour` protocol
package as observed from loa-finn's imports and usage. This is a protocol
library -- it defines interfaces, canonical vocabularies, and validation
functions. Implementations live in loa-finn and arrakis.

**Dependency reference**: `loa-finn/package.json` pins the package at a
specific commit SHA:

```json
"@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#e5b9f16c60a95f7940c96af3b11cf50065abe898"
```

---

## 1. Known Exports (from loa-finn import analysis)

The following exports are observed across loa-finn's import statements.
Source files that import from the package:

- `loa-finn/src/hounfour/pool-registry.ts`
- `loa-finn/src/hounfour/tier-bridge.ts`
- `loa-finn/src/hounfour/pool-enforcement.ts`
- `loa-finn/src/hounfour/jwt-auth.ts`
- `loa-finn/src/hounfour/nft-routing-config.ts`
- `loa-finn/src/hounfour/protocol-handshake.ts`

### 1.1 Type Exports

| Export | Used In | Description |
|--------|---------|-------------|
| `PoolId` | pool-registry, tier-bridge, pool-enforcement, jwt-auth, nft-routing-config | Branded string type for canonical pool identifiers |
| `Tier` | pool-registry, tier-bridge, pool-enforcement, jwt-auth | String literal union: `"free" \| "pro" \| "enterprise"` |
| `TaskType` | tier-bridge | String type for task classification |

### 1.2 Constant Exports

| Export | Used In | Description |
|--------|---------|-------------|
| `POOL_IDS` | tier-bridge | Canonical set of valid pool IDs |
| `TIER_POOL_ACCESS` | tier-bridge, pool-enforcement | Map: Tier to readonly PoolId[] |
| `TIER_DEFAULT_POOL` | tier-bridge | Map: Tier to default PoolId |

### 1.3 Function Exports

| Export | Signature (inferred) | Used In |
|--------|---------------------|---------|
| `isValidPoolId` | `(id: string) => boolean` | pool-registry, tier-bridge, nft-routing-config |
| `tierHasAccess` | `(tier: Tier, poolId: string) => boolean` | tier-bridge, pool-enforcement |
| `validateCompatibility` | `(remoteVersion: string) => { compatible: boolean; error?: string }` | protocol-handshake |

---

## 2. Pool Vocabulary

The canonical pool IDs as used by loa-finn's `PoolRegistry`:

| Pool ID | Description | Tier Access |
|---------|-------------|-------------|
| `cheap` | Low-cost general purpose | free, pro, enterprise |
| `fast-code` | Fast code completion | pro, enterprise |
| `reviewer` | Code review and analysis | pro, enterprise |
| `reasoning` | Complex reasoning and planning | enterprise |
| `architect` | Architecture and high-level planning | enterprise |

These pool IDs are validated against `isValidPoolId()` from loa-hounfour
at construction time in `PoolRegistry`. Any pool ID not in the canonical
vocabulary is rejected.

---

## 3. Tier Model

Three tiers with hierarchical pool access:

| Tier | Accessible Pools | Default Pool |
|------|-----------------|--------------|
| `free` | cheap | cheap |
| `pro` | cheap, fast-code, reviewer | cheap |
| `enterprise` | cheap, fast-code, reviewer, reasoning, architect | cheap |

The tier-to-pool mapping is defined in `TIER_POOL_ACCESS` and
`TIER_DEFAULT_POOL` constants from loa-hounfour. loa-finn's `tier-bridge.ts`
re-exports these for local use.

---

## 4. Protocol Versioning

`loa-finn/src/hounfour/protocol-handshake.ts` uses `validateCompatibility()`
from loa-hounfour to verify semver-based protocol compatibility between
loa-finn and arrakis at boot time.

The handshake flow:
1. Fetch `{arrakisBaseUrl}/api/internal/health`
2. Extract `contract_version` from health response
3. Call `validateCompatibility(remoteVersion)` from loa-hounfour
4. Production: incompatible = fatal error (fail-fast)
5. Development: incompatible = warning + continue

Handshake status types: `"compatible"`, `"skipped"`, `"degraded"`,
`"incompatible"`.

---

## 5. JTI Policy

`loa-finn/src/hounfour/jwt-auth.ts` defines JTI requirements per endpoint
type, which aligns with loa-hounfour's protocol constants:

```typescript
const JTI_POLICY = {
  invoke:  { required: true },
  admin:   { required: true },
  s2s_get: { required: false, compensating: "exp <= 60s" },
}

const AUDIENCE_MAP = {
  invoke: "loa-finn",
  admin:  "loa-finn-admin",
  s2s:    "arrakis",
}
```

---

## 6. JWT Claims Contract

The JWT claims structure is the primary protocol contract between arrakis
(issuer) and loa-finn (consumer):

```typescript
interface JWTClaims {
  iss: string              // Issuer (arrakis)
  aud: string              // Audience (loa-finn | loa-finn-admin | arrakis)
  sub: string              // Subject (tenant or service identity)
  tenant_id: string        // Tenant identifier
  tier: Tier               // "free" | "pro" | "enterprise"
  nft_id?: string          // NFT identifier for personality routing
  model_preferences?: Record<string, string>  // task_type -> pool_id
  byok?: boolean           // Bring-your-own-key flag
  req_hash: string         // sha256:{hex} of request body
  iat: number              // Issued at (Unix timestamp)
  exp: number              // Expiration (Unix timestamp)
  jti?: string             // JWT ID for replay prevention
  scope?: string           // S2S scope claim
  pool_id?: string         // Requested pool (validated by enforcement)
  allowed_pools?: string[] // Gateway hint (never trusted, re-derived)
  reservation_id?: string  // Billing reservation ID
}
```

---

## 7. Billing Protocol Types

The following types define the billing wire contract between loa-finn and
arrakis. They are observed in `loa-finn/src/hounfour/billing-finalize-client.ts`:

### 7.1 FinalizeRequest (loa-finn to arrakis)

```typescript
interface FinalizeRequest {
  reservation_id: string
  tenant_id: string
  actual_cost_micro: string   // String-serialized BigInt micro-USD
  trace_id: string
}
```

Wire mapping at HTTP boundary (camelCase for arrakis consumption):
- `reservation_id` maps to `reservationId`
- `tenant_id` maps to `accountId`
- `actual_cost_micro` maps to `actualCostMicro`
- `trace_id` maps to `traceId`

### 7.2 FinalizeResult

```typescript
type FinalizeResult =
  | { ok: true; status: "finalized" | "idempotent" }
  | { ok: false; status: "dlq"; reason: string }
```

### 7.3 HTTP Response Codes

| Status | Meaning | loa-finn Behavior |
|--------|---------|-------------------|
| 200 | Finalized | Return `{ ok: true, status: "finalized" }` |
| 409 | Already finalized | Return `{ ok: true, status: "idempotent" }` |
| 401 | Unauthorized | Terminal -- DLQ, no retry |
| 404 | Not found | Terminal -- DLQ, no retry |
| 422 | Unprocessable | Terminal -- DLQ, no retry |
| Other | Transient failure | DLQ with exponential backoff |

---

## 8. Pool Enforcement Contract

The pool enforcement protocol defines how JWT claims are validated against
the tier-pool access matrix:

1. `enforcePoolClaims(claims)` derives `resolvedPools` from `claims.tier`
2. If `claims.pool_id` is present: validate it is a known pool AND tier
   has access
3. If `claims.allowed_pools` is present: detect mismatch with tier-derived
   pools (subset, superset, invalid_entry)
4. `selectAuthorizedPool(tenantContext, taskType)` resolves the final pool
   using preferences + tier defaults, then verifies membership

Mismatch types:
- **subset**: fewer pools claimed than tier permits (informational)
- **superset**: more pools claimed than tier permits (warning; strict mode = 403)
- **invalid_entry**: unknown pool IDs in claims (error)

---

## 9. NFT Routing Policy

The NFT routing policy schema (validated against loa-hounfour's
`RoutingPolicySchema`):

```typescript
interface NFTRoutingPolicy {
  version: string                    // Semver string
  personalities: PersonalityRouting[]
}

interface PersonalityRouting {
  personality_id: string
  task_routing: {
    chat: PoolId
    analysis: PoolId
    architecture: PoolId
    code: PoolId
    default: PoolId
  }
  preferences?: {
    temperature?: number             // 0-2
    max_tokens?: number
    system_prompt_path?: string
  }
}
```

---

## 10. Package Role Summary

loa-hounfour is the shared protocol package between loa-finn and arrakis.
It provides:

- **Canonical vocabulary**: Pool IDs, tier names, task types
- **Access control matrix**: Which tiers can use which pools
- **Validation functions**: Pool ID validation, tier access checks,
  protocol version compatibility
- **Schema definitions**: NFT routing policy, billing types

It does NOT contain:
- Provider implementations (those live in loa-finn)
- HTTP clients or servers
- Business logic beyond validation
- State management or persistence
