# PRD: Phase 0 — CI Pipeline & Pre-Merge Hygiene

**Version**: 15.0.0
**Date**: 2026-02-27
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-015
**Status**: Draft
**Predecessor**: cycle-014 PRD v14.1.0 (Staging Launch Readiness)

> Sources: loa-finn #66 comment (Command Deck Update — Staging Deployment Sequence),
> Phase 0.7 action item, `.github/workflows/e2e.yml` (current sole CI workflow),
> `app/package.json` scripts (test, lint, typecheck, build), codebase reality
> (2373 unit tests passing, 4 TypeScript errors on main, Node 22 in Dockerfile
> vs Node 20 in CI), `.github/BRANCH_PROTECTION.md` (stale check names)

---

## 1. Problem Statement

Dixie's CI pipeline does not reflect reality. The **only** GitHub Actions workflow
(`e2e.yml`) runs staging smoke tests that require live infrastructure — PostgreSQL,
Redis, NATS, and a running loa-finn instance. These tests **always fail** in CI
because GitHub Actions cannot provision the full staging stack. PR #50 was merged
despite CI failure.

Meanwhile, the codebase has **2,373 passing unit tests**, TypeScript type checking,
ESLint linting, and a working build step — none of which run in CI. There is no
quality gate that catches regressions before merge.

Additionally:
- **4 TypeScript errors** exist on `main` (hounfour type drift from upstream changes)
- **Node version mismatch**: CI uses Node 20, project/Dockerfile uses Node 22
- **Branch protection docs** reference check names (`Template Protection`,
  `Validate Framework Files`) that don't exist as workflows
- **Dependabot** targets `/integration` directory which doesn't exist

### What Phase 0.7 Requires

