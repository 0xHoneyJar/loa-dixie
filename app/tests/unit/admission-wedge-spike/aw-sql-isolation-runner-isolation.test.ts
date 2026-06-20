// Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike: normal-runner / packaging / startup isolation.
//
// Proves, against the ACTUAL production runner + packager + server sources (read
// from disk, not paraphrased), that the experimental aw_* SQL this lane adds is:
//   * Section A (§8) — outside the normal production migration directory, so the
//     normal forward-only runner can neither discover nor execute it;
//   * Section D (§11) — the normal runner is UNCHANGED (no hard-deny needed,
//     because isolation is by LOCATION) and existing production migrations stay
//     valid; a misplaced experimental .sql in the normal dir is proven absent;
//   * Section E (§12) — the production packager copies only its own src dir's
//     .sql, so it can never bundle the experimental material (location, not a
//     copy-script change);
//   * Section F (§13) — server.ts startup, the base route gate, the Mode-1 gate,
//     and the durable selector run NO experimental SQL and never import the
//     runner; only the explicit dev/operator runner can.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const PROD_MIGRATIONS_DIR = join(REPO_APP, 'src', 'db', 'migrations');
const MIGRATE_SRC = join(REPO_APP, 'src', 'db', 'migrate.ts');
const SERVER_SRC = join(REPO_APP, 'src', 'server.ts');
const COPY_MIGRATIONS_SRC = join(REPO_APP, 'scripts', 'copy-migrations.mjs');
const SPIKE_SERVICE_DIR = join(REPO_APP, 'src', 'services', 'admission-wedge-spike');
const ISO_SPIKE_DIR = join(SPIKE_SERVICE_DIR, 'aw-sql-isolation-spike');
const ISO_SQL_DIR = join(ISO_SPIKE_DIR, 'sql');
const RUNNER_SRC = join(REPO_APP, 'scripts', 'aw-sql-isolation-spike-runner.mjs');

/** EXACT production discovery predicate, mirrored from migrate.ts:79
 *  (`f.endsWith('.sql') && !f.includes('_down')`). The first test pins the
 *  source literal so this mirror cannot silently drift. */
function productionDiscoveryAdopts(filename: string): boolean {
  return filename.endsWith('.sql') && !filename.includes('_down');
}

/** EXACT production packager copy predicate, mirrored from
 *  copy-migrations.mjs:39 (`e.name.endsWith('.sql')`). */
function productionPackagerCopies(filename: string): boolean {
  return filename.endsWith('.sql');
}

// ── Section A (§8) — experimental SQL lives outside the production dir ─────────

describe('Phase 47F isolation — experimental SQL is outside the production migration dir (A.1)', () => {
  it('the isolated experimental SQL lives under the spike service dir, NOT src/db/migrations', () => {
    expect(existsSync(ISO_SQL_DIR)).toBe(true);
    // The isolated dir is under the admission-wedge-spike service tree.
    expect(ISO_SQL_DIR.startsWith(SPIKE_SERVICE_DIR)).toBe(true);
    // It is NOT inside the production migrations directory.
    expect(ISO_SQL_DIR.startsWith(PROD_MIGRATIONS_DIR)).toBe(false);
    const experimentalFiles = readdirSync(ISO_SQL_DIR).filter((f) => f.endsWith('.sql'));
    expect(experimentalFiles.length).toBeGreaterThan(0);
    // Every experimental file carries the aw_ marker.
    for (const f of experimentalFiles) {
      expect(/aw_isolation_spike/i.test(f)).toBe(true);
    }
  });

  it('A.2 — the production discovery dir contains NO aw_* SQL and nothing admission-related', () => {
    const files = readdirSync(PROD_MIGRATIONS_DIR);
    const awSql = files.filter((f) => /^aw[_-]/i.test(f) && f.endsWith('.sql'));
    expect(awSql).toEqual([]);
    const adopted = files.filter(productionDiscoveryAdopts);
    for (const f of adopted) {
      expect(/admission|aw_isolation|aw_route|aw_assertion|isolation-spike/i.test(f)).toBe(false);
    }
  });

  it('A.2 — the production runner scans a single dir and the experimental dir is not it', () => {
    const src = readFileSync(MIGRATE_SRC, 'utf8');
    // The runner resolves migrations relative to its own dir: join(__dirname, 'migrations').
    expect(src).toContain("join(__dirname, 'migrations')");
    // A non-recursive readdir — it cannot descend into a service subfolder.
    expect(src).toContain('readdir(MIGRATIONS_DIR)');
    expect(src).not.toContain('aw-sql-isolation-spike');
  });
});

// ── Section D (§11) — normal runner unchanged; production migrations valid ─────

describe('Phase 47F isolation — normal runner is unchanged (Section D / §11)', () => {
  it('D.3/D.5 — the production discovery predicate is intact (`.sql && !_down`)', () => {
    const src = readFileSync(MIGRATE_SRC, 'utf8');
    expect(src).toContain(".endsWith('.sql')");
    expect(src).toContain("!f.includes('_down')");
  });

  it('migrate.ts has no aw_* / isolation-spike coupling (no hard-deny was needed)', () => {
    const src = readFileSync(MIGRATE_SRC, 'utf8');
    expect(src).not.toMatch(/aw[_-]|isolation-spike|admission/i);
  });

  it('existing production migrations (003–015) are still present and discoverable', () => {
    const files = readdirSync(PROD_MIGRATIONS_DIR);
    const discoverable = files.filter(productionDiscoveryAdopts);
    // The known production set remains intact.
    expect(discoverable).toContain('003_schedules.sql');
    expect(discoverable).toContain('015_agent_ecology.sql');
    // _down files are excluded by the predicate.
    expect(discoverable.some((f) => f.includes('_down'))).toBe(false);
  });

  it('D.4 — even a hypothetically misplaced experimental aw_*.sql is NOT in the production dir', () => {
    const files = readdirSync(PROD_MIGRATIONS_DIR);
    expect(files.some((f) => /aw_isolation_spike/i.test(f))).toBe(false);
  });
});

