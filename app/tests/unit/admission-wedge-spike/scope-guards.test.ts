// Phase 33N — static scope guards (Phase 33M §8, §10). These assert, as
// source-tree invariants, that the dev/operator-only Admission Wedge spike
// stays inside its authorized envelope:
//   * NO Freeside import anywhere in the spike path;
//   * NO `@loa/straylight` import (runtime or type) anywhere in the spike path;
//   * NO production storage / DB / migration / pg reachable from the spike;
//   * NO package export of the spike (it is an internal service barrel only);
//   * the Phase 33L route-contract validator stays Node-built-ins-only and is
//     NOT imported from app/ (it imports nothing from app/, no runtime).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// TypeScript is already a dev dependency (devDependencies.typescript) — the
// durable-write scanner below uses its parser so the comment stripper is sound
// against every TS construct (nested templates, regex char classes, JSDoc), NOT
// a hand-rolled character scanner that an adversary can bypass. No new package.
import ts from 'typescript';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const REPO_ROOT = resolve(REPO_APP, '..');
const SPIKE_SERVICE_DIR = join(REPO_APP, 'src', 'services', 'admission-wedge-spike');
const SPIKE_ROUTE_FILE = join(REPO_APP, 'src', 'routes', 'admission-intake.ts');

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTs(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const SPIKE_FILES = [...walkTs(SPIKE_SERVICE_DIR), SPIKE_ROUTE_FILE];

const ANY_IMPORT_RE = /^\s*import\b[^'"]*?from\s*['"]([^'"]+)['"]/gm;
const BARE_IMPORT_RE = /^\s*import\s*['"]([^'"]+)['"]/gm;

/**
 * Strip comments using the TypeScript PARSER so the durable-write denylist
 * below scans executable source only — without false-positiving on the spike's
 * own prose ("NO database writes, NO migrations", etc.) AND without ANY way for
 * an adversary to hide a durable-write token after a `//` / `/*` smuggled into
 * a string, template (including nested `${`//`}` substitutions), or regex
 * literal (including char classes like `/[//]/`).
 *
 * Patch 1 (Phase 33N audit, second round): the previous HAND-ROLLED scanner was
 * provably bypassable. Codex reproduced two valid-TypeScript counterexamples
 * that produced ZERO denylist hits because the scanner truncated the line at a
 * `//` it should never have treated as a comment:
 *
 *   const marker = `${`//`}`; pool.query("UPDATE records SET x = 1");
 *   function f() { throw /[//]/; } pool.query("UPDATE records SET x = 1");
 *
 * The first hid `pool.query`/`UPDATE` because the scanner did not understand
 * NESTED template-expression substitutions (`${ ... }` containing another
 * template); the second because it only recognized a regex literal after a
 * limited predecessor set (so the `/` after `throw` was read as division and
 * the `//` in the char class started a "comment").
 *
 * Rather than keep expanding brittle character rules, this uses the real
 * grammar: `ts.createSourceFile` parses the source, and we keep the EXACT
 * source character ranges of every leaf token (identifiers, keywords,
 * punctuation, and the full text of string/template/regex literals), blanking
 * only the inter-token characters — which is exactly the comment trivia (plus
 * insignificant whitespace, which we preserve). JSDoc (`/** ... *␣/`) is
 * promoted by the parser to AST nodes attached to the following declaration, so
 * we skip the entire JSDoc subtree (it is a comment, not executable source).
 *
 * Result: a `//` or `/*` that lives INSIDE a literal is part of that literal's
 * token text and is preserved verbatim (so any durable-write token after it
 * stays visible to the denylist), while a `//` or `/*` that is a REAL comment
 * is trivia between tokens and is blanked. This is sound for every TypeScript
 * construct, not just the ones an author happened to anticipate.
 */
function stripComments(src: string): string {
  const sf = ts.createSourceFile(
    'scope-guard-scan.ts',
    src,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    ts.ScriptKind.TS,
  );
  // keep[i] === 1 iff source char i belongs to a real executable leaf token.
  const keep = new Uint8Array(src.length);
  const markLeafRanges = (node: ts.Node): void => {
    // JSDoc nodes are comments the parser attached to declarations; their inner
    // text (which may legitimately say "no database writes") is NOT executable
    // source and must not be scanned. Drop the whole JSDoc subtree.
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) {
      return;
    }
    const children = node.getChildren(sf);
    if (children.length === 0) {
      // Leaf token: keep its EXACT source range. getStart(sf, false) excludes
      // leading trivia (whitespace + comments); getEnd() is the token end. The
      // full text of string/template/regex literals is a single token range, so
      // a `//` inside a literal is preserved, never read as a comment.
      const start = node.getStart(sf, /*includeJsDocComment*/ false);
      const end = node.getEnd();
      for (let i = start; i < end; i++) keep[i] = 1;
      return;
    }
    for (const child of children) markLeafRanges(child);
  };
  markLeafRanges(sf);
  // Emit kept token chars verbatim; replace every other non-whitespace char
  // (i.e. comment trivia) with a space so token boundaries are preserved and no
  // two real tokens are ever fused across a stripped comment.
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    out += keep[i] === 1 || /\s/.test(ch) ? ch : ' ';
  }
  return out;
}

