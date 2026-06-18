# Phase 47E — Lane-1 `aw_*` SQL isolation design acceptance / implementation-authorization checklist gate

> **Phase**: 47E
> **Branch context**: `phase-47e-aw-sql-isolation-authorization-checklist-gate`
> **Related**: Phase 47D (PR #175,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md))
> **selected**, on paper, a **layered Lane-1 `aw_*` SQL isolation design direction** (its §18 six-element layered
> direction — separate experimental SQL location, manifest-gated experimental runner, explicit dev/operator-only
> runner command, normal-runner + packaging hard-deny defense-in-depth, narrow path/token scope-guard
> replacement/allowlist for the later isolated path only, and negative tests proving the normal runner / packaging /
> route startup / adjacent paths remain blocked) and reached **Verdict A — select the layered design direction on
> paper for a later authorization gate, and keep all implementation BLOCKED**, selecting **this Phase 47E design
> acceptance / implementation-authorization *checklist* gate** (47D §23) next; Phase 47C (PR #174,
> [`ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md`](ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md))
> **decomposed** the Lane-1 `aw_*` SQL / migration-runner blocker (Verdict A — Lane-1 SQL remains BLOCKED) into its
> §16 required-evidence set; Phase 47B (PR #173,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-DURABLE-SPIKE-ACCEPTANCE-GATE.md))
> **accepted** the merged Phase 47A durable spike as a bounded, disabled-by-default, dev/operator-only,
> **non-production** Mode 2 JSON-snapshot proof; Phase 47A (PR #172,
> [`admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md`](admission-wedge/PHASE-47A-ROUTE-STORAGE-DURABLE-SPIKE-RUNBOOK.md))
> **implemented** Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a production DB, NOT
> `aw_*` schema) off the production migration path; Phase 46Z (PR #171,
> [`ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md`](ADMISSION-WEDGE-ROUTE-STORAGE-MODE2-IMPLEMENTATION-AUTHORIZATION-CHECKLIST-GATE.md))
> turned the Phase 46Y boundary design into the hard checklist that authorized the Phase 47A spike — **this gate is
> the Lane-1 SQL analogue of Phase 46Z, one design frontier deeper**; Phases 46Y / 46X (PR #170 / #169) **designed**
> and **decomposed** the Mode 2 migration-guard boundary (the four-class P / E / T / C migration model); Phases 46T /
> 46S (PR #165 / #164) **accepted** and **drafted** the durable-store schema / migration design (13 `aw_*` tables
> across 11 subsections; `schema_final` / `route_contract_final` **false**); Phase 46N **cleared** ADR-022E gate #8
> as a **Dixie documentation / architecture / handoff prerequisite only** while the operative Straylight-side
> discharge **remains held**; Straylight (`@loa/straylight`) PR #65 (A–O primitive review, **merged**); ADR-022E
> durable-store gate #8 (+ sibling gates **held operatively**); ADR-022D receipt / audit-chain invariants.
> **Status**: **docs / decision-only design acceptance / implementation-authorization checklist gate.** This gate
> adds **only this document** (plus a minimal forward-traceability status note in the immediate predecessor Phase
> 47D design gate and the Phase 47C decomposition gate, §27). It modifies **no** runtime source — and specifically
> does **not** modify `app/src/db/migrate.ts`, `app/scripts/copy-migrations.mjs`, `app/src/db/migrations/*.sql`,
> `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts`,
> `app/src/services/admission-wedge-spike/route-storage-spike.ts`, `index.ts`, `no-leak.ts`, `app/src/config.ts`,
> `app/src/routes/admission-intake.ts`, `app/src/server.ts`, or
> `app/tests/unit/admission-wedge-spike/scope-guards.test.ts` — and changes **no** route handler, storage / store
> code, DB write, migration, SQL file, executable schema, migration runner, packaging / copy runner, auth, consent,
> route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, fixture validator, other test,
> package export, config, env, package, lockfile, CI, generated file, or binary. No adjacent repository
> (`loa-straylight`, `freeside-characters`) is touched.
> **This is the Lane-1 `aw_*` SQL isolation design acceptance / implementation-authorization *checklist* gate** —
> the docs-only rung Phase 47D §23 named, downstream of the 47D layered design **direction**. It **accepts (or
> patches) the Phase 47D §18 layered design direction and turns it into a hard, file:line-grounded
> implementation-authorization checklist** and **decides whether that direction is precise enough to authorize a
> future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation
> implementation spike**. **It is not the spike, it implements no Lane-1 SQL, and it builds nothing.** It **adds no
> SQL, no `aw_*` schema, no migration, no executable schema; opens no DB connection; performs no DB write; executes
> no migration; edits no migration runner or packaging / copy runner; implements no auth or consent; changes no
> route / API behavior; weakens or edits no scope guard; freezes neither the route contract nor the final schema;
> discharges no operative Straylight-side gate; and claims no production readiness.** Lane-1 `aw_*` SQL itself
> **remains unimplemented and BLOCKED**; only a future **separate** implementation lane (Phase 47F),
> **acceptance-gated on this checklist**, is authorized — and it remains blocked from production / Lane-2 / freeze /
> gate-#8 work in full (§26).

Every statement below is grounded **read-only** against the actual Dixie repo at authoring time: the migration
runner `app/src/db/migrate.ts` (254 lines), the build-asset packager `app/scripts/copy-migrations.mjs` (62 lines),
the shared migration directory `app/src/db/migrations/`, the Phase 33N static scope guards
`app/tests/unit/admission-wedge-spike/scope-guards.test.ts` (364 lines), the Phase 47A migration-isolation guard
`app/tests/unit/admission-wedge-spike/durable-migration-isolation.test.ts`, the Phase 47A scope-guard refinement
evidence `app/tests/unit/admission-wedge-spike/durable-scope-guard-refinement.test.ts`, the merged Phase 47A durable
route-storage spike `app/src/services/admission-wedge-spike/route-storage-durable-spike.ts` (804 lines), the runtime
no-leak guard `no-leak.ts`, the env parsing in `app/src/config.ts`, the conditional mount + migrate call in
`app/src/server.ts` (773 lines), the Phase 47A runbook, and the predecessor decision gates (47D / 47C / 47B / 47A /
46Z / 46Y / 46X / 46S / 46T / 46N). Where a claim could not be grounded inside the read material, it is marked as
such. **The canonical Straylight `StorageAdapter` interface and the canonical `Assertion` / `TransitionReceipt` /
`AuditEvent` field shapes live in the adjacent `loa-straylight` repository (cross-repo references, not Dixie
file:line) and remain Straylight-owned (§26).**

---

## 1. Status

Phase 47E is the bounded, docs/decision-only **Lane-1 `aw_*` SQL isolation design acceptance /
implementation-authorization checklist gate** named by Phase 47D §23. Its purpose is to take the Phase 47D §18
layered design **direction** — which produced, *on paper*, a six-element isolation shape (separate experimental SQL
location, manifest-gated experimental runner, explicit dev/operator-only runner command, normal-runner + packaging
hard-deny defense-in-depth, a narrow path/token scope-guard replacement/allowlist for the later isolated path only,
and negative tests) plus an evidence-still-missing set (47D §19) and future implementation-authorization
requirements (47D §20) — and **accept or patch it, then convert it into a hard, enumerated, file:line-grounded
implementation-authorization checklist**, and finally **decide whether that checklist is precise enough to authorize
a future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation
implementation spike**.

**What this phase is, stated narrowly and exactly.** Phase 47E:

- is **docs / decision-only** — it accepts/patches the 47D layered direction, turns it into a checkable checklist,
  and records the verdict;
- is a **design acceptance / implementation-authorization *checklist* gate**, *not* an implementation, *not* the
  layered-design **direction** gate (47D), *not* the migration-runner blocker-**decomposition** gate (47C), *not*
  the durable-spike *acceptance* gate (47B), *not* the durable-spike *implementation* (47A), and *not* the schema /
  migration **design** or **design-acceptance** gates (46S / 46T);
- does **not** modify runtime source or tests — and specifically does not touch `migrate.ts`,
  `copy-migrations.mjs`, any `*.sql` migration, `route-storage-durable-spike.ts`, `route-storage-spike.ts`,
  `no-leak.ts`, `config.ts`, `admission-intake.ts`, `server.ts`, or `scope-guards.test.ts`;
- does **not** implement Lane-1 `aw_*` SQL, an isolated experimental SQL location, a manifest, a dev/operator
  runner, or a refined / replacement scope guard;
- does **not** create migrations, SQL files, or executable schema, and does **not** execute any migration;
- does **not** write DB code or perform any DB write;
- does **not** edit, weaken, add, or remove any migration runner, packaging / copy runner, or scope guard;
- does **not** change route / API behavior;
- does **not** implement or unblock auth, consent, or a signer model;
- does **not** authorize production admission;
- does **not** freeze the route contract;
- does **not** freeze the final schema;
- does **not** claim production readiness;
- does **not** claim or discharge the operative Straylight-owned ADR-022E gate #8 (it cannot — §17 / §26);
- **authorizes no implementation in this PR.** It authorizes only a future **separate** Phase 47F implementation
  lane, **acceptance-gated** on the §8–§18 checklist — and that lane, if it later runs, must itself pass the
  checklist before being accepted.

> **Verdict: A — the Phase 47D §18 layered Lane-1 `aw_*` SQL isolation design direction is accepted as the paper
> baseline (with one carried-forward clarifying patch, §7), and is sufficient to authorize a future, separate-PR,
> bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation implementation spike
> (Phase 47F), *acceptance-gated on the hard checklist in §8–§18*; Lane-1 `aw_*` SQL itself remains unimplemented
> and is BLOCKED from production / Lane-2 / freeze / gate-#8 work in full.** The layered direction (47D §18) is
> precise enough that the proof obligations a Lane-1 SQL isolation spike must discharge can be stated as a concrete,
> binary, file:line-grounded checklist (§8–§18). The authorization is **conditional, mode-contingent, and
> acceptance-gated**, mirroring the established Phase 46U → 46V and 46Z → 47A precedents: Phase 47F **may attempt** a
> bounded Lane-1 `aw_*` SQL isolation spike, but it is **accepted only if it proves every checklist item**, and if
> it cannot prove migration-location isolation, manifest gating, the dev/operator-only runner command, normal-runner
> and packaging hard-deny, startup non-execution, the narrow scope-guard refinement, the storage semantics, the
> no-leak boundary, and the rollback / recovery obligations **without weakening the production safety posture**, it
> must fall back (e.g. remain the Phase 47A `.json` Candidate A path) or return for a narrower gate, and **Lane-1
> `aw_*` SQL stays blocked**. **This gate implements nothing, authorizes no SQL in this PR, executes no migration,
> and discharges no Straylight-side gate.**

This maps to the prompt's recommended **Verdict A** — *Phase 47E accepts the Phase 47D layered isolation design as
the paper baseline and authorizes only a future, separate, bounded, dev/operator-only, non-production Lane-1 `aw_*`
SQL isolation implementation spike, acceptance-gated on the hard checklist in this document* — and to the chain
convention of a load-bearing decision (here: the layered direction is sufficient to authorize a **checklist-gated**
spike) paired with the selection of a single, well-bounded next lane (§25).

**Why not the conservative alternative (Verdict B).** Verdict B — keep implementation blocked and select another
docs-only design-hardening gate — was genuinely considered (§23). It would be correct *if* the layered direction
could not be made precise enough from current repo evidence. It can: the §8–§18 checklist below is binary and
grounded in actual repo file:line (the whole-directory discovery scan `migrate.ts:76-85` with predicate
`migrate.ts:79`; the ungated startup call `migrate(dbPool)` inside `if (dbPool)` at `server.ts:303-305`; the
`.sql`-only build copy `copy-migrations.mjs:36-40`, predicate `copy-migrations.mjs:39`; the AND-nested base route
gate `server.ts:655` and inner storage gate `server.ts:678`; the durable selector `server.ts:691-693`; the 19-entry
canonical denylist `scope-guards.test.ts:122-142` and forbidden-import test `scope-guards.test.ts:185-198`; the
114-key no-leak parity). The one thing Phase 47D deliberately left open — *which* combination of layers a future
lane actually builds (separate location vs manifest vs hard-deny vs a refined guard) — does **not** prevent a
precise checklist, because the checklist states the **proof obligations** the chosen combination must satisfy (§8,
§9, §11, §12) rather than pre-selecting a mechanism. Verdict B is therefore not forced; it is the documented
fallback the §18 Codex checklist itself triggers if Phase 47F cannot satisfy migration isolation safely (§23 / §25).

---

## 2. Scope

Phase 47E is **strictly docs/decision-only**. It is the acceptance / authorization-checklist rung of the Lane-1
`aw_*` SQL isolation chain — one frontier deeper than the Mode 2 storage chain that already produced the Phase 47A
`.json` spike. It is **bounded** to:

- accepting (or patching) the Phase 47D §18 layered design direction (§5, §7);
- converting that direction into a hard, file:line-grounded checklist (§8–§18);
- deciding whether the checklist is precise enough to authorize a future separate-PR implementation spike (§7, §24);
- defining the future implementation file-scope envelope (§19), forbidden surfaces (§20), validation matrix (§21),
  and Codex audit checklists (§22 — the current docs-only §22.1 and the future Phase 47F §22.2);
- selecting a single next lane (§25) and preserving every blocked lane (§26).

It does **not**, in this PR, implement, build, execute, freeze, or discharge anything (§1, §6). It is the **Lane-1
SQL analogue of Phase 46Z** (which played this role for the Mode 2 `.json` spike): a design-to-checklist
conversion gate that authorizes only a *future separate* implementation lane, never the implementation itself.

---

## 3. Source chain

Phase 47E sits at the bottom of an explicit, PR-anchored chain. Each link is read-only input here; none is modified
except the two §27 forward-traceability status notes.

- **Phase 46Z / PR #171** — Mode 2 implementation-authorization **checklist** gate, Verdict A. The structural
  precedent for this document (design → hard checklist → authorize a future separate spike). **Not modified.**
- **Phase 47A / PR #172** — implemented Storage Mode 2 as a **file-backed `.json` snapshot store** (NOT SQL, NOT a
  production DB, NOT `aw_*` schema), off the production migration path; it sidestepped Lane-1 SQL precisely because
  the whole-directory runner (`migrate.ts:76-85`) and the `.sql`-only packager (`copy-migrations.mjs:36-40`) would
  auto-adopt a misplaced `aw_*.sql` into the production set. **Not modified.**
- **Phase 47B / PR #173** — durable-spike **acceptance** gate, Verdict A. Accepted Phase 47A as a bounded,
  disabled-by-default, dev/operator-only, **non-production** Mode 2 JSON-snapshot proof. **Not modified.**
- **Phase 47C / PR #174** — Lane-1 `aw_*` SQL / migration-runner **blocker-decomposition** gate, Verdict A.
  Decomposed the blocker (migration discovery/adoption, packaging/copy, runner-isolation, scope-guard, storage
  semantics, public/private, auth/consent/signer, rollback/recovery) and kept Lane-1 SQL blocked. **Gains a minimal
  Phase 47E status note (§27).**
- **Phase 47D / PR #175** — Lane-1 `aw_*` SQL isolation **design** gate, Verdict A. Compared candidates A–H against
  the §8 requirements, selected the §18 layered direction as paper input, recorded the evidence still missing (§19)
  and the future authorization requirements (§20), and **selected this Phase 47E checklist lane** (§23). **The
  selecting predecessor; gains a minimal Phase 47E status note (§27).**
- **Phases 46Y / 46X / PR #170 / #169** — the four-class P / E / T / C migration model (Production / Experimental /
  Test / Copy) and the Mode 2 enablement blocker decomposition the 47D candidates reference. **Not modified.**
