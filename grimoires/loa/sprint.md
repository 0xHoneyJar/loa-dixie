# Sprint Plan: Dixie Phase 2 — Bridge Iteration 1 Fix Sprints

**Version**: 2.1.0
**Date**: 2026-02-21
**Cycle**: cycle-002 (Bridge Iteration 1)
**Source**: Bridgebuilder review iter-1 (2 HIGH, 9 MEDIUM findings)
**Sprints**: 2 (Security Hardening + Reliability & Authorization)

---

## Sprint 1: Security Hardening (Bridge Iter 1)

**Global ID**: 30
**Scope**: MEDIUM (5 tasks)
**Focus**: Address 2 HIGH + 3 MEDIUM security findings

### Task 1.1: Fix TBA auth cache bypass (HIGH-1)

**Finding**: high-1 — TBA cache uses address as sole key; cached verification bypasses signature check
**File**: `app/src/middleware/tba-auth.ts`

**Changes**:
- Separate identity resolution (cacheable) from request authentication (per-request)
- Cache stores TBA→owner mapping only (not auth result)
- Signature verification happens every request; cache only speeds up the ownership lookup
- Cache key remains `tbaAddress` but cached value is ownership info, not auth pass/fail

**Acceptance Criteria**:
- [ ] Every request validates signature against the timestamp-based message
- [ ] Cache hit only provides ownership data, never bypasses signature check
- [ ] Test: cached TBA still rejects invalid signature
- [ ] Test: cached TBA still rejects expired timestamp

### Task 1.2: Add HMAC authentication to schedule callback (HIGH-2)

**Finding**: high-2 — POST /api/schedule/callback has zero authentication
**File**: `app/src/routes/schedule.ts`, `app/src/services/schedule-store.ts`

**Changes**:
- Add `callbackSecret` parameter to ScheduleStore constructor
- Callback endpoint validates `x-callback-signature` header (HMAC-SHA256)
- Signature computed over `scheduleId:timestamp` using shared secret
- Reject requests with missing or invalid signature

**Acceptance Criteria**:
- [ ] Callback rejects requests without x-callback-signature header (401)
- [ ] Callback rejects requests with invalid signature (401)
- [ ] Callback accepts requests with valid HMAC signature
- [ ] Test: signature verification with known test vectors

### Task 1.3: Add ownership verification to autonomous read endpoints (MEDIUM-4, MEDIUM-5)

**Finding**: medium-4, medium-5 — GET permissions/audit/summary expose data to any wallet
**File**: `app/src/routes/autonomous.ts`

**Changes**:
- GET /:nftId/permissions — fetch permissions, verify requesting wallet is owner or delegate
- GET /:nftId/audit — same ownership check
- GET /:nftId/summary — same ownership check
- Extract ownership check into reusable helper function

**Acceptance Criteria**:
- [ ] Non-owner/non-delegate wallet receives 403 on all three endpoints
- [ ] Owner wallet can access all three endpoints
- [ ] Delegated wallet can access all three endpoints
- [ ] Test: ownership verification for each endpoint

### Task 1.4: Make x-agent-owner required in agent routes (MEDIUM-6)

**Finding**: medium-6 — Tier check silently passes when x-agent-owner is absent
**File**: `app/src/routes/agent.ts`

**Changes**:
- In every agent route handler that checks tier, return 401 if `x-agent-owner` is missing
- Remove the `if (ownerWallet)` conditional that allows bypass
- Apply to: POST /query, GET /capabilities, POST /schedule

**Acceptance Criteria**:
- [ ] Request without x-agent-owner header returns 401 (not silent pass)
- [ ] Request with x-agent-owner but insufficient tier returns 403
- [ ] Test: missing owner header rejected at each endpoint

### Task 1.5: Add ownership verification to learning and schedule list routes (MEDIUM-9)

**Finding**: medium-9 — Learning and schedule list routes return data for any NFT
**Files**: `app/src/routes/learning.ts`, `app/src/routes/schedule.ts`

**Changes**:
- Learning routes: resolve wallet → NFT ownership before returning insights/gaps
- Schedule list route: verify wallet owns the NFT before listing schedules
- Schedule history route: verify wallet owns the parent schedule's NFT
- Use the same ownership resolution pattern as memory routes (finnClient identity lookup)

