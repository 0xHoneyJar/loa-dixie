# Phase 32F — Recall Wedge Readiness Checkpoint

> **Phase**: 32F
> **Branch context**: `phase-32f-recall-wedge-readiness-checkpoint`
> **Related**: Phase 32A–32E (loa-dixie); freeside-characters Phases 33A–36E
> **Status**: docs-only checkpoint / addendum over the Phase 32E route contract

This document is a **cross-repo readiness checkpoint** that interprets the
already-merged Phase 32E Dixie Recall Wedge route contract for downstream
freeside-characters reconciliation. It does not introduce new contract
material. It does not replace Phase 32E. It is a pointer / addendum that
records what Phase 32E does and does not unblock for sibling repos.

---

## 1. Status and purpose

- Phase 32F is **docs-only**.
- Phase 32F adds **no** route, handler, middleware, package, lockfile,
  test, CI configuration, runtime, storage, auth, or live integration
  change to this repo.
- Phase 32F is a checkpoint / addendum over the existing Phase 32E
  Dixie Recall Wedge route contract.
- Phase 32F does **not** replace Phase 32E. The governing contract
  remains `docs/integration/phase-32e-recall-wedge-route-contract.md`.
- Phase 32F does **not** define new Straylight semantics.
- Phase 32F does **not** authorize a live freeside-characters Dixie
  client, a live Discord/Telegram wiring, a public renderer expansion,
  a production storage path, or a live memory admission path.

The audience for this document is the next freeside-characters phase
(see §9) and any future Dixie phase that needs to cite Phase 32E from a
cross-repo perspective.

---

## 2. Phase 32E source-of-contract

- Phase 32E is the **governing Dixie Recall Wedge route contract**
  document.
- The governing source file is
  `docs/integration/phase-32e-recall-wedge-route-contract.md`.
- The route under contract is **`POST /api/recall/intake`**.
- Dixie consumes and serves Straylight recall-intake responses through
  its BFF route at that path.
- Dixie owns the HTTP / BFF route behavior:
  - ingress refusal handling (auth, body shape, payload size, rate
    limit, missing `Idempotency-Key`, cross-tenant body mismatch);
  - idempotency / replay behavior under the per-estate mutex and the
    pinned idempotency cache;
  - HTTP status mapping for served, denied, and `needs_review`
    outcomes (e.g. `200`, `400`, `403`, `503`);
  - no-leak guarantees at the HTTP surface, including the served-path
    redaction receipt shape and the denied-path refusal envelope shape.
- **Straylight** remains the semantic owner of:
  - Recall Wedge policy;
  - recall envelope semantics;
  - tenant redaction semantics;
  - actor-private exclusion;
  - contested marking;
  - revocation and forgetting;
  - receipt-hash computation;
  - denied-recall reason vocabulary (`DeniedReason`).
- Dixie does **not** become the semantic owner of governed memory or
  admission. Dixie maps Straylight reason tokens to refusal classes via
  `mapSeamResponseToRefusal` and emits them as opaque `raw_reasons`;
  this mapping is HTTP-surface plumbing, not semantic ownership.

This source-hierarchy statement is consistent with Phase 32E §1 and §4
and is restated here so that downstream consumers do not have to
re-derive it.

---

## 3. Why the older freeside-side request is now partially satisfied

- freeside-characters Phase 36E
  (`docs/RECALL-WEDGE-DIXIE-CONTRACT-REQUEST.md`) requested a
  Dixie-owned (or explicitly cross-repo-accepted) Recall Wedge envelope
  / route contract before any live Dixie client work could land in that
  repo.
- The freeside-side ladder leading up to that request — Phase 35D
  recorded Dixie envelope fixtures + adapter + tests; Phase 36B
  expanded recorded corpus; Phase 36C dev/operator runner; Phase 36D
  live-Dixie readiness checkpoint; Phase 36E cross-repo contract
  request — was deliberately fixture-bound and contract-bound, with
  live work blocked until a Dixie-owned artifact appeared.
- Phase 32E now exists on Dixie main and gives downstream consumers a
  Dixie-owned **route-contract artifact** (HTTP route, served body,
  denied / refused mapping, idempotency / replay behavior, explicit
  non-ownership) to reconcile against.
- Phase 32F **records this readiness interpretation** for the next
  freeside-characters phase to cite. Phase 32F itself does **not** add
  contract material; the contract is Phase 32E.
- Reconciliation against Phase 32E is the next required step on the
  freeside side. It is **not** authorization for live network calls.

---

## 4. Downstream unblock decision

> Phase 32E is sufficient to unblock a downstream freeside-characters
> contract-reconciliation phase against Dixie's documented
> `POST /api/recall/intake` behavior; it is not sufficient to unblock
> live network calls, Discord/Telegram command wiring, production
> storage/admission, or public renderer expansion.

What this means in practice:

- Downstream freeside-characters **may** compare its local recorded
  Dixie envelope fixtures (under
  `docs/recall-wedge/fixtures/dixie-envelope/`) and its pure adapter
  (`packages/persona-engine/src/recall-wedge/dixie-envelope-adapter.ts`)
  assumptions against Phase 32E's documented route, served-body
  shape, refusal mapping, and idempotency / replay behavior.