// ── Section E (§12) — packaging/copy isolation ────────────────────────────────

describe('Phase 47F isolation — packaging/copy cannot bundle experimental SQL (Section E / §12)', () => {
  it('E.1 — copy-migrations.mjs scans only src/db/migrations and copies only .sql (unchanged)', () => {
    const src = readFileSync(COPY_MIGRATIONS_SRC, 'utf8');
    expect(src).toContain("'src', 'db', 'migrations'");
    expect(src).toContain("endsWith('.sql')");
    // It has no awareness of the isolated experimental location.
    expect(src).not.toMatch(/aw-sql-isolation-spike|admission/i);
  });

  it('E.3 — the experimental SQL dir is not the packager source dir, so it is never copied', () => {
    const packagerSrcDir = join(REPO_APP, 'src', 'db', 'migrations');
    expect(ISO_SQL_DIR.startsWith(packagerSrcDir)).toBe(false);
  });

  it('E.2 — the packager .sql predicate would copy a .sql, which is exactly why location isolation is used', () => {
    // The predicate itself copies .sql by name; the safety is that the experimental
    // .sql is NOT in the scanned source dir (proven above), not a name exclusion.
    expect(productionPackagerCopies('0001_aw_isolation_spike_init.sql')).toBe(true);
    expect(productionPackagerCopies('manifest.json')).toBe(false);
  });
});

// ── Section F (§13) — startup non-execution ───────────────────────────────────

describe('Phase 47F isolation — startup runs no experimental SQL (Section F / §13)', () => {
  const serverSrc = () => readFileSync(SERVER_SRC, 'utf8');

  it('F.1 — server.ts startup still calls migrate(dbPool) only inside `if (dbPool)` and adds no new runner', () => {
    const src = serverSrc();
    expect(src).toContain('await migrate(dbPool)');
    const migrateCalls = src.match(/\bmigrate\s*\(/g) ?? [];
    expect(migrateCalls.length).toBe(1);
  });

  it('F.2–F.5 — server.ts never imports or invokes the isolation-spike runner / planner', () => {
    const src = serverSrc();
    expect(src).not.toMatch(/aw-sql-isolation-spike/);
    expect(src).not.toMatch(/buildIsolationSpikePlan|applyIsolationSpikePlan|IsolationSpike/);
    expect(src).not.toMatch(/aw-sql-isolation-spike-runner/);
  });

  it('the spike service barrel index.ts does NOT re-export the SQL isolation spike (stays runner-only)', () => {
    const barrel = readFileSync(join(SPIKE_SERVICE_DIR, 'index.ts'), 'utf8');
    expect(barrel).not.toMatch(/aw-sql-isolation-spike/);
  });

  it('F.5 — the ONLY caller of the planner is the explicit dev/operator runner', () => {
    const runner = readFileSync(RUNNER_SRC, 'utf8');
    expect(runner).toContain('aw-sql-isolation-spike/index.ts');
    // The runner has a top-level guard assertion before any plan is built.
    expect(runner).toContain('assertDevOperatorGateOpen');
  });

  // ── Phase 47J — the execution sink stays runner-bound + import-safe ──────────

  it('F.2–F.5 (47J) — server.ts never imports the execution-sink runner / sink / gate', () => {
    const src = serverSrc();
    expect(src).not.toMatch(/runExecutionSinkSpike|createPgClientStatementSink|assessExecutionTarget/);
    expect(src).not.toMatch(/IsolationSpikeExecutionGate|assertIsolationSpikeExecutionGateOpen/);
  });

  it('F.5 (47J) — the real pg client / sink is constructed ONLY in the runner (outside SPIKE_FILES)', () => {
    const runner = readFileSync(RUNNER_SRC, 'utf8');
    // The DB-touching pg import lives in the runner (under app/scripts/, which the
    // canonical scope guard does NOT scan), never in the planner module.
    expect(runner).toMatch(/import\(['"]pg['"]\)/);
    expect(runner).toContain('createPgClientStatementSink');
    const planner = readFileSync(
      join(SPIKE_SERVICE_DIR, 'aw-sql-isolation-spike', 'index.ts'),
      'utf8',
    );
    expect(planner).not.toMatch(/from\s+['"]pg['"]/);
    expect(planner).not.toMatch(/import\(['"]pg['"]\)/);
  });

  it('the runner runs main() only when invoked directly (import-safe direct-run guard)', () => {
    const runner = readFileSync(RUNNER_SRC, 'utf8');
    // Importing the runner in a test must NOT trigger main()/process.exit — the
    // direct-run guard compares import.meta.url to the invoked argv path.
    expect(runner).toMatch(/import\.meta\.url\s*===\s*pathToFileURL/);
    expect(runner).toContain('if (isDirectRun)');
  });
});

// ── Section C (§10 C.7) — no package-lifecycle invocation ─────────────────────

describe('Phase 47F isolation — no package-lifecycle invocation (Section C / §10 C.7)', () => {
  it('no package.json script references the runner', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_APP, 'package.json'), 'utf8'));
    const scriptsStr = JSON.stringify(pkg.scripts ?? {});
    expect(scriptsStr).not.toMatch(/aw-sql-isolation-spike/);
    // And the build script still only does tsc + copy-migrations (no spike runner).
    expect(pkg.scripts.build).toBe('tsc && node scripts/copy-migrations.mjs');
  });
});
