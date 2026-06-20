// Phase 47J — Lane-1 aw_* SQL ISOLATED dev/operator EXECUTION-SINK spike tests.
//
// Proves the Phase 47I §8–§21 execution-sink obligations for the bounded,
// dev/operator/test-only, disabled-by-default, NON-PRODUCTION execution sink:
//
//   * §10 — the apply-mode gate conjunction (G1–G13): --apply, a DISTINCT
//     execution opt-in, dev/operator non-production mode, an accepted
//     non-production target, explicit runner invocation, exact manifest, path
//     containment, no-unlisted-SQL, and the cleanup opt-in all required; ANY
//     unmet gate fails closed BEFORE a connection is opened or anything applied;
//   * §11 — the database-target policy: production DATABASE_URL refused, DSN ==
//     DATABASE_URL refused, missing / empty / malformed / non-local / no-marker /
//     production-token DSNs refused; only explicit local/dev/test disposable
//     targets accepted; NO DSN / secret in refusal output;
//   * §12 — execution-sink design: the real sink is constructed only in the
//     runner (outside the guarded SPIKE_FILES), injected via
//     applyIsolationSpikePlan; statements run in manifest order in a single
//     all-or-nothing transaction; index.ts stays pool-free;
//   * §13/§14 — transaction / rollback / conflict / cleanup-gate semantics;
//   * §17 — no public response expansion, 114-key no-leak parity preserved;
//   * §20 (M1–M19) — the execution-sink test matrix.
//
// NO REAL DATABASE IS TOUCHED. Every path injects a FAKE connector / sink, so the
// runner's gate / target / sink / transaction behavior is proven in isolation.
// Real external-DB execution (the runner's `defaultConnect` pg path) is NOT
// exercised here — it remains gated by the Phase 47I envelope and would require a
// disposable non-production Postgres, which is out of scope for these unit tests.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AW_SQL_ISOLATION_SPIKE_GATE_ENV,
  buildIsolationSpikePlan,
  applyIsolationSpikePlan,
  evaluateIsolationSpikeExecutionGate,
  assertIsolationSpikeExecutionGateOpen,
  ISOLATION_SPIKE_EXECUTION_REFUSAL,
  IsolationSpikeExecutionRefusedError,
  IsolationSpikeApplyError,
  type IsolationSpikeExecutionGateInput,
} from '../../../src/services/admission-wedge-spike/aw-sql-isolation-spike/index.js';
import {
  runExecutionSinkSpike,
  parseRunnerArgs,
  assessExecutionTarget,
  createPgClientStatementSink,
  EXECUTION_TARGET_REFUSAL,
  AW_SQL_EXECUTION_APPLY_ENV,
  AW_SQL_EXECUTION_CLEANUP_ENV,
  AW_SQL_EXECUTION_TARGET_DSN_ENV,
  PRODUCTION_DB_ENV,
} from '../../../scripts/aw-sql-isolation-spike-runner.mjs';
import {
  findAdmissionPublicLeaks,
  isAdmissionPublicSafe,
} from '../../../src/services/admission-wedge-spike/index.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

const tempRoots: string[] = [];
function tempSpike(manifest: unknown, sqlFiles: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'aw-sql-exec-sink-'));
  mkdirSync(join(root, 'sql'), { recursive: true });
  for (const [name, body] of Object.entries(sqlFiles)) {
    writeFileSync(join(root, 'sql', name), body, 'utf8');
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest), 'utf8');
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

/** A DSN that the strict target policy accepts (loopback host + disposable DB
 *  name). The password segment is a marker so the no-leak tests can prove it is
 *  never echoed. */
const GOOD_TARGET_DSN = 'postgres://spikeuser:SECRETPW123@localhost:5432/dixie_aw_spike_dev';
const PROD_DSN = 'postgres://produser:PRODPW@prod-db.example-cloud.com:5432/app_main';

/** A fake connector that records the queries it is asked to run and never opens
 *  a real connection. `failOn(text)` makes a statement throw, modelling a DB
 *  fault / conflict. */
function fakeConnector(
  record: { connectedWith?: string; queries: string[]; ended: boolean; called: number },
  opts: { failOn?: (text: string) => boolean } = {},
) {
  return async (dsn: string) => {
    record.called += 1;
    record.connectedWith = dsn;
    return {
      query: async (text: string) => {
        record.queries.push(text);
        if (opts.failOn && opts.failOn(text)) {
          throw new Error('synthetic db fault: duplicate key value violates unique constraint');
        }
        return { rows: [] };
      },
      end: async () => {
        record.ended = true;
      },
    };
  };
}
function newRecord() {
  return { queries: [] as string[], ended: false, called: 0 } as {
    connectedWith?: string;
    queries: string[];
    ended: boolean;
    called: number;
  };
}

