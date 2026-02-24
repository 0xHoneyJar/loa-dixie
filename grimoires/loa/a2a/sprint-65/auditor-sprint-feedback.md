# Security Audit Report — Sprint Plan G-65 through G-68

**Auditor**: Paranoid Cypherpunk Auditor
**Date**: 2026-02-25
**Cycle**: cycle-006 (Dixie Phase 3 — Production Wiring & Live Integration)
**Branch**: `feature/dixie-phase3-prod-wiring`
**Verdict**: **APPROVED - LETS FUCKING GO**

---

## Pre-Flight Verification

| Check | Status |
|-------|--------|
| `engineer-feedback.md` contains "All good" | PASS |
| No `COMPLETED` marker exists | PASS |
| Tests pass (75 files, 1183 tests, 0 failures) | PASS |

---

## OWASP Top 10 / Secrets Audit

### 1. Hardcoded Secrets — PASS

- `config.ts`: All secrets sourced from environment variables (`DIXIE_JWT_PRIVATE_KEY`, `DIXIE_ADMIN_KEY`, `DIXIE_SCHEDULE_CALLBACK_SECRET`, `DATABASE_URL`).
- `dixie.tf`: JWT key, admin key, and database URL all reference AWS Secrets Manager (`aws_secretsmanager_secret`). Container definition uses `secrets` block (lines 338-351), not `environment` block. Correct separation.
- `docker-compose.integration.yml`: Contains test-only credentials (`integration-test-jwt-secret-32chars!`, `dixie_test_pw`). Acceptable — this is a hermetic test environment with ephemeral state. Not deployed to production.
- Zero hardcoded secrets in `app/src/` source tree.

### 2. JWT Key Management — PASS

- **ES256 Detection** (`config.ts:96`): Auto-detects PEM format via `-----BEGIN` prefix. Correct — all valid PEM formats start with this header.
- **HS256 Key Validation** (`config.ts:98-107`): Minimum 32 characters enforced for symmetric keys. Empty key allowed only in test mode with stderr warning. ES256 (PEM) keys skip the length check — PEM is self-validating by structure.
- **Production Admin Key** (`config.ts:116-118`): Empty `DIXIE_ADMIN_KEY` throws in production. Prevents SEC-001 (empty key allowing `safeEqual('','') === true` bypass).
- **Key Caching** (`auth.ts:137-152`): Private/public keys cached as `KeyObject` instances after first PEM parse. No repeated PEM deserialization. Cache is module-level with `resetAuthKeyCache()` for testing.

### 3. ES256 Key Derivation Chain — PASS

- `auth.ts:148-149`: `createPublicKey(getEs256PrivateKey(pem))` — public key derived from private key. Standard `node:crypto` chain. No raw key material exposed.
- `jwks.ts:30-31`: `createPublicKey(createPrivateKey(config.jwtPrivateKey))` — same derivation for JWKS endpoint. Only the public key is exported.
- **Test verification** (`es256-auth.test.ts:176`): `expect(key.d).toBeUndefined()` — explicitly asserts the EC private key parameter `d` is NOT in JWKS output. This is the critical private key leakage test. PASS.
- JWKS endpoint sets `use: 'sig'` and `alg: 'ES256'` metadata. Correct.

### 4. Dual-Algorithm Transition — PASS (No Downgrade Attack)

- **JWT Middleware** (`jwt.ts:38-50`): When `isEs256=true`, tries ES256 verification first. On failure, falls through to HS256 using `hs256FallbackSecret ?? jwtSecret`. In production, no `hs256FallbackSecret` is passed (`server.ts:280` only passes 3 arguments). The HS256 fallback key is the PEM string itself — a high-entropy secret that an attacker cannot feasibly forge.
- **Auth Verify** (`auth.ts:94-113`): Same pattern. ES256 primary, HS256 fallback only when `config.hs256FallbackSecret` is explicitly set. In production wiring (`server.ts:328-333`), no `hs256FallbackSecret` is configured.
- **Algorithm pinning**: JWT issuance (`auth.ts:166-167`) always sets `alg: 'ES256'` in the protected header when ES256 is active. Tokens are always issued with the strongest algorithm.
- **Verdict**: No downgrade attack vector. An attacker would need to know either the EC private key or the full PEM string to forge tokens.

### 5. JWKS Endpoint — PASS

- `jwks.ts:25-27`: Returns `{ keys: [] }` when HS256 is active. No key material exposed.
- `jwks.ts:30-31`: Only exports public key via `createPublicKey()` → `exportJWK()`.
- `jwks.ts:42`: Sets `Cache-Control: public, max-age=3600`. Appropriate for a public key endpoint.
- Cached result (`cachedJwks`) prevents repeated PEM parsing. `resetJwksCache()` available for testing.

---

## Input Validation / SQL Injection Audit

### 6. PostgreSQL Parameterized Queries — PASS

