# Sprint Plan: Staging Deployment — Docker Build Fix & Stack Validation

**Version**: 16.2.0
**Date**: 2026-02-27
**Cycle**: cycle-016
**PRD**: v16.1.0
**SDD**: v16.1.0

> Post-Flatline Sprint Review: 6 HIGH_CONSENSUS integrated, 1 DISPUTED (downgraded to MEDIUM)
> Flatline Sprint: 2026-02-27 | Reviewer: 1C/3H/4M/3L/4P | Skeptic: 1C/4H/5M/3L/2S

---

## Sprint 1: Docker Build Fix & E2E Smoke Test Repair

**Global ID**: 110
**Goal**: Fix Docker build pipeline for hounfour `file:` dependency, add build hygiene, fix broken E2E smoke tests, and validate the build pipeline
**Branch**: `feat/staging-deploy-c016`
**Acceptance Criteria**:
- `deploy/prepare-build.sh` creates `.hounfour-build/` with `dist/`, `package.json`
- `deploy/prepare-build.sh --clean` removes `.hounfour-build/`
- `docker compose -f deploy/docker-compose.staging.yml build` succeeds
- `npm ci --install-links` succeeds or automatic fallback to `npm install --install-links` works
- `.dockerignore` reduces build context (verify < 15MB in build log)
- `.hounfour-build/` is in `.gitignore`
- `STAGING.md` says Node 22+ (not 20+), includes GHCR auth prereq
- `cd app && npx tsc --noEmit` passes (note: does NOT cover E2E tests — validated by running tests in T9b)
- All 6 E2E smoke test suites pass against running stack (T9b — manual post-merge)

### Tasks

| ID | Task | File(s) | Priority | Effort | Depends |
|----|------|---------|----------|--------|---------|
| T1 | Create build preparation script | `deploy/prepare-build.sh` | P0 | M | — |
| T2 | Fix Dockerfile — hounfour COPY + `--install-links` with automatic fallback | `deploy/Dockerfile` | P0 | S | T1 |
| T3 | Create `.dockerignore` at project root | `.dockerignore` | P1 | S | — |
| T4 | Add `.hounfour-build/` to `.gitignore` | `.gitignore` | P1 | S | — |
| T5 | Update STAGING.md — Node 22+, build prep docs, GHCR auth, `cd app` prefix | `STAGING.md` | P1 | S | T1 |
| T6 | Fix siwe-wallet.ts — add `signMessage` export, make `nonce` optional | `tests/e2e/staging/helpers/siwe-wallet.ts` | P1 | S | — |
| T7 | Fix smoke-auth.test.ts — `TEST_WALLET.address.toLowerCase()` (2 occurrences) | `tests/e2e/staging/smoke-auth.test.ts` | P1 | S | T6 |
| T8 | Fix smoke-fleet.test.ts — `TEST_WALLET.address` header value | `tests/e2e/staging/smoke-fleet.test.ts` | P1 | S | T6 |
| T9a | Validate build pipeline (automatable) | All build files | P0 | S | T1-T4 |
| T9b | Validate full staging stack (manual post-merge) | All | P0 | M | T1-T8 |

**Recommended execution order**: T1 → T2 (validate Docker build first — highest-risk blocker), then parallelize T3-T8, then T9a/T9b.

### Task Details

#### T1: Create build preparation script

**File**: `deploy/prepare-build.sh` (NEW)

Create script that:
1. Resolves paths relative to script location (`SCRIPT_DIR`)
2. Validates `../loa-hounfour` exists
3. Verifies `package.json` version === `8.2.0` (configurable via `HOUNFOUR_VERSION` env var, default `8.2.0`)
4. Guards `rm -rf` target path (must end with `.hounfour-build`)
5. Copies only `dist/`, `package.json`, `package-lock.json` (NO `node_modules/`)
6. Fallback: if `dist/` doesn't exist, copy entire source → `npm ci` (or `npm install` if no lockfile) → `npm run build` → THEN rm source files + node_modules
   **WARNING**: PRD code sample shows incorrect ordering (rm before build). Follow THIS ordering: copy → install → build → rm.
7. `--clean` flag: remove `.hounfour-build/` and exit
8. Set `chmod +x`

**Output**: `.hounfour-build/` at project root (~2-3MB)

#### T2: Fix Dockerfile — hounfour COPY + `--install-links` with automatic fallback

**File**: `deploy/Dockerfile` (MODIFY)

In `deps` stage:
- Add `COPY .hounfour-build /loa-hounfour` before package.json COPY
- Change `npm ci --omit=dev` → `RUN npm ci --omit=dev --install-links || npm install --omit=dev --install-links`

In `build` stage:
- Add `COPY .hounfour-build /loa-hounfour` before package.json COPY
- Change `npm ci` → `RUN npm ci --install-links || npm install --install-links`

**Automatic fallback**: The `||` pattern handles the case where `npm ci --install-links` rejects the `link: true` lockfile — falls back to `npm install --install-links` which regenerates the lockfile in the container. Add a comment explaining this pattern.

#### T3: Create `.dockerignore`

**File**: `.dockerignore` (NEW, at project root)

Exclude: `.git`, `**/node_modules`, `.claude`, `.run`, `.beads`, `.ck`, `grimoires`, `.flatline`, `.loa.config.yaml`, `tests`, `*.md`, `.env*`, `deploy/.env*`, `.hounfour-ci`, `.vscode`, `.idea`, `*.swp`

