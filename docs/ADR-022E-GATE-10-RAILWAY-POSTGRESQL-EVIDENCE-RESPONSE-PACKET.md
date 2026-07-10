# `loa-dixie` ADR-022E gate #10 — Railway PostgreSQL evidence response packet

> **Type**: `loa-dixie` repo-local **docs-only evidence response** artifact for Straylight gate #8 sibling
> evidence intake, scoped to the Dixie **gate #10** boundary posture relative to the **Railway PostgreSQL
> recommended candidate class** named by the Loa-Straylight Phase 49J/49K/49L chain.
> **Phase**: Phase 49N: Dixie gate #10 Railway PostgreSQL evidence response.
> **Branch**: `gate10-railway-postgresql-evidence-response`.
> **Status**: docs-only. This PR adds **exactly three Markdown documents** under `docs/` (this packet, the
> boundary-evidence document, and the rollup). It changes no source, test, runtime, config, package, lockfile,
> CI, schema, migration, SQL, generated, hidden / workflow, memory, `.claude`, `.loa`, `.run`, or grimoire
> surface, and touches no sibling repository. It **records an evidence response** — and nothing more.

---

## 1. Result token

**`DIXIE_GATE_10_RAILWAY_POSTGRESQL_EVIDENCE_RESPONSE_RECORDED`**

Recording this token records only that the Dixie-side evidence response was authored and returned for
Straylight intake. It records **no** gate satisfaction, **no** candidate acceptance, **no** host selection,
and **no** implementation authorization.

---

## 2. Authorization context