/** Build a full env where every gate is satisfiable; tests delete keys to prove
 *  each missing gate fails closed. */
function fullEnv(extra: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    [AW_SQL_ISOLATION_SPIKE_GATE_ENV]: 'true',
    NODE_ENV: 'development',
    [AW_SQL_EXECUTION_APPLY_ENV]: 'true',
    [AW_SQL_EXECUTION_TARGET_DSN_ENV]: GOOD_TARGET_DSN,
    ...extra,
  };
}

// ── §10 — pure execution-gate conjunction ─────────────────────────────────────

describe('Phase 47J — execution-gate conjunction (§10, pure)', () => {
  const open: IsolationSpikeExecutionGateInput = {
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

  it('opens only when EVERY gate holds', () => {
    const r = evaluateIsolationSpikeExecutionGate(open);
    expect(r.open).toBe(true);
    expect(r.refusals).toEqual([]);
    expect(() => assertIsolationSpikeExecutionGateOpen(open)).not.toThrow();
  });

  it('each missing gate fails closed with its stable, non-secret reason code', () => {
    const cases: Array<[Partial<IsolationSpikeExecutionGateInput>, string]> = [
      [{ applyRequested: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.APPLY_NOT_REQUESTED],
      [{ executionOptInPresent: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.EXECUTION_OPT_IN_MISSING],
      [{ devOperatorModeAccepted: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.DEV_OPERATOR_MODE_MISSING],
      [{ nonProductionTargetAccepted: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.NON_PRODUCTION_TARGET_NOT_ACCEPTED],
      [{ explicitRunnerInvocation: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.NOT_EXPLICIT_RUNNER_INVOCATION],
      [{ manifestVerified: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.MANIFEST_NOT_VERIFIED],
      [{ pathContainmentVerified: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.PATH_CONTAINMENT_NOT_VERIFIED],
      [{ noUnlistedSql: false }, ISOLATION_SPIKE_EXECUTION_REFUSAL.UNLISTED_SQL_PRESENT],
    ];
    for (const [override, code] of cases) {
      const r = evaluateIsolationSpikeExecutionGate({ ...open, ...override });
      expect(r.open).toBe(false);
      expect(r.refusals).toContain(code);
      expect(() => assertIsolationSpikeExecutionGateOpen({ ...open, ...override })).toThrow(
        IsolationSpikeExecutionRefusedError,
      );
    }
  });

  it('cleanup direction requires the distinct cleanup opt-in', () => {
    const cleanupNoOptIn = { ...open, cleanupRequested: true, cleanupOptInPresent: false };
    const r = evaluateIsolationSpikeExecutionGate(cleanupNoOptIn);
    expect(r.open).toBe(false);
    expect(r.refusals).toContain(ISOLATION_SPIKE_EXECUTION_REFUSAL.CLEANUP_OPT_IN_MISSING);
    // With the cleanup opt-in present, cleanup is allowed.
    expect(
      evaluateIsolationSpikeExecutionGate({ ...open, cleanupRequested: true, cleanupOptInPresent: true }).open,
    ).toBe(true);
  });

  it('the thrown error carries reason codes only — never a DSN or secret', () => {
    try {
      assertIsolationSpikeExecutionGateOpen({ ...open, executionOptInPresent: false });
      throw new Error('expected refusal');
    } catch (err) {
      expect(err).toBeInstanceOf(IsolationSpikeExecutionRefusedError);
      const msg = (err as Error).message;
      expect(msg).toContain('EXECUTION_OPT_IN_MISSING');
      expect(msg).not.toContain('postgres://');
      expect(msg).not.toContain('SECRETPW');
    }
  });
});

// ── §11 — database target policy (pure; no connection) ────────────────────────

describe('Phase 47J — database target policy (§11, pure)', () => {
  it('refuses a missing DSN', () => {
    const r = assessExecutionTarget({ targetDsn: undefined, productionDsn: undefined });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_MISSING);
  });

  it('refuses an empty / whitespace DSN', () => {
    for (const empty of ['', '   ']) {
      const r = assessExecutionTarget({ targetDsn: empty, productionDsn: undefined });
      expect(r.accepted).toBe(false);
      expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_EMPTY);
    }
  });

  it('refuses a DSN equal to the production DATABASE_URL (before parsing)', () => {
    const r = assessExecutionTarget({ targetDsn: PROD_DSN, productionDsn: PROD_DSN });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toEqual([EXECUTION_TARGET_REFUSAL.TARGET_EQUALS_PRODUCTION_DSN]);
  });

  it('refuses a production DATABASE_URL value as a target (production tokens)', () => {
    const r = assessExecutionTarget({ targetDsn: PROD_DSN, productionDsn: 'postgres://other' });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_PRODUCTION_TOKEN);
  });

  it('refuses a malformed DSN', () => {
    const r = assessExecutionTarget({ targetDsn: 'not a dsn at all', productionDsn: undefined });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_MALFORMED);
  });

  it('refuses an unsafe remote DSN (non-local host, no disposable marker)', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:p@db.internal.example.com:5432/appmain',
      productionDsn: undefined,
    });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_NOT_LOCAL_OR_DEV);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_NO_DISPOSABLE_MARKER);
  });

  it('refuses an ambiguous default app DB on localhost without a disposable marker', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:p@localhost:5432/appdb',
      productionDsn: undefined,
    });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_NO_DISPOSABLE_MARKER);
  });

  it('refuses a production-like DSN even on a loopback host', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:p@localhost:5432/prod_clone',
      productionDsn: undefined,
    });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_PRODUCTION_TOKEN);
  });

  it('accepts only explicit local / dev / test disposable target examples', () => {
    for (const dsn of [
      'postgres://u:p@localhost:5432/dixie_aw_spike_dev',
      'postgresql://u@127.0.0.1/spike_test_db',
      'postgres://u:p@aw-dev-throwaway:5432/scratch_test',
      'postgres://u:p@[::1]:5432/spike_ephemeral',
    ]) {
      const r = assessExecutionTarget({ targetDsn: dsn, productionDsn: PROD_DSN });
      expect({ dsn, accepted: r.accepted, refusals: r.refusals }).toEqual({
        dsn,
        accepted: true,
        refusals: [],
      });
    }
  });

  it('a refusal NEVER carries the DSN, host, or secret (codes only)', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:SUPERSECRET@db.example.com/appmain',
      productionDsn: undefined,
    });
    const blob = JSON.stringify(r.refusals);
    expect(blob).not.toContain('SUPERSECRET');
    expect(blob).not.toContain('example.com');
    expect(blob).not.toContain('postgres://');
    // Every refusal is one of the stable code constants.
    const codes = new Set(Object.values(EXECUTION_TARGET_REFUSAL));
    for (const code of r.refusals) expect(codes.has(code)).toBe(true);
  });
});

