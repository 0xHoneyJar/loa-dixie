# Phase 46L — Admission Wedge ADR-022E Gate #8 Sibling Handoff Packet (Blocker Packet)

> **Phase**: 46L
> **Branch context**: `phase-46l-admission-adr-022e-gate-8-clearing`
> **Parent document**: [`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
> (the gate-clearing ADR authored in the same phase; the ADR-022E gate #8 trigger requires the
> gate-clearing ADR to cite a sibling-repo handoff packet, and the ADR reaches a **HELD** verdict —
> §1 here explains why this packet is therefore a **blocker** packet, not an implementation packet).
> **Related**: Phase 46K durable-store implementation-readiness decomposition (PR #156,
> [`ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
> §6.2, which decomposed what a future sibling handoff packet must say to avoid ownership ambiguity);
> Phase 46I durable-store design + ADR-022E gate #8 decision (PR #154,
> [`ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
> §6 ownership/adapter boundary); Phase 46H consent proof / receipt (PR #153); Phase 46G auth / identity
> / signer (PR #152); Phase 46F storage shape (PR #151); Phase 46E storage model (PR #150); the Phase
> 33K–33V storage/auth/consent chain; Straylight (`@loa/straylight`) PR #65 (merged); Straylight-repo
> ADR-022E durable-store gate #8 (and related gates #9 / #10 / #11 / #12 / #20), **held**; Straylight-repo
> ADR-022D MVP-persistence / audit-owner invariants; ADR-026C / ADR-026D route guardrails;
> freeside-characters Phase 45J / PR #177 (merged 2026-06-06).
> **Status**: **docs / decision-only.** This packet adds **only this document** (its parent ADR is the
> sibling file authored alongside it). It changes **no** route-vector JSON, **no** route-vector
> validator, **no** route-vector README, **no** Phase 33E fixture or fixture validator, and **no** runtime
> source, test, route, route handler, storage, store code, DB write, migration, auth, consent, package
> export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is a sibling handoff packet that, because its parent gate-clearing ADR reaches a HELD verdict,
> is a BLOCKER packet — it records ownership boundaries and the obligations a future sibling
> implementation packet must preserve, and it authorizes NOTHING.** It does **not** authorize sibling-repo
> edits, runtime integration, package exports, migrations, production durable storage, production
> admission, public remember-this, Discord/freeform ingestion, user chat becoming memory, final schema
> freeze, or route-contract freeze.

This packet is consistent with — and never broader than — its parent gate-clearing ADR. Where the ADR
reaches a HELD verdict, this packet behaves as a blocker packet (§1). Every statement below is grounded
read-only against the same Dixie + canonical Straylight material the parent ADR cites; it adds no new
authority.

---

## 1. Handoff status

**(1.1) This packet is active as a blocker packet only.** The parent gate-clearing ADR
([`ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md) §9)
reaches the verdict **ADR-022E gate #8 remains HELD** — the gate #8 trigger's first conjunct (a separate
ADR that *proposes the production adapter*) is unmet because the physical adapter placement and the
schema / migration plan are future-gated. The charter for this phase states: *"State whether the packet
is active only if the ADR clears gate #8. If the ADR holds gate #8, the handoff packet should become a
blocker packet rather than an implementation packet."*

> **Decision.** Because the parent ADR **holds** gate #8, this is a **blocker packet**, not an
> implementation packet. It is "active" only in the sense that it records the ownership boundaries (§2),
> the obligations a future implementation packet must preserve (§3), the non-authorizations (§4), and the
> future packets still required (§5). It is **not** active as a wiring contract: it authorizes no
> implementation, no cross-repo wiring, and no build, and it cannot be cited by any lane as authority to
> implement.

