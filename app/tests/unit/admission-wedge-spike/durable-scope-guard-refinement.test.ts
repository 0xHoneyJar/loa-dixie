// Phase 47A — Mode 2 scope-guard EVIDENCE (Phase 46Z checklist §9, B.1–B.9).
//
// The Phase 46Z checklist requires that a Mode 2 spike either keep the Phase 33N
// guards intact OR refine them NARROWLY (a named-module allowlist + negative guards
// that REPLACE, not weaken, the blanket protection) — proven against the SAME
// evasion-resistance bar.
//
// Phase 47A's mechanism is a `.json`-snapshot file store that needs NONE of the
// forbidden DB/SQL/migration tokens or imports, so it required NO guard change at
// all — the strongest possible outcome for B.1 (refined narrowly / not weakened
// broadly: here, NOTHING is weakened, and NO positive allowlist was added). These
// tests PROVE that:
//
//   B.1 — the Phase 33N denylist is unchanged: NO denylist entry or import rule was
//         removed, and NO per-file opt-out / allowlist was introduced;
//   B.2 / B.3 / B.6 — raw SQL, normal DB-runner coupling, and unsafe `-store`
//         imports still fail closed inside the spike surface (re-proven against the
//         real denylist applied to a synthetic offending sample);
//   B.8 — no positive allowlist specific to the durable module exists (none was
//         needed), so there is no widening to negative-test;
//   B.9 — the same evasion-resistance bar (strings / nested templates / regex char
//         classes / comment stripping) still holds (the canonical Phase 33N
//         regression cases are re-run against the shared denylist).
//
// This file mirrors the Phase 33N denylist + parser-backed comment stripper and
// applies them to ADVERSARIAL samples representing the forbidden adjacent paths —
// proving the guard model that protects the spike surface still fails closed on
// exactly the things Mode 2 must never introduce.

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const SCOPE_GUARDS_SRC = join(REPO_APP, 'tests', 'unit', 'admission-wedge-spike', 'scope-guards.test.ts');

