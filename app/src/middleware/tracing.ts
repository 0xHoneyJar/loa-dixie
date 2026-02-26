import { createMiddleware } from 'hono/factory';
import { propagation, context } from '@opentelemetry/api';
import { startSanitizedSpan, addSanitizedAttributes } from '../utils/span-sanitizer.js';

/**
 * Request tracing middleware — W3C traceparent propagation + OTEL spans.
 *
 * Extracts incoming traceparent context from request headers so that spans
 * created here become children of the upstream trace. Uses the OTEL span's
 * actual traceId/spanId/traceFlags for the response traceparent header,
 * ensuring end-to-end correlation with the OTEL backend (Tempo/Jaeger).
 *
 * BB-PR50-003: Use span.spanContext() IDs instead of independent UUIDs.
 * BB-S4-001: Use ctx.traceFlags instead of hardcoded 01.
 * BB-S4-002: Extract incoming traceparent for cross-service context propagation.
 */
export function createTracing(serviceName: string) {
  return createMiddleware(async (c, next) => {
    const start = Date.now();

    // Extract incoming trace context from request headers (BB-S4-002).
    // This enables cross-service correlation: if a frontend or API gateway
    // sends a traceparent, the span created here becomes a child of that trace.
    // Hono does not auto-extract OTEL context — we must do it explicitly.
    const carrier: Record<string, string> = {};
    const incoming = c.req.header('traceparent');
    if (incoming) carrier['traceparent'] = incoming;
    const tracestate = c.req.header('tracestate');
    if (tracestate) carrier['tracestate'] = tracestate;
    const parentCtx = propagation.extract(context.active(), carrier);

    await context.with(parentCtx, () =>
      startSanitizedSpan(
        'dixie.request',
        { method: c.req.method, url: c.req.path },
        async (span) => {
          // Use OTEL span's actual IDs for response headers (BB-PR50-003).
          // traceFlags reflects the real sampling decision (BB-S4-001).
          const ctx = span.spanContext();
          const flags = ctx.traceFlags.toString(16).padStart(2, '0');
          c.header('traceparent', `00-${ctx.traceId}-${ctx.spanId}-${flags}`);
          c.header('x-trace-id', ctx.traceId);
          c.header('x-span-id', ctx.spanId);

          // S6-T7 / Flatline IMP-014: Inject trace_id into Hono context so
          // downstream handlers can include it in structured log output.
          // Enables log-trace correlation: grep for traceId in logs, find
          // matching trace in Tempo/Jaeger.
          c.set('traceId', ctx.traceId);

          await next();

          addSanitizedAttributes(span, 'dixie.request', {
            status_code: c.res.status,
            duration_ms: Date.now() - start,
          });
        },
      ),
    );
  });
}
