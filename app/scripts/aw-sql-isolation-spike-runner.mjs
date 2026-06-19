// Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike: EXPLICIT runner.
//
// NON-PRODUCTION, dev/operator-only, disabled-by-default. This is the ONLY
// entrypoint that ever touches the experimental aw_* SQL isolation spike. It is
// a deliberate, out-of-band dev/operator command:
//
//   * It is NEVER imported by app startup (server.ts) and NEVER mounted by any
//     route gate.
//   * It is NEVER wired into a package lifecycle script (no pre*/post*/build
//     hook in package.json runs it) and never runs through the normal forward-
//     only production runner.
//   * It is disabled by default and fails closed unless the dev/operator opt-in
//     env var is exactly `true` AND the environment is not production.
//
// DEFAULT BEHAVIOR is a DRY-RUN PLAN: it resolves the exact manifest, validates
// every experimental `.sql` path is contained inside the isolated folder, reads
// the statement text, and prints a plan summary. It opens NO connection and
// applies NOTHING. There is NO production DB write and NO production execution.
//
// EXECUTION (`--apply`) is intentionally fail-closed in this spike: the runner
// injects NO real client, so `--apply` is refused ("DB/client is absent when
// execution is requested"). Real execution support, if ever added by a later
// authorized lane, must be injected and tested against a fake — never a real
// production database — via applyIsolationSpikePlan(plan, sink) in index.ts.
//
// USAGE (explicit dev/operator invocation only — NOT a package script):
//   DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED=true \
//     npx tsx scripts/aw-sql-isolation-spike-runner.mjs            # dry-run forward plan
//   ... aw-sql-isolation-spike-runner.mjs --direction=cleanup       # dry-run cleanup plan
//   ... aw-sql-isolation-spike-runner.mjs --apply                   # REFUSED (no client injected)

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AW_SQL_ISOLATION_SPIKE_GATE_ENV,
  AW_SQL_ISOLATION_SPIKE_DIR_NAME,
  assertDevOperatorGateOpen,
  buildIsolationSpikePlan,
} from '../src/services/admission-wedge-spike/aw-sql-isolation-spike/index.ts';

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

function parseArgs(argv) {
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

function printHelp() {
  console.log(
    [
      'Phase 47F aw_* SQL isolation spike runner (dev/operator-only, NON-PRODUCTION).',
      '',
      `Gate: set ${AW_SQL_ISOLATION_SPIKE_GATE_ENV}=true (and NODE_ENV != production).`,
      '',
      'Options:',
      '  --direction=forward|cleanup   which manifest list to plan (default: forward)',
      '  --apply                       REFUSED in this spike (no client is injected)',
      '  --help                        show this help',
    ].join('\n'),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  // Fail closed unless the opt-in is exactly `true` AND not production.
  assertDevOperatorGateOpen({
    enabledFlag: process.env[AW_SQL_ISOLATION_SPIKE_GATE_ENV],
    nodeEnv: process.env.NODE_ENV,
  });

  if (args.apply) {
    // Execution requested but no client is injected by this spike — fail closed.
    throw new Error(
      '--apply is refused: the Phase 47F spike injects no client. Execution is dry-run/plan-only here; ' +
        'real execution requires a separately-authorized lane that injects a sink (never a production database).',
    );
  }

  const spikeRoot = sourceSpikeRoot();
  const plan = buildIsolationSpikePlan(spikeRoot, args.direction);

  console.log(`Phase 47F aw_* SQL isolation spike — DRY-RUN PLAN (${plan.direction})`);
  console.log(`  spike root: ${plan.spikeRoot}`);
  console.log(`  steps: ${plan.steps.length}`);
  for (const step of plan.steps) {
    console.log(`    - ${step.relPath} (${step.statementsText.length} bytes; not executed)`);
  }
  console.log('  NON-PRODUCTION dry-run only — no connection opened, nothing applied.');
}

main().catch((err) => {
  console.error(`aw-sql-isolation-spike-runner: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
