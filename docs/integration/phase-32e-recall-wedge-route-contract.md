# Phase 32E — Dixie Recall Wedge Route Contract

> **Phase**: 32E
> **Branch context**: `phase-32e-recall-wedge-route-contract`
> **Related**: Phase 32A–32D (loa-dixie), Straylight Phase 31D/31E/31F, ADR-026C, ADR-026D
> **Status**: handoff / contract consolidation, docs-only

This document consolidates what Dixie now guarantees on the Straylight Recall
Wedge route, and what Dixie explicitly does **not** own. It is engineering-facing,
intended to be cited by future Dixie phases and by sibling repos that need to
reason about the Dixie surface without re-deriving it from tests.

---

## 1. Source hierarchy

The Recall Wedge has a single source of truth, and Dixie sits below it as a
consuming server:

- **Straylight** owns Recall Wedge **semantics**.
  - tenant redaction, actor-private exclusion, contested marking, revocation,
    forgetting, receipt-hash computation, and denied-recall reason vocabulary
    are all defined and proven inside Straylight (Phase 31D/31E/31F).
- **Dixie** consumes and serves Straylight recall-intake responses through
  the BFF route at `POST /api/recall/intake`.
- **Dixie does not** define tenant redaction, actor-private exclusion,
  contested marking, revocation, forgetting, receipt hashes, or denied-recall
  semantics.

This hierarchy is intentional and is enforced at the type seam: the route
value-imports only from `@loa/straylight/runtime/recall-intake`, and all
contract types come in as type-only imports from `@loa/straylight` and
`@loa/straylight/host`.

---

## 2. Route surface

The route under contract is:

```
POST /api/recall/intake
```

Source: `app/src/routes/recall-intake.ts`.

### 2.1 Served response behavior

When Straylight returns `outcome: 'served'`:

- Dixie returns HTTP `200` with the seam response body verbatim.
- The body carries the enriched `RecallReceipt` shape, including
  `redacted_counts_by_reason: RedactionSummary[]`.
- Dixie does not recompute, reorder, or omit any field on the receipt.
- Dixie does not synthesize redaction reasons or counts.

### 2.2 Denied / refused response behavior

When Straylight returns `outcome: 'denied'` or `outcome: 'needs_review'`:

- Dixie maps the seam denial through `mapSeamResponseToRefusal`
  (`app/src/services/straylight-recall-intake/refusal-mapping.ts`) into a
  documented refusal class with a fixed HTTP status:
  - `seam.cross_tenant_recall_refused` → `403`
  - `seam.tenant_resolution_failed` → `403`
  - `seam.privacy_scope_refusal` → `403`
  - `seam.signer_not_competent` → `403`
  - `seam.blocked_by_policy` → `403`
  - `seam.frame_unsupported` → `400`
  - `seam.class_validation_failed` → `400`
  - `seam.policy_unavailable` → `503`
  - `seam.storage_unavailable` → `503`
  - `seam.capability_unrecognized` / `seam.proof_invalid` /
    `seam.capability_missing_env_key` → `503`
- Ingress refusals (auth, body shape, payload size, rate limit, missing
  Idempotency-Key, cross-tenant body mismatch) are returned with the
  matching `400/401/403/413/429` status from `ingressRefusal`.
- Dixie does not convert a denied response into a served `200`.
- Dixie preserves seam-returned `raw_reasons` for denied/needs_review
  responses. For unknown seam/internal error paths, the route may
  synthesize fallback `raw_reasons` as part of its refusal/error mapping
  (see `app/src/routes/recall-intake.ts` around lines 436–443); that
  fallback does not make Dixie the owner of Straylight denial semantics.

### 2.3 Idempotency / replay behavior

Per ADR-026D §3.b:

- An `Idempotency-Key` header is **required** (1–256 chars). Missing or
  oversized keys are refused at ingress with
  `ingress.missing_idempotency_key`.
