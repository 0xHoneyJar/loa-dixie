import { createMiddleware } from 'hono/factory';
import { startSanitizedSpan, addSanitizedAttributes } from '../utils/span-sanitizer.js';

/**
 * Request tracing middleware — W3C traceparent propagation + OTEL spans.
 *
 * Creates a `dixie.request` span and uses its OTEL-assigned traceId and spanId
 * for the W3C traceparent response header. This ensures end-to-end correlation
 * between the traceparent header and the OTEL backend (Tempo/Jaeger).
 *
 * Bridgebuilder Finding BB-PR50-003: Previous implementation generated independent
 * UUIDs for the traceparent header, creating a mismatch with OTEL trace IDs.
 */
export function createTracing(serviceName: string) {
  return createMiddleware(async (c, next) => {
    const start = Date.now();

    await startSanitizedSpan(
      'dixie.request',
      { method: c.req.method, url: c.req.path },
      async (span) => {
        // Use OTEL span's actual trace/span IDs for response headers.
        // This ensures traceparent correlates with what appears in Tempo/Jaeger.
        const ctx = span.spanContext();
        c.header('traceparent', `00-${ctx.traceId}-${ctx.spanId}-01`);
        c.header('x-trace-id', ctx.traceId);
        c.header('x-span-id', ctx.spanId);

        await next();

        addSanitizedAttributes(span, 'dixie.request', {
          status_code: c.res.status,
          duration_ms: Date.now() - start,
        });
      },
    );
  });
}
