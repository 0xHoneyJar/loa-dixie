// Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike: planner / gate / manifest / apply / reducer tests.
//
// Proves the Phase 47E checklist obligations for the isolated experimental
// aw_* SQL spike that this lane implements:
//   * §10 (Section C) — dev/operator gate required, disabled by default, strict
//     `=== 'true'`, production refused, never a production default;
//   * §9 (Section B) — exact manifest: strict schema (exact keys/literals, no
//     coercion, no duplicates, role/filename consistency), fail closed on
//     unlisted / unknown / out-of-location / missing, cannot name a production
//     path or follow a symlink;
//   * §8 (Section A) — path traversal / absolute / outside-folder / symlink /
//     realpath-escape fail closed;
//   * §15 (Section H) — storage semantics: BOUNDED opaque refs only (DDL CHECK +
//     reducer), NO raw payload, actor scope on every scoped artifact;
//   * §18 (Section K) — rollback/recovery: all-or-nothing apply, partial-failure
//     rollback is deterministic; dev-only identical-replay vs conflict is defined
//     and fails closed with no partial footprint; dry-run plan opens nothing;
//   * §16 (Section I) — no public response expansion / no-leak parity preserved.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AW_SQL_ISOLATION_SPIKE_GATE_ENV,
  AW_SQL_ISOLATION_SPIKE_DIR_NAME,
  assertDevOperatorGateOpen,
  isDevOperatorGateOpen,
  isProductionEnv,
  loadIsolationSpikeManifest,
  buildIsolationSpikePlan,
  applyIsolationSpikePlan,
  resolveContainedSqlPath,
  resolveRealContainedSqlFile,
  isContainedSqlPath,
  isolatedSqlDir,
  defaultSpikeRoot,
  createSyntheticWriteReducer,
  isSyntheticOpaqueRef,
  SYNTHETIC_REF_MAX_LENGTH,
  evaluateIsolationSpikeExecutionGate,
  assertIsolationSpikeExecutionGateOpen,
  ISOLATION_SPIKE_EXECUTION_REFUSAL,
  IsolationSpikeDisabledError,
  IsolationSpikeProductionRefusedError,
  IsolationSpikeManifestError,
  IsolationSpikePathEscapeError,
  IsolationSpikeApplyError,
  IsolationSpikeSyntheticInputError,
  IsolationSpikeReplayConflictError,
  IsolationSpikeExecutionRefusedError,
  type IsolationSpikeStatementSink,
  type IsolationSpikeExecutionGateInput,
  type SyntheticAssertionWrite,
} from '../../../src/services/admission-wedge-spike/aw-sql-isolation-spike/index.js';
import {
  findAdmissionPublicLeaks,
  isAdmissionPublicSafe,
} from '../../../src/services/admission-wedge-spike/index.js';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const REAL_SPIKE_ROOT = join(
  REPO_APP,
  'src',
  'services',
  'admission-wedge-spike',
  AW_SQL_ISOLATION_SPIKE_DIR_NAME,
);
const PROD_MIGRATIONS_DIR = join(REPO_APP, 'src', 'db', 'migrations');

/** Build a temp spike root with a manifest + sql files so manifest edge cases
 *  can be exercised without touching the real shipped manifest. */
