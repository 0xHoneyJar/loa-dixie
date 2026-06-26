# `loa-dixie` ADR-022E gate #10 boundary-evidence-lane authorization / decomposition gate

> **Type**: `loa-dixie` repo-local **docs-only authorization / decomposition gate** for the *future candidate*
> ADR-022E **gate #10** Dixie **boundary evidence** lane (Dixie boundary wiring, `ADR-022E-phase-22-deferred-features.md:59`).
> **Branch**: `straylight-gate10-boundary-evidence-lane-authorization`.
> **Status**: docs-only. This PR adds **only this one Markdown document** under `docs/`. It changes no source, test,
> runtime, config, package, lockfile, CI, generated, hidden / workflow, memory, `.claude`, `.loa`, `.run`, grimoire,
> schema, migration, SQL, route, validator, or fixture surface, and touches no sibling repository. It **authorizes** a
> future, separate `loa-dixie` evidence PR and **decomposes what that evidence PR must prove** — and nothing more.

---

## 1. Status / verdict

**Verdict: AUTHORIZE (docs-only) a future, separate `loa-dixie` ADR-022E gate #10 *boundary evidence* lane, under
teammate review, and DECOMPOSE what that later evidence PR must prove.** This gate opens no evidence lane now, produces
no evidence, and resolves nothing.

The **#9 / #10 owner-response routing is already complete and `RECORDED`** by Loa-Straylight Phase 48L, and the **gate
#10 owner response is already `ACCEPT_RECORDED`**. No owner-response routing remains open. What remains *separate and
unresolved* is **future** work — not owner-response routing: gate #10 boundary evidence, canonical-store host-selection,
gate discharge, D.1 / D.2 advancement, and MVP-2 closure. Concretely: **gate #8 remains held**; **D.1(ii)** (the
canonical-store physical-host conjunct) **remains unresolved**; **D.1 remains not yet satisfied**; **D.2 remains not
started**; **MVP-2 remains open**.

This gate is the matching `loa-dixie` counterpart to the merged `loa-finn` PR #195 gate #9 runtime-evidence-lane
authorization / decomposition gate. Where `loa-finn` authorized and decomposed a *future* gate #9 runtime evidence lane,
this gate authorizes and decomposes a *future* gate #10 **boundary evidence** lane in `loa-dixie`. It is the next allowed
step that the `loa-dixie` gate #10 owner-response acceptance (PR #202) named.

---

## 2. What this document is

This document is a docs-only authorization and decomposition gate. It does two things and nothing else:

- **Authorizes** a *later, separate* `loa-dixie` evidence PR to inspect and cite, read-only, existing Dixie boundary /
  route-side ingress / control-plane surfaces in order to assemble evidence answering the evidence question (§4) against
  the decomposition (§7), under teammate review.
- **Decomposes** what that later evidence PR must prove (§7), under what pass and fail-closed criteria (§8).

It is **not** the evidence PR. It produces **no** evidence and asserts **no** answer. It does not implement boundary
behavior and it does not claim any boundary evidence already exists or has already passed.

---

## 3. Phase 48L / sibling context

(Taken as given from the requesting handoff; cross-repo references are not verified locally and not touched.)

- **Loa-Straylight Phase 48L (merged)** intook the sibling owner responses and classified the routing: gate #9 owner
  response `ACCEPT_RECORDED`, gate #10 owner response `ACCEPT_RECORDED`, and the **#9 / #10 owner-response routing
  completion `RECORDED`**.
- **`loa-finn` PR #194 (merged)** recorded `OWNER_RESPONSE: ACCEPT` for ADR-022E **gate #9** owner-response only.
- **`loa-dixie` PR #202** (merged, commit `c89b0b5c`,
  [`ADMISSION-WEDGE-ADR-022E-GATE-10-OWNER-RESPONSE-ACCEPTANCE.md`](ADMISSION-WEDGE-ADR-022E-GATE-10-OWNER-RESPONSE-ACCEPTANCE.md))
  recorded `OWNER_RESPONSE: ACCEPT` for ADR-022E **gate #10** owner-response only — accepting responsibility to host a
  future candidate ADR-022E gate #10 Dixie boundary evidence lane under teammate review.
- **`loa-finn` PR #195 (merged)** records the matching docs-only authorization / decomposition gate for the future
  **gate #9 runtime evidence lane**, as background sibling counterpart only. (An unrelated in-repo "PR #195" exists for
  the Dixie Phase 47V record; the PR #195 named here is the **cross-repo `loa-finn`** PR, taken as given and not verified
  locally.) This document does **not** reopen gate #9 and does **not** claim gate #9 evidence exists or passes.
