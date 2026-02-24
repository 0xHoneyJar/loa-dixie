# Sprint 3 Implementation Report (Global ID: 22)

## Sprint Goal
Implement the stream enricher to intercept loa-finn's streaming response and inject tool event visibility, economic metadata, and the extended StreamEvent protocol.

## Implementation Summary

### Task 3.1: Extended StreamEvent Types ✅
**File**: `app/src/types/stream-events.ts`
- 13 event type interfaces (7 Phase 1 + 6 Phase 2)
- StreamEvent union type, Phase2StreamEvent sub-union
- TokenBreakdown and SourceSelection supporting types
- Backward compatible: Phase 1 clients ignore unknown types

### Task 3.2: Economic Metadata Types ✅
**File**: `app/src/types/economic.ts`
- EconomicMetadata, ModelPricing, InteractionSignal interfaces
- MODEL_PRICING constant with 5 model entries (Claude + GPT families)
- `computeCost()` function with longest-prefix matching (avoids gpt-4o/gpt-4o-mini ambiguity)

### Task 3.3: Stream Enricher Service ✅
**File**: `app/src/services/stream-enricher.ts`
- `enrichStream()`: injects model_selection, memory_inject, personality before first chunk
- Injects economic metadata after done+usage events
- Emits InteractionSignal to NATS (fire-and-forget)
- `parseSSEEvent()` / `serializeSSEEvent()` utilities for SSE format
- EnrichmentContext interface for caller to configure enrichment

### Task 3.4: Economic Metadata Middleware ✅
**File**: `app/src/middleware/economic-metadata.ts`
- Position 15 in constitutional middleware pipeline
- Sets x-economic-start-ms, x-model-pool request headers
- After response: X-Duration-Ms, X-Cost-Micro-USD, X-Model-Used response headers
- Graceful degradation on failure

### Task 3.5: Chat Route Integration ✅
**File**: `app/src/routes/chat.ts` (modified)
- Added ChatRouteDeps interface with signalEmitter
- After successful POST to loa-finn, emits session-level InteractionSignal to NATS
- Fire-and-forget: signal emission never blocks the response
- `emitChatSignal()` helper encapsulates NATS publishing

### Task 3.6: Signal Emission ✅
**File**: `app/src/services/stream-enricher.ts` + `app/src/routes/chat.ts`
- Stream enricher publishes detailed InteractionSignal (tokens, cost, tools, topics)
- Chat route publishes lightweight session signal (wallet, session, message)
- Both use `dixie.signal.interaction` subject on NATS
- Both fire-and-forget with `.catch(() => {})`

### Task 3.7: Web UI Components ✅
**Files**:
- `web/src/components/SourceChip.tsx` — Knowledge source chips with relevance indicators
- `web/src/components/CostIndicator.tsx` — Per-message cost in human-readable format
- `web/src/components/ReasoningTrace.tsx` — Collapsible "show thinking" panel
- `web/src/lib/ws.ts` — Extended with 6 Phase 2 event types
- `web/src/hooks/useChat.ts` — Handles all Phase 2 events in state
- `web/src/components/MessageBubble.tsx` — Renders Phase 2 components

### Task 3.8: Unit Tests ✅
**Files**:
- `app/tests/unit/stream-enricher.test.ts` — 22 tests (enrichStream, parseSSEEvent, serializeSSEEvent)
- `app/tests/unit/economic.test.ts` — 13 tests (computeCost, MODEL_PRICING validation)

### Bug Fix: db-client.test.ts Mock ✅
**File**: `app/tests/unit/db-client.test.ts`
- Fixed pre-existing mock constructor issue (arrow function → class for `new Pool()`)

### Server Integration ✅
**File**: `app/src/server.ts` (modified)
- Economic metadata middleware registered at position 15
- Chat routes receive signalEmitter dependency
- Pipeline comment updated with position 15 documentation

## Test Results
- **34/34** test files passing
- **292/292** tests passing
- TypeScript compiles cleanly (both `app/` and `web/`)

## Architecture Decisions

### Prefix Matching for Model Pricing
The `computeCost()` function sorts MODEL_PRICING by descending model name length before `startsWith` matching. This prevents `gpt-4o` from matching before `gpt-4o-mini`.

### Session-Level vs Token-Level Signals
- **Chat route**: Emits lightweight session signal after POST (wallet + sessionId + messageId)
- **Stream enricher**: Emits detailed signal after stream completes (full token breakdown, cost, tools used)
- Both use the same NATS subject but at different granularities

### WebSocket Enrichment Deferred to Sprint 4
The current WebSocket handler is a raw TCP byte proxy. Full WebSocket-level stream enrichment (parsing frames, injecting Phase 2 events in real-time) requires modifying `ws-upgrade.ts` fundamentally. This is planned for Sprint 4 Phase 2a integration.

## Files Changed
| File | Action | Lines |
|------|--------|-------|
| `app/src/types/stream-events.ts` | Created | 147 |
| `app/src/types/economic.ts` | Created | 77 |
| `app/src/services/stream-enricher.ts` | Created | 188 |
| `app/src/middleware/economic-metadata.ts` | Created | 45 |
| `app/src/routes/chat.ts` | Modified | +35 |
| `app/src/server.ts` | Modified | +7 |
| `web/src/components/SourceChip.tsx` | Created | 58 |
| `web/src/components/CostIndicator.tsx` | Created | 52 |
| `web/src/components/ReasoningTrace.tsx` | Created | 57 |
| `web/src/lib/ws.ts` | Modified | +48 |
| `web/src/hooks/useChat.ts` | Modified | +40 |
| `web/src/components/MessageBubble.tsx` | Modified | +18 |
| `app/tests/unit/stream-enricher.test.ts` | Created | 242 |
| `app/tests/unit/economic.test.ts` | Created | 96 |
| `app/tests/unit/db-client.test.ts` | Modified | +5 (bug fix) |
