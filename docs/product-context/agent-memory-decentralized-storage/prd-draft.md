# PRD Draft — Dixie: Agent Memory + Decentralized Storage (Layer 5)

**Status**: DRAFT. Planning only. Pending @deep-name review before implementation.
**Feature slug**: `agent-memory-decentralized-storage`
**Date**: 2026-04-27
**Owner repo**: `0xHoneyJar/loa-dixie` (Layer 5 — product/BFF/oracle)
**Parent issue**: [loa-dixie#89](https://github.com/0xHoneyJar/loa-dixie/issues/89)
**Linked**: [loa-hounfour#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57), [loa-finn#155](https://github.com/0xHoneyJar/loa-finn/issues/155)
**Source context**: `grimoires/loa/context/agent-memory-decentralized-storage/research-packet.md`, `docs/product-context/agent-memory-decentralized-storage-ai-legitimacy.md`

> This PRD describes ONLY what Dixie owns: product/BFF/oracle behavior, governance/access framing, and documentation. Runtime is Finn (#155). Schemas are Hounfour (#57). Community surfaces are a Freeside follow-up (deferred).

---

## 1. Problem statement

Loa agents need durable memory that turns raw interaction logs into selectively recalled "experience," with public verifiability where useful and privacy where required, and without putting raw memory or model weights on-chain. The runtime, storage, and chain-commitment work belongs to Finn; the shared types belong to Hounfour. **Dixie's open problem** is:

When a caller (Oracle client, dNFT, sovereign holder, admin, or another agent) asks Dixie about an agent's memory, reputation, or autonomous behavior, Dixie has no product-level surface that:

- Exposes Finn-resident memory artifacts as governance-gated, conviction-aware, ownership-checked product responses.
- Names which provenance/authorship label applies to a given output (per the trust-label model in research §22).
- Documents the boundary between Dixie product/BFF/oracle behavior and Finn runtime memory behavior, so future work does not silently smuggle runtime logic into Dixie routes.

Without this, the eventual Finn runtime ships with no clean BFF/oracle consumer, and the existing memory-adjacent Dixie surfaces (`memory`, `learning`, `reputation`, `autonomous`, `agent`, `personality`, `enrich`) drift into ad-hoc patterns.

---

## 2. Vision (Layer 5 framing)

> Dixie exposes a small, governance-gated, conviction-aware product surface over Finn-resident agent memory and reputation, with provenance-labeled responses and inspectable access policy — without owning runtime, schemas, or community delivery.

This is **not** a memory database, distillation engine, storage adapter, commitment writer, or community bot. Those belong to Finn (runtime) / Hounfour (types) / Freeside (delivery).

---

## 3. Target users (Dixie product surface)

| Persona | Why they call Dixie | Out of scope here |
|---|---|---|
| Oracle client | Asks the Oracle a question that may benefit from agent memory context. | The model call itself (Finn). |
| dNFT / sovereign holder | Reads what their daemon "remembers" and what it has done on their behalf. | Discord/TG presentation (Freeside). |
| DAO/community admin | Inspects governance-gated memory views and reputation aggregates. | Admin dashboard UI (Freeside). |
| Agent (A2A) | Calls another agent's product surface for memory/reputation context. | A2A wire protocol details (Hounfour/Finn). |
| Internal maintainer | Audits provenance/access policy of a memory artifact. | Audit log infrastructure (Finn). |

---

## 4. Proposed Dixie behavior

Dixie SHOULD, behind a draft feature flag and admin-only allowlist, eventually expose:

1. **A read-only oracle/BFF surface for memory artifacts and reputation aggregates** that proxies Finn through the existing `FinnClient`/proxy layer, applies Dixie's standard governance/conviction/ownership/payment middleware, and returns Hounfour-typed results unchanged.
2. **A provenance/authorship label** on each response indicating which entry in the research §22 trust-label model applies (e.g., `human-approved-agent-message`, `autonomous-agent-message`, `official-community-agent`). The label is metadata, not content rewriting.
3. **An access-policy preview endpoint** that, given a `StoragePointer` reference (Hounfour-typed), reports whether the calling identity is permitted to retrieve/decrypt — without performing the retrieval itself. Enforcement remains in Finn.
4. **Documentation under `docs/product-context/`** that names the boundary so future contributors don't smuggle runtime/schema/community logic into Dixie.

Dixie SHOULD NOT, in this proposal:

- Distill memory, generate embeddings, or write to any storage layer.
- Define `MemoryArtifact`, `ReputationEvent`, `AccessPolicy`, `ChainCommitment`, or any related shape locally.
- Pick a chain, write a commitment, or hold any wallet/signing key for memory operations.
- Expose Discord/Telegram/billing/token-gating surfaces.
- Change middleware ordering (see open question Q1).

---

## 5. Proposed product/API surface (illustrative, not committed)

These are illustrative shapes for review, not interface definitions. Final shapes depend on Hounfour #57.

| Surface | Verb | Existing Dixie module | Behavior | Owner of underlying logic |
|---|---|---|---|---|
| `memory` (read view) | GET | `app/src/routes/memory.ts` | Returns Finn-resident memory artifact metadata + provenance label, governance-gated. | Finn (runtime), Dixie (gating + label) |
| `memory/access-preview` | POST | `app/src/routes/memory.ts` (new sub-route) | Given a `StoragePointer`, reports whether caller may decrypt. No retrieval. | Finn (`AccessPolicyAdapter`), Dixie (request shaping) |
| `reputation` (aggregate read) | GET | `app/src/routes/reputation.ts` | Surfaces `ReputationEvent` aggregates with provenance metadata. | Finn (compute), Dixie (gating + label) |
| `agent` (capability/manifest read) | GET | `app/src/routes/agent.ts` | Returns agent identity + capability manifest including memory access policy summary. | Hounfour (types), Finn (runtime), Dixie (BFF assembly) |
| `personality` / `learning` / `autonomous` | — | unchanged in this proposal | Out of scope; flagged for review only if a memory dependency is implied. | — |

All such surfaces share the existing Dixie governance/access pattern and **do not change middleware ordering**. The behavior of `memory-context.ts` middleware specifically is flagged as @deep-name review question Q1.

---

## 6. Governance / access / payment framing

Dixie's product framing of memory access:

- **Ownership check**: dNFT/wallet ownership of the agent identity gate-keeps "this agent's private memory."
- **Conviction tier**: BGT or equivalent conviction tier may unlock public-but-tiered memory views (community lore, validated reputation slices). Tier definition is not changed by this proposal.
- **Payment**: x402 / payment-required gating applies to memory-context-enriched oracle calls iff Finn reports the call as a paid resource. Payment infrastructure remains Freeside; Dixie consumes the entitlement signal.
- **Sovereign / autonomous permission**: Autonomous agent reads-on-its-own-memory follow the existing `tba-auth` / `service-jwt` pattern; this proposal **adds no new auth mechanism**.
- **Governance denial UX**: When access is denied, Dixie returns the existing governance denial envelope. Reason codes for memory-specific denials may need a Hounfour addition; if so, that is `loa-hounfour#57` scope, not local.

---

## 7. Cross-repo impact map

| Repo | Impact | Why |
|---|---|---|
| `loa-main` | None | No skill/command/eval/Bridgebuilder change. Flag if review disagrees. |
| `loa-hounfour` | **Required** | Memory artifact / reputation event / access policy / storage pointer / commitment / identity / credential schemas. See [#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57). |
| `loa-finn` | **Required** | Distillation pipeline, storage adapters, commitment adapter, identity adapter, access-policy enforcement, audit log. See [#155](https://github.com/0xHoneyJar/loa-finn/issues/155). |
| `loa-freeside` | **Deferred** | Community-facing memory product feature, possibly agentic Discord/TG/admin/token-gated controls. Not in this proposal. See `issue-map.md` §6. |
| `loa-dixie` | **Required** | Product/BFF/oracle surface, governance/access framing, provenance labels, documentation. This proposal. |

---

## 8. Rollout mode

- [x] Documentation/research only (this PR)
- [x] Disabled-by-default feature flag (after approval)
- [x] Admin-only allowlist before broader exposure
- [x] Shadow mode (read-only, no caller-visible behavior change) before enforcement
- [ ] Enforce mode (out of scope until @deep-name approves a follow-up cycle)

---

## 9. Non-goals

- No memory storage, distillation, embedding, retrieval, or chain commitment in Dixie.
- No new schema types in `app/src/types/` for memory/reputation/access/commitment/identity/credential. Reference Hounfour.
- No middleware ordering change. Any temptation to reorder is a Q1 review question, not a code change.
- No DB migration, no `app/src/db/` change.
- No new chain-specific code or chain ID in Dixie.
- No Discord/Telegram/admin UI/token-gating implementation.
- No `.claude/` / System Zone edit.
- No package.json, lockfile, or `deploy/` change.
- No on-chain LLM claim. Per research, the LLM stays off-chain; Dixie copy must reflect that.

---

## 10. Acceptance criteria (planning phase only)

- [ ] PRD draft accepted by @deep-name in PR comment.
- [ ] SDD draft accepted by @deep-name in PR comment.
- [ ] Sprint plan accepted by @deep-name in PR comment.
- [ ] Cross-repo ownership confirmed: Hounfour #57 lands first, then Finn #155, then Dixie shadow surface.
- [ ] Freeside follow-up explicitly deferred and noted in vision/registry, not opened as an issue.
- [ ] Open questions Q1–Q5 (below) answered by @deep-name.

---

## 11. Open questions for @deep-name

**Q1 — Middleware ordering.** The `memory-context.ts` middleware exists today. If a memory-aware BFF response requires governance evaluation *after* memory context is loaded (e.g., to gate based on what was retrieved), middleware ordering changes. **This is not assumed; it is flagged.** Should we (a) keep ordering and constrain product behavior, (b) propose an ordering change in a follow-up RFC, or (c) handle this entirely in Finn before Dixie sees the result?

**Q2 — Provenance labels.** The trust-label model from research §22 has ten entries. Should Dixie return all ten, a curated subset for the oracle/BFF context, or treat labels as Hounfour-owned vocabulary in #57?

**Q3 — Access-policy preview endpoint.** Is exposing "would I be allowed to decrypt this?" as a separate endpoint acceptable, or should that signal only ride along with the actual read?

**Q4 — Reputation aggregate scope.** Reputation event/aggregate schema lives in Hounfour. Does Dixie expose only the aggregate read, or also signed validation records? (If validation records, Hounfour scope grows.)

**Q5 — Freeside boundary.** Is "agentic layers for Discord/TG/admin/token-gated controls" a *future Freeside scope* (preferred), or could a shadow-mode admin endpoint live in Dixie temporarily? Default in this draft: future Freeside scope only.

---

## 12. Status

DRAFT pending @deep-name review. Do not implement.