/** The durable-write denylist (Patch 2 of the earlier 33N audit). Shared by the
 *  spike-source guard and the Patch-1 scanner regression tests below. */
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

/** Names of every denylist token that matches the (already comment-stripped)
 *  code — used by the regression tests to prove the scanner does not let a
 *  literal hide a durable-write token, and does strip real comments. */
function durableWriteHits(strippedCode: string): string[] {
  return DURABLE_WRITE_DENYLIST.filter(([, re]) => re.test(strippedCode)).map(([name]) => name);
}

function allImportSpecifiers(src: string): string[] {
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const out: string[] = [];
  for (const m of stripped.matchAll(ANY_IMPORT_RE)) out.push(m[1]!);
  for (const m of stripped.matchAll(BARE_IMPORT_RE)) out.push(m[1]!);
  return out;
}

describe('Phase 33N scope guards — spike source files exist', () => {
  it('the spike service dir and route file are present', () => {
    expect(SPIKE_FILES.length).toBeGreaterThanOrEqual(5);
    expect(existsSync(SPIKE_ROUTE_FILE)).toBe(true);
  });
});

describe('Phase 33N scope guards — no forbidden imports in the spike path', () => {
  it('no Freeside import', () => {
    for (const f of SPIKE_FILES) {
      const imports = allImportSpecifiers(readFileSync(f, 'utf8'));
      const offenders = imports.filter((i) => /freeside/i.test(i));
      expect({ file: f, offenders }).toEqual({ file: f, offenders: [] });
    }
  });

  it('no @loa/straylight import (runtime or type)', () => {
    for (const f of SPIKE_FILES) {
      const imports = allImportSpecifiers(readFileSync(f, 'utf8'));
      const offenders = imports.filter((i) => i.startsWith('@loa/straylight'));
      expect({ file: f, offenders }).toEqual({ file: f, offenders: [] });
    }
  });

  it('no production storage / DB / migration / pg import reachable from the spike', () => {
    for (const f of SPIKE_FILES) {
      const imports = allImportSpecifiers(readFileSync(f, 'utf8'));
      const offenders = imports.filter(
        (i) =>
          i === 'pg' ||
          /\/db\/(client|pool|migrate|transaction)/.test(i) ||
          /\/db\/migrations\//.test(i) ||
          /-store(\.js)?$/.test(i) ||
          /BoundedEstateStore|bounded-estate-store/.test(i),
      );
      expect({ file: f, offenders }).toEqual({ file: f, offenders: [] });
    }
  });

  it('the spike source contains no SQL / migration / DB-execution / durable-write tokens', () => {
    // Patch 2 (Phase 33N audit): the original guard only caught `INSERT INTO`,
    // `CREATE TABLE`, `pool.query`, and `migrate(`, so it could not PROVE the
    // "no durable write / no SQL execution" invariant — it missed UPDATE,
    // DELETE, ALTER/DROP TABLE, bare `query(`/`.query(`, `execute(`/`.execute(`,
    // tagged `sql\`` templates, `db.`, and the pg/postgres/database/migration
    // family. The full denylist below proves the invariant.
    //
    // CODE-ONLY scoping: this spike intentionally DOCUMENTS its non-goals in
    // prose ("NO database writes, NO migrations"), so a raw-text scan would
    // false-positive on comments. We strip block and line comments first (via a
    // syntax-aware scanner — see stripComments + Patch 1 regression tests), so
    // the guard asserts the absence of these tokens in executable source —
    // exactly what the invariant requires. (Verified: every spike source file
    // is clean under this denylist after comment-stripping.)
    for (const f of SPIKE_FILES) {
      const code = stripComments(readFileSync(f, 'utf8'));
      for (const [name, re] of DURABLE_WRITE_DENYLIST) {
        const offender = code.match(re);
        // Report the file + token + matched text so a future regression is
        // immediately legible instead of a bare boolean failure.
        expect({ file: f, token: name, matched: offender ? offender[0] : null }).toEqual({
          file: f,
          token: name,
          matched: null,
        });
      }
    }
  });
});

