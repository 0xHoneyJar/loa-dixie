# PRD: Staging Deployment — Docker Build Fix & Stack Validation

**Version**: 16.1.0
**Date**: 2026-02-27
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-016
**Status**: Approved (post-Flatline)
**Predecessor**: cycle-015 PRD v15.0.0 (Phase 0 — CI Pipeline & Pre-Merge Hygiene)

> Sources: cycle-014 staging infrastructure (docker-compose.staging.yml, Dockerfile, STAGING.md,
> .env.example, 6 E2E smoke tests), cycle-015 CI pipeline (ci.yml hounfour checkout+build+symlink
> pattern), app/package.json (`file:../../loa-hounfour` dependency), loa-finn concurrent
> staging deployment from finn repo
>
> Flatline Review: 2026-02-27 | HIGH_CONSENSUS: 7 integrated | BLOCKER: 1 resolved (fix smoke tests)

---

## 1. Problem Statement

Dixie's staging infrastructure is complete (cycle-014) and CI pipeline is green (cycle-015),
but the **Docker build fails**. The Dockerfile runs `npm ci` which encounters
`"@0xhoneyjar/loa-hounfour": "file:../../loa-hounfour"` in package.json — a path that
resolves outside the Docker build context.

The CI workflow (ci.yml) solved this with a checkout+build+symlink pattern on GitHub Actions,
but the Dockerfile has no equivalent mechanism. Until this is fixed, `docker compose up` cannot
build the `dixie-bff` image.

### What Exists (from cycle-014)

| Component | Location | Status |
|-----------|----------|--------|
| Docker Compose staging stack | `deploy/docker-compose.staging.yml` | Ready |
| Dockerfile (multi-stage) | `deploy/Dockerfile` | **Broken** — hounfour not in build context |
| Environment template | `.env.example` | 24 vars documented |
| 16 DB migrations | `app/src/db/migrations/` | Auto-run on startup |
| E2E smoke tests (6) | `tests/e2e/staging/` | **2 broken** — siwe-wallet.ts missing exports |
| Terraform (ECS Fargate) | `deploy/terraform/dixie.tf` | Production (future) |
| Runbook | `STAGING.md` | 370 lines |

### What's Broken

1. **Dockerfile `npm ci` fails**: `file:../../loa-hounfour` resolves to `/loa-hounfour` from
   the `/app` working directory — that path doesn't exist in the build container.

2. **`link: true` in package-lock.json**: `npm ci` creates a **symlink** in
   `node_modules/@0xhoneyjar/loa-hounfour` pointing to `../../loa-hounfour`. Docker's
   `COPY --from=deps` copies the symlink itself (not the target), producing a **dangling
   symlink in the runtime stage** that crashes at startup with `MODULE_NOT_FOUND`.
   Fix: `npm ci --install-links` dereferences symlinks during install.

3. **No `.dockerignore`**: The build context includes `.git/`, `node_modules/`, test fixtures,
   and framework files, making builds slow and bloated.

4. **STAGING.md says Node 20+**: Should be Node 22+ to match Dockerfile, CI, and package.json engines.

5. **Smoke test TypeScript errors**: `signMessage` is imported from `siwe-wallet.ts` in
   `smoke-auth.test.ts` and `smoke-chat.test.ts` but is **not exported**. Additionally,
   `createTestSiweMessage(nonce: string)` is called without the required `nonce` argument
   in 4 places. These tests cannot compile.

## 2. Goals & Success Criteria

| # | Goal | Acceptance Criteria |
|---|------|-------------------|
| G1 | Docker build succeeds | `docker compose -f deploy/docker-compose.staging.yml build` completes without error |
| G2 | Full stack boots | `docker compose up -d --wait` starts all 5 services (postgres, redis, nats, loa-finn, dixie-bff) |
| G3 | Health endpoint green | `curl http://localhost:3001/api/health` returns `{"status": "healthy"}` with all infrastructure deps |
| G4 | Smoke tests pass | `npm run test:e2e` — all 6 staging smoke tests pass |

### Non-Goals

- Production deployment (ECS Fargate) — that's a future cycle
- Publishing loa-hounfour to npm registry — long-term fix, not this cycle
- Changes to the loa-finn image — that's being handled from the finn repo concurrently

