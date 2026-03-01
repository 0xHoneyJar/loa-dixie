# PRD: Hounfour v8.3.1 Bump — Domain Tag Sanitization Fix & Docker Redeploy

**Version**: 21.0.0
**Date**: 2026-02-28
**Author**: Merlin (Direction), Claude (Synthesis)
**Cycle**: cycle-021
**Source Issue**: [#71](https://github.com/0xHoneyJar/loa-dixie/issues/71)

> *"Patch the protocol, verify the chain, redeploy the ring."*

---

## 1. Problem Statement

Hounfour v8.3.1 has been released ([PR #42](https://github.com/0xHoneyJar/loa-hounfour/pull/42)) with a fix for the `buildDomainTag()` → `validateDomainTag()` impedance mismatch ([Issue #41](https://github.com/0xHoneyJar/loa-hounfour/issues/41)). Dixie is currently pinned to v8.3.0.

The fix introduces a deterministic sanitization pipeline in `buildDomainTag()`:
- Input grammar validation (`SCHEMA_ID_RE`, `CONTRACT_VERSION_RE`)
- Sanitization: `toLowerCase()` → strip colons → dots/plus to hyphens → strip non-`[a-z0-9_-]`
- Length bounds: `MAX_SEGMENT_LENGTH = 256`
- Error truncation: 50-char echo limit on rejected input
- Backward compatible: `verifyAuditTrailIntegrity()` reads stored `hash_domain_tag`, never re-derives

Dixie independently worked around the impedance mismatch in cycle-003 by using `v10` (no dots) in its local `buildDomainTag()` in `audit-trail-store.ts`. The canonical `buildDomainTag` in `scoring-path-tracker.ts` passes `'8.2.0'` which will now produce hyphens instead of dots — this is the fix working as intended.

> Sources: Issue #71, loa-hounfour PR #42, `app/package.json:23`, `app/src/services/audit-trail-store.ts:55-57`, `app/src/services/scoring-path-tracker.ts:102`

---

## 2. Vision & Mission

### Vision
Keep Dixie's protocol layer current with upstream hounfour, preserving audit trail integrity across the version boundary while removing the need for local workarounds.

### Mission
- Bump the dependency pin from v8.3.0 to v8.3.1
- Evaluate and optionally clean up local `buildDomainTag` workaround
- Verify all audit chain integrity (12 migrations, version-aware hash dispatch)
- Rebuild and verify Docker images
- Redeploy to Armitage Ring staging

---

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| G1: Dependency current | hounfour version in package.json | v8.3.1 |
| G2: Type safety | `npm run typecheck` | 0 errors |
| G3: Test suite green | `npm run test` | All pass |
| G4: Audit chain integrity | Version-aware hash verification across v9/v10 boundary | All chains verify |
| G5: Docker build | `docker build` succeeds | Clean build |
| G6: Staging health | `/api/health` returns healthy after redeploy | 200 OK |

---

## 4. Functional Requirements

### FR-1: Dependency Bump (P0)

Update `app/package.json` line 23:
```
FROM: "@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#v8.3.0"
TO:   "@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#v8.3.1"
```

Run `npm install` to regenerate lockfile. The `postinstall` script (`rebuild-hounfour-dist.sh`) handles the dist rebuild.

**Acceptance**: `package.json` and `package-lock.json` both reference v8.3.1. `npm ci` succeeds.

### FR-2: Evaluate Local buildDomainTag Workaround (P1)

`audit-trail-store.ts:55-57` has a local `buildDomainTag()` that uses `v10` instead of semver to avoid the impedance mismatch. With v8.3.1, the canonical version now handles dots natively.

**Decision**: Keep the local workaround (Option A from issue #71). Rationale:
- Dixie's local tags use `loa-dixie:audit:` prefix, intentionally different from hounfour's `loa-commons:audit:`
- `v10` is already working and stored in 12 migrations worth of audit entries
- Migrating would change domain tags mid-chain, adding complexity for no functional benefit
- `verifyAuditTrailIntegrity()` already handles mixed-format chains via stored tags

**Acceptance**: Local `buildDomainTag` unchanged. Add a comment noting v8.3.1 makes this workaround optional.

### FR-3: Verify Scoring Path Compatibility (P0)

`scoring-path-tracker.ts:102` calls canonical `buildDomainTag('ScoringPathLog', '8.2.0')`. After v8.3.1, output changes:
- Before: potentially unsanitized or failing
- After: `loa-commons:audit:scoringpathlog:8-2-0` (dots → hyphens)

This is an epoch boundary — new entries use the v8.3.1 format, existing entries retain their stored domain tags.

**Acceptance**: Scoring path tests pass. Version-aware hash dispatch handles mixed chains correctly.

### FR-4: Full Test Suite Verification (P0)

Run the complete test suite to catch any behavioral changes:
1. `npm run typecheck` — type compatibility
2. `npm run test` — unit tests (audit trail, scoring path, reputation, governance)
3. `npm run build` — TypeScript compilation

**Acceptance**: All three commands succeed with 0 errors.

### FR-4.1: Hounfour Integration Test (P0) — *Flatline Finding*

Create `app/tests/integration/hounfour-v831-compat.test.ts` that exercises the REAL hounfour module (not mocks):
1. Import real `buildDomainTag` and `computeChainBoundHash` from `@0xhoneyjar/loa-hounfour/commons`
2. Verify `buildDomainTag('ScoringPathLog', '8.2.0')` produces expected sanitized format
3. Verify `computeChainBoundHash` produces valid SHA-256 output
4. Verify version-aware dispatch chooses correct algorithm for legacy (9.0.0) and canonical (v10) domain tags
5. Verify `@noble/hashes` transitive dependency version matches v8.3.0 (no silent drift)

**Acceptance**: Integration test passes with real hounfour v8.3.1 (no mocks).

### FR-4.2: Preflight Tag Verification (P0) — *Flatline Finding*

Before running `npm install`, verify the v8.3.1 tag exists:
```bash
git ls-remote https://github.com/0xHoneyJar/loa-hounfour.git refs/tags/v8.3.1
```

**Acceptance**: Tag is reachable. If not, halt the bump.

### FR-5: Docker Build Verification (P1)

Rebuild Docker image to verify the dependency resolves correctly in containerized environment:
```bash
docker build -f deploy/Dockerfile .
```

**Acceptance**: Docker build completes successfully. Image runs and responds to health check.

### FR-6: Staging Redeploy (P1)

After successful verification, redeploy to Armitage Ring:
- Build new Docker image
- Push to ECR (`arrakis-staging-loa-dixie`)
- Update ECS task definition
- Force new deployment
- Verify health endpoint

**Acceptance**: `/api/health` returns 200 with healthy status on Armitage Ring.

---

### FR-6.1: Completion Gates — *Flatline Finding*

Separate merge-readiness from deploy-readiness:

| Gate | Criteria | Blocks |
|------|----------|--------|
| GATE-LOCAL | Dep bump + typecheck + tests + Docker build pass locally | Merge to main |
| GATE-STAGING | Health endpoint returns 200 with protocol version on Armitage Ring | Production deploy |

FR-6 (staging redeploy) is GATE-STAGING — required before production but NOT blocking merge.

---

## 5. Technical & Non-Functional Requirements

### NFR-1: Backward Compatibility
Existing audit trail entries MUST continue to verify correctly. The version-aware hash dispatch (`computeChainBoundHashVersionAware`) handles this by checking `isLegacyDomainTag()` on each entry.

### NFR-2: No Data Migration
No database migration required. `verifyAuditTrailIntegrity()` reads stored `hash_domain_tag`, never re-derives.

### NFR-3: Epoch Boundary
New audit entries created after the bump will use v8.3.1 semantics. This is handled by the existing version-aware architecture (ADR-006).

---

## 6. Scope & Prioritization

### In Scope (This Cycle)
- Hounfour dependency bump v8.3.0 → v8.3.1
- Test suite verification
- Docker rebuild
- Staging redeploy (if infrastructure access available)
- Comment updates for the local workaround

### Out of Scope
- Issue #68 (Terraform migration to Freeside) — blocked on Freeside import runbook
- Issue #70 (OpenClaw/OpenRouter analysis) — feature work, separate cycle
- Issue #48 (OpenCode Go) — feature work, separate cycle
- Any application code changes beyond the dependency bump and comments

### Priority Order
1. **P0**: FR-1 (Bump), FR-3 (Scoring path), FR-4 (Tests)
2. **P1**: FR-2 (Workaround eval), FR-5 (Docker), FR-6 (Redeploy)

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R1: Scoring path test failures from domain tag format change | Medium | Medium | Version-aware hash dispatch handles epoch boundary; update test expectations if needed |
| R2: Transitive dependency conflict (@noble/hashes) | Low | High | v8.3.1 is a patch release; @noble/hashes should be unchanged |
| R3: ECR/ECS access not available | Medium | Low | Docker build can be verified locally; deploy deferred |
| R4: loa-finn v3.2.0 incompatibility | Low | Medium | Finn uses its own hounfour pin; cross-service protocol is via HTTP, not shared memory |

| Dependency | Status | Impact if Delayed |
|-----------|--------|-------------------|
| Hounfour v8.3.1 release | Complete | None |
| Armitage Ring access | Available | Deploy step deferred |
| Freeside deploy pipeline | Available but not required | Can deploy manually via ECS |

---

## 8. Constraints

- **C-BUMP-001**: No application logic changes beyond the dependency bump and documentation comments.
- **C-BUMP-002**: Existing audit trail integrity MUST be preserved across the version boundary.
- **C-BUMP-003**: The local `buildDomainTag` in `audit-trail-store.ts` is kept as-is (no migration).

---

## 9. Failure Modes & Recovery — *Flatline Finding*

| Failure | Detection | Recovery |
|---------|-----------|----------|
| `npm run typecheck` fails after bump | CI or local typecheck | Revert `package.json` to v8.3.0; file follow-up issue |
| Audit trail verification fails in staging | `/api/health` returns 500; logs show `verifyAuditTrailIntegrity` error | Rollback Docker image to previous tag; preserve logs for post-mortem |
| ScoringPathLog hash mismatch | Unit tests fail or production audit shows integrity error | Check domain tag format; verify `@noble/hashes` version unchanged |
| Docker build fails (tag unreachable) | `npm ci` fails during `docker build` | Verify tag exists with `git ls-remote`; check network |
| Staging deploy fails | ECS task fails to start | Roll back ECS task definition to previous revision |

---

## 10. Known Issues & Technical Debt — *Flatline Finding*

- **KI-001**: Local `buildDomainTag('v10')` workaround retained for backward compatibility.
  - Can be revisited after 3+ months of v10-only entries.
  - Removal requires: (1) query to confirm no legacy domain tags remain, (2) removal of v9 hash algorithm, (3) test cleanup.
- **KI-002**: Mixed audit chains (v9 + v10 domain tags) may accumulate over time.
  - Monitor via: `SELECT DISTINCT domain_tag FROM audit_entries ORDER BY created_at DESC LIMIT 100`
  - If >90% are v10, consider dropping v9 support in next major version.
