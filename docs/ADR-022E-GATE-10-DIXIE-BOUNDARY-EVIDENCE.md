# `loa-dixie` ADR-022E gate #10 — Dixie boundary evidence (Railway PostgreSQL evidence response)

> **Type**: `loa-dixie` repo-local **docs-only boundary evidence** artifact supporting the Phase 49N
> Railway PostgreSQL evidence response packet.
> **Phase**: Phase 49N: Dixie gate #10 Railway PostgreSQL evidence response.
> **Branch**: `gate10-railway-postgresql-evidence-response`.
> **Status**: docs-only, read-only inspection. This document cites existing Dixie surfaces; it changes none
> of them, implements nothing, and proposes no adapter, host, or wiring.

---

## 1. Result token

**`DIXIE_GATE_10_BOUNDARY_EVIDENCE_RECORDED`**

Recording this token records only that this boundary evidence was authored. It does not satisfy gate #10,
gate #9, or gate #8, and it accepts no candidate substrate.

---

## 2. Evidence question

What is Dixie's boundary posture relevant to a **future Straylight canonical-store substrate**, given that
the Loa-Straylight Phase 49J/49K/49L chain has named **Railway PostgreSQL** as the recommended candidate
class — and what can Dixie prove locally, not prove locally, or only defer?

---

## 3. Method and honesty constraints

Surfaces were located with `ls`, `grep`, and `git grep` against this checkout and confirmed by opening the
files. Citations below are **file paths**, plus line numbers only where the line was individually verified in
this session. Line ranges from prior merged evidence documents are **not** repeated here as fresh claims;
where prior evidence is relied on, the prior document is cited as a document. Negative evidence, unknowns,
and deferrals are recorded as such. Nothing below is an acceptance, a selection, or a design.

---

## 4. Prior grounded evidence relied on (as documents)

