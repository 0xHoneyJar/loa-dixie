// Phase 47J — Lane-1 aw_* SQL ISOLATED dev/operator EXECUTION-SINK spike: EXPLICIT runner.
//
// NON-PRODUCTION, dev/operator/test-only, disabled-by-default. This is the ONLY
// entrypoint that ever touches the experimental aw_* SQL isolation spike, and
// the ONLY place a real DB client / sink is ever constructed. It is a deliberate,
// out-of-band dev/operator command:
//
//   * It is NEVER imported by app startup (server.ts) and NEVER mounted by any
//     route gate.
//   * It is NEVER wired into a package lifecycle script (no pre*/post*/build
//     hook in package.json runs it) and never runs through the normal forward-
//     only production runner (app/src/db/migrate.ts), its _migrations ledger, or
//     its advisory lock.
//   * It is disabled by default and fails closed unless the dev/operator opt-in
//     env var is exactly `true` AND the environment is NOT production.
//
// DEFAULT BEHAVIOR is a DRY-RUN PLAN: it resolves the exact manifest, validates
// every experimental `.sql` path is contained inside the isolated folder, reads
// the statement text, and prints a plan summary. It opens NO connection and
// applies NOTHING. There is NO production DB write and NO production execution.
//
// EXECUTION (`--apply`) is a BOUNDED Phase 47J execution-sink proof. It is
// fail-closed behind a conjunction of independent gates (Phase 47I §10): the base
// dev/operator opt-in, a DISTINCT execution opt-in, non-production mode, a
// strictly-non-production accepted DB target (Phase 47I §11; the production
// DATABASE_URL is always refused), explicit out-of-band invocation, exact
// manifest verification, SQL path containment, no-unlisted-SQL, and — for the
// cleanup/down direction — a DISTINCT cleanup opt-in. ANY missing gate refuses,
// fails closed, exits non-zero, opens NO connection, and applies nothing. When
// every gate holds, the runner constructs a real DB client from the accepted
// non-production target, wraps it in an `IsolationSpikeStatementSink`, and runs
// the already-validated static plan through `applyIsolationSpikePlan(plan, sink)`
// (index.ts) in a single all-or-nothing transaction.
//
// SECRET HYGIENE. The runner NEVER logs the target DSN, any credential, password,
// token, or an environment dump. Refusals carry stable, non-secret reason codes
// only. The target policy is a pure function — testable WITHOUT opening a DB
// connection.
//
// NON-GOALS (explicit). This is NOT production storage, NOT the final Straylight
// store, NOT a final schema freeze, NOT a route-contract freeze, and NOT an
// ADR-022E gate #8 discharge. It performs NO production DB write, NO production
// migration execution, and NO startup wiring. It does NOT claim that `aw_*` SQL
// is safe for production, and the production DB target stays refused in every
// environment and default.
//
// USAGE (explicit dev/operator invocation only — NOT a package script):
//   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
//     npx tsx scripts/aw-sql-isolation-spike-runner.mjs            # dry-run forward plan
//   ... aw-sql-isolation-spike-runner.mjs --direction=cleanup       # dry-run cleanup plan
//   ... --apply                                                      # execution-sink proof (all gates required)

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  AW_SQL_ISOLATION_SPIKE_GATE_ENV,
  AW_SQL_ISOLATION_SPIKE_DIR_NAME,
  assertDevOperatorGateOpen,
  isDevOperatorGateOpen,
  buildIsolationSpikePlan,
  applyIsolationSpikePlan,
  assertIsolationSpikeExecutionGateOpen,
} from '../src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts';

// ── DRAFT, NON-FINAL env labels (Phase 47I §10 / §11). ────────────────────────
// Named here and read ONLY inside this runner — NOT added to or parsed by
// app/src/config.ts, NOT wired into any package lifecycle script, NOT a config
// behavior change. Each is a draft label for this bounded dev/operator spike.

/** DISTINCT execution opt-in (separate from the base spike opt-in). */
export const AW_SQL_EXECUTION_APPLY_ENV =
  'DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_ENABLED';

/** DISTINCT cleanup/down opt-in (required only for the cleanup direction). */
export const AW_SQL_EXECUTION_CLEANUP_ENV =
  'DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_CLEANUP_ENABLED';

/** The explicit, distinct NON-PRODUCTION target DSN. There is NO implicit
 *  fallback to DATABASE_URL or any configured application database. */
export const AW_SQL_EXECUTION_TARGET_DSN_ENV =
  'DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_APPLY_TARGET_DSN';

/** The production target env name — read ONLY to refuse it as a target. */
export const PRODUCTION_DB_ENV = 'DATABASE_URL';

