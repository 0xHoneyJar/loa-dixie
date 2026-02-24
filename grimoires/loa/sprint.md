# Sprint Plan: v2.0.0 Excellence — Bridgebuilder Findings

**Cycle**: cycle-004 (bridge iteration 1)
**Source**: Bridgebuilder review of v2.0.0 codebase
**Sprints**: 3 (Global IDs: 55-57)
**Strategy**: Error observability → input validation & test coverage → configuration & protocol polish

---

## Sprint 1 (Global #55): Error Observability & Fire-and-Forget Safety

**Goal**: Eliminate silent failures in fire-and-forget operations. Add error categorization to conviction resolver. Fix error handling pattern consistency.

### Tasks

**Task 1.1: Add error logging to fire-and-forget operations**
- `app/src/routes/chat.ts` — `emitChatSignal()`: wrap in try/catch with structured warning log
- `app/src/services/stream-enricher.ts` — NATS publish: add `console.warn` with signal type and error
- `app/src/services/autonomous-engine.ts` — finn write failures: add structured error log
- Pattern: `console.warn('[signal-loss]', { event, error: String(err) })` for all fire-and-forget paths
- **AC**: Every fire-and-forget operation logs on failure. `grep -r 'signal-loss' app/src/` returns all 3+ locations.

**Task 1.2: Error categorization in conviction resolver**
- `app/src/services/conviction-resolver.ts:resolveFromFreeside()` — inspect HTTP status before fallback
- 404 → return null (correct, wallet not found)
- 401/403 → log error, return null (auth failure)
- 5xx → log warning, return null (transient)
- Add structured log: `console.warn('[conviction-resolver]', { wallet: wallet.slice(0,10), status, error })`
- **AC**: Different HTTP errors produce different log messages. Test verifies 404 vs 503 behavior.

**Task 1.3: Extract shared error handler for route catch blocks**
- Create `app/src/utils/error-handler.ts` with `handleRouteError(c, err)` function
- Uses `BffError` type guard when `err instanceof BffError`
- Falls back to generic 500 for unknown errors
- Replace duplicate catch pattern in `chat.ts:130-139` and `agent.ts:257-262`
- Fix `as 400` cast to proper status code handling
- **AC**: `chat.ts` and `agent.ts` both use `handleRouteError()`. No more `as 400` casts.

**Task 1.4: Stream enricher — emit economic event on incomplete sequences**
- `app/src/services/stream-enricher.ts` — when `usageData` is missing but stream completed, emit economic event with `cost_micro_usd: 0` and `incomplete: true` flag
- Log warning: `[stream-enricher] incomplete economic event — usage data missing`
- **AC**: Test verifies economic event emitted even when usage is absent.

**Task 1.5: Error observability test suite**
- Create `app/tests/unit/error-observability.test.ts`
- Test: fire-and-forget error logging (mock console.warn)
- Test: conviction resolver error categorization (404 vs 503)
- Test: shared error handler (BffError, generic Error, plain object)
- Test: stream enricher incomplete sequence handling
- **AC**: All tests pass. Zero silent failures remain in codebase.

---

## Sprint 2 (Global #56): Input Validation & Test Coverage Gaps

**Goal**: Add missing input validation on agent routes. Fill test coverage gaps for critical services. Fix rate limit cleanup.

### Tasks

**Task 2.1: Agent route input validation**
- `app/src/routes/agent.ts` — add validation for:
  - `query`: max 10,000 chars (match chat.ts)
  - `maxTokens`: range 1-4096
  - `sessionId`: validate format with `isValidPathParam()` (same as chat.ts)
  - `knowledgeDomain`: validate against allowed set or max 100 chars
- Use same pattern as chat.ts validation
- **AC**: Invalid inputs return 400. Test exercises each validation rule.

**Task 2.2: Rate limit cleanup optimization**
- `app/src/routes/agent.ts` rate limiter — replace request-driven cleanup with `setInterval`
- Extract cleanup into named function called by interval
- Add cleanup duration metric: `console.debug('[rate-limit] cleanup', { evicted, durationMs })`
- **AC**: Cleanup runs on interval, not request path. Test verifies stale entries evicted.

**Task 2.3: Test coverage for protocol-evolution.test.ts improvements**
- `app/tests/unit/protocol-evolution.test.ts` already has 30 tests for diff engine and migration proposals
- Add edge case tests: empty manifest, manifest with only breaking changes, manifest with mixed priorities
- Add test: `generateMigrationProposal` sorts required items first
- **AC**: protocol-evolution tests cover all edge cases. >=35 tests.