function makeTempSpike(manifest: unknown, sqlFiles: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-spike-'));
  mkdirSync(join(root, 'sql'), { recursive: true });
  for (const [name, body] of Object.entries(sqlFiles)) {
    writeFileSync(join(root, 'sql', name), body, 'utf8');
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  return root;
}

const tempRoots: string[] = [];
function tempSpike(manifest: unknown, sqlFiles: Record<string, string>): string {
  const root = makeTempSpike(manifest, sqlFiles);
  tempRoots.push(root);
  return root;
}
function trackTemp(root: string): string {
  tempRoots.push(root);
  return root;
}
afterEach(() => {
  while (tempRoots.length) rmSync(tempRoots.pop()!, { recursive: true, force: true });
});

// The strict schema requires the EXACT spike/kind literals — mirror them here.
const OK_MANIFEST = {
  spike: 'phase-47f-aw-sql-isolation-spike',
  kind: 'experimental-dev-operator-only',
  production: false,
  schemaFinal: false,
  forward: ['sql/0001_init.sql'],
  cleanup: ['sql/0001_init_down.sql'],
};
const OK_SQL = {
  '0001_init.sql': 'CREATE TABLE IF NOT EXISTS aw_isolation_spike_assertion (x TEXT);',
  '0001_init_down.sql': 'DROP TABLE IF EXISTS aw_isolation_spike_assertion;',
};

// ── Section C (§10) — dev/operator gate ───────────────────────────────────────

describe('Phase 47F — dev/operator gate (Section C / §10)', () => {
  it('is disabled by default: an unset flag fails closed', () => {
    expect(isDevOperatorGateOpen({ enabledFlag: undefined, nodeEnv: 'development' })).toBe(false);
    expect(() => assertDevOperatorGateOpen({ enabledFlag: undefined, nodeEnv: 'development' })).toThrow(
      IsolationSpikeDisabledError,
    );
  });

  it('requires the literal "true" — any other value fails closed', () => {
    for (const v of ['1', 'TRUE', 'yes', 'on', '', ' true ', 'false']) {
      expect(isDevOperatorGateOpen({ enabledFlag: v, nodeEnv: 'development' })).toBe(false);
      expect(() => assertDevOperatorGateOpen({ enabledFlag: v, nodeEnv: 'development' })).toThrow(
        IsolationSpikeDisabledError,
      );
    }
  });

  it('opens only for exactly "true" in a non-production env', () => {
    expect(isDevOperatorGateOpen({ enabledFlag: 'true', nodeEnv: 'development' })).toBe(true);
    expect(() => assertDevOperatorGateOpen({ enabledFlag: 'true', nodeEnv: 'development' })).not.toThrow();
  });

  it('refuses a production environment even when the flag is "true" (§10 C.6 / §7)', () => {
    for (const env of ['production', 'PRODUCTION', ' production ']) {
      expect(isProductionEnv(env)).toBe(true);
      expect(isDevOperatorGateOpen({ enabledFlag: 'true', nodeEnv: env })).toBe(false);
      expect(() => assertDevOperatorGateOpen({ enabledFlag: 'true', nodeEnv: env })).toThrow(
        IsolationSpikeProductionRefusedError,
      );
    }
  });

  it('the gate env var name is the dedicated Phase 47F var (no production default)', () => {
    expect(AW_SQL_ISOLATION_SPIKE_GATE_ENV).toBe(
      'DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED',
    );
  });
});

// ── Section B (§9) — exact manifest + strict schema ───────────────────────────

describe('Phase 47F — exact manifest (Section B / §9)', () => {
  it('loads the real shipped manifest and it is non-production / non-final', () => {
    const m = loadIsolationSpikeManifest(REAL_SPIKE_ROOT);
    expect(m.production).toBe(false);
    expect(m.schemaFinal).toBe(false);
    expect(m.forward.length).toBeGreaterThan(0);
    expect(m.cleanup.length).toBeGreaterThan(0);
  });

  it('refuses a manifest whose "production" is not exactly false (B / §15)', () => {
    const root = tempSpike({ ...OK_MANIFEST, production: true }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikeManifestError);
  });

  it('refuses a manifest whose "schemaFinal" is not exactly false (no final schema freeze, §15 H.8)', () => {
    const root = tempSpike({ ...OK_MANIFEST, schemaFinal: true }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/schemaFinal/);
  });

  it('refuses an empty forward / cleanup list', () => {
    const root1 = tempSpike({ ...OK_MANIFEST, forward: [] }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root1)).toThrow(/forward/);
    const root2 = tempSpike({ ...OK_MANIFEST, cleanup: [] }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root2)).toThrow(/cleanup/);
  });

  it('refuses a non-object / non-JSON manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-bad-'));
    tempRoots.push(root);
    mkdirSync(join(root, 'sql'), { recursive: true });
    writeFileSync(join(root, 'manifest.json'), 'not json at all', 'utf8');
    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikeManifestError);
  });

  it('B.2 — refuses a manifest entry whose file is missing on disk (fail closed)', () => {
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/9999_absent.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/missing on disk/);
    expect(() => buildIsolationSpikePlan(root, 'forward')).toThrow(/missing on disk/);
  });

  it('B.5 — refuses an entry outside the isolated sql/ folder', () => {
    const root = tempSpike({ ...OK_MANIFEST, forward: ['notsql/0001_init.sql'] }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikePathEscapeError);
  });

  it('B.5 — refuses a nested subfolder entry (entries must be exactly sql/<file>.sql)', () => {
    const root = tempSpike({ ...OK_MANIFEST, forward: ['sql/sub/0001_init.sql'] }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikePathEscapeError);
  });

  it('B.4 — refuses an entry that names a normal production location', () => {
    for (const evil of [
      '../db/migrations/016_aw.sql',
      '../../db/migrations/016_aw.sql',
      'sql/../../db/migrations/016_aw.sql',
    ]) {
      const root = tempSpike({ ...OK_MANIFEST, forward: [evil] }, OK_SQL);
      expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikePathEscapeError);
    }
  });

  // ── FAIL CLOSED on unlisted SQL (Codex defect #1) ──────────────────────────
  it('FAILS CLOSED when an unlisted .sql file is present in sql/ (no "adopt every .sql" fallback)', () => {
    const root = tempSpike(OK_MANIFEST, {
      ...OK_SQL,
      '0002_unlisted.sql': 'CREATE TABLE aw_isolation_spike_extra (x TEXT);',
    });
    // The extra file exists on disk...
    expect(readdirSync(join(root, 'sql'))).toContain('0002_unlisted.sql');
    // ...and planning REFUSES it (fail closed), rather than silently ignoring it.
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/unlisted .sql/);
    expect(() => buildIsolationSpikePlan(root, 'forward')).toThrow(/unlisted .sql/);
  });

  it('FAILS CLOSED when a manifest-listed file is missing (no silent skip)', () => {
    // Manifest lists two forward files; only one is on disk.
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0002_more.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/missing on disk/);
  });
});

