import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createTracing } from '../../src/middleware/tracing.js';

describe('tracing middleware', () => {
  it('adds traceparent header to response', async () => {
    const app = new Hono();
    app.use('*', createTracing('dixie-bff'));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toBeTruthy();
    expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
  });

  it('propagates incoming traceparent trace ID', async () => {
    const app = new Hono();
    app.use('*', createTracing('dixie-bff'));
    app.get('/', (c) => c.text('ok'));

    const incomingTraceId = 'abcdef1234567890abcdef1234567890';
    const res = await app.request('/', {
      headers: {
        traceparent: `00-${incomingTraceId}-0000000000000001-01`,
      },
    });
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toContain(incomingTraceId);
  });

  it('generates new trace ID for malformed traceparent', async () => {
    const app = new Hono();
    app.use('*', createTracing('dixie-bff'));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      headers: { traceparent: 'invalid' },
    });
    const traceparent = res.headers.get('traceparent');
    expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
  });
});