From the deployment plan (loa-finn #66 comment):
> "Mark staging smoke test CI as advisory (not required) — Tests need live staging
> infra — they'll always fail in CI-only context"

### What "CI Green" Means

1. A **required** CI workflow runs typecheck, lint, unit tests, and build on every PR
2. Staging smoke tests exist as an **advisory** (non-blocking) workflow
3. All required checks pass on `main` — no pre-existing failures
4. Node version matches between CI, Dockerfile, and `engines` field
5. Branch protection documentation reflects actual check names

---

## 2. Goals & Success Metrics

| ID | Goal | Success Metric |
|----|------|----------------|
| G-1 | Required CI workflow | `ci.yml` runs typecheck + lint + test + build on PRs to `main` |
| G-2 | Advisory staging tests | `e2e.yml` uses `continue-on-error: true`, clearly labeled advisory |
| G-3 | Zero typecheck errors on main | `npm run typecheck` exits 0 from `app/` |
| G-4 | Node version alignment | CI, Dockerfile, and package.json all specify Node 22 |
| G-5 | Accurate branch protection docs | `BRANCH_PROTECTION.md` references actual CI check names |
| G-6 | Dependabot hygiene | Targets correct directory (`app/`), removes stale config |

---

## 3. Scope

### In Scope

| Item | Type | Effort |
|------|------|--------|
| Create `.github/workflows/ci.yml` | New file | Small |
| Update `.github/workflows/e2e.yml` | Modify | Small |
| Fix 21 TypeScript errors across 16 files on main | Modify source | Medium |
| Update Node version in CI | Modify workflow | Trivial |
| Add `engines` field to `app/package.json` | Modify | Trivial |
| Update `.github/BRANCH_PROTECTION.md` | Modify | Small |
| Update `.github/dependabot.yml` | Modify | Small |

### Out of Scope

- `web/` frontend tests (separate project, needs its own vitest config + jsdom)
- New features or application code changes beyond type fixes
- Staging infrastructure deployment (Phase 2)
- Cross-repo CI changes (loa-finn, loa-freeside — separate Phase 0 items)

---

## 4. Functional Requirements

### FR-1: Required CI Workflow (`ci.yml`)

**Triggers**: Pull requests to `main` targeting `app/**`, `deploy/**`, `tests/**`, `.github/**`

**Jobs**:
1. **Typecheck**: `npm run typecheck` (TypeScript `--noEmit`)
2. **Lint**: `npm run lint` (ESLint)
3. **Test**: `npm run test` (Vitest unit tests — 2373 tests)
4. **Build**: `npm run build` (TypeScript compilation)

**Constraints**:
- All jobs run from `app/` working directory
- Node 22 with npm cache
- Timeout: 10 minutes
- Job name for branch protection: `CI` (single required check)

### FR-2: Advisory Staging Workflow (`e2e.yml`)

**Changes**:
- Add `continue-on-error: true` to the `e2e` job
- Rename job to `Staging Smoke Tests (Advisory)`
- Add comment header explaining why this is advisory
- Keep `workflow_dispatch` trigger for manual runs when staging infra exists

### FR-3: TypeScript Error Fixes

Fix 21 type errors across 16 files on `main`. Categorized by root cause:

| Category | Files | Count | Root Cause |
|----------|-------|-------|------------|
| Hono handler return types | agent.ts, chat.ts | 3 | `Promise<unknown>` not assignable to `HandlerResponse` |
| jose `KeyLike` export | service-jwt.ts | 2 | Type not exported from jose v6 |
| `hash_chain_head` unknown prop | fleet-governor.ts, sovereignty-engine.ts | 2 | Hounfour type drift |
| FleetTaskRecord shape | fleet.test.ts, fleet-invariants.test.ts, fleet-saga.test.ts, fleet-monitor.test.ts | 4 | `agentIdentityId` undefined vs null |
| `readonly` array assignment | reputation-service.ts | 1 | Readonly array passed to mutable param |
| `instanceof` on non-object | mutation-log-store.ts, audit-trail-store.ts | 2 | Left-hand side type issue |
| Conformance suite indexing | conformance-suite.ts | 2 | Dynamic schema access typing |
| AccessPolicyResult cast | memory-auth.ts | 2 | Cast to Record<string, unknown> |
| Missing properties | reputation.ts | 1 | Reputation profile shape mismatch |
| EconomicEvent shape | stream-enricher.ts | 1 | `incomplete` property not in type |

Fix with minimal, surgical changes — type assertions, spread operators, or explicit
property additions as appropriate. No behavioral changes.

### FR-4: Node Version Alignment

- `ci.yml`: `node-version: 22`
- `e2e.yml`: `node-version: 22` (currently 20)
- `app/package.json`: Add `"engines": { "node": ">=22" }`

### FR-5: Dependabot Update

- Change npm ecosystem target from `/integration` to `/app`
- Remove Docker ecosystem entry for `/integration` (no Dockerfile there)
- Keep GitHub Actions updates

### FR-6: Branch Protection Documentation

Update `BRANCH_PROTECTION.md` required status checks table:

| Old Check Name | New Check Name | Type |
|---------------|---------------|------|
| `Template Protection` | `CI` | Required |
| `Validate Framework Files` | (removed) | N/A |
| (new) | `Staging Smoke Tests (Advisory)` | Advisory |

---

## 5. Non-Functional Requirements

- **No application behavior changes** — only CI/CD, type fixes, and documentation
- **All existing tests must continue passing** — 2373 unit tests, 22 skipped integration tests
- **CI run time < 5 minutes** — unit tests currently complete in ~11s locally
- **Backward compatible** — no breaking changes to development workflow

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Type fixes introduce runtime changes | Low | Medium | Minimal surgical fixes, run full test suite |
| CI cache misses slow first run | Low | Low | npm cache-dependency-path configured |
| Branch protection config drift | Low | Low | Document actual check names, verify after merge |

---

## 7. Dependencies

- None — this is a self-contained CI hygiene cycle
- Unblocks Phase 1 merge sequence (Dixie #50 is already merged, but future PRs need CI)
