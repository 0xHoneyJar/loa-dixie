/**
 * Span Sanitizer — PII-safe OpenTelemetry span creation.
 *
 * Enforces attribute allowlists per span type. Unknown attributes are stripped.
 * Wallet addresses and identity values are hashed (SHA-256 truncated to 12 chars).
 *
 * @since cycle-014 Sprint 2 — Task T1 (Flatline IMP-006, IMP-010)
 */
import { createHash } from 'node:crypto';
import { trace, type Span, SpanStatusCode } from '@opentelemetry/api';

const TRACER_NAME = 'dixie-bff';

/** Module-scoped tracer instance — avoids per-span getTracer() lookup. */
let _tracer: ReturnType<typeof trace.getTracer> | null = null;
function getTracer() {
  if (!_tracer) _tracer = trace.getTracer(TRACER_NAME);
  return _tracer;
}

/**
 * SHA-256 hash truncated to 12 hex characters.
 * Provides collision-resistant pseudonymization without reversibility.
 */
export function hashForSpan(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

/**
 * Per-span-type attribute allowlists.
 * Only attributes in the allowlist survive sanitization.
 * Attributes suffixed with `_hash` in the allowlist will be hashed via hashForSpan().
 */
const SPAN_ALLOWLISTS: Record<string, ReadonlySet<string>> = {
  'dixie.request': new Set(['method', 'url', 'status_code', 'duration_ms']),
  'dixie.auth': new Set(['auth_type', 'wallet_hash', 'tier']),
  'dixie.finn.inference': new Set(['model', 'tokens', 'latency_ms', 'circuit_state']),
  'dixie.reputation.update': new Set(['model_id', 'score', 'ema_value']),
  'dixie.fleet.spawn': new Set(['task_type', 'cost', 'identity_hash']),
  'dixie.governance.check': new Set(['resource_type', 'decision', 'witness_count', 'denial_reason']),
};

/**
 * Attributes that contain identity data and must be hashed.
 * Key = raw input attribute name, Value = sanitized output attribute name.
 */
const HASH_FIELDS: Record<string, string> = {
  wallet: 'wallet_hash',
  identity: 'identity_hash',
  operator_id: 'identity_hash',
};

/**
 * Sanitize attributes for a span type.
 * - Strips any attribute not in the span's allowlist
 * - Hashes identity fields (wallet → wallet_hash, identity → identity_hash)
 * - Returns empty object for unknown span types
 */
export function sanitizeAttributes(
  spanName: string,
  attrs: Record<string, unknown>,
): Record<string, unknown> {
  const allowlist = SPAN_ALLOWLISTS[spanName];
  if (!allowlist) return {};

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attrs)) {
    // Check if this is an identity field that needs hashing
    const hashTarget = HASH_FIELDS[key];
    if (hashTarget && allowlist.has(hashTarget)) {
      sanitized[hashTarget] = typeof value === 'string' ? hashForSpan(value) : undefined;
      continue;
    }

    // Only include if in the allowlist
    if (allowlist.has(key) && value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Add sanitized attributes to an existing span.
 * Filters through the same allowlist as sanitizeAttributes().
 * Use this for attributes that are only known after the span starts.
 */
export function addSanitizedAttributes(
  span: Span,
  spanName: string,
  attrs: Record<string, unknown>,
): void {
  const sanitized = sanitizeAttributes(spanName, attrs);
  span.setAttributes(sanitized as Record<string, string | number | boolean>);
}

/**
 * Start a sanitized span with enforced attribute allowlisting.
 *
 * Usage:
 * ```ts
 * const result = await startSanitizedSpan('dixie.auth', { wallet: '0x123', tier: 'gold' }, async (span) => {
 *   // ... auth logic ...
 *   return authResult;
 * });
 * ```
 */
/**
 * Redact potential PII (wallet addresses, identity values) from error messages.
 */
function sanitizeErrorMessage(msg: string): string {
  return msg.replace(/0x[a-fA-F0-9]{40}/g, '0x[REDACTED]');
}

export async function startSanitizedSpan<T>(
  spanName: string,
  attrs: Record<string, unknown>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = getTracer();
  const sanitized = sanitizeAttributes(spanName, attrs);

  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttributes(sanitized as Record<string, string | number | boolean>);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: sanitizeErrorMessage(rawMsg),
      });
      span.recordException(new Error(sanitizeErrorMessage(rawMsg)));
      throw err;
    } finally {
      span.end();
    }
  });
}
