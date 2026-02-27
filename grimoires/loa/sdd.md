# SDD: Staging Deployment — Docker Build Fix & Stack Validation

**Version**: 16.1.0
**Date**: 2026-02-27
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-016
**Status**: Approved (post-Flatline)
**PRD Reference**: PRD v16.1.0 — Staging Deployment — Docker Build Fix & Stack Validation

> Flatline Review: 2026-02-27 | HIGH_CONSENSUS: 6 integrated | DISPUTED: 1 (add test step)

---

## 1. Architecture Overview

Cycle-016 is a **deployment infrastructure cycle**. No new services, routes, or capabilities.
The work fixes the Docker build pipeline to handle the `file:` hounfour dependency, adds
build hygiene (`.dockerignore`, `.gitignore`), fixes pre-existing E2E smoke test errors,
and validates the full staging stack.

### What Already Exists (code reality)

| Component | File | Status |
|-----------|------|--------|
| Multi-stage Dockerfile | `deploy/Dockerfile` | Broken — needs hounfour COPY + `--install-links` |
| Docker Compose staging | `deploy/docker-compose.staging.yml` | Ready (5 services) |
| CI hounfour pattern | `.github/workflows/ci.yml:24-44` | Working (checkout+build+symlink) |
| Env template | `.env.example` | Ready (24 vars) |
| Runbook | `STAGING.md` | Needs Node version fix |
| E2E smoke tests | `tests/e2e/staging/*.test.ts` | **3/6 broken** (siwe-wallet exports + TEST_WALLET type bugs) |
| siwe-wallet helper | `tests/e2e/staging/helpers/siwe-wallet.ts` | Missing `signMessage` export |

### What Changes

| # | File | Change |
|---|------|--------|
| 1 | `deploy/Dockerfile` | Add hounfour COPY + `--install-links` in deps & build stages |
| 2 | `deploy/prepare-build.sh` | **New** — build prep script with version verification |
| 3 | `.dockerignore` | **New** — at project root, exclude `.git/`, `node_modules/`, etc. |
| 4 | `.gitignore` | Add `.hounfour-build/` entry |
| 5 | `STAGING.md` | Node 20+ → 22+, add build prep step |
| 6 | `tests/e2e/staging/helpers/siwe-wallet.ts` | Add `signMessage` export, make `nonce` optional |
| 7 | `tests/e2e/staging/smoke-auth.test.ts` | Fix `TEST_WALLET.address.toLowerCase()` (2 occurrences) |
| 8 | `tests/e2e/staging/smoke-chat.test.ts` | No changes needed (nonce now optional) |
| 9 | `tests/e2e/staging/smoke-fleet.test.ts` | Fix `TEST_WALLET.address` for header value |

**Total files changed**: 9 (2 new, 7 modified)

## 2. Detailed Design

### 2.1 Dockerfile Modifications (FR-1B)

**Current** (`deploy/Dockerfile`):
```dockerfile
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY app/package.json app/package-lock.json* ./
RUN npm ci --omit=dev          # ← FAILS: file:../../loa-hounfour not found

FROM base AS build
COPY app/package.json app/package-lock.json* ./
RUN npm ci                     # ← FAILS: same reason
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

FROM base AS runtime
...
COPY --from=deps /app/node_modules ./node_modules  # ← DANGLING: copies symlink not target
COPY --from=build /app/dist ./dist
```

**Modified**:
```dockerfile
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Path resolution: WORKDIR=/app, package.json says file:../../loa-hounfour
# From /app, ../../loa-hounfour resolves to /loa-hounfour
# So we COPY .hounfour-build to /loa-hounfour to satisfy the file: reference.

FROM base AS deps
COPY .hounfour-build /loa-hounfour                 # ← NEW: place at resolved path
COPY app/package.json app/package-lock.json* ./
RUN npm ci --omit=dev --install-links               # ← CHANGED: dereference file: symlink

FROM base AS build
COPY .hounfour-build /loa-hounfour                 # ← NEW: same
COPY app/package.json app/package-lock.json* ./
RUN npm ci --install-links                          # ← CHANGED: same
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

FROM base AS runtime
...
COPY --from=deps /app/node_modules ./node_modules   # ← NOW WORKS: real dir, not symlink
COPY --from=build /app/dist ./dist
```