describe('Phase 33N scope guards — comment stripper is parser-backed & sound (Patch 1)', () => {
  // The hand-rolled scanners (both rounds) truncated a line at a `//` they
  // wrongly treated as a comment, hiding any durable-write token that followed.
  // These prove the parser-backed stripper (a) does NOT let a string, template
  // (incl. nested `${`//`}`), or regex literal (incl. char classes `/[//]/`)
  // hide a token, and (b) DOES strip real line, block, and JSDoc comments.

  // --- Codex round-2 counterexamples (the two valid-TS bypasses) ---
  // Both parsed with zero TypeScript diagnostics yet produced ZERO denylist
  // hits under the old hand-rolled scanner. The parser-backed stripper keeps
  // the literal text intact, so `pool.query` and `UPDATE` after it stay visible.

  it('a NESTED template substitution `${`//`}` does NOT hide a later pool.query/UPDATE', () => {
    // Codex counterexample #1. The inner template `${`//`}` must not be read as
    // closing the outer template + starting a `//` line comment.
    const src = 'const marker = `${`//`}`; pool.query("UPDATE records SET x = 1");';
    const hits = durableWriteHits(stripComments(src));
    expect(hits).toEqual(expect.arrayContaining(['pool.query', 'UPDATE']));
  });

  it('a regex literal `/[//]/` after `throw` does NOT hide a later pool.query/UPDATE', () => {
    // Codex counterexample #2. The `/` after `throw` legally begins a regex
    // whose char class `[//]` contains literal slashes — never a line comment.
    const src = 'function f() { throw /[//]/; } pool.query("UPDATE records SET x = 1");';
    const hits = durableWriteHits(stripComments(src));
    expect(hits).toEqual(expect.arrayContaining(['pool.query', 'UPDATE']));
  });

  // --- Earlier mutation suite (must keep passing under the new stripper) ---

  it('a `//` inside a double-quoted string does NOT hide a later pool.query/UPDATE', () => {
    const src = 'const marker = "//"; pool.query("UPDATE records SET x = 1");';
    const hits = durableWriteHits(stripComments(src));
    // The string content is preserved, so pool.query, query(, .query( and
    // UPDATE all remain visible to the denylist.
    expect(hits).toEqual(expect.arrayContaining(['pool.query', 'UPDATE']));
  });

  it('a `/*` inside a string does NOT hide a later execute(...)/DELETE in the file', () => {
    const src = 'const marker = "/*"; execute("DELETE FROM records");';
    const hits = durableWriteHits(stripComments(src));
    expect(hits).toEqual(expect.arrayContaining(['execute(', 'DELETE']));
  });

  it('a `//` inside a TEMPLATE literal does NOT hide a later query/UPDATE', () => {
    const src = 'const marker = `//`; query("UPDATE records SET x = 1");';
    const hits = durableWriteHits(stripComments(src));
    expect(hits).toEqual(expect.arrayContaining(['query(', 'UPDATE']));
  });

  it('a REAL line comment containing pool.query("UPDATE ...") is stripped/ignored', () => {
    const src = 'const ok = true; // pool.query("UPDATE records SET x = 1")\nconst y = 2;';
    const stripped = stripComments(src);
    expect(stripped).not.toContain('pool.query');
    expect(durableWriteHits(stripped)).toEqual([]);
  });

  it('a REAL block comment containing execute("DELETE ...") is stripped/ignored', () => {
    const src = 'const ok = true;\n/* execute("DELETE FROM records") */\nconst y = 2;';
    const stripped = stripComments(src);
    expect(stripped).not.toContain('execute(');
    expect(durableWriteHits(stripped)).toEqual([]);
  });

  it('a REAL JSDoc comment containing SQL/db prose is stripped/ignored', () => {
    // The parser promotes `/** ... *␣/` to a JSDoc AST node; the stripper must
    // drop it (it is prose: the spike documents "no database writes" etc.).
    const src =
      '/**\n * No database writes; no migration; never pool.query("UPDATE x").\n */\nfunction f() { return 1; }';
    const stripped = stripComments(src);
    expect(stripped).not.toContain('pool.query');
    expect(stripped).not.toContain('database');
    expect(durableWriteHits(stripped)).toEqual([]);
  });

  it('regex literals with internal slashes are preserved (not read as comments)', () => {
    // A `/\/\//` regex must not be mistaken for a `//` line comment; the code
    // after it (here a UPDATE token) must remain visible.
    const src = 'const re = /\\/\\//g; query("UPDATE x SET a = 1");';
    const hits = durableWriteHits(stripComments(src));
    expect(hits).toEqual(expect.arrayContaining(['query(', 'UPDATE']));
  });
});

