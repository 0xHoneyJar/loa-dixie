import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';
import { startSanitizedSpan, addSanitizedAttributes } from '../utils/span-sanitizer.js';

/**
 * Request tracing middleware — W3C traceparent propagation + OTEL spans.
 *
 * When OTEL SDK is active, creates a `dixie.request` span with sanitized
 * attributes (method, url, status_code, duration_ms). When OTEL is not
 * configured, falls back to lightweight W3C traceparent header propagation.
 */
export function createTracing(serviceName: string) {
  return createMiddleware(async (c, next) => {
    const incoming = c.req.header('traceparent');
    let traceId: string;

    if (incoming) {
      const parts = incoming.split('-');
      if (parts.length === 4 && /^[0-9a-f]{32}$/.test(parts[1])) {
        traceId = parts[1];
      } else {
        traceId = randomUUID().replace(/-/g, '');
      }
    } else {
      traceId = randomUUID().replace(/-/g, '');
    }

    const spanId = randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparent = `00-${traceId}-${spanId}-01`;

    c.header('traceparent', traceparent);
    c.header('x-trace-id', traceId);
    c.header('x-span-id', spanId);

    const start = Date.now();

    await startSanitizedSpan(
      'dixie.request',
      { method: c.req.method, url: c.req.path },
      async (span) => {
        await next();

        addSanitizedAttributes(span, 'dixie.request', {
          status_code: c.res.status,
          duration_ms: Date.now() - start,
        });
      },
    );
  });
}
