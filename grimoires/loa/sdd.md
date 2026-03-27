# SDD: Dixie Phase 3 — Full Production Launch

**Version**: 22.0.0
**Date**: 2026-03-26
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-022
**PRD**: `grimoires/loa/prd.md` v22.0.0

---

## 1. System Overview

Dixie is a Hono-based BFF (Backend-for-Frontend) running on Node.js 22, serving as the community governance and oracle interface for The Honey Jar ecosystem. It proxies requests to loa-finn (knowledge/identity), integrates with loa-freeside (infrastructure/payments), and enforces a 5-tier conviction-based access model derived from BGT staking.

Phase 3 activates two inert systems (payments and production auth), consolidates duplicated code (NFT resolution), and validates the full deployment pipeline. The existing architecture is mature — 66 services, 16 middleware layers, 1,432+ tests — so changes are surgical insertions into well-defined extension points.

### Architecture Pattern

**Service-Oriented Monolith with Cross-Service Integration**. Dixie is already a well-structured monolith with clear internal boundaries (middleware pipeline, service layer, proxy layer). Phase 3 wires production plumbing into existing slots. Cross-repo PRs to finn and freeside use HTTP/REST contracts, not shared process boundaries.

---

## 2. Track A: Authentication Hardening (FR-1, FR-2)

### 2.1 ES256 JWT Migration

**Current state**: `middleware/jwt.ts:32-45` uses HS256 with shared `DIXIE_JWT_PRIVATE_KEY`. `routes/auth.ts:109-126` signs with HS256.

**Key discovery**: `middleware/service-jwt.ts` already implements ES256 verification using `jose.importSPKI` and `jose.importJWK`. This is the direct pattern to follow.

#### Config Detection (`config.ts`)

Add `jwtAlgorithm: 'ES256' | 'HS256'` derived field to `DixieConfig`:

```typescript
// If key starts with PEM header, use ES256; otherwise HS256
jwtAlgorithm: jwtPrivateKey.startsWith('-----BEGIN') ? 'ES256' : 'HS256'
```

Replace the `length < 32` validation with algorithm-aware validation. For ES256, validate PEM header (`-----BEGIN EC PRIVATE KEY-----` or `-----BEGIN PRIVATE KEY-----`). For HS256, keep the 32-char minimum.

#### Token Issuance (`routes/auth.ts:114-126`)

Branch on `config.jwtAlgorithm`:
- **ES256 path**: `jose.importPKCS8(config.jwtPrivateKey, 'ES256')`. Add `kid` header (SHA-256 thumbprint of JWK). Cache imported key to avoid per-request parsing.
- **HS256 path**: Existing behavior (no change).

#### Token Verification (`middleware/jwt.ts:32-45`)

Dual-algorithm verification:
1. Try ES256 first via `jose.importSPKI` of the derived public key
2. On failure, fall back to HS256 (supports in-flight HS256 tokens during rollout)
3. After transition window, HS256 path can be removed

#### Public Key Derivation (startup)

```typescript
// At server startup:
const privateKey = await jose.importPKCS8(config.jwtPrivateKey, 'ES256');
const publicKeySpki = await jose.exportSPKI(privateKey);
const publicKeyJwk = await jose.exportJWK(privateKey);  // Extract public parts
```

Cache globally. Used by both verification middleware and JWKS endpoint.

### 2.2 JWKS Endpoint (`routes/jwks.ts` — new file)

**Path**: `GET /api/auth/.well-known/jwks.json`

**Response** (RFC 7517 JWK Set):
```json
{
  "keys": [{
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "...",
    "kid": "...",
    "use": "sig",
    "alg": "ES256"
  }]
}
```

**Headers**: `Cache-Control: max-age=3600, public`
**Auth**: None (public endpoint)
**Wire**: Register in `server.ts` route setup, before auth middleware.

**Key dependency**: `jose ^6.0.0` (already installed) supports all required functions.

---

## 3. Track B: Payment Activation (FR-3, FR-4, FR-10)

### 3.1 Payment Middleware (`middleware/payment.ts`)

**Current state**: Lines 26-31, noop pass-through.

**Design**: Config-gated wrapper around `@x402/hono`:

```typescript
export function createPaymentGate(config: PaymentConfig): MiddlewareHandler {
  if (!config.x402Enabled) {
    return async (c, next) => await next();  // existing noop
  }
  // @x402/hono middleware with route filtering
  return createX402Middleware({
    facilitatorUrl: config.x402FacilitatorUrl,
    protectedRoutes: ['/api/chat', '/api/agent/query', '/api/fleet/spawn'],
    freeRoutes: ['/api/health', '/api/auth/', '/.well-known/', '/api/admin/'],
  });
}
```