- The first call for a given `(tenant_id, caller_actor_id, request_key)` tuple
  invokes the seam under the per-estate mutex; the response is pinned in the
  idempotency cache.
- Subsequent calls with the same tuple return the **prior response verbatim**
  via `responseFromSeam(cached)`. The seam is not re-invoked, the per-estate
  mutex is not re-acquired, and the `intakeLog` is not re-appended.
- Replay of a served response returns the same enriched receipt body (same
  `redacted_count`, same `redacted_counts_by_reason`, same `pack_hash`,
  same `receipt_hash`).
- Replay of a denied response returns the same denied envelope with the same
  refusal class, message, and `raw_reasons`. Replay does not convert denial
  into served success.
- Cap-exceeded `BoundedStoreCapExceededError` refusals deliberately bypass
  the cache so they remain re-evaluable when caps are relaxed (see
  `app/src/routes/recall-intake.ts` around line 432–462).

---

## 3. Proven guarantees from Phase 32A–32D

The following invariants are proven by tests checked into this repository.
Sibling repos and future Dixie phases may rely on them.

- The enriched `RecallReceipt.redacted_counts_by_reason` shape (Straylight
  Phase 31E) is consumed and round-tripped without field loss.
- The Dixie served path can carry a Straylight response with **nonzero**
  `redacted_counts_by_reason` to its first HTTP body without rewriting it.
- Served replay / idempotency does not re-run the seam and does not leak
  private Straylight-side source material onto the replayed body.
- Phase 32D proves the `privacy_scope_refusal` denied case maps to the
  current `403` refusal shape. Other denied/refusal classes may map to
  their existing route-specific HTTP statuses, such as `400` or `503`,
  according to the current refusal mapping. A denied response is never
  converted into a served `200`.
- Denied replay / idempotency returns the same refusal envelope verbatim,
  does not re-run the seam, and does not leak private Straylight-side source
  material onto the replayed body.
- Pack and receipt hashes remain `sha256:`-prefixed wherever Dixie exposes
  them.
- `receipt.pack_hash === pack.pack_hash` whenever both are exposed on the
  served body.
- `receipt.redacted_count === sum(receipt.redacted_counts_by_reason[i].count)`
  on every served body the route emits.
- `receipt.excluded_counts_by_reason` remains a plain
  `Record<string, number>` where applicable.

---

## 4. Explicit non-ownership / non-goals

Dixie does **not** own, and must not be cited as the source of truth for, any
of the following. Each item maps to Straylight or another sibling component.

- Dixie does **not** compute redaction. Redaction reasons and counts are
  emitted by the Straylight seam.
- Dixie does **not** interpret Straylight reason tokens. The route maps them
  to a refusal class via `mapSeamResponseToRefusal` and emits them as
  opaque `raw_reasons`.
- Dixie does **not** recompute `receipt_hash`. The Straylight-emitted hash is
  carried through unchanged.
- Dixie does **not** own recall policy. Policy semantics live in Straylight
  (Phase 31D/31E/31F) and are not re-implemented in this repo.
- Dixie does **not** own actor estate semantics. The `EstateStore` surface is
  provided structurally to the seam; Straylight defines the semantics.
- Dixie does **not** own Straylight denial semantics. The `DeniedReason`
  vocabulary is owned upstream; Dixie maps it to HTTP refusal classes only.
- Dixie does **not** replace Hounfour, Finn, or Freeside responsibilities.
  Runtime enforcement, audit integration, and public-channel surfaces remain
  with those components.

---

## 5. Test evidence matrix

Each row maps a Phase 32 test file to the specific behavior it proves. The
mock surface used in each test is `@loa/straylight/runtime/recall-intake`,
which is the only value-imported Straylight subpath used by the route. This
intentionally proves Dixie pass-through without re-proving Straylight
redaction or denial semantics.

