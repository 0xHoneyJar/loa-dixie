# Cross-Repo Issue Map — Agent Memory + Decentralized Storage

**Status**: Draft only. Pending @deep-name review before any implementation.
**Feature slug**: `agent-memory-decentralized-storage`
**Date**: 2026-04-27

---

## Parent issue (this proposal)

- **Repo**: `0xHoneyJar/loa-dixie`
- **Issue**: [#89](https://github.com/0xHoneyJar/loa-dixie/issues/89)
- **Owner role**: Layer 5 product / BFF / oracle.
- **Scope**: product framing, governance/access framing, oracle/BFF endpoint surface, documentation. No runtime, no shared schemas, no community delivery.

---

## Linked cross-repo issues

| Repo | Issue | Owner role | What it owns | What Dixie does |
|---|---|---|---|---|
| `0xHoneyJar/loa-hounfour` | [#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57) | Layer 2 — shared protocol/schemas | `MemoryArtifact`, `MemorySummary`, `MemoryReflection`, `MemoryCommitment`, `ChainCommitment`, `AgentIdentity`, `AgentCredential`, `AccessPolicy`, `StoragePointer`, `ReputationEvent`, `ValidationRecord`. Compatibility/conformance vectors. | **Reference, do not duplicate.** Dixie consumes the published Hounfour types when they land. No local Zod/TS schema for any of the above lives in `app/src/types/` for this feature. |
| `0xHoneyJar/loa-finn` | [#155](https://github.com/0xHoneyJar/loa-finn/issues/155) | Layer 3 — runtime | Memory distillation pipeline (raw → episode → reflection → skill → commitment), `StorageAdapter` (IPFS/Arweave/Filecoin/Ceramic/Tableland/private), `CommitmentAdapter` (chain-agnostic), `IdentityAdapter`, `AccessPolicyAdapter`, `ReputationAdapter`, `WalletAdapter`, audit/proof log, cost accounting. | **Reference, do not implement.** Dixie talks to Finn through the existing FinnClient proxy. No memory-distillation, storage adapter, or commitment logic is implemented in Dixie. |
| `0xHoneyJar/loa-freeside` | _(not opened yet — flagged as later follow-up)_ | Layer 4 — community/platform | Discord/Telegram surface, token/role gating, admin dashboard, agent activity feed, public memory transparency UI, billing-aware exposure of memory features. | **Out of scope for this draft.** Open a Freeside issue only after Dixie + Finn + Hounfour boundaries are confirmed by @deep-name and a community-agent product feature is approved. See Section 6. |

---

## Ownership boundary table

| Concern | Owner | Notes |
|---|---|---|
| What product behavior an oracle/BFF caller sees | **Dixie** | This proposal. |
| Governance/conviction/ownership gates around memory endpoints | **Dixie** | Read existing middleware ordering; do **not** change ordering — see open question Q1. |
| Who can read/write a memory artifact (policy framing) | **Dixie** (framing) → **Hounfour** (schema) → **Finn** (enforcement) | Dixie expresses the product policy; Hounfour types it; Finn enforces at runtime. |
| `StorageAdapter` selection (IPFS/Arweave/etc.) | **Finn** | Dixie may express a *preference* through a typed request, but adapter routing is Finn's. |
| Chain selection for commitments | **Finn** | Chain-agnostic. Dixie should never hard-code chain IDs for memory commitments. |
| Memory distillation pipeline logic | **Finn** | Raw event → episode → reflection → skill → commitment. |
| Memory artifact schema | **Hounfour** | See linked issue #57. |
| Reputation event / validation record schema | **Hounfour** | See linked issue #57. |
| Discord/TG/admin/token-gated surfaces for memory | **Freeside** (later) | Not in this proposal. |

---

## Issues that DO NOT exist yet (intentional)

- No `loa-main` issue. This proposal does not add a slash command, skill, eval, Bridgebuilder behavior, or System Zone change. If review surfaces a need, open one separately.
- No `loa-freeside` issue. See Section 6 — community/agentic surface is a deliberate later follow-up.

If @deep-name disagrees, the right action is to open the missing issue and link it back here, **not** to expand Dixie scope.

---

## Stop conditions

Halt this draft and request @deep-name review if any of the following occur during planning:

1. Dixie work starts to require local schema types that look like Hounfour artifacts (memory record, reputation event, access policy, etc.).
2. Dixie work starts to require runtime logic (distillation, embeddings, adapter selection, chain writes).
3. Middleware ordering needs to change to satisfy a memory endpoint.
4. A Freeside-style surface (Discord command, token gate, admin dashboard) is implied by the spec.
5. A migration in `app/src/db/` is implied.
6. The "chain" stops being chain-agnostic and a specific chain leaks into Dixie code or copy.

In any of those cases, the correct response is a comment on `loa-dixie#89` flagging the boundary breach, not a code change.

---

## 6. Freeside follow-up (deferred, not now)

**Trigger**: After (a) Hounfour publishes the relevant memory/identity/policy schemas, (b) Finn ships a shadow-mode runtime behind a feature flag, and (c) Dixie exposes the read-only oracle/BFF endpoints behind admin-only access.

**Possible community-facing memory product feature shape (speculative, not committed)**:

- Discord/Telegram daemon that surfaces "what the agent remembers about this community" with provenance labels (per the trust-label model in the research packet §22).
- Token-gated / role-gated read access to memory views (NFT holder, BGT tier, DAO admin).
- Admin/operator console for inspecting memory commitments, access policies, and reputation events.
- Authorship/provenance UI labels on agent-authored content.

**What this requires from upstream layers before Freeside scoping is sensible**:

- Hounfour `AccessPolicy`, `AgentIdentity`, `MemoryCommitment` shapes finalized.
- Finn `AccessPolicyAdapter` and `IdentityAdapter` callable through FinnClient.
- Dixie has a stable, governance-gated read API for memory artifacts.

**Do not** open the Freeside issue as part of this draft. Note this as a vision/registry candidate for later.

---

## Review hand-off

Once @deep-name reviews this issue map alongside the PRD/SDD/sprint drafts, the next decision is **which of the three linked issues must land first** before any Dixie implementation. The sprint plan assumes the order: Hounfour #57 → Finn #155 → Dixie shadow surface. Confirm or revise.
