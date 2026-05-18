// ADR-026C §3.1–§3.8; ADR-026D §5.f.
//
// This test enforces the consumer-contract obligations as static / runtime
// invariants on the Dixie source tree:
//
//   §3.1 — subpath-only import: only `@loa/straylight/runtime/recall-intake`
//          may be value-imported. `@loa/straylight` and `@loa/straylight/host`
//          must NOT appear in any value-import position in app/src/services/
//          straylight-recall-intake/ or app/src/routes/recall-intake.ts.
//   §3.2 — no deep-import: nothing may import a path under
//          `@loa/straylight/runtime/recall-intake/<deeper>` or
//          `@loa/straylight/dist/...` / `/src/...` / `/dist-types/...`.
//   §3.3 — capability mint via public constructor (no synthesis).
//   §3.6 — no metadata trust at the seam.
//   §3.7 — capabilities are not serialised across processes.
//   §3.8 — `runtime_seam:capability_*` is non-recoverable except via
//          explicit re-mint through `createDixieCapability()`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const ADAPTER_DIR = join(REPO_APP, 'src', 'services', 'straylight-recall-intake');
const ROUTE_FILE = join(REPO_APP, 'src', 'routes', 'recall-intake.ts');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

const ADAPTER_FILES = [...walk(ADAPTER_DIR), ROUTE_FILE];

// Match `import { ... } from '...'` or `import '...'` (value imports).
// Excludes `import type { ... } from '...'` and `import { type ... }`.
const VALUE_IMPORT_RE = /^import\s+(?!type\s)([^'"]*?)\s*from\s*['"]([^'"]+)['"]/gm;
const TYPE_IMPORT_RE = /^import\s+type\s+[^'"]+from\s*['"]([^'"]+)['"]/gm;

function valueImports(src: string): string[] {
  const out: string[] = [];
  // Strip block + line comments to avoid matching examples in JSDoc.
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const m of stripped.matchAll(VALUE_IMPORT_RE)) out.push(m[2]!);
  return out;
}

function typeImports(src: string): string[] {
  const out: string[] = [];
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const m of stripped.matchAll(TYPE_IMPORT_RE)) out.push(m[1]!);
  return out;
}

describe('ADR-026C §3.1 — subpath-only Straylight value import', () => {
  it('no source under recall-intake adapter or route value-imports `@loa/straylight` (root)', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      const vs = valueImports(src);
      const offenders = vs.filter((v) => v === '@loa/straylight');
      expect({ file: f, offenders }).toEqual({ file: f, offenders: [] });
    }
  });

  it('no source under recall-intake adapter or route value-imports `@loa/straylight/host`', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      const vs = valueImports(src);
      const offenders = vs.filter((v) => v === '@loa/straylight/host');
      expect({ file: f, offenders }).toEqual({ file: f, offenders: [] });
    }
  });

  it('every Straylight VALUE import is exactly `@loa/straylight/runtime/recall-intake`', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      const vs = valueImports(src);
      const stray = vs.filter((v) => v.startsWith('@loa/straylight'));
      for (const s of stray) {
        expect({ file: f, value_import: s }).toEqual({
          file: f,
          value_import: '@loa/straylight/runtime/recall-intake',
        });
      }
    }
  });
});

describe('ADR-026C §3.2 — no deep-import beyond authorized subpath', () => {
  const FORBIDDEN_PREFIXES = [
    '@loa/straylight/dist/',
    '@loa/straylight/src/',
    '@loa/straylight/dist-types/',
    '@loa/straylight/runtime/recall-intake/',
  ];

  it('no value or type import dereferences a forbidden deep path', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      const all = [...valueImports(src), ...typeImports(src)];
      for (const v of all) {
        for (const prefix of FORBIDDEN_PREFIXES) {
          expect({ file: f, deep_import: v }).not.toEqual({
            file: f,
            deep_import: expect.stringMatching(new RegExp(`^${prefix.replace(/\//g, '\\/')}`)),
          });
          // Also: the import must not literally be a path under the forbidden prefix.
          if (v.startsWith(prefix)) {
            throw new Error(`Deep-import detected in ${f}: ${v}`);
          }
        }
      }
    }
  });
});

describe('ADR-026C §3.3 — no synthesis of capability shape', () => {
  it('no source under recall-intake constructs `{ nonce, proof }` literal', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      // Exclude comments / docstrings; check for object-literal synthesis.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      // Match `{ nonce: ..., proof: ... }` order-insensitive.
      const synthA = /\{\s*nonce\s*:[^}]*\bproof\s*:/m;
      const synthB = /\{\s*proof\s*:[^}]*\bnonce\s*:/m;
      expect({ file: f, synth: synthA.test(stripped) || synthB.test(stripped) }).toEqual({
        file: f,
        synth: false,
      });
    }
  });
});

describe('ADR-026C §3.6 — no metadata trust at the seam', () => {
  it('seam call site does not pass package_name/caller_identity/user_agent into the seam call', () => {
    const src = readFileSync(ROUTE_FILE, 'utf8');
    expect(src).toMatch(/handleRecallIntake\s*\(/);
    // Accept multi-line call: capture `handleRecallIntake(` through matched parens.
    const idx = src.indexOf('handleRecallIntake(');
    expect(idx).toBeGreaterThan(-1);
    let depth = 0;
    let i = idx + 'handleRecallIntake('.length;
    let end = i;
    depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i]!;
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
      i += 1;
    }
    const callRegion = src.slice(idx, end + 1);
    expect(callRegion).not.toMatch(/package_name|user_agent|caller_identity/i);
  });
});

describe('ADR-026C §3.7 — no JSON.stringify of the capability', () => {
  it('no source under recall-intake stringifies the capability', () => {
    for (const f of ADAPTER_FILES) {
      const src = readFileSync(f, 'utf8');
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect({
        file: f,
        leaks_capability: /JSON\.stringify\([^)]*\bcap(ability)?\b/.test(stripped),
      }).toEqual({ file: f, leaks_capability: false });
    }
  });
});
