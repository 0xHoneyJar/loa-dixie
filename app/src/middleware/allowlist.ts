import { createMiddleware } from 'hono/factory';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getAddress } from 'viem';

/** Allowlist file format persisted to disk */
export interface AllowlistData {
  version: number;
  wallets: string[];
  apiKeys: string[];
  updated_at: string;
}

/** Audit log entry for access attempts */
export interface AuditEntry {
  timestamp: string;
  request_id: string;
  identity: string;
  auth_type: 'api_key' | 'jwt_wallet' | 'none';
  action: 'allowed' | 'denied';
  endpoint: string;
  ip: string;
}

/**
 * In-memory allowlist with file persistence.
 */
export class AllowlistStore {
  private data: AllowlistData;
  private readonly filePath: string;
  private readonly auditLog: AuditEntry[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = this.loadFromDisk();
  }

  /** Check if an API key is in the allowlist */
  hasApiKey(key: string): boolean {
    return this.data.apiKeys.includes(key);
  }

  /** Check if a wallet address is in the allowlist (EIP-55 normalized) */
  hasWallet(address: string): boolean {
    try {
      const normalized = getAddress(address);
      return this.data.wallets.some(
        (w) => getAddress(w) === normalized,
      );
    } catch {
      return false;
    }
  }

  /** Add an entry to the allowlist */
  addEntry(type: 'wallet' | 'apiKey', value: string): void {
    if (type === 'wallet') {
      const normalized = getAddress(value);
      if (!this.data.wallets.includes(normalized)) {
        this.data.wallets.push(normalized);
      }
    } else {
      if (!this.data.apiKeys.includes(value)) {
        this.data.apiKeys.push(value);
      }
    }
    this.data.updated_at = new Date().toISOString();
    this.persistToDisk();
  }

  /** Remove an entry from the allowlist */
  removeEntry(entry: string): boolean {
    const walletIdx = this.data.wallets.findIndex((w) => {
      try {
        return getAddress(w) === getAddress(entry);
      } catch {
        return false;
      }
    });
    if (walletIdx >= 0) {
      this.data.wallets.splice(walletIdx, 1);
      this.data.updated_at = new Date().toISOString();
      this.persistToDisk();
      return true;
    }

    const keyIdx = this.data.apiKeys.indexOf(entry);
    if (keyIdx >= 0) {
      this.data.apiKeys.splice(keyIdx, 1);
      this.data.updated_at = new Date().toISOString();
      this.persistToDisk();
      return true;
    }

    return false;
  }

  /** Get the current allowlist data */
  getData(): AllowlistData {
    return { ...this.data };
  }

  /** Record an audit entry */
  audit(entry: AuditEntry): void {
    this.auditLog.push(entry);
  }

  /** Get recent audit entries (for testing) */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  private loadFromDisk(): AllowlistData {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw) as AllowlistData;
    } catch {
      return {
        version: 1,
        wallets: [],
        apiKeys: [],
        updated_at: new Date().toISOString(),
      };
    }
  }

  private persistToDisk(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmpPath, this.filePath);
  }
}

/**
 * Allowlist middleware — blocks unauthorized requests.
 * Skips health and auth endpoints.
 */
export function createAllowlistMiddleware(store: AllowlistStore) {
  return createMiddleware(async (c, next) => {
    const pathname = new URL(c.req.url).pathname;

    // Skip allowlist check for health and auth endpoints
    if (
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/auth')
    ) {
      await next();
      return;
    }

    const requestId = c.get('requestId') ?? '';
    const ip = c.req.header('x-forwarded-for') ?? 'unknown';

    // Check API key auth
    const authHeader = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer dxk_')) {
      const apiKey = authHeader.slice(7);
      if (store.hasApiKey(apiKey)) {
        store.audit({
          timestamp: new Date().toISOString(),
          request_id: requestId,
          identity: apiKey.slice(0, 12) + '...',
          auth_type: 'api_key',
          action: 'allowed',
          endpoint: pathname,
          ip,
        });
        await next();
        return;
      }
      store.audit({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        identity: apiKey.slice(0, 12) + '...',
        auth_type: 'api_key',
        action: 'denied',
        endpoint: pathname,
        ip,
      });
      return c.json({ error: 'forbidden', message: 'Not authorized' }, 403);
    }

    // Check JWT wallet auth
    const wallet = c.get('wallet') as string | undefined;
    if (wallet) {
      if (store.hasWallet(wallet)) {
        store.audit({
          timestamp: new Date().toISOString(),
          request_id: requestId,
          identity: wallet,
          auth_type: 'jwt_wallet',
          action: 'allowed',
          endpoint: pathname,
          ip,
        });
        await next();
        return;
      }
      store.audit({
        timestamp: new Date().toISOString(),
        request_id: requestId,
        identity: wallet,
        auth_type: 'jwt_wallet',
        action: 'denied',
        endpoint: pathname,
        ip,
      });
      return c.json({ error: 'forbidden', message: 'Not authorized' }, 403);
    }

    // No auth provided
    store.audit({
      timestamp: new Date().toISOString(),
      request_id: requestId,
      identity: 'anonymous',
      auth_type: 'none',
      action: 'denied',
      endpoint: pathname,
      ip,
    });
    return c.json(
      { error: 'unauthorized', message: 'Authentication required' },
      401,
    );
  });
}