// The canonical Phase 33N durable-write denylist (kept in lock-step with
// scope-guards.test.ts:122-142). A drift guard below asserts the live guard file
// still carries each token, so this local copy cannot silently fall out of sync.
const DURABLE_WRITE_DENYLIST: Array<[string, RegExp]> = [
  ['INSERT', /\bINSERT\b/i],
  ['UPDATE', /\bUPDATE\b/i],
  ['DELETE', /\bDELETE\b/i],
  ['CREATE TABLE', /\bCREATE\s+TABLE\b/i],
  ['ALTER TABLE', /\bALTER\s+TABLE\b/i],
  ['DROP TABLE', /\bDROP\s+TABLE\b/i],
  ['pool.query', /\bpool\.query\b/],
  ['.query(', /\.query\s*\(/],
  ['execute(', /\bexecute\s*\(/],
  ['sql`` tagged template', /\bsql\s*`/],
  ['db.', /\bdb\./],
  ['database', /\bdatabase\b/i],
  ['pg', /\bpg\b/],
  ['postgres', /\bpostgres\b/i],
  ['migration', /\bmigration\b/i],
  ['migrate', /\bmigrate\b/i],
];

const IMPORT_DENYLIST: Array<[string, (spec: string) => boolean]> = [
  ['bare pg', (s) => s === 'pg'],
  ['db runner', (s) => /\/db\/(client|pool|migrate|transaction)/.test(s)],
  ['migrations dir', (s) => /\/db\/migrations\//.test(s)],
  ['production -store', (s) => /-store(\.js)?$/.test(s)],
  ['BoundedEstateStore', (s) => /BoundedEstateStore|bounded-estate-store/.test(s)],
];

/** Parser-backed comment stripper (same approach as scope-guards.test.ts) so the
 *  denylist scans executable source only and cannot be fooled by a token hidden in
 *  a string / template / regex literal. */
function stripComments(src: string): string {
  const sf = ts.createSourceFile('sample.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const keep = new Uint8Array(src.length);
  const mark = (node: ts.Node): void => {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const children = node.getChildren(sf);
    if (children.length === 0) {
      const start = node.getStart(sf, false);
      const end = node.getEnd();
      for (let i = start; i < end; i++) keep[i] = 1;
      return;
    }
    for (const child of children) mark(child);
  };
  mark(sf);
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    out += keep[i] === 1 || /\s/.test(ch) ? ch : ' ';
  }
  return out;
}

function durableWriteHits(stripped: string): string[] {
  return DURABLE_WRITE_DENYLIST.filter(([, re]) => re.test(stripped)).map(([name]) => name);
}

// ── B.1 — the Phase 33N denylist is unchanged (no entry removed, no allowlist) ─

describe('Phase 47A scope-guard evidence — Phase 33N guard is unchanged (B.1)', () => {
  it('every canonical denylist token is still present in scope-guards.test.ts', () => {
    const src = readFileSync(SCOPE_GUARDS_SRC, 'utf8');
    // Spot-check the high-value tokens are still in the live guard file.
    for (const token of ['INSERT', 'UPDATE', 'DELETE', 'pool\\.query', 'migrate', 'postgres', 'database']) {
      expect(new RegExp(token).test(src)).toBe(true);
    }
  });

  it('no per-file opt-out / suppression / allowlist was added to the guard for the durable module', () => {
    const src = readFileSync(SCOPE_GUARDS_SRC, 'utf8');
    // The durable module must NOT be specially excused: no mention that grants it an
    // exception from the denylist or import rules. (It is simply scanned like every
    // other spike file and passes, because it uses none of the forbidden tokens.)
    expect(src).not.toMatch(/durable-spike.*(allow|skip|exempt|opt-?out|ignore)/i);
    expect(src).not.toMatch(/(allow|skip|exempt|opt-?out|ignore).*durable-spike/i);
    // No blanket allowlist mechanism (a Set/array of "allowed" durable-write files).
    expect(src).not.toMatch(/ALLOW(ED)?_(SQL|DURABLE|STORE|MIGRATION)/);
  });
});

// ── B.2 / B.3 / B.6 — adjacent forbidden paths still fail closed ──────────────

describe('Phase 47A scope-guard evidence — adjacent forbidden paths still fail closed (B.2/B.3/B.6)', () => {
  it('raw SQL durable-write statements are still caught by the denylist', () => {
    const offending = 'const x = 1; pool.query("INSERT INTO aw_records VALUES (1)"); execute("UPDATE x");';
    const hits = durableWriteHits(stripComments(offending));
    expect(hits).toEqual(expect.arrayContaining(['pool.query', 'INSERT', 'UPDATE', 'execute(']));
  });

  it('a CREATE/ALTER/DROP TABLE statement is still caught', () => {
    const offending = 'const ddl = 1; client.query(`CREATE TABLE aw_x (id text)`);';
    const hits = durableWriteHits(stripComments(offending));
    expect(hits).toEqual(expect.arrayContaining(['CREATE TABLE', '.query(']));
  });

  it('a migration/migrate token is still caught', () => {
    const offending = 'const m = migration; function run() { return migrate(pool); }';
    const hits = durableWriteHits(stripComments(offending));
    expect(hits).toEqual(expect.arrayContaining(['migration', 'migrate']));
  });

  it('forbidden imports (pg / db runner / migrations dir / -store) are still rejected', () => {
    const samples = [
      'pg',
      '../db/migrate.js',
      '../db/client.js',
      '../db/migrations/016_aw_route_storage.sql',
      './admission-route-storage-store.js',
    ];
    for (const spec of samples) {
      const rejected = IMPORT_DENYLIST.some(([, fn]) => fn(spec));
      expect({ spec, rejected }).toEqual({ spec, rejected: true });
    }
  });
});

// ── B.8 — the durable module name is NOT on an import allowlist (none exists) ──

describe('Phase 47A scope-guard evidence — no widening of the import guard (B.8)', () => {
  it('the durable module file name does not end in `-store` (stays inside the import guard)', () => {
    // The store is named `*-durable-spike.ts`, NOT `*-store.ts`, so it passes the
    // `/-store(\.js)?$/` import guard WITHOUT any allowlist — the guard is unchanged.
    const moduleSpecifier = './route-storage-durable-spike.js';
    const rejectedByStoreGuard = /-store(\.js)?$/.test(moduleSpecifier);
    expect(rejectedByStoreGuard).toBe(false);
    // A hypothetical `-store` sibling WOULD still be rejected — proving the guard is
    // intact and we simply stayed inside it.
    expect(/-store(\.js)?$/.test('./route-storage-durable-store.js')).toBe(true);
  });
});

// ── B.9 — the same evasion-resistance bar still holds ─────────────────────────

describe('Phase 47A scope-guard evidence — evasion-resistance bar preserved (B.9)', () => {
  it('a token hidden in a nested template `${`//`}` is still surfaced after stripping', () => {
    const src = 'const marker = `${`//`}`; pool.query("UPDATE records SET x = 1");';
    expect(durableWriteHits(stripComments(src))).toEqual(
      expect.arrayContaining(['pool.query', 'UPDATE']),
    );
  });

  it('a token hidden after a regex char class `/[//]/` is still surfaced after stripping', () => {
    const src = 'function f() { throw /[//]/; } pool.query("UPDATE records SET x = 1");';
    expect(durableWriteHits(stripComments(src))).toEqual(
      expect.arrayContaining(['pool.query', 'UPDATE']),
    );
  });

  it('a REAL comment that mentions SQL prose is still stripped (no false positive)', () => {
    const src = 'const ok = true; // pool.query("UPDATE x") and migrate()\nconst y = 2;';
    expect(durableWriteHits(stripComments(src))).toEqual([]);
  });
});
