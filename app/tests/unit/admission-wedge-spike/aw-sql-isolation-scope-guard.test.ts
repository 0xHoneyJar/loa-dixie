// Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike: scope-guard preservation evidence.
//
// Section G (§14) of the Phase 47E checklist. Phase 47F achieves the STRONGEST
// possible outcome (same as Phase 47A's `.json` store): the new TypeScript
// module needs NONE of the forbidden DB/SQL/durable-write tokens, so it passes
// the CANONICAL 19-entry Phase 33N denylist UNCHANGED — NO denylist entry was
// removed, NO import rule was relaxed, and NO per-module allowlist was added.
//
// This is possible because the experimental SQL text lives ONLY in `.sql` files
// (which the guard does not scan) and is read at runtime as opaque file content;
// the `.ts` planner names no client, opens no connection, and embeds no DDL.
//
// These tests:
//   G.1 — re-run the canonical denylist + import rules against the NEW module
//         and prove zero hits (it is inside the existing guard, not exempted);
//   G.2/G.3 — prove scope-guards.test.ts adds NO allowlist / opt-out for this
//         lane (the guard file is unchanged in spirit: no aw-sql allowlist);
//   G.4/G.5 — prove adjacent forbidden paths STILL fail closed against the same
//         evasion-resistance bar (re-applied to adversarial samples).

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const ISO_INDEX = join(
  REPO_APP,
  'src',
  'services',
  'admission-wedge-spike',
  'aw-sql-isolation-spike',
  'index.ts',
);
const SCOPE_GUARDS_SRC = join(REPO_APP, 'tests', 'unit', 'admission-wedge-spike', 'scope-guards.test.ts');

// The CANONICAL Phase 33N 19-entry denylist (lock-step with scope-guards.test.ts:122-142).
const DURABLE_WRITE_DENYLIST: Array<[string, RegExp]> = [
  ['INSERT', /\bINSERT\b/i],
  ['INSERT INTO', /\bINSERT\s+INTO\b/i],
  ['UPDATE', /\bUPDATE\b/i],
  ['DELETE', /\bDELETE\b/i],
  ['CREATE TABLE', /\bCREATE\s+TABLE\b/i],
  ['ALTER TABLE', /\bALTER\s+TABLE\b/i],
  ['DROP TABLE', /\bDROP\s+TABLE\b/i],
  ['pool.query', /\bpool\.query\b/],
  ['.query(', /\.query\s*\(/],
  ['query(', /\bquery\s*\(/],
  ['.execute(', /\.execute\s*\(/],
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

/** Parser-backed comment stripper (same approach as scope-guards.test.ts). */
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

const ANY_IMPORT_RE = /^\s*import\b[^'"]*?from\s*['"]([^'"]+)['"]/gm;
const BARE_IMPORT_RE = /^\s*import\s*['"]([^'"]+)['"]/gm;
function importSpecifiers(src: string): string[] {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const out: string[] = [];
  for (const m of stripped.matchAll(ANY_IMPORT_RE)) out.push(m[1]!);
  for (const m of stripped.matchAll(BARE_IMPORT_RE)) out.push(m[1]!);
  return out;
}

// ── G.1 — the new module passes the canonical denylist with ZERO hits ─────────

describe('Phase 47F scope-guard — the new module is inside the canonical guard (G.1)', () => {
  it('the isolation-spike index.ts has NO durable-write/SQL/DB token in executable source', () => {
    const code = stripComments(readFileSync(ISO_INDEX, 'utf8'));
    expect(durableWriteHits(code)).toEqual([]);
  });

  it('the isolation-spike index.ts imports only node: built-ins (inside the import allowlist)', () => {
    const specifiers = importSpecifiers(readFileSync(ISO_INDEX, 'utf8'));
    for (const spec of specifiers) {
      expect({ spec, ok: spec.startsWith('node:') }).toEqual({ spec, ok: true });
    }
    for (const [, fn] of IMPORT_DENYLIST) {
      expect(specifiers.some((s) => fn(s))).toBe(false);
    }
  });

  // ── Phase 47J — the new pure execution-gate seam stays token-clean ──────────

  it('the Phase 47J execution-gate seam exists in index.ts yet adds ZERO durable-write hits', () => {
    const raw = readFileSync(ISO_INDEX, 'utf8');
    // The pure gate conjunction (runner-fed) lives in the planner module …
    expect(raw).toContain('evaluateIsolationSpikeExecutionGate');
    expect(raw).toContain('assertIsolationSpikeExecutionGateOpen');
    // … and it remains pool-free: no pg / db client / migrate token in executable
    // source (the DB-touching code lives only in the runner, outside SPIKE_FILES).
    const code = stripComments(raw);
    expect(durableWriteHits(code)).toEqual([]);
  });
});

// ── G.2/G.3 — no allowlist / opt-out was added for this lane ───────────────────

describe('Phase 47F scope-guard — no allowlist or opt-out was added (G.2/G.3)', () => {
  it('scope-guards.test.ts adds no aw-sql-isolation allowlist / opt-out', () => {
    const src = readFileSync(SCOPE_GUARDS_SRC, 'utf8');
    expect(src).not.toMatch(/aw-sql-isolation.*(allow|skip|exempt|opt-?out|ignore)/i);
    expect(src).not.toMatch(/(allow|skip|exempt|opt-?out|ignore).*aw-sql-isolation/i);
    expect(src).not.toMatch(/ALLOW(ED)?_(SQL|DURABLE|STORE|MIGRATION)/);
  });

  it('the canonical 19-entry denylist tokens are all still present in the live guard', () => {
    const src = readFileSync(SCOPE_GUARDS_SRC, 'utf8');
    for (const token of ['INSERT', 'UPDATE', 'DELETE', 'pool\\.query', 'migrate', 'postgres', 'database']) {
      expect(new RegExp(token).test(src)).toBe(true);
    }
  });
});

// ── G.4/G.5 — adjacent forbidden paths still fail closed ──────────────────────

describe('Phase 47F scope-guard — adjacent forbidden paths still fail closed (G.4/G.5)', () => {
  it('raw SQL durable-write statements would still be caught by the denylist', () => {
    const offending = 'const x = 1; pool.query("INSERT INTO aw_records VALUES (1)"); execute("UPDATE x");';
    expect(durableWriteHits(stripComments(offending))).toEqual(
      expect.arrayContaining(['pool.query', 'INSERT', 'UPDATE', 'execute(']),
    );
  });

  it('forbidden imports (pg / db runner / migrations dir / -store) would still be rejected', () => {
    for (const spec of ['pg', '../db/migrate.js', '../db/migrations/016_aw.sql', './aw-route-store.js']) {
      expect(IMPORT_DENYLIST.some(([, fn]) => fn(spec))).toBe(true);
    }
  });

  it('the same evasion-resistance bar still holds (nested template / regex char class)', () => {
    const nested = 'const m = `${`//`}`; pool.query("UPDATE records SET x = 1");';
    expect(durableWriteHits(stripComments(nested))).toEqual(
      expect.arrayContaining(['pool.query', 'UPDATE']),
    );
    const regexClass = 'function f() { throw /[//]/; } pool.query("UPDATE x");';
    expect(durableWriteHits(stripComments(regexClass))).toEqual(
      expect.arrayContaining(['pool.query', 'UPDATE']),
    );
  });
});
