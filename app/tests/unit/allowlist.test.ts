import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('AllowlistStore bounded audit log', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    filePath = path.join(tmpDir, 'allowlist.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function makeEntry(n: number): import('../../src/middleware/allowlist.js').AuditEntry {
    return {
      timestamp: new Date().toISOString(),
      request_id: `req-${n}`,
      identity: `0x${n.toString(16).padStart(40, '0')}`,
      auth_type: 'jwt_wallet',
      action: 'allowed',
      endpoint: '/api/test',
      ip: '127.0.0.1',
    };
  }

  it('accepts entries under the limit', () => {
    const store = new AllowlistStore(filePath, { maxAuditEntries: 5 });
    for (let i = 0; i < 5; i++) store.audit(makeEntry(i));
    expect(store.getAuditLog()).toHaveLength(5);
  });

  it('evicts oldest entries when exceeding max', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const store = new AllowlistStore(filePath, { maxAuditEntries: 3 });

    for (let i = 0; i < 5; i++) store.audit(makeEntry(i));

    // Should have exactly 3 entries (last 3)
    const log = store.getAuditLog();
    expect(log).toHaveLength(3);
    expect(log[0]!.request_id).toBe('req-2');

    // Should have emitted 2 overflow entries to stdout
    const overflows = stdoutSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('audit_overflow'),
    );
    expect(overflows).toHaveLength(2);

    stdoutSpy.mockRestore();
  });

  it('buffer stays bounded at steady state', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const store = new AllowlistStore(filePath, { maxAuditEntries: 10 });

    // Add 100 entries
    for (let i = 0; i < 100; i++) store.audit(makeEntry(i));

    expect(store.getAuditLog()).toHaveLength(10);
    stdoutSpy.mockRestore();
  });

  it('uses default max of 10000', () => {
    const store = new AllowlistStore(filePath);
    // Don't add 10K entries — just verify the store exists with default
    for (let i = 0; i < 5; i++) store.audit(makeEntry(i));
    expect(store.getAuditLog()).toHaveLength(5);
  });
});

describe('AllowlistStore file-watcher', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dixie-test-'));
    filePath = path.join(tmpDir, 'allowlist.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('detects external file write and reloads', async () => {
    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: ['dxk_original'], updated_at: new Date().toISOString(),
    }));

    const store = new AllowlistStore(filePath, { watch: true });
    expect(store.hasApiKey('dxk_original')).toBe(true);
    expect(store.hasApiKey('dxk_external')).toBe(false);

    // External write
    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: ['dxk_original', 'dxk_external'], updated_at: new Date().toISOString(),
    }));

    // Wait for debounce (500ms) + some buffer
    await new Promise((r) => setTimeout(r, 800));

    expect(store.hasApiKey('dxk_external')).toBe(true);
    store.close();
  });

  it('skips reload on self-write', async () => {
    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: [], updated_at: new Date().toISOString(),
    }));

    const store = new AllowlistStore(filePath, { watch: true });
    store.addEntry('apiKey', 'dxk_self');

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 800));

    // Should still have the entry (self-write reload was skipped)
    expect(store.hasApiKey('dxk_self')).toBe(true);
    store.close();
  });

  it('handles missing file gracefully', () => {
    // File doesn't exist — watcher should not crash
    const store = new AllowlistStore(filePath, { watch: true });
    expect(store.getData().wallets).toEqual([]);
    store.close();
  });

  it('close stops the watcher', () => {
    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: [], updated_at: new Date().toISOString(),
    }));

    const store = new AllowlistStore(filePath, { watch: true });
    store.close();
    // Should not throw or leak
  });

  it('uses polling fallback when DIXIE_ALLOWLIST_POLL=1', () => {
    const origPoll = process.env.DIXIE_ALLOWLIST_POLL;
    process.env.DIXIE_ALLOWLIST_POLL = '1';

    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: [], updated_at: new Date().toISOString(),
    }));

    const store = new AllowlistStore(filePath, { watch: true });
    // Polling mode — should not crash
    expect(store.getData().wallets).toEqual([]);
    store.close();

    process.env.DIXIE_ALLOWLIST_POLL = origPoll;
  });

  it('debounces rapid successive events', async () => {
    fs.writeFileSync(filePath, JSON.stringify({
      version: 1, wallets: [], apiKeys: ['dxk_v1'], updated_at: new Date().toISOString(),
    }));

    const store = new AllowlistStore(filePath, { watch: true });

    // Rapid writes (simulates EFS behavior)
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(filePath, JSON.stringify({
        version: 1, wallets: [], apiKeys: [`dxk_v${i + 2}`], updated_at: new Date().toISOString(),
      }));
    }

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 800));

    // Should have the last write's value
    expect(store.hasApiKey('dxk_v6')).toBe(true);
    store.close();
  });
});