Do NOT exclude `.hounfour-build` — it is the hounfour delivery mechanism.

#### T4: Add `.hounfour-build/` to `.gitignore`

**File**: `.gitignore` (MODIFY)

Add entry: `.hounfour-build/`

#### T5: Update STAGING.md

**File**: `STAGING.md` (MODIFY)

- Change "Node.js 20+" → "Node.js 22+ and npm (must match Dockerfile and CI)"
- Add "Build Preparation (Hounfour)" section before "Build & Start" with usage instructions
- Add GHCR authentication prerequisite: `echo $GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin`
- Ensure Section 6 (smoke tests) uses `cd app && npm run test:e2e` (not bare `npm run test:e2e`)

#### T6: Fix siwe-wallet.ts

**File**: `tests/e2e/staging/helpers/siwe-wallet.ts` (MODIFY)

1. Add `import { privateKeyToAccount } from 'viem/accounts'`
2. Create eagerly-initialized `account` from `TEST_WALLET.privateKey`
3. Export `async function signMessage(message: string): Promise<string>`
4. Change `nonce: string` → `nonce = 'test-nonce-00000000'` in `createTestSiweMessage`

**Why optional nonce**: No `/api/auth/nonce` endpoint exists. Server-side SIWE verify doesn't validate nonces.

**Downstream effect**: This change also fixes `smoke-chat.test.ts` which imports `signMessage` and calls `createTestSiweMessage()` without arguments. No changes needed to `smoke-chat.test.ts` itself — it is implicitly fixed by this task.

#### T7: Fix smoke-auth.test.ts

**File**: `tests/e2e/staging/smoke-auth.test.ts` (MODIFY)

Replace 2 occurrences of:
- `TEST_WALLET.toLowerCase()` → `TEST_WALLET.address.toLowerCase()`

#### T8: Fix smoke-fleet.test.ts

**File**: `tests/e2e/staging/smoke-fleet.test.ts` (MODIFY)

Replace:
- `'x-agent-owner': TEST_WALLET` → `'x-agent-owner': TEST_WALLET.address`

#### T9a: Validate build pipeline (automatable)

Steps the implementation agent CAN perform:
1. `./deploy/prepare-build.sh` — verify `.hounfour-build/` created with `dist/`, `package.json`
2. `./deploy/prepare-build.sh --clean` — verify cleanup works, then re-run to recreate
3. Verify `.dockerignore` exists and `.hounfour-build` is NOT in it
4. Verify `.hounfour-build/` IS in `.gitignore`
5. `cd app && npx tsc --noEmit` — verify app type safety passes
6. Verify version guard rejects wrong version (test with modified check)

**Note**: Docker build validation requires `../loa-hounfour` to exist. If unavailable, validate script logic and file contents only.

#### T9b: Validate full staging stack (manual — operator-performed post-merge)

Requires Docker daemon, GHCR auth, and the full 5-service stack. NOT performed by the implementation agent.

1. `docker login ghcr.io` — authenticate for finn image pull
2. `./deploy/prepare-build.sh` — prep hounfour build artifacts
3. `docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging build` — verify success
4. Check build log: `Sending build context` < 15MB, `npm ci --install-links` exits 0 (or fallback fires)
5. `docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --wait` — verify 5 services healthy
6. `curl http://localhost:3001/api/health | jq .` — verify `healthy`
7. `cd app && npm run test:e2e` — verify all 6 suites pass

---

## Dependency Graph

```
T1 ──────────────────────→ T2 ──┐
T3 (independent) ────────────────┤
T4 (independent) ────────────────┼──→ T9a (build validation)
T1 ──→ T5 ───────────────────────┤
T6 ──→ T7 ───────────────────────┤
T6 ──→ T8 ───────────────────────┘
                                  ╰──→ T9b (manual, post-merge)
```

T1, T3, T4, T6 are independent (parallel start).
T2 depends on T1 (Dockerfile needs prepare-build.sh to exist).
T5 depends on T1 (docs reference the script).
T7, T8 depend on T6 (TypeScript compilation requires signMessage export from T6).
T9a depends on T1-T4 (build pipeline tasks).
T9b depends on all (full integration validation — manual).

---

## Estimates

- **Sprint 1**: 10 tasks (1 medium, 9 small) — single implement cycle
- **Total**: 1 sprint, ~30 minutes implementation
- **Files**: 8 (2 new, 6 modified) + smoke-chat.test.ts implicitly fixed (no changes)

## Flatline Sprint Review Log

| Category | Count | Action |
|----------|-------|--------|
| HIGH_CONSENSUS | 6 | Auto-integrated into v16.2.0 |
| DISPUTED | 1 | Downgraded to MEDIUM (tsconfig E2E gap — validated by running tests) |
| BLOCKER | 0 | — |
| PRAISE | 4+ | Logged |

**Key integrations**:
- HC-1: Dockerfile `npm ci || npm install` automatic fallback (T2)
- HC-2: smoke-chat.test.ts implicit dependency documented (T6)
- HC-3: T9 split into T9a (automatable) + T9b (manual post-merge) (T9a, T9b)
- HC-4: Missing validation steps added — build context size, version guard (T9a, T9b)
- HC-5: PRD code sample ordering warning added (T1)
- HC-6: GHCR auth + `cd app` prefix in STAGING.md (T5)
- D-1: tsconfig excludes E2E — downgraded, real validation is running tests (acceptance criteria updated)