**Acceptance Criteria**:
- [ ] Learning insights returns 403 for non-owner wallet
- [ ] Learning gaps returns 403 for non-owner wallet
- [ ] Schedule list returns 403 for non-owner wallet
- [ ] Test: ownership check on each route

---

## Sprint 2: Reliability & Correctness (Bridge Iter 1)

**Global ID**: 31
**Scope**: MEDIUM (5 tasks)
**Focus**: Address 4 MEDIUM reliability/correctness findings

### Task 2.1: Add eviction to agent rate limiter Map (MEDIUM-1)

**Finding**: medium-1 — agentRequestCounts Map grows without bound
**File**: `app/src/routes/agent.ts`

**Changes**:
- Add periodic cleanup: every 60 seconds, sweep entries with empty timestamp arrays
- Add max entries cap (1000 agents); evict LRU on overflow
- Extract rate limiter into a standalone utility for testability

**Acceptance Criteria**:
- [ ] Entries with no recent timestamps are cleaned up
- [ ] Map size is bounded at 1000 entries
- [ ] Rate limiting still works correctly after cleanup
- [ ] Test: cleanup removes stale entries

### Task 2.2: Add bounds to CompoundLearningEngine Maps (MEDIUM-2)

**Finding**: medium-2 — Three Maps grow with unique NFT IDs
**File**: `app/src/services/compound-learning.ts`

**Changes**:
- Add `maxNfts` config option (default 10,000)
- When maxNfts exceeded, evict NFT with oldest last-activity
- Add TTL-based flush for signalBuffer: flush signals after 1 hour of inactivity
- Add periodic sweep method (called externally or via setInterval)

**Acceptance Criteria**:
- [ ] Map sizes bounded at maxNfts
- [ ] Inactive signal buffers flushed after TTL
- [ ] Existing batch processing unchanged
- [ ] Test: eviction on overflow, TTL flush

### Task 2.3: Add execution log bounds to ScheduleStore (MEDIUM-3)

**Finding**: medium-3 — executions array grows without bound
**File**: `app/src/services/schedule-store.ts`

**Changes**:
- Add maxExecutions cap (10,000) with oldest-first eviction
- Mirror the eviction pattern from AutonomousEngine.auditLog (evict half when full)

**Acceptance Criteria**:
- [ ] Executions array bounded at maxExecutions
- [ ] Oldest entries evicted first
- [ ] getExecutions() still works correctly after eviction
- [ ] Test: eviction triggers at threshold

### Task 2.4: Fix agent query pre-flight budget check (MEDIUM-8)

**Finding**: medium-8 — Budget checked after inference cost incurred
**File**: `app/src/routes/agent.ts`

**Changes**:
- Add pre-flight budget estimate before calling finn (using capabilities pricing data)
- If estimated cost exceeds maxCostMicroUsd, return 402 BEFORE making the request
- After response, include actual cost in response and set warning header if actual > estimate

**Acceptance Criteria**:
- [ ] Budget check happens BEFORE finn request
- [ ] Request rejected with 402 if estimated cost exceeds max
- [ ] Warning header set if actual cost > estimated cost
- [ ] Test: pre-flight rejection, post-flight warning

### Task 2.5: Track actual cost in autonomous budget (MEDIUM-7)

**Finding**: medium-7 — Budget uses estimated cost only
**File**: `app/src/services/autonomous-engine.ts`

**Changes**:
- Add `recordActualCost(nftId, auditEntryId, actualCostMicroUsd)` method
- getDailySpend() uses actual cost when available, estimated as fallback
- Update audit entry type to include optional `actualCostMicroUsd` field

**Acceptance Criteria**:
- [ ] Actual cost stored alongside estimated cost in audit entries
- [ ] getDailySpend() prefers actual cost over estimated
- [ ] Backward compatible with entries that only have estimated cost
- [ ] Test: budget calculation with mixed actual/estimated entries

---

## Test Requirements

All changes must maintain the existing 471+ passing test count. New tests required for each task.
Expected new tests: ~25-30 across both sprints.