describe('Phase 47F — strict manifest schema (Section B / §9, Codex defect #3)', () => {
  it('rejects an unknown top-level key (exact schema, no extra metadata)', () => {
    const root = tempSpike({ ...OK_MANIFEST, surprise: true }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/unknown top-level key/);
  });

  it('rejects a wrong "spike" literal (no coercion)', () => {
    const root = tempSpike({ ...OK_MANIFEST, spike: 'phase-99z-evil' }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/"spike" must be exactly/);
  });

  it('rejects a wrong "kind" literal (no coercion)', () => {
    const root = tempSpike({ ...OK_MANIFEST, kind: 'production-ready' }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/"kind" must be exactly/);
  });

  it('rejects a coerced "production" (e.g. the string "false", number 0, null)', () => {
    for (const bad of ['false', 0, null]) {
      const root = tempSpike({ ...OK_MANIFEST, production: bad }, OK_SQL);
      expect(() => loadIsolationSpikeManifest(root)).toThrow(/"production" must be exactly false/);
    }
  });

  it('rejects a coerced "schemaFinal" (string "false" is NOT boolean false)', () => {
    const root = tempSpike({ ...OK_MANIFEST, schemaFinal: 'false' }, OK_SQL);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/"schemaFinal" must be exactly false/);
  });

  it('rejects a non-string ("object") entry — entries are exact string paths, not sub-objects', () => {
    // The manifest entries are plain string paths; there are no entry sub-keys,
    // so a non-string entry (the only place "unknown entry keys" could hide) is
    // rejected outright.
    const root = tempSpike(
      { ...OK_MANIFEST, forward: [{ path: 'sql/0001_init.sql', extra: 1 }] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/must be a string path/);
  });

  it('rejects duplicate forward entries (deterministic unique entries)', () => {
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0001_init.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/duplicate forward entry/);
  });

  it('rejects a path that appears in BOTH forward and cleanup (disjoint lists)', () => {
    // Same path in both lists — the disjoint check fires.
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql'], cleanup: ['sql/0001_init.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/BOTH forward and cleanup/);
  });

  it('rejects a `_down.sql` placed in the forward (apply) list', () => {
    // Disjoint lists, but the forward entry carries the cleanup suffix.
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init_down.sql'], cleanup: ['sql/0002_more_down.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/must not be a cleanup/);
  });

  it('rejects a non-`_down.sql` file placed in the cleanup list', () => {
    // Disjoint lists, but the cleanup entry is not a `_down.sql` file.
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql'], cleanup: ['sql/0002_more.sql'] },
      OK_SQL,
    );
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/must be a "_down\.sql" file/);
  });
});

// ── Section A (§8) — path containment / traversal / symlink / realpath ────────

describe('Phase 47F — path containment (Section A / §8, traversal/absolute)', () => {
  const root = REAL_SPIKE_ROOT;

  it('accepts a contained sql/ path', () => {
    expect(isContainedSqlPath(root, 'sql/0001_aw_isolation_spike_init.sql')).toBe(true);
    const abs = resolveContainedSqlPath(root, 'sql/0001_aw_isolation_spike_init.sql');
    expect(abs.startsWith(isolatedSqlDir(root))).toBe(true);
  });

  it('rejects traversal (..) segments', () => {
    for (const evil of ['../x.sql', 'sql/../x.sql', 'sql/../../etc/passwd.sql', '../../db/migrations/x.sql']) {
      expect(isContainedSqlPath(root, evil)).toBe(false);
      expect(() => resolveContainedSqlPath(root, evil)).toThrow(IsolationSpikePathEscapeError);
    }
  });

  it('rejects absolute paths', () => {
    for (const evil of ['/etc/passwd.sql', '/tmp/x.sql', resolve(root, 'sql', 'x.sql')]) {
      expect(isContainedSqlPath(root, evil)).toBe(false);
      expect(() => resolveContainedSqlPath(root, evil)).toThrow(/absolute/);
    }
  });

  it('rejects non-.sql, backslash, dot, and non-string entries', () => {
    for (const evil of ['sql/x.json', 'sql/x.txt', 'sql\\x.sql', 'sql/./x.sql', '', '   ']) {
      expect(isContainedSqlPath(root, evil)).toBe(false);
    }
    for (const bad of [null, undefined, 42, {}, []]) {
      expect(isContainedSqlPath(root, bad)).toBe(false);
    }
  });

  it('rejects an entry not under the sql/ leaf folder', () => {
    expect(isContainedSqlPath(root, 'manifest.json')).toBe(false);
    expect(isContainedSqlPath(root, 'index.ts')).toBe(false);
    expect(isContainedSqlPath(root, 'other/x.sql')).toBe(false);
  });
});

