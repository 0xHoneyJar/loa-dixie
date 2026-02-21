# Sprint Plan: Dixie Phase 2 — Pre-Launch Polish (Bridge Iter 2 LOWs)

**Version**: 2.2.0
**Date**: 2026-02-21
**Cycle**: cycle-002 (Bridge Iteration 2 — LOW findings + cross-repo)
**Source**: Bridgebuilder review iter-2 (8 LOW findings, all HIGH/MEDIUM resolved)
**Sprints**: 1 (Sprint 13 / Global 32)

---

## Sprint 13: Pre-Launch Polish — Bridge LOW Findings + Cross-Repo Surfaces

**Global ID**: 32
**Scope**: MEDIUM (9 tasks)
**Focus**: Address all 8 remaining LOW findings + file 3 cross-repo issues

### Task 13.1: Schedule history ownership check (iter2-low-7 — SECURITY)

**File**: `app/src/routes/schedule.ts:151`
**Fix**: After wallet check, call `scheduleStore.getSchedule(scheduleId)` → return 404 if null → get `schedule.nftId` → call `resolveNftOwnership(wallet)` → return 403 if mismatch

**Acceptance Criteria**:
- [x] 403 returned when wallet does not own NFT
- [x] 403 returned when resolveNftOwnership returns null
- [x] 200 returned when wallet owns the NFT
- [x] 404 returned when schedule does not exist

### Task 13.2: Agent knowledge tier check (iter2-low-8 — SECURITY)

**File**: `app/src/routes/agent.ts:266`
**Fix**: After TBA check, add `x-agent-owner` + `convictionResolver.resolve()` + `tierMeetsRequirement('architect')` block

**Acceptance Criteria**:
- [x] 401 returned when x-agent-owner missing
- [x] 403 returned when tier insufficient
- [x] Existing knowledge tests updated with x-agent-owner header

### Task 13.3: Enforce agent RPD (iter2-low-1 — CORRECTNESS)

**File**: `app/src/routes/agent.ts:63`
**Fix**: Add `agentDailyCounts` Map with date-string key auto-rollover. Check daily count against `limits.agentRpd` after RPM passes.

**Acceptance Criteria**:
- [x] 429 returned when RPD exceeded
- [x] Separate agents tracked independently
- [x] Date rollover resets daily count

### Task 13.4: Bound human rate limiter (iter2-low-2 — RELIABILITY)

**File**: `app/src/middleware/rate-limit.ts:32`
**Fix**: Add `MAX_TRACKED` + `lastAccess` to `RateLimitEntry`. LRU eviction in cleanup interval.

**Acceptance Criteria**:
- [x] Store bounded at MAX_TRACKED entries
- [x] LRU preserves recent entries
- [x] Existing rate limit behavior unchanged

### Task 13.5: Bound insights & lastEvolution maps (iter2-low-6 — RELIABILITY)

**File**: `app/src/services/compound-learning.ts:85-86`
**Fix**: In `evictLruNft()`, also delete from `insights` and `lastEvolution`. Cap insights map at maxNfts.

**Acceptance Criteria**:
- [x] Insights capped at maxNfts entries
- [x] lastEvolution cleaned on eviction
- [x] Most recent NFT preserved

### Task 13.6: Log audit eviction (iter2-low-5 — OBSERVABILITY)

**File**: `app/src/services/autonomous-engine.ts:313`
**Fix**: Add optional `log` callback to constructor opts. Before `splice`, call log with eviction counts.

**Acceptance Criteria**:
- [x] Log called on eviction with correct counts
- [x] Log not called below threshold
- [x] Eviction still works without log callback

### Task 13.7: Warn on empty callback secret (iter2-low-3 — DX)

**File**: `app/src/routes/schedule.ts:57`
**Fix**: `console.warn` on startup if `!callbackSecret`

**Acceptance Criteria**:
- [x] console.warn called when callbackSecret is empty
- [x] No warning when callbackSecret is set

### Task 13.8: Document single-NFT limitation (iter2-low-4 — DESIGN)

**File**: `app/src/server.ts:320, 358, 372`
**Fix**: Block comment at all 3 `resolveNftOwnership` definitions documenting the limitation

**Acceptance Criteria**:
- [x] Comments added at all 3 callsites

### Task 13.9: File cross-repo issues

**Cross-repo surfaces**:
- [x] loa-finn: "Dixie Phase 2: API Contract Surfaces" — https://github.com/0xHoneyJar/loa-finn/issues/93
- [x] loa-hounfour: "Dixie Phase 2: AccessPolicy Enforcement Gap + CircuitState Naming" — https://github.com/0xHoneyJar/loa-hounfour/issues/21
- [x] loa-freeside: "Dixie Phase 2: x402 Integration Readiness" — https://github.com/0xHoneyJar/loa-freeside/issues/87

---

## Verification

- [x] 492 tests passing (473 existing + 19 new)
- [x] Cross-repo issues filed
- [x] Only 11 files touched (6 source + 5 test)
