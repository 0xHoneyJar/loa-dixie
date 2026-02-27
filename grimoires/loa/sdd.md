# SDD: Phase 0 — CI Pipeline & Pre-Merge Hygiene

**Version**: 15.0.0
**Date**: 2026-02-27
**Author**: Claude (Architecture), Merlin (Direction)
**Cycle**: cycle-015
**Status**: Draft
**PRD Reference**: PRD v15.0.0 — Phase 0 — CI Pipeline & Pre-Merge Hygiene

---

## 1. Architecture Overview

Cycle-015 is a **CI/CD hygiene cycle**. No new services, routes, or capabilities.
The work creates a proper CI pipeline, fixes type errors that prevent `tsc --noEmit`
from succeeding, and aligns infrastructure configuration with reality.

### What Already Exists (code reality)

| Component | File | Status |
|-----------|------|--------|
| E2E workflow (broken) | `.github/workflows/e2e.yml` | Always fails — needs staging infra |
| Dependabot | `.github/dependabot.yml` | Points to wrong directory |
| Branch protection docs | `.github/BRANCH_PROTECTION.md` | Stale check names |
| Unit test suite | `app/` vitest config | 2373 tests, all passing |
| ESLint config | `app/eslint.config.js` | Working |
| TypeScript config | `app/tsconfig.json` | Working (21 errors from type drift) |
| Dockerfile | `deploy/Dockerfile` | Node 22, correct |

### What This Cycle Adds/Modifies

| Component | Type | Effort |
|-----------|------|--------|
| `.github/workflows/ci.yml` | New file | Small |
| `.github/workflows/e2e.yml` | Modify | Trivial |
| `.github/dependabot.yml` | Modify | Trivial |
| `.github/BRANCH_PROTECTION.md` | Modify | Small |
| `app/package.json` engines field | Modify | Trivial |
| 16 source files (type fixes) | Modify | Medium |

---

## 2. CI Workflow Design

### 2.1 Required Workflow: `ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
    paths:
      - 'app/**'
      - 'tests/**'
      - '.github/workflows/ci.yml'
  push:
    branches: [main]
    paths:
      - 'app/**'

jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: app

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: app/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

**Design decisions:**
- Single job (not parallel) — total time ~20s, parallelizing adds overhead without benefit
- `push` trigger on main ensures post-merge validation
- `paths` filter avoids running CI for docs/grimoire changes
- `timeout-minutes: 10` — generous for ~11s local run, accounts for CI overhead

### 2.2 Advisory Workflow: `e2e.yml` Changes

- Add `continue-on-error: true` to the `e2e` job
- Rename job name to `Staging Smoke Tests (Advisory)`
- Update Node version from 20 → 22
- Add explanatory comment at top of file

### 2.3 Branch Protection Alignment

Required check: `CI` (the job name from ci.yml)
Advisory check: `Staging Smoke Tests (Advisory)` (non-blocking)

---

## 3. TypeScript Error Fix Strategy

All fixes follow the **minimal surgical change** principle — fix the type error
without changing runtime behavior.

### 3.1 Hono Handler Return Types (3 errors)

**Files**: `routes/agent.ts:143,551`, `routes/chat.ts:52`
**Problem**: Route handlers return `Promise<unknown>` but Hono expects `HandlerResponse`
**Fix**: Add explicit `Response` return type annotation to handler functions

```typescript
// Before
app.post('/query', async (c) => {
  // ... returns c.json(...)
});

// After
app.post('/query', async (c): Promise<Response> => {
  // ... returns c.json(...)
});
```

### 3.2 jose KeyLike Export (2 errors)

**File**: `middleware/service-jwt.ts:36,38`
**Problem**: `KeyLike` type no longer exported from jose v6 main barrel
**Fix**: Import from jose types path or use `Uint8Array | CryptoKey` union directly

### 3.3 hash_chain_head Property (2 errors)

**Files**: `services/fleet-governor.ts:223`, `services/sovereignty-engine.ts:133`
**Problem**: `hash_chain_head` not in hounfour `MutationLog` type
**Fix**: Remove the property or extend the type locally

### 3.4 FleetTaskRecord agentIdentityId (4 errors)

