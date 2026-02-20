import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';

/**
 * Lightweight OTel-compatible tracing middleware.
 *
 * Creates a W3C traceparent header for each request and propagates it
 * to downstream services. When OTEL_EXPORTER_OTLP_ENDPOINT is configured,
 * integrate the full @opentelemetry/sdk-node at startup instead.
 *
 * This middleware provides request correlation without pulling in the
 * full OTel SDK dependency — sufficient for Phase 1 observability.
 */
export function createTracing(serviceName: string) {
  return createMiddleware(async (c, next) => {
    const incoming = c.req.header('traceparent');
    let traceId: string;
    let parentSpanId: string | undefined;

    if (incoming) {
      // Parse W3C traceparent: version-traceId-parentId-flags
      const parts = incoming.split('-');
      if (parts.length === 4) {
        traceId = parts[1];
        parentSpanId = parts[2];
      } else {
        traceId = randomUUID().replace(/-/g, '');
      }
    } else {
      traceId = randomUUID().replace(/-/g, '');
    }

    const spanId = randomUUID().replace(/-/g, '').slice(0, 16);
    const traceparent = `00-${traceId}-${spanId}-01`;

    // Set on response for downstream debugging
    c.header('traceparent', traceparent);

    // Store trace context for downstream proxy calls
    c.set('traceId' as never, traceId);
    c.set('spanId' as never, spanId);
    c.set('traceparent' as never, traceparent);

    await next();
  });
}