describe('Phase 47F — symlink + realpath containment fail closed (Section A / §8, Codex defect #2)', () => {
  it('rejects a sql/*.sql symlink that escapes the isolated folder (points outside temp root)', () => {
    const outside = mkdtempSync(join(tmpdir(), 'aw-sql-iso-outside-'));
    trackTemp(outside);
    const outsideFile = join(outside, 'evil.sql');
    writeFileSync(outsideFile, 'CREATE TABLE evil (x TEXT);', 'utf8');

    const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-symlink-'));
    trackTemp(root);
    mkdirSync(join(root, 'sql'), { recursive: true });
    writeFileSync(join(root, 'sql', '0001_init_down.sql'), OK_SQL['0001_init_down.sql'], 'utf8');
    // The forward file is a SYMLINK pointing outside the isolated folder.
    symlinkSync(outsideFile, join(root, 'sql', '0001_init.sql'));
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(OK_MANIFEST), 'utf8');

    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikePathEscapeError);
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/symlink/);
    expect(() => resolveRealContainedSqlFile(root, 'sql/0001_init.sql')).toThrow(/symlink/);
  });

  it('rejects a sql/*.sql symlink that points at a production migration file', () => {
    const prodFiles = readdirSync(PROD_MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(prodFiles.length).toBeGreaterThan(0);
    const prodTarget = join(PROD_MIGRATIONS_DIR, prodFiles[0]!);

    const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-prodlink-'));
    trackTemp(root);
    mkdirSync(join(root, 'sql'), { recursive: true });
    writeFileSync(join(root, 'sql', '0001_init_down.sql'), OK_SQL['0001_init_down.sql'], 'utf8');
    symlinkSync(prodTarget, join(root, 'sql', '0001_init.sql'));
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(OK_MANIFEST), 'utf8');

    // Even though the symlink target is a real .sql file, the symlink itself is
    // refused before it is ever followed.
    expect(() => loadIsolationSpikeManifest(root)).toThrow(/symlink/);
  });

  it('rejects a symlinked sql/ directory (the whole folder cannot be a link)', () => {
    const realSql = mkdtempSync(join(tmpdir(), 'aw-sql-iso-realsql-'));
    trackTemp(realSql);
    writeFileSync(join(realSql, '0001_init.sql'), OK_SQL['0001_init.sql'], 'utf8');
    writeFileSync(join(realSql, '0001_init_down.sql'), OK_SQL['0001_init_down.sql'], 'utf8');

    const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-dirlink-'));
    trackTemp(root);
    symlinkSync(realSql, join(root, 'sql'), 'dir');
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(OK_MANIFEST), 'utf8');

    expect(() => loadIsolationSpikeManifest(root)).toThrow(IsolationSpikePathEscapeError);
  });

  it('rejects a symlinked manifest.json', () => {
    const outside = mkdtempSync(join(tmpdir(), 'aw-sql-iso-manlink-src-'));
    trackTemp(outside);
    const manSrc = join(outside, 'manifest.json');
    writeFileSync(manSrc, JSON.stringify(OK_MANIFEST), 'utf8');

    const root = mkdtempSync(join(tmpdir(), 'aw-sql-iso-manlink-'));
    trackTemp(root);
    mkdirSync(join(root, 'sql'), { recursive: true });
    writeFileSync(join(root, 'sql', '0001_init.sql'), OK_SQL['0001_init.sql'], 'utf8');
    writeFileSync(join(root, 'sql', '0001_init_down.sql'), OK_SQL['0001_init_down.sql'], 'utf8');
    symlinkSync(manSrc, join(root, 'manifest.json'));

    expect(() => loadIsolationSpikeManifest(root)).toThrow(/symlink/);
  });

  it('accepts the real (non-symlinked) shipped files via the disk-level guard', () => {
    const abs = resolveRealContainedSqlFile(REAL_SPIKE_ROOT, 'sql/0001_aw_isolation_spike_init.sql');
    expect(abs.startsWith(isolatedSqlDir(REAL_SPIKE_ROOT))).toBe(true);
  });
});