// ── §11 — target-policy bypass hardening (scheme allowlist + query rejection) ──
//
// A loopback-LOOKING DSN must not be able to launder a wrong protocol or redirect
// the effective network target that `pg` actually connects to. `new URL()` reports
// the literal `url.hostname` ('localhost'), but `pg` / `pg-connection-string`
// resolve `?host=` / `?hostaddr=` / `?port=` to a DIFFERENT effective target — so a
// host-only policy would approve an apparent loopback DSN while `pg` connects
// remote. The policy therefore (1) accepts ONLY postgres:/postgresql: schemes and
// (2) refuses ALL query parameters, so the host it validates is the host `pg` uses.

describe('Phase 47J — target-policy bypass hardening (§11, pure)', () => {
  it('refuses a non-Postgres scheme even on a loopback host (http / ftp / file)', () => {
    for (const dsn of [
      'http://localhost/dixie_spike_dev',
      'ftp://localhost/dixie_spike_dev',
      'file:///tmp/dixie_spike_dev',
      'https://localhost:5432/dixie_spike_dev',
    ]) {
      const r = assessExecutionTarget({ targetDsn: dsn, productionDsn: undefined });
      expect({ dsn, accepted: r.accepted }).toEqual({ dsn, accepted: false });
      expect(r.refusals).toEqual([EXECUTION_TARGET_REFUSAL.TARGET_UNSUPPORTED_PROTOCOL]);
    }
  });

  it('refuses a loopback-looking DSN whose ?host= redirects the effective target', () => {
    for (const dsn of [
      'postgres://u:p@localhost/dixie_spike_dev?host=remote.example',
      'postgres://u:p@localhost/dixie_spike_dev?host=prod-db.example',
      'postgresql://u:p@127.0.0.1:5432/spike_test_db?hostaddr=10.0.0.5',
    ]) {
      const r = assessExecutionTarget({ targetDsn: dsn, productionDsn: undefined });
      expect({ dsn, accepted: r.accepted }).toEqual({ dsn, accepted: false });
      expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_HOST_OVERRIDE_UNSUPPORTED);
      // The refusal carries the stable code only — never the redirected hostname.
      const blob = JSON.stringify(r.refusals);
      expect(blob).not.toContain('remote.example');
      expect(blob).not.toContain('prod-db.example');
      expect(blob).not.toContain('10.0.0.5');
    }
  });

  it('refuses a query-port override on an otherwise-loopback DSN', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:p@localhost/dixie_spike_dev?port=5432',
      productionDsn: undefined,
    });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_HOST_OVERRIDE_UNSUPPORTED);
  });

  it('refuses file-loading TLS query params (sslcert / sslkey / sslrootcert / sslcrl / sslmode)', () => {
    for (const dsn of [
      'postgres://u:p@localhost/dixie_spike_dev?sslcert=/tmp/client.crt',
      'postgres://u:p@localhost/dixie_spike_dev?sslkey=/tmp/client.key',
      'postgres://u:p@localhost/dixie_spike_dev?sslrootcert=/tmp/root.crt',
      'postgres://u:p@localhost/dixie_spike_dev?sslcrl=/tmp/revoked.crl',
      'postgres://u:p@localhost/dixie_spike_dev?sslmode=require',
    ]) {
      const r = assessExecutionTarget({ targetDsn: dsn, productionDsn: undefined });
      expect({ dsn, accepted: r.accepted }).toEqual({ dsn, accepted: false });
      expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_TLS_FILE_PARAMETER_UNSUPPORTED);
      // The refusal carries the stable code only — never the file path value.
      const blob = JSON.stringify(r.refusals);
      expect(blob).not.toContain('/tmp/');
      expect(blob).not.toContain('.crt');
      expect(blob).not.toContain('.key');
    }
  });

  it('refuses an unknown query parameter wholesale (closes unknown libpq behavior)', () => {
    const r = assessExecutionTarget({
      targetDsn: 'postgres://u:p@localhost/dixie_spike_dev?options=-c%20search_path%3Devil',
      productionDsn: undefined,
    });
    expect(r.accepted).toBe(false);
    expect(r.refusals).toContain(EXECUTION_TARGET_REFUSAL.TARGET_QUERY_PARAMETER_UNSUPPORTED);
  });

  it('still accepts the safe disposable loopback targets (no query string)', () => {
    for (const dsn of [
      'postgres://u:p@localhost:5432/dixie_aw_spike_dev',
      'postgresql://u@127.0.0.1/spike_test_db',
      'postgres://u:p@aw-dev-throwaway:5432/scratch_test',
      'postgres://u:p@[::1]:5432/spike_ephemeral',
    ]) {
      const r = assessExecutionTarget({ targetDsn: dsn, productionDsn: PROD_DSN });
      expect({ dsn, accepted: r.accepted, refusals: r.refusals }).toEqual({
        dsn,
        accepted: true,
        refusals: [],
      });
    }
  });
});

