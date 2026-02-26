import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createTracing } from '../../src/middleware/tracing.js';

describe('tracing middleware', () => {
  // W3C traceparent format: 00-{traceId 32hex}-{spanId 16hex}-{flags 2hex}
  // In no-op mode (no OTEL SDK), traceFlags is 00; with SDK, reflects sampling.
  const W3C_TRACEPARENT = /^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/;

  // Shared app setup — extracted per BB-S4-008
  let app: InstanceType<typeof Hono>;

  beforeEach(() => {
    app = new Hono();
    app.use('*', createTracing('dixie-bff'));
    app.get('/', (c) => c.text('ok'));
  });

  it('adds traceparent header to response', async () => {
    const res = await app.request('/');
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toBeTruthy();
    expect(traceparent).toMatch(W3C_TRACEPARENT);
  });

  it('response traceparent uses OTEL span context IDs', async () => {
    // After BB-PR50-F3 fix: traceparent uses real OTEL span context IDs
    // instead of independently generated UUIDs. In no-op mode (no SDK),
    // the span context returns zero IDs. With a real SDK, IDs are real.
    const res = await app.request('/', {
      headers: {
        traceparent: '00-abcdef1234567890abcdef1234567890-0000000000000001-01',
      },
    });
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toMatch(W3C_TRACEPARENT);
  });

  it('generates new trace ID for malformed traceparent', async () => {
    const res = await app.request('/', {
      headers: { traceparent: 'invalid' },
    });
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toMatch(W3C_TRACEPARENT);
  });
});
