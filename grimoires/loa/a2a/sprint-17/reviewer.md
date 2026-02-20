# Sprint 17 Implementation Report: Soul Memory Architecture Preparation

## Sprint Overview

| Field | Value |
|-------|-------|
| Sprint ID | sprint-17 (global) |
| Label | Soul Memory Architecture Preparation |
| Tasks | 4 |
| Status | COMPLETED |
| Backend Tests | 152 (unchanged) |
| Web Tests | 20 (unchanged) |
| Code Changes | 1 new type file, 3 ADR documents |

## Tasks Completed

### Task 17.1: Write soul memory architecture options document
**File**: `grimoires/loa/context/adr-soul-memory-architecture.md` (NEW)

Documented 3 architectural approaches to soul memory, evaluated against Hounfour governance primitives:

- **Option A (PostgreSQL)**: Simplest implementation (ChatGPT's approach). Governance bolted on as afterthought. Fast queries but sealing semantics are partial match to ConversationSealingPolicy.
- **Option B (Event-Sourced)**: Append-only event log with ConversationSealingPolicy as first-class event type. Governance by construction — the log IS the audit trail. Requires projection layer for fast reads.
- **Option C (On-Chain Pointer)**: Memory pointer in NFT metadata, encrypted off-chain storage. Strongest NFT transfer semantics but 500ms+ retrieval latency makes real-time context injection impractical.

**Recommendation**: Option B (Event-Sourced Memory) for governance-first design. Option C as Phase 3 evolution for cross-protocol composability.

Includes comparison matrix across all 5 evaluation criteria (Hounfour AccessPolicy, NFT transfer, encryption, query performance, storage cost) and detailed transfer scenarios for all 4 AccessPolicy types (none, read_only, time_limited, role_based).

### Task 17.2: Design soul memory API surface
**File**: `grimoires/loa/context/adr-soul-memory-api.md` (NEW)

Defined 4 API endpoints with full contracts:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/memory/:nftId` | GET | Retrieve active memory context |
| `/api/memory/:nftId/seal` | POST | Seal conversation per ConversationSealingPolicy |
| `/api/memory/:nftId/history` | GET | Paginated conversation history |
| `/api/memory/:nftId/:conversationId` | DELETE | Owner-initiated memory deletion |

Each endpoint specifies: auth requirements (JWT), request/response shapes, Hounfour type references, error cases (401/403/404/409), and validation rules.

AccessPolicy integration documented: 6-step request flow from JWT extraction through ownership check, policy enforcement, and audit logging.

Rate limiting defined per endpoint (60/min for reads, 5/min for deletes).

Dixie BFF role clarified: auth validation + rate limiting + routing. Finn owns persistence.

### Task 17.3: Design memory governance model
**File**: `grimoires/loa/context/adr-soul-memory-governance.md` (NEW)

Documented 5 governance scenarios:

1. **Owner chats** — read_write access, event log append, projection update
2. **NFT transfers** — transfer → seal → policy_change event sequence, per-AccessPolicy behavior table
3. **New owner starts** — fresh context, sealed conversations isolated, personality persists
4. **Admin revokes** — immediate access loss, audit trail preserved
5. **Proactive memory surfacing** — context injection hierarchy (immediate → active → long-term → NFT-level)

Web4 "social monies" analysis: memory as private property (Darwinian) vs community resource (Communitarian). Recommended hybrid model: conversations are private (sealed on transfer), accumulated patterns are shared (persist across owners).

Conway model mapping: Communitarian at NFT level (identity, knowledge), Darwinian at conversation level (messages, personal data). ConversationSealingPolicy as the membrane between layers.

Default policies defined for MVP: AES-256-GCM encryption with 30-day time_limited access on transfer.

### Task 17.4: Create soul memory type stubs
**File**: `app/src/types/memory.ts` (NEW)

Created type-only module with 6 type definitions:

| Type | Purpose |
|------|---------|
| `SoulMemory` | Complete memory state for a dNFT (projection view) |
| `ConversationContext` | Compressed memory for LLM context injection |
| `MemoryEntry` | Single event in the append-only log |
| `MemoryEventType` | Union of 8 event types (message, tool_use, seal, transfer, etc.) |
| `SealedConversation` | Encrypted conversation metadata with policy snapshot |
| Re-exports | `AccessPolicy`, `ConversationSealingPolicy` from loa-hounfour |

All types import from `@0xhoneyjar/loa-hounfour` for governance layer. Comprehensive JSDoc comments explain governance semantics. TypeScript compiles cleanly with `--noEmit`. No runtime code — pure type definitions.

## Key Design Decisions

1. **Event-sourced over CRUD**: The append-only log makes governance auditing trivial — every action is recorded. ConversationSealingPolicy becomes a first-class event type rather than an afterthought.

2. **Governance-first**: AccessPolicy and ConversationSealingPolicy from Hounfour are the architectural foundation, not a bolt-on. This prevents the "ChatGPT memory retrofit" problem.

3. **Communitarian-with-Privacy hybrid**: NFT-level knowledge (personality, corpus) is communitarian. Conversation-level data is Darwinian. The sealing policy mediates the boundary.

4. **Type stubs use Hounfour re-exports**: Memory consumers import governance types from `app/src/types/memory.ts` rather than directly from loa-hounfour, creating a single import surface for the memory domain.

## Verification

- TypeScript: `npx tsc --noEmit` — clean
- Backend tests: 152 passing (no changes to runtime code)
- Web tests: 20 passing (no changes to web code)
- No functional code changes — documentation and types only