// ── §11/§10 — bypass DSNs are refused BEFORE any connection is opened ──────────

describe('Phase 47J — runner refuses bypass DSNs before connect (§11, no-connect)', () => {
  /** Each entry is a DSN that must be refused by the runner with NO connection
   *  opened, and whose sensitive fragments must never appear in any output. */
  const BYPASS_CASES: Array<{ name: string; dsn: string; mustNotLeak: string[] }> = [
    {
      name: 'http scheme',
      dsn: 'http://localhost/dixie_spike_dev',
      mustNotLeak: ['http://localhost'],
    },
    {
      name: 'ftp scheme',
      dsn: 'ftp://localhost/dixie_spike_dev',
      mustNotLeak: ['ftp://localhost'],
    },
    {
      name: '?host=remote.example redirect',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?host=remote.example',
      mustNotLeak: ['SECRETPW123', 'spikeuser', 'remote.example', 'postgres://'],
    },
    {
      name: '?host=prod-db.example redirect',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?host=prod-db.example',
      mustNotLeak: ['SECRETPW123', 'spikeuser', 'prod-db.example', 'postgres://'],
    },
    {
      name: '?port override',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?port=5432',
      mustNotLeak: ['SECRETPW123', 'spikeuser', 'postgres://'],
    },
    {
      name: '?sslcert file param',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?sslcert=/tmp/client.crt',
      mustNotLeak: ['SECRETPW123', 'spikeuser', '/tmp/client.crt', 'postgres://'],
    },
    {
      name: '?sslkey file param',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?sslkey=/tmp/client.key',
      mustNotLeak: ['SECRETPW123', 'spikeuser', '/tmp/client.key', 'postgres://'],
    },
    {
      name: '?sslrootcert file param',
      dsn: 'postgres://spikeuser:SECRETPW123@localhost/dixie_spike_dev?sslrootcert=/tmp/root.crt',
      mustNotLeak: ['SECRETPW123', 'spikeuser', '/tmp/root.crt', 'postgres://'],
    },
  ];

  for (const tc of BYPASS_CASES) {
    it(`refuses ${tc.name} with no connection and no secret/host/path leak`, async () => {
      const rec = newRecord();
      const root = tempSpike(OK_MANIFEST, OK_SQL);
      const logs: string[] = [];
      const errs: string[] = [];
      let caught: unknown;
      await expect(
        runExecutionSinkSpike({
          argv: ['--apply'],
          env: fullEnv({ [AW_SQL_EXECUTION_TARGET_DSN_ENV]: tc.dsn }),
          spikeRoot: root,
          deps: {
            connect: fakeConnector(rec),
            log: (m: string) => logs.push(m),
            logError: (m: string) => errs.push(m),
          },
        }),
      ).rejects.toMatchObject({
        refusals: expect.arrayContaining(['NON_PRODUCTION_TARGET_NOT_ACCEPTED']),
      });
      // Capture the thrown error message too, to scan it for leaks.
      try {
        await runExecutionSinkSpike({
          argv: ['--apply'],
          env: fullEnv({ [AW_SQL_EXECUTION_TARGET_DSN_ENV]: tc.dsn }),
          spikeRoot: root,
          deps: { connect: fakeConnector(rec) },
        });
      } catch (err) {
        caught = err;
      }
      // The connection was NEVER opened — refusal precedes connect.
      expect(rec.called).toBe(0);
      // No DSN / credential / redirected host / file path in any sink.
      const blob = [...logs, ...errs, (caught as Error)?.message ?? ''].join('\n');
      for (const secret of tc.mustNotLeak) {
        expect(blob).not.toContain(secret);
      }
    });
  }
});