**Why `--install-links` is critical**: Without it, `npm ci` creates
`node_modules/@0xhoneyjar/loa-hounfour → ../../loa-hounfour` (symlink). Docker's
`COPY --from=deps` copies the symlink itself, not the target. In the runtime stage,
`/loa-hounfour` doesn't exist → dangling symlink → `MODULE_NOT_FOUND` at startup.
With `--install-links`, npm copies the package contents directly into `node_modules/`,
producing a real directory that survives multi-stage COPY.

**Lockfile compatibility note** (Flatline DISPUTED): The lockfile was generated without
`--install-links`, so it records `link: true`. While `npm ci --install-links` should
override this, behavior may vary by npm version. If `npm ci` rejects the lockfile,
fall back to `npm install --install-links` (which regenerates the lockfile in the
container). Add an explicit test for this during implementation.

### 2.2 Build Preparation Script (FR-1A)

**Path**: `deploy/prepare-build.sh`
**Permissions**: `chmod +x deploy/prepare-build.sh`

**Behavior**:
1. Resolve paths relative to script location (portable)
2. Validate `../loa-hounfour` exists
3. Verify `package.json` version === `8.2.0`
4. Guard `rm -rf` target path (must end with `.hounfour-build`)
5. Copy only `dist/`, `package.json`, `package-lock.json` (NO `node_modules/`)
6. Fallback: if `dist/` doesn't exist, copy source, build, then clean up source files
   **Order**: copy → npm ci → npm run build → rm source files (NOT rm then build)
7. `--clean` flag: remove `.hounfour-build/` and exit

**Output**: `.hounfour-build/` at project root containing:
```
.hounfour-build/
├── dist/           # Compiled TypeScript output
├── package.json    # Package metadata (v8.2.0)
└── package-lock.json  # Lockfile (if exists)
```

**Size**: ~2-3MB (dist + metadata only, no node_modules)

### 2.3 .dockerignore (FR-2)

**Path**: `.dockerignore` (project root — build context root per `context: ..` in compose)

```dockerignore
# Version control
.git
.gitignore

# Dependencies (npm ci installs fresh in container)
**/node_modules

# Loa framework
.claude
.run
.beads
.ck
grimoires
.flatline
.loa.config.yaml

# Test files (not needed in production image)
tests

# Documentation
*.md

# Environment files (secrets)
.env*
deploy/.env*

# CI artifacts
.hounfour-ci

# IDE / Editor
.vscode
.idea
*.swp

# NOTE: .hounfour-build is intentionally NOT excluded — it is the
# hounfour delivery mechanism for the Docker build.
```

### 2.4 .gitignore Update

Add to existing `.gitignore`:
```
# Docker build artifacts
.hounfour-build/
```

### 2.5 STAGING.md Updates (FR-3)

**Change 1**: Line 9, Node.js version:
```diff
- - Node.js 20+ and npm
+ - Node.js 22+ and npm (must match Dockerfile and CI)
```

**Change 2**: Add build preparation section before "Build & Start":
```markdown
## 2.5 Build Preparation (Hounfour)

The Dockerfile requires loa-hounfour build artifacts in the Docker context.
Run the build preparation script before building:

```bash
# Prepare hounfour build artifacts
./deploy/prepare-build.sh

# Verify (should show dist/, package.json)
ls .hounfour-build/
```

**Requirements**:
- loa-hounfour checked out as sibling directory (`../loa-hounfour`)
- loa-hounfour built (`dist/` exists) — script will build from source if needed
- Version must be v8.2.0 (script validates automatically)

**Cleanup**:
```bash
./deploy/prepare-build.sh --clean
```
```

### 2.6 E2E Smoke Test Fixes (FR-5)

**File**: `tests/e2e/staging/helpers/siwe-wallet.ts`

Two additions:

1. **`signMessage` function** using `viem` (already a production dependency at `^2.23.0`):

```typescript
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(TEST_WALLET.privateKey);

/**
 * Sign a message with the test wallet (Hardhat account #0).
 * Account is eagerly initialized at module import time.
 */
export async function signMessage(message: string): Promise<string> {
  return account.signMessage({ message });
}
```

2. **Make `nonce` optional** in `createTestSiweMessage`:

```typescript
// Before:
export function createTestSiweMessage(nonce: string, domain = 'localhost'): string {

// After:
export function createTestSiweMessage(nonce = 'test-nonce-00000000', domain = 'localhost'): string {
```