**Config additions to `DixieConfig`**:
- `x402Enabled: boolean` — from `DIXIE_X402_ENABLED` (default `false`)
- `x402FacilitatorUrl: string | null` — from `DIXIE_X402_FACILITATOR_URL`
- `pricingApiUrl: string | null` — from `DIXIE_PRICING_API_URL`
- `pricingTtl: number` — from `DIXIE_PRICING_TTL` (default `300`)

**New dependency**: `@x402/hono` in `app/package.json`

### 3.2 Settlement Client (`services/settlement-client.ts` — new file)

HTTP client for freeside settlement API, following FinnClient pattern:

```typescript
export class SettlementClient {
  constructor(config: { facilitatorUrl: string; serviceJwt: ServiceJwtProvider })

  async quote(request: QuoteRequest): Promise<QuoteResponse>
  async settle(receipt: SettlementRequest): Promise<X402Receipt>
}
```

- Circuit breaker matching FinnClient pattern (5 failures → open, 30s window)
- S2S JWT authenticated (following existing `service-jwt.ts` pattern)
- Falls back to mock receipt when `x402Enabled === false`

**Settlement flow**: quote → execute → settle → reconcile
- Pre-flight: `quote()` for budget check in `AutonomousEngine`
- Post-flight: `settle()` with actual token counts
- Receipt includes: `transactionHash`, `payer`, `payee`, `amountMicroUsd`

### 3.3 Pricing Client (`services/pricing-client.ts` — new file)

```typescript
export class PricingClient {
  constructor(config: { pricingApiUrl: string | null; ttl: number })

  async getModelPricing(model: string): Promise<ModelPricing>
  async computeCost(model: string, inputTokens: number, outputTokens: number): Promise<number>
}
```

- Cache with configurable TTL (default 5 min)
- Falls back to hardcoded `MODEL_PRICING` when API unreachable
- Expose `pricing_source: 'api' | 'fallback'` in health response

### 3.4 Agent Route Updates (`routes/agent.ts`)

**Line 251-257** (mock receipt): Replace with `settlementClient.settle()` call.

**Cost calculation**: Replace hardcoded formula with `pricingClient.computeCost(model, input_tokens, output_tokens)`.

**AutonomousEngine integration**: Pre-flight budget check uses `pricingClient.getModelPricing()` for real quotes.

---

## 4. Track C: API Consolidation (FR-5, FR-9)

### 4.1 NFT Ownership Resolver (`services/nft-ownership-resolver.ts` — new file)

```typescript
export class NftOwnershipResolver {
  constructor(
    private finnClient: FinnClient,
    private cache: ProjectionCache<NftOwnership[]> | null
  )

  // Multi-NFT resolution (preferred)
  async resolve(wallet: string): Promise<NftOwnership[]>

  // Backward-compatible single-NFT (for migration)
  async resolvePrimary(wallet: string): Promise<NftOwnership | null>
}
```

**Cache layer**: Redis ProjectionCache with configurable TTL (default 300s), keyed by normalized wallet address. Uses existing ProjectionCache pattern from conviction/personality/autonomous.

**Multi-NFT resolution**: Call `GET /api/identity/wallet/:wallet/nfts` (plural). Fall back to singular `GET /api/identity/wallet/:wallet/nft` when plural returns 404.

**Negative result caching**: Cache 404s for 60s to avoid retry storms.

### 4.2 Server Wiring Changes (`server.ts`)

Replace 3 inline lambdas (lines 442, 502, 519) with:

```typescript
const nftOwnershipResolver = new NftOwnershipResolver(finnClient, nftProjectionCache);

// Inject into route deps
{ resolveNftOwnership: (wallet) => nftOwnershipResolver.resolvePrimary(wallet) }
```

Routes continue receiving single-NFT via `resolvePrimary()` for backward compatibility. Multi-NFT access available where routes accept `nftId` parameter.

### 4.3 Cross-Repo: loa-finn PR

**New endpoint**: `GET /api/identity/wallet/:wallet/nfts`

**Response**:
```json
{
  "nfts": [
    { "nftId": "123", "contractAddress": "0x...", "tokenId": 123, "ownerWallet": "0x...", "delegatedWallets": [] },
    { "nftId": "456", "contractAddress": "0x...", "tokenId": 456, "ownerWallet": "0x...", "delegatedWallets": [] }
  ]
}
```

---

## 5. Track D: Deployment & Validation (FR-6, FR-7, FR-8)

### 5.1 E2E Test Harness (`deploy/docker-compose.integration.yml`)

**Extensions**:
- Add `freeside` service container (ghcr.io/0xhoneyjar/loa-freeside or mock)
- Add `postgresql` service (already present in staging compose, add to integration)
- Add init container for ES256 test keypair generation (deterministic seed)
- Configure all services with ES256 keys and x402 facilitator URL

