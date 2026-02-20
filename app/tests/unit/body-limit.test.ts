import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createBodyLimit } from '../../src/middleware/body-limit.js';

describe('body limit middleware', () => {
  it('allows requests under limit', async () => {
    const app = new Hono();
    app.use('*', createBodyLimit(1024));
    app.post('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Length': '100' },
      body: 'x'.repeat(100),
    });
    expect(res.status).toBe(200);
  });

  it('rejects requests exceeding limit', async () => {
    const app = new Hono();
    app.use('*', createBodyLimit(1024));
    app.post('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Length': '2048' },
      body: 'x'.repeat(2048),
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe('payload_too_large');
  });

  it('allows requests without Content-Length header', async () => {
    const app = new Hono();
    app.use('*', createBodyLimit(1024));
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');
    expect(res.status).toBe(200);
  });
});