## 3. Constraints

### Cross-Repo Coordination

- **loa-finn**: Being deployed to staging concurrently from the finn repo. Dixie depends on
  `ghcr.io/0xhoneyjar/loa-finn:v3.2.0` being pullable.
- **loa-hounfour**: Private sibling dependency at `file:../../loa-hounfour` (v8.2.0).
  The Dockerfile must include hounfour in the build context since npm registry publication
  doesn't exist.
- **JWT shared secret**: `DIXIE_JWT_PRIVATE_KEY` in dixie must match `JWT_SECRET` in loa-finn
  for cross-service auth to work. docker-compose.staging.yml already wires this correctly.

### Technical Constraints

- Node 22 across all environments (Dockerfile, CI, package.json engines)
- Hounfour v8.2.0 pinned (matching CI's `ref: v8.2.0`)
- Docker Compose v2 (required for `--wait` flag and health conditions)
- Private GitHub repo (0xHoneyJar/loa-hounfour) — Docker build must not require GitHub auth
- `npm ci --install-links` required to dereference `file:` symlinks in multi-stage builds

## 4. Functional Requirements

### FR-1: Fix Dockerfile Hounfour Dependency

The Dockerfile MUST be modified to handle the `file:../../loa-hounfour` dependency in a
multi-stage Docker build. Two changes are required:

**A. Build preparation script** (`deploy/prepare-build.sh`):
Copies hounfour build artifacts (`dist/`, `package.json`, `package-lock.json` — NOT
`node_modules`) into `.hounfour-build/` within the project root (Docker build context).

The script MUST:
- Verify hounfour exists at `../loa-hounfour`
- Verify version matches v8.2.0 (`jq -r .version package.json`)
- Copy only `dist/`, `package.json`, `package-lock.json` (no `node_modules`, no `.git/`)
- If `dist/` doesn't exist, build from source as fallback
- Guard `rm -rf` with path validation (ensure target ends with `.hounfour-build`)
- Support `--clean` flag to remove `.hounfour-build/`

**B. Dockerfile modifications**:
Both `deps` and `build` stages MUST:
1. `COPY .hounfour-build /loa-hounfour` — place hounfour at the resolved path
2. Use `npm ci --install-links` — dereferences the `file:` symlink, copying package
   contents into `node_modules/` instead of creating a symlink. This ensures
   `COPY --from=deps /app/node_modules` in the runtime stage includes the actual
   hounfour package, not a dangling symlink.

**Acceptance Criteria**:
- `npm ci --install-links` succeeds in both `deps` and `build` stages
- No GitHub authentication required during Docker build
- Build prep script verifies hounfour version matches v8.2.0
- `node_modules/@0xhoneyjar/loa-hounfour` in runtime stage is a real directory (not symlink)
- Build prep script documented in STAGING.md

### FR-2: Add .dockerignore

Create `.dockerignore` at the **project root** (not `deploy/` — Docker resolves it relative
to the build context, which is `..` per docker-compose.staging.yml).

**Exclusions**:
- `.git/`
- `**/node_modules/`
- `.claude/`
- `.run/`
- `grimoires/`
- `.beads/`
- `.ck/`
- `tests/`
- `*.md`
- `.env*`
- `.flatline/`

**Explicit inclusions** (must NOT be excluded):
- `.hounfour-build/` — this is the hounfour delivery mechanism
- `app/` — source code
- `deploy/Dockerfile` — referenced by path

**Acceptance Criteria**:
- `docker build` outputs "Sending build context to Docker daemon" < 15MB total
- `.hounfour-build/` is accessible in the build context
- No secrets (`.env*`) in build context

### FR-3: Update STAGING.md

- Fix Node.js version requirement: 20+ → 22+
- Add build preparation step before `docker compose build`
- Document `deploy/prepare-build.sh` usage
- Document `deploy/prepare-build.sh --clean` for cleanup

**Acceptance Criteria**:
- All version references consistent (Node 22)
- Deployment sequence includes build prep step

### FR-4: Validate End-to-End Stack

After Dockerfile is fixed, validate the full deployment sequence:
1. Run `deploy/prepare-build.sh`
2. Create `deploy/.env.staging` from `.env.example`
3. `docker compose -f deploy/docker-compose.staging.yml --env-file deploy/.env.staging up -d --wait`
4. `curl http://localhost:3001/api/health`
5. `npm run test:e2e`

**Smoke Test Dependency Matrix**:

| Test | External Dependencies | Expected Outcome |
|------|----------------------|------------------|
| smoke-health | None (health endpoint only) | Pass |
| smoke-auth | SIWE wallet signing, allowlist | Pass (after FR-5) |
| smoke-chat | Working loa-finn inference | Pass if finn healthy |
| smoke-fleet | Agent spawn infrastructure | Pass (governs via DB) |
| smoke-reputation | PostgreSQL persistence | Pass |
| smoke-governance | Admin key, governance tables | Pass |

**Acceptance Criteria**:
- Stack boots within 60 seconds
- Health returns `healthy` for all infrastructure deps
- All 6 smoke tests pass

### FR-5: Fix E2E Smoke Test Helpers (Flatline BLOCKER Resolution)

Fix pre-existing TypeScript errors in `tests/e2e/staging/helpers/siwe-wallet.ts`:

1. **Export `signMessage` function**: Add a `signMessage(message: string): Promise<string>`
   function that signs with the hardhat test wallet private key using `viem` or manual
   ECDSA signing.

2. **Fix `createTestSiweMessage` calls**: The function requires `nonce: string` but is
   called without arguments in `smoke-auth.test.ts` (lines 26, 41, 58) and
   `smoke-chat.test.ts` (line 14). Either:
   - Make `nonce` optional with a default (e.g., `nonce = 'test-nonce'`), OR
   - Update callers to fetch nonce from `/api/auth/nonce` first

**Acceptance Criteria**:
- `npx tsc --noEmit` passes for the E2E test files
- `signMessage` is exported and produces valid SIWE signatures
- `createTestSiweMessage` works with the test flow (nonce from server or default)

## 5. Technical Approach

### Hounfour Build Context Strategy

The Dockerfile stays simple by using a **COPY-based approach** with a build preparation script.

**Build prep script** (`deploy/prepare-build.sh`):
```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOUNFOUR_SRC="${PROJECT_ROOT}/../loa-hounfour"
HOUNFOUR_DEST="${PROJECT_ROOT}/.hounfour-build"
EXPECTED_VERSION="8.2.0"

# Clean mode
if [[ "${1:-}" == "--clean" ]]; then
  rm -rf "$HOUNFOUR_DEST"
  echo "Cleaned .hounfour-build"
  exit 0
fi

# Validate source exists
if [[ ! -d "$HOUNFOUR_SRC" ]]; then
  echo "ERROR: loa-hounfour not found at $HOUNFOUR_SRC"
  exit 1
fi

# Validate version
ACTUAL_VERSION=$(jq -r .version "$HOUNFOUR_SRC/package.json")
if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
  echo "ERROR: Expected hounfour v$EXPECTED_VERSION, found v$ACTUAL_VERSION"
  exit 1
fi

# Guard rm -rf target
if [[ "$HOUNFOUR_DEST" != *".hounfour-build" ]]; then
  echo "ERROR: Unexpected destination path: $HOUNFOUR_DEST"
  exit 1
fi

rm -rf "$HOUNFOUR_DEST"
mkdir -p "$HOUNFOUR_DEST"

# Copy only production artifacts (no node_modules — npm ci handles deps)
if [[ -d "$HOUNFOUR_SRC/dist" ]]; then
  cp -r "$HOUNFOUR_SRC/dist" "$HOUNFOUR_DEST/dist"
  cp "$HOUNFOUR_SRC/package.json" "$HOUNFOUR_DEST/"
  cp "$HOUNFOUR_SRC/package-lock.json" "$HOUNFOUR_DEST/" 2>/dev/null || true
  echo "Copied hounfour v$ACTUAL_VERSION build artifacts"
else
  echo "dist/ not found, building from source..."
  cp -r "$HOUNFOUR_SRC" "$HOUNFOUR_DEST"
  rm -rf "$HOUNFOUR_DEST"/{.git,.github,tests,src}
  cd "$HOUNFOUR_DEST" && npm ci && npm run build
  rm -rf "$HOUNFOUR_DEST/node_modules"
  echo "Built hounfour v$ACTUAL_VERSION from source"
fi
```

**Modified Dockerfile** (`deploy/Dockerfile`):
```dockerfile
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# --- Dependencies ---
FROM base AS deps
COPY .hounfour-build /loa-hounfour
COPY app/package.json app/package-lock.json* ./
RUN npm ci --omit=dev --install-links

# --- Build ---
FROM base AS build
COPY .hounfour-build /loa-hounfour
COPY app/package.json app/package-lock.json* ./
RUN npm ci --install-links
COPY app/tsconfig.json ./
COPY app/src/ ./src/
RUN npm run build

# --- Runtime ---
FROM base AS runtime
RUN addgroup --system dixie && adduser --system --ingroup dixie dixie

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY app/package.json ./

USER dixie
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
```

Key insight: `--install-links` causes `npm ci` to **copy** the `file:` dependency contents
into `node_modules/` rather than creating a symlink. This means `COPY --from=deps /app/node_modules`
in the runtime stage includes the actual hounfour package, not a dangling symlink.

### Why Not Git Clone in Dockerfile

- loa-hounfour is a private repo — would require GitHub auth tokens in build args
- Coupling Docker build to network access is fragile
- Local copy is simpler and faster

### Why Not Copy node_modules from Hounfour

- Host `node_modules` may contain native binaries compiled for a different architecture
  (e.g., macOS arm64 vs Docker linux/amd64)
- `npm ci` in the container installs the correct platform-specific dependencies
- Reduces build context by ~66MB

### Stack Architecture (unchanged from cycle-014)

```
postgres:16.6 ─┐
redis:7.4 ─────┤
nats:2.10 ─────┤
loa-finn:v3.2 ─┤
                └── dixie-bff:latest (built from Dockerfile)
                    └── exposed on :3001
```

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| loa-finn image not pullable | Stack can't start | Verify ghcr.io access before deploy |
| Hounfour not built locally | Build prep fails | Script builds from source as fallback |
| Hounfour version drift | Lockfile integrity error | Script verifies version matches v8.2.0 |
| JWT secret mismatch | Auth fails between services | docker-compose wires single `DIXIE_JWT_PRIVATE_KEY` to both |
| Port conflict on :3001 | dixie-bff can't bind | Check `lsof -i :3001` before deploy |
| CI Docker builds (image push) | `prepare-build.sh` won't work in CI | Separate CI concern — CI uses checkout+symlink pattern |
| Allowlist.json missing | Auth may reject all wallets | Verify allowlist behavior when file absent |

## 7. Out of Scope

- Fly.io deployment (no Fly config exists; project targets Docker Compose for staging)
- loa-hounfour npm publication (long-term improvement, separate cycle)
- Production deployment (ECS Fargate, future cycle)
- loa-finn image changes (being handled in finn repo)
- TLS/HTTPS (staging is localhost-only)

## 8. Flatline Review Log

**Run**: 2026-02-27 | **Phase**: PRD | **Mode**: Interactive (HITL)

| Category | Count | Action |
|----------|-------|--------|
| HIGH_CONSENSUS | 7 | Auto-integrated into v16.1.0 |
| BLOCKER | 1 | Resolved: FR-5 added (fix smoke test helpers) |
| DISPUTED | 0 | — |
| LOW_VALUE | 0 | — |
| PRAISE | 3 | Logged |

**Key integrations**:
- HC-1: Added `--install-links` to solve symlink/COPY problem (Section 1.2, FR-1B, Section 5)
- HC-2: Removed node_modules from build prep copy (Section 5, "Why Not Copy node_modules")
- HC-3: Added .gitignore requirement for `.hounfour-build/` (FR-1A)
- HC-4: Added version verification to build prep script (FR-1A)
- HC-5: Specified .dockerignore at project root (FR-2)
- HC-6: Clarified both `deps` and `build` stages need COPY + --install-links (FR-1B)
- HC-7: Added CI Docker build divergence to risks (Section 6)
- BLOCKER-1: Added FR-5 to fix smoke test TypeScript errors
