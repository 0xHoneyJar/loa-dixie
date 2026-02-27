# Sprint Plan: Staging Deploy Fixes — Hounfour Git Pin & Docker Build Repair

**Version**: 16.4.0
**Date**: 2026-02-27
**Cycle**: cycle-016
**PRD**: v16.1.0
**SDD**: v16.1.0

> Source: Staging deployment session discovered 3 Docker build failures + hounfour
> dependency portability issue. loa-hounfour commit b6e0027a fixes dist/ (was in .gitignore).
> Cross-repo issues: loa-dixie #57, loa-finn #111, loa-finn #112.

---

## Sprint 3: Staging Deploy Fixes — Hounfour Git Pin & Docker Build Repair

**Global ID**: 112
**Goal**: Switch hounfour dependency from non-portable `file:` link to git pin at `b6e0027a`, fix 3 Docker build failures discovered during staging deployment, and simplify the Dockerfile by removing the `.hounfour-build` pipeline.
**Branch**: `fix/staging-docker-build`
**Closes**: loa-dixie #57
**Acceptance Criteria**:
- `app/package.json` uses `github:0xHoneyJar/loa-hounfour#b6e0027a` instead of `file:../../loa-hounfour`
- Dockerfile builds successfully without `.hounfour-build/` directory
- `docker compose -f deploy/docker-compose.staging.yml up -d` starts dixie-bff (healthy)
- All 13 migrations run in order (no `_down.sql` interference)
- `cd app && npx tsc --noEmit` passes
- All existing tests pass (no regressions)

### Tasks

| ID | Task | File(s) | Priority | Effort | Depends |
|----|------|---------|----------|--------|---------|
| T1 | Switch hounfour dep from file: to git pin b6e0027a | `app/package.json` | P0 | S | — |
| T2 | Regenerate lockfile with git-pinned hounfour | `app/package-lock.json` | P0 | S | T1 |
| T3 | Simplify Dockerfile: remove .hounfour-build, use npm install directly | `deploy/Dockerfile` | P0 | M | T1 |
| T4 | Add tsconfig.build.json excluding test files for Docker build | `app/tsconfig.build.json` | P0 | S | — |
| T5 | Fix migration runner to exclude _down.sql rollback files | `app/src/db/migrate.ts` | P0 | S | — |
| T6 | Validate: Docker build, tsc --noEmit, test suite | All | P0 | S | T1-T5 |

### Task Details

#### T1: Switch hounfour dependency to git pin

**File**: `app/package.json` (MODIFY)
**Closes**: loa-dixie #57

```diff
-"@0xhoneyjar/loa-hounfour": "file:../../loa-hounfour",
+"@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#b6e0027a",
```

**Why**: The `file:` link only works when `../loa-hounfour` exists as a sibling directory. This breaks in Docker, CI (without the checkout+symlink workaround), and any clean clone. Hounfour commit `b6e0027a` fixed the `.gitignore` to include `dist/`, making git-based consumption reliable. npm fetches GitHub refs as tarballs (no git binary needed in Docker).

#### T2: Regenerate lockfile

**File**: `app/package-lock.json` (MODIFY)

Run `cd app && npm install` to regenerate the lockfile with the git-pinned hounfour. This replaces the `file:` reference entries with GitHub tarball references that are portable across environments.

#### T3: Simplify Dockerfile

**File**: `deploy/Dockerfile` (MODIFY)

Remove the `.hounfour-build` COPY pipeline. With hounfour as a git pin, `npm install` fetches it directly from GitHub inside the container — no build context workaround needed.

Key changes:
- Remove `COPY .hounfour-build /loa-hounfour` from both stages
- Remove `--install-links` (no longer needed without `file:` reference)
- Add `--include=dev` in build stage (NODE_ENV=production causes npm to skip @types/pg)
- Use `tsconfig.build.json` to exclude test files from compilation
- Copy SQL migrations into dist (tsc doesn't copy non-TS files)
- Exclude `_down.sql` rollback files from migration copy

#### T4: Add tsconfig.build.json

**File**: `app/tsconfig.build.json` (NEW)

Extends `tsconfig.json` with additional excludes for test files. The Docker build doesn't need test files, and they import `vitest` (a devDependency that causes type errors even with `--include=dev` in some configurations).

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "tests", "src/**/__tests__/**", "src/**/*.test.ts"]
}
```

#### T5: Fix migration runner — exclude _down.sql

**File**: `app/src/db/migrate.ts` (MODIFY)

The `discoverMigrations()` function picks up ALL `.sql` files including `*_down.sql` rollback files. These DOWN migrations drop tables that later UP migrations reference, causing cascading failures (e.g., 013_fleet_orchestration_down.sql drops `fleet_tasks`, then 015_agent_ecology.sql fails because `fleet_tasks` doesn't exist).

```diff
 return files
-  .filter((f) => f.endsWith('.sql'))
+  .filter((f) => f.endsWith('.sql') && !f.includes('_down'))
   .sort((a, b) => {
```

This aligns with the migration runner's documented design principle: "Forward-only: no rollbacks."

#### T6: Validation

1. `cd app && npx tsc --noEmit` — type check passes
2. `cd app && npm test` — full test suite passes
3. Docker build succeeds: `docker compose -f deploy/docker-compose.staging.yml build dixie-bff`
4. Staging stack starts: postgres, redis, nats, dixie-bff all healthy

---

## Dependency Graph

```
T1 ──→ T2 ──→ T3 ──→ T6
T4 ──────────────────→ T6
T5 ──────────────────→ T6
```

## Estimates

- **Sprint 3**: 6 tasks (5 small, 1 medium) — single implement cycle
- **Files**: 4 modified, 1 new