**Files**: Test files — `fleet.test.ts`, `fleet-invariants.test.ts`, `fleet-saga.test.ts`, `fleet-monitor.test.ts`
**Problem**: Test fixtures have `agentIdentityId` as `undefined` but type expects `string | null`
**Fix**: Add `agentIdentityId: null` to test fixture objects

### 3.5 Readonly Array (1 error)

**File**: `services/reputation-service.ts:287`
**Problem**: Readonly array passed to mutable parameter
**Fix**: Spread to mutable copy: `[...events]`

### 3.6 instanceof on Non-Object (2 errors)

**Files**: `services/mutation-log-store.ts:115`, `services/audit-trail-store.ts:212`
**Problem**: Left-hand side of `instanceof` is not typed as object
**Fix**: Add type guard or explicit type narrowing before `instanceof`

### 3.7 Conformance Suite Indexing (2 errors)

**File**: `services/conformance-suite.ts:116,126`
**Problem**: Dynamic property access on typed object, empty object not assignable to TSchema
**Fix**: Type assertion for dynamic access: `(validators as Record<string, ...>)[key]`

### 3.8 AccessPolicyResult Cast (2 errors)

**File**: `services/memory-auth.ts:244,284`
**Problem**: Direct cast to `Record<string, unknown>` fails overlap check
**Fix**: Cast through unknown: `result as unknown as Record<string, unknown>`

### 3.9 Reputation Profile Shape (1 error)

**File**: `routes/reputation.ts:149`
**Problem**: Missing required properties when constructing reputation response
**Fix**: Map to correct shape with explicit property assignments

### 3.10 EconomicEvent incomplete (1 error)

**File**: `services/stream-enricher.ts:125`
**Problem**: `incomplete` property not in `EconomicEvent` type
**Fix**: Extend type or use type assertion

---

## 4. Dependabot Configuration

### Current (Broken)

```yaml
- package-ecosystem: "npm"
  directory: "/integration"  # doesn't exist
- package-ecosystem: "docker"
  directory: "/integration"  # doesn't exist
```

### Fixed

```yaml
- package-ecosystem: "npm"
  directory: "/app"
- package-ecosystem: "docker"
  directory: "/deploy"
- package-ecosystem: "github-actions"
  directory: "/"
```

---

## 5. Files Modified Summary

| File | Change Type | Lines (~) |
|------|-------------|-----------|
| `.github/workflows/ci.yml` | **New** | ~30 |
| `.github/workflows/e2e.yml` | Modify | ~5 |
| `.github/dependabot.yml` | Modify | ~10 |
| `.github/BRANCH_PROTECTION.md` | Modify | ~15 |
| `app/package.json` | Modify | ~3 |
| `app/src/middleware/service-jwt.ts` | Modify | ~2 |
| `app/src/routes/agent.ts` | Modify | ~4 |
| `app/src/routes/chat.ts` | Modify | ~2 |
| `app/src/routes/reputation.ts` | Modify | ~5 |
| `app/src/routes/__tests__/fleet.test.ts` | Modify | ~2 |
| `app/src/services/audit-trail-store.ts` | Modify | ~3 |
| `app/src/services/conformance-suite.ts` | Modify | ~4 |
| `app/src/services/fleet-governor.ts` | Modify | ~2 |
| `app/src/services/memory-auth.ts` | Modify | ~4 |
| `app/src/services/mutation-log-store.ts` | Modify | ~3 |
| `app/src/services/reputation-service.ts` | Modify | ~2 |
| `app/src/services/sovereignty-engine.ts` | Modify | ~2 |
| `app/src/services/stream-enricher.ts` | Modify | ~2 |
| `app/src/services/__tests__/fleet-invariants.test.ts` | Modify | ~2 |
| `app/src/services/__tests__/fleet-monitor.test.ts` | Modify | ~2 |
| `app/src/services/__tests__/fleet-saga.test.ts` | Modify | ~2 |

**Total**: 1 new file, 20 modified files, ~100 lines changed

---

## 6. Testing Strategy

- **Pre-implementation**: Verify 2373 unit tests pass (`npm run test` from `app/`)
- **Post type-fixes**: Verify `npm run typecheck` exits 0
- **Post type-fixes**: Verify all 2373 unit tests still pass (no behavioral changes)
- **Post CI creation**: Push branch, verify CI workflow triggers and passes
- **E2E advisory**: Verify `continue-on-error` makes e2e non-blocking
