import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestId } from '../../src/middleware/request-id.js';
import { createCors } from '../../src/middleware/cors.js';

describe('requestId middleware', () => {
  it('generates X-Request-Id when none provided', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/');
    const id = res.headers.get('X-Request-Id');
    expect(id).toBeTruthy();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('preserves existing X-Request-Id', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/', (c) => c.text('ok'));

    const res = await app.request('/', {
      headers: { 'x-request-id': 'custom-123' },
    });
    expect(res.headers.get('X-Request-Id')).toBe('custom-123');
  });
});

describe('createCors middleware', () => {
  it('sets CORS headers for allowed origin', async () => {
    const app = new Hono();
    app.use('/api/*', createCors(['http://localhost:5173']));
    app.get('/api/test', (c) => c.text('ok'));

    const res = await app.request('/api/test', {
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    );
  });

  it('does not set CORS headers for disallowed origin', async () => {
    const app = new Hono();
    app.use('/api/*', createCors(['http://localhost:5173']));
    app.get('/api/test', (c) => c.text('ok'));

    const res = await app.request('/api/test', {
      headers: { origin: 'http://evil.com' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