All 7 queries in `pg-reputation-store.ts` use parameterized placeholders (`$1`, `$2`, `$3`, `$4`):

| Method | Query Pattern | Parameters |
|--------|--------------|------------|
| `get` | `SELECT ... WHERE nft_id = $1` | `[nftId]` |
| `put` | `INSERT ... VALUES ($1, $2, $3) ON CONFLICT ...` | `[nftId, state, JSON.stringify(aggregate)]` |
| `listCold` | `WHERE state = 'cold'` | None (literal — safe) |
| `count` | `SELECT COUNT(*)::int` | None |
| `getTaskCohort` | `WHERE nft_id = $1 AND model_id = $2 AND task_type = $3` | `[nftId, model, taskType]` |
| `putTaskCohort` | `INSERT ... VALUES ($1, $2, $3, $4) ON CONFLICT ...` | `[nftId, model_id, task_type, JSON.stringify(cohort)]` |
| `appendEvent` | `INSERT ... VALUES ($1, $2, $3)` | `[nftId, event.type, JSON.stringify(event)]` |
| `getEventHistory` | `WHERE nft_id = $1 ORDER BY created_at ASC` | `[nftId]` |

**Zero string concatenation in SQL. Zero SQL injection vectors.** All dynamic values go through parameterized binding.

### 7. JSONB Serialization — PASS

- Complex objects (`aggregate`, `cohort`, `event`) are serialized with `JSON.stringify()` before passing as parameters. PostgreSQL JSONB type handles the rest. No injection risk through JSONB.

### 8. URL Encoding — PASS

- `nft-ownership-resolver.ts:28,46,61`: All wallet addresses are passed through `encodeURIComponent()` before URL interpolation. Test at line 37-44 explicitly verifies URL encoding of special characters (`0x special+chars` → `0x%20special%2Bchars`).

### 9. Request Body Validation — PASS

- `auth.ts:19-22`: SIWE request body validated via Zod schema (`z.string().min(1)` for both `message` and `signature`). Invalid bodies return 400 with structured error.

---

## Migration Schema Audit

### 10. `005_reputation.sql` — PASS

- `CREATE TABLE IF NOT EXISTS` — idempotent, safe for re-runs.
- `CREATE INDEX IF NOT EXISTS` — idempotent.
- Primary keys properly defined (composite `(nft_id, model_id, task_type)` for cohorts).
- `reputation_events` uses `gen_random_uuid()` for UUIDs — no client-side UUID generation needed.
- `TIMESTAMPTZ` used for all timestamps — timezone-aware. Correct.
- Indexes on `state`, `nft_id`, and `(nft_id, created_at)` cover all query patterns in the store.

---

## Data Privacy Audit

### 11. Health Endpoint Information Disclosure — PASS

- `health.ts:56-68`: Reputation health reporting exposes `store_type`, `aggregate_count`, and pool metrics (`pool_total`, `pool_idle`, `pool_waiting`). These are operational metrics, not PII. No wallet addresses, NFT IDs, or user data exposed.
- Governance endpoint (`/governance`) is gated behind admin auth using `safeEqual()` timing-safe comparison.
- Error responses (`health.ts:155,172,192`) do not disclose internal stack traces — only service-level status (`unreachable`, `degraded`).

### 12. JWT Error Logging — PASS

- `jwt.ts:57-70`: JWT verification failures are logged with `error_type` classification only (`expired`, `invalid_claims`, `invalid_signature`, `malformed`). No token content, wallet address, or request details in the log entry. Service name and timestamp only.

### 13. Payment Middleware — PASS

- `payment.ts:30-32`: Sets `X-Payment-Wallet` header containing the authenticated wallet address. This header is set on the **response** going back to the authenticated client who owns that wallet. Not a disclosure issue — the client already knows their own wallet.

---

## Infrastructure Security Audit

### 14. Terraform — IAM Least Privilege — PASS

- `dixie.tf:240-260`: Task role policy grants `secretsmanager:GetSecretValue` ONLY to the 3 specific secret ARNs (`dixie_jwt_key`, `dixie_admin_key`, `dixie_database_url`). No wildcard resources.
- Execution role uses AWS-managed `AmazonECSTaskExecutionRolePolicy` only.
- Both roles have `ecs-tasks.amazonaws.com` as the only trusted principal.

### 15. Security Groups — PASS

- **Ingress**: Only port 3001 from ALB security group. No public ingress.
- **Egress**: Scoped to specific ports and protocols:
  - `3000/tcp` to `10.0.0.0/8` (loa-finn)
  - `443/tcp` to `0.0.0.0/0` (HTTPS outbound — necessary for external APIs)
  - `2049/tcp` to `10.0.0.0/8` (EFS/NFS)
  - `4317/tcp` to `10.0.0.0/8` (OTLP/Tempo)
  - `5432/tcp` to `10.0.0.0/8` (PostgreSQL)
  - `6379/tcp` to `10.0.0.0/8` (Redis)
  - `4222/tcp` to `10.0.0.0/8` (NATS)