### 5.2 E2E Test Suite

| Test | Path | Flow |
|------|------|------|
| ES256 Auth | `tests/e2e/staging/smoke-es256-auth.test.ts` | SIWE → ES256 JWT → verify via JWKS |
| Payment | `tests/e2e/staging/smoke-payment.test.ts` | Chat → x402 payment required → settlement → receipt |
| Multi-NFT | `tests/e2e/staging/smoke-multi-nft.test.ts` | Multi-NFT wallet → resolve all → access per-NFT routes |

**Command**: `npm run test:e2e`

### 5.3 SSM Parameters

| Parameter | Path | Type | Change |
|-----------|------|------|--------|
| DIXIE_JWT_PRIVATE_KEY | `/dixie/{env}/jwt-private-key` | SecureString | **UPDATE**: HS256 secret → EC P-256 PEM |
| DIXIE_X402_ENABLED | `/dixie/{env}/x402-enabled` | String | **NEW** |
| DIXIE_X402_FACILITATOR_URL | `/dixie/{env}/x402-facilitator-url` | String | **NEW** |
| DIXIE_PRICING_API_URL | `/dixie/{env}/pricing-api-url` | String | **NEW** |
| DIXIE_PRICING_TTL | `/dixie/{env}/pricing-ttl` | String | **NEW** |
| All existing params | `/dixie/{env}/*` | Various | Verify exist |

### 5.4 Deploy Pipeline Verification

```
deploy-staging.yml trigger
  → npm ci → typecheck → lint → test → build (job 1)
  → Docker build → Trivy scan → ECR push (job 2)
  → aws ecs update-service --force-new-deployment (job 3, optional)
  → ECS stability wait (5 min)
  → curl /api/health → 200 OK
```

---

## 6. New/Modified Files Inventory

### New Files

| File | Purpose | FR |
|------|---------|-----|
| `app/src/routes/jwks.ts` | JWKS endpoint | FR-2 |
| `app/src/services/nft-ownership-resolver.ts` | Centralized NFT resolution | FR-5 |
| `app/src/services/settlement-client.ts` | x402 settlement client | FR-4 |
| `app/src/services/pricing-client.ts` | Dynamic pricing client | FR-10 |
| `app/tests/unit/jwks.test.ts` | JWKS tests | FR-2 |
| `app/tests/unit/nft-ownership-resolver.test.ts` | NFT resolver tests | FR-5 |
| `app/tests/unit/settlement-client.test.ts` | Settlement tests | FR-4 |
| `app/tests/unit/pricing-client.test.ts` | Pricing tests | FR-10 |
| `tests/e2e/staging/smoke-es256-auth.test.ts` | ES256 E2E | FR-6 |
| `tests/e2e/staging/smoke-payment.test.ts` | Payment E2E | FR-6 |
| `tests/e2e/staging/smoke-multi-nft.test.ts` | Multi-NFT E2E | FR-6 |

### Modified Files

| File | Change | FR |
|------|--------|-----|
| `app/src/config.ts` | Add x402, pricing, ES256 detection fields | FR-1, FR-3, FR-10 |
| `app/src/middleware/jwt.ts` | Dual-algorithm verification (ES256 + HS256) | FR-1 |
| `app/src/middleware/payment.ts` | Config-gated x402/hono wrapper | FR-3 |
| `app/src/routes/auth.ts` | ES256 token issuance with `kid` | FR-1 |
| `app/src/routes/agent.ts` | Real settlement, dynamic pricing | FR-4, FR-10 |
| `app/src/routes/health.ts` | Expose pricing data, x402 status | FR-10 |
| `app/src/server.ts` | Wire NftOwnershipResolver, JWKS route, settlement/pricing | FR-2, FR-5, FR-3 |
| `app/src/types/agent-api.ts` | Extend X402Receipt with `transactionHash` | FR-4 |
| `app/package.json` | Add `@x402/hono` dependency | FR-3 |
| `deploy/docker-compose.integration.yml` | Add freeside, PG, ES256 keypair | FR-6 |

---

## 7. Error Handling

| Scenario | Response | Fallback |
|----------|----------|----------|
| Payment required (x402 active) | 402 Payment Required with instructions | — |
| Settlement API unreachable | 502 Bad Gateway (no upstream details per S5-F15) | Mock receipt if `x402Enabled=false` |
| Pricing API unreachable | Transparent fallback | Hardcoded `MODEL_PRICING` table |
| ES256 verification fails + HS256 fails | 401 Unauthorized | — |
| Multi-NFT endpoint 404 | Transparent fallback | Singular NFT endpoint |
| SSM parameter missing | Startup crash (fail-fast in production) | Dev/test: env var fallback |

---