describe('Phase 33N scope guards — no package export of the spike', () => {
  it('app/package.json declares no exports map (the spike adds no package export)', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_APP, 'package.json'), 'utf8'));
    // The dixie-bff app is a private application, not a published package; it
    // has no `exports` field, so the spike cannot be a package export. If a
    // future change adds an `exports` map, it MUST NOT export the spike.
    if (pkg.exports) {
      const exportsStr = JSON.stringify(pkg.exports);
      expect(exportsStr).not.toMatch(/admission-wedge-spike|admission-intake/);
    } else {
      expect(pkg.exports).toBeUndefined();
    }
  });

  it('no src/index.ts barrel re-exports the spike (server-mounted only)', () => {
    // The application entrypoint is src/index.ts (a runnable server, not a
    // library barrel). Assert it does not re-export the spike service/route.
    const indexPath = join(REPO_APP, 'src', 'index.ts');
    const src = readFileSync(indexPath, 'utf8');
    expect(src).not.toMatch(/admission-wedge-spike/);
    expect(src).not.toMatch(/admission-intake/);
  });
});

describe('Phase 33N scope guards — Phase 33L docs validator stays isolated', () => {
  const VALIDATOR = join(
    REPO_ROOT,
    'docs',
    'admission-wedge',
    'route-contract-test-vectors',
    'validate-route-contract-test-vectors.mjs',
  );

  it('the route-contract validator imports only node built-ins, nothing from app/ or straylight', () => {
    const src = readFileSync(VALIDATOR, 'utf8');
    const imports = allImportSpecifiers(src);
    // Every import specifier must be a node: built-in — proving the docs
    // validator imports nothing from app/, from @loa/straylight, or from the
    // sibling probe validator (it stays Node-built-ins-only, NOT runtime-wired).
    expect(imports.length).toBeGreaterThan(0);
    for (const i of imports) {
      expect({ specifier: i, isNodeBuiltin: i.startsWith('node:') }).toEqual({
        specifier: i,
        isNodeBuiltin: true,
      });
    }
    expect(imports.some((i) => i.includes('app/'))).toBe(false);
    expect(imports.some((i) => i.startsWith('@loa/straylight'))).toBe(false);
  });
});
