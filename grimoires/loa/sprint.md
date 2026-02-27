# Sprint Plan: Phase 0 — CI Pipeline & Pre-Merge Hygiene

**Version**: 15.0.0
**Date**: 2026-02-27
**Cycle**: cycle-015
**PRD**: v15.0.0
**SDD**: v15.0.0

---

## Sprint 1: CI Workflows & Type Safety

**Global ID**: 108
**Goal**: Create required CI workflow, fix all TypeScript errors, make staging tests advisory
**Acceptance Criteria**:
- `npm run typecheck` exits 0 from `app/`
- `npm run lint` exits 0
- `npm run test` passes all 2373 tests
- `npm run build` succeeds
- `.github/workflows/ci.yml` exists and is valid YAML
- `.github/workflows/e2e.yml` has `continue-on-error: true`
- Node version is 22 in both workflows

### Tasks

| ID | Task | File(s) | Effort |
|----|------|---------|--------|
| T1 | Create `ci.yml` required workflow | `.github/workflows/ci.yml` | S |
| T2 | Update `e2e.yml` — advisory + Node 22 | `.github/workflows/e2e.yml` | S |
| T3 | Fix Hono handler return types | `routes/agent.ts`, `routes/chat.ts` | S |
| T4 | Fix jose KeyLike import | `middleware/service-jwt.ts` | S |
| T5 | Fix hash_chain_head property | `fleet-governor.ts`, `sovereignty-engine.ts` | S |
| T6 | Fix FleetTaskRecord test fixtures | 4 test files | S |
| T7 | Fix readonly array assignment | `reputation-service.ts` | S |
| T8 | Fix instanceof type errors | `mutation-log-store.ts`, `audit-trail-store.ts` | S |
| T9 | Fix conformance suite indexing | `conformance-suite.ts` | S |
| T10 | Fix AccessPolicyResult cast | `memory-auth.ts` | S |
| T11 | Fix reputation profile shape | `routes/reputation.ts` | S |
| T12 | Fix EconomicEvent incomplete property | `stream-enricher.ts` | S |
| T13 | Add `engines` to package.json | `app/package.json` | S |

## Sprint 2: Config & Documentation Hygiene

**Global ID**: 109
**Goal**: Align dependabot, branch protection docs, and verify CI end-to-end
**Acceptance Criteria**:
- `dependabot.yml` targets `app/` and `deploy/` directories
- `BRANCH_PROTECTION.md` documents actual CI check names
- PR pushed with CI workflow passing

### Tasks

| ID | Task | File(s) | Effort |
|----|------|---------|--------|
| T14 | Fix dependabot directory targets | `.github/dependabot.yml` | S |
| T15 | Update branch protection documentation | `.github/BRANCH_PROTECTION.md` | S |
| T16 | Create branch, push, verify CI passes | git operations | S |

---

## Dependency Graph

```
T1 ──┐
T2 ──┤
T3 ──┤
T4 ──┤
T5 ──┤
T6 ──┤
T7 ──┼──→ Sprint 1 Complete ──→ T14 ──┐
T8 ──┤                          T15 ──┼──→ Sprint 2 Complete ──→ PR
T9 ──┤                          T16 ──┘
T10 ─┤
T11 ─┤
T12 ─┤
T13 ─┘
```

Sprint 1 tasks are all independent (parallel). Sprint 2 depends on Sprint 1 completion.

---

## Estimates

- **Sprint 1**: 16 tasks, all small — single implement cycle
- **Sprint 2**: 3 tasks — single implement cycle
- **Total**: 2 sprints, 1 bridge review cycle