- **Gate anchors (ADR-022E).** Gate #9 = Finn runtime wiring (`:58`); gate #10 = **Dixie boundary wiring** (`:59`);
  gate #11 = Freeside-as-consumer (`:60`). This gate concerns **only** gate #10.

Because Phase 48L already `RECORDED` the #9 / #10 owner-response routing, the only thing left is the *future* substantive
work (evidence, host-selection, gate discharge, D.1 / D.2, MVP-2), and this gate resolves none of it.

---

## 4. The evidence question

This gate authorizes a future evidence lane to answer one evidence question, recorded here verbatim:

> **Evidence question.** Can `loa-dixie` provide evidence, **under teammate review**, for the ADR-022E **gate #10** Dixie
> **boundary / route-side ingress / control-plane** responsibility that Loa-Straylight needs *before* the broader
> **MVP-2** Admission Wedge **D.1 / gate #8** chain can advance?

This is the question the *later* evidence PR must answer. **This gate does not answer it.** Recording the question is not
evidence, not an answer, and not an assertion that the answer is "yes."

---

## 5. Narrow authorization (and only that)

This gate authorizes exactly the following, and no more:

- A **future, separate `loa-dixie` boundary evidence PR** may, under teammate review, open the candidate ADR-022E gate
  #10 Dixie boundary evidence lane.
- That later PR **may inspect** and **may cite**, read-only, existing Dixie boundary / route-side ingress / control-plane
  surfaces, docs, tests, validators, vectors, fixtures, workflows, SQL / migration references, and route / API
  boundaries, to assemble evidence toward the evidence question (§4) against the decomposition (§7).
- It records the decomposition (§7), the pass and fail-closed criteria (§8), the allowed / forbidden surfaces (§11), and
  the return path to `loa-straylight` (§12).

The later evidence PR **must not** implement behavior unless a *still-later* implementation authorization gate explicitly
authorizes it (§13). Authorizing a future evidence lane is not producing evidence, not passing evidence, not opening the
lane now, not resolving a gate, and not any implementation or production authorization (§6).

---

## 6. Non-authorizations / preserved blocked state

This gate authorizes **only** a future evidence-lane proof / decomposition. Everything below remains exactly as held /
unresolved / unstarted / open as before. This gate:

- **does not implement** the proof — it produces no boundary evidence and writes no boundary behavior;
- **does not satisfy** `ADR-022E:59`;
- **does not satisfy** gate #10 — gate #10 remains held;
- **does not discharge** gate #8 — gate #8 remains held (cleared only as a docs / architecture / handoff prerequisite;
  the operative Straylight-side discharge stays held);
- **does not satisfy** D.1 — D.1(ii), the canonical-store physical-host conjunct, remains unresolved, so D.1 remains not
  yet satisfied;
- **does not start D.2** — D.2 remains not started, downstream of full D.1;
- **does not close** MVP-2 — MVP-2 remains open;
- selects no **canonical-store physical host**;
- proposes no **production adapter**;
- authorizes no implementation and no production wiring, and no source, test, runtime, config, package, CI, schema,
  migration, or SQL changes;
- authorizes no DB writes and no executable schema;
- authorizes no route / API / storage / DB / auth / consent / signer / Freeside / Finn / Straylight integration work;
- **does not widen** any prior narrow Dixie recall-intake / Admission Wedge spike lane; the prior narrow recall-intake /
  route-guardrail lane governed by the Straylight-repo ADR-026D decision record keeps its existing narrow scope
  unchanged;
- **does not make Dixie the canonical semantic owner** of `Assertion`, `TransitionReceipt`, `AuditEvent`, governed recall
  / admission semantics, or estate-force transitions (§9).

Owner-response routing is **not** among the unresolved items: Phase 48L already `RECORDED` it and the gate #10 owner
response is already `ACCEPT_RECORDED`. Only the future substantive work above remains separate and unresolved.

---

## 7. Decomposition — what the later evidence PR must prove

This section decomposes the evidence question (§4) into the concrete, **evidence-scoped** (not implementation-scoped)
questions the later evidence PR must answer, at minimum. Recording these defines what must be proven; it proves none of
them and asserts no answer.

1. **Implicated surface.** What exact Dixie boundary / route-side ingress / control-plane surface is implicated by
   ADR-022E gate #10? (Name the specific ingress boundary, route, and control-plane responsibility — not a behavior to
   build.)
2. **Relevant existing artifacts.** What existing Dixie files, docs, tests, route vectors, validators, fixtures,
   workflows, or SQL / migration references are relevant to that surface? (Cite read-only; do not modify.)
