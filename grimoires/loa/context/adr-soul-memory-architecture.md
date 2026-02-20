# ADR: Soul Memory Architecture

**Status**: Proposed
**Date**: 2026-02-20
**Sprint**: 17 (Soul Memory Architecture Preparation)
**References**: loa-hounfour PR #1, PR #2, Issue #66, Conway (#80)

## Context

Soul memory is the single biggest experiential differentiator for the dNFT agent platform. Without it, the dNFT is a chatbot with personality. With it, it's "my agent" — an entity that remembers conversations, accumulates context, and develops understanding over time.

The Hounfour protocol provides two governance primitives that constrain our architectural choices:

- **`ConversationSealingPolicy`**: Governs what happens to conversation data on NFT transfer. Supports `aes-256-gcm` encryption with `hkdf-sha256` key derivation, audit trails, and access policies.
- **`AccessPolicy`**: Controls previous-owner data visibility after transfer. Four types: `none` (immediate revocation), `read_only` (indefinite), `time_limited` (duration-bounded), `role_based` (role-gated).

The design must honor these governance primitives while delivering a memory system that feels instantaneous to users.

## Decision Drivers

1. **Hounfour AccessPolicy compatibility** — memory access must be governable per-NFT
2. **NFT transfer semantics** — memory must handle ownership changes cleanly
3. **Encryption requirements** — sealed conversations must use AES-256-GCM per ConversationSealingPolicy
4. **Query patterns** — context injection into LLM prompts requires fast retrieval
5. **Storage cost at scale** — 10K+ NFTs with multi-year conversation histories

---

## Option A: Conversation History in PostgreSQL with Per-User Encryption

The ChatGPT approach: store conversations as rows in PostgreSQL, encrypt at the application layer per wallet address.

### Data Model

```
conversations (id, nft_id, wallet_address, title, status, created_at, updated_at)
messages (id, conversation_id, role, content_encrypted, created_at)
memory_contexts (nft_id, summary_encrypted, last_updated)
encryption_keys (nft_id, wallet_address, key_reference, created_at, revoked_at)
```

### Governance Model

- **Read/Write**: Query by `nft_id` + `wallet_address` match
- **NFT Transfer**: New row in `encryption_keys` for new owner; old key marked `revoked_at`
- **Sealing**: Application-level encryption toggle per conversation
- **AccessPolicy**: Implemented as a `policies` column on `conversations` table

### Pros

| Aspect | Assessment |
|--------|-----------|
| Implementation complexity | Low — standard CRUD patterns |
| Query performance | Excellent — native SQL indexes |
| Operational familiarity | High — standard PostgreSQL ops |
| Migration path | Simple — add columns, add indexes |

### Cons

| Aspect | Assessment |
|--------|-----------|
| Hounfour AccessPolicy | Bolted on — governance is an afterthought, not a first-class concept |
| NFT transfer | Requires key rotation + re-encryption of existing data |
| Audit trail | Must be added separately (triggers or application logic) |
| Sealing semantics | Encryption flag per-row doesn't match ConversationSealingPolicy's richer model |
| Governance drift | Schema changes to add governance later are breaking changes |

### Assessment

Simplest to build but creates governance debt. ChatGPT chose this approach and later had to retrofit memory controls — the "memory off" toggle is a UI band-aid over a governance gap.

---

## Option B: Event-Sourced Memory with Append-Only Log Governed by ConversationSealingPolicy

Conversations are an append-only event log. Each event is immutable once written. Sealing is a first-class operation that applies `ConversationSealingPolicy` to a conversation's event stream.

### Data Model

```
memory_events (
  id UUID,
  nft_id TEXT,
  conversation_id UUID,
  event_type ENUM('message', 'tool_use', 'context_inject', 'seal', 'unseal', 'transfer', 'policy_change'),
  payload JSONB,
  encryption_state ENUM('plaintext', 'sealed'),
  sealing_policy JSONB,  -- ConversationSealingPolicy snapshot at seal time
  actor_wallet TEXT,
  created_at TIMESTAMPTZ
)

memory_projections (
  nft_id TEXT PRIMARY KEY,
  active_context JSONB,       -- current memory summary for LLM injection
  conversation_count INT,
  last_interaction TIMESTAMPTZ,
  access_policy JSONB          -- current AccessPolicy
)
```

### Governance Model

- **Read/Write**: Events appended by current owner only (verified via JWT wallet claim)
- **NFT Transfer**: `transfer` event records ownership change; `seal` event applies ConversationSealingPolicy to all prior conversations; `policy_change` event sets AccessPolicy for previous owner
- **Sealing**: Dedicated `seal` event encrypts conversation payload using AES-256-GCM with HKDF-SHA256 key derivation. Key reference stored in event metadata.
- **AccessPolicy enforcement**: Projection layer checks AccessPolicy before returning conversation data. `time_limited` enforced via `created_at + duration_hours`. `role_based` enforced via role claim in JWT.
- **Audit**: Every event IS the audit trail — append-only log is inherently auditable

### Pros

| Aspect | Assessment |
|--------|-----------|
| Hounfour AccessPolicy | Native — AccessPolicy is a first-class event type |
| NFT transfer | Clean — transfer is an event, sealing is an event, no data mutation |
| ConversationSealingPolicy | Exact match — seal events snapshot the policy at seal time |
| Audit trail | Built-in — the event log IS the audit trail |
| Temporal queries | Natural — "what did the agent know at time T?" is a log replay |
| Governance evolution | Non-breaking — new event types extend without schema migration |

### Cons