/** Resolve the SOURCE spike root from this runner's own location, so the plan
 *  always reads the real `.sql` files + manifest regardless of cwd. */
function sourceSpikeRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(
    here,
    '..',
    'src',
    'services',
    'admission-wedge-spike',
    AW_SQL_ISOLATION_SPIKE_DIR_NAME,
  );
}

// ── Database target policy (Phase 47I §11) — PURE; no connection opened. ───────

/** Stable, non-secret reason codes for a refused execution target. A refusal
 *  NEVER carries the DSN, host credentials, query values, file paths, or any
 *  secret material — only these fixed code constants and (for query params) the
 *  fixed, non-secret libpq parameter-CATEGORY name. */
export const EXECUTION_TARGET_REFUSAL = Object.freeze({
  TARGET_MISSING: 'TARGET_MISSING',
  TARGET_EMPTY: 'TARGET_EMPTY',
  TARGET_EQUALS_PRODUCTION_DSN: 'TARGET_EQUALS_PRODUCTION_DSN',
  TARGET_MALFORMED: 'TARGET_MALFORMED',
  // The DSN scheme must be a Postgres scheme; anything else (http:, ftp:, file:,
  // …) is refused before the host is ever trusted.
  TARGET_UNSUPPORTED_PROTOCOL: 'TARGET_UNSUPPORTED_PROTOCOL',
  // A query parameter that can REDIRECT the effective network target (host /
  // hostaddr / port) so `pg` would connect somewhere other than url.hostname.
  TARGET_HOST_OVERRIDE_UNSUPPORTED: 'TARGET_HOST_OVERRIDE_UNSUPPORTED',
  // A TLS / file-loading query parameter (ssl* — sslcert / sslkey / sslrootcert /
  // sslcrl / sslmode / …) that can alter file-loading or TLS behavior.
  TARGET_TLS_FILE_PARAMETER_UNSUPPORTED: 'TARGET_TLS_FILE_PARAMETER_UNSUPPORTED',
  // Any other query parameter — rejected wholesale, since an unknown libpq/pg
  // query key could alter the connection target or behavior in ways the pure
  // policy cannot anticipate.
  TARGET_QUERY_PARAMETER_UNSUPPORTED: 'TARGET_QUERY_PARAMETER_UNSUPPORTED',
  TARGET_NOT_LOCAL_OR_DEV: 'TARGET_NOT_LOCAL_OR_DEV',
  TARGET_NO_DISPOSABLE_MARKER: 'TARGET_NO_DISPOSABLE_MARKER',
  TARGET_PRODUCTION_TOKEN: 'TARGET_PRODUCTION_TOKEN',
});

/** The ONLY DSN schemes a real `pg` client should ever receive here. Anything
 *  else is refused before the host / DB name is trusted. */
const ALLOWED_TARGET_PROTOCOLS = new Set(['postgres:', 'postgresql:']);

/** Query keys that can override the effective NETWORK target `pg` connects to —
 *  so url.hostname can no longer be trusted as the host that will be used. */
const NETWORK_TARGET_OVERRIDE_PARAMS = new Set(['host', 'hostaddr', 'port']);

/** Prefix marking TLS / file-loading query keys (sslcert / sslkey / sslrootcert /
 *  sslcrl / sslmode / sslpassword / …) — all refused as file/TLS overrides. */
const TLS_QUERY_PARAM_PREFIX = 'ssl';

/** Loopback hosts treated as obviously-local dev targets. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Disposable / dev / test markers required on the target host or DB name. */
const DISPOSABLE_MARKERS = [
  'dev',
  'test',
  'spike',
  'tmp',
  'temp',
  'ephemeral',
  'throwaway',
  'sandbox',
  'scratch',
  'disposable',
  'local',
  'ci',
];

/** Production-like tokens that disqualify a target outright (checked against the
 *  host + DB name ONLY — never the credential portion of the DSN). */
const PRODUCTION_TOKENS = [
  'prod',
  'production',
  'live',
  'amazonaws',
  'rds',
  'azure',
  'cloudsql',
  'gcp',
];

/**
 * Classify a single lower-cased query-parameter key into its non-secret refusal
 * code. The KEY name (a fixed libpq parameter name) is the only thing inspected —
 * its VALUE (which could be a remote hostname, a file path, or a secret) is never
 * read, so the classification can never leak. Returns a stable code constant.
 */