- Downstream freeside-characters **may** update recorded fixtures,
  fixture README text, the fixture validator, and the adapter unit
  tests / regression tests to align with Phase 32E.
- Downstream freeside-characters **may** document divergences — fields,
  outcome shapes, error codes, version handling, refusal envelopes —
  that the local probes can no longer claim once Phase 32E is the
  reference.
- Downstream freeside-characters **must** remain fixture-bound or
  contract-bound. No live Dixie client, no network call, no
  `@loa/dixie` / `@loa/straylight` runtime dependency, and no live
  Finn / public-renderer wiring may be added unless a later
  Dixie-side or freeside-side phase **explicitly** authorizes it.

---

## 5. Explicitly still blocked

Phase 32E is a route-contract artifact. It does **not** authorize, and
this checkpoint does **not** unblock, any of the following. Each item
below remains blocked:

- a live Dixie network client in freeside-characters;
- live Discord command wiring to Recall Wedge;
- live Telegram rendering of Recall Wedge output;
- `public_telegram` positive renderer support;
- `authorized_private_session` positive renderer support;
- production storage / admission;
- live chat / session memory admission;
- signer / auth / consent production binding;
- treating session IDs, message IDs, thread IDs, tenant IDs, or
  community IDs as governed memory identity;
- public renderer changes that expose raw receipts, debug payloads,
  hidden / private reasons, source material, actor IDs, private
  assertion IDs, `continuity_actor_id`, `raw_reasons`,
  `raw_session_trace`, `raw_dixie_debug`, hidden estate material, raw
  chat logs, or unredacted user / session internals;
- any claim that Dixie owns Straylight semantics;
- any claim that Phase 32E proves public UI / app integration of the
  Recall Wedge;
- any direct Finn runtime / audit wiring unless a separate phase
  authorizes it.

If a later phase reaches for any of the above, it must re-open the
freeside-side boundary docs (`RECALL-WEDGE-LIVE-BOUNDARY-DECISION.md`,
`RECALL-WEDGE-LIVE-DIXIE-READINESS-CHECKPOINT.md`,
`RECALL-WEDGE-DIXIE-CONTRACT-REQUEST.md`) and the Dixie-side Phase 32E
contract first; it must not silently expand scope from this checkpoint.

---

## 6. `recorded_dixie_recall_envelope` boundary

- `recorded_dixie_recall_envelope` remains a **freeside-characters
  fixture / probe `input_envelope_kind`**. It is not a Dixie-owned
  schema label and is not a live wire kind.
- Production traffic must **not** be labelled
  `recorded_dixie_recall_envelope`. That kind is reserved for
  fixture / probe input. Any live-wire traffic must use a
  distinct live `input_envelope_kind` defined by the Dixie-owned route
  contract (Phase 32E governs the Dixie surface today; any live
  `input_envelope_kind` value must be reconciled against Phase 32E and
  any future Dixie phase that expands the route, not against the
  recorded probe kind).
- Any downstream recorded fixture under
  `docs/recall-wedge/fixtures/dixie-envelope/` should be **reconciled
  against Phase 32E**, not treated as Dixie schema authority. Dixie
  shape supersedes local probe shape under divergence; the local
  probes change, not the contract.
- Unknown or unsupported envelope / route-contract assumptions should
  **fail closed** in downstream adapters, validators, and tests
  (stable error code, no public render). Defense-in-depth posture is
  unchanged.

---

## 7. Service authentication versus end-user recall authorization

Phase 32E preserves a boundary that downstream reconciliation must not
collapse. Phase 32F restates it here load-bearingly:

- **Service authentication** only proves that a calling service is
  allowed to call Dixie at all (e.g., that freeside-characters has a
  valid service credential).
- **Service authentication does not prove** that the end user, channel,
  tenant, or surface is **authorized to receive recall**. That is a
  separate decision and lives in the Straylight semantic layer and
  Dixie's denied-recall mapping (e.g., `seam.privacy_scope_refusal`,
  `seam.cross_tenant_recall_refused`, `seam.signer_not_competent`,
  `seam.blocked_by_policy`).
- A **service-authenticated request can still be recall-forbidden**.
  The route may serve a Straylight-denied envelope with a `403`-class
  refusal, and the downstream adapter must classify that as a
  user-authorization failure, not a service-auth failure.
- Downstream freeside-characters reconciliation must **not** collapse
  service auth into end-user recall authorization. The two contracts
  remain distinct on the wire and in the consumer's classification of
  refusals.

---

## 8. Public-bound minimization

Phase 32E and Phase 32F preserve the public-bound minimization rule:

- Public-bound responses must be **minimized at the source** before
  reaching public renderers. Fields not explicitly designated
  public-bound should be omitted, not included and relied-on-the-
  consumer-to-drop.
- "**The adapter will drop it**" is **not** a sufficient reason to
  pass unnecessary raw / private / operator / source fields downstream
  on a public-bound response. Defense in depth assumes upstream is
  already minimized.