- **Phases 46S / 46T / PR #164 / #165** — drafted and accepted the durable-store schema / migration design (13
  `aw_*` tables across 11 subsections; `schema_final` / `route_contract_final` **false**; **no concrete
  durable-store `aw_*` SQL env-gate name established**). The `aw_*` table set the Class-E classification refers to;
  **not modified, not frozen.**
- **Phase 46N / Candidate D (46M)** — gate #8 bounded **paper** clearing and the split-storage production-adapter
  proposal input. The §26 boundary that keeps Lane-2 canonical migrations and the operative Straylight-side
  discharge blocked; **not modified.**
- **`@loa/straylight` PR #65 (merged)** + **ADR-022E / ADR-022D** — the canonical primitive / substrate owner and
  the decision records cited as guardrails (§17 / §26). Cross-repo references, **not edited.**

---

## 4. Phase 47D intake

Phase 47D selected, **on paper only**, a layered Lane-1 `aw_*` SQL isolation design **direction** (47D §18),
combining six elements drawn from its candidate analysis (47D §9–§16):

1. **A separate experimental SQL location outside normal production migration discovery** (Candidate B / 47C P1) —
   `aw_*` experimental SQL would live **outside** `src/db/migrations/`, so the production `discoverMigrations()`
   scan (`migrate.ts:76-85`, single `MIGRATIONS_DIR` at `migrate.ts:23`) and the `copy-migrations.mjs` `SRC_DIR`
   scan (`copy-migrations.mjs:23`, `:36-40`) never see it.
2. **A manifest-gated experimental runner** (Candidate C / 47C P2) — experimental SQL applies **only via** an
   explicit manifest naming exact files; the production runner never consults it; tests must prove the manifest
   cannot be bypassed. **The manifest protects only the future experimental runner path** (§7).
3. **An explicit dev/operator-only runner command** (Candidate D / 47C P3) — disabled by default, strict
   `=== 'true'`, explicit operator acknowledgement, **never** on app startup, **never** called by the ungated
   production startup migrate at `server.ts:303-305`.
