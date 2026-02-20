import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AllowlistStore } from '../../src/middleware/allowlist.js';
import { createAdminRoutes } from '../../src/routes/admin.js';

describe('admin routes', () => {
  let tmpDir: string;
  let store: AllowlistStore;
  let app: Hono;
  const adminKey = 'admin-secret-key';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    store = new AllowlistStore(path.join(tmpDir, 'allowlist.json'));
    app = new Hono();
    app.route('/api/admin', createAdminRoutes(store, adminKey));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns 401 without admin key', async () => {
    const res = await app.request('/api/admin/allowlist');
    expect(res.status).toBe(401);
  });

  it('returns 403 with invalid admin key', async () => {
    const res = await app.request('/api/admin/allowlist', {
      headers: { authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(403);
  });

  it('lists empty allowlist', async () => {
    const res = await app.request('/api/admin/allowlist', {
      headers: { authorization: `Bearer ${adminKey}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.wallets).toEqual([]);
    expect(body.apiKeys).toEqual([]);
  });

  it('adds a wallet entry', async () => {
    const res = await app.request('/api/admin/allowlist', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'wallet',
        value: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.wallets).toHaveLength(1);
  });

  it('adds an API key entry', async () => {
    const res = await app.request('/api/admin/allowlist', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'apiKey', value: 'dxk_live_new123' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.apiKeys).toHaveLength(1);
  });

  it('removes an entry', async () => {
    store.addEntry('apiKey', 'dxk_live_remove');

    const res = await app.request('/api/admin/allowlist/dxk_live_remove', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminKey}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.apiKeys).toEqual([]);
  });

  it('returns 404 when removing non-existent entry', async () => {
    const res = await app.request('/api/admin/allowlist/nonexistent', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminKey}` },
    });
    expect(res.status).toBe(404);
  });

  it('rejects invalid address format', async () => {
    const res = await app.request('/api/admin/allowlist', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${adminKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ type: 'wallet', value: 'not-an-address' }),
    });
    expect(res.status).toBe(400);
  });
});
