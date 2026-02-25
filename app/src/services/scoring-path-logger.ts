/**
 * Structured Scoring Path Logger — replaces raw console.debug calls
 * with configurable structured logging for scoring path decisions.
 *
 * In development: logs at debug level (same as console.debug — no behavioral change)
 * In production: logs at info level as structured JSON (visible in CloudWatch/Datadog)
 *
 * Controlled via DIXIE_SCORING_PATH_LOG_LEVEL env var:
 * - 'debug' (default in development) — behaves like console.debug
 * - 'info' (default in production) — structured JSON at INFO level
 * - 'silent' — suppresses scoring path logs entirely
 *
 * @since cycle-007 — Sprint 80, Task S3-T1 (Bridgebuilder observability)
 */

type LogLevel = 'info' | 'debug' | 'silent';

interface ScoringPathLogEntry {
  readonly path: string;
  readonly wallet: string;
  readonly tier: string;
  readonly blending_used: boolean;
  readonly quarantined?: boolean;
  readonly reputation_freshness?: {
    sample_count: number;
    newest_event_at: string;
  };
  readonly reason?: string;
  readonly model_id?: string;
  readonly task_type?: string;
  readonly entry_hash?: string;
  readonly previous_hash?: string;
  readonly [key: string]: unknown;
}

function resolveLogLevel(): LogLevel {
  const env = process.env.DIXIE_SCORING_PATH_LOG_LEVEL;
  if (env === 'silent' || env === 'info' || env === 'debug') return env;
  // Default: 'info' in production, 'debug' in development
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

/**
 * Log a scoring path decision with structured output.
 *
 * Replaces the raw `console.debug('[conviction-boundary] scoring_path:', ...)`
 * calls with configurable structured logging.
 */
export function logScoringPath(entry: ScoringPathLogEntry): void {
  const level = resolveLogLevel();
  if (level === 'silent') return;

  const logData = {
    level,
    component: 'conviction-boundary',
    event: 'scoring_path',
    timestamp: new Date().toISOString(),
    ...entry,
  };

  if (level === 'debug') {
    console.debug('[conviction-boundary] scoring_path:', JSON.stringify(logData));
  } else {
    // Structured JSON to stdout for production log aggregators
    process.stdout.write(JSON.stringify(logData) + '\n');
  }
}