- `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-RESULT.md` — the merged gate #10 boundary
  evidence result (`PARTIAL`, gate #10 held), containing the detailed `file:line` evidence table for the
  boundary surfaces summarized in §5. That result and its held-gate posture are **unchanged** by this
  document.
- `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-BOUNDARY-EVIDENCE-LANE-AUTHORIZATION-GATE.md` and
  `docs/ADMISSION-WEDGE-ADR-022E-GATE-10-OWNER-RESPONSE-ACCEPTANCE.md` — the authorizing and accepting
  gate documents for that lane.

---

## 5. What Dixie **can prove locally** (verified in this session)

1. **The Admission Wedge boundary surface is default-off and env-gated.** The config field
   `admissionIntakeSpikeEnabled` is declared in `app/src/config.ts` (line 104) and derived from a strict
   env-gate with fail-closed default (vicinity of `app/src/config.ts:454`); the route is mounted only inside
   a conditional on that flag in `app/src/server.ts` (line 657). When off — the default — the boundary route
   is not registered at all.
2. **No local canonical primitive definitions exist.** A fresh
   `grep -rE "(interface|type|class)\s+(Assertion|TransitionReceipt|AuditEvent|RecallReceipt|EstateTransition)\b" app/src`
   returned **no matches** in this session. Dixie defines none of the canonical Straylight primitives.
3. **Canonical types are imported type-only.**
   `app/src/services/straylight-recall-intake/bounded-estate-store.ts` (line 32) and
   `app/src/services/straylight-host/intake-deny-log.ts` (line 20) import Straylight types via `import type`
   from `@loa/straylight` / `@loa/straylight/host` — carrying references, not owning semantics.
4. **The boundary spike tree exists and is reference-carrying, not storage-owning.** The following files
   exist in this checkout: `app/src/routes/admission-intake.ts`;
   `app/src/services/admission-wedge-spike/{admitted-assertion-ledger,auth-gate,classifier,no-leak,public-response,route-storage-spike,route-storage-durable-spike}.ts`
   and the `aw-sql-isolation-spike/` subtree; `app/src/services/straylight-host/{refusal-passthrough,intake-deny-log,tenant-resolver}.ts`;
   `app/src/services/straylight-recall-intake/` (capability holder, bounded estate store, and supporting
   guardrails). The no-leak module defines a `FORBIDDEN_PUBLIC_KEYS` denylist (verified present in
   `app/src/services/admission-wedge-spike/no-leak.ts`).
5. **Isolation of the spike from Dixie's own production DB paths is test-enforced.** The scope-guard and
   isolation test files exist at `app/tests/unit/admission-wedge-spike/` — including `scope-guards.test.ts`,
   `durable-migration-isolation.test.ts`, `aw-sql-isolation-runner-isolation.test.ts`, and
   `aw-sql-isolation-scope-guard.test.ts` — alongside `no-leak.test.ts` and `config-gate.test.ts`.
6. **Dixie already operates its own PostgreSQL client layer for Dixie-local (non-canonical) workloads.**
   `app/src/db/` contains `client.ts`, `pool.ts`, `transaction.ts`, `migrate.ts`, and a `migrations/`
   directory of Dixie-local migrations (schedules, permissions, reputation, mutation log, audit trail,
   knowledge freshness, dynamic contracts, fleet orchestration, outbox, agent ecology). The `pg` driver is a
   declared dependency in `app/package.json` (line 37). **Boundary relevance, stated carefully:** this proves
   Dixie's *own* stack is PostgreSQL-conversant — i.e., the *class* of substrate named by Straylight's
   recommendation is not foreign to this codebase. It does **not** make Dixie's DB layer a canonical-store
   candidate, an adapter, or a shared substrate, and none of it is reachable from the spike tree
   (isolation per item 5).
7. **No Railway-specific coupling exists in the runtime source.** A case-insensitive search for "railway"
   across `app/src` matches only comments in `app/src/config.ts` (lines 176 and 295) describing the generic
   PaaS convention that a platform-injected `PORT` environment variable takes precedence for the HTTP
   listener. There is no Railway SDK, no Railway config file, and no Railway-conditional code path in
   `app/src`.

## 6. What Dixie **cannot prove locally**

1. **Anything Straylight-side.** The canonical `Assertion` / `TransitionReceipt` / `AuditEvent` definitions,
   the ADR-022E gate anchors (gates #8/#9/#10), and the Phase 49J/49K/49L artifacts live in the sibling
   `loa-straylight` repository and are not citable from this checkout. End-to-end alignment of Dixie's
   carried references with Straylight's definitions therefore cannot be demonstrated here.
2. **Anything about Railway PostgreSQL as a platform.** Durability, backup, availability, isolation,
   operational, or compliance properties of the candidate class cannot be evidenced from this repository —
   no local artifact speaks to them, and this document deliberately does not import outside claims.
3. **Anything about Finn.** Gate #9 runtime posture and evidence belong to `loa-finn` and are not inspectable
   here.
4. **Production boundary behavior.** The boundary surface exists only as a default-off dev/operator spike;
   there is no production admission boundary whose behavior could be evidenced, by design, while gate #8
   remains held.

## 7. What Dixie must **defer**

- **To Straylight:** semantic ownership of the canonical-store boundary; evaluation and any acceptance of
  Railway PostgreSQL or any candidate; the substrate contract; the disposition of gate #8; sufficiency
  judgment on this evidence response at intake.
- **To Finn:** gate #9 runtime evidence and any Finn-side posture toward the candidate class.
- **To a later production host/adapter decision:** adapter design, host selection, connection and
  operational posture, migration/rollout shape, and any boundary-side requirement the eventual substrate
  contract may impose on the reference formats Dixie carries. None of these is proposed, sketched, or
  constrained by this document.

---

## 8. Conclusion

On locally verifiable evidence, Dixie's boundary posture toward a future Straylight canonical-store substrate
is: **host-agnostic, fail-closed, reference-carrying, and free of Railway-specific coupling**, with Dixie's own
PostgreSQL-conversant stack fully isolated from the boundary spike. Everything beyond that — candidate
acceptance, substrate contract, cross-repo alignment, and production wiring — is recorded as not locally
provable or explicitly deferred. Gate #10 remains held; this document does not move it.