**(1.2) When this packet would become an implementation packet.** Only after (a) a future docs/decision
lane resolves the physical adapter placement and decomposes the schema / migration plan so a concrete
production adapter can be *proposed* (parent ADR §13 step 9), (b) the gate-clearing ADR is re-authored
with the gate #8 trigger's first conjunct met and **accepted**, and (c) the related sibling gates
(#9 / #10 / #11 / #12 / #20) are addressed by their own triggers — would a successor to this packet take
on an implementation-packet role. This packet does none of that and asserts none of it.

**(1.3) This packet is not broader than the ADR (§6 consistency).** Every boundary, obligation, and
non-authorization here is at most as permissive as the parent ADR. Where the ADR blocks, this packet
blocks; where the ADR defers, this packet defers. It introduces no permission the ADR does not contain.

---

## 2. Ownership boundaries

These boundaries are carried verbatim-in-substance from Phase 46I §6 and Phase 46K §6, and are recorded
here so a future implementation packet cannot leave ownership ambiguous. None is finalized by this
packet; the physical placement remains future-gated.

- **Straylight owns canonical semantics / interfaces / invariants.** The `active` `Assertion`, the
  first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, their invariants, the six
  receipt categories, and the `StorageAdapter` / `AuditLog` *interface* (ADR-022D `InMemoryStorage`
  default / `JsonlStorage` durable option) are canonical Straylight semantics (parent ADR §2.2 / §5;
  ADR-022D §1). No sibling repo — Dixie included — redefines them. Dixie does **not** build a *parallel
  canonical* assertion / transition / audit lifecycle.
- **Dixie may own route-side records and adapter integration only if later authorized.** Dixie's accepted
  ownership is contract-scoped: (a) endpoint-local contract / idempotency / replay records
  (route-contract-bound; `idempotency_final` held — Row J), (b) ingress references onto the canonical
  chain (33U Row B), and (c) the public/private response projection + no-leak serializer. Dixie **may
  later host or operate a durable adapter / persistence binding** *only if* a future ADR / gate assigns
  that responsibility — this packet does **not** assign it.
- **Physical durable adapter placement remains future-gated.** The placement decision (Dixie / Finn /
  sibling runtime) is left to the future gate-clearing ADR (parent ADR §13 step 9 / step 10). If that ADR
  assigns Dixie a route-side durable adapter, the adapter must be a **swap-in of the canonical Straylight
  `StorageAdapter` interface** (never a parallel canonical lifecycle), behind ADR-022E gate #8 and the
  relevant sibling gates (#10 / #12 / #20).
- **Finn or another sibling runtime may later own projection / audit / persistence surfaces only if
  separately authorized.** ADR-022D §2 leaves a future Postgres / sibling-runtime persistence adapter —
  which may live in **Dixie, Finn, or another sibling runtime** — to a separate ADR; `StorageAdapter` is
  the swap-in seam. ADR-022E gate #9 (Finn wiring) and gate #10 (Dixie boundary wiring) are symmetric,
  held gates; neither is selected here.
- **Freeside Characters remains a client / handoff surface, not the canonical durable store.** Per
  ADR-022E gate #11, Freeside is **not** a candidate MVP endpoint host; it consumes governed recall after
  Dixie / Finn settle. The freeside-characters mirror is test-only, not exported, not runtime-wired (45J /
  PR #177). It is never the canonical durable store, and this packet authorizes no Freeside persistence
  role.
- **Split storage remains future-gated, not the selected production architecture.** Phase 46I §7 selected
  Option 4 (split storage: Dixie route records + Straylight canonical store) as the safest topology
  **direction**, realized against the Option 3 Straylight canonical semantics/interfaces, with direct
  public/client storage writes rejected (Option 6). But the physical placement of each half is **not**
  frozen, and "selected direction" is **not** "selected production architecture" (46K §6.1).

---

## 3. Handoff obligations

These are the obligations a **future sibling implementation packet** must preserve. This packet defines
them; it discharges none and authorizes none. A future implementation packet that omits or weakens any of
them is rejected on this packet and on its parent ADR.

1. **Tenant / estate / actor partitioning.** `(tenant_id, estate_id)` partitioning with a foreign-tenant
   / foreign-estate write failing closed (`a.estate_id === request.estate_id`; threat-model T6); identity
   session-derived, never body-trusted (Row G; 46G §5).
2. **Candidate subject vs caller actor distinction.** The candidate *subject* (mapped to canonical
   `subject_refs`) is distinct from the *caller* actor (the session-derived principal that proposes the
   transition); neither is body-trusted (46G §5; 46K §5).
3. **Consent proof and consent receipt boundary.** A production consent proof lives on the **private audit
   record only**; service-token / operator auth is never treated as consent; consent is never inferred
   from chat text (46H §4.1 / §4.5). At most a single **disjoint opaque public-safe consent receipt
   reference** may surface, and only if a prior gate authorizes it (46H §6.1).
4. **Signer / authority boundary.** The competent signer (`signer_refs`) per `SignerCompetenceRule` /
   `Keyring` / policy that recorded the transition is distinct from the consent grantor (46H §8); signer
   material is canonical, private, never public (46G §6).
5. **TransitionReceipt and AuditEvent boundary.** The first-class `TransitionReceipt` (`transition_id` /
   `audit_event_ref` / `signer_refs` / `receipt_hash`) and the append-only hash-chained `AuditEvent`
   (`signer_refs` / `policy_decision_ref` / `previous_audit_hash` / `audit_hash`) are canonical, private,
   tamper-detectable via `verifyChain`, and never public at any depth (parent ADR §5.3; `types.ts`;
   `audit.ts:77-89`).
6. **Public-safe receipt reference boundary.** Only `public_receipt_ref` (a public-safe string where
   minted, `null` where none) crosses to the public surface for the transition receipt; never a private
   receipt id; its durable mint/resolution without operational-id leakage is a future decision.
7. **No raw / private / audit / debug / source / auth / signer / consent / storage leakage in public
   projections.** Enforced by the public-surface walk + `FORBIDDEN_PUBLIC_KEYS` (hardened with the 37
   canonical / consent key names — Phase 46J) + substring / regex / UUID / opaque-run walks; the runtime
   `no-leak.ts` exact-key mirror is owed before implementation (parent ADR §8; 46K §7).
8. **Idempotency / replay identity scoping.** The final endpoint key is scoped by the bound identity;
   identical retry → same result (no duplicate); conflicting retry under the same key / different identity
   → **fail closed** (Row J; 46G §7); the durable replay envelope is unresolved.
9. **No partial recallable assertion on rollback / failure.** Any rollback / recovery path must leave
   **no** recallable partial assertion — a failed or rolled-back admit must be indistinguishable, for
   recall, from one that never happened; a transition + assertion + receipt + audit write either all
   commit or none do (46K §10).
10. **Supersession / correction ordinary-recall behavior.** A corrected (active) assertion carries
    `supersedes_refs` (+ `linked_assertion_refs`) with the prior flipped to `superseded`; a superseded
    assertion is excluded from ordinary recall unless explicitly requested/marked (`types.ts:145-167`;
    supersede vector).
11. **Derived `recall_eligible` only as projection, not authority.** `recall_eligible` is derived at read
    time from durable inputs and **never** persisted as canonical authority (46F §7; 46I §8 item 10; 46K
    §5).

> A future implementation packet must preserve all eleven obligations. This packet records them as the
> contract a future packet inherits; it implements none of them and authorizes no work that would.

---

## 4. Non-authorizations

This packet (consistent with its parent ADR's HELD verdict — §1) explicitly does **not** authorize:

- **sibling repo edits** — no edit to `loa-straylight`, `freeside-characters`, `loa-finn`, or any sibling
  repository (ADR-022E gate #15);
- **runtime integration** — no Dixie / Finn / Freeside runtime wiring; no route/API behavior change;
- **package exports** — no `@loa/*` package export or re-export;
- **migrations** — no migration authored, applied, or authorized;
- **production durable storage** — no durable store, schema, table, store code, or DB write;
- **production admission** — production admission remains blocked; the Phase 33N dev/operator-only,
  disabled-by-default spike remains the only authorized route surface;
- **public remember-this** — no public / unauthenticated remember-this surface; direct public/client
  storage writes are rejected (46I §7 Option 6);
- **Discord / freeform ingestion** — no Discord command / history ingestion;
- **user chat becoming memory** — user chat does not become memory merely because it was said; consent is
  never inferred from chat text (46H §4.5);
- **final schema freeze** — `schema_final: false` on every vector; this packet freezes no schema;
- **route-contract freeze** — `route_contract_final: false` on every vector; this packet freezes no route
  contract.

> This packet authorizes nothing. It is a blocker packet that records boundaries and obligations; it
> grants no permission its parent ADR does not, and the parent ADR (HELD) grants none.

---

## 5. Required future packets

Before durable-store implementation can begin, the following future packets / gates are still required.
This packet defines them; it satisfies none.

1. **Durable-store production-adapter placement + schema / migration decomposition gate** — resolves the
   physical adapter placement (Dixie / Finn / sibling runtime) and decomposes the durable schema /
   migration / backfill / rollback plan, producing the gate #8 trigger's first conjunct (parent ADR §13
   step 9). **Required before** the gate-clearing ADR can be re-authored to pass.
2. **Re-authored ADR-022E gate-#8 gate-clearing ADR (passing)** — re-authors the parent ADR with conjunct
   (a) met, citing this packet's implementation-packet successor and preserving the ADR-022D invariants;
   clears gate #8 only when itself authored and **accepted** (parent ADR §13 step 10).
3. **Runtime `no-leak.ts` mirror hardening gate or accepted equivalent** — adds the deferred runtime
   exact-key mirror + matching runtime fixtures, proven fail-closed, **before implementation
   authorization** (parent ADR §8; 46K §7).
4. **Durable-store implementation-readiness acceptance gate** — ratifies the parent ADR §11 / 46K §9
   checklist against the concrete production-adapter proposal.
5. **Implementation plan / schema / migration gate** — the accepted durable data model, schema
   versioning, backfill (or no-backfill) scope, and forward-only migration (or dev-only no-migration)
   plan (46K §9 criterion 5).
6. **Rollback / partial-failure test plan** — the atomicity, partial-failure, rollback / recovery model
   against the append-only chain, with matching tests (46K §10).
7. **Dev/operator-only route/storage spike authorization gate, if needed** — a separate authorization
   (cf. Phase 33M) before any bounded default-off spike beyond the existing Phase 33N surface.
8. **Production readiness gate, if production ever becomes a candidate** — a distinct, later gate;
   reaching implementation-readiness or authorizing a bounded spike does not authorize production
   admission (46K §11).

> Each future packet is held. This packet records them so the path to implementation stays legible and so
> no lane can claim a shortcut past a required gate.

---

## 6. Consistency with the ADR — shared invariants

This packet must not be broader than its parent ADR. Because the parent ADR clears only the *paper gate*
form — and in fact reaches a **HELD** verdict — this packet does not behave like implementation
authorization (§1, §4). To keep the two documents consistent, the following invariants are preserved in
**both** the parent ADR (its §12) and this packet; any future gate-clearing ADR, sibling implementation
packet, design, or implementation lane must carry each forward unchanged:

1. **A pending candidate is not recallable.**
2. **A rejected candidate creates no admitted assertion.**
3. **An accepted candidate creates / references an admitted assertion.**
4. **A superseded assertion is excluded from ordinary recall** unless explicitly requested/marked.
5. **A malformed / unsafe payload fails closed.**
6. **Missing / unauthorized auth fails closed.**
7. **Missing / invalid consent fails closed in any future production admission model.**
8. **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage
   material.**
9. **Private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.**
10. **User chat does not become memory merely because it was said.**
11. **Public remember-this remains blocked.**
12. **Discord / freeform history ingestion remains blocked.**
13. **Production admission / storage / auth / consent remains blocked.**
14. **Route-contract freeze and final schema freeze remain blocked unless separately authorized.**
15. **`recall_eligible` remains derived / non-authoritative; never persisted as canonical authority.**
16. **ADR-022E gate #8 remains uncleared** (parent ADR HELD); the related gates #9 / #10 / #11 / #12 / #20
    remain held.
17. **Auditability without rewriting history** — the canonical audit log is append-only, hash-chained, and
    tamper-detectable via `verifyChain`; a consent / auth-decision reference recorded onto it inherits
    that tamper-evidence without becoming public.

> **The packet is at most as permissive as the ADR.** The parent ADR holds gate #8 and authorizes
> nothing; this packet authorizes nothing. Every invariant above holds in both documents, so a reader of
> either reaches the same boundaries.

---

## 7. Blocked lanes

This packet authorizes **none** of the following; each remains **blocked**, identical to the parent ADR
§14:

- durable Admission Wedge storage implementation (ADR-022E gate #8 held); DB writes; migrations; a durable
  data model, schema, or table definition;
- clearing ADR-022E gate #8 (the parent ADR reaches HELD) or the related gates #9 / #10 / #11 / #12 / #20;
- the runtime `no-leak.ts` mirror hardening (deferred; owed before implementation authorization);
- production auth / consent / identity-binding / signer-authority implementation; the production signature
  substrate;
- final idempotency / replay semantics (Row J);
- route / API handler implementation beyond the existing Phase 33N spike; production admission;
- public remember-this; Discord ingestion; user chat becoming memory; direct public/client storage writes;
- Freeside Characters runtime / client integration; the consent UX; package exports; LLM / voice / Finn
  runtime behavior; MVP 3 forget / revoke / correction UI;
- the final Dixie route contract; route-contract freeze; final / production schema freeze; production
  readiness of any kind; an implementation-readiness claim;
- persisting `recall_eligible` as canonical authority; freezing the physical durable adapter placement;
- any mutation of the five route-vector JSONs, the route-vector validator, the route-vector README, the
  Phase 33E fixtures, or the Phase 33E fixture validator.

---

## 8. Corruption / duplicate guard

This packet applies the same corruption / duplicate guard as its parent ADR:

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 9.`) appears exactly
  once.
- **Numbered sections appear once each.** Sections 1–9 each appear exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** No Markdown tables appear in this packet; the structure is list-based.
- **Balanced fenced code blocks.** This packet contains **no** fenced code block (zero triple-backtick
  fences); the validation commands live in the parent ADR §16, which runs the whitespace check on this
  file too.

---

## 9. Cross-references

- [`docs/ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md`](ADMISSION-WEDGE-ADR-022E-GATE-8-CLEARING-ADR.md)
  — the parent gate-clearing ADR authored in this same phase; reaches the **HELD** verdict (its §9) that
  makes this a blocker packet (§1); its §16 runs the validation suite (including the no-index whitespace
  check on this file).
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md`](ADMISSION-WEDGE-DURABLE-STORE-IMPLEMENTATION-READINESS-DECOMPOSITION.md)
  — Phase 46K (PR #156); its §6.2 decomposed what a future sibling handoff packet must say to avoid
  ownership ambiguity (the basis for §2 / §3 here), and its §9 defined the implementation-readiness
  checklist this packet's §5 future packets map onto.
- [`docs/ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md`](ADMISSION-WEDGE-DURABLE-STORE-ADR-022E-GATE.md)
  — Phase 46I (PR #154); its §6 ownership/adapter boundary and §7 split-storage direction ground §2.
- [`docs/ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md`](ADMISSION-WEDGE-CONSENT-PROOF-RECEIPT-DECISION-GATE.md)
  — Phase 46H (PR #153); the consent boundary (§4.1 / §4.5), the consent-proof object model, the disjoint
  public-safe consent-receipt reference (§6.1), and the signer-vs-grantor distinction (§8) ground §3.
- [`docs/ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md`](ADMISSION-WEDGE-AUTH-IDENTITY-SIGNER-AUTHORITY-DECISION-GATE.md)
  — Phase 46G (PR #152); the session-derived identity binding, the `subject_refs` mapping, and the
  signer/authority boundary ground §3.
- `loa-straylight/docs/decisions/ADR-022E-phase-22-deferred-features.md` (gate #8 at `:57`; preamble at
  `:43-46`; sibling gates #9 / #10 / #11 / #12 / #15 / #20) and
  `loa-straylight/docs/decisions/ADR-022D-mvp-persistence-and-audit-owner.md` (the receipt/audit-chain
  invariants at `:47-67` / `:109-127`) — inspected **read-only** as the canonical authority for §2 / §4 /
  §6. **Not edited by this phase.**
- freeside-characters Phase 45J / PR #177 (merged 2026-06-06) — Freeside remains a client/handoff surface,
  never the canonical durable store (§2). **Not edited by this phase.**
