# Sprint Plan: Dixie Phase 3 — Full Production Launch

**Version**: 22.0.0
**Date**: 2026-03-26
**Cycle**: cycle-022
**PRD**: v22.0.0 | **SDD**: v22.0.0

---

## Executive Summary

Cycle-022 activates Dixie's two inert production systems (x402 payments and ES256 auth), consolidates duplicated NFT resolution code, and validates the full deploy pipeline from ECR through staging to production. 4 sprints, 29 tasks, global IDs 117-120.

## Sprint Overview

| Sprint | Global ID | Theme | Key Deliverables | Dependencies |
|--------|-----------|-------|------------------|--------------|
| 1 | 117 | Auth Hardening (Track A) | ES256 JWT, JWKS endpoint, dual-algorithm window | None |
| 2 | 118 | API Consolidation (Track C) | NftOwnershipResolver, multi-NFT support, finn PR | finn PR (parallel) |
| 3 | 119 | Payment Activation (Track B) | x402 middleware, settlement client, pricing client | freeside PR (parallel) |
| 4 | 120 | Deploy & Validation (Track D) | E2E harness, pipeline verification, SSM config | All tracks complete |

## Dependencies Map

```
Sprint 1 (Auth) ──────────────> Sprint 2 (API) ──────────────> Sprint 4 (Deploy)
    │                               │                               ▲
    └───────────> Sprint 3 (Payment) ───────────────────────────────┘
                       │
              [freeside#87 parallel]    [finn#93 parallel]
```

---

## Sprint 1 (Global 117): Authentication Hardening

**Track**: A | **Scope**: 7 tasks | **External deps**: None

**Sprint Goal**: Migrate JWT from HS256 to ES256 with dual-algorithm transition and JWKS endpoint, enabling cross-service verification by loa-finn.

### Tasks

- [ ] **1.1** Add `jwtAlgorithm` derived field to `DixieConfig` in `config.ts` — detect PEM header for ES256, else HS256. Replace `length < 32` validation with algorithm-aware validation. **[G3]**
  > `config.ts:97-100` ADR documents exact migration path

- [ ] **1.2** Update `issueJwt()` in `routes/auth.ts:114-126` to branch on `config.jwtAlgorithm`. ES256 path: `jose.importPKCS8`, add `kid` header (SHA-256 thumbprint). Cache imported key. **[G3]**

- [ ] **1.3** Derive public key at server startup in `server.ts` — `jose.exportSPKI` + `jose.exportJWK` from private key. Cache globally for verification middleware and JWKS endpoint. **[G3, G4]**

- [ ] **1.4** Update `createJwtMiddleware` in `middleware/jwt.ts:32-73` to dual-algorithm verification: try ES256 first via `jose.importSPKI`, fall back to HS256. Follow `service-jwt.ts:38-49` pattern. **[G3]**

- [ ] **1.5** Create `routes/jwks.ts` — `GET /api/auth/.well-known/jwks.json` serving public key as JWK Set (RFC 7517). Include `kid`, `use`, `alg`, `kty`, `crv`, `x`, `y`. Register in `server.ts` before auth middleware. **[G4]**

- [ ] **1.6** Write unit tests — `app/tests/unit/jwks.test.ts` (JWKS format, caching headers), auth route tests (ES256 issuance), jwt middleware tests (dual-algorithm, ES256-only, HS256 fallback). **[G3, G4, G6]**

- [ ] **1.7** Integration test — end-to-end flow: issue ES256 token → verify via JWKS → verify via middleware. Verify HS256 tokens still accepted during transition window. **[G3, G4, G6]**

### Acceptance Criteria
- [ ] JWT issued with ES256 algorithm when config has EC private key
- [ ] Existing HS256 tokens accepted during dual-algorithm window (C-002)
- [ ] `config.ts` auto-detects PEM header and selects algorithm
- [ ] JWKS endpoint returns RFC 7517 JWK Set with `kid`, `use: "sig"`, `alg: "ES256"`
- [ ] JWKS response includes `Cache-Control: max-age=3600, public`
- [ ] All 1,432+ existing tests pass (zero regression, G6)

