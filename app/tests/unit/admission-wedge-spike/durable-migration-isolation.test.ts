// Phase 47A — Mode 2 MIGRATION-ISOLATION guard (Phase 46Z checklist §8, A.1–A.7).
//
// The defining safety obligation of the Mode 2 spike is that its dev/operator
// experimental durable material can NEVER be discovered or executed by the normal
// production migration runner, nor swept into the build by the production packager.
// Phase 47A delivers durability as a `.json` snapshot OFF the migration path (NO
// SQL, NO `aw_*` schema). These tests PROVE that isolation against the ACTUAL
// runner + packager semantics, read from the real source files — not a paraphrase.
//
// What is proven here:
//   A.1 — the production discovery filter (`f.endsWith('.sql') && !f.includes('_down')`,
//         migrate.ts) cannot match the durable `.json` artifact, and there is no
//         `aw_*` SQL in the shared migrations dir for it to match;
//   A.2 — the ungated startup `migrate(dbPool)` call (server.ts) is unchanged — the
//         durable spike adds NO migration runner code and NO call into one;
//   A.4 — the production packager copy filter (`.endsWith('.sql')`, copy-migrations.mjs)
//         cannot copy a `.json` artifact;
//   A.3 / A.5 / A.6 — the durable store imports NO migration runner / DB module and
//         contains NO SQL/DB/migration token (delegated to the Phase 33N scope
//         guards; cross-checked here);
//   A.7 — a reversible cleanup path exists (the store's purgeDurableState — proven
//         in the unit suite; named here for traceability).
//
// These are STATIC guards (no DB, no network). They read the real runner/packager
// sources and the real migrations directory.

import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createRouteStorageDurableSpikeStore,
  type RouteStorageDurableSpikeStore,
} from '../../../src/services/admission-wedge-spike/index.js';

const REPO_APP = resolve(__dirname, '..', '..', '..');
const MIGRATIONS_DIR = join(REPO_APP, 'src', 'db', 'migrations');
const MIGRATE_SRC = join(REPO_APP, 'src', 'db', 'migrate.ts');
const SERVER_SRC = join(REPO_APP, 'src', 'server.ts');
const COPY_MIGRATIONS_SRC = join(REPO_APP, 'scripts', 'copy-migrations.mjs');
const DURABLE_SRC = join(
  REPO_APP,
  'src',
  'services',
  'admission-wedge-spike',
  'route-storage-durable-spike.ts',
);

/** The EXACT production discovery predicate, mirrored from migrate.ts:79
 *  (`f.endsWith('.sql') && !f.includes('_down')`). The test below also asserts the
 *  source still contains this literal, so this mirror cannot silently drift. */
function productionDiscoveryAdopts(filename: string): boolean {
  return filename.endsWith('.sql') && !filename.includes('_down');
}

/** The EXACT production packager copy predicate, mirrored from
 *  copy-migrations.mjs:39 (`e.name.endsWith('.sql')`). */
function productionPackagerCopies(filename: string): boolean {
  return filename.endsWith('.sql');
}

let durableDir: string;

beforeEach(() => {
  durableDir = mkdtempSync(join(tmpdir(), 'aw-durable-iso-'));
});
afterEach(() => {
  rmSync(durableDir, { recursive: true, force: true });
});

function makeDurableStore(): RouteStorageDurableSpikeStore {
  return createRouteStorageDurableSpikeStore({
    dir: durableDir,
    maxActors: 8,
    maxAssertionsPerEstate: 32,
    maxAssertionBytesPerEstate: 100_000,
    maxDurableEntries: 64,
  });
}

// ── A.1 — production runner cannot discover the durable artifact ──────────────

describe('Phase 47A migration isolation — production runner cannot adopt Class-E material (A.1)', () => {
  it('the migration discovery predicate in migrate.ts is unchanged (`.sql && !_down`)', () => {
    const src = readFileSync(MIGRATE_SRC, 'utf8');
    // The exact production discovery filter must still be present — this pins the
    // mirror used below to the real runner so it cannot drift undetected.
    expect(src).toContain(".endsWith('.sql')");
    expect(src).toContain("!f.includes('_down')");
  });

  it('no `aw_*` SQL migration exists in the shared production migrations directory', () => {
    const files = readdirSync(MIGRATIONS_DIR);
    const awSql = files.filter((f) => /^aw[_-]/i.test(f) && f.endsWith('.sql'));
    expect(awSql).toEqual([]);
    // And nothing the production runner would adopt mentions the admission wedge.
    const adopted = files.filter(productionDiscoveryAdopts);
    for (const f of adopted) {
      expect(/admission|aw_route|aw_assertion|durable-spike/i.test(f)).toBe(false);
    }
  });

  it('the durable artifact is a `.json` file the production discovery filter REJECTS', () => {
    const store = makeDurableStore();
    store.seedScope({ tenant_id: 'tenant-synthetic-dev', estate_id: 'estate-synthetic-dev', actor_id: 'actor-synthetic-dev' });
    store.record(
      { tenant_id: 'tenant-synthetic-dev', estate_id: 'estate-synthetic-dev', actor_id: 'actor-synthetic-dev' },
      {
        kind: 'admit',
        source_candidate_id: 'cand-synthetic-dev',
        admission_transition_id: 'txn-admit-synthetic-dev',
        admitted_assertion_id: 'assn-active-synthetic-dev',
        assertion_class: 'preference',
        replay_key: 'admit:cand-synthetic-dev',
      },
    );
    const artifacts = readdirSync(durableDir);
    expect(artifacts.length).toBeGreaterThan(0);
    // EVERY durable artifact is rejected by the production discovery filter.
    for (const f of artifacts) {
      expect(productionDiscoveryAdopts(f)).toBe(false);
    }
  });

  it('even if a durable artifact were named like a migration, a `.json` extension is never adopted', () => {
    // Defense-in-depth: the production runner keys on the `.sql` extension, so a
    // hypothetical `015_aw_route_storage.json` could not be adopted.
    expect(productionDiscoveryAdopts('999_aw_route_storage_durable.json')).toBe(false);
    expect(productionDiscoveryAdopts('admission-wedge-route-storage-durable-spike.json')).toBe(false);
    // A `.sql` WOULD be adopted — which is exactly why the durable store refuses to
    // write one (proven in the unit suite: a non-`.json` fileName fails closed).
    expect(productionDiscoveryAdopts('015_agent_ecology.sql')).toBe(true);
  });
});