// ── arg parsing ───────────────────────────────────────────────────────────────

describe('Phase 47J — runner arg parsing', () => {
  it('defaults to a forward dry-run; recognizes --apply / --direction / --help', () => {
    expect(parseRunnerArgs([])).toEqual({ help: false, direction: 'forward', apply: false });
    expect(parseRunnerArgs(['--apply'])).toEqual({ help: false, direction: 'forward', apply: true });
    expect(parseRunnerArgs(['--direction=cleanup'])).toEqual({
      help: false,
      direction: 'cleanup',
      apply: false,
    });
    expect(parseRunnerArgs(['--help']).help).toBe(true);
  });

  it('rejects an unknown argument or invalid direction', () => {
    expect(() => parseRunnerArgs(['--nope'])).toThrow(/unknown argument/);
    expect(() => parseRunnerArgs(['--direction=sideways'])).toThrow(/invalid --direction/);
  });
});

// ── Runner: default dry-run preserved; gate refusals open no connection ────────

describe('Phase 47J — runner default behaviour is preserved (planning-only)', () => {
  it('without --apply it stays a dry-run plan and opens NO connection', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    const logs: string[] = [];
    const out = await runExecutionSinkSpike({
      argv: [],
      env: fullEnv(),
      spikeRoot: root,
      deps: { connect: fakeConnector(rec), log: (m: string) => logs.push(m) },
    });
    expect(out.mode).toBe('dry-run');
    expect(rec.called).toBe(0);
    expect(logs.join('\n')).toContain('DRY-RUN PLAN');
  });

  it('the base dev/operator gate still fails closed (disabled by default)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: { ...fullEnv(), [AW_SQL_ISOLATION_SPIKE_GATE_ENV]: undefined },
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toThrow(/disabled by default/);
    expect(rec.called).toBe(0);
  });

  it('NODE_ENV=production is refused even with every other gate present', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ NODE_ENV: 'production' }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toThrow(/production/);
    expect(rec.called).toBe(0);
  });
});

// ── §10 — runner refuses --apply unless EVERY gate is present ──────────────────

