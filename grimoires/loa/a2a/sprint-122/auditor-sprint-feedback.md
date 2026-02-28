# Sprint 122 — Auditor Sprint Feedback

**Auditor**: Paranoid Cypherpunk Auditor
**Sprint**: Advisory Lock Canonical Swap & Cross-Repo Coordination (P4)
**Decision**: APPROVED - LETS FUCKING GO

## Security Audit Findings

### Advisory Lock Safety — PASS (CRITICAL)

Hounfour's `computeAdvisoryLockKey` (FNV-1a 32-bit signed) verified at source:
- Correct FNV-1a constants: offset `0x811c9dc5`, prime `0x01000193`.
- `Math.imul` for 32-bit multiplication (no JS float corruption).
- `hash | 0` produces signed 32-bit integer: range `[-2^31, 2^31-1]`.
- Valid for PostgreSQL `pg_advisory_lock(bigint)` (int4 auto-promotes).

### Lock Lifecycle — PASS (CRITICAL)

Traced all code paths in `migrate()` lines 148-253:
- **Lock success path**: Acquired at line 160, released in `finally` block at line 246. `lockClient.release()` at line 252.
- **Lock failure path (set_config fails)**: Outer catch line 168, `lockAcquired=false`, `lockClient.release()` at line 171. No leak.
- **Lock failure path (pg_advisory_lock fails)**: Inner catch line 162 wraps and throws, outer catch releases client. No leak.
- **Migration failure path**: Advisory lock released in outer `finally` regardless of migration success/failure.
- S5-F17 comment at line 169 documents the single-release-point pattern. Clean.

### SQL Injection — PASS (CRITICAL)

Every query with external input is parameterized:
- `set_config('lock_timeout', $1, false)` — parameterized.
- `pg_advisory_lock($1)` / `pg_advisory_unlock($1)` — parameterized.
- `INSERT INTO _migrations ... VALUES ($1, $2)` — parameterized.
- `WHERE table_name = $1` — parameterized.
- `SET lock_timeout = '0'` — hardcoded literal, no user input.
- `client.query(content)` — raw SQL from local filesystem `.sql` files. Acceptable (migration runner design).

### Race Conditions — PASS

- `lock_timeout` set to 30s before lock acquisition (prevents indefinite wait).
- Reset to 0 after acquisition (migrations can run without timeout).
- Reset at line 181 is inside the outer `try`, so failure still triggers `finally` block.

### Client Leaks — PASS

Three `pool.connect()` call sites, all covered:
1. Line 155 `lockClient`: Released at line 252 (finally) or line 171 (lock failure).
2. Line 218 `client` (per-migration): Released at line 238 (finally).
3. No other connect() calls exist.

### Secrets — PASS

No hardcoded credentials. Connection string injected via `DbPool`.

### Migration Integrity — PASS

`computeChecksum` at line 39 still uses `createHash('sha256')` from `node:crypto`. Import retained at line 18. Not accidentally removed.

### Import Chain — PASS

`computeAdvisoryLockKey` → `@0xhoneyjar/loa-hounfour/commons` → `commons/index.js` line 44 → `./advisory-lock.js`. Type declaration: `(domainTag: string): number`. Verified.

### Test Coverage — PASS

6 new tests in `advisory-lock-canonical.test.ts`:
1. Key validity: 32-bit signed integer range assertion.
2. Determinism: same input → same output.
3. Collision resistance: dixie vs finn keys differ.
4. Old→new mapping documented (SHA-256 vs FNV-1a differ).
5. `migrate()` passes canonical key to `pg_advisory_lock`.
6. `migrate()` passes canonical key to `pg_advisory_unlock`.

Existing `migrate.test.ts` (3 tests) unmodified. Full suite: 2430 passed, 0 failures.

## Summary

Minimal, surgical change: 1 local function deleted, 1 import added, lock ID constant switched to canonical hounfour computation. All code paths reviewed. No security issues found. Lock management is bulletproof — proper try/catch/finally nesting with sentinel pattern prevents both client leaks and double-release. This is the final P4 sprint of the hounfour v8.3.0 canonical migration (Sprints 119-122).
