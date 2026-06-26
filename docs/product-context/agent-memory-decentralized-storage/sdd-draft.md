# SDD Draft — Dixie: Agent Memory + Decentralized Storage (Layer 5)

**Status**: DRAFT. Planning only. Pending @deep-name review before implementation.
**Feature slug**: `agent-memory-decentralized-storage`
**Date**: 2026-04-27
**Companion**: `prd-draft.md`, `sprint-plan-draft.md`, `issue-map.md`
**Linked**: [loa-hounfour#57](https://github.com/0xHoneyJar/loa-hounfour/issues/57), [loa-finn#155](https://github.com/0xHoneyJar/loa-finn/issues/155), [loa-dixie#89](https://github.com/0xHoneyJar/loa-dixie/issues/89)

> Architecture document scoped to Dixie's Layer 5 product/BFF/oracle responsibilities. This SDD defines no runtime, no schemas, and no community surface. References to those concerns point at Hounfour #57 and Finn #155 instead of being designed here.

---

## 1. Architecture grounding (current Dixie)

Observed surfaces relevant to this feature (read-only inspection; no edits in this draft):

- **Routes** (`app/src/routes/`): `memory.ts`, `learning.ts`, `reputation.ts`, `autonomous.ts`, `agent.ts`, `personality.ts`, `enrich.ts`, `chat.ts`, `sessions.ts`, `identity.ts`, plus `health.ts`, `admin.ts`, `auth.ts`, `fleet.ts`, `schedule.ts`, `ws-ticket.ts`, `jwks.ts`.
- **Middleware** (`app/src/middleware/`): `request-id`, `logger`, `tracing`, `cors`, `body-limit`, `rate-limit`, `allowlist`, `jwt`, `service-jwt`, `tba-auth`, `wallet-bridge`, `conviction-tier`, `payment`, `economic-metadata`, `conformance-middleware`, `memory-context`, `fleet-auth`. **Ordering is constitutional and must not be changed in this proposal.**
- **Services** (`app/src/services/`, ~70 modules) — relevant: `memory-store.ts`, `memory-auth.ts`, `pg-reputation-store.ts`, `reputation-event-store.ts`, `reputation-scoring-engine.ts`, `reputation-service.ts`, `reputation-cache.ts`, `audit-trail-store.ts`, `mutation-log-store.ts`, `governor-registry.ts`, `knowledge-governor.ts`, `governance-mutation.ts`, `governance-errors.ts`, `conviction-resolver.ts`, `conviction-boundary.ts`. **None of these are modified in this proposal.**
- **Proxy** (`app/src/proxy/`): `FinnClient` with circuit breaker is the existing path to Finn runtime.
- **Types** (`app/src/types/`): local Zod/TS types. **No new memory/reputation/access/commitment/identity/credential type is added here.**

This SDD assumes the above is current and correct as of cycle-022 ship (commit `9c0d434`). Verify before implementation begins.

---

## 2. Boundary diagram (logical)

```
┌──────────── Layer 5: loa-dixie (this proposal) ───────────────┐
│                                                                │
│   routes/memory.ts        ──┐                                  │
│   routes/reputation.ts    ──┼─→ middleware (UNCHANGED order)   │
│   routes/agent.ts         ──┘    (governance/conviction/       │
│                                   ownership/payment)           │
│           │                                                    │
│           ▼                                                    │
│   FinnClient proxy ──────────────────────────────────┐         │
│                                                       │         │
│   Provenance label assembly (research §22 vocabulary) │         │
│           │                                           │         │
│           ▼                                           │         │
│   Hounfour-typed response (passthrough, no remap)     │         │
│                                                       │         │
└───────────────────────────────────────────────────────┼─────────┘
                                                        │
                                                        ▼
┌──────────── Layer 3: loa-finn (#155) ─────────────────────────┐
│  MemoryDistiller, StorageAdapter (IPFS/Arweave/Filecoin/      │
│  Ceramic/Tableland/private), CommitmentAdapter (chain-        │
│  agnostic), IdentityAdapter, AccessPolicyAdapter,             │
│  ReputationAdapter, WalletAdapter, audit/proof log.           │
└───────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
┌──────────── Layer 2: loa-hounfour (#57) ──────────────────────┐
│  MemoryArtifact, MemorySummary, MemoryReflection,             │
│  MemoryCommitment, ChainCommitment, AgentIdentity,            │
│  AgentCredential, AccessPolicy, StoragePointer,               │
│  ReputationEvent, ValidationRecord. Conformance vectors.      │
└───────────────────────────────────────────────────────────────┘

Layer 4: loa-freeside  ── DEFERRED. Not in this proposal.
```

---

## 3. Dixie components (proposed, draft only)

All component proposals are conditional on Hounfour #57 publishing the relevant types and Finn #155 exposing the relevant runtime endpoints.

### 3.1 `routes/memory.ts` — read view (illustrative, no implementation)

- Adds **no** new sub-route until Finn #155 lands.
- Once Finn lands, adds a governance-gated GET that proxies the Finn memory-artifact metadata read and decorates with a provenance label.
- **Does not** implement retrieval, decryption, distillation, or storage adapter selection.
- **Does not** define a local memory artifact type. Imports the Hounfour type when published.

### 3.2 `routes/memory.ts` — access-policy preview (illustrative)

- Adds an `access-preview` POST that takes a Hounfour-typed `StoragePointer` reference and returns a boolean + reason code.
- All policy evaluation is Finn (`AccessPolicyAdapter`); Dixie only forwards request and applies its own auth/conviction gating.

### 3.3 `routes/reputation.ts` — aggregate read decoration (illustrative)

- Existing reputation read returns Finn-computed aggregates. The proposed change is to attach a provenance/authorship label to the response envelope, not change the aggregate semantics.

### 3.4 `routes/agent.ts` — capability manifest extension (illustrative)

- Capability manifest may include a `memoryAccessPolicy` summary field once Hounfour publishes the access-policy type. Until then, no change.

### 3.5 Provenance label assembly (Dixie-local, small)

- A pure function that maps Finn's authoring-mode signal + caller identity context to one of the research §22 trust labels.
- **Local to Dixie** because it is product-presentation, not protocol. If the *vocabulary* needs to be shared cross-service (e.g., Freeside also needs to render labels), that becomes a Hounfour question per Q2.

### 3.6 Documentation in `docs/product-context/`

- Already partially in place: `docs/product-context/agent-memory-decentralized-storage-ai-legitimacy.md` contains the research synthesis.
- Add a *boundary doc* describing what Dixie owns vs Finn vs Hounfour vs Freeside, mirroring `issue-map.md` but in the public docs tree.

### 3.7 What is intentionally NOT a Dixie component

- No `MemoryDistiller`, `StorageAdapter`, `CommitmentAdapter`, `IdentityAdapter`, `AccessPolicyAdapter`, `ReputationAdapter`, `WalletAdapter` — all Finn.
- No new schemas, conformance vectors, or compatibility rules — all Hounfour.
- No Discord/Telegram bot, admin dashboard, or token-gated UI — Freeside (deferred).

---

## 4. Finn dependency assessment (what Dixie expects to consume)

Tracked in Finn #155, repeated here for design-time review:

- A read endpoint returning `MemoryArtifact` metadata (Hounfour-typed) for a given agent + memory-type filter.
- An access-policy evaluation endpoint accepting a `StoragePointer` + caller identity context, returning allow/deny + reason.
- A reputation aggregate read returning Hounfour-typed aggregate + the underlying validation-record references.
- An authoring-mode signal on agent-generated content (which feeds the Dixie provenance label).

**If Finn cannot expose any one of these, the corresponding Dixie surface is dropped from this proposal.** Dixie does not synthesize these.

---

## 5. Hounfour dependency assessment (what Dixie expects to import)

Tracked in Hounfour #57, repeated here for design-time review:

- `MemoryArtifact`, `MemorySummary`, `MemoryReflection`
- `MemoryCommitment`, `ChainCommitment`, `StoragePointer`
- `AgentIdentity`, `AgentCredential`, `AccessPolicy`
- `ReputationEvent`, `ValidationRecord`

**If Hounfour types diverge from this list, the SDD is updated, not Dixie's local types.**

---

## 6. Freeside dependency assessment (deferred)

No Freeside dependency in this proposal. Section 6 of `issue-map.md` describes the later follow-up: a community-facing memory product feature, possibly agentic Discord/TG/admin/token-gated controls. That work depends on Hounfour and Finn landing first and is explicitly deferred until @deep-name approves a follow-up cycle.

---

## 7. Security model

The Dixie additions inherit the existing security posture:

- **AuthN**: existing `jwt`, `service-jwt`, `tba-auth`, `wallet-bridge` path. **No new auth mechanism.**
- **AuthZ**: existing `conviction-tier`, governance gating via `governor-registry` / `governance-mutation`. **No ordering change.**
- **Ownership**: dNFT/wallet ownership check uses existing pattern.
- **Payment**: x402 `payment.ts` middleware applies if Finn reports the resource as paid.
- **Memory access**: Dixie does **not** decrypt, retrieve, or hold memory content. Decryption + retrieval is Finn (`AccessPolicyAdapter`).
- **Audit**: Mutating operations write to existing `audit-trail-store` / `mutation-log-store`. The proposed read surface is non-mutating; if a read should be audited (per access-policy preview), Finn audits, Dixie does not duplicate.

### Open security review questions

- (Q1 above) If the BFF needs to gate based on retrieved memory content, ordering changes — flagged for @deep-name.
- (Q3 above) Is the access-policy preview a vector for inferring private memory metadata? Default mitigation: same conviction/ownership gates as the actual read.

---

## 8. Budget / cost implications

Dixie BFF additions are O(proxy passthrough + small response decoration). No new stores, no embeddings, no chain writes. Finn-side cost (distillation, storage, commitment) is tracked in Finn #155 and is **not** budgeted here. If a Dixie response triggers a Finn-side paid resource, x402 settlement applies through existing infrastructure.

---

## 9. Rollout strategy

| Phase | What's enabled | Visibility | Gate to advance |
|---|---|---|---|
| 0 — Docs only | This PR's docs | Public | @deep-name approves PRD/SDD/sprint |
| 1 — Hounfour landed | Types importable | None in Dixie | Hounfour #57 published, version pinned |
| 2 — Finn shadow runtime | Finn endpoints callable | Internal | Finn #155 ships behind feature flag |
| 3 — Dixie shadow surface | New routes behind feature flag, admin allowlist only | Admin only | Successful internal review |
| 4 — Limited beta | Allowlisted callers | Allowlist | @deep-name approves a follow-up cycle |
| 5 — General | Default-on | Public | Beyond this proposal's scope |

This proposal commits to phases 0–3 only. Phases 4–5 are out of scope here.

---

## 10. Test strategy (planning-only)

For phases 0–3, the test plan would include (not yet written, deferred to implementation cycle):

- Route-level tests for the read surfaces, with `FinnClient` mocked at the proxy boundary (existing pattern).
- Provenance-label assembly unit tests against the research §22 vocabulary.
- Conformance test that Dixie does **not** import or define any of the Hounfour-owned types locally (an architectural test, not a behavior test).
- No new E2E unless Finn shadow runtime is reachable in the staging environment.

Test code lives next to the affected route/service per existing convention. **No tests are written in this draft PR.**

---

## 11. Open questions (mirrors PRD)

- Q1 Middleware ordering.
- Q2 Provenance label vocabulary scope.
- Q3 Access-policy preview endpoint shape.
- Q4 Reputation aggregate vs. validation-record exposure.
- Q5 Freeside boundary timing.

---

## 12. What this SDD explicitly does not design

- Memory distillation pipeline (Finn).
- Storage adapter selection between IPFS / Arweave / Filecoin / Ceramic / Tableland / private DB (Finn).
- Chain commitment writer or chain selection (Finn; chain-agnostic).
- Identity primitive choice — DID vs NFT vs ERC-6551 vs ERC-4337 vs ERC-8004 vs chain-native equivalent (Hounfour types + Finn implementation).
- A2A / MCP / ACP / x402 wire-protocol decisions (Hounfour / Finn / Freeside as appropriate).
- Discord/TG/admin/token-gated UI (Freeside, deferred).
- Anything in `.claude/`, `app/src/db/`, `web/`, `deploy/`, `package.json`, or lockfiles.

---

## 13. Status

DRAFT pending @deep-name review. Do not implement.
