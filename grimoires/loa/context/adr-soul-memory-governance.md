# ADR: Soul Memory Governance Model

**Status**: Proposed
**Date**: 2026-02-20
**Sprint**: 17 (Soul Memory Architecture Preparation)
**References**: adr-soul-memory-architecture.md, adr-soul-memory-api.md, Conway (#80)

## Overview

This document defines the governance rules for soul memory — who can read, write, seal, and delete memory, and what happens during the critical NFT transfer lifecycle event. The Hounfour protocol provides the governance primitives (`AccessPolicy`, `ConversationSealingPolicy`); this document maps them to concrete Dixie behaviors.

---

## Governance Scenarios

### 1. Owner Chats with Agent

**Trigger**: Current NFT owner sends a message via the web chat UI.

**Behavior**:
- Message appended to event log as `message` event with `actor_wallet` set to owner
- Agent response appended as `message` event with `actor_wallet` set to agent NFT ID
- Tool use recorded as `tool_use` events
- Memory projection updated: `activeContext.summary` regenerated, `interactionCount` incremented
- **Access level**: `read_write` — owner has full access to their own conversation data

**Governance**: No policy checks needed beyond JWT ownership verification. The owner is sovereign over their own memory.

### 2. NFT Transfers to New Owner

**Trigger**: On-chain NFT transfer detected (via event listener or webhook).

**Event sequence**:

```
1. transfer event     → Records ownership change (previous_wallet, new_wallet, block_number)
2. seal events        → For EACH active conversation:
                         - Apply ConversationSealingPolicy
                         - Encrypt payload with AES-256-GCM
                         - Store key_reference for potential future access
3. policy_change event → Set AccessPolicy for previous owner
4. projection reset   → New owner gets fresh memory projection (empty activeContext)
```

**What the previous owner sees** (depends on AccessPolicy):

| Policy Type | Previous Owner Experience |
|-------------|--------------------------|
| `none` | All conversations disappear immediately. No trace remains visible. |
| `read_only` | Conversations visible as read-only. Cannot send new messages. Content remains accessible indefinitely. |
| `time_limited` | Same as `read_only` but access expires after `duration_hours`. After expiry, conversations show as "Access expired" stubs. |
| `role_based` | Access only if wallet holds a qualifying role (e.g., "auditor", "community_elder"). Role verification happens at query time. |

**What the new owner sees**: Fresh start. No conversation history from previous owner. Sealed conversations are invisible unless the AccessPolicy explicitly grants visibility (e.g., a `read_only` policy where the new owner can see that sealed conversations exist but cannot read their content).

### 3. New Owner Starts Chatting

**Trigger**: New NFT owner sends their first message after transfer.

**Behavior**:
- Fresh conversation created with new `conversation_id`
- Memory projection starts accumulating from zero
- Previous sealed conversations are completely isolated
- Agent personality (BEAUVOIR) persists across transfers — personality is NFT-level, not owner-level
- Agent knowledge corpus persists — the Oracle's institutional knowledge is shared

**Key distinction**: Memory (conversations, context) is owner-scoped. Personality and knowledge are NFT-scoped. The agent remembers what it knows, but not who it talked to.

### 4. Admin Revokes Access

**Trigger**: System admin or governance action revokes a wallet's access.

**Event sequence**:

```
1. policy_change event → AccessPolicy set to { type: 'none' } for target wallet
2. seal events         → Any conversations accessible to the revoked wallet are sealed
3. audit event         → Revocation logged with admin wallet, reason, timestamp
```

**Behavior**:
- Revoked wallet immediately loses all memory access
- If `access_audit: true`, the revocation and all prior access events are preserved in the audit log
- Revocation is irreversible unless a new AccessPolicy is explicitly granted

### 5. Agent Proactively Surfaces Memory

**Trigger**: Agent runtime prepares context for a new user message.

**Behavior**:
- Memory projection's `activeContext.summary` injected into LLM system prompt
- Summary includes: key topics discussed, user preferences observed, unresolved questions
- Context window management: summary is token-bounded (configurable, default ~500 tokens)
- Stale context (>30 days without interaction) triggers re-summarization from event log

**Memory injection hierarchy** (priority order):
1. **Immediate context**: Current conversation messages (always present)
2. **Active memory**: Projection summary from recent conversations (injected if available)
3. **Long-term patterns**: Extracted preferences and interests (injected for returning users)
4. **NFT-level knowledge**: Oracle corpus / personality (always present via BEAUVOIR)

The agent does NOT surface sealed conversations, even if they exist in the event log. Sealed data is governance-locked.

---

## Web4 "Social Monies" Thesis: Memory as Community Resource

The 0xHoneyJar ecosystem operates on a communitarian model where dNFTs are social infrastructure, not purely private property. This creates a tension in memory governance:

### Memory as Private Property (Darwinian Model)

- Memory belongs exclusively to the current owner
- On transfer, previous owner loses everything
- Agent's accumulated knowledge is a private asset
- Analogous to: buying a used phone and factory-resetting it

### Memory as Community Resource (Communitarian Model)

- Memory is the agent's institutional knowledge, shared across the community
- On transfer, the agent retains its "education" (what it learned from all owners)
- Previous owners contribute to the agent's growth
- Analogous to: an institution that remembers its history regardless of who's in charge

### The Recommended Hybrid

Soul memory governance should follow the **Communitarian-with-Privacy** model:

1. **Conversations are private** — sealed on transfer, governed by AccessPolicy
2. **Accumulated patterns are shared** — the agent's learned preferences, topic expertise, and personality evolution persist across transfers
3. **The NFT IS the institution** — its identity and knowledge are public goods within the community
4. **The ConversationSealingPolicy mediates** — it defines exactly where the privacy boundary lies

This maps directly to Hounfour's design: ConversationSealingPolicy governs the private layer (conversations), while the NFT's identity (BEAUVOIR, knowledge corpus) remains the public layer.

---

## Conway Model: Communitarian vs. Darwinian Memory

From the Conway analysis (#80), the dNFT agent system reflects two architectural philosophies:

### Communitarian (Library Model)

Memory is governed infrastructure. Like a library, the collection persists and grows regardless of who checks out books:

- Agent memory as collective knowledge
- Sealing policies as library rules (who can access what, for how long)
- AccessPolicy as library card system
- Transfer as change of librarian, not destruction of the library
- **Governance**: Heavy, explicit, auditable

### Darwinian (Brain Model)

Memory is owned infrastructure. Like a brain, it belongs to its host:

- Agent memory as private cognitive state
- Sealing as forgetting (encrypted = inaccessible = forgotten)
- Transfer as memory wipe (previous owner's conversations are gone)
- New owner starts from scratch
- **Governance**: Light, implicit, ownership-based

### Where Dixie Sits

Dixie's soul memory should be **Communitarian at the NFT level, Darwinian at the conversation level**:

| Layer | Model | Governance |
|-------|-------|-----------|
| NFT identity (BEAUVOIR, personality) | Communitarian | NFT-scoped, persists across transfers |
| Knowledge corpus (Oracle's domain expertise) | Communitarian | NFT-scoped, grows with use |
| Accumulated patterns (topic interests, style) | Hybrid | Anonymized patterns persist; attributable context sealed |
| Conversations (actual messages) | Darwinian | Owner-scoped, sealed on transfer per ConversationSealingPolicy |
| Personal data (wallet, preferences) | Darwinian | Owner-scoped, destroyed on transfer |

This layered approach lets the agent "grow" (communitarian) while protecting user privacy (Darwinian). The ConversationSealingPolicy is the membrane between these layers.

---

## Default Policies

For the Dixie MVP, recommended default governance settings:

### Default ConversationSealingPolicy (on NFT Transfer)

```json
{
  "encryption_scheme": "aes-256-gcm",
  "key_derivation": "hkdf-sha256",
  "key_reference": "<generated-per-transfer>",
  "access_audit": true,
  "access_policy": {
    "type": "time_limited",
    "duration_hours": 720,
    "audit_required": true,
    "revocable": true
  }
}
```

**Rationale**: 30-day read-only access for previous owner provides a grace period for the transition. Audit trail ensures transparency. New owner can revoke if desired.

### Default AccessPolicy (New NFT)

```json
{
  "type": "none",
  "audit_required": false,
  "revocable": false
}
```

**Rationale**: A freshly minted NFT has no previous owner. The first owner has exclusive access with no governance overhead.
