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
  'dixie.finn.inference': new Set(['model', 'tokens', 'latency_ms']),
  'dixie.reputation.update': new Set(['model_id', 'score', 'ema_value']),
  'dixie.fleet.spawn': new Set(['task_type', 'cost', 'identity_hash']),
  'dixie.governance.check': new Set(['resource_type', 'decision', 'witness_count']),
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
export async function startSanitizedSpan<T>(
  spanName: string,
  attrs: Record<string, unknown>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  const sanitized = sanitizeAttributes(spanName, attrs);

  return tracer.startActiveSpan(spanName, async (span) => {
    span.setAttributes(sanitized as Record<string, string | number | boolean>);
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}