- All internal service egress restricted to `10.0.0.0/8` (VPC CIDR range). Only HTTPS is allowed to reach the public internet.

### 16. Network Placement — PASS

- `dixie.tf:397-401`: ECS service placed in private subnets, `assign_public_ip = false`. No direct internet exposure.
- EFS volume uses transit encryption (`transit_encryption = "ENABLED"`).

### 17. Docker Compose Integration — PASS

- Test-only credentials, not referenced in production Terraform.
- PostgreSQL test password `dixie_test_pw` scoped to ephemeral `postgres:16-alpine` container.
- CORS set to `*` — acceptable for test environment only.
- All volumes are named (ephemeral), cleaned up with `docker compose down -v`.

---

## Timing Attack Audit

### 18. Constant-Time Comparison — PASS

- `utils/crypto.ts:14-21`: `safeEqual()` uses `node:crypto.timingSafeEqual()` with length-padded buffers. The `Buffer.alloc(maxLen)` ensures both buffers are the same length before comparison, preventing length-based timing leaks. Final `a.length === b.length` check ensures zero-padded shorter strings don't match longer ones.

---

## Test Coverage Audit

### 19. Security-Relevant Test Coverage — PASS

| Test File | Security Tests | Assessment |
|-----------|---------------|------------|
| `es256-auth.test.ts` | Verifies ES256 token acceptance, HS256 rejection when ES256 configured, wrong-key rejection, JWKS private key exclusion (`key.d === undefined`), JWKS-to-verification round-trip | Excellent |
| `pg-reputation-store.test.ts` | Verifies parameterized queries, JSONB round-trip, upsert behavior | Good |
| `payment-scaffold.test.ts` | Verifies noop when disabled, header setting when enabled | Good |
| `nft-ownership-resolver.test.ts` | Verifies URL encoding, null-on-error resilience | Good |
| `health-reputation.test.ts` | Verifies store type detection, pool metrics, omission when not configured | Good |

### 20. Missing Test Scenarios — INFORMATIONAL (not blocking)

- No explicit test for expired ES256 token rejection (covered implicitly by jose library behavior).
- No test for JWT middleware transition fallback path (HS256 after ES256 failure). Low risk — the fallback secret is not configured in production wiring.
- No integration test for Terraform deployment. Expected — Terraform is validated via `terraform plan/validate` in CI.

---

## Code Quality Audit

### 21. Error Path Handling — PASS

- `nft-ownership-resolver.ts`: All 3 methods catch errors and return `null`. Callers handle null gracefully.
- `server.ts:127-132`: NATS connection failure caught and logged, does not block startup.
- `health.ts`: Each health check function independently catches errors. One failing service doesn't crash the entire health endpoint.
- `pg-reputation-store.ts`: Errors propagate naturally from `pool.query()` — callers (reputation service) handle them.

### 22. Resource Cleanup — PASS

- `health.ts:164-168`: DB health check uses `connect()` + `release()` in a `try/finally` block. Connection always returned to pool.
- Cached health responses (`cachedFinnHealth`) have TTL-based expiry (`CACHE_TTL_MS = 10_000`). No unbounded growth.
- JWKS cache is module-level singleton with explicit reset function. No leak risk.

### 23. Server Wiring — PASS

- `server.ts:193-197`: Reputation store selection (`PostgresReputationStore` when `dbPool` available, `InMemoryReputationStore` fallback) is correct. Graceful degradation pattern consistent with all other Phase 2 services.
- `server.ts:200`: `NftOwnershipResolver` replaces 4 inline lambdas. All usages (`resolveNftId`, `resolveOwnership`, `resolveFullOwnership`) properly wired to route factories.
- Middleware pipeline ordering (lines 253-317) maintains the constitutional ordering: auth before allowlist before payment before routes.

---

## Findings Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| — | No CRITICAL findings | — | — |
| — | No HIGH findings | — | — |
| INFO-1 | No explicit expired-ES256-token test | INFORMATIONAL | Accepted (jose library guarantees) |
| INFO-2 | No HS256 fallback path test | INFORMATIONAL | Accepted (path not wired in production) |
| INFO-3 | Docker compose uses `CORS_ORIGINS: *` | INFORMATIONAL | Accepted (test-only) |

**Zero CRITICAL findings. Zero HIGH findings. Zero MEDIUM findings.**

---

## Verdict

**APPROVED - LETS FUCKING GO**

The implementation is clean, secure, and well-tested. All secrets flow through environment variables and AWS Secrets Manager. SQL injection is impossible with the parameterized query pattern. The ES256 key derivation chain correctly isolates private from public material. The dual-algorithm transition has no practical downgrade attack vector. IAM policies follow least privilege. Security groups are appropriately scoped. The test suite provides strong coverage of security-critical paths.

Ship it.