---

## Sprint 2 (Global 118): API Consolidation

**Track**: C | **Scope**: 6 tasks | **External deps**: finn PR (parallel)

**Sprint Goal**: Extract duplicated NFT resolution into a shared service with caching, and extend to support wallets holding multiple dNFTs.

### Tasks

- [ ] **2.1** Create `services/nft-ownership-resolver.ts` with `resolve(wallet): Promise<NftOwnership[]>` and `resolvePrimary(wallet): Promise<NftOwnership | null>`. Redis ProjectionCache with 300s TTL. Negative result caching (60s). **[G8]**
  > Must handle both `/nft` (returns `{nftId}`) and `/ownership` (returns `{nftId, ownerWallet, delegatedWallets}`) response shapes

- [ ] **2.2** Replace 4 inline NFT lambdas in `server.ts` with `nftOwnershipResolver` calls — lines 393 (resolveNftId for memory context), 442 (schedule), 502 (learning), 519 (memory with ownership). **[G8]**
  > Critical: Memory route at line 519 uses `/ownership` endpoint (different response shape) — resolver must normalize

- [ ] **2.3** Implement multi-NFT resolution path — call `GET /api/identity/wallet/:wallet/nfts` (plural). Fall back to singular endpoint on 404. Route-level picks correct NFT by `nftId` param. **[G8]**

- [ ] **2.4** Draft and submit loa-finn PR for `GET /api/identity/wallet/:wallet/nfts` returning `{ nfts: NftOwnership[] }`. **[G8]**
  > Cross-repo: addresses finn#93

- [ ] **2.5** Write unit tests `app/tests/unit/nft-ownership-resolver.test.ts` — single-NFT, multi-NFT, fallback, cache hit/miss, negative caching, error handling. **[G6, G8]**

- [ ] **2.6** Integration test — verify routes that previously used inline lambdas still work identically. Verify multi-NFT wallet can access per-NFT routes. **[G6, G8]**

### Acceptance Criteria
- [ ] Zero functional change for single-NFT wallets (all existing tests pass, G6)
- [ ] 4 lambdas at `server.ts:393,442,502,519` reduced to 1 service
- [ ] Multi-NFT wallets can access schedule/memory/learning per NFT (G8)
- [ ] Redis cache hit avoids FinnClient call (configurable TTL, default 300s)
- [ ] Fallback to singular `/nft` endpoint when plural returns 404

---

## Sprint 3 (Global 119): Payment Activation

**Track**: B | **Scope**: 9 tasks | **External deps**: freeside PR (parallel)

**Sprint Goal**: Activate x402 payment enforcement with config-gated middleware, real settlement via freeside, and dynamic pricing API integration.

### Tasks

- [ ] **3.1** Add config fields to `DixieConfig` in `config.ts`: `x402Enabled` (from `DIXIE_X402_ENABLED`, default `false`), `x402FacilitatorUrl`, `pricingApiUrl`, `pricingTtl` (default 300). **[G2, G9]**

- [ ] **3.2** Install `@x402/hono` dependency in `app/package.json`. **[G2]**

- [ ] **3.3** Rewrite `middleware/payment.ts:26-31` — config-gated wrapper around `@x402/hono`. When `x402Enabled=false`, preserve noop. When `true`, apply x402 middleware with route filtering (protected: `/api/chat`, `/api/agent/query`, `/api/fleet/spawn`; free: `/api/health`, `/api/auth/*`, `/.well-known/jwks.json`, `/api/admin/*`). **[G2]**

- [ ] **3.4** Create `services/settlement-client.ts` following FinnClient pattern — circuit breaker (5 failures, 30s window), S2S JWT auth via `service-jwt.ts` pattern. Methods: `quote()`, `settle()`. **[G2]**

- [ ] **3.5** Create `services/pricing-client.ts` — `getModelPricing(model)`, `computeCost(model, inputTokens, outputTokens)`. Cache with configurable TTL. Fallback to hardcoded `MODEL_PRICING`. **[G9]**