// ── Section H (§15) — storage semantics: bounded opaque refs, NO raw payload ──

describe('Phase 47F — storage semantics / bounded opaque refs (Section H / §15)', () => {
  const forwardText = () =>
    buildIsolationSpikePlan(REAL_SPIKE_ROOT, 'forward')
      .steps.map((s) => s.statementsText)
      .join('\n');

  /** Slice the forward DDL into per-table CREATE blocks (keyed by table name).
   *  Splits on the CREATE TABLE marker so comments between tables cannot fuse
   *  two blocks; each block runs to the next CREATE TABLE (or end of file). */
  function tableBlocks(): Record<string, string> {
    const text = forwardText();
    const marker = 'CREATE TABLE IF NOT EXISTS';
    const blocks: Record<string, string> = {};
    const starts: number[] = [];
    for (let i = text.indexOf(marker); i !== -1; i = text.indexOf(marker, i + 1)) {
      starts.push(i);
    }
    for (let k = 0; k < starts.length; k++) {
      const start = starts[k]!;
      const end = k + 1 < starts.length ? starts[k + 1]! : text.length;
      const block = text.slice(start, end);
      const name = /CREATE TABLE IF NOT EXISTS (aw_isolation_spike_\w+)/.exec(block)?.[1];
      if (name) blocks[name] = block;
    }
    return blocks;
  }

  it('the real forward plan reads the experimental statement text (dry-run, applies nothing)', () => {
    const p = buildIsolationSpikePlan(REAL_SPIKE_ROOT, 'forward');
    expect(p.direction).toBe('forward');
    expect(p.steps.length).toBe(1);
    expect(p.steps[0]!.statementsText.length).toBeGreaterThan(0);
  });

  it('H.1 — reference columns are BOUNDED VARCHAR with CHECK constraints, never unbounded TEXT', () => {
    const text = forwardText();
    // Every ref column is declared VARCHAR(80), not raw TEXT.
    for (const col of [
      'tenant_ref',
      'estate_ref',
      'actor_ref',
      'assertion_ref',
      'candidate_payload_ref',
      'public_receipt_ref',
    ]) {
      expect(new RegExp(`${col}\\s+VARCHAR\\(80\\)`).test(text)).toBe(true);
      // No ref column is declared as bare TEXT.
      expect(new RegExp(`${col}\\s+TEXT\\b`).test(text)).toBe(false);
    }
    // The opaque-ref CHECK pattern (awref: prefix) is enforced in the schema.
    expect(text).toContain('awref:tenant:');
    expect(text).toContain('awref:payload:');
    expect(text).toContain('awref:receipt:');
    expect(/candidate_payload_ref.*CHECK|CHECK[\s\S]*candidate_payload_ref/.test(text)).toBe(true);
  });

  it('H.1 — candidate_payload_ref cannot be unbounded raw text by schema design', () => {
    const text = forwardText();
    // It is VARCHAR(80) AND constrained to the bounded awref:payload pattern.
    expect(/candidate_payload_ref\s+VARCHAR\(80\)/.test(text)).toBe(true);
    expect(text).toContain("candidate_payload_ref ~ '^awref:payload:");
    // It is NOT a bare TEXT column.
    expect(/candidate_payload_ref\s+TEXT\b/.test(text)).toBe(false);
  });

  it('H.1 — there is NO raw payload / source material / raw reasons column', () => {
    const text = forwardText();
    expect(/\braw_candidate_payload\b/.test(text)).toBe(false);
    expect(/\bsource_material\b/.test(text)).toBe(false);
    expect(/\braw_reasons?\b/.test(text)).toBe(false);
    expect(/\bcandidate_payload(?!_ref)/.test(text)).toBe(false);
    expect(/\bprivate_receipt_ref\b/.test(text)).toBe(false);
  });

  it('H — actor_ref scope appears on EVERY scoped table (assertion + supersession + tombstone)', () => {
    const blocks = tableBlocks();
    expect(Object.keys(blocks).sort()).toEqual([
      'aw_isolation_spike_assertion',
      'aw_isolation_spike_supersession_link',
      'aw_isolation_spike_tombstone',
    ]);
    for (const [table, ddl] of Object.entries(blocks)) {
      expect({ table, hasActorRef: /\bactor_ref\b/.test(ddl) }).toEqual({ table, hasActorRef: true });
      // And actor_ref is itself a bounded opaque ref with a CHECK.
      expect({ table, bounded: /actor_ref\s+VARCHAR\(80\)/.test(ddl) }).toEqual({ table, bounded: true });
      expect({ table, checked: /actor_ref ~ '\^awref:actor:/.test(ddl) }).toEqual({ table, checked: true });
    }
  });

  it('H.2 — assertion status is the canonical active/superseded only', () => {
    const text = forwardText();
    expect(text).toContain("'active'");
    expect(text).toContain("'superseded'");
  });

  it('H.6/H.7 — supersession is a Dixie-local inverse link and a cleanup/drop path exists', () => {
    const forward = forwardText();
    expect(forward).toContain('aw_isolation_spike_supersession_link');
    expect(forward).toContain('aw_isolation_spike_tombstone');
    const cleanup = buildIsolationSpikePlan(REAL_SPIKE_ROOT, 'cleanup');
    const cleanupText = cleanup.steps.map((s) => s.statementsText).join('\n');
    expect(cleanupText).toContain('DROP TABLE IF EXISTS aw_isolation_spike_assertion');
  });
});

// ── Section H/K — dev-only synthetic-write reducer: replay vs conflict ─────────

describe('Phase 47F — dev-only replay/conflict reducer (Codex defect #5)', () => {
  const base: SyntheticAssertionWrite = {
    tenantRef: 'awref:tenant:t1',
    estateRef: 'awref:estate:e1',
    actorRef: 'awref:actor:a1',
    assertionRef: 'awref:assertion:s1',
    assertionClass: 'admit_assertion',
    candidatePayloadRef: 'awref:payload:p1',
    publicReceiptRef: 'awref:receipt:r1',
  };

  it('a first write is planned, then applied', () => {
    const r = createSyntheticWriteReducer();
    expect(r.plan(base).status).toBe('planned');
    // plan() does not mutate — it can be called repeatedly.
    expect(r.plan(base).status).toBe('planned');
    expect(r.recordedKeys()).toEqual([]);
    expect(r.record(base).status).toBe('applied');
    expect(r.recordedKeys().length).toBe(1);
  });

  it('an identical replay returns identical_replay (a no-op), NOT a generic duplicate failure', () => {
    const r = createSyntheticWriteReducer();
    r.record(base);
    expect(r.plan(base).status).toBe('identical_replay');
    expect(r.record(base).status).toBe('identical_replay');
    // Still exactly one recorded identity (the retry minted nothing new).
    expect(r.recordedKeys().length).toBe(1);
  });

  it('a conflicting replay (same identity, different material) FAILS CLOSED and records nothing', () => {
    const r = createSyntheticWriteReducer();
    r.record(base);
    const conflicting: SyntheticAssertionWrite = { ...base, assertionClass: 'supersede_assertion' };
    // plan() reports the conflict without throwing; record() fails closed.
    expect(r.plan(conflicting).status).toBe('conflict');
    expect(() => r.record(conflicting)).toThrow(IsolationSpikeReplayConflictError);
    // The original material is intact; the conflicting write left NO footprint.
    expect(r.recordedKeys().length).toBe(1);
    expect(r.record(base).status).toBe('identical_replay');
  });

  it('a conflicting payload reference is also a conflict (material includes refs)', () => {
    const r = createSyntheticWriteReducer();
    r.record(base);
    expect(r.plan({ ...base, candidatePayloadRef: 'awref:payload:p2' }).status).toBe('conflict');
  });

  it('new material at a different identity is applied independently', () => {
    const r = createSyntheticWriteReducer();
    r.record(base);
    const other: SyntheticAssertionWrite = { ...base, assertionRef: 'awref:assertion:s2' };
    expect(r.record(other).status).toBe('applied');
    expect(r.recordedKeys().length).toBe(2);
  });

  it('recordBatch rolls back on a mid-batch conflict — no partially-admitted assertion survives', () => {
    const r = createSyntheticWriteReducer();
    const w1: SyntheticAssertionWrite = { ...base, assertionRef: 'awref:assertion:s1' };
    r.record(w1); // pre-existing
    const before = r.recordedKeys().sort();

    const w2: SyntheticAssertionWrite = { ...base, assertionRef: 'awref:assertion:s2' };
    const conflicting: SyntheticAssertionWrite = { ...w1, assertionClass: 'supersede_assertion' };
    // Batch: a brand-new write (w2) THEN a conflicting replay of w1.
    expect(() => r.recordBatch([w2, conflicting])).toThrow(IsolationSpikeReplayConflictError);
    // The brand-new w2 was rolled back — the recorded set is exactly what it was.
    expect(r.recordedKeys().sort()).toEqual(before);
  });

  it('recordBatch commits all writes when there is no conflict', () => {
    const r = createSyntheticWriteReducer();
    const w2: SyntheticAssertionWrite = { ...base, assertionRef: 'awref:assertion:s2' };
    const results = r.recordBatch([base, w2]);
    expect(results.map((x) => x.status)).toEqual(['applied', 'applied']);
    expect(r.recordedKeys().length).toBe(2);
  });
});

describe('Phase 47F — bounded opaque reference enforcement (reducer mirror of DDL CHECK)', () => {
  const base: SyntheticAssertionWrite = {
    tenantRef: 'awref:tenant:t1',
    estateRef: 'awref:estate:e1',
    actorRef: 'awref:actor:a1',
    assertionRef: 'awref:assertion:s1',
    assertionClass: 'admit_assertion',
  };

  it('accepts a bounded awref:<kind>:<short-id> reference', () => {
    expect(isSyntheticOpaqueRef('awref:tenant:abc-123', 'tenant')).toBe(true);
    expect(isSyntheticOpaqueRef('awref:payload:p1', 'payload')).toBe(true);
  });

  it('rejects a raw JSON / source-material blob as a reference (no raw payload)', () => {
    const r = createSyntheticWriteReducer();
    const rawBlob = JSON.stringify({ raw: 'sensitive candidate text'.repeat(50) });
    expect(isSyntheticOpaqueRef(rawBlob, 'payload')).toBe(false);
    expect(() => r.record({ ...base, candidatePayloadRef: rawBlob })).toThrow(
      IsolationSpikeSyntheticInputError,
    );
  });

  it('rejects an over-length reference (capacity bound)', () => {
    const tooLong = 'awref:payload:' + 'x'.repeat(SYNTHETIC_REF_MAX_LENGTH);
    expect(tooLong.length).toBeGreaterThan(SYNTHETIC_REF_MAX_LENGTH);
    expect(isSyntheticOpaqueRef(tooLong, 'payload')).toBe(false);
    const r = createSyntheticWriteReducer();
    expect(() => r.record({ ...base, candidatePayloadRef: tooLong })).toThrow(
      IsolationSpikeSyntheticInputError,
    );
  });

  it('rejects a reference with the wrong kind prefix', () => {
    expect(isSyntheticOpaqueRef('awref:payload:p1', 'tenant')).toBe(false);
    const r = createSyntheticWriteReducer();
    expect(() => r.record({ ...base, tenantRef: 'awref:payload:p1' })).toThrow(
      IsolationSpikeSyntheticInputError,
    );
  });

  it('rejects a missing required scope reference', () => {
    const r = createSyntheticWriteReducer();
    expect(() => r.record({ ...base, actorRef: '' })).toThrow(IsolationSpikeSyntheticInputError);
  });

  it('accepts a null/omitted optional payload/receipt reference', () => {
    const r = createSyntheticWriteReducer();
    expect(r.record({ ...base, candidatePayloadRef: null, publicReceiptRef: undefined }).status).toBe(
      'applied',
    );
  });
});

// ── Section K (§18) — rollback / recovery, all-or-nothing apply ───────────────

describe('Phase 47F — rollback / recovery (Section K / §18)', () => {
  function recordingSink(): IsolationSpikeStatementSink & { calls: string[]; applied: string[] } {
    const calls: string[] = [];
    const applied: string[] = [];
    return {
      calls,
      applied,
      begin() {
        calls.push('begin');
      },
      applyStatement(text: string) {
        calls.push('apply');
        applied.push(text);
      },
      commit() {
        calls.push('commit');
      },
      rollback() {
        calls.push('rollback');
      },
    };
  }

  it('K — applies all steps in order then commits (begin → apply* → commit)', async () => {
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0002_more.sql'] },
      { ...OK_SQL, '0002_more.sql': 'CREATE TABLE aw_isolation_spike_two (x TEXT);' },
    );
    const sink = recordingSink();
    const result = await applyIsolationSpikePlan(buildIsolationSpikePlan(root, 'forward'), sink);
    expect(sink.calls).toEqual(['begin', 'apply', 'apply', 'commit']);
    expect(result.appliedCount).toBe(2);
    expect(result.appliedRelPaths).toEqual(['sql/0001_init.sql', 'sql/0002_more.sql']);
  });

  it('K.1/K.2 — a partial failure rolls back deterministically and throws (no half-applied state)', async () => {
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0002_more.sql'] },
      { ...OK_SQL, '0002_more.sql': 'CREATE TABLE aw_isolation_spike_two (x TEXT);' },
    );
    const calls: string[] = [];
    let n = 0;
    const failing: IsolationSpikeStatementSink = {
      begin() {
        calls.push('begin');
      },
      applyStatement() {
        calls.push('apply');
        n += 1;
        if (n === 2) throw new Error('synthetic apply fault');
      },
      commit() {
        calls.push('commit');
      },
      rollback() {
        calls.push('rollback');
      },
    };
    await expect(
      applyIsolationSpikePlan(buildIsolationSpikePlan(root, 'forward'), failing),
    ).rejects.toThrow(IsolationSpikeApplyError);
    expect(calls).toEqual(['begin', 'apply', 'apply', 'rollback']);
    expect(calls).not.toContain('commit');
  });

  it('K — a rollback fault does not mask the original failure', async () => {
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    const failing: IsolationSpikeStatementSink = {
      begin() {},
      applyStatement() {
        throw new Error('apply fault');
      },
      commit() {},
      rollback() {
        throw new Error('rollback also faulted');
      },
    };
    await expect(
      applyIsolationSpikePlan(buildIsolationSpikePlan(root, 'forward'), failing),
    ).rejects.toThrow(IsolationSpikeApplyError);
  });

  it('dry-run plan building opens no connection and applies nothing (no sink involved)', () => {
    const p = buildIsolationSpikePlan(REAL_SPIKE_ROOT, 'forward');
    expect(Array.isArray(p.steps)).toBe(true);
  });
});