**Why optional nonce (not fetch from server)**: The auth routes (`app/src/routes/auth.ts`)
define only `POST /siwe` and `GET /verify` — there is **no** `GET /api/auth/nonce` endpoint.
Server-side SIWE verification (`siweMessage.verify({ signature })`) does not validate nonces.
A default test nonce value works correctly.

**File**: `tests/e2e/staging/smoke-auth.test.ts`

Fix `TEST_WALLET` object used as string (2 occurrences):
```typescript
// Before:
expect(res.body.wallet.toLowerCase()).toBe(TEST_WALLET.toLowerCase());

// After:
expect(res.body.wallet.toLowerCase()).toBe(TEST_WALLET.address.toLowerCase());
```

**File**: `tests/e2e/staging/smoke-fleet.test.ts`

Fix `TEST_WALLET` object used as HTTP header value:
```typescript
// Before:
'x-agent-owner': TEST_WALLET,

// After:
'x-agent-owner': TEST_WALLET.address,
```

## 3. Deployment Sequence

The complete staging deployment flow after this cycle:

```
1. ./deploy/prepare-build.sh                          # Prep hounfour in build context
2. cp .env.example deploy/.env.staging                # Create env file
3. # Edit deploy/.env.staging                          # Set DIXIE_JWT_PRIVATE_KEY, POSTGRES_PASSWORD
4. docker compose -f deploy/docker-compose.staging.yml \
     --env-file deploy/.env.staging up -d --wait
5. curl http://localhost:3001/api/health | jq .
6. cd app && npm run test:e2e                          # All 6 smoke test suites
```

**Note**: `npm run test:e2e` must run from `app/` directory (that's where `package.json`
and `vitest.e2e.config.ts` live). Smoke tests are integration tests that require the full
Docker stack to be running — they make real HTTP requests to `localhost:3001`.

## 4. Testing Strategy

| Test Type | Scope | How | Prerequisite |
|-----------|-------|-----|-------------|
| Docker build | FR-1 | `docker compose build` succeeds | `prepare-build.sh` |
| `--install-links` compat | FR-1 | Verify npm ci doesn't reject lockfile | Docker build log |
| Runtime health | FR-1, FR-4 | Health endpoint returns `healthy` | Full stack running |
| Type safety | FR-5 | `cd app && npx tsc --noEmit` (covers E2E imports) | None |
| Smoke tests | FR-4, FR-5 | `cd app && npm run test:e2e` — all 6 suites pass | Full stack running |
| Build context | FR-2 | Docker output shows < 15MB context sent | `.dockerignore` created |
| Version guard | FR-1 | Script rejects wrong hounfour version | Local hounfour exists |

## 5. Risks & Dependencies

| Risk | Owner | Mitigation |
|------|-------|------------|
| `npm ci --install-links` rejects `link: true` lockfile | Build | Fall back to `npm install --install-links`; add explicit test |
| `--install-links` not in Docker's npm | Build | Node 22 ships npm 10.x+ which supports it. Verify in build log. |
| ghcr.io/0xhoneyjar/loa-finn:v3.2.0 not pullable | Infra | Test `docker pull` before full stack up |
| Allowlist.json missing in container | App | Verify app behavior when allowlist file absent |
| Smoke tests depend on inference backend | E2E | smoke-chat may fail if finn isn't healthy |
| CI Docker builds (future image push) | Build | CI uses checkout+symlink pattern, not prepare-build.sh |

## 6. Flatline Review Log

| Category | Count | Action |
|----------|-------|--------|
| HIGH_CONSENSUS | 6 | Auto-integrated into v16.1.0 |
| DISPUTED | 1 | Added lockfile compat test step (Section 4) |
| BLOCKER | 0 | — |
| PRAISE | 3 | Logged |

**Key integrations**:
- HC-1: Nonce endpoint doesn't exist → use optional default nonce (Section 2.6)
- HC-2: `TEST_WALLET.address.toLowerCase()` fix (Section 2.6, smoke-auth)
- HC-3: 3/6 tests broken, not 2/6 (Section 1, smoke-fleet added to scope)
- HC-4: Fallback build order fixed — build before removing source (Section 2.2)
- HC-5: Removed `!app/README.md` exception from .dockerignore (Section 2.3)
- HC-6: Clarified `cd app && npm run test:e2e` (Section 3)
- D-1: Added `--install-links` lockfile compat as explicit test step (Section 4)