| Phase | Test file | Behavior proven |
|-------|-----------|-----------------|
| 32A | `app/tests/unit/straylight-host/phase-32a-recall-receipt-enriched-shape.test.ts` | Dixie's `import type { RecallReceipt }` accepts the enriched Phase 31E shape; `redacted_counts_by_reason` round-trips through pass-through; `redacted_count === sum(redacted_counts_by_reason.count)`; `excluded_counts_by_reason` remains `Record<string, number>`; `pack_hash` and `receipt_hash` retain the `sha256:` prefix; zero-redaction case still emits an empty `redacted_counts_by_reason` array. |
| 32B | `app/tests/integration/recall-intake/phase-32b-served-path-redaction-receipt.test.ts` | The real `POST /api/recall/intake` route serves a Straylight response carrying nonzero `redacted_counts_by_reason` without altering the receipt; the served body preserves `redacted_count`, the reason array, the hash prefixes, and the `receipt.pack_hash === pack.pack_hash` invariant. |
| 32C | `app/tests/integration/recall-intake/phase-32c-recall-intake-no-leak-replay.test.ts` | The route's idempotency replay path returns the prior served envelope verbatim, does not re-invoke the seam, and does not leak private Straylight-side source material onto the replayed body. |
| 32D | `app/tests/integration/recall-intake/phase-32d-denied-recall-no-leak.test.ts` | The route maps a Straylight denied response onto the documented `403`-class refusal envelope, does not convert denial into served success, and replays the same denied envelope without re-invoking the seam or leaking private Straylight-side source material. |

Supporting (pre-Phase-32) coverage that this contract continues to rely on:

- `app/tests/integration/recall-intake/served-path.test.ts` — locks the
  always-present-array, sum-invariant, and hash-prefix shape on the real
  served path against an empty estate (zero-redaction branch).
- `app/tests/unit/straylight-host/phase-30-recall-wedge-contract-types.test.ts` —
  locks the type-level Straylight host surface Dixie consumes.

---

## 6. Known limitations

- Many route tests mock only `@loa/straylight/runtime/recall-intake` to prove
  Dixie pass-through. This is **intentional**: it isolates the Dixie
  contract from Straylight semantics and lets the contract evolve with the
  Straylight pin.
- These tests do not re-prove Straylight redaction or denial semantics.
  Straylight Phase 31D/31E/31F own that proof and are the authoritative
  source for how `redacted_counts_by_reason` and `DeniedReason` are
  computed.
- Staging smoke, GHCR / Finn image work, and any cross-repo deployment
  surface remain out of scope for Phase 32E.
- No public UI or app integration of the Recall Wedge is claimed by this
  document. The contract covers the Dixie HTTP surface only.
- The contract is anchored to the current Straylight pin
  (`@loa/straylight` at `34bfff8`, Straylight Phase 31F). A future
  Straylight bump that changes the receipt or denial shape will require a
  follow-up phase to refresh the contract; the compile-time tripwires in
  `app/src/routes/recall-intake.ts` (`_RecallIntakeBodyMatchesHost`) and the
  Phase 32A type assertions are designed to surface such a drift early.

---

## 7. Next recommended phase

The Dixie Recall Wedge route contract is now consolidated. The next
phase logically belongs in a sibling repo, not in Dixie.

Next recommended MVP phase: **Freeside** / public-channel / community
surface proof of the Recall Wedge output (e.g. an operator-facing view
of redaction counts or denial decisions on a public channel), unless a
newly discovered Dixie or Straylight gap blocks it.

**Finn** remains a later runtime/audit/enforcement candidate (e.g.
wiring the served envelope into Finn's audit pipeline, or enforcing
refusal classes at the runtime tier) and is **not** required for the
current Recall Wedge MVP track unless a concrete enforcement/audit gap
appears.

Final ownership of the next phase remains with the broader Loa roadmap;
the Dixie surface described here is what those phases can build on
without further Dixie work.