describe('Phase 47J — runner --apply gate conjunction (§10, M2/M4)', () => {
  it('refuses --apply when the execution opt-in is missing (no connection)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ [AW_SQL_EXECUTION_APPLY_ENV]: undefined }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toMatchObject({ refusals: expect.arrayContaining(['EXECUTION_OPT_IN_MISSING']) });
    expect(rec.called).toBe(0);
  });

  it('refuses --apply when the DSN target is missing (no connection)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ [AW_SQL_EXECUTION_TARGET_DSN_ENV]: undefined }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toMatchObject({
      refusals: expect.arrayContaining(['NON_PRODUCTION_TARGET_NOT_ACCEPTED']),
    });
    expect(rec.called).toBe(0);
  });

  it('refuses --apply when the DSN equals the production DATABASE_URL (no connection)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({
          [AW_SQL_EXECUTION_TARGET_DSN_ENV]: PROD_DSN,
          [PRODUCTION_DB_ENV]: PROD_DSN,
        }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toMatchObject({
      refusals: expect.arrayContaining(['NON_PRODUCTION_TARGET_NOT_ACCEPTED']),
    });
    expect(rec.called).toBe(0);
  });

  it('refuses --apply against a production-like / unsafe remote DSN (no connection)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ [AW_SQL_EXECUTION_TARGET_DSN_ENV]: PROD_DSN }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toThrow(IsolationSpikeExecutionRefusedError);
    expect(rec.called).toBe(0);
  });

  it('refuses --apply when invocation is not the explicit runner (no connection)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv(),
        spikeRoot: root,
        explicitRunnerInvocation: false,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toMatchObject({
      refusals: expect.arrayContaining(['NOT_EXPLICIT_RUNNER_INVOCATION']),
    });
    expect(rec.called).toBe(0);
  });

  it('no DSN / secret appears in the refusal output (codes only)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    const logs: string[] = [];
    const errs: string[] = [];
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ [AW_SQL_EXECUTION_TARGET_DSN_ENV]: PROD_DSN, [AW_SQL_EXECUTION_APPLY_ENV]: undefined }),
        spikeRoot: root,
        deps: {
          connect: fakeConnector(rec),
          log: (m: string) => logs.push(m),
          logError: (m: string) => errs.push(m),
        },
      }),
    ).rejects.toThrow();
    const blob = [...logs, ...errs].join('\n');
    expect(blob).not.toContain('PRODPW');
    expect(blob).not.toContain('prod-db.example-cloud.com');
    expect(blob).not.toContain('postgres://');
    // The structured error message is also code-only.
    try {
      await runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv({ [AW_SQL_EXECUTION_APPLY_ENV]: undefined }),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      });
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain('SECRETPW');
      expect(msg).not.toContain('postgres://');
    }
    expect(rec.called).toBe(0);
  });
});

// ── §8/§9 — manifest / path / unlisted SQL protections run BEFORE execution ────

describe('Phase 47J — plan protections precede execution (§8/§9, M6/M7)', () => {
  it('an unlisted .sql in sql/ fails closed before any connection (M6)', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, {
      ...OK_SQL,
      '0002_unlisted.sql': 'CREATE TABLE aw_isolation_spike_extra (x TEXT);',
    });
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv(),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toThrow(/unlisted .sql/);
    expect(rec.called).toBe(0);
  });

  it('a symlinked .sql escaping the isolated folder fails closed before any connection (M7)', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'aw-sql-exec-outside-'));
    trackTemp(outside);
    const outsideFile = join(outside, 'evil.sql');
    writeFileSync(outsideFile, 'CREATE TABLE evil (x TEXT);', 'utf8');

    const root = mkdtempSync(join(tmpdir(), 'aw-sql-exec-symlink-'));
    trackTemp(root);
    mkdirSync(join(root, 'sql'), { recursive: true });
    writeFileSync(join(root, 'sql', '0001_init_down.sql'), OK_SQL['0001_init_down.sql'], 'utf8');
    symlinkSync(outsideFile, join(root, 'sql', '0001_init.sql'));
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(OK_MANIFEST), 'utf8');

    const rec = newRecord();
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv(),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toThrow(/symlink/);
    expect(rec.called).toBe(0);
  });
});

// ── §12/§13 — execution sink: statements in order, single transaction ──────────