function classifyQueryParamRefusal(lowerKey) {
  if (NETWORK_TARGET_OVERRIDE_PARAMS.has(lowerKey)) {
    return EXECUTION_TARGET_REFUSAL.TARGET_HOST_OVERRIDE_UNSUPPORTED;
  }
  if (lowerKey.startsWith(TLS_QUERY_PARAM_PREFIX)) {
    return EXECUTION_TARGET_REFUSAL.TARGET_TLS_FILE_PARAMETER_UNSUPPORTED;
  }
  return EXECUTION_TARGET_REFUSAL.TARGET_QUERY_PARAMETER_UNSUPPORTED;
}

/**
 * Assess a candidate execution target against the strict non-production policy.
 * PURE: parses the DSN structurally, never opens a connection, never logs, and
 * returns only stable non-secret reason codes. The credential portion of the DSN
 * is NEVER inspected (scheme + host + DB name + query KEY names only — never the
 * user, password, or any query VALUE), so a secret can neither leak nor trip a
 * rule.
 *
 * The policy validates the SAME effective target `pg` will use: it refuses any
 * non-Postgres scheme, and — critically — refuses ALL query parameters, because
 * a query key such as `?host=` / `?hostaddr=` / `?port=` silently redirects the
 * effective network target that `pg` / `pg-connection-string` resolve (so an
 * apparent loopback DSN could otherwise connect to a remote / production host),
 * and a `?ssl*=` key can alter file-loading / TLS behavior. With no query string
 * present, `url.hostname` IS the host `pg` connects to, so the host/DB-name
 * disposable checks are then sound.
 *
 * Accepts ONLY when: a DSN is present and non-empty; it is not equal to the
 * production DATABASE_URL; it parses; its scheme is `postgres:`/`postgresql:`;
 * it carries NO query parameters at all; it carries no production-like token; its
 * host is loopback or carries a disposable marker; and its DB name carries a
 * disposable marker. Any other case fails closed.
 */