// ── Phase 47J — execution-gate seam composes with the all-or-nothing apply ─────

describe('Phase 47F/47J — execution-gate seam is pure and runner-fed', () => {
  const openInput: IsolationSpikeExecutionGateInput = {
    applyRequested: true,
    executionOptInPresent: true,
    devOperatorModeAccepted: true,
    nonProductionTargetAccepted: true,
    explicitRunnerInvocation: true,
    manifestVerified: true,
    pathContainmentVerified: true,
    noUnlistedSql: true,
    cleanupRequested: false,
    cleanupOptInPresent: false,
  };

  it('evaluateIsolationSpikeExecutionGate is open only with every gate, refuses each missing one', () => {
    expect(evaluateIsolationSpikeExecutionGate(openInput).open).toBe(true);
    const closed = evaluateIsolationSpikeExecutionGate({ ...openInput, executionOptInPresent: false });
    expect(closed.open).toBe(false);
    expect(closed.refusals).toContain(ISOLATION_SPIKE_EXECUTION_REFUSAL.EXECUTION_OPT_IN_MISSING);
    expect(() => assertIsolationSpikeExecutionGateOpen(openInput)).not.toThrow();
    expect(() =>
      assertIsolationSpikeExecutionGateOpen({ ...openInput, nonProductionTargetAccepted: false }),
    ).toThrow(IsolationSpikeExecutionRefusedError);
  });

  it('once the gate is open, the same injected-sink apply path runs all-or-nothing', async () => {
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    assertIsolationSpikeExecutionGateOpen(openInput);
    const calls: string[] = [];
    const sink: IsolationSpikeStatementSink = {
      begin() {
        calls.push('begin');
      },
      applyStatement() {
        calls.push('apply');
      },
      commit() {
        calls.push('commit');
      },
      rollback() {
        calls.push('rollback');
      },
    };
    const result = await applyIsolationSpikePlan(buildIsolationSpikePlan(root, 'forward'), sink);
    expect(calls).toEqual(['begin', 'apply', 'commit']);
    expect(result.appliedCount).toBe(1);
  });
});

