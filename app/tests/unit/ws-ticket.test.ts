import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as jose from 'jose';
import { createJwtMiddleware } from '../../src/middleware/jwt.js';
import { createWsTicketRoutes } from '../../src/routes/ws-ticket.js';
import { TicketStore } from '../../src/services/ticket-store.js';

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars!!';
const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

async function makeJwt(wallet: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({ role: 'team' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(wallet)
    .setIssuer('dixie-bff')
    .setExpirationTime('1h')
    .sign(secret);
}

describe('ws-ticket routes', () => {
  let store: TicketStore;
  let app: Hono;

  beforeEach(() => {
    store = new TicketStore();
    app = new Hono();
    // Wire JWT middleware to set wallet on context + forward via header
    app.use('/api/*', createJwtMiddleware(JWT_SECRET, 'dixie-bff'));
    app.use('/api/*', async (c, next) => {
      const wallet = c.get('wallet');
      if (wallet) c.req.raw.headers.set('x-wallet-address', wallet);
      await next();
    });
    app.route('/api/ws/ticket', createWsTicketRoutes(store));
  });

  afterEach(() => {
    store.close();
  });

  it('issues a ticket for authenticated user', async () => {
    const jwt = await makeJwt(WALLET);
    const res = await app.request('/api/ws/ticket', {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ticket: string; expires_in: number };
    expect(body.ticket).toMatch(/^wst_/);
    expect(body.expires_in).toBe(30);
  });

  it('returns 401 without authentication', async () => {
    const res = await app.request('/api/ws/ticket', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('issued ticket can be consumed from the store', async () => {
    const jwt = await makeJwt(WALLET);
    const res = await app.request('/api/ws/ticket', {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
    });
    const body = await res.json() as { ticket: string };
    const wallet = store.consume(body.ticket);
    expect(wallet).toBe(WALLET);
  });

  it('ticket is single-use via the store', async () => {
    const jwt = await makeJwt(WALLET);
    const res = await app.request('/api/ws/ticket', {
      method: 'POST',
      headers: { authorization: `Bearer ${jwt}` },
    });
    const body = await res.json() as { ticket: string };
    store.consume(body.ticket); // first use
    const wallet = store.consume(body.ticket); // second use
    expect(wallet).toBeNull();
  });

  it('returns 429 when per-wallet ticket cap is reached', async () => {
    // Create a store with cap of 1
    const capStore = new TicketStore(30_000, 999_999, 1);
    const capApp = new Hono();
    capApp.use('/api/*', createJwtMiddleware(JWT_SECRET, 'dixie-bff'));
    capApp.use('/api/*', async (c, next) => {
      const wallet = c.get('wallet');
      if (wallet) c.req.raw.headers.set('x-wallet-address', wallet);
      await next();
    });
    capApp.route('/api/ws/ticket', createWsTicketRoutes(capStore));

    const jwt = await makeJwt(WALLET);
    const headers = { authorization: `Bearer ${jwt}` };

    // First ticket should succeed
    const res1 = await capApp.request('/api/ws/ticket', { method: 'POST', headers });
    expect(res1.status).toBe(200);

    // Second ticket should be rate-limited
    const res2 = await capApp.request('/api/ws/ticket', { method: 'POST', headers });
    expect(res2.status).toBe(429);

    capStore.close();
  });
});