3. **Boundary-hosting without semantic ownership.** What evidence would show `loa-dixie` can host or enforce the required
   boundary responsibility **without becoming Straylight's canonical semantic owner** — as a `StorageAdapter` swap-in /
   ingress boundary, never a parallel canonical lifecycle?
4. **Ingress / reference / control-plane, not redefinition.** What evidence would show Dixie **carries** ingress /
   reference / control-plane records for **what Straylight defines**, rather than redefining Straylight estate semantics
   or re-minting canonical receipts? (§9)
5. **Pass criteria.** What checkable pass criteria would allow `loa-straylight` to later intake the gate #10 evidence?
   (§8)
6. **Fail-closed criteria.** What fail-closed criteria would keep gate #10 held? (§8)
7. **Allowed / forbidden surfaces.** What surfaces are allowed, and what surfaces remain forbidden until a *still-later*
   implementation authorization? (§11)
8. **Result artifact.** What result artifact should return to `loa-straylight` (§12), and in what form, so it can decide
   whether to intake it?

Each item is evidence-scoped: the later PR demonstrates / cites / records; it does not build, wire, or persist anything.

---

## 8. Pass and fail-closed criteria

These are **defined** here for the *future* evidence PR; **none is met by this gate**, because this gate produces no
evidence.

**Pass criteria** — the future evidence PR may be intaken by `loa-straylight` only if **all** hold, demonstrated by
read-only citation:

- **P-1** — the implicated Dixie boundary / route-side ingress / control-plane surface is named with `file:line` (or
  doc-section) precision, grounded in existing artifacts;
- **P-2** — the evidence shows Dixie can host / enforce the boundary as an ingress / reference / control-plane boundary,
  with `Dixie carries` references for what `Straylight defines`, and no parallel canonical lifecycle;
- **P-3** — the evidence shows Dixie does not redefine Straylight estate semantics and re-mints no canonical receipt;
- **P-4** — the evidence shows the boundary leaks no raw / private / audit / debug / source / auth / signer / consent /
  storage material (existing `FORBIDDEN_PUBLIC_KEYS` parity discipline preserved, read-only);
- **P-5** — the evidence introduces no behavior and does not widen any prior narrow lane;
- **P-6** — a return artifact (§12) is assembled in the form `loa-straylight` can intake.

Meeting all pass criteria would let `loa-straylight` *decide whether* to intake the evidence; it would **not** by itself
satisfy `ADR-022E:59`, satisfy gate #10, discharge gate #8, satisfy D.1, start D.2, or close MVP-2.

**Fail-closed criteria** — gate #10 **stays held** if **any** holds: any pass criterion unmet; the evidence asserts or
implies Dixie is the canonical semantic owner; the evidence redefines Straylight estate semantics or re-mints a canonical
receipt; the evidence leaks canonical / private material; the lane modifies behavior or widens a prior narrow lane; or
the lane attempts to select a canonical-store physical host, propose a production adapter, or authorize implementation /
production work. **Fail-closed is the default**: absent affirmative, reviewed evidence meeting every pass criterion, gate
#10 stays held.

---

## 9. Dixie / Straylight semantic boundary