- [ ] **3.6** Update `routes/agent.ts:251-257` — replace mock receipt with `settlementClient.settle()`. Replace hardcoded cost formula with `pricingClient.computeCost()`. Update `AutonomousEngine` pre-flight with real quotes. **[G2, G9]**

- [ ] **3.7** Update `routes/health.ts` to expose pricing source (`api` | `fallback`) and x402 status. **[G9]**

- [ ] **3.8** Wire `SettlementClient`, `PricingClient`, and updated payment gate in `server.ts`. **[G2, G9]**

- [ ] **3.9** Write unit tests — `settlement-client.test.ts` (quote, settle, circuit breaker, fallback), `pricing-client.test.ts` (cache, API fallback, cost computation), payment middleware tests (config-gated activation). **[G2, G6, G9]**

### Acceptance Criteria
- [ ] With `DIXIE_X402_ENABLED=true`, protected endpoints require valid x402 payment header (G2)
- [ ] With `DIXIE_X402_ENABLED=false`, existing noop behavior preserved (C-003)
- [ ] Free routes always accessible
- [ ] Receipt IDs trace to real settlement transactions (G2)
- [ ] Agent query costs reflect dynamic pricing (G9)
- [ ] Hardcoded fallback works when pricing API unavailable
- [ ] Health endpoint exposes `pricing_source` and x402 status
- [ ] Zero test regressions (G6)

---

## Sprint 4 (Global 120): Deploy & Validation

**Track**: D | **Scope**: 7 tasks | **External deps**: All tracks complete

**Sprint Goal**: Build cross-system E2E test harness, verify full deploy pipeline, configure production SSM parameters, and validate all PRD goals end-to-end.

### Tasks

- [ ] **4.1** Extend `deploy/docker-compose.integration.yml` — add freeside service, PostgreSQL, ES256 test keypair init container. Configure all services with ES256 keys and x402 facilitator URL. **[G1, G5]**

- [ ] **4.2** Create E2E test suite — `tests/e2e/staging/smoke-es256-auth.test.ts`, `smoke-payment.test.ts`, `smoke-multi-nft.test.ts`. Add `npm run test:e2e` command. **[G5]**

- [ ] **4.3** Verify SSM parameters via `aws ssm get-parameters-by-path --path /dixie/armitage/`. Create missing: `DIXIE_X402_ENABLED`, `DIXIE_X402_FACILITATOR_URL`, `DIXIE_PRICING_API_URL`, `DIXIE_PRICING_TTL`. Update `DIXIE_JWT_PRIVATE_KEY` to EC P-256 PEM. **[G1, G7]**

- [ ] **4.4** Trigger deploy pipeline — `deploy-staging.yml` → build-and-test → Docker build → Trivy scan → ECR push → ECS force-deploy → stability check. Verify `/api/health` returns 200 on staging. **[G1, G7]**

- [ ] **4.5** Document deployment runbook — parameter population, rollback procedure, staging → production promotion. **[G7]**

- [ ] **4.6** Update `X402Receipt` in `types/agent-api.ts` — make `transactionHash` required when x402 active. Verify type alignment. **[G2]**

- [ ] **4.7** End-to-End Goal Validation — exercise all 9 PRD goals with evidence: **[G1-G9]**

  | Goal | Validation |
  |------|-----------|
  | G1 | `curl /api/health` on Armitage Ring → 200 |
  | G2 | E2E: chat with x402 → 402 without payment, 200 with |
  | G3 | Decode JWT → `alg: "ES256"` |
  | G4 | Fetch `/.well-known/jwks.json` → valid JWK Set |
  | G5 | `npm run test:e2e` → all pass |
  | G6 | `npm run test` → 1,432+ pass |
  | G7 | Deploy pipeline exercised → ECS stable |
  | G8 | Multi-NFT wallet → all dNFTs resolved |
  | G9 | Pricing from API, not hardcoded |

### Acceptance Criteria
- [ ] E2E suite passes all smoke tests (G5)
- [ ] `/api/health` returns 200 on Armitage Ring (G1)
- [ ] Full deploy pipeline exercised end-to-end (G7)
- [ ] All 9+ SSM parameters exist at `/dixie/armitage/` path
- [ ] Staging → production promotion path documented
- [ ] All PRD goals G1-G9 validated with evidence

