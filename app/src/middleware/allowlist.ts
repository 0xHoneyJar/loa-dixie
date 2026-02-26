import { createMiddleware } from 'hono/factory';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getAddress } from 'viem';
import type { AccessPolicy } from '../types.js';

// DECISION: Allowlist as governance primitive (communitarian architecture)
// The allowlist gate is not just an access control list — it's the first
// layer of community governance. The AccessPolicy type from Hounfour
// formalizes what this gate implements: who can access what, and under
// what conditions. See: grimoires/loa/context/adr-communitarian-agents.md

/**
 * Allowlist file format persisted to disk.
 *
 * The optional `policy` field uses Hounfour's AccessPolicy type to formalize
 * governance rules. Phase 1 uses 'role_based' only. Phase 2 adds 'time_limited'
 * for conviction-based tier expiry. Phase 3 adds per-conversation policies
 * for soul memory governance.
 */
export interface AllowlistData {
  version: number;
  wallets: string[];
  apiKeys: string[];
  updated_at: string;
  /** Hounfour AccessPolicy governing this allowlist (optional, backward-compatible) */
  policy?: AccessPolicy;
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
 * Default AccessPolicy for Phase 1: role_based with 'team' role.
 * All allowlisted entries have equivalent access as team members.
 * ADR: Phase 1 uses role_based only. Phase 2 adds time_limited for
 * conviction-based tier expiry. Phase 3 adds per-conversation policies.
 */
export const DEFAULT_ACCESS_POLICY: AccessPolicy = {
  type: 'role_based',
  roles: ['team'],
  audit_required: true,
  revocable: false,
};

/**
 * In-memory allowlist with file persistence, bounded audit log,
 * and optional file-watcher for multi-instance consistency.
 */
export class AllowlistStore {
  private data: AllowlistData;
  private readonly filePath: string;
  private readonly auditLog: AuditEntry[] = [];
  private readonly maxAuditEntries: number;
  private lastWrittenHash = '';
  private watcher: fs.FSWatcher | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(filePath: string, opts?: { maxAuditEntries?: number; watch?: boolean }) {
    this.filePath = filePath;
    this.maxAuditEntries = opts?.maxAuditEntries ?? 10_000;
    this.data = this.loadFromDisk();

    // Start file-watcher for multi-instance consistency (opt-in)
    if (opts?.watch === true && filePath) {
      this.startWatching();
    }
  }

  /** Check if an API key is in the allowlist */
  hasApiKey(key: string): boolean {
    return this.data.apiKeys.includes(key);
  }

  /**
   * Check if a wallet address is in the allowlist (EIP-55 normalized).
   *
   * @security Uses viem's getAddress() for EIP-55 checksummed comparison.
   * Case-insensitive matching prevents bypass via mixed-case addresses.
   * Catches and returns false for malformed addresses (no throw path).
   */
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

  /**
   * Get the effective AccessPolicy for this allowlist.
   * Returns the stored policy, or the default Phase 1 policy.
   *
   * Default: { type: 'role_based', role: 'team' } — matches current
   * allowlist behavior where all entries are equivalent team members.
   */
  getPolicy(): AccessPolicy {
    return this.data.policy ?? DEFAULT_ACCESS_POLICY;
  }

  /** Update the AccessPolicy for this allowlist */
  setPolicy(policy: AccessPolicy): void {
    this.data.policy = policy;
    this.data.updated_at = new Date().toISOString();
    this.persistToDisk();
  }

  /** Record an audit entry with bounded buffer.
   *  Uses batch eviction (oldest half) for amortized O(1) per entry,
   *  instead of shift() which is O(n) per eviction. */
  audit(entry: AuditEntry): void {
    this.auditLog.push(entry);

    if (this.auditLog.length > this.maxAuditEntries) {
      // Batch evict the oldest half via a single splice
      const evictCount = Math.floor(this.auditLog.length / 2);
      const evicted = this.auditLog.splice(0, evictCount);
      const overflowTimestamp = new Date().toISOString();
      for (const e of evicted) {
        process.stdout.write(
          JSON.stringify({
            level: 'info',
            event: 'audit_overflow',
            overflow_at: overflowTimestamp,
            service: 'dixie-bff',
            ...e,
          }) + '\n',
        );
      }
    }
  }

  /** Get current in-memory audit entries. */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /** Clean up watcher and poll interval. */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Start watching the allowlist file for external changes.
   * Uses fs.watch with polling fallback for EFS/NFS compatibility.
   */
  private startWatching(): void {
    const usePolling = process.env.DIXIE_ALLOWLIST_POLL === '1';

    if (usePolling) {
      this.startPolling();
      return;
    }

    try {
      this.watcher = fs.watch(this.filePath, { persistent: false }, (_eventType) => {
        this.debouncedReload();
      });
      this.watcher.on('error', () => {
        // fs.watch failed — fall back to polling
        this.watcher?.close();
        this.watcher = null;
        this.startPolling();
      });
    } catch {
      // fs.watch not available — fall back to polling
      this.startPolling();
    }
  }

  /** Polling fallback for environments where fs.watch is unreliable. */
  private startPolling(): void {
    let lastMtime = 0;
    try {
      lastMtime = fs.statSync(this.filePath).mtimeMs;
    } catch { /* file may not exist yet */ }

    this.pollInterval = setInterval(() => {
      try {
        const mtime = fs.statSync(this.filePath).mtimeMs;
        if (mtime > lastMtime) {
          lastMtime = mtime;
          this.debouncedReload();
        }
      } catch { /* file temporarily missing during write */ }
    }, 30_000);
    this.pollInterval.unref();
  }

  /** Debounced reload — ignore rapid successive events within 500ms. */
  private debouncedReload(): void {
    if (this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;

      try {
        const loaded = this.loadFromDisk();
        // Self-write detection: compare content hash of loaded data against
        // the last data we wrote. If they match, this is our own write — skip.
        const loadedHash = JSON.stringify(loaded);
        if (loadedHash === this.lastWrittenHash) return;
        this.data = loaded;
      } catch { /* file temporarily missing during temp+rename */ }
    }, 500);
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
    if (!this.filePath) return; // In-memory only mode
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const content = JSON.stringify(this.data, null, 2);
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, content);
    fs.renameSync(tmpPath, this.filePath);
    // Store a hash of the written data for self-write detection.
    // Uses JSON.stringify of the parsed data (not the formatted string)
    // so the comparison in debouncedReload is consistent.
    this.lastWrittenHash = JSON.stringify(this.data);
  }
}

/**
 * Allowlist middleware — blocks unauthorized requests.
 * Skips health and auth endpoints.
 */
export function createAllowlistMiddleware(store: AllowlistStore) {
  return createMiddleware(async (c, next) => {
    const pathname = new URL(c.req.url).pathname;

    // Skip allowlist check for endpoints with their own auth gates
    if (
      pathname.startsWith('/api/health') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/admin')
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
    const wallet = c.get('wallet');
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