- **Loa-Straylight Phase 49L (merged)** authorized the later opening of bounded docs-only sibling-owner
  evidence PRs in `loa-finn` (gate #9) and `loa-dixie` (gate #10) responding to the Phase 49J/49K/49L
  Railway-PostgreSQL-candidate-class evidence request. This PR is the Dixie sibling-owner evidence response
  so authorized — and only that.
- Cross-repo references (Phase 49J/49K/49L artifacts, ADR-022E gate anchors) are taken as given from the
  dispatch authorization; they live in the sibling `loa-straylight` repository and are **not verified
  locally** and **not touched** by this PR.
- Prior Dixie-local gate #10 context, verified locally in this checkout:
  - `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md` (evidence-lane authorization),
  - `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-RESULT.md` (gate #10 boundary evidence result: `PARTIAL`, gate #10 held),
  - `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-OWNER-RESPONSE-ACCEPTANCE.md` (owner-response acceptance).

---

## 3. Explicit non-claims (fail-closed)

This PR does **not** claim, imply, or advance any of the following:

1. Straylight gate #8 is satisfied — **not claimed**.
2. Finn gate #9 is satisfied — **not claimed**.
3. Dixie gate #10 is satisfied — **not claimed**.
4. Railway PostgreSQL is accepted — **not claimed**.
5. A host is selected — **not claimed**.
6. A production database is selected — **not claimed**.
7. An adapter is proposed — **not claimed** (no adapter design appears anywhere in this PR).
8. Implementation is authorized — **not claimed**.
9. Production wiring is authorized — **not claimed**.

This PR implements nothing.

---

## 4. Response to the Phase 49J/49K/49L request topic shape

### 4.1 Boundary / evidence posture relative to Railway PostgreSQL as recommended candidate class

Dixie's posture toward the Railway PostgreSQL **candidate class** is **neutral and boundary-preserving**:
nothing in the local `loa-dixie` checkout couples the Dixie boundary surface to Railway, to PostgreSQL-on-Railway,
or to any other specific host. The Dixie boundary evidence (see the companion boundary-evidence document, §5–§7)
shows that Dixie's Admission Wedge boundary surface is host-agnostic by construction: a default-off, env-gated
ingress spike with non-durable, endpoint-local reference records and no production storage binding. Dixie
therefore neither endorses nor objects to the candidate class from its own boundary position; it records that
its boundary posture is **compatible with any substrate decision Straylight makes**, because the boundary
carries references rather than owning storage.

### 4.2 No semantic ownership creep into Dixie

Verified locally (see boundary-evidence document §5): `app/src` contains **zero local definitions** of the
canonical Straylight primitives (`Assertion`, `TransitionReceipt`, `AuditEvent`, `RecallReceipt`,
`EstateTransition`); every appearance is a type-only import from `@loa/straylight` or `@loa/straylight/host`.
Naming a candidate substrate class upstream does not change this: no Dixie artifact in this PR or in the local
tree defines, re-mints, or re-anchors any canonical primitive, and this evidence response introduces no new
semantic surface. **No ownership creep occurs, and none is proposed.**

### 4.3 Preservation of Straylight as semantic owner of the canonical-store boundary

Restated and preserved verbatim-in-substance from the merged gate #10 chain: **Straylight defines** the
canonical `Assertion`, the first-class `TransitionReceipt`, the append-only hash-chained `AuditEvent`, governed
recall / admission semantics, and estate-force transitions; **Dixie carries** boundary / ingress / reference /
control-plane records for what Straylight defines — and nothing more. A future canonical-store substrate,
whatever host class is eventually accepted, is **Straylight's to define, own, and accept**. This packet does
not move that boundary by a single primitive.

### 4.4 No-leak posture

This packet, the companion boundary-evidence document, and the rollup contain **no** credentials, tokens, API
keys, database URLs, connection strings, deployment endpoint URLs, deployment hostnames, ports, account IDs,
project IDs, regions, topology details, env-var values, curl examples, API examples, pricing, deployment steps,
adapter designs, implementation guidance, or production wiring instructions. On the runtime side, Dixie's
existing public-surface no-leak guard and its parity tests (cited in the boundary-evidence document §5) remain
untouched by this PR.

### 4.5 Boundary interoperability posture

Dixie's boundary surface interoperates with Straylight through narrow, already-evidenced seams: verbatim
refusal/outcome relay, type-only canonical imports, reference-carrying (never receipt-minting) records, and
delegation of recall execution to Straylight-owned code. None of these seams names or assumes a storage host.
Consequently, Dixie's interoperability posture toward a future Straylight canonical store on **any** substrate
in the candidate class is: **interoperate at the reference/relay seam only; take no dependency on the
substrate's identity, location, or shape**. No Dixie change is known to be required for interoperability at
this seam by a substrate-class choice alone; that expectation is recorded as an expectation, not a proof.

### 4.6 Railway-specific residual gaps affecting the Dixie boundary

Verified locally: the string "Railway" appears in `app/src` only in comments in `app/src/config.ts` describing
the generic PaaS convention that a platform-injected `PORT` environment variable takes precedence for the HTTP
listener — a host-neutral convention, not a Railway coupling. Residual gaps, honestly recorded:

- **Gap (not locally closable):** Dixie cannot evaluate Railway PostgreSQL's durability, backup, availability,
  or operational properties from this repo — no artifact here speaks to them. That evaluation belongs to
  Straylight's acceptance process.
- **Gap (not locally closable):** whether the eventual Straylight substrate decision imposes any boundary-side
  requirement on Dixie (e.g., on reference formats it carries) cannot be known until Straylight defines the
  substrate contract. Nothing local currently conflicts, but absence of conflict is not proof of fit.
- **No local gap found** in the boundary posture itself: the boundary spike is host-agnostic, default-off, and
  isolated from Dixie's own production DB paths (boundary-evidence document §5).

### 4.7 What Dixie can prove, cannot prove, or must defer

Summarized here; recorded in full with verified local file references in the companion boundary-evidence
document (§5–§7):

- **Can prove locally:** default-off env-gated boundary ingress; no local canonical primitive definitions;
  type-only canonical imports; reference-carrying non-durable ledger; no-leak public surface; isolation of the
  spike tree from Dixie's production DB/migration paths; no Railway-specific coupling anywhere in `app/src`.
- **Cannot prove locally:** anything about Straylight-side canonical definitions or ADR-022E anchors; anything
  about Railway PostgreSQL as a platform; end-to-end cross-repo alignment; Finn's runtime posture.
- **Must defer:** candidate acceptance, host selection, substrate contract, and gate #8 disposition to
  **Straylight**; gate #9 runtime evidence to **Finn**; adapter shape, wiring, and operational posture to a
  **later production host/adapter decision** that this PR does not propose and is not authorized to propose.

### 4.8 Whether any Dixie-side artifact is needed before Straylight candidate acceptance authority can be requested

**Dixie's answer: no known Dixie-side artifact beyond this evidence response is needed.** From the Dixie
boundary position, the evidence response returned by this PR (packet + boundary evidence + rollup) is the
complete Dixie-side input requested by the Phase 49J/49K/49L topic shape. Dixie identifies no missing
Dixie-side artifact that must exist **before** Straylight may *request* candidate acceptance authority.
Two bounded caveats: (a) this is Dixie's view from local evidence only — Straylight, as intake owner, decides
sufficiency; (b) if Straylight's later substrate contract imposes boundary-side requirements (§4.6), a further
bounded Dixie lane may be needed **after** that contract exists — a deferral, not a present gap.

---

## 5. Return for intake

This evidence response is returned to Loa-Straylight for sibling evidence intake under the Phase 49L
authorization. Intake, weighing, and any subsequent request for candidate acceptance authority occur in
Straylight, later, and are not performed, requested, or prejudged here.
