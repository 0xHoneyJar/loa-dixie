import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  AllowlistStore,
  createAllowlistMiddleware,
} from '../../src/middleware/allowlist.js';

describe('AllowlistStore', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    filePath = path.join(tmpDir, 'allowlist.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('creates empty allowlist when file does not exist', () => {
    const store = new AllowlistStore(filePath);
    const data = store.getData();
    expect(data.version).toBe(1);
    expect(data.wallets).toEqual([]);
    expect(data.apiKeys).toEqual([]);
  });

  it('loads existing allowlist from disk', () => {
    const existing = {
      version: 1,
      wallets: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
      apiKeys: ['dxk_live_test123'],
      updated_at: '2026-01-01T00:00:00Z',
    };
    fs.writeFileSync(filePath, JSON.stringify(existing));

    const store = new AllowlistStore(filePath);
    expect(store.hasWallet('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(
      true,
    );
    expect(store.hasApiKey('dxk_live_test123')).toBe(true);
  });

  it('adds and persists wallet entries', () => {
    const store = new AllowlistStore(filePath);
    store.addEntry('wallet', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    expect(store.hasWallet('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toBe(
      true,
    );

    // Verify persisted
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(raw.wallets).toHaveLength(1);
  });

  it('removes entries', () => {
    const store = new AllowlistStore(filePath);
    store.addEntry('apiKey', 'dxk_live_abc');
    expect(store.hasApiKey('dxk_live_abc')).toBe(true);

    const removed = store.removeEntry('dxk_live_abc');
    expect(removed).toBe(true);
    expect(store.hasApiKey('dxk_live_abc')).toBe(false);
  });

  it('returns false for non-existent entries', () => {
    const store = new AllowlistStore(filePath);
    expect(store.hasApiKey('nonexistent')).toBe(false);
    expect(store.hasWallet('0x0000000000000000000000000000000000000000')).toBe(
      false,
    );
  });
});

describe('allowlist middleware', () => {
  let tmpDir: string;
  let store: AllowlistStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    store = new AllowlistStore(path.join(tmpDir, 'allowlist.json'));
    store.addEntry('apiKey', 'dxk_live_allowed');
    store.addEntry('wallet', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function createApp() {
    const app = new Hono();
    app.use('/api/*', createAllowlistMiddleware(store));
    app.get('/api/test', (c) => c.text('ok'));
    app.get('/api/health', (c) => c.text('healthy'));
    app.post('/api/auth/siwe', (c) => c.text('auth'));
    return app;
  }

  it('allows requests with valid API key', async () => {
    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { authorization: 'Bearer dxk_live_allowed' },
    });
    expect(res.status).toBe(200);
  });

  it('denies requests with invalid API key', async () => {
    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { authorization: 'Bearer dxk_live_invalid' },
    });
    expect(res.status).toBe(403);
  });

  it('returns 401 for missing credentials', async () => {
    const app = createApp();
    const res = await app.request('/api/test');
    expect(res.status).toBe(401);
  });

  it('skips allowlist check for health endpoint', async () => {
    const app = createApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('skips allowlist check for auth endpoint', async () => {
    const app = createApp();
    const res = await app.request('/api/auth/siwe', { method: 'POST' });
    expect(res.status).toBe(200);
  });

  it('records audit entries for access attempts', async () => {
    const app = createApp();
    await app.request('/api/test', {
      headers: { authorization: 'Bearer dxk_live_allowed' },
    });
    await app.request('/api/test');

    const log = store.getAuditLog();
    expect(log).toHaveLength(2);
    expect(log[0]!.action).toBe('allowed');
    expect(log[1]!.action).toBe('denied');
  });
});
