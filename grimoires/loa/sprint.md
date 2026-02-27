# Sprint Plan: Staging Deployment — Docker Build Fix & Stack Validation

**Version**: 16.3.0 (Bridge Iteration 1)
**Date**: 2026-02-27
**Cycle**: cycle-016
**PRD**: v16.1.0
**SDD**: v16.1.0

> Bridge Iteration 1: Weighted score 9 (2 MEDIUM, 3 LOW, 4 PRAISE)
> Source: Bridgebuilder review of PR #56

---

## Sprint 2: Bridge Iteration 1 — Build Pipeline Hardening

**Global ID**: 111
**Goal**: Address Bridgebuilder findings: replace `npm ci || npm install` fallback with explicit lockfile conditional, add explanatory comments for duplicated COPY, and add TODO for future nonce migration
**Branch**: `feat/staging-deploy-c016`
**Acceptance Criteria**:
- Dockerfile uses explicit `if [ -f package-lock.json ]` conditional instead of `||` fallback
- Both `deps` and `build` stages have comments explaining why hounfour COPY is needed in each
- `siwe-wallet.ts` has TODO comment for nonce migration path
- `cd app && npx tsc --noEmit` passes
- All existing tests pass (no regressions)

### Tasks

| ID | Task | File(s) | Priority | Effort | Depends |
|----|------|---------|----------|--------|---------|
| T1 | Replace `npm ci \|\| npm install` with explicit lockfile conditional | `deploy/Dockerfile` | P0 | S | — |
| T2 | Add comment explaining duplicated hounfour COPY in both stages | `deploy/Dockerfile` | P1 | S | T1 |
| T3 | Add TODO comment for future nonce migration in siwe-wallet.ts | `tests/e2e/staging/helpers/siwe-wallet.ts` | P2 | S | — |
| T4 | Validate: `tsc --noEmit` passes, tests pass | All | P0 | S | T1-T3 |

### Task Details

#### T1: Replace npm ci || npm install with explicit lockfile conditional

**File**: `deploy/Dockerfile` (MODIFY)
**Finding**: B1-001 (MEDIUM — reliability)

Replace the `||` fallback pattern in both stages:

In `deps` stage (line 15):
```dockerfile
# Use npm ci for lockfile integrity when lockfile exists; fall back to npm install otherwise
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --install-links; \
    else \
      npm install --omit=dev --install-links; \
    fi
```

In `build` stage (line 21):
```dockerfile
RUN if [ -f package-lock.json ]; then \
      npm ci --install-links; \
    else \
      npm install --install-links; \
    fi
```

**Why**: The `||` pattern silently masks ALL npm ci failures including lockfile corruption and supply chain attacks. The explicit conditional preserves npm ci's integrity guarantee when the lockfile exists.

#### T2: Add comment explaining duplicated hounfour COPY

**File**: `deploy/Dockerfile` (MODIFY)
**Finding**: B1-002 (MEDIUM — documentation)

Add comment before the build stage hounfour COPY:
```dockerfile
# Both stages need hounfour: npm install --install-links resolves the file: reference
# at install time, and multi-stage builds have independent filesystems.
```

#### T3: Add TODO for nonce migration

**File**: `tests/e2e/staging/helpers/siwe-wallet.ts` (MODIFY)
**Finding**: B1-005 (LOW — correctness)

Add TODO comment above `createTestSiweMessage`:
```typescript
// TODO: When /api/auth/nonce endpoint is added, replace static nonce with
// async function fetchNonce(baseUrl: string): Promise<string> that calls the endpoint.
// Current static nonce works because server-side SIWE verify doesn't validate nonces.
```

#### T4: Validation

Run `tsc --noEmit` and full test suite to verify no regressions.

---

## Dependency Graph

```
T1 ──→ T2 ──→ T4
T3 ──────────→ T4
```

## Estimates

- **Sprint 2**: 4 tasks (all small) — single implement cycle
- **Files**: 2 modified