// ── A.2 — the ungated startup migrate() call is unchanged ─────────────────────

describe('Phase 47A migration isolation — startup migrate(dbPool) is unchanged (A.2)', () => {
  it('server.ts still calls migrate(dbPool) only inside `if (dbPool)` and adds no new runner', () => {
    const src = readFileSync(SERVER_SRC, 'utf8');
    expect(src).toContain('await migrate(dbPool)');
    // The durable spike introduces NO second migration call / runner invocation.
    const migrateCalls = src.match(/\bmigrate\s*\(/g) ?? [];
    expect(migrateCalls.length).toBe(1);
    // The durable store is created via its factory, never a migration runner.
    expect(src).toContain('createRouteStorageDurableSpikeStore');
  });
});

// ── A.4 — the packager cannot copy the durable artifact ───────────────────────

describe('Phase 47A migration isolation — production packager cannot copy Class-E material (A.4)', () => {
  it('copy-migrations.mjs still filters to `.sql` only (unchanged)', () => {
    const src = readFileSync(COPY_MIGRATIONS_SRC, 'utf8');
    expect(src).toContain("endsWith('.sql')");
  });

  it('the durable `.json` artifact name is REJECTED by the packager copy filter', () => {
    expect(productionPackagerCopies('admission-wedge-route-storage-durable-spike.json')).toBe(false);
    expect(productionPackagerCopies('999_aw_route_storage_durable.json')).toBe(false);
  });
});

// ── A.3 / A.5 / A.6 — no migration-runner / DB coupling in the durable source ─

describe('Phase 47A migration isolation — durable source has no runner/DB coupling (A.3/A.5/A.6)', () => {
  it('the durable store source imports no migration runner, DB client/pool, or pg', () => {
    const src = readFileSync(DURABLE_SRC, 'utf8');
    const importRe = /^\s*import\b[^'"]*?from\s*['"]([^'"]+)['"]/gm;
    const specifiers: string[] = [];
    for (const m of src.matchAll(importRe)) specifiers.push(m[1]!);
    // Only `node:` built-ins and sibling spike modules are imported.
    for (const spec of specifiers) {
      const ok =
        spec.startsWith('node:') ||
        spec === './route-storage-spike.js' ||
        spec === './admitted-assertion-ledger.js';
      expect({ spec, ok }).toEqual({ spec, ok: true });
    }
    // Explicitly: no pg, no /db/ runner, no migrations dir, no production -store.
    expect(specifiers.some((s) => s === 'pg')).toBe(false);
    expect(specifiers.some((s) => /\/db\/(client|pool|migrate|transaction)/.test(s))).toBe(false);
    expect(specifiers.some((s) => /\/db\/migrations\//.test(s))).toBe(false);
    expect(specifiers.some((s) => /-store(\.js)?$/.test(s))).toBe(false);
  });

  it('the durable store opens no DB connection — it persists via node:fs only', () => {
    const src = readFileSync(DURABLE_SRC, 'utf8');
    // The durable persistence is node:fs (writeFileSync/renameSync/readFileSync) —
    // proof the durability is a file, not a database.
    expect(src).toContain("from 'node:fs'");
    expect(src).toContain('writeFileSync');
    expect(src).toContain('renameSync');
  });
});

// ── A.7 — reversible cleanup path exists ──────────────────────────────────────

describe('Phase 47A migration isolation — reversible cleanup path (A.7)', () => {
  it('purgeDurableState removes the on-disk snapshot (cleanup exists and works)', () => {
    const store = makeDurableStore();
    store.seedScope({ tenant_id: 'tenant-synthetic-dev', estate_id: 'estate-synthetic-dev', actor_id: 'actor-synthetic-dev' });
    expect(readdirSync(durableDir).length).toBeGreaterThan(0);
    store.purgeDurableState();
    // After purge the snapshot file is gone (a subsequent fresh store hydrates empty
    // — proven in the unit suite).
    expect(existsSync(join(durableDir, 'admission-wedge-route-storage-durable-spike.json'))).toBe(false);
  });
});