4. **Normal-runner hard-deny / packaging hard-deny as defense-in-depth** (Candidate E / 47C P5) — a paper hardening
   layer that would refuse / exclude `aw_*` even if misplaced; **explicitly weighed against the production-runner-
   change risk and not authorized** in 47D (it stays blocked, pending the authorization gate's own security review).
   **This is the layer that covers the *normal runner* path** (§7).
5. **A narrow scope-guard replacement / allowlist for the later isolated path only** (47D §7 / §8 D; 47C §10) —
   path-specific (one named module), token-specific (only the precise tokens that module needs), with the rest of
   the spike surface kept under the existing blanket denylist (`scope-guards.test.ts:122-142`, `:185-198`).
6. **Negative tests proving the normal runner, packaging, route startup, and adjacent paths remain blocked** —
   modeled on the existing Phase 47A isolation evidence (`durable-migration-isolation.test.ts`,
   `durable-scope-guard-refinement.test.ts`) and the evasion-resistance bar (`scope-guards.test.ts:231-313`).

Phase 47D also recorded that **all** of its §19 evidence items 1–4 (a location-isolation demonstration, a
bypass-proof manifest, a dev/operator-only runner entrypoint, and a narrow replacement/allowlist guard model) have
**no repo realization today** — there is no experimental location, no manifest, no dev-only runner, and no refined
guard in the repo, and no Lane-1 SQL isolation has been demonstrated against the real runner. **Phase 47E accepts
this intake as accurate** (§7).

---

## 5. Design acceptance question

The question Phase 47E must answer is narrow: **Is the Phase 47D §18 layered design direction precise enough — as a
paper shape — to be turned into a hard, binary, file:line-grounded implementation-authorization checklist against
which a future, separate, bounded, dev/operator-only, non-production Lane-1 `aw_*` SQL isolation implementation
spike (Phase 47F) can be audited?**

This is the same question Phase 46Z answered for the Mode 2 `.json` spike, one frontier shallower. The answer turns
on whether the layered direction's proof obligations can be stated **mechanism-agnostically but concretely** — i.e.
whether the checklist can require *what must be proven* (no normal-runner adoption, no packaging inclusion, no
startup execution, narrow guard, bounded storage, no leak, fail-closed rollback) without prematurely freezing *which
mechanism* (separate dir vs manifest vs hard-deny vs naming exclusion) the future lane picks.

**Phase 47E finds that it can** (§7). The 47D layered direction is precise about the boundaries that matter
(location isolation, manifest scope, dev-only runner, hard-deny, narrow guard) and honest about the limits of each
layer (notably the Candidate C manifest limitation, §7). The single open degree of freedom — which combination of
layers the spike builds — is exactly the degree the checklist leaves to the implementer while binding the proof
obligations. The accepted direction therefore supports a precise checklist.

---

## 6. What Phase 47E does not implement

For the avoidance of doubt, and to keep the docs-only boundary explicit, Phase 47E **does not**:

- create, add, or modify any `aw_*` SQL file, migration file, or executable schema;
- create or modify an isolated experimental SQL location / directory;
- create or modify a migration manifest;
- create or modify a dev/operator migration runner script or command;
- modify the normal migration runner `migrate.ts` (discovery / execution semantics described **read-only**);
- modify the packaging / copy runner `copy-migrations.mjs` (the `.sql`-only copy filter described **read-only**);
- modify `server.ts` startup, the base route gate (`server.ts:655`), the storage gate (`server.ts:678`), or the
  durable selector (`server.ts:691-693`);
- modify the env parsing in `config.ts` or add any env gate;
- modify the durable spike `route-storage-durable-spike.ts` or the Mode-1 engine `route-storage-spike.ts`;
- weaken, edit, add, or remove any entry in the Phase 33N scope-guard denylist or import rules
  (`scope-guards.test.ts`);
- open a DB connection, perform a DB write, or execute any migration;
- change the public response shape, the route contract, or `no-leak.ts`;
- modify any route-vector JSON, route-vector validator, route-vector README, Phase 33E fixture, or fixture
  validator;
- touch any adjacent repository (`loa-straylight`, `freeside-characters`).

Phase 47E adds **only this document** plus two minimal forward-traceability status notes (§27).

---

## 7. Checklist verdict

> **Verdict A — the Phase 47D §18 layered Lane-1 `aw_*` SQL isolation design direction is accepted as the paper
> baseline (with one carried-forward clarifying patch, below) and is sufficient to authorize a future, separate-PR,
> bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation implementation spike
> (Phase 47F), *acceptance-gated on the hard checklist in §8–§18*; Lane-1 `aw_*` SQL itself remains unimplemented
> and is BLOCKED from production / Lane-2 / freeze / gate-#8 work in full.**

**The 47D layered design is ACCEPTED (not rejected, not insufficient) — as a paper baseline, with one clarifying
patch carried forward, not a new defect.** The patch is the **Candidate C manifest limitation** that Codex already
corrected in Phase 47D and that this checklist preserves verbatim in its obligations:

- **The manifest-gated runner (47D §18 element 2 / Candidate C) protects ONLY the future experimental runner
  path.** A manifest is consulted by the *future experimental* runner; the **normal** production runner
  (`migrate.ts`) never consults it. So the manifest **does not, by itself, block the normal `migrate.ts` runner from
  discovering or executing a misplaced `.sql`** (the production scan keys on `f.endsWith('.sql') && !f.includes('_down')`
  at `migrate.ts:79`, over the single `MIGRATIONS_DIR` at `migrate.ts:23`, and applies every discovered file at
  `migrate.ts:199-240`), and it does not, by itself, stop the **normal packager** from copying a misplaced `.sql`
  (`copy-migrations.mjs:36-40`, predicate `:39`). **The normal runner path is covered by Candidate B (location
  isolation) and/or Candidate E (normal-runner + packaging hard-deny)** — see §8 (Section A) and §11 (Section D).
  The checklist below therefore **never** credits a manifest alone for normal-runner protection.

Two further wording precisions are carried forward (both already patched in 47D, recorded here so the future PR
audit inherits them, §22.2):

- **Canonical vs refinement denylist distinction.** The **canonical** durable-write denylist is the **19-entry**
  `DURABLE_WRITE_DENYLIST` in `scope-guards.test.ts:122-142` (INSERT, INSERT INTO, UPDATE, DELETE, CREATE TABLE,
  ALTER TABLE, DROP TABLE, `pool.query`, `.query(`, `query(`, `.execute(`, `execute(`, `` sql` `` tagged template,
  `db.`, `database`, `pg`, `postgres`, `migration`, `migrate`), paired with the forbidden-import test at
  `scope-guards.test.ts:185-198`. The Phase 47A file
  `durable-scope-guard-refinement.test.ts:41-58` carries a **16-entry SUBSET** of that denylist (it omits `INSERT
  INTO`, bare `query(`, and `.execute(`) and its drift check (`durable-scope-guard-refinement.test.ts:101-107`)
  **spot-checks only 7 high-value tokens** against the live guard. It is therefore **subset / spot-check refinement
  evidence**, **not** a mirror or duplicate of the canonical denylist. The checklist's Section G (§14) treats
  `scope-guards.test.ts:122-142` / `:185-198` as canonical and the refinement file as evidence only.
- **No bad `migrate.ts:303-305` citation.** `app/src/db/migrate.ts` is **254 lines**; it has no line 303–305. The
  ungated production startup migrate call — `await migrate(dbPool)` inside `if (dbPool)` — lives in **`server.ts`**
  at **`server.ts:303-305`** (the `migrate` import is `server.ts:72`). Every reference below to the startup migrate
  uses `server.ts:303-305`; no `migrate.ts:303-305` citation appears anywhere in this document.

The authorization is **conditional, mode-contingent, and acceptance-gated**, exactly as the Phase 46U → 46V and
46Z → 47A precedents established:

- **Conditional.** Phase 47F is authorized to *attempt* a bounded Lane-1 `aw_*` SQL isolation spike. It is
  **accepted only if it proves every item in §8–§18.** Failure to prove migration-location isolation, manifest
  gating, the dev/operator runner command, normal-runner / packaging hard-deny, startup non-execution, the narrow
  guard refinement, the storage semantics, the no-leak boundary, or the rollback / recovery story is a **checklist
  failure** → the spike is **rejected** and Lane-1 `aw_*` SQL stays blocked.
- **Mode-contingent.** Like 46V (which chose Mode 1 *because* a durable SQL substrate tripped the guards) and 47A
  (which delivered durability as a `.json` snapshot *because* `aw_*` SQL in the shared dir would be auto-adopted),
  Phase 47F may discover that Lane-1 SQL cannot be isolated safely under §8–§14 without weakening the production
  posture. If so, it must fall back (remain the Phase 47A `.json` Candidate A path) or return for the §23 narrower
  gate. The authorization does **not** force a SQL path.
- **Acceptance-gated.** The §22.2 future Phase 47F Codex audit checklist is the gate. Phase 47F is a **separate PR**
  with its own Codex audit; this gate does not pre-approve any specific implementation.

Rejected here: **authorize SQL implementation now** (forbidden by scope — this gate builds nothing); **declare
Lane-1 SQL ready / safe** (it is neither — the spike must prove it); **modify the production migration runner**
(stays blocked); **freeze the route contract or final schema** (stays draft / non-final); **discharge gate #8**
(operatively held — §17 / §26). The conservative **Verdict B** (another docs-only hardening gate) is the documented
fallback (§23), not the chosen verdict, because the checklist *can* be made precise from current evidence (§1 / §5).

---

## 8. Migration-location isolation checklist

**Checklist Section A — migration-location isolation.** A future Lane-1 `aw_*` SQL isolation implementation PR
(Phase 47F) is **accepted only if** it proves **all** of the following. Each is binary and grounded in the actual
runner / packager; the mechanism is the implementer's choice (separate directory, manifest, naming exclusion,
separate runner, or equivalent), but **whatever mechanism is chosen must satisfy every item.** Future implementation
must prove:

- **A.1** Experimental `aw_*` SQL, if added later, is **outside the normal production migration directory**
  (`src/db/migrations/`, the single `MIGRATIONS_DIR` resolved at `migrate.ts:23`) — proven against the real path,
  not paraphrased.
- **A.2** The normal `migrate(dbPool)` **does not discover it** — proven against `discoverMigrations()`
  (`migrate.ts:76-85`, the whole-directory `readdir` filtered by `f.endsWith('.sql') && !f.includes('_down')` at
  `migrate.ts:79`) and the apply loop (`migrate.ts:199-240`).
- **A.3** Normal production migration discovery tests **fail closed if experimental SQL is misplaced** — a test
  proves that an `aw_*.sql` landing in `src/db/migrations/` is either refused by construction (Candidate E hard-deny)
  or surfaced as a failing assertion, never silently adopted (extending the existing
  `durable-migration-isolation.test.ts` A.1 evidence, which today only proves the `.json` artifact is rejected).
- **A.4** **No app startup path executes experimental SQL** — the ungated startup migrate `await migrate(dbPool)`
  inside `if (dbPool)` (`server.ts:303-305`) remains the **only** migration call, or is explicitly incapable of
  adopting experimental Class-E material (no new ungated runner invocation is added to startup).
- **A.5** **No production defaults enable experimental SQL** — there is no environment, config, or default under
  which the experimental path engages in production; the gate(s) default to off (mirroring the strict `=== 'true'`,
  fail-closed posture at `config.ts:455`, `:469-470`, `:480-481`).

---

## 9. Manifest-gated runner checklist

**Checklist Section B — manifest-gated runner.** Future implementation must prove:

- **B.1** The experimental runner uses an **exact manifest** that names the precise files it may apply.
- **B.2** The runner **refuses files not listed** in the manifest (a present-but-unlisted file is refused).
- **B.3** The runner **refuses unknown paths** (a manifested file outside the isolated experimental location is
  refused).
- **B.4** The manifest **cannot include normal production migrations** (a `src/db/migrations/*.sql` entry is
  refused).
- **B.5** The manifest **cannot include files outside the isolated experimental directory.**
- **B.6** **Manifest-gating protects ONLY the experimental runner path and does NOT itself protect the normal runner
  path.** The normal production runner (`migrate.ts`) never consults the manifest (`migrate.ts:76-85`), so a
  misplaced `aw_*.sql` in `src/db/migrations/` would still be discovered and applied regardless of the manifest.
  This is the Candidate C limitation (§7) carried forward; the future PR must state it explicitly and must not claim
  the manifest covers the normal runner.
- **B.7** **Candidate B (location isolation) and/or Candidate E (normal-runner + packaging hard-deny) covers the
  normal runner path** — the future PR must demonstrate that the normal runner path is protected by location
  isolation (§8 A.1 / A.2) and/or a fail-closed hard-deny, **not** by the manifest. (Bypass-proof manifest tests
  alone are insufficient for normal-runner protection.)

---

## 10. Dev/operator runner command checklist

**Checklist Section C — dev/operator runner command.** Future implementation must prove the experimental runner
command:

- **C.1** is an **explicit command only** — a deliberate dev/operator invocation, never an implicit side effect;
- **C.2** is **disabled by default**;
- **C.3** **requires an explicit dev/operator env / category / operator acknowledgement** (strict `=== 'true'`
  parsing, mirroring `config.ts:455` / `:469-470` / `:480-481`);
- **C.4** **never runs on app startup**;
- **C.5** **never runs through normal server boot** — it is never invoked by the ungated production startup migrate
  at `server.ts:303-305` (nor wired into the base route gate `server.ts:655`, the storage gate `server.ts:678`, or
  the durable selector `server.ts:691-693`);
- **C.6** **never runs in production defaults** — no production environment enables it;
- **C.7** has **no accidental invocation through package lifecycle scripts** (it is not wired into any `package.json`
  `scripts` `pre*`/`post*`/`build` hook the way `copy-migrations.mjs` is run after `tsc`).

---

## 11. Normal-runner hard-deny checklist

**Checklist Section D — normal-runner hard-deny.** Future implementation must prove:

- **D.1** The normal runner **refuses `aw_*` / experimental paths if misplaced, or cannot discover them by
  construction** — either a fail-closed exclusion in `discoverMigrations()` (`migrate.ts:79`) **or** location
  isolation (§8) such that the experimental material is never in `MIGRATIONS_DIR` (`migrate.ts:23`) at all.
- **D.2** **Any hard-deny change to the normal runner is minimal and fail-closed** — a narrow naming-convention
  exclusion (skip `aw_*`), not a broad rewrite; a regression in the predicate must not silently mis-skip a real
  production migration. (Modifying `migrate.ts` remains a production-runner change with its own security review and
  is **not** authorized by this gate — §20 / §26; if the future PR chooses location isolation instead, no
  normal-runner change is needed.)
- **D.3** **Existing production migrations still work** — the forward-only runner (`migrate.ts:140-254`), the
  `_migrations` tracking table (`migrate.ts:46-55`), and the seed of pre-existing migrations
  (`migrate.ts:93-132`) are unchanged in behavior; numeric-prefix ordering (`migrate.ts:80-84`) is preserved.
- **D.4** **Tests cover a misplaced experimental `.sql`** — a negative test proves a misplaced `aw_*.sql` is refused
  / undiscovered (extends `durable-migration-isolation.test.ts`).
- **D.5** **Tests cover that normal production migrations remain valid** — the production discovery predicate
  (`migrate.ts:79`) is pinned by an assertion so a future change cannot silently drift it (the existing
  `durable-migration-isolation.test.ts` A.1 test already pins `.endsWith('.sql')` and `!f.includes('_down')`).

---

## 12. Packaging/copy hard-deny checklist

**Checklist Section E — packaging / copy hard-deny.** Future implementation must prove:

- **E.1** The normal packaging / copy path **does not copy experimental SQL** — the `.sql`-only copy filter in
  `copy-migrations.mjs:36-40` (predicate `e.name.endsWith('.sql')` at `:39`, copying `src/db/migrations/*.sql` into
  `dist/db/migrations/`, `copy-migrations.mjs:23-24`) is either unchanged (so experimental material outside
  `src/db/migrations/` is never copied) or extended with a fail-closed `aw_*` exclusion.
- **E.2** **Misplaced experimental SQL fails closed or is excluded** — a misplaced `aw_*.sql` in `src/db/migrations/`
  is either refused by an exclusion or, by location isolation, never present to copy.
- **E.3** The **production bundle cannot silently include experimental material** — `dist/db/migrations/` never
  receives an `aw_*` file via the normal packager.
- **E.4** **Tests inspect the actual copy-script behavior** — a test reads `copy-migrations.mjs` (or exercises its
  predicate) to prove the `.sql` filter / exclusion holds (extends `durable-migration-isolation.test.ts` A.4, which
  today proves a `.json` artifact is rejected by the packager).

---

## 13. Startup non-execution checklist

**Checklist Section F — startup non-execution.** Future implementation must prove:

- **F.1** `server.ts` **startup does not run experimental SQL** — the ready promise's only migration call remains
  `await migrate(dbPool)` inside `if (dbPool)` (`server.ts:303-305`); no experimental runner is added to the boot
  path.
- **F.2** The **base route gate does not run experimental SQL** — the `if (config.admissionIntakeSpikeEnabled)`
  block (`server.ts:655`) mounts the route only; it executes no migration.
- **F.3** The **Mode-1 storage gate does not run experimental SQL** — the inner
  `if (config.admissionIntakeStorageSpikeEnabled)` block (`server.ts:678`) creates an in-process store only.
- **F.4** The **durable storage gate does not run experimental SQL** — the durable selector
  (`server.ts:691-693`, `const durable = config.admissionIntakeDurableStorageSpikeEnabled && …Dir.length > 0`)
  selects the `.json` durable store, which opens no DB and runs no migration; it must not be extended to run SQL.
- **F.5** **Only an explicit dev/operator command can run experimental SQL** — the sole entrypoint to experimental
  SQL execution is the §10 dev/operator runner command, never any startup or route-gate path.

---

## 14. Scope-guard refinement checklist

**Checklist Section G — scope-guard refinement.** Future implementation must prove, against the canonical Phase 33N
guards (`scope-guards.test.ts`) and the refined-guard model (47D §7; 46Y §10):

- **G.1** **Canonical scope guards remain in force** — the **19-entry** `DURABLE_WRITE_DENYLIST`
  (`scope-guards.test.ts:122-142`) and the forbidden-import test (`scope-guards.test.ts:185-198`) still apply to the
  whole spike surface (`SPIKE_FILES`, `scope-guards.test.ts:36`) except the one narrow, named, allowlisted path.
- **G.2** **No broad deletion of DB / SQL / migration / durable-write / production-store guard tokens** — no
  denylist entry and no import rule is simply removed for the whole surface.
- **G.3** **Any allowlist is exact path-specific and token-specific** — it permits only one named module and only
  the precise tokens that module needs (47D §18 element 5); it is **not** a blanket per-file opt-out (the existing
  `durable-scope-guard-refinement.test.ts:109-118` already asserts no `durable-spike` opt-out / allowlist mechanism
  exists, and any future allowlist must remain this narrow).
- **G.4** **Adjacent forbidden paths remain blocked** — raw SQL outside the narrow surface, normal DB-runner
  coupling (`/db/(client|pool|migrate|transaction)`, bare `pg`), unsafe `-store` imports (`/-store(\.js)?$/`,
  `BoundedEstateStore`), and production-store claims all still fail closed (`scope-guards.test.ts:185-198`).
- **G.5** **Negative tests prove forbidden imports / tokens fail closed** — against the **same evasion-resistance
  bar** as today (`scope-guards.test.ts:231-313` — strings, nested templates `${`//`}`, regex char classes
  `/[//]/`, and real line / block / JSDoc comment stripping via the parser-backed `stripComments`). The refinement
  file (`durable-scope-guard-refinement.test.ts`) is **subset / spot-check evidence** (16-entry subset, 7-token drift
  check) and does **not** substitute for the canonical guard (§7).

---

## 15. Storage semantics checklist

**Checklist Section H — storage semantics.** Future implementation must prove, **without claiming production
finality** (the schema stays the Phase 46S draft — `schema_final` false):

- **H.1** **No raw candidate payload persistence** — only synthetic, bounded, route-owned material (the Phase 46S
  `aw_candidate_ingress` design stores a `candidate_payload_ref`, never the raw payload).
- **H.2** **Admitted / synthetic assertion representation remains bounded and route-owned** — `active` /
  `superseded` is the canonical assertion status (Straylight-owned); Dixie stores only route-owned references /
  projections, never a parallel canonical lifecycle.
- **H.3** **Tenant / estate / actor isolation** — structural scoping (per the Phase 47A `normalizeScope` /
  `scopeKey` discipline, `route-storage-durable-spike.ts:258-272`), proven by tests; no cross-tenant leakage.
- **H.4** **Idempotency / replay ledger behavior** — repeated identical writes do not duplicate or diverge (the
  Phase 47A `record` path persists only a genuinely new `recorded` outcome, replays mint nothing).
- **H.5** **Conflict fail-closed behavior** — a conflicting write is rejected, not silently overwritten.
- **H.6** **Supersession / correction relation if included** — a Dixie-local inverse link (the Phase 46S
  `aw_supersession_link` design), never a rewrite of the canonical append-only chain.
- **H.7** **Cleanup / tombstone / drop story** — a reversible cleanup path exists (the Phase 47A `purgeDurableState`,
  `route-storage-durable-spike.ts:786-797`; the Phase 46S `aw_tombstone` design); the forward-only runner never
  auto-runs a `_down` file (`migrate.ts:79`), so any SQL drop is an explicit dev/operator action.
- **H.8** **No final schema freeze** — `schema_final` and `route_contract_final` stay false; the `aw_*` table set
  stays the Phase 46S draft (13 tables across 11 subsections), un-frozen.

---

## 16. Public/private no-leak checklist

**Checklist Section I — public / private no-leak.** Future implementation must prove, against the runtime no-leak
guard (`no-leak.ts`) at **114 = 114** parity:

- **I.1** **Public response shape unchanged** — the fixed public allowlist holds; persisted **and** replayed public
  responses deep-walk the same as a fresh response and pass the 114-key guard.
- **I.2** **No SQL / path / debug / stack leakage** — store record ids, SQL fragments, file paths, and stack traces
  never appear on the wire; a store fault collapses to the stable public-safe refusal (the Phase 47A degraded-latch
  / fail-closed posture).
- **I.3** **Public receipt references safe** — only `public_receipt_ref` (a short public-safe string, or `null`) and
  the public-safe label values (`outcome_class`, `safe_reason_code`, `recall_eligible`) cross to the public surface
  (Phase 46S §6 boundary).
- **I.4** **Private transition / audit material private** — private `TransitionReceipt` / `AuditEvent` / consent
  proof / storage material is never serialized onto the public surface.
- **I.5** **No raw payload in public or durable material** — neither the public response nor the durable artifact
  carries a raw candidate payload; the **114 = 114** runtime ↔ validator parity is preserved (a SQL-backed
  serializer cannot surface a canonical ref / hash / consent field under a short, safe-looking value that would slip
  the value-pattern walls).

---

## 17. Auth/consent/signer boundary checklist

**Checklist Section J — auth / consent / signer boundary.** Future implementation must **explicitly state** that
SQL isolation is orthogonal to, and does not solve, the production trust boundaries:

- **J.1** SQL isolation **does not solve production auth** — the dev/operator service-token + operator-id model
  (`config.ts` admission gate fields) is **not** production authentication.
- **J.2** SQL isolation **does not solve end-user authorization** — there is no end-user authorization model in a
  dev/operator-only spike.
- **J.3** SQL isolation **does not solve signer authority** — the canonical signer / receipt-signing authority is
  Straylight-owned and undischarged.
- **J.4** SQL isolation **does not solve consent proof / receipt** — consent proof / receipt remains future-gated
  (the Phase 46S `aw_consent_proof_ref` is **deferred**).
- **J.5** **All of the above remain separately gated** — each is its own future gate / blocker (§26); a SQL
  isolation spike neither implements nor unblocks any of them.

---

## 18. Rollback/recovery/cleanup checklist

**Checklist Section K — rollback / recovery / cleanup.** Future implementation must prove:

- **K.1** **A partial migration or partial write fails closed** — no half-applied `aw_*` migration or partial write
  leaves a partially-admitted, recallable synthetic assertion (the runner's per-file `BEGIN` / `COMMIT` / `ROLLBACK`
  at `migrate.ts:218-240` covers one file; the multi-statement / multi-migration recovery story for an experimental
  runner must be designed and proven).
- **K.2** **No partially admitted recallable assertion** survives a fault — the Phase 47A degraded-latch precedent
  (`route-storage-durable-spike.ts:603-625`) is matched or strengthened: a diverged write is never observable.
- **K.3** **A cleanup / drop / tombstone path exists** — an explicit dev/operator procedure to remove experimental
  objects (the Phase 46S `aw_tombstone` design; the Phase 47A `purgeDurableState` precedent,
  `route-storage-durable-spike.ts:786-797`), including the operational steps to run it.
- **K.4** **Restart recovery behavior is deterministic** — a restart re-derives a consistent state (the Phase 47A
  hydrate-by-replay precedent, `route-storage-durable-spike.ts:637-682`), never a half-loaded one (a corrupt /
  inconsistent store fails closed at construction).
- **K.5** **Dev/operator artifacts can be safely cleaned** — the experimental location / objects can be dropped
  without touching production migrations or the canonical chain.

---

## 19. Future implementation file-scope envelope

This section answers **authorization question 6 — what file surfaces a future implementation spike might touch,
without touching them now.** It applies to the **Phase 47F implementation PR only**, not to this Phase 47E gate
(which touches nothing but this doc + the two §27 notes). **Defining this envelope authorizes no file change in this
PR.**

**Potentially allowed in the future Phase 47F implementation PR only (not in this gate):**

- An **isolated experimental SQL directory outside normal production migrations** (e.g. a dev-only location the
  production `discoverMigrations()` scan at `migrate.ts:76-85` and the `copy-migrations.mjs` `SRC_DIR` scan at
  `copy-migrations.mjs:23` never read) — only if §8 proves it is undiscoverable / uncopiable.
- An **explicit manifest file** for experimental SQL — only if §9 proves it cannot be bypassed and explicitly does
  not claim normal-runner protection (§7 / B.6).
- An **explicit dev/operator runner script / command** (disabled by default, env-gated, never on startup) — per §10.
- A **minimal normal-runner hard-deny** in `migrate.ts` **only if necessary and only if its own security review
  authorizes it** — per §11 / D.2 (otherwise location isolation is preferred and no `migrate.ts` change is made).
- A **minimal packaging / copy hard-deny** in `copy-migrations.mjs` **only if necessary** — per §12 (otherwise the
  `.sql`-only filter is unchanged and location isolation suffices).
- **Narrow Admission Wedge spike service code** under `app/src/services/admission-wedge-spike/` (or an equivalent
  route-owned spike module placed per the refined-guard model), behind the existing disabled-by-default AND-gated
  gates (`server.ts:655` outer + `server.ts:678` inner + `server.ts:691-693` durable selector).
- A **config field** for any new dev/operator env gate, defaulting to off (mirroring the strict `=== 'true'`
  parsing at `config.ts:455` / `:469-470` / `:480-481`).
- **Tests** for runner isolation (§8), manifest gating (§9), the dev/operator command (§10), normal-runner hard-deny
  (§11), packaging isolation (§12), startup non-execution (§13), scope-guard refinement (§14), storage semantics
  (§15), no-leak over persisted / replayed surfaces (§16), and rollback / recovery / cleanup (§18).
- A narrow scope-guard **refinement / allowlist** (path-specific + token-specific) in `scope-guards.test.ts`
  **only** as the §14 narrow refinement, never a broad weakening.
- **Runbook docs** for dev/operator-only operation, including the §18 rollback / drop / cleanup procedure.

---

## 20. Future forbidden surfaces

This section answers **authorization question 7 — what file surfaces must remain forbidden even in the future
implementation lane unless separately authorized.** Even in the Phase 47F implementation PR, the following remain
**forbidden unless separately authorized**:

- **Production migration files** (Class-P additions in `src/db/migrations/` are out of scope for the spike).
- **Production DB writes.**
- **Production durable-store implementation.**
- **Production migration execution.**
- **Broad changes to the normal migration runner** (`migrate.ts`) or packaging runner (`copy-migrations.mjs`) — only
  a **minimal, fail-closed, separately-security-reviewed** hard-deny is conceivable (§11 D.2 / §12), and even that
  must keep production discovery / execution / packaging incapable of adopting Class-E material.
- **Broad scope-guard weakening** (`scope-guards.test.ts`) — only the §14 narrow refinement / allowlist is
  conceivable; no denylist entry or import rule may be removed for the whole surface.
- **Route-contract freeze** (`route_contract_final` stays false).
- **Final schema freeze** (`schema_final` stays false; no `aw_*` migration is claimed safe).
- **ADR-022E gate #8 discharge** (operatively held — §17 / §26).
- **Freeside runtime / client integration.**
- **Lane-2 canonical Straylight-store migrations** (each a separate sibling-repo ADR under Straylight teammate
  review).
- **Public response expansion.**
- **Raw candidate payload persistence.**
- **Package / lockfile changes** unless specifically justified by that later PR.
- **CI changes** unless specifically justified by that later PR.
- **Package exports** of the spike (it stays an internal service barrel — `scope-guards.test.ts:315-337`).

---

## 21. Future validation matrix

This section answers part of **authorization question 8 / 9 — the validation a future implementation lane must
satisfy.** Phase 47F is **accepted only if** all of the following hold (in addition to the §8–§18 proofs):

- **Full unit + integration suite green**, including new Lane-1 SQL isolation tests for migration-location isolation
  (§8), manifest gating (§9), the dev/operator command (§10), normal-runner hard-deny (§11), packaging isolation
  (§12), startup non-execution (§13), scope-guard refinement (§14), storage semantics + replay / conflict /
  fail-closed (§15), no-leak over persisted / replayed surfaces (§16), and rollback / recovery / cleanup (§18).
- **Typecheck + lint clean.**
- **Route-vector validator still `5/5`, no sixth vector** —
  `node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs`.
- **Route-vector self-check still `44/44`** (or the then-current expected equivalent) —
  `… validate-route-contract-test-vectors.mjs --self-check`.
- **Fixture validator still `5/5`** — `node docs/admission-wedge/fixtures/validate-fixtures.mjs`.
- **No-leak runtime parity preserved at `114 = 114`**.
- **No production-readiness / freeze / ADR-022E-discharge overclaim** in any doc or code comment the PR adds.
- **A separate Codex audit** (§22.2) is run on the PR and returns ACCEPT.

---

## 22. Codex audit checklists

Phase 47E carries **two distinct Codex audit checklists**, kept deliberately separate. **§22.1** is the **current**
checklist that audits *this* docs-only Phase 47E gate — the PR being read now. **§22.2** is the **future** checklist
that the later, separate, future Phase 47F implementation PR must copy verbatim and run against *that* implementation.
§22.1 audits **this document**; §22.2 audits the implementation that **does not exist yet**. The current Phase 47E
checklist (§22.1) audits this PR; the future Phase 47F checklist (§22.2) audits the later implementation PR.

### 22.1 Phase 47E Codex audit checklist — current docs-only gate

This checklist audits **this Phase 47E PR** — the docs-only design-acceptance / implementation-authorization
checklist gate. It is the audit run **now**, on this document, for the **current docs-only gate**. Every item must be
ACCEPT; any REJECT blocks acceptance of this Phase 47E PR.

```text
PHASE 47E — LANE-1 aw_* SQL ISOLATION AUTHORIZATION-CHECKLIST GATE CODEX AUDIT CHECKLIST
(current docs-only gate; audits THIS PR; every item must be ACCEPT; any REJECT blocks this Phase 47E PR)

[ ] 1.  Scope is docs-only — Phase 47E adds only this document plus the two §27 forward-traceability
        status notes (in the Phase 47D design gate and the Phase 47C decomposition gate); it modifies no
        runtime source, and specifically not migrate.ts, copy-migrations.mjs, any *.sql,
        route-storage-durable-spike.ts, route-storage-spike.ts, no-leak.ts, config.ts, admission-intake.ts,
        server.ts, or scope-guards.test.ts.
[ ] 2.  No SQL files — Phase 47E adds no .sql file, no aw_* schema, and no executable schema.
[ ] 3.  No migration files — Phase 47E adds no migration file and creates no migration directory.
[ ] 4.  No runtime source changes — no route handler, store/storage code, DB code, migration runner,
        packaging/copy runner, auth, consent, or server-boot change.
[ ] 5.  No test changes — no unit/integration test, scope-guard test, isolation test, or fixture is added
        or modified.
[ ] 6.  No config/env changes — config.ts is untouched and no new env gate is added.
[ ] 7.  No package/lockfile changes — package.json and the lockfile are untouched.
[ ] 8.  No CI changes — nothing under .github/ is added or modified.
[ ] 9.  Phase 47D intake represented accurately (§4) — the six-element layered direction and the 47D §19
        "no repo realization today" evidence state are carried forward without distortion.
[ ] 10. Candidate C manifest limitation carried forward accurately (§7 / §9 B.6-B.7) — the manifest
        protects ONLY the future experimental runner path; it does NOT itself block the normal migrate.ts
        runner from discovering/executing a misplaced .sql; normal-runner protection must come from
        location isolation (Candidate B) and/or hard-deny (Candidate E), never from the manifest alone.
[ ] 11. Canonical-vs-refinement denylist distinction carried forward accurately (§7 / §14 G.1/G.5) —
        scope-guards.test.ts:122-142 is the canonical 19-entry DURABLE_WRITE_DENYLIST, and
        durable-scope-guard-refinement.test.ts:41-58 is a 16-entry SUBSET / spot-check / refinement
        evidence, NOT a mirror or substitute for the canonical denylist.
[ ] 12. No bad-citation regression — no migrate.ts:303-305 citation anywhere (migrate.ts is 254 lines);
        the ungated startup migrate is cited as server.ts:303-305.
[ ] 13. Any implementation authorization is clearly for a later, separate PR only (Phase 47F) — this gate
        authorizes no SQL, migration, runner change, packaging change, DB write, migration execution, or
        guard edit in this PR (§1 / §6 / §24).
[ ] 14. The future implementation file-scope envelope (§19) is narrow and conditional — every entry is
        gated on a proof obligation, applies to the Phase 47F PR only, and authorizes no file change here.
[ ] 15. No production overclaim — no production-readiness, route-contract-freeze, final-schema-freeze,
        ADR-022E-gate-#8-discharge, production-DB-write, production-migration-execution, Freeside-runtime,
        or Lane-2-canonical claim; every such reference is negated / blocked (§24 / §26).
[ ] 16. Preserved blocked lanes are explicit (§26) — Lane-1 aw_* SQL, migration-runner / packager changes,
        scope-guard weakening, migration execution, production DB writes, production durable-store, Lane-2
        canonical migrations, production admission, route-contract / final-schema freeze, and the operative
        ADR-022E gate #8 discharge all remain BLOCKED.
[ ] 17. Validators ran and are green on the unchanged artifacts — fixtures 5/5; route-contract vectors 5/5
        (no sixth vector); self-check 44/44; git diff --check and git diff --cached --check clean (§27).
[ ] 18. No repo-local memory / generated / temp dirt — no MEMORY.md, memory/, grimoire, generated, tmp /
        temp, __pycache__, .pyc, or .claude artifact appears in the Phase 47E working tree.
[ ] 19. No adjacent-repo dirt — no file in loa-straylight or freeside-characters was created or modified by
        Phase 47E.
[ ] 20. No external memory writes occurred during this phase — specifically no write to ~/.claude/, the
        Claude Code memory store, Loa/Cheval memory tooling, MEMORY.md, any memory index, or any grimoire.
```

### 22.2 Future Phase 47F Codex audit checklist — implementation PR

This section answers **authorization question 9 — what Codex should audit in the future implementation PR.** It is a
checklist for a **future** audit on the Phase 47F PR, **not** an audit run here. Copy it verbatim into the Phase 47F
audit.

```text
PHASE 47F — LANE-1 aw_* SQL ISOLATION IMPLEMENTATION-SPIKE CODEX AUDIT CHECKLIST
(every item must be ACCEPT; any REJECT blocks the spike and Lane-1 aw_* SQL stays blocked)

[ ] 1.  Branch / scope: changes confined to the authorized Lane-1 SQL isolation spike surface (§19);
        no unexpected file classes.
[ ] 2.  No forbidden surfaces (§20): no production migration file, no production DB write, no production
        migration execution, no package export, no route-contract freeze, no final schema freeze.
[ ] 3.  Implementation lane was explicitly authorized by Phase 47E (this gate) — and only the named
        module(s) / mechanism(s) (§19) are touched.
[ ] 4.  Migration-location isolation — ACTUAL PROOF: experimental aw_* SQL is outside src/db/migrations/
        (migrate.ts:23) and the normal migrate(dbPool) cannot discover it (discoverMigrations()
        migrate.ts:76-85, predicate migrate.ts:79; apply loop migrate.ts:199-240) (A.1/A.2).
[ ] 5.  Misplaced experimental SQL fails closed in discovery tests; no startup path executes it; no
        production default enables it (A.3/A.4/A.5).
[ ] 6.  Manifest (if used) names exact files, refuses unlisted/unknown/production/out-of-location entries
        (B.1-B.5); the doc/PR states the manifest protects ONLY the experimental runner path and does NOT
        block the normal migrate.ts runner from a misplaced .sql (B.6 — the Candidate C limitation);
        normal-runner protection comes from Candidate B/E, not the manifest (B.7).
[ ] 7.  Dev/operator runner command: explicit, disabled by default, strict === 'true' env gating, never on
        startup, never via server boot (server.ts:303-305 / :655 / :678 / :691-693), never in production
        defaults, no package-lifecycle invocation (C.1-C.7).
[ ] 8.  Normal-runner hard-deny: refuses/cannot-discover misplaced aw_*; any migrate.ts change is minimal
        and fail-closed; existing production migrations still work; tests cover misplaced .sql AND valid
        production migrations (D.1-D.5).
[ ] 9.  Packaging/copy hard-deny: copy-migrations.mjs .sql-only filter (copy-migrations.mjs:36-40,
        predicate :39) does not copy experimental SQL; production bundle cannot silently include it; a
        test inspects the actual copy-script behavior (E.1-E.4).
[ ] 10. Startup non-execution: server.ts startup (server.ts:303-305), base route gate (server.ts:655),
        Mode-1 storage gate (server.ts:678), and durable selector (server.ts:691-693) run no experimental
        SQL; only the explicit dev/operator command can (F.1-F.5).
[ ] 11. Scope-guard refinement: canonical 19-entry denylist (scope-guards.test.ts:122-142) and
        forbidden-import test (scope-guards.test.ts:185-198) remain in force; any allowlist is exact
        path/token-specific (one named module); adjacent forbidden paths still fail closed against the
        evasion-resistance bar (scope-guards.test.ts:231-313). The refinement file
        (durable-scope-guard-refinement.test.ts:41-58) is a 16-entry SUBSET / spot-check, NOT the canonical
        denylist, and does not substitute for it (G.1-G.5).
[ ] 12. Storage semantics: no raw candidate payload persistence; bounded route-owned synthetic only;
        tenant/estate/actor isolation; idempotent replay; conflict fail-closed; supersession inverse link
        only; cleanup/tombstone/drop path; NO final schema freeze (H.1-H.8).
[ ] 13. No-leak preserved: public shape unchanged; persisted + replayed responses pass the 114-key guard;
        114 = 114 parity intact; no SQL/path/debug/stack leakage; public receipt refs safe; private
        transition/audit/consent material private; no raw payload anywhere (I.1-I.5).
[ ] 14. Auth/consent/signer boundary: the PR explicitly states SQL isolation does NOT solve production
        auth, end-user authorization, signer authority, or consent proof/receipt; all remain separately
        gated (J.1-J.5).
[ ] 15. Rollback/recovery/cleanup: partial migration/write fails closed; no partially-admitted recallable
        assertion; cleanup/drop/tombstone path exists; restart recovery deterministic; dev/operator
        artifacts safely cleanable (K.1-K.5).
[ ] 16. Route-vector validator still 5/5, no sixth vector.
[ ] 17. Route-vector self-check still 44/44 (or current expected equivalent).
[ ] 18. Fixture validator still 5/5.
[ ] 19. No production-readiness / freeze / ADR-022E-discharge / Freeside-integration / Lane-2-canonical
        overclaim in any added doc or comment.
[ ] 20. Lane-2 canonical Straylight-store migrations remain blocked; operative ADR-022E gate #8 remains
        held; no claim aw_* SQL is production-safe.
[ ] 21. If the spike cannot satisfy migration isolation without weakening the production posture, it falls
        back (e.g. remains the Phase 47A .json path) or returns for a narrower gate — and Lane-1 aw_* SQL
        stays blocked.
[ ] 22. No bad citation regression: no migrate.ts:303-305 citation (migrate.ts is 254 lines; the startup
        migrate is server.ts:303-305).
```

---

## 23. Options considered

Each option is enumerated and evaluated, not implemented.

### Option A — Accept the 47D layered design and authorize a future bounded Phase 47F implementation spike under a hard checklist. **SELECTED.**

- **Would authorize.** Nothing implementable in this PR. It accepts the 47D §18 layered direction as the paper
  baseline (with the §7 carried-forward Candidate C clarifying patch) and authorizes a future **separate-PR**,
  bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation spike (Phase 47F),
  **acceptance-gated on the §8–§18 checklist**. Authorizes **no** SQL, migration, runner change, packaging change,
  DB write, migration execution, or guard edit in this PR.
- **Still blocks.** All of Lane-1 SQL; the migration runner / packager stay untouched; the guards stay intact;
  production / Lane-2 / freeze / gate-#8 work stays blocked (§26).
- **Risks.** Low — paper only. It converts the selected design direction into a concrete, reviewable acceptance bar
  without authorizing anything; the JSON-only fallback (47D Candidate A) and the defer outcome (47D Candidate H)
  remain live if Phase 47F cannot satisfy the checklist.
- **Verdict.** **SELECTED (§24 / §25).** The checklist *can* be made precise from current evidence (§1 / §5), so the
  conservative Verdict B is not forced.

### Option B — Accept the 47D layered design but require another docs-only hardening gate before any implementation. **Documented fallback, not selected.**

- **Would authorize.** Nothing; it would defer the checklist to a further docs-only gate.
- **Still blocks.** All of Lane-1 SQL.
- **Risks.** Low, but it adds a gate without new information — the checklist is already precise enough (§1 / §5).
- **Verdict.** **Not selected**; retained as the documented fallback the §22.2 future Phase 47F Codex checklist
  itself triggers if Phase 47F cannot satisfy migration isolation safely.

### Option C — Reject Lane-1 SQL and continue JSON-only dev/operator storage. **Not selected; remains a live fallback.**

- **Would authorize.** Nothing new; the accepted Phase 47A `.json` Mode 2 spike (47B) remains the only durable
  route-storage mechanism (47D Candidate A / P7).
- **Still blocks.** All of Lane-1 SQL.
- **Risks.** Low. It does not advance the SQL design question, but loses no ground.
- **Verdict.** **Not selected as the forward lane**, but it **remains the live fallback** Phase 47F must take if it
  cannot satisfy the §8–§18 checklist without weakening the production posture.

### Option D — Authorize immediate SQL implementation in Phase 47E. **REJECTED.**

- **Risks.** Disqualifying. The §8–§14 obligations are unproven; implementing today would require adopting a
  migration into the production set (the whole-directory runner `migrate.ts:76-85` + `.sql`-only packager
  `copy-migrations.mjs:36-40`) and/or weakening a security guard (`scope-guards.test.ts:122-142`). Forbidden by this
  gate's scope and by 47A / 47B / 47C / 47D.

### Option E — Modify the production migration runner now. **REJECTED.**

- **Risks.** Disqualifying. Changing `migrate.ts` / `copy-migrations.mjs` is a production-runner change with its own
  security review; the Candidate E hard-deny layer is paper-only defense-in-depth (47D §13) and is **not** authorized
  here.

### Option F — Jump to production durable storage. **REJECTED.**

- **Risks.** Disqualifying. Production durable storage requires the operative Straylight-side ADR-022E gate #8
  discharge (held — §17 / §26), production DB writes, and a final schema; none is authorized.

### Option G — Hand off to Freeside runtime / client integration. **REJECTED (now).**

- **Risks.** Out of scope. Freeside stays a consumer / handoff surface; its integration is a separate future gate.

### Option H — Route-contract freeze / final schema freeze. **REJECTED.**

- **Risks.** Disqualifying. `route_contract_final` and `schema_final` stay false; nothing in this chain authorizes a
  freeze.

---

## 24. Decision

Phase 47E **accepts the Phase 47D §18 layered Lane-1 `aw_*` SQL isolation design direction as the paper baseline**
(with the §7 carried-forward Candidate C clarifying patch — the manifest protects only the experimental runner path,
not the normal `migrate.ts` runner — and the canonical-vs-refinement denylist and `server.ts:303-305`-not-
`migrate.ts:303-305` citation precisions), **converts it into the hard, file:line-grounded
implementation-authorization checklist of §8–§18**, and **decides that the direction is sufficient to authorize a
future, separate-PR, bounded, dev/operator-only, disabled-by-default, non-production Lane-1 `aw_*` SQL isolation
implementation spike (Phase 47F), acceptance-gated on that checklist** (Verdict A, Option A).

This is **future-only** and **not implemented by this phase**. The authorized spike is **dev/operator-only**,
**disabled-by-default**, **non-production**, **synthetic-only**, **route-owned storage only**, **isolated from
production migration discovery / execution / packaging**, **fail-closed**, with **no production migration
execution**, **no final schema freeze**, and **no route-contract freeze**. Phase 47E authorizes nothing beyond a
checklist-gated future lane and selecting it (§25). It does **not** make Lane-1 SQL implementation-ready, does
**not** implement any SQL / migration / runner / packager change, does **not** discharge any Straylight-side
production gate, does **not** claim `aw_*` SQL is safe (a future implementation must prove the §8–§18 isolation /
guard / gate / storage / no-leak / rollback evidence), and implies **no** change to the normal migration runner.

**Non-authorizations and invariants preserved** (carried forward unchanged):

- **A pending candidate is not recallable.**
- **A rejected candidate creates no admitted assertion.**
- **An accepted candidate creates / references an admitted assertion.**
- **A superseded assertion is excluded from ordinary recall** unless explicitly requested / marked.
- **A malformed / unsafe payload fails closed.**
- **Missing / unauthorized auth fails closed; missing / invalid consent fails closed** in any future production
  admission model.
- **Public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage material**;
  private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private.
- **User chat does not become memory merely because it was said.**
- **Public `remember-this`, Discord / freeform ingestion, and production admission / storage / auth / consent remain
  blocked.**
- **`active` remains the canonical assertion status, not a public `outcome_class`; `recall_eligible` remains derived
  / projection-only.**

---

## 25. Next lane

> **Selected next lane: Phase 47F — Lane-1 `aw_*` SQL isolated dev/operator implementation spike (a *separate*
> implementation PR, acceptance-gated on the §8–§18 checklist).**

Phase 47F, if it runs, would be a separate implementation PR and **may only attempt the bounded implementation spike
if it satisfies the Phase 47E checklist**. It must remain:

- dev/operator-only;
- disabled by default;
- non-production;
- synthetic-only;
- route-owned storage only;
- isolated from production migration discovery / execution / packaging;
- fail-closed;
- bounded capacity;
- no public response expansion;
- no raw candidate payload persistence;
- no route-contract freeze;
- no final schema freeze;
- no production readiness;
- no Freeside runtime / client integration;
- no ADR-022E gate #8 discharge.

**It must pass the full §22.2 future Phase 47F Codex audit checklist and the §21 validation matrix before
acceptance.** Stated clearly,
so the future lane carries no ambiguity:

- **Phase 47F is not production storage.**
- **Phase 47F is not a route-contract freeze.**
- **Phase 47F is not a final schema freeze.**
- **Phase 47F is not an ADR-022E gate #8 discharge.**
- **Phase 47F is not Freeside integration.**
- **Phase 47F may not proceed if the checklist cannot be satisfied without weakening the production posture** — in
  that case it must fall back (e.g. remain the Phase 47A `.json` path, Option C) or return for the §23 Option B
  narrower hardening gate, and **Lane-1 `aw_*` SQL stays blocked.**

**The next lane is implementation (Phase 47F), gated** — not another docs-only gate. Option B (another docs-only
hardening gate) is the **fallback** the §22.2 future Phase 47F checklist triggers only if Phase 47F cannot satisfy
the obligations safely. **Not selected:** direct production implementation; production durable-store implementation; production DB
writes or migration execution; any SQL implementation **in this PR** (this gate builds nothing — §1 / §6 / §24). A
production durable-store lane, Lane-2 canonical migrations, and the operative Straylight-side gate #8 discharge
remain blocked regardless of Phase 47F (§26).

---

## 26. Preserved blocked lanes

This section answers **authorization question 4 — what remains blocked in Phase 47E itself.** Regardless of verdict,
the following remain **blocked** after Phase 47E — **none** is unblocked by this checklist gate:

- **Lane-1 `aw_*` SQL implementation itself** — unimplemented; only a checklist-gated future lane (Phase 47F) is
  authorized (§25), and it remains acceptance-gated and mode-contingent;
- **migration runner changes** (`migrate.ts`) — blocked; the Candidate E hard-deny layer is paper-only
  defense-in-depth, not authorized;
- **packaging / copy-runner changes** (`copy-migrations.mjs`) — blocked;
- **scope-guard weakening / editing** (`scope-guards.test.ts`) — blocked; the narrow replacement / allowlist model
  stays paper-only and future-gated;
- **`aw_*` SQL files / executable schema** — blocked; none exists and none is authorized;
- **migration execution** — blocked;
- **production DB writes** — blocked;
- **production durable-store implementation** — blocked;
- **Lane-2 canonical Straylight-store migrations** — blocked (each a separate sibling-repo ADR under Straylight
  teammate review, behind the operative gate #8);
- **production admission** — blocked;
- **public `remember-this`** — blocked;
- **Discord / freeform ingestion** — blocked;
- **user chat becoming memory merely because it was said** — blocked; consent never inferred from chat;
- **Freeside runtime / client integration** — blocked (Freeside stays a consumer / handoff surface);
- **package exports** — blocked unless separately justified and audited;
- **LLM / voice / Finn runtime wiring** — blocked;
- **MVP 3 forget / revoke / correction UI** — blocked;
- **route-contract freeze** — blocked; `route_contract_final` stays false;
- **final schema freeze** — blocked; `schema_final` stays false; no `aw_*` migration is claimed safe;
- **production readiness of any kind** — not claimed;
- **operative Straylight-side ADR-022E gate #8 discharge** — not claimed (no repo evidence); sibling gates remain
  held. **This remains the dominant cross-repo blocker** for production admission and any Lane-2 canonical-store
  migration.

**Candidate D / ADR-022E boundary preserved.** Candidate D (split-storage) remains **proposal input / design
baseline, not implemented production architecture**; Phase 46N's gate #8 clearing remains a **bounded Dixie
documentation / architecture / handoff prerequisite only**; the operative Straylight-side discharge remains blocked
unless separately evidenced (no such accepted evidence exists at authoring time). The canonical Straylight
`StorageAdapter` interface and the `Assertion` / `TransitionReceipt` / `AuditEvent` shapes stay Straylight-owned
(cross-repo).

**Invariants preserved (unchanged).** A pending candidate is not recallable; a rejected candidate creates no
admitted assertion; an accepted candidate creates / references an admitted assertion; a superseded assertion is
excluded from ordinary recall unless explicitly requested / marked; a malformed / unsafe payload fails closed;
missing / unauthorized auth fails closed; missing / invalid consent fails closed in any future production admission
model; public responses leak no raw / private / audit / debug / source / auth / signer / consent / storage material;
private `TransitionReceipt` / `AuditEvent` / consent proof / storage material remains private; user chat does not
become memory merely because it was said; `active` remains the canonical assertion status, not a public
`outcome_class`; `recall_eligible` remains derived / projection-only.

> **Why this does not imply production readiness (authorization question 11).** Accepting a paper design direction
> and turning it into a checklist unblocks **no** production / public / canonical-store / Freeside / LLM / package /
> freeze / SQL / migration work. Phase 47E authorizes only a *future, separate, bounded, dev/operator-only,
> disabled-by-default, non-production* implementation spike, and **only if** that spike proves every §8–§18 item
> without weakening the production posture. The accepted design direction is **not** implementation-ready, **not**
> production-ready, and **not** safe-by-assertion — safety is exactly what the future spike must *prove*. Every lane
> above remains its own separately-authorized future gate.

---

## 27. Validation

All commands are run from the repository root (`/home/eileenspectremoon/loa-dev/loa-dixie`). Phase 47E is
docs/decision-only — it adds only this document (plus the two minimal forward-traceability status notes below) and
mutates no runtime source, test, validator, vector, fixture, migration, or SQL file — so the validators are run only
to confirm the unchanged artifacts remain green.

```bash
git status --short --branch --untracked-files=all
git diff --name-status
git diff --stat
git diff --check
git diff --cached --name-status
git diff --cached --check
# Unchanged-artifact green-checks (no mutation in this phase):
node docs/admission-wedge/fixtures/validate-fixtures.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs
node docs/admission-wedge/route-contract-test-vectors/validate-route-contract-test-vectors.mjs --self-check
# Docs-only static scans:
git diff --name-only HEAD -- app src package.json package-lock.json '.github/**' '*.sql' 'dist/**' 'build/**'
git status --short --untracked-files=all | grep -E '\.sql$|migration|migrations|aw_'
git status --short --untracked-files=all | grep -iE 'MEMORY|memory|grimoire|__pycache__|\.pyc|generated|tmp|temp|\.claude'
# New-untracked-doc whitespace check (no-index; `|| true` because a clean file is fine):
git diff --no-index --check /dev/null docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md || true
# Overclaim scan (interpret: negated blocked-lane references are fine; positive claims are not):
grep -RInE 'production ready|production readiness|route-contract freeze|final schema freeze|ADR-022E.*discharged|production migration execution authorized|production DB writes authorized|durable production storage authorized|Freeside runtime|Lane-2 canonical|current aw_\* migrations are safe|aw_\* SQL.*authorized|SQL durable-store.*authorized|migration runner changes authorized|implementation authorized|ready to implement|implementation-ready|SQL.*safe' \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md \
  docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md
# Section-heading single-occurrence check (each `## N.` appears exactly once):
grep -nE "^## [0-9]+\." docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md
```

**Recorded results for this lane** (run during authoring; full output accompanies the operator run report):

- **docs-only scope** — only the new file `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md`
  is added, plus the two minimal forward-traceability status notes (§27 list below); no runtime source (and
  specifically not `migrate.ts`, `copy-migrations.mjs`, any `*.sql`, `route-storage-durable-spike.ts`,
  `route-storage-spike.ts`, `no-leak.ts`, `config.ts`, `admission-intake.ts`, `server.ts`, or
  `scope-guards.test.ts`), no runtime test, no route-vector JSON, validator, README, fixture, fixture validator,
  `app/`, `src/`, `tests/`, package / lockfile, config / env, CI, migration, SQL, executable schema, or generated
  file is touched;
- **validators green (unchanged artifacts)** — the Phase 33E fixture validator reports **5/5 probes valid, 0
  failures**; the route-contract test-vector validator reports **5/5 vectors valid, 0 failures, no sixth vector**;
  the `--self-check` harness reports **44/44** cases behaving as required (42 negative mutations fail closed; 2
  exact-key non-over-match guards stay clean);
- **docs-only static scans** — the `app src package.json … *.sql dist build` diff is empty; the
  `.sql$|migration|aw_` scan matches only this document's prose (no new SQL / migration file); the
  memory/generated/temp scan matches nothing under the working tree from this phase;
- **overclaim scan** — every match is a **negated / blocked** reference (e.g. "route-contract freeze — blocked",
  "final schema freeze — blocked", "Lane-2 canonical … remain blocked", "Freeside runtime / client integration —
  blocked", "production readiness … not claimed", "the accepted design direction is **not** implementation-ready");
  there is **no** positive authorization or safety claim;
- **section-heading single-occurrence check** — `grep -nE "^## [0-9]+\."` lists the headings 1–27 exactly once each.

**Forward-traceability status notes added (§27 scope):**

- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-DESIGN-GATE.md` — a one-line Phase 47E status note recording that the
  47D layered direction was accepted (Verdict A) and turned into this checklist gate.
- `docs/ADMISSION-WEDGE-LANE1-AW-SQL-MIGRATION-RUNNER-BLOCKER-DECOMPOSITION-GATE.md` — a one-line Phase 47E status
  note recording the downstream acceptance / checklist gate.

**Corruption / duplicate guard** (carried from the 46I–47D precedent, applied to this document):

- **No duplicated section headings.** Each numbered section heading (`## 1.` … `## 27.`) appears exactly once.
- **No pasted terminal-report fragments.** No "Claude said", "Patch Report", a literal "RESULT:" report token, a
  trailing one-word report heading, or pasted terminal transcript appears in the document body.
- **No malformed table rows.** Every Markdown table row is a well-formed pipe-delimited row.
- **Balanced fenced code blocks.** The triple-backtick count is even; the three fenced blocks are the §22.1
  current Phase 47E Codex checklist (a `text` block), the §22.2 future Phase 47F Codex checklist (a `text` block),
  and the §27 validation command list (a `bash` block). **No fenced block is an executable migration or runnable
  schema.**

---