Carried verbatim-in-substance from the merged chain (46M §6.4 / 46N §3 / 47T §9 / 47Z §9 / PR #202 §5):

- **Straylight remains the canonical semantic owner.** `loa-straylight` owns the canonical `Assertion`, the first-class
  `TransitionReceipt`, the append-only hash-chained `AuditEvent`, governed recall / admission semantics, and estate-force
  transitions. **Straylight defines** these canonical semantics.
- **Dixie holds boundary / ingress / reference / control-plane records only.** **Dixie carries** ingress / reference /
  control-plane records for what Straylight defines — endpoint-local contract / idempotency / replay records, ingress
  references onto the canonical chain, and the public / private projection + no-leak serializer at the Admission Wedge
  route boundary. Dixie does not become the canonical semantic owner, does not redefine Straylight estate semantics, and
  re-mints no canonical receipt.
- **The boundary is a `StorageAdapter` swap-in, never a parallel canonical lifecycle.**

---

## 10. Candidate surfaces (inspect-only)

This list orients a future evidence lane only. It is **inspect-only**, **not evidence**, **not a relevance assertion**,
**not a scoping decision**, and **not permission to modify**. Listing a surface proves nothing and asserts no relevance;
the later evidence PR establishes relevance with evidence and **must not modify** these surfaces absent a still-later
implementation authorization (§11).

Candidate surfaces a future evidence lane **may inspect** (read-only; relevance unasserted):

- **Boundary / route docs** under `docs/` — the Admission Wedge route-contract, durable-store, and gate-#8 / D.1 docs
  chain (the `ADMISSION-WEDGE-*` records);
- **Route / API boundary** — `app/src/routes/admission-intake.ts` and the admission-wedge-spike service tree
  (`app/src/services/admission-wedge-spike/`);
- **No-leak validator** — `app/src/services/admission-wedge-spike/no-leak.ts` (`FORBIDDEN_PUBLIC_KEYS` parity) and its
  tests;
- **Tests / fixtures** under `app/tests/` — admission-intake integration tests and admission-wedge-spike unit tests, plus
  any relevant fixture;
- **SQL / migration references** — `app/src/db/migrate.ts` and `app/src/db/migrations/`, for citation grounding only;
- **Workflow / route-vector references** — any relevant workflow or route-vector documentation, cited read-only.

This list is compact and not exhaustive. It asserts no relevance, makes no scoping decision, and grants no permission to
modify; the later evidence PR establishes which surfaces are actually relevant, with evidence.

---

## 11. Allowed and forbidden later evidence surfaces

**Allowed in the later evidence PR (under teammate review):**

- new docs under `docs/`;
- **read-only inspection and citation** of existing Dixie boundary surfaces — docs, route / API boundaries, validators,
  vectors, fixtures, `tests/`, workflows, and SQL / migration references;
- the docs-only return artifact returned to `loa-straylight` (§12).

**Forbidden until a *still-later* implementation authorization gate explicitly authorizes it** — the later evidence PR
**must not modify** any of:

- source / application / library code (`app/`, `src/`, `lib/`, `packages/`, `scripts/`);
- tests, fixtures, route validators, the no-leak validator, or route-vector artifacts as *behavior* (they may be cited
  read-only);
- runtime, server-boot, route handlers, store / storage code, or public-response shape;
- config, package, lockfile, or CI;
- schema, migration, migration runner, SQL, or `aw_*` schema;
- auth / consent / signer / authority / identity implementation;
- `.claude/`, `.loa/`, `.run/`, `grimoires/`, memory files, or any sibling repository.

The later evidence PR is an **inspect-and-cite-and-record** lane only. Behavior — route / API, storage, DB, migration,
auth, consent, signer, Freeside / Finn / Straylight integration — stays forbidden until a *separate, still-later*
implementation authorization gate opens it.

---

## 12. Return path to `loa-straylight`

- **Result artifact.** The later evidence PR should produce a **docs-only return artifact** in `loa-dixie` — a gate #10
  boundary-evidence record citing the implicated surface (P-1), the boundary-without-semantic-ownership evidence
  (P-2 / P-3), the no-leak and no-widening evidence (P-4 / P-5), and the pass / fail-closed disposition (§8) — assembled
  in the form `loa-straylight` can intake.
- **Return path.** That artifact is the **return path to `loa-straylight`**: `loa-straylight` may *later* intake it and
  decide whether the gate #10 boundary evidence is sufficient. As with the gate #10 owner-response (which Phase 48L
  intook as `ACCEPT_RECORDED`), any later intake of the *evidence* is `loa-straylight`'s own act in its own repo. This PR
  makes no change to `loa-straylight` and asserts no authority over it.
- **What intake would and would not do.** A future positive intake would let `loa-straylight` record that the gate #10
  boundary evidence was received; it would **not** by itself satisfy `ADR-022E:59`, satisfy gate #10, discharge gate #8,
  satisfy D.1, start D.2, select a canonical-store physical host, propose a production adapter, or close MVP-2.

---

## 13. Selected next step

- **The next step after this gate, if accepted, is a separate `loa-dixie` gate #10 boundary evidence PR.** That later PR
  — not this one — may, under teammate review, inspect and cite existing Dixie boundary surfaces to answer the evidence
  question (§4) against the decomposition (§7), and assemble the return artifact (§12).
- **It must not implement behavior** unless a *still-later* implementation authorization gate explicitly authorizes it
  (§11). The evidence PR is inspect-and-cite-and-record only.
- **No owner-response routing remains open.** Phase 48L already `RECORDED` the #9 / #10 owner-response routing and the
  gate #10 owner response is already `ACCEPT_RECORDED`. What remains separate and unresolved — owned and sequenced
  outside this gate — is the future substantive work: gate #10 boundary evidence, the canonical-store host-selection
  lane, the operative gate-#8 discharge, sibling gate #9 / #10 / #11 resolution, D.1(ii) / D.1 / D.2 advancement, and
  MVP-2 closure. This gate resolves none of it and invents no substantive successor beyond the future evidence PR.
