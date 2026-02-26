/**
 * Span Nesting Integration Test — Verifies parent-child chain.
 *
 * Uses OTEL's in-memory InMemorySpanExporter to capture real spans
 * and verify that nested startSanitizedSpan() calls form a proper
 * parent-child hierarchy.
 *
 * @since cycle-014 Sprint 4 — Task T7 (Bridgebuilder Finding BB-PR50-F1)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace } from '@opentelemetry/api';

describe('span nesting', () => {
  let provider: NodeTracerProvider;
  let exporter: InMemorySpanExporter;

  beforeAll(() => {
    exporter = new InMemorySpanExporter();
    provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  beforeEach(() => {
    exporter.reset();
  });

  it('nested startSanitizedSpan calls form parent-child chain', async () => {
    // Dynamic import so the module picks up our registered provider
    const { startSanitizedSpan } = await import('../span-sanitizer.js');

    await startSanitizedSpan('dixie.request', { method: 'GET', url: '/test' }, async () => {
      await startSanitizedSpan('dixie.auth', { auth_type: 'jwt' }, async () => {
        return 'auth-result';
      });
      return 'request-result';
    });

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(2);

    // Spans are exported in order of completion (child finishes first)
    const authSpan = spans.find(s => s.name === 'dixie.auth');
    const requestSpan = spans.find(s => s.name === 'dixie.request');

    expect(authSpan).toBeDefined();
    expect(requestSpan).toBeDefined();

    // Both share the same trace ID
    expect(authSpan!.spanContext().traceId).toBe(requestSpan!.spanContext().traceId);

    // Auth span's parent should be the request span
    expect(authSpan!.parentSpanId).toBe(requestSpan!.spanContext().spanId);

    // Request span should have no parent (root span)
    expect(requestSpan!.parentSpanId).toBeUndefined();
  });

  it('three-level nesting forms correct chain', async () => {
    const { startSanitizedSpan } = await import('../span-sanitizer.js');

    await startSanitizedSpan('dixie.request', { method: 'POST', url: '/chat' }, async () => {
      await startSanitizedSpan('dixie.auth', { auth_type: 'jwt' }, async () => {
        await startSanitizedSpan('dixie.finn.inference', { model: '/chat', latency_ms: 0, circuit_state: 'closed' }, async () => {
          return 'inference-result';
        });
        return 'auth-result';
      });
      return 'request-result';
    });

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(3);

    const request = spans.find(s => s.name === 'dixie.request')!;
    const auth = spans.find(s => s.name === 'dixie.auth')!;
    const inference = spans.find(s => s.name === 'dixie.finn.inference')!;

    // All share same trace
    const traceId = request.spanContext().traceId;
    expect(auth.spanContext().traceId).toBe(traceId);
    expect(inference.spanContext().traceId).toBe(traceId);

    // Parent chain: request ← auth ← inference
    expect(request.parentSpanId).toBeUndefined();
    expect(auth.parentSpanId).toBe(request.spanContext().spanId);
    expect(inference.parentSpanId).toBe(auth.spanContext().spanId);
  });

  it('span context IDs are valid W3C trace format', async () => {
    const { startSanitizedSpan } = await import('../span-sanitizer.js');

    await startSanitizedSpan('dixie.request', { method: 'GET', url: '/health' }, async () => {
      return 'ok';
    });

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);

    const ctx = spans[0].spanContext();
    // W3C trace-id: 32 hex chars
    expect(ctx.traceId).toMatch(/^[0-9a-f]{32}$/);
    // W3C span-id: 16 hex chars
    expect(ctx.spanId).toMatch(/^[0-9a-f]{16}$/);
  });
});