export function assessExecutionTarget(input) {
  const targetDsn = input?.targetDsn;
  const productionDsn = input?.productionDsn;

  if (targetDsn === undefined || targetDsn === null) {
    return { accepted: false, refusals: [EXECUTION_TARGET_REFUSAL.TARGET_MISSING] };
  }
  if (typeof targetDsn !== 'string' || targetDsn.trim().length === 0) {
    return { accepted: false, refusals: [EXECUTION_TARGET_REFUSAL.TARGET_EMPTY] };
  }
  if (
    typeof productionDsn === 'string' &&
    productionDsn.trim().length > 0 &&
    targetDsn === productionDsn
  ) {
    // Terminal: the production DSN is never a valid target. Stop before parsing.
    return { accepted: false, refusals: [EXECUTION_TARGET_REFUSAL.TARGET_EQUALS_PRODUCTION_DSN] };
  }

  let url;
  try {
    url = new URL(targetDsn);
  } catch {
    return { accepted: false, refusals: [EXECUTION_TARGET_REFUSAL.TARGET_MALFORMED] };
  }

  // Scheme allowlist FIRST: only a Postgres scheme may ever reach a `pg` client.
  // A non-Postgres scheme (http:, ftp:, file:, …) is terminal — refuse before the
  // host is trusted, so a loopback hostname can never launder a wrong protocol.
  if (!ALLOWED_TARGET_PROTOCOLS.has((url.protocol || '').toLowerCase())) {
    return { accepted: false, refusals: [EXECUTION_TARGET_REFUSAL.TARGET_UNSUPPORTED_PROTOCOL] };
  }

  // Query parameters are refused WHOLESALE and terminally: any present key could
  // redirect the effective network target (`?host=` / `?hostaddr=` / `?port=`) or
  // change file/TLS behavior (`?ssl*=`), and an unknown libpq/pg key could do so
  // in ways this pure policy cannot anticipate. Refusing all of them means the
  // host the policy validates below (url.hostname) is exactly the host `pg`
  // connects to. Only the KEY names are inspected — never the (possibly secret)
  // values — and the codes are de-duplicated and order-stable.
  if ([...url.searchParams.keys()].length > 0) {
    const queryRefusals = [];
    const seen = new Set();
    for (const key of url.searchParams.keys()) {
      const code = classifyQueryParamRefusal(key.toLowerCase());
      if (!seen.has(code)) {
        seen.add(code);
        queryRefusals.push(code);
      }
    }
    return { accepted: false, refusals: queryRefusals };
  }

  const host = (url.hostname || '').toLowerCase();
  let dbName = '';
  try {
    dbName = decodeURIComponent((url.pathname || '').replace(/^\//, '')).toLowerCase();
  } catch {
    dbName = (url.pathname || '').replace(/^\//, '').toLowerCase();
  }
  // Structural surface only (host + DB name). The user/password are excluded.
  const surface = `${host} ${dbName}`;

  const refusals = [];
  if (PRODUCTION_TOKENS.some((t) => surface.includes(t))) {
    refusals.push(EXECUTION_TARGET_REFUSAL.TARGET_PRODUCTION_TOKEN);
  }
  const hostIsLocalOrDev =
    LOOPBACK_HOSTS.has(host) || DISPOSABLE_MARKERS.some((m) => host.includes(m));
  if (!hostIsLocalOrDev) {
    refusals.push(EXECUTION_TARGET_REFUSAL.TARGET_NOT_LOCAL_OR_DEV);
  }
  if (!DISPOSABLE_MARKERS.some((m) => dbName.includes(m))) {
    refusals.push(EXECUTION_TARGET_REFUSAL.TARGET_NO_DISPOSABLE_MARKER);
  }
  return { accepted: refusals.length === 0, refusals };
}

// ── Execution sink (Phase 47I §12) — real client wrapper, constructed here. ────

/**
 * Wrap an injected DB client (the only place a real client is ever built — in
 * `defaultConnect` below) into an `IsolationSpikeStatementSink`. The sink runs an
 * explicit transaction: `begin → applyStatement* → commit`, with `rollback` on
 * any fault (orchestrated all-or-nothing by `applyIsolationSpikePlan`). The
 * statement text is the static, already-validated `.sql` content from the plan —
 * never dynamic / user-derived SQL.
 */
export function createPgClientStatementSink(client) {
  return {
    async begin() {
      await client.query('BEGIN');
    },
    async applyStatement(statementsText) {
      await client.query(statementsText);
    },
    async commit() {
      await client.query('COMMIT');
    },
    async rollback() {
      await client.query('ROLLBACK');
    },
  };
}

/** Default connector — the ONLY place a real `pg` client is ever constructed,
 *  and ONLY after every gate has passed. Lazy-imports `pg` so merely importing
 *  this runner (e.g. in unit tests, which inject a fake connector) never loads or
 *  connects to a database. */
async function defaultConnect(targetDsn) {
  const pgModule = await import('pg');
  const PgClient = pgModule.default?.Client ?? pgModule.Client;
  const client = new PgClient({ connectionString: targetDsn });
  await client.connect();
  return {
    query: (text) => client.query(text),
    end: () => client.end(),
  };
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

export function parseRunnerArgs(argv) {
  let direction = 'forward';
  let apply = false;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--direction=')) direction = arg.slice('--direction='.length);
    else if (arg === '--help' || arg === '-h') return { help: true, direction, apply };
    else {
      throw new Error(`unknown argument "${arg}" (supported: --direction=forward|cleanup, --apply, --help)`);
    }
  }
  if (direction !== 'forward' && direction !== 'cleanup') {
    throw new Error(`invalid --direction "${direction}" (supported: forward, cleanup)`);
  }
  return { help: false, direction, apply };
}

function helpText() {
  return [
    'Phase 47J aw_* SQL execution-sink spike runner (dev/operator/test-only, NON-PRODUCTION).',
    '',
    `Base gate:      set ${AW_SQL_ISOLATION_SPIKE_GATE_ENV}=true (and NODE_ENV != production).`,
    `Execution gate: set ${AW_SQL_EXECUTION_APPLY_ENV}=true AND provide`,
    `                ${AW_SQL_EXECUTION_TARGET_DSN_ENV}=<non-production DSN> (the production`,
    `                ${PRODUCTION_DB_ENV} is always refused as a target).`,
    `Cleanup gate:   --direction=cleanup also requires ${AW_SQL_EXECUTION_CLEANUP_ENV}=true.`,
    '',
    'Options:',
    '  --direction=forward|cleanup   which manifest list to plan/apply (default: forward)',
    '  --apply                       run the bounded execution-sink proof (all gates required)',
    '  --help                        show this help',
    '',
    'Without --apply the runner is a DRY-RUN PLAN: it opens no connection and applies nothing.',
    'The target DSN is never logged; refusals carry stable, non-secret reason codes only.',
  ].join('\n');
}

// ── Orchestrator — dependency-injected so it is fully testable with fakes. ─────

/**
 * Run the spike. Dependencies (plan builder, plan applier, DB connector, log
 * sinks) are injected so tests can drive every path with fakes and NEVER open a
 * real connection. The default deps wire the real planner / applier / `pg`
 * connector and `console`.
 *
 * Order is fail-closed by construction: the base dev/operator gate is asserted
 * first; the plan (manifest + path containment + unlisted-SQL reconciliation) is
 * built next; for `--apply`, the strict target policy and the full execution-gate
 * conjunction are evaluated BEFORE the connector is ever called. Any unmet gate
 * throws a typed, non-secret error and no connection is opened.
 */
export async function runExecutionSinkSpike(opts = {}) {
  const {
    argv = [],
    env = {},
    spikeRoot = sourceSpikeRoot(),
    explicitRunnerInvocation = true,
    deps = {},
  } = opts;
  const {
    buildPlan = buildIsolationSpikePlan,
    applyPlan = applyIsolationSpikePlan,
    connect = defaultConnect,
    log = () => {},
    logError = () => {},
  } = deps;

  const args = parseRunnerArgs(argv);
  if (args.help) {
    log(helpText());
    return { mode: 'help' };
  }

  // Gate 1 — base dev/operator opt-in, non-production. Fail closed otherwise.
  assertDevOperatorGateOpen({
    enabledFlag: env[AW_SQL_ISOLATION_SPIKE_GATE_ENV],
    nodeEnv: env.NODE_ENV,
  });

  // Build (and therefore verify) the plan: exact manifest, strict schema, path
  // containment (lexical + symlink + realpath), and on-disk reconciliation (no
  // unlisted / no missing SQL). A failure here throws before any execution gate.
  const plan = buildPlan(spikeRoot, args.direction);

  if (!args.apply) {
    log(`aw_* SQL isolation spike — DRY-RUN PLAN (${plan.direction})`);
    log(`  spike root: ${plan.spikeRoot}`);
    log(`  steps: ${plan.steps.length}`);
    for (const step of plan.steps) {
      log(`    - ${step.relPath} (${step.statementsText.length} bytes; not executed)`);
    }
    log('  NON-PRODUCTION dry-run only — no connection opened, nothing applied.');
    return { mode: 'dry-run', direction: plan.direction, steps: plan.steps.length };
  }

  // ── Execution path (`--apply`) — fail closed behind the full gate conjunction.
  const targetDsn = env[AW_SQL_EXECUTION_TARGET_DSN_ENV];
  const productionDsn = env[PRODUCTION_DB_ENV];
  const target = assessExecutionTarget({ targetDsn, productionDsn });
  if (!target.accepted) {
    // Codes only — never the DSN or any secret.
    logError(`execution target refused (non-secret codes): ${target.refusals.join(', ')}`);
  }

  const gateInput = {
    applyRequested: true,
    executionOptInPresent: env[AW_SQL_EXECUTION_APPLY_ENV] === 'true',
    devOperatorModeAccepted: isDevOperatorGateOpen({
      enabledFlag: env[AW_SQL_ISOLATION_SPIKE_GATE_ENV],
      nodeEnv: env.NODE_ENV,
    }),
    nonProductionTargetAccepted: target.accepted,
    explicitRunnerInvocation: explicitRunnerInvocation === true,
    manifestVerified: true,
    pathContainmentVerified: true,
    noUnlistedSql: true,
    cleanupRequested: plan.direction === 'cleanup',
    cleanupOptInPresent: env[AW_SQL_EXECUTION_CLEANUP_ENV] === 'true',
  };

  // Throws IsolationSpikeExecutionRefusedError (non-secret reason codes) if any
  // gate is unmet — BEFORE a connection is opened or anything is applied.
  assertIsolationSpikeExecutionGateOpen(gateInput);

  // All gates passed: construct the real client from the accepted non-production
  // target and run the static plan in a single all-or-nothing transaction.
  const client = await connect(targetDsn);
  try {
    const sink = createPgClientStatementSink(client);
    const result = await applyPlan(plan, sink);
    log(`aw_* SQL execution-sink proof — APPLIED (${result.direction})`);
    log(`  statements applied: ${result.appliedCount}`);
    log('  committed in a single transaction against a NON-PRODUCTION target.');
    return { mode: 'applied', direction: result.direction, appliedCount: result.appliedCount };
  } finally {
    try {
      await client.end();
    } catch {
      // A connector close fault must not mask a real apply outcome / error.
    }
  }
}

async function main() {
  await runExecutionSinkSpike({
    argv: process.argv.slice(2),
    env: process.env,
    explicitRunnerInvocation: true,
    deps: {
      log: (...a) => console.log(...a),
      logError: (...a) => console.error(...a),
    },
  });
}

// Run main() ONLY when invoked directly as a script — never when imported (so a
// test can import the exported functions without triggering execution / exit).
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isDirectRun) {
  main().catch((err) => {
    console.error(`aw-sql-execution-sink-runner: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