| Aspect | Assessment |
|--------|-----------|
| Implementation complexity | Medium — requires projection layer for fast reads |
| Query performance | Requires materialized projections for real-time context injection |
| Operational complexity | Event log compaction and archival needed at scale |
| Storage cost | Higher than Option A — events are never deleted, only sealed |

### Assessment

Natural fit for Hounfour governance. The append-only log means every governance action is recorded and auditable. Sealing is a first-class operation, not a retrofit. The projection layer adds complexity but solves the query performance requirement.

---

## Option C: On-Chain Metadata Pointer + Off-Chain Encrypted Storage

The dNFT's on-chain metadata includes a pointer to its off-chain memory store. Memory data lives in encrypted off-chain storage (IPFS/Arweave/S3). NFT transfer automatically transfers the memory pointer.

### Data Model

```
On-chain (NFT metadata):
  memory_root: CID/URI pointing to encrypted memory manifest

Off-chain (encrypted storage):
  manifest.json (signed by sealing key)
    ├── conversations/
    │   ├── conv-001.sealed.json
    │   └── conv-002.sealed.json
    ├── context/
    │   └── active-memory.sealed.json
    └── governance/
        └── access-log.json
```

### Governance Model

- **Read/Write**: Decrypt with key derived from wallet signature
- **NFT Transfer**: Memory pointer transfers with token. Previous owner's decryption key no longer valid (key derived from ownership proof).
- **Sealing**: Each conversation file encrypted independently. Sealing policy metadata in manifest.
- **AccessPolicy**: Encoded in manifest. `time_limited` requires oracle for expiry. `role_based` requires on-chain role registry.

### Pros

| Aspect | Assessment |
|--------|-----------|
| NFT transfer | Strongest — memory moves with the token by definition |
| Ownership proof | Cryptographic — only token holder can derive decryption key |
| Censorship resistance | High — off-chain storage can be replicated |
| Composability | Other protocols can reference the memory pointer |

### Cons

| Aspect | Assessment |
|--------|-----------|
| Implementation complexity | High — on-chain transactions, off-chain encryption, key derivation |
| Query performance | Poor — must download + decrypt for every context injection |
| AccessPolicy enforcement | Requires oracle or on-chain logic for time_limited/role_based |
| Operational complexity | Very high — on-chain tx costs, IPFS pinning, key management |
| Latency | 500ms+ for memory retrieval vs 10ms for PostgreSQL |
| ConversationSealingPolicy | Partial match — encryption works, but audit trail is split across on/off chain |

### Assessment

Architecturally elegant for the "memory travels with the token" narrative but operationally expensive and slow. The query latency alone makes real-time context injection impractical without a caching layer that reintroduces the complexity of Option B.

---

## Comparison Matrix

| Criterion | Option A (PostgreSQL) | Option B (Event-Sourced) | Option C (On-Chain Pointer) |
|-----------|----------------------|--------------------------|----------------------------|
| **Hounfour AccessPolicy** | Bolted on | Native | Partial (needs oracle) |
| **NFT Transfer Semantics** | Key rotation required | Clean event-based | Automatic (on-chain) |
| **Encryption (AES-256-GCM)** | Per-row flag | Per-event with policy snapshot | Per-file |
| **ConversationSealingPolicy** | Partial match | Exact match | Partial match |
| **Query Performance** | Excellent (10ms) | Good with projections (20ms) | Poor (500ms+) |
| **Audit Trail** | Must add separately | Built-in (event log) | Split across chains |
| **Storage Cost at Scale** | Low | Medium | High (on-chain tx fees) |
| **Implementation Complexity** | Low | Medium | High |
| **Governance Evolution** | Breaking schema changes | Non-breaking event types | On-chain upgrade required |

## Recommendation

**Option B (Event-Sourced Memory)** is recommended for the following reasons:

1. **Governance-first design**: ConversationSealingPolicy and AccessPolicy are first-class event types, not afterthoughts. This aligns with the Hounfour protocol's design philosophy.

2. **Audit by construction**: The append-only log IS the audit trail. When `access_audit: true` in a sealing policy, every access event is already recorded.

3. **Transfer semantics**: NFT transfers produce `transfer` → `seal` → `policy_change` events that form a complete, auditable ownership history.

4. **Evolutionary path**: Option C's on-chain pointer model is a natural Phase 3 evolution — the event log can be anchored to on-chain metadata without rewriting the storage layer.

5. **Pragmatic performance**: The projection layer (materialized current-state views) provides sub-50ms context injection while preserving full event history.

**Option C should be revisited** when the ecosystem requires cross-protocol memory composability (e.g., another protocol reading a dNFT's memory). The on-chain pointer becomes the interoperability layer, with Option B's event log as the authoritative source.

## ConversationSealingPolicy: Transfer Scenarios

When an NFT transfers, the `ConversationSealingPolicy` governs what happens to existing conversations:

| AccessPolicy Type | Previous Owner Access | New Owner Access | Sealed Data |
|-------------------|----------------------|-----------------|-------------|
| `none` | Immediately revoked | Fresh start, no history | Encrypted, key destroyed |
| `read_only` | Can read indefinitely | Fresh start + can see sealed conversations are present (not content) | Encrypted, previous owner retains read key |
| `time_limited` | Read access for `duration_hours` | Fresh start | Encrypted, key auto-expires |
| `role_based` | Access if they hold a qualifying role | Fresh start + role-gated access to sealed history | Encrypted, role-verified decryption |

In all cases, new conversations started by the new owner are completely isolated from previous owner's data. The sealing policy only governs access to pre-transfer conversations.