describe('Phase 47J — execution sink applies in order (§12/§13, M-happy)', () => {
  it('when EVERY gate passes, the sink runs BEGIN → statements (in manifest order) → COMMIT', async () => {
    const rec = newRecord();
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0002_more.sql'] },
      { ...OK_SQL, '0002_more.sql': 'CREATE TABLE IF NOT EXISTS aw_isolation_spike_two (x TEXT);' },
    );
    const logs: string[] = [];
    const out = await runExecutionSinkSpike({
      argv: ['--apply'],
      env: fullEnv(),
      spikeRoot: root,
      deps: { connect: fakeConnector(rec), log: (m: string) => logs.push(m) },
    });
    expect(out).toMatchObject({ mode: 'applied', direction: 'forward', appliedCount: 2 });
    expect(rec.called).toBe(1);
    expect(rec.queries[0]).toBe('BEGIN');
    expect(rec.queries[rec.queries.length - 1]).toBe('COMMIT');
    expect(rec.queries[1]).toContain('aw_isolation_spike_assertion');
    expect(rec.queries[2]).toContain('aw_isolation_spike_two');
    expect(rec.ended).toBe(true);
    // The committed-line log carries no DSN / secret / target name.
    const blob = logs.join('\n');
    expect(blob).not.toContain('SECRETPW');
    expect(blob).not.toContain('localhost');
    expect(blob).not.toContain('dixie_aw_spike_dev');
  });

  it('cleanup execution requires the explicit cleanup opt-in, then drops in order', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    // Without the cleanup opt-in: refused, no connection.
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply', '--direction=cleanup'],
        env: fullEnv(),
        spikeRoot: root,
        deps: { connect: fakeConnector(rec) },
      }),
    ).rejects.toMatchObject({ refusals: expect.arrayContaining(['CLEANUP_OPT_IN_MISSING']) });
    expect(rec.called).toBe(0);

    // With the cleanup opt-in: the drop path applies.
    const rec2 = newRecord();
    const out = await runExecutionSinkSpike({
      argv: ['--apply', '--direction=cleanup'],
      env: fullEnv({ [AW_SQL_EXECUTION_CLEANUP_ENV]: 'true' }),
      spikeRoot: root,
      deps: { connect: fakeConnector(rec2) },
    });
    expect(out).toMatchObject({ mode: 'applied', direction: 'cleanup', appliedCount: 1 });
    expect(rec2.queries[0]).toBe('BEGIN');
    expect(rec2.queries[1]).toContain('DROP TABLE IF EXISTS aw_isolation_spike_assertion');
    expect(rec2.queries[rec2.queries.length - 1]).toBe('COMMIT');
  });
});

// ── §13 — execution errors fail closed; transaction rolls back ─────────────────

describe('Phase 47J — execution error / conflict rolls back (§13, M12)', () => {
  it('a fault mid-apply rolls back (no COMMIT) and surfaces a fail-closed error', async () => {
    const rec = newRecord();
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    const failing = fakeConnector(rec, { failOn: (t) => t.includes('CREATE TABLE') });
    await expect(
      runExecutionSinkSpike({
        argv: ['--apply'],
        env: fullEnv(),
        spikeRoot: root,
        deps: { connect: failing },
      }),
    ).rejects.toThrow(IsolationSpikeApplyError);
    expect(rec.queries).toContain('BEGIN');
    expect(rec.queries).toContain('ROLLBACK');
    expect(rec.queries).not.toContain('COMMIT');
    // The connection is still closed (no leak of the fault).
    expect(rec.ended).toBe(true);
  });

  it('a UNIQUE-conflict-style DB fault rolls back with no partial commit', async () => {
    const rec = newRecord();
    const root = tempSpike(
      { ...OK_MANIFEST, forward: ['sql/0001_init.sql', 'sql/0002_more.sql'] },
      { ...OK_SQL, '0002_more.sql': 'CREATE TABLE IF NOT EXISTS aw_isolation_spike_two (x TEXT);' },
    );
    // Fail on the SECOND statement (a conflict after a partial apply).
    let n = 0;
    const connect = async () => {
      rec.called += 1;
      return {
        query: async (text: string) => {
          rec.queries.push(text);
          if (text.includes('aw_isolation_spike_two')) {
            n += 1;
            throw new Error('duplicate key value violates unique constraint');
          }
          return { rows: [] };
        },
        end: async () => {
          rec.ended = true;
        },
      };
    };
    await expect(
      runExecutionSinkSpike({ argv: ['--apply'], env: fullEnv(), spikeRoot: root, deps: { connect } }),
    ).rejects.toThrow(IsolationSpikeApplyError);
    expect(n).toBe(1);
    expect(rec.queries).toEqual([
      'BEGIN',
      'CREATE TABLE IF NOT EXISTS aw_isolation_spike_assertion (x TEXT);',
      'CREATE TABLE IF NOT EXISTS aw_isolation_spike_two (x TEXT);',
      'ROLLBACK',
    ]);
    expect(rec.queries).not.toContain('COMMIT');
  });
});

// ── §12 — the statement sink wrapper itself (BEGIN/apply*/COMMIT, ROLLBACK) ─────