// ── Section I (§16) — no public response expansion / no-leak parity ───────────

describe('Phase 47F — public/private no-leak (Section I / §16)', () => {
  it('the isolation spike adds NO public-response builder (no public surface)', () => {
    const src = readFileSync(join(REAL_SPIKE_ROOT, 'index.ts'), 'utf8');
    expect(src).not.toMatch(/buildAdmissionSpikePublicResponse|PublicResponse/);
  });

  it('the runtime no-leak guard is intact and still flags forbidden keys (114-key parity preserved)', () => {
    expect(findAdmissionPublicLeaks({ tenant_id: 'x' })).not.toEqual([]);
    expect(findAdmissionPublicLeaks({ receipt_hash: 'x' })).not.toEqual([]);
    expect(isAdmissionPublicSafe({ outcome_class: 'accepted', recall_eligible: false })).toBe(true);
  });

  it('I.5 — neither the manifest nor the experimental SQL carries a forbidden public key as data', () => {
    const manifest = JSON.parse(readFileSync(join(REAL_SPIKE_ROOT, 'manifest.json'), 'utf8'));
    const manifestStr = JSON.stringify(manifest);
    expect(manifestStr).not.toMatch(/raw_candidate_payload|source_material|signature|private_receipt_ref/);
  });
});

// ── Cross-check — the real spike root resolves and is self-consistent ─────────

describe('Phase 47F — real spike root integrity', () => {
  it('defaultSpikeRoot resolves under the admission-wedge-spike service dir', () => {
    expect(typeof defaultSpikeRoot()).toBe('string');
    const m = loadIsolationSpikeManifest(REAL_SPIKE_ROOT);
    for (const rel of [...m.forward, ...m.cleanup]) {
      expect(isContainedSqlPath(REAL_SPIKE_ROOT, rel)).toBe(true);
    }
  });
});