**Task 2.4: Wallet normalization consistency**
- Create `app/src/utils/normalize-wallet.ts` with `normalizeWallet(address: string): string`
- Uses `checksumAddress()` from hounfour (already imported in other files)
- Replace `wallet.toLowerCase()` in `conviction-resolver.ts:42` with `normalizeWallet()`
- Audit all wallet comparison patterns and normalize consistently
- **AC**: `grep -r 'toLowerCase.*wallet\|wallet.*toLowerCase' app/src/` returns 0 matches. All wallet comparisons use `normalizeWallet()` or `checksumAddress()`.

**Task 2.5: Input validation and coverage test suite**
- Create `app/tests/unit/input-validation.test.ts`
- Test: agent route rejects oversized query (>10000 chars)
- Test: agent route rejects invalid maxTokens
- Test: agent route validates sessionId format
- Test: wallet normalization consistency across mixed-case inputs
- Test: rate limit cleanup evicts stale entries
- **AC**: All validation tests pass.

---

## Sprint 3 (Global #57): Configuration Consolidation & Protocol Polish

**Goal**: Consolidate scattered TTL configuration. Add missing JSDoc on security functions. Fix CircuitState health reporting.

### Tasks

**Task 3.1: Consolidate cache TTL configuration**
- `app/src/config.ts` — add `autonomousPermissionTtlSec` (default: same as conviction, but separate key)
- Add `DIXIE_AUTONOMOUS_PERMISSION_TTL` env var
- Update `server.ts` to use new config key instead of reusing `convictionTierTtlSec`
- Document each TTL in JSDoc with freshness rationale
- **AC**: Each cache has its own documented TTL config. No TTL reuse without explicit comment.

**Task 3.2: Security function JSDoc**
- `app/src/middleware/jwt.ts` — add JSDoc explaining HS256 limitations and when ES256 migration required
- `app/src/middleware/allowlist.ts:hasWallet()` — add JSDoc explaining EIP-55 normalization
- `app/src/middleware/tba-auth.ts` — add JSDoc warning: "SECURITY: Do NOT cache verification result" with rationale
- **AC**: All security-critical functions have JSDoc with @security tags.

**Task 3.3: CircuitState protocol mapping in health responses**
- Audit health endpoint to ensure circuit state reported in protocol form
- If health response includes circuit state, apply `toProtocolCircuitState()` before serialization
- Add test: health response circuit state uses snake_case (`half_open` not `half-open`)
- **AC**: Health endpoint returns protocol-compatible circuit state.

**Task 3.4: Enrichment service tier distribution accuracy**
- `app/src/services/enrichment-service.ts` — replace hardcoded approximation with actual scan
- Scan reputation store for all aggregates, map reputation_state to tier
- Cache result for 5 minutes (in-memory, not Redis)
- Fall back to hardcoded estimate if store is empty
- **AC**: Tier distribution reflects actual data when aggregates exist. Test verifies accuracy.

**Task 3.5: Configuration and polish test suite**
- Add tests for: autonomous TTL configuration, circuit state mapping in health, tier distribution accuracy
- **AC**: All polish tests pass.

---

## Sprint Dependency Graph

```
Sprint 1 (Error Observability)
    │
    └──▶ Sprint 2 (Validation + Coverage)
             │
             └──▶ Sprint 3 (Config + Polish)
```

Sequential — each builds on previous foundation.

---

## Findings Addressed by Sprint

| Finding | Severity | Sprint | Task |
|---------|----------|--------|------|
| Silent fire-and-forget failures | HIGH | 1 | 1.1 |
| Conviction resolver error blindness | HIGH | 1 | 1.2 |
| Inconsistent route error handling | LOW | 1 | 1.3 |
| Missing economic event on incomplete stream | MEDIUM | 1 | 1.4 |
| Agent route missing input validation | HIGH | 2 | 2.1 |
| Rate limit cleanup blocking request path | MEDIUM | 2 | 2.2 |
| Test coverage gaps | HIGH | 2 | 2.3 |
| Wallet normalization inconsistency | MEDIUM | 2 | 2.4 |
| TTL configuration scattered/reused | MEDIUM | 3 | 3.1 |
| Missing security JSDoc | MEDIUM | 3 | 3.2 |
| CircuitState not mapped in health | LOW | 3 | 3.3 |
| Enrichment tier distribution hardcoded | MEDIUM | 3 | 3.4 |