describe('Phase 47J — createPgClientStatementSink semantics (§12)', () => {
  it('drives BEGIN / applyStatement / COMMIT / ROLLBACK on the injected client', async () => {
    const queries: string[] = [];
    const client = { query: async (t: string) => void queries.push(t) };
    const sink = createPgClientStatementSink(client);
    await sink.begin();
    await sink.applyStatement('STMT-1');
    await sink.applyStatement('STMT-2');
    await sink.commit();
    expect(queries).toEqual(['BEGIN', 'STMT-1', 'STMT-2', 'COMMIT']);
    await sink.rollback();
    expect(queries[queries.length - 1]).toBe('ROLLBACK');
  });

  it('all-or-nothing through applyIsolationSpikePlan: rollback on fault, no commit', async () => {
    const queries: string[] = [];
    const client = {
      query: async (t: string) => {
        queries.push(t);
        if (t.includes('aw_isolation_spike_assertion')) throw new Error('fault');
      },
    };
    const root = tempSpike(OK_MANIFEST, OK_SQL);
    const plan = buildIsolationSpikePlan(root, 'forward');
    await expect(applyIsolationSpikePlan(plan, createPgClientStatementSink(client))).rejects.toThrow(
      IsolationSpikeApplyError,
    );
    expect(queries).toContain('BEGIN');
    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
  });
});

// ── §10 G6 / §12 — startup / migrator / packaging / config isolation (M15–M17) ─

describe('Phase 47J — isolation from startup / migrator / packaging / config (M15–M17)', () => {
  const REPO_APP = join(__dirname, '..', '..', '..');
  const read = (p: string) => readFileSyncUtf8(join(REPO_APP, p));

  it('server.ts never imports or invokes the execution-sink runner / sink', () => {
    const src = read('src/server.ts');
    expect(src).not.toMatch(/aw-sql-isolation-spike-runner/);
    expect(src).not.toMatch(/runExecutionSinkSpike|createPgClientStatementSink|assessExecutionTarget/);
    expect(src).not.toMatch(/IsolationSpikeExecutionGate|assertIsolationSpikeExecutionGateOpen/);
  });

  it('the production migration runner (migrate.ts) is unchanged — no aw_/spike coupling', () => {
    const src = read('src/db/migrate.ts');
    expect(src).not.toMatch(/aw[_-]|isolation-spike|admission|execution-sink/i);
  });

  it('the packager (copy-migrations.mjs) still scans only src/db/migrations', () => {
    const src = read('scripts/copy-migrations.mjs');
    expect(src).toContain("'src', 'db', 'migrations'");
    expect(src).not.toMatch(/aw-sql-isolation-spike|execution-sink/i);
  });

  it('config.ts is not wired with the draft execution env labels (runner-local only)', () => {
    const src = read('src/config.ts');
    expect(src).not.toContain('DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED');
    expect(src).not.toContain('DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN');
    expect(src).not.toContain('DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED');
  });

  it('no package.json script references the runner; the build script is unchanged', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(JSON.stringify(pkg.scripts ?? {})).not.toMatch(/aw-sql-isolation-spike/);
    expect(pkg.scripts.build).toBe('tsc && node scripts/copy-migrations.mjs');
  });

  it('the spike module index.ts stays pool-free and node:-only (no pg / client import)', () => {
    const src = read('src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts');
    expect(src).not.toMatch(/from\s+['"]pg['"]/);
    expect(src).not.toMatch(/\/db\/(client|pool|migrate)/);
    // The DB-touching pg import lives ONLY in the runner (outside SPIKE_FILES).
    const runner = read('scripts/aw-sql-isolation-spike-runner.mjs');
    expect(runner).toMatch(/import\(['"]pg['"]\)/);
  });
});

// ── §17 — no public response expansion / no-leak parity preserved (M18) ────────

describe('Phase 47J — no public surface expansion / no-leak parity (§17, M18)', () => {
  it('the runtime no-leak guard still flags forbidden keys and accepts the safe shape', () => {
    expect(findAdmissionPublicLeaks({ tenant_id: 'x' })).not.toEqual([]);
    expect(findAdmissionPublicLeaks({ receipt_hash: 'x' })).not.toEqual([]);
    expect(isAdmissionPublicSafe({ outcome_class: 'accepted', recall_eligible: false })).toBe(true);
  });

  it('the execution-sink seam exposes no public-response builder', () => {
    const REPO_APP = join(__dirname, '..', '..', '..');
    const idx = readFileSyncUtf8(
      join(REPO_APP, 'src', 'services', 'admission-wedge-spike', 'aw-sql-isolation-spike', 'index.ts'),
    );
    expect(idx).not.toMatch(/buildAdmissionSpikePublicResponse|PublicResponse/);
  });
});

// Local fs reader (kept tiny so the test file reads stay legible at call sites).
function readFileSyncUtf8(p: string): string {
  return readFileSync(p, 'utf8');
}
