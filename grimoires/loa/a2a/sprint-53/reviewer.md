# Sprint 11 (Global 53) — Enrichment Endpoint & Self-Improving Loop Activation

## Review Summary

Sprint 11 activates the autopoietic feedback loop: review outcomes now feed back into agent reputation, and enrichment context assembly provides live governance state to review prompts. This closes the self-improving quality cycle described in SDD section 2.3.

## Tasks Completed

### Task 11.1: EnrichmentService — Governance Context Assembly
- **File**: `app/src/services/enrichment-service.ts`
- Assembles four context dimensions: conviction distribution, conformance metrics, reputation trajectories, knowledge governance state
- All data sourced from in-memory caches (no database calls in hot path)
- Constructor accepts ReputationService with optional ConformanceMetricsSource and KnowledgeMetricsSource interfaces
- Trajectory detection via event history analysis (first-half vs second-half scoring comparison)
- Default no-op metrics sources for graceful degradation when conformance/knowledge data unavailable

### Task 11.2: POST /api/enrich/review-context Endpoint
- **File**: `app/src/routes/enrich.ts`
- Request body: `{ nft_id, review_type: 'bridge' | 'flatline' | 'audit', scope? }`
- Response: full enrichment context with conviction, conformance, reputation, and knowledge dimensions
- 50ms latency budget enforced via `Promise.race` — returns partial context on timeout
- Conviction-based access control: builder+ tier required (uses `tierMeetsRequirement`)
- Structured 403 denial via `buildConvictionDenialResponse` for sub-builder tiers
- Registered in server.ts at `/api/enrich`

### Task 11.3: EnrichmentClient — 100ms Timeout Membrane
- **File**: `app/src/services/enrichment-client.ts`
- Client-side timeout: 100ms default, configurable via `DIXIE_ENRICHMENT_TIMEOUT_MS` env var
- Returns `{ available: false, reason: 'timeout' | 'unavailable' | 'error' | 'access_denied' }` on degradation
- AbortController-based timeout for proper resource cleanup
- Custom fetch injection for testing
- Allopoietic fallback: system continues without enrichment when Dixie is unhealthy

### Task 11.4: Quality Event Feedback Loop Wiring
- **File**: `app/src/services/quality-feedback.ts`
- `QualityEvent` type: `{ source, finding_count, severity_distribution, nft_id, timestamp }`
- `computeQualityScore()`: severity-weighted soft sigmoid — graduated impact, never permanent (Ostrom)
- `emitQualityEvent()`: converts quality events to reputation events via `ReputationService.appendEvent()`
- `createQualityEvent()`: convenience factory with auto-timestamping
- One-directional guard: emission happens only at review completion, never during enrichment assembly

### Task 11.5: Self-Hosting Verification Tests
- **File**: `app/tests/unit/enrichment-service.test.ts`
- 33 tests covering all tasks
- Full autopoietic loop test: enrich -> review -> quality event -> reputation update -> enrich (no recursion)
- Multi-cycle stress test: 10 cycles without recursion or memory leak
- One-directional guard verification: enrichment assembly never emits events
- Degradation membrane: timeout returns within bound
- Latency budget: slow assembly returns partial context
- Access control: observer/participant rejected, builder/architect/sovereign allowed

## Architecture Decisions

1. **One-Directional Feedback Guard**: Enrichment reads reputation but never writes. Quality event emission happens only at review completion. This architectural constraint prevents infinite recursion in the autopoietic loop.

2. **Soft Sigmoid Scoring**: `score = 1 / (1 + weighted_count)` ensures no amount of findings permanently destroys reputation (Ostrom's graduated sanctions). A single blocker produces score 0.5 — serious but recoverable.

3. **Dual Timeout Boundaries**: 50ms server-side latency budget (endpoint returns partial) + 100ms client-side timeout membrane (client returns unavailable). The client timeout exceeds the server budget intentionally — the server should handle its own timeout before the client does.

4. **Metrics Source Interfaces**: ConformanceMetricsSource and KnowledgeMetricsSource are optional dependency-injected interfaces. Default no-op implementations ensure the enrichment service works even when conformance/knowledge subsystems are not yet wired.

## Test Results

- 33 new tests: all pass
- 981 total tests across 61 test files: all pass
- Zero regressions

## Files Changed

| File | Action |
|------|--------|
| `app/src/services/enrichment-service.ts` | Created |
| `app/src/routes/enrich.ts` | Created |
| `app/src/services/enrichment-client.ts` | Created |
| `app/src/services/quality-feedback.ts` | Created |
| `app/tests/unit/enrichment-service.test.ts` | Created |
| `app/src/server.ts` | Modified — added EnrichmentService, route registration |
| `grimoires/loa/ledger.json` | Modified — sprint-11 status → completed |
