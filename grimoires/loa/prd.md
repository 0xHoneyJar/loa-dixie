# PRD: Dixie Phase 3 — Full Production Launch

**Version**: 22.0.0
**Date**: 2026-03-26
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-022
**Source Issues**: [#6](https://github.com/0xHoneyJar/loa-dixie/issues/6), [#68](https://github.com/0xHoneyJar/loa-dixie/issues/68)

> *"Wire the live plumbing, activate the gate, ship the oracle."*

---

## 1. Problem Statement

Dixie's application layer is production-ready — 66 services, live FinnClient with circuit breaker, PostgreSQL reputation store with event sourcing, full governance framework with conviction tiers, fleet orchestration with saga-based compensation. All routes call real loa-finn endpoints.

**But two critical systems are inert.** The x402 payment middleware is a noop pass-through (`middleware/payment.ts:26-31`), meaning all API access is free. The JWT authentication uses HS256 symmetric secrets (`middleware/jwt.ts:5-20`), meaning loa-finn and Dixie share a secret key — unacceptable for production cross-service verification.

Additionally, the deploy pipeline has not been verified end-to-end since Freeside took ownership of infrastructure (commit `23c9705`, 2026-03-04). No cross-system E2E tests exist. NFT resolution is duplicated across 3 inline lambdas in `server.ts` (lines 442, 502, 519) with a single-NFT limitation.

The infrastructure is ready (freeside PR#88 merged), the protocol is current (hounfour v8.3.1), and the application is tested (1,432+ tests). What's missing is the production wiring.

> Sources: Issue #6, Issue #68, `middleware/payment.ts:26-31`, `middleware/jwt.ts:5-20`, `server.ts:442,502,519`, `proxy/finn-client.ts:31`, commit `23c9705`

---

## 2. Vision & Mission

### Vision
Ship Dixie as a live production service — payments enforced, auth hardened, deployment validated, and cross-system integration proven — for closed beta with allowlisted wallets.

### Mission
- Activate x402 payment enforcement with real settlement via freeside
- Migrate JWT from HS256 to ES256 with JWKS endpoint for cross-service verification
- Centralize and extend NFT resolution for multi-NFT wallets
- Build cross-system E2E test harness (dixie ↔ finn ↔ freeside)
- Verify and exercise the full deploy pipeline (ECR → staging → production)
- Integrate dynamic pricing API (replace hardcoded per-token rates)

### Approach
Drive external dependencies from Dixie's side. This cycle includes PRs to loa-finn (multi-NFT endpoint) and loa-freeside (x402 integration, pricing API). No waiting on upstream.

---

## 3. Goals & Success Metrics

| ID | Goal | Metric | Target | Validation |
|----|------|--------|--------|------------|
| G1 | Staging deployment healthy | `GET /api/health` on Armitage Ring | 200, all services healthy | curl + CloudWatch |
| G2 | Payment gate active | x402 middleware enforcing on protected routes | Non-zero payment required for `/api/chat`, `/api/agent/query` | E2E test with payment flow |
| G3 | Production auth | JWT algorithm | ES256 (asymmetric) | JWKS endpoint serving public key |
| G4 | Cross-service verification | JWKS endpoint | Responding at `/.well-known/jwks.json` | loa-finn validates Dixie JWT via JWKS |
| G5 | E2E integration | Cross-system test suite | auth → chat → payment → settlement passing | CI green |
| G6 | Zero regression | Existing test suite | 1,432+ tests pass, 0 failures | `npm run test` |
| G7 | Production promotion | Deploy pipeline | Staging → production path exercised | ECS service stable |
| G8 | Multi-NFT support | NFT resolution | All wallet dNFTs resolved | E2E test with multi-NFT wallet |
| G9 | Dynamic pricing | Pricing API | Per-request cost from freeside, not hardcoded | E2E test with real pricing |

### Constraints
- **C-001**: Zero breaking API changes — all existing consumers continue working
- **C-002**: Dual-algorithm JWT transition — accept both HS256 and ES256 during rollout
- **C-003**: Payment config-gated — `DIXIE_X402_ENABLED=true` activates; `false` falls back to noop
- **C-004**: Single-writer deployment — `desired_count=1`, stop-before-start
- **C-005**: Closed beta — allowlist is primary access gate

---

## 4. User Personas & Use Cases

### Primary Persona: Beta Tester (Allowlisted dNFT Holder)

**Profile**: Known wallet from THJ community, holding 1+ dNFTs. Technical enough to use SIWE auth.

**Journey**: Connect wallet → SIWE auth → JWT issued (ES256) → conviction tier resolved → access oracle endpoints → payments settled via x402.

**Capabilities by tier** (from `services/fleet-governor.ts:58-64`):
| Tier | Fleet Spawn Limit | Model Access |
|------|------------------|-------------|
| observer | 0 | Basic |
| participant | 0 | Standard |
| builder | 1 | Standard |
| architect | 3 | Advanced |
| sovereign | 10 | Full |

### Secondary Persona: THJ Operator

**Profile**: Team member managing deployment, monitoring, and troubleshooting.

**Access**: Admin endpoints gated by `DIXIE_ADMIN_KEY`. Governance health at `/api/health/governance`.

---

## 5. Functional Requirements

### Track A: Authentication Hardening (Dixie-only)

#### FR-1: ES256 JWT Migration (P0)

Upgrade JWT signing from HS256 (symmetric HMAC) to ES256 (asymmetric ECDSA P-256).

**Current state**: `middleware/jwt.ts:32-45` uses `jose.jwtVerify` with HS256 and shared `DIXIE_JWT_PRIVATE_KEY`.

**Implementation**:
1. Generate EC P-256 keypair (private key for signing, public key for verification)
2. Update `routes/auth.ts:109-126` to sign with ES256 via `importPKCS8`
3. Update `middleware/jwt.ts:32-45` to verify with ES256 via `importSPKI`
4. Dual-algorithm acceptance window: try ES256 first, fallback to HS256 for in-flight tokens
5. Config detection: if `DIXIE_JWT_PRIVATE_KEY` starts with `-----BEGIN EC PRIVATE KEY-----`, use ES256; otherwise HS256

**Acceptance**: JWT issued with ES256. Existing HS256 tokens accepted during transition. `config.ts` auto-detects key format.

> Sources: `middleware/jwt.ts:5-20` (migration plan), Phase 1 Q1 confirmation

#### FR-2: JWKS Endpoint (P0)

Expose `GET /api/auth/.well-known/jwks.json` serving the ES256 public key in JWK format.

**Current state**: Not implemented. Documented as Phase 2 requirement at `middleware/jwt.ts:19`.

**Implementation**:
1. Create `routes/jwks.ts` — export public key as JWK Set
2. Include `kid` (key ID) for rotation support
3. Cache-Control: `max-age=3600` (1 hour)
4. No authentication required (public endpoint)

**Acceptance**: loa-finn can verify Dixie-issued JWTs by fetching JWKS from Dixie's endpoint. Standard JWKS format (RFC 7517).

> Sources: `middleware/jwt.ts:19`, Phase 1 discovery

---

### Track B: Payment Activation (Dixie + freeside)

#### FR-3: x402 Payment Middleware Activation (P0)

Replace noop payment middleware with `@x402/hono` integration.

**Current state**: `middleware/payment.ts:26-31` is a pass-through that calls `next()` and returns. Pipeline position 13 (after allowlist, before conviction tier).

**Implementation**:
1. Install and configure `@x402/hono` middleware
2. Wire to freeside payment gateway for settlement
3. Config-gated: `DIXIE_X402_ENABLED=true` activates; `false` preserves noop behavior
4. Protected routes: `/api/chat`, `/api/agent/query`, `/api/fleet/spawn`
5. Free routes: `/api/health`, `/api/auth/*`, `/.well-known/jwks.json`, `/api/admin/*`

**Acceptance**: With `DIXIE_X402_ENABLED=true`, protected endpoints require valid x402 payment header. Free endpoints remain accessible.

> Sources: `middleware/payment.ts:14,27`, freeside#87, Phase 1 Q2 confirmation

#### FR-4: x402 Receipt Settlement (P0)

Replace mock receipt generation with real freeside settlement.

**Current state**: `routes/agent.ts:251-257` generates mock receipts with `rcpt-{timestamp}-{random}` IDs.

**Implementation**:
1. Settlement flow: quote → execute → settle → reconcile
2. Wire to freeside settlement API (S2S JWT authenticated)
3. Receipt includes: payer wallet, payee, amount, tx hash
4. `AutonomousEngine` pre-flight uses real quotes for budget checks
5. Post-flight settles actual cost

**Acceptance**: Receipt IDs trace to real settlement transactions. `X402Receipt` interface populated with on-chain data.

> Sources: `routes/agent.ts:251-257`, freeside#87 body, `services/autonomous-engine.ts`

#### FR-10: Dynamic Pricing API Integration (P0)

Replace hardcoded per-token pricing with dynamic pricing from freeside.

**Current state**: `routes/agent.ts` uses hardcoded formula: `costMicroUsd = Math.ceil((input_tokens * 0.003 + output_tokens * 0.015) * 1000)`.

**Implementation**:
1. Query freeside pricing API for per-model, per-request rates
2. Cache pricing with configurable TTL (default 5 min)
3. Fallback to hardcoded rates if pricing API unreachable
4. Expose pricing in `/api/health` for operator visibility

**Acceptance**: Agent query costs reflect dynamic pricing. Hardcoded fallback works when API unavailable.

> Sources: freeside#87 body (§3: Hardcoded MODEL_PRICING), Phase 4 discovery

---

### Track C: API Consolidation (Dixie + finn)

#### FR-5: NFT Ownership Resolver Centralization (P0)

Extract 3 duplicate inline `resolveNftOwnership` lambdas into a shared service.

**Current state**: `server.ts:442`, `server.ts:502`, `server.ts:519` — three identical closures calling `GET /api/identity/wallet/:wallet/nft` via FinnClient.

**Implementation**:
1. Create `services/nft-ownership-resolver.ts` — `NftOwnershipResolver` class
2. Single FinnClient call, result cached per wallet (configurable TTL)
3. Replace all 3 inline lambdas with `nftOwnershipResolver.resolve(wallet)`
4. Inject into route dependencies via server.ts wiring

**Acceptance**: Zero functional change. 3 lambdas reduced to 1 service. All existing tests pass.

> Sources: `server.ts:442,502,519`, finn#93 (single-NFT limitation)

#### FR-9: Multi-NFT Resolution Support (P0)

Extend NFT resolution to support wallets holding multiple dNFTs.

**Current state**: FinnClient calls `GET /api/identity/wallet/:wallet/nft` which returns first NFT only. Wallets with multiple dNFTs lose access to secondary NFTs.

**Implementation** (cross-repo):
1. **loa-finn PR**: Add `GET /api/identity/wallet/:wallet/nfts` (plural) endpoint returning array
2. **Dixie**: Update `NftOwnershipResolver` to call plural endpoint
3. **Dixie**: Route-level resolution picks correct NFT by context (schedule → nftId param, memory → nftId param, learning → nftId param)
4. Backward compatible: fallback to singular endpoint if plural unavailable

**Acceptance**: Wallet with 2+ dNFTs can access schedule/memory/learning for each NFT independently.

> Sources: finn#93 body, `server.ts:442,502,519`, Phase 4 Q2 confirmation

---

### Track D: Deployment & Validation (Dixie + freeside)

#### FR-6: Cross-System E2E Test Harness (P0)

Build end-to-end integration test infrastructure validating the full dixie ↔ finn ↔ freeside wire.

**Current state**: `deploy/docker-compose.integration.yml` runs dixie + finn + Redis but no freeside, no payment flow, no ES256 JWT exchange.

**Implementation**:
1. Extend `docker-compose.integration.yml` with freeside service
2. Real ES256 JWT exchange (generate keypair in test setup)
3. Test flow: SIWE auth → ES256 JWT → chat → payment → settlement → receipt validation
4. `npm run test:e2e` command in CI
5. Health check validation across all services

**Acceptance**: E2E suite passes: auth → chat → payment → settlement. CI integration.

> Sources: finn#84, `deploy/docker-compose.integration.yml`, Phase 1 Q2 confirmation

#### FR-7: Deploy Pipeline Verification (P0)

Verify the full deploy pipeline end-to-end: build → scan → push → deploy → health.

**Current state**: `deploy-staging.yml` builds and pushes to ECR. Freeside's `deploy-ring.sh` orchestrates deployment. Pipeline not exercised since Freeside took infra ownership.

**Implementation**:
1. Trigger `deploy-staging.yml` with current main
2. Verify Trivy scan passes (HIGH/CRITICAL clean)
3. Verify ECR push succeeds (`arrakis-staging-loa-dixie`)
4. Trigger Freeside deploy-ring.sh for staging
5. Verify ECS service stability (5min timeout)
6. Verify `/api/health` returns healthy on staging

**Acceptance**: Full pipeline exercised. `/api/health` returns 200 on Armitage Ring with all services healthy.

> Sources: `.github/workflows/deploy-staging.yml:28-32`, commit `23c9705`, Phase 2 discovery

#### FR-8: Production Environment Configuration (P0)

Populate AWS SSM parameters and verify production environment config.

**Current state**: Terraform deleted (commit `23c9705`). Freeside's `ecs-dixie.tf` defines parameter paths. Parameters may need creation or update.

**SSM Parameters Required** (from deleted `dixie-env.tf`):
| Parameter | Path | Type |
|-----------|------|------|
| FINN_URL | `/dixie/{env}/finn-url` | String |
| FINN_WS_URL | `/dixie/{env}/finn-ws-url` | String |
| DATABASE_URL | `/dixie/{env}/database-url` | SecureString |
| REDIS_URL | `/dixie/{env}/redis-url` | SecureString |
| NATS_URL | `/dixie/{env}/nats-url` | String |
| DIXIE_JWT_PRIVATE_KEY | `/dixie/{env}/jwt-private-key` | SecureString |
| DIXIE_ADMIN_KEY | `/dixie/{env}/admin-key` | SecureString |
| DIXIE_CORS_ORIGINS | `/dixie/{env}/cors-origins` | String |
| DIXIE_X402_ENABLED | `/dixie/{env}/x402-enabled` | String |

**Implementation**:
1. Verify all SSM parameters exist via `aws ssm get-parameters-by-path`
2. Create missing parameters (especially new `DIXIE_X402_ENABLED`, ES256 key)
3. Update `DIXIE_JWT_PRIVATE_KEY` from HS256 secret to EC P-256 private key PEM
4. Document parameter population in deployment runbook

**Acceptance**: `aws ssm get-parameters-by-path --path /dixie/armitage/` returns all 9+ parameters. ECS task definition references all secrets.

> Sources: deleted `dixie-env.tf`, `.github/workflows/deploy-staging.yml:28-32`, `config.ts:113-177`

---

## 6. Non-Functional Requirements

| ID | Requirement | Target | Source |
|----|-------------|--------|--------|
| NFR-1 | Zero API breaking changes | All existing consumers work | C-001 |
| NFR-2 | Dual-algorithm JWT transition | Accept HS256 + ES256 during rollout | C-002, `middleware/jwt.ts:5-20` |
| NFR-3 | Payment graceful degradation | Noop fallback if x402 gateway unreachable | C-003 |
| NFR-4 | Single-writer deployment | `desired_count=1`, stop-before-start | C-004, deleted terraform |
| NFR-5 | Secret management | All secrets via AWS SSM Parameter Store | deleted `dixie-env.tf` |
| NFR-6 | Security scanning | Trivy blocks on HIGH/CRITICAL | `deploy-staging.yml:122-129` |
| NFR-7 | Health-gated deployment | ECS stability check (5min) | `deploy-staging.yml:174-182` |
| NFR-8 | Observability | OpenTelemetry spans for cross-service calls | `config.ts:149` |
| NFR-9 | Backward compatibility | InMemory fallback when DATABASE_URL unset (dev/test) | `server.ts:213-222` |
| NFR-10 | Middleware latency budget | Per-hop latency targets for 16-layer pipeline | *Flatline IMP-005* |
| NFR-11 | HS256 sunset plan | Hard sunset date + measurable cutoff criteria for dual-algorithm window | *Flatline IMP-006* |
| NFR-12 | Rollback runbooks | Documented rollback procedures for auth migration and payment activation | *Flatline IMP-001* |
| NFR-13 | JWKS/payment rate limits | Explicit rate limits and replay protection on public endpoints | *Flatline IMP-002* |
| NFR-14 | Key lifecycle management | Key generation custody, storage boundary, rotation procedure for ES256 | *Flatline IMP-003* |
| NFR-15 | Payment error contracts | Deterministic status codes and error schemas for all payment failure modes | *Flatline IMP-004* |
| NFR-16 | Settlement schema migration | Explicit migration strategy for receipt/settlement persistence tables | *Flatline IMP-008* |
| NFR-17 | Payment threat model | Threat model covering replay, forgery, MITM, S2S auth boundaries | *Flatline IMP-010* |

---

## 7. Technical Considerations

### Tech Stack
- **Runtime**: Node.js 22 LTS, TypeScript, Hono framework
- **Protocol**: Hounfour v8.3.1 (governance, audit trails, scoring)
- **Database**: PostgreSQL 16.6 (reputation, mutations, audits, fleet tasks)
- **Cache**: Redis 7.4 (projections, rate limiting, conviction cache)
- **Events**: NATS 2.10 (cross-governor event bus)
- **Infra**: AWS ECS Fargate (us-east-1), ECR, ALB, SSM, CloudWatch

### Key Files to Modify
| File | Change | FR |
|------|--------|-----|
| `middleware/jwt.ts` | ES256 verification + dual-algorithm | FR-1 |
| `routes/auth.ts` | ES256 token issuance | FR-1 |
| `routes/jwks.ts` (new) | JWKS endpoint | FR-2 |
| `middleware/payment.ts` | x402 activation | FR-3 |
| `routes/agent.ts` | Real receipt settlement, dynamic pricing | FR-4, FR-10 |
| `services/nft-ownership-resolver.ts` (new) | Centralized NFT resolution | FR-5 |
| `server.ts` | Wire new services, replace lambdas | FR-5, FR-9 |
| `deploy/docker-compose.integration.yml` | E2E harness | FR-6 |
| `config.ts` | New config fields (x402, ES256 detection) | FR-3, FR-1 |

### Cross-Repo PRs
| Repo | PR Scope | FR |
|------|----------|-----|
| loa-finn | `GET /api/identity/wallet/:wallet/nfts` (plural) | FR-9 |
| loa-freeside | x402 Hono integration contract + pricing API | FR-3, FR-4, FR-10 |

---

## 8. Scope & Prioritization

### In Scope

| Track | FRs | Cross-Repo | External Dep |
|-------|-----|-----------|-------------|
| A: Auth Hardening | FR-1, FR-2 | None | None |
| B: Payment Activation | FR-3, FR-4, FR-10 | freeside | freeside#87 (driving) |
| C: API Consolidation | FR-5, FR-9 | finn | finn#93 (driving) |
| D: Deployment & Validation | FR-6, FR-7, FR-8 | freeside | None |

### Sprint Ordering (suggested)

| Order | Track | Rationale |
|-------|-------|-----------|
| 1 | A (Auth) | Zero external deps. Foundation for E2E (ES256 needed for cross-service tests). |
| 2 | C (API Consolidation) | Zero external deps for FR-5. FR-9 upstream PR can start in parallel. |
| 3 | B (Payment) | Requires freeside x402 contract. Driving from Dixie side. |
| 4 | D (Deploy & Validation) | Final gate. Depends on all other tracks being ready. |

### Out of Scope
- New application features or capabilities
- UI changes
- Multi-instance HA (single-writer fine for closed beta)
- Additional knowledge sources or corpus updates
- Performance optimization (premature until live traffic)
- Rule lifecycle governance (issues #80, #82)
- GTM, devrel, community features (issues #12-#24)
- Hounfour multi-language ports (issue #17)
- OpenClaw/OpenRouter analysis (issue #70)

---

## 9. Risks & Mitigation

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | freeside#87 x402 not ready | Medium | High | Build config-gated scaffold. Drive contract from Dixie. Launch with noop fallback if needed. |
| R2 | finn E2E harness unavailable | Medium | Medium | Build from Dixie side using `docker-compose.integration.yml` as base. |
| R3 | ES256 key rotation during transition | Low | Medium | Dual-algorithm window. Deploy JWKS first, switch issuance. Rollback to HS256 config. |
| R4 | Multi-NFT finn endpoint PR blocked | Medium | Medium | Adapter pattern with single-NFT fallback. Can launch with single-NFT for beta. |
| R5 | Dynamic pricing API contract undefined | Medium | Medium | Propose contract from Dixie. Hardcoded fallback if API unavailable. |
| R6 | SSM parameters missing for production | Low | High | Verify with `aws ssm get-parameters-by-path`. Create missing before deploy. |
| R7 | Hounfour type drift | Low | Medium | Pinned to v8.3.1. Integration test validates compatibility. |
| R8 | Circuit breaker single-instance | Low | Low | Accepted for beta. Redis-backed CB is post-launch (BB-DEEP-02). |

### External Dependencies

| Dependency | Owner | Status | Action |
|-----------|-------|--------|--------|
| freeside#88 (production stack) | freeside | **MERGED** | Done |
| freeside#87 (x402 readiness) | freeside | Open | Drive: propose x402 Hono integration contract |
| finn#84 (E2E harness) | finn | Open | Drive: build harness from Dixie |
| finn#93 (API contracts, multi-NFT) | finn | Open | Drive: PR for plural endpoint |
| hounfour#21 (AccessPolicy) | hounfour | **CLOSED** | Done |

---

## 10. Security Hardening Requirements — *Flatline Findings*

### SEC-1: JWT Algorithm Confusion Prevention (SKP-001, CRITICAL)

All tokens MUST include explicit `alg`, `kid`, `iss`, `aud` claims. HS256 verifier isolated behind temporary feature flag with hard sunset date (NFR-11). Inter-service tokens (S2S) MUST reject HS256 immediately — dual-algorithm window applies only to user-facing tokens.

### SEC-2: Payment Fail-Closed in Production (SKP-003, CRITICAL)

In production (`NODE_ENV=production`), payment enforcement MUST be fail-closed: if pricing or settlement is degraded/unreachable, reject paid requests with 503 + explicit error code. Fail-open (noop fallback) ONLY permitted in non-production environments. `DIXIE_X402_ENABLED=false` is only valid in staging/dev.

### SEC-3: Settlement Idempotency (SKP-004, CRITICAL)

Settlement flow MUST include:
- Idempotency key propagation (SHA-256 of request ID + wallet + timestamp) across Dixie/freeside
- Exactly-once settlement semantics (dedup on idempotency key)
- Retry policy with exponential backoff (max 3 retries)
- Compensation rules for partial settlements
- Daily reconciliation check (cron or manual trigger)

### SEC-4: JWKS Key Lifecycle (SKP-002, HIGH)

JWKS endpoint MUST support:
- Active + next key serving (rotation overlap window)
- Defined rotation frequency (recommended: 90 days)
- Max token TTL (recommended: 24 hours)
- Revocation playbook: emergency key removal procedure
- Cache invalidation strategy: `Cache-Control: max-age=3600` with immediate override via kid rotation

### SEC-5: Dynamic Pricing Contract (SKP-005, HIGH)

Pricing API MUST define:
- Versioned contract with schema validation
- Floor rate (minimum cost per request, prevents zero-price abuse)
- Ceiling rate (maximum cost, prevents spike overcharging)
- Max staleness (reject cached pricing older than 2x TTL)
- Signature/timestamp checks on pricing responses
- Explicit fallback eligibility policy (only when API unreachable, not on invalid data)

### SEC-6: Multi-NFT Authorization (SKP-009, HIGH)

Every protected route accepting `nftId` parameter MUST verify that the requested NFT is in the caller's resolved ownership set. Add negative E2E tests for cross-NFT access attempts (wallet A owns NFT-1 but requests NFT-2 data → 403).

---

## 11. Completion Gates

| Gate | Criteria | Blocks |
|------|----------|--------|
| GATE-LOCAL | All FRs pass locally: typecheck + test + Docker build | Merge to main |
| GATE-STAGING | Health 200 on Armitage Ring, E2E suite green | Production promotion |
| GATE-PRODUCTION | Health 200 on production, payment flow validated with beta wallet | Beta launch announcement |

---

## 11. Known Issues & Technical Debt

- **KI-001**: FinnClient circuit breaker is in-memory only (BB-DEEP-02). Multi-instance deployments need Redis backing. Acceptable for single-writer beta.
- **KI-002**: Mixed audit chains (v9 + v10 domain tags) from cycle-021 hounfour bump. Monitor via `SELECT DISTINCT domain_tag FROM audit_entries ORDER BY created_at DESC LIMIT 100`.
- **KI-003**: `createPRNG()` created per-call (BB-LOW-001 from cycle-008). Minor performance impact.
- **KI-004**: Pre-existing TS errors in `chat.ts`, `conformance-suite.ts` from hounfour v8.2.0 drift. Not introduced by this cycle.

---

## Appendix: Codebase Reality Summary

Analysis date: 2026-03-26. Full inventory at `grimoires/loa/reality/component-inventory.md`.

| Metric | Value |
|--------|-------|
| Production services | 66 |
| Route files | 16 (35+ endpoints) |
| Middleware layers | 16 |
| Test files | 32 (1,432+ tests) |
| Governance invariants | 8+ (INV-006 through INV-023) |
| Active cycles completed | 21 |
| Global sprint counter | 116 |
