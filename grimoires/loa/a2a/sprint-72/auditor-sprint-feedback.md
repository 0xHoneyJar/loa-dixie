# Sprint 72 (Local Sprint 8) Auditor Feedback — Bridge Convergence: Data Integrity & Infrastructure

**Auditor**: Paranoid Cypherpunk Auditor (Claude Opus 4.6)
**Date**: 2026-02-25
**Branch**: `feature/hounfour-v7.11.0-adoption`
**Cycle**: cycle-006

## Verdict: APPROVED - LETS FUCKING GO

All 7 tasks pass security audit. Zero CRITICAL or HIGH findings. One LOW observation (non-blocking).

---

## Security Checklist Results

### 1. SQL Injection — PASS

Every query in `pg-reputation-store.ts` uses parameterized queries (`$1`, `$2`, `$3`, ...). Verified all 14 query sites across `get`, `put`, `listCold`, `count`, `listAll`, `getTaskCohort`, `putTaskCohort`, `appendEvent` (INSERT + UPDATE), `getEventHistory`, `getRecentEvents`, `countByState`, `countEventsBefore`, `deleteEventsBefore`, and `getOldestEventDate`. Zero string concatenation or template literal interpolation into SQL strings.

### 2. Connection Leaks — PASS

Both transactional methods acquire dedicated clients and release in `finally` blocks:
- `appendEvent` (lines 90, 109): `this.pool.connect()` in try, `client.release()` in finally
- `compactSnapshot` (lines 159, 177): same pattern

Non-transactional methods use `this.pool.query()` directly — the pool manages connection checkout/return internally. No leak vectors.

### 3. Error Disclosure — PASS

- `appendEvent` catch block (line 105-107): re-throws original `err` after ROLLBACK attempt
- `compactSnapshot` catch block (line 173-175): same pattern
- `NftOwnershipResolver` (lines 42-43, 57-58): swallows upstream errors, returns `null` — correct for a resolver that should not propagate internal exceptions to callers
- No internal stack traces, database error messages, or connection strings leak through these code paths

### 4. Secrets Management — PASS

All five Terraform secrets use `data.aws_secretsmanager_secret` data sources:
- `dixie_jwt_key` (line 114): `dixie/jwt-private-key`
- `dixie_admin_key` (line 118): `dixie/admin-key`
- `dixie_database_url` (line 122): `dixie/database-url`
- `dixie_hs256_fallback` (line 127): `dixie/hs256-fallback-secret`
- `dixie_jwt_previous_key` (line 131): `dixie/jwt-previous-key`

All injected via the `secrets` block in `container_definitions` (lines 349-370), NOT via plaintext `environment`. Zero hardcoded secrets in Terraform.

### 5. Credential Exposure (Docker Compose) — PASS

`docker-compose.integration.yml` uses test-only credentials:
- `POSTGRES_PASSWORD: dixie_test_pw` (test database, ephemeral container)
- `DIXIE_JWT_PRIVATE_KEY: "integration-test-jwt-secret-32chars!"` (test-only HS256 key)
- `DIXIE_ADMIN_KEY: "integration-test-admin-key"` (test-only admin key)
- `DATABASE_URL` points to local postgres service (line 105)

Migration files mounted `:ro` (read-only) — correct. No production credentials present.

### 6. Input Validation — PASS

`NftOwnershipResolver` applies `encodeURIComponent(wallet)` on both API paths:
- Line 40: `` `/api/identity/wallet/${encodeURIComponent(wallet)}/nft` ``
- Line 54: `` `/api/identity/wallet/${encodeURIComponent(wallet)}/ownership` ``

Prevents path traversal via crafted wallet addresses (e.g., `../../admin`).

### 7. ROLLBACK Error Shadowing — PASS

Both transactional methods wrap ROLLBACK in nested try-catch:
- `appendEvent` line 106: `try { await client.query('ROLLBACK'); } catch { /* don't shadow original error */ }`
- `compactSnapshot` line 174: identical pattern

Original error is always re-thrown regardless of ROLLBACK success/failure.

### 8. IAM Scope — PASS

IAM policy `dixie-secrets-access` (lines 249-271):
- Single action: `secretsmanager:GetSecretValue`
- Exactly 5 named secret ARNs (no wildcards)
- No overly broad permissions (no `secretsmanager:*`, no `Resource: "*"`)
- Least-privilege confirmed

### 9. Test Coverage — PASS

Error and rollback paths are tested:
- Transaction flow (BEGIN/INSERT/UPDATE/COMMIT): lines 183-201
- Rollback on INSERT failure: lines 288-301
- Client release in both success and failure paths: verified
- compactSnapshot transaction: lines 304-322
- compactSnapshot rollback: lines 324-337
- needsCompaction edge cases: lines 340-366
- JSONB round-trip fidelity: lines 431-458
- Retention automation (count, delete, oldest): lines 368-429

---

## Findings

### LOW-1: ROLLBACK Double-Failure Test Gap

**Severity**: LOW
**File**: `app/tests/unit/pg-reputation-store.test.ts`
**Lines**: 288-301

The rollback test verifies that ROLLBACK is called when INSERT fails, but the mock ROLLBACK succeeds. The code at `pg-reputation-store.ts:106` wraps ROLLBACK in its own try-catch specifically to handle the case where ROLLBACK itself fails. No test exercises this double-failure path.

**Impact**: The code is correct — verified by reading the source. The gap is in test coverage only. In production, a failed ROLLBACK (e.g., broken connection) would not shadow the original error, which is the correct behavior.

**Recommendation**: Non-blocking. A future sprint could add a test where `mockClient.query` rejects on both the INSERT call and the ROLLBACK call, then asserts the original INSERT error (not the ROLLBACK error) propagates. This is belt-and-suspenders — the code is sound.

---

## Task-by-Task Security Assessment

| Task | Finding | Severity | Verdict |
|------|---------|----------|---------|
| 8.1: Transaction wrapping | Correct BEGIN/COMMIT/ROLLBACK with finally-release | — | PASS |
| 8.2: Type cast fix | Discriminated union properly narrowed, no unsafe casts | — | PASS |
| 8.3: Terraform secrets | All secrets via Secrets Manager ARNs, IAM least-privilege | — | PASS |
| 8.4: Docker compose migrations | Read-only mounts, ordered execution, test credentials only | — | PASS |
| 8.5: Configurable min_sample_count | Default preserved, no injection vector | — | PASS |
| 8.6: NftOwnershipResolver consolidation | encodeURIComponent on all wallet inputs | — | PASS |
| 8.7: ROLLBACK error shadowing | Nested try-catch prevents shadowing, original error propagated | LOW-1 test gap | PASS |

## Security Summary

- **SQL Injection**: 0 vectors found across 14 query sites
- **Connection Leaks**: 0 vectors — all transactional methods use finally-release
- **Secrets Exposure**: 0 plaintext secrets in infrastructure code
- **Input Validation**: All external inputs sanitized
- **IAM Scope**: Least-privilege, 5 named ARNs, single action
- **Error Handling**: Original errors preserved through rollback chains
- **Test Coverage**: All critical paths exercised, one minor gap (LOW-1)

The code is production-ready. Ship it.