---

## Risk Register

| ID | Risk | Sprint | Prob | Impact | Mitigation |
|----|------|--------|------|--------|------------|
| R1 | freeside#87 x402 not ready | 3, 4 | Med | High | Config-gated scaffold. Noop fallback. |
| R2 | finn E2E harness unavailable | 4 | Med | Med | Build from Dixie side. |
| R3 | ES256 key rotation during transition | 1 | Low | Med | Dual-algorithm window. JWKS first. |
| R4 | Multi-NFT finn endpoint PR blocked | 2 | Med | Med | Single-NFT fallback via adapter. |
| R5 | Dynamic pricing API contract undefined | 3 | Med | Med | Hardcoded fallback always works. |
| R6 | SSM parameters missing for production | 4 | Low | High | Verify with aws ssm before deploy. |

---

## PRD Feature Mapping

| PRD Feature | Sprint | Track |
|-------------|--------|-------|
| FR-1: ES256 JWT Migration | 1 | A |
| FR-2: JWKS Endpoint | 1 | A |
| FR-3: x402 Payment Middleware | 3 | B |
| FR-4: x402 Receipt Settlement | 3 | B |
| FR-5: NFT Resolver Centralization | 2 | C |
| FR-6: E2E Test Harness | 4 | D |
| FR-7: Deploy Pipeline Verification | 4 | D |
| FR-8: Production Environment Config | 4 | D |
| FR-9: Multi-NFT Resolution | 2 | C |
| FR-10: Dynamic Pricing API | 3 | B |

## Flatline Sprint Hardening — *Integrated Findings*

### Sprint 1 Additions
- **Task 1.8** (NEW): Define HS256 sunset criteria — hard cutoff date, telemetry on HS256 usage, environment-gated disable. Add `DIXIE_JWT_ALG` explicit config instead of PEM prefix detection.
- **Task 1.9** (NEW): Key rotation runbook — dual-publish period, signer switch sequence, emergency revocation, automated rotation tests.
- **Acceptance**: Add rollback criteria — if ES256 issuance error rate > 1%, revert to HS256 config.

### Sprint 2 Additions
- **Acceptance**: Define Redis outage fallback — if ProjectionCache unavailable, NFT resolver falls through to direct FinnClient call (no cache, not failure).
- **Acceptance**: Add rollback criteria — if NFT resolution error rate increases > 5%, revert inline lambdas.

### Sprint 3 Additions
- **Acceptance**: Payment middleware latency benchmark — x402 middleware must add < 50ms p99 to request pipeline. Load test before merge.
- **Acceptance**: Circuit breaker open-state for SettlementClient must be fail-closed in production (reject with 503), fail-open only in non-production.
- **Acceptance**: Settlement idempotency keys end-to-end. Periodic reconciliation against freeside records.
- **Acceptance**: Payment route policy as declarative default-deny. CI fails on unclassified new API routes.
- **Acceptance**: Pricing fallback capped at 2x TTL staleness. Alert when using fallback > 5min.
- **Acceptance**: Add rollback criteria — if payment error rate > 5%, disable via `DIXIE_X402_ENABLED=false`.

### Sprint 4 Additions
- **Acceptance**: Cross-repo contract tests in CI for finn multi-NFT and freeside settlement/pricing APIs.
- **Acceptance**: Pin interface versions for cross-repo dependencies.

---

## Key Decisions

- Track ordering: Auth → API → Payment → Deploy (each builds on previous, external deps arrive progressively)
- Sprint 3 sized at 9 tasks (not SDD's 11) — moved E2E testing to Sprint 4 where full harness exists
- NftOwnershipResolver covers 4 lambdas (not PRD's stated 3) — `resolveNftId` at `server.ts:393` is a 4th duplicate
- Dual-algorithm JWT window spans entire cycle — HS256 removal deferred to post-launch with hard sunset date (Flatline SKP-001)
