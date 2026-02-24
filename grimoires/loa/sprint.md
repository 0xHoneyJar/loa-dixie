# Sprint Plan: v2.0.0 Excellence — Bridge Iteration 2 (Bridgebuilder Findings Resolution)

**Cycle**: cycle-004 (bridge iteration 2)
**Source**: Bridgebuilder review of PR #8 — all findings (2 HIGH, 4 MEDIUM, 2 LOW)
**Sprints**: 2 (Global IDs: 58-59)
**Strategy**: Correctness & security hardening → documentation & polish
**Predecessor**: Bridge iteration 1 (sprints 55-57, 1076 tests passing)

---

## Sprint 1 (Global #58): Correctness & Security Hardening

**Goal**: Resolve both HIGH findings and the functional MEDIUM findings. Add observability to wallet normalization fallback, tighten the legacy error handler, guard enrichment service scans, and extract validation constants.

### Tasks

**Task 1.1: Add observability to normalizeWallet fallback path**
- `app/src/utils/normalize-wallet.ts` — when the catch fires on what looks like a valid Ethereum address (starts with `0x`, length 42), emit `console.warn('[wallet-normalization] checksum-fallback', { prefix: address.slice(0, 10) })`
- Non-Ethereum-shaped addresses (test wallets, short addresses) stay silent — these are expected
- Bridgebuilder finding #2 (HIGH): cache key bifurcation risk from silent fallback
- **AC**: `normalizeWallet('0x' + 'a'.repeat(40))` emits a warning. `normalizeWallet('0xshort')` does not. Test verifies both paths.

**Task 1.2: Tighten legacy error handler with deprecation warning**
- `app/src/utils/error-handler.ts` — add `console.warn('[error-handler] legacy error pattern', { status })` to the legacy branch (lines 20-26)
- This makes the legacy path observable so we can measure usage and sunset it
- Bridgebuilder finding #1 (HIGH): escape hatch accepts any object with status+body
- **AC**: Legacy branch emits a warning on every invocation. Test verifies warning emitted. BffError path does NOT emit warning.

**Task 1.3: Add cardinality guard to enrichment service listAll()**
- `app/src/services/enrichment-service.ts` — add `MAX_SCAN_SIZE = 10_000` constant
- Before iterating aggregates, check `aggregates.length > MAX_SCAN_SIZE` → log `[enrichment] tier-distribution scan exceeds cardinality limit` and fall back to percentage estimation
- Bridgebuilder finding #3 (MEDIUM): unbounded scan O(n) memory risk
- **AC**: When store has >10k entries, falls back to estimation with warning. Test verifies guard triggers.

**Task 1.4: Extract agent route validation constants**
- Create validation constants object in `app/src/routes/agent.ts` (or extract to `app/src/validation.ts` if it already has similar constants):
  ```
  AGENT_QUERY_MAX_LENGTH = 10_000
  AGENT_MAX_TOKENS_MIN = 1
  AGENT_MAX_TOKENS_MAX = 4_096
  AGENT_KNOWLEDGE_DOMAIN_MAX_LENGTH = 100
  ```
- Replace magic numbers at agent.ts:170-181 with named constants
- Bridgebuilder finding #4 (MEDIUM): magic numbers in route handlers
- **AC**: No magic number literals in agent route validation. Constants are exported and used by tests.

**Task 1.5: Hardening test suite**
- Add tests to appropriate test files (or create `app/tests/unit/bridge-iter2-hardening.test.ts`):
  - Test: normalizeWallet emits warning for valid-looking Ethereum addresses on fallback
  - Test: normalizeWallet stays silent for short/test addresses
  - Test: handleRouteError legacy branch emits deprecation warning
  - Test: handleRouteError BffError path does not emit warning
  - Test: enrichment service cardinality guard triggers at threshold
  - Test: agent route uses named validation constants (verify 400 at boundary values)
- **AC**: All tests pass. Minimum 8 new tests.

---

## Sprint 2 (Global #59): Documentation & Polish

**Goal**: Resolve all remaining MEDIUM and LOW findings. Align documentation with implementation, document design decisions, and add intent comments for forward-looking code.

### Tasks

**Task 2.1: Align autonomousPermissionTtlSec JSDoc with default**
- `app/src/config.ts:32-35` — soften JSDoc wording from implying TTLs *should* differ to saying they *can* differ independently
- Updated JSDoc: "Separate config key allows independent tuning if permission revocation propagation needs to be faster than tier change propagation. Defaults match conviction TTL (300s) as a reasonable launch baseline."
- Bridgebuilder finding #5 (MEDIUM): documentation-reality gap
- **AC**: JSDoc accurately describes current behavior and future flexibility. No expectation mismatch.

**Task 2.2: Document fromProtocolCircuitState intended consumer**
- `app/src/types.ts` — add JSDoc to `fromProtocolCircuitState()` explaining its intended consumers: protocol conformance tests, future webhook consumers that receive snake_case state from upstream
- Bridgebuilder finding #6 (MEDIUM): unused code is a maintenance liability without documented intent
- **AC**: Function has JSDoc explaining why it exists and who will use it.

**Task 2.3: Document cleanupInterval.unref() and lazy expiration design**
- `app/src/routes/agent.ts:94-96` — add a comment block above the interval explaining:
  1. Why interval-based (moved off request path in Sprint 56)
  2. Why `.unref()` (graceful shutdown)
  3. Why 60s lag is acceptable ("lazy expiration" — conservative for security boundary)
- Bridgebuilder finding #7 (LOW): correct but undocumented
- **AC**: Design decision documented inline. Comment references Bridgebuilder review rationale.

**Task 2.4: Add domain-organization roadmap comments to test files**
- `app/tests/unit/error-observability.test.ts`, `input-validation.test.ts`, `config-polish.test.ts` — add a header comment noting these are sprint-organized and may be consolidated into domain-organized files (e.g., `wallet.test.ts`, `error-handling.test.ts`) when the sprint structure stabilizes
- Bridgebuilder finding #8 (LOW): test file proliferation awareness
- **AC**: Each sprint-organized test file has a header comment noting future consolidation path. No structural changes — just awareness markers.

---

## Sprint Dependency Graph

```
Sprint 1 (Correctness & Security Hardening)
    │
    └──▶ Sprint 2 (Documentation & Polish)
```

Sequential — sprint 2's documentation references sprint 1's new code.

---

## Findings Resolution Map

| # | Finding | Severity | Sprint | Task |
|---|---------|----------|--------|------|
| 1 | Legacy error handler escape hatch | 🔴 HIGH | 1 | 1.2 |
| 2 | normalizeWallet cache key bifurcation | 🔴 HIGH | 1 | 1.1 |
| 3 | listAll() unbounded scan | 🟡 MEDIUM | 1 | 1.3 |
| 4 | Agent route magic numbers | 🟡 MEDIUM | 1 | 1.4 |
| 5 | autonomousPermissionTtlSec JSDoc drift | 🟡 MEDIUM | 2 | 2.1 |
| 6 | fromProtocolCircuitState unused | 🟡 MEDIUM | 2 | 2.2 |
| 7 | cleanupInterval.unref() undocumented | 🟢 LOW | 2 | 2.3 |
| 8 | Sprint-organized test proliferation | 🟢 LOW | 2 | 2.4 |

**Coverage**: 8/8 findings addressed. 4 PRAISE findings require no action.