- Public-bound **refusal must not leak private reasons**. Refusal
  envelopes must be informative enough for the consumer to classify
  (e.g., refusal class, stable error code) but generic enough that a
  public render of a refusal cannot leak the hidden Straylight reason
  that justified it.
- Any **operator / internal diagnostic fields** must be explicitly
  marked non-public and must not be sent to public renderers. If an
  operator-only surface exists alongside the public-bound surface, the
  partition must be unambiguous so the consumer adapter cannot mistake
  one for the other.

---

## 9. Required downstream phase shape

The next freeside-characters phase recommended by this checkpoint is:

> **Phase 37A — Dixie Contract Reconciliation for Recall Wedge
> Recorded Fixtures**

That phase should:

- consume `docs/integration/phase-32e-recall-wedge-route-contract.md`
  (in this repo, on Dixie main) as **Dixie contract evidence**;
- compare existing freeside recorded probes under
  `docs/recall-wedge/fixtures/dixie-envelope/` (Phase 35D + 36B) and
  the pure adapter
  (`packages/persona-engine/src/recall-wedge/dixie-envelope-adapter.ts`)
  against Phase 32E's served-body shape, refusal / denied mapping,
  idempotency / replay behavior, and `Idempotency-Key` requirement;
- **update recorded fixtures if needed** to track the Dixie-owned
  shape — Dixie supersedes local probes under divergence;
- **update adapter / validator / tests if needed** so adapter
  dispatch, version handling, outcome classification, refusal /
  error mapping, and source/public-bound allowlists track Phase 32E;
- **keep `public_telegram` and `authorized_private_session`
  fail-closed** unless the separate freeside-side multi-surface DTO
  gates (`RECALL-WEDGE-MULTI-SURFACE-CONTRACT.md` §5a / §8a) are
  independently satisfied — Phase 32E does not satisfy them;
- remain **no live Dixie**, **no Discord / Telegram command wiring**,
  **no public renderer expansion**, **no production storage /
  admission**, and **no character voice** on recall output.

Phase 37A is a **reconciliation** phase, not a live-client spike. A
later, separately authorized phase may consider a live-client spike
once reconciliation is complete and once any further Dixie-side or
cross-repo gates are explicitly satisfied.

---

## 10. Non-authority / non-goals

Phase 32F is explicitly **not**:

- a new API specification;
- a schema authority;
- a replacement for Phase 32E;
- a Straylight semantic contract;
- a production auth / consent design;
- a public surface design;
- an instruction to add live network calls anywhere in the ecosystem.

Phase 32F **is** a cross-repo readiness checkpoint over the
already-merged Dixie route contract. Its only contribution is the
interpretation in §4 (downstream unblock decision), §5 (still
blocked), and §9 (required downstream phase shape). Inertia does not
promote this checkpoint into a contract; the contract remains
Phase 32E.

---

## 11. Acceptance criteria

This document is acceptable if:

- only **one new docs file is added** (this file), and no source,
  test, package, lockfile, configuration, CI, or generated file is
  changed;
- it **points to Phase 32E** as the governing Dixie Recall Wedge
  route contract;
- it states that Phase 32E **unblocks downstream reconciliation,
  not live integration**;
- it preserves **Straylight semantic ownership** and **Dixie BFF-route
  ownership** as defined in Phase 32E §1 and §4;
- it preserves the **service-auth vs end-user recall authorization**
  separation;
- it preserves the **public-bound minimization** posture and the
  rule that "the adapter will drop it" is not sufficient upstream;
- it lists **what remains blocked** explicitly (§5);
- it recommends a **fixture / contract reconciliation next phase**
  for freeside-characters (Phase 37A — §9), not a live-client spike.

---

## 12. Cross-references

- `docs/integration/phase-32e-recall-wedge-route-contract.md` —
  governing Dixie Recall Wedge route contract (this checkpoint's
  source of authority).
- Phase 32A–32D test evidence under
  `app/tests/integration/recall-intake/` and
  `app/tests/unit/straylight-host/`, summarized in Phase 32E §3 and
  §5.
- freeside-characters
  `docs/RECALL-WEDGE-DIXIE-CONTRACT-REQUEST.md` (Phase 36E) — the
  cross-repo request this checkpoint partially answers.
- freeside-characters
  `docs/RECALL-WEDGE-LIVE-DIXIE-READINESS-CHECKPOINT.md` (Phase 36D)
  — readiness preconditions on the freeside side.
- freeside-characters
  `docs/RECALL-WEDGE-LIVE-BOUNDARY-DECISION.md` (Phase 36A) — live
  boundary and recorded-fixtures-not-schema-authority posture.
- freeside-characters
  `docs/RECALL-WEDGE-MULTI-SURFACE-CONTRACT.md` (Phase 35C) —
  multi-surface contract, including the authorized-private DTO gate
  (§5a) and the future-renderer warning (§8a) that remain
  independent of Phase 32E.
- freeside-characters
  `docs/recall-wedge/fixtures/dixie-envelope/` — recorded probes that
  Phase 37A reconciles against Phase 32E.
- freeside-characters
  `packages/persona-engine/src/recall-wedge/dixie-envelope-adapter.ts`
  — pure narrowing adapter; reconciliation target for Phase 37A.