## 8. Security Architecture

- **ES256 asymmetric auth**: Private key never leaves Dixie (SSM SecureString). Public key distributed via JWKS (RFC 7517). Finn verifies without signing capability.
- **Key rotation**: `kid` header enables seamless rotation. JWKS endpoint can serve multiple keys. Old keys removed after TTL expiry. *Flatline*: Define runbook — dual-publish period, signer switch sequence, revocation process, max token lifetime alignment, automated rotation tests (SKP-003).
- **x402 config-gating**: `DIXIE_X402_ENABLED=false` prevents accidental activation. Feature flag pattern. *Flatline*: Payment route filtering must use default-deny policy, not string-based prefix matching (SKP-005).
- **S2S JWT for settlement**: Settlement client authenticates to freeside using service JWT (following existing `service-jwt.ts` pattern).
- **No breaking changes**: Constraint C-001 enforced by dual-algorithm window and fallback paths.

### 8.1 Flatline Security Hardening — *Integrated Findings*

**JWT Claim Validation (SKP-007, CRITICAL)**: All tokens MUST validate `iss`, `aud`, `exp`, `nbf`, `iat` with strict clock-skew limits. Optional `jti` replay check for sensitive operations. Codify validations in middleware unit tests.

**Algorithm Config (SKP-001, CRITICAL)**: Replace PEM prefix auto-detection with explicit `DIXIE_JWT_ALGORITHM` env var. Strict startup validation rejects algorithm/key type mismatch. Fail deployment on misconfiguration.

**HS256 Deprecation (SKP-002, CRITICAL)**: Hard deprecation cutoff for HS256 acceptance. Telemetry on HS256 token usage. Environment-gated hard disable date. Reject HS256 in production after cutoff.

**Settlement Idempotency (SKP-004, CRITICAL)**: Idempotency keys required on all settlement operations. Persisted transaction state machine. Replay-safe settlement endpoint. Compensating actions for partial failures.

**Cross-Repo Contracts (SKP-006, HIGH)**: Versioned API contracts (OpenAPI/JSON schema) for finn multi-NFT endpoint and freeside settlement/pricing APIs. Consumer-driven contract tests in CI. Pinned compatible service versions.

**Multi-NFT Tier Mapping (IMP-007)**: Multi-NFT wallets must deterministically map to conviction tier — highest-tier NFT wins, or explicit aggregation rule.

**Cross-Repo Payment Contract (IMP-010, DISPUTED→ACCEPTED)**: Define explicit schema, auth, and error semantics for freeside settlement and pricing APIs up-front in SDD, not during implementation.

### 8.2 Freeside Settlement API Contract (IMP-010)

```typescript
// Settlement API (freeside)
POST /api/settlement/quote
  Request:  { model: string, estimatedTokens: number, walletAddress: string }
  Response: { quoteId: string, amountMicroUsd: number, expiresAt: string, signature: string }

POST /api/settlement/settle
  Request:  { quoteId: string, idempotencyKey: string, actualInputTokens: number, actualOutputTokens: number }
  Response: { receiptId: string, transactionHash: string, amountMicroUsd: number, settledAt: string }

// Pricing API (freeside)
GET /api/pricing/models
  Response: { models: [{ modelId: string, inputPricePerToken: number, outputPricePerToken: number, currency: "USD", updatedAt: string }], version: string }
```

**Auth**: S2S JWT (ES256) in Authorization header.
**Errors**: 402 (insufficient funds), 409 (duplicate idempotency key), 422 (quote expired), 503 (settlement unavailable).
**Idempotency**: `idempotencyKey` deduplicates within 24h window.

---

## 9. Testing Strategy

| Level | Scope | Tools | Target |
|-------|-------|-------|--------|
| Unit | Individual services/middleware | Vitest | All new code paths |
| Integration | Cross-service flows (mocked infra) | Vitest + Hono test client | Auth, payment, NFT flows |
| E2E | Full stack (docker-compose) | Vitest + HTTP helpers | auth → chat → payment → settlement |

**Zero-regression constraint**: All 1,432+ existing tests pass after each sprint. CI enforces via `npm run test`.

---

## 10. Sprint Plan (suggested)

| Sprint | Track | FRs | Deps | Est. Tasks |
|--------|-------|-----|------|-----------|
| 1 | A: Auth Hardening | FR-1, FR-2 | None | 7 |
| 2 | C: API Consolidation | FR-5, FR-9 | finn PR (parallel) | 6 |
| 3 | B: Payment Activation | FR-3, FR-4, FR-10 | freeside PR (parallel) | 11 |
| 4 | D: Deploy & Validation | FR-6, FR-7, FR-8 | All tracks complete | 7 |

**Global sprint IDs**: 117-120 (from ledger counter 116).
