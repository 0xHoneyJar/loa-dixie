# Sprint Plan: Hounfour v8.3.1 Bump — Domain Tag Sanitization Fix & Docker Redeploy

**Version**: 21.0.0
**Date**: 2026-02-28
**Cycle**: cycle-021
**PRD**: v21.0.0
**SDD**: v21.0.0
**Source Issue**: #71

---

## Sprint 1: Dependency Bump & Verification

**Label**: Hounfour v8.3.1 — Bump, Test, Build, Deploy
**Estimated Tasks**: 9

### Task S1-T1: Preflight — Verify Tag Exists
**Priority**: P0 | **FR**: FR-4.2

```bash
git ls-remote https://github.com/0xHoneyJar/loa-hounfour.git refs/tags/v8.3.1
```

Resolve tag to commit SHA for RT-1 (Red Team mitigation).

**Acceptance**:
- [ ] v8.3.1 tag exists and resolves to a valid commit SHA
- [ ] SHA recorded for lockfile verification

### Task S1-T2: Bump Dependency Pin
**Priority**: P0 | **FR**: FR-1 | **Red Team**: RT-1

Update `app/package.json:23`:
```diff
- "@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#v8.3.0",
+ "@0xhoneyjar/loa-hounfour": "github:0xHoneyJar/loa-hounfour#v8.3.1",
```

Run `npm install` to regenerate lockfile. Verify:
1. `@noble/hashes` version unchanged (expect 2.0.1)
2. Lockfile commit SHA matches the tag

**Acceptance**:
- [ ] `package.json` references v8.3.1
- [ ] `package-lock.json` regenerated
- [ ] `@noble/hashes` version is 2.0.1 (or unchanged from v8.3.0)

### Task S1-T3: Add resourceType Validation (Red Team RT-2)
**Priority**: P0 | **FR**: SDD §6.1 | **Red Team**: RT-2

Add input validation in `audit-trail-store.ts` before `buildDomainTag()`:
```typescript
const VALID_RESOURCE_TYPE = /^[a-z][a-z0-9_-]*$/;
```

Validate `resourceType` in `AuditTrailStore.append()` and reject anything containing colons, dots, or special characters.

**Acceptance**:
- [ ] `append()` rejects invalid resourceType with `Error` (not silent failure)
- [ ] Existing resourceTypes (`reputation`, `scoring-path`, `access-policy`, etc.) pass validation
- [ ] Unit test in `tests/unit/audit-trail-store.test.ts` covers:
  - Rejects `"foo:bar"` (colon injection)
  - Rejects `"test.v9.0.0"` (dot injection)
  - Rejects `""` (empty string)
  - Accepts all existing valid resourceTypes
- [ ] Validation error message truncates input to 50 chars (RT-2)

### Task S1-T4: Update buildDomainTag Comment (Decision Rationale)
**Priority**: P1 | **FR**: FR-2 | **Flatline**: BLOCKER

Update the JSDoc comment on `audit-trail-store.ts:50-57` with the full decision rationale:
- Why v10 is used (impedance mismatch workaround from cycle-003)
- Why it's NOT being removed (12 migrations, stored entries, mixed-chain compat)
- That v8.3.1 makes this optional (but not beneficial to migrate)
- Link to issue #71 and ADR-006

**Acceptance**:
- [ ] Comment explains the decision clearly
- [ ] References cycle-021, issue #71, ADR-006
- [ ] Future agent/developer can understand the intentional retention

### Task S1-T5: Create Hounfour v8.3.1 Integration Test
**Priority**: P0 | **FR**: FR-4.1 | **SDD**: §2.3

Create `app/tests/integration/hounfour-v831-compat.test.ts`:

1. Test `buildDomainTag('ScoringPathLog', '8.2.0')` produces sanitized format
2. Test `computeChainBoundHash()` produces valid SHA-256 output
3. Test `computeAuditEntryHash()` is deterministic
4. Test `verifyAuditTrailIntegrity()` handles mixed domain tag formats (Flatline BLOCKER §2.5)
5. Test `@noble/hashes` version matches expected
6. Test resourceType validation rejects malicious inputs (RT-2)

**Acceptance**:
- [ ] All tests pass with real hounfour v8.3.1 (no mocks)
- [ ] Mixed-chain verification test covers both v9 and v10 domain tags
- [ ] `@noble/hashes` version assertion: `=== '2.0.1'` (baseline from v8.3.0)
- [ ] Integration test runs in fresh Node process (not watch mode)
- [ ] `SCORING_PATH_DOMAIN_TAG` resolves to new sanitized format post-bump

### Task S1-T6: Run Full Test Suite
**Priority**: P0 | **FR**: FR-4

```bash
cd app && npm run typecheck && npm run test && npm run build
```

**Acceptance**:
- [ ] After `npm install`, dev server restarted (not hot-reload) before running tests
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run test` — all tests pass (including new integration test)
- [ ] `npm run build` — compiles successfully

### Task S1-T7: Docker Build Verification
**Priority**: P1 | **FR**: FR-5 | **Red Team**: RT-3

```bash
docker build -f deploy/Dockerfile -t dixie-bff:v8.3.1-bump --no-cache .
```

Build with `--no-cache` to prevent stale layer reuse (Red Team ATTACK-7). Tag with immutable reference.

**Acceptance**:
- [ ] Docker build completes successfully
- [ ] Container starts and healthcheck passes on port 3001
- [ ] Image tagged with both `:latest` and immutable tag

### Task S1-T8: Staging Redeploy (GATE-STAGING)
**Priority**: P1 | **FR**: FR-6 | **Gate**: GATE-STAGING

Deploy to Armitage Ring:
1. Push image to ECR with immutable tag
2. Update ECS task definition
3. Force new deployment
4. Verify `/api/health` returns 200

**Acceptance**:
- [ ] `/api/health` returns 200 with healthy status
- [ ] Image digest recorded for rollback reference
- [ ] Previous image digest preserved

**Note**: This task is contingent on infrastructure access. If unavailable, defer to follow-up — GATE-LOCAL (T6) is sufficient for merge.

### Task S1-T9: Close Issue & Commit
**Priority**: P1

- Commit all changes with conventional commit format
- Reference issue #71 in commit message
- Close issue #71

**Acceptance**:
- [ ] Clean commit referencing issue #71
- [ ] Issue #71 closed

---

## Task Dependency Graph

```
T1 (preflight) → T2 (bump) → T5 (integration test)
                      ↓              ↓
                 T3 (validation) → T6 (full test suite) → T7 (docker) → T8 (deploy)
                      ↓                                                      ↓
                 T4 (comments)                                           T9 (close)
```

## Sprint Constraints

- **C-BUMP-001**: No application logic changes beyond dependency bump, validation, and comments
- **C-BUMP-002**: Existing audit trail integrity MUST be preserved
- **C-BUMP-003**: Local `buildDomainTag` in audit-trail-store.ts is kept as-is

## Gate Structure

| Gate | Tasks Required | Blocks |
|------|---------------|--------|
| GATE-LOCAL | T1-T6 (all P0) | Merge to main | Required |
| GATE-STAGING | T7-T8 | Production deploy | Conditional — deferred if infra unavailable |
