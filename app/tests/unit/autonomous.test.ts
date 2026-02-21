import { describe, it, expect, vi } from 'vitest';
import { AutonomousEngine } from '../../src/services/autonomous-engine.js';
import { defaultPermissions, ALL_AUTONOMOUS_CAPABILITIES } from '../../src/types/autonomous.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { AutonomousPermissions, AutonomousAction } from '../../src/types/autonomous.js';

function mockFinnClient(responses?: Record<string, unknown>) {
  return {
    request: vi.fn().mockImplementation((_method: string, path: string) => {
      if (responses && responses[path]) {
        return Promise.resolve(responses[path]);
      }
      return Promise.reject(new Error('Not found'));
    }),
  } as unknown as FinnClient;
}

const enabledPermissions: AutonomousPermissions = {
  nftId: 'oracle',
  enabled: true,
  ownerWallet: '0xowner',
  delegatedWallets: ['0xdelegate'],
  capabilities: {
    chat_initiate: true,
    knowledge_search: true,
    schedule_manage: true,
    memory_write: true,
    tool_execute: true,
    agent_communicate: false,
  },
  budget: {
    dailyCapMicroUsd: 100_000,
    hourlyRateLimit: 60,
    requireConfirmationAboveUsd: 50_000,
  },
  toolWhitelist: ['search_knowledge', 'web_browse'],
  updatedAt: '2026-02-21T00:00:00Z',
};

describe('autonomous engine', () => {
  describe('checkPermission — 7-step flow', () => {
    it('denies when autonomous mode is disabled', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': { ...enabledPermissions, enabled: false },
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not enabled');
    });

    it('denies when requester is not owner or delegate', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        requestedBy: '0xstranger',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not owner or authorized');
    });

    it('allows owner', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(true);
    });

    it('allows delegate', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'knowledge_search',
        requestedBy: '0xdelegate',
      });

      expect(result.allowed).toBe(true);
    });

    it('denies disabled capability', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'agent_communicate', // disabled in mock
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('agent_communicate');
    });

    it('denies non-whitelisted tool', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'tool_execute',
        tool: 'dangerous_tool',
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in the whitelist');
    });

    it('allows whitelisted tool', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'tool_execute',
        tool: 'search_knowledge',
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(true);
    });

    it('denies when budget exceeded', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': {
          ...enabledPermissions,
          budget: { ...enabledPermissions.budget, dailyCapMicroUsd: 100 },
        },
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        estimatedCostMicroUsd: 200,
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('budget exceeded');
    });

    it('requires confirmation above threshold', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        estimatedCostMicroUsd: 60_000, // above 50_000 threshold
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });

    it('no confirmation needed below threshold', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      const result = await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        estimatedCostMicroUsd: 1_000,
        requestedBy: '0xowner',
      });

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });
  });

  describe('audit trail', () => {
    it('logs every permission check', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        requestedBy: '0xowner',
      });

      const log = engine.getAuditLog('oracle');
      expect(log).toHaveLength(1);
      expect(log[0].result.allowed).toBe(true);
    });

    it('logs denied actions too', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': { ...enabledPermissions, enabled: false },
      });
      const engine = new AutonomousEngine(finnClient, null);

      await engine.checkPermission({
        nftId: 'oracle',
        capability: 'chat_initiate',
        requestedBy: '0xowner',
      });

      const log = engine.getAuditLog('oracle');
      expect(log).toHaveLength(1);
      expect(log[0].result.allowed).toBe(false);
    });
  });

  describe('daily summary', () => {
    it('aggregates daily activity', async () => {
      const finnClient = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finnClient, null);

      // Perform several actions
      await engine.checkPermission({ nftId: 'oracle', capability: 'chat_initiate', requestedBy: '0xowner', estimatedCostMicroUsd: 100 });
      await engine.checkPermission({ nftId: 'oracle', capability: 'knowledge_search', requestedBy: '0xowner', estimatedCostMicroUsd: 200 });
      await engine.checkPermission({ nftId: 'oracle', capability: 'agent_communicate', requestedBy: '0xowner' }); // denied

      const summary = engine.getDailySummary('oracle');
      expect(summary.totalActions).toBe(3);
      expect(summary.allowedActions).toBe(2);
      expect(summary.deniedActions).toBe(1);
      expect(summary.totalSpendMicroUsd).toBe(300);
      expect(summary.capabilitiesUsed).toContain('chat_initiate');
      expect(summary.capabilitiesUsed).toContain('knowledge_search');
    });
  });

  describe('defaultPermissions', () => {
    it('creates with all capabilities disabled', () => {
      const perms = defaultPermissions('oracle', '0xowner', 100_000);
      expect(perms.enabled).toBe(false);
      for (const cap of ALL_AUTONOMOUS_CAPABILITIES) {
        expect(perms.capabilities[cap]).toBe(false);
      }
    });
  });

  describe('getPermissions fallback', () => {
    it('returns defaults when finn unavailable', async () => {
      const finnClient = mockFinnClient(); // all fail
      const engine = new AutonomousEngine(finnClient, null);

      const perms = await engine.getPermissions('unknown');
      expect(perms.enabled).toBe(false);
      expect(perms.nftId).toBe('unknown');
    });
  });

  describe('audit log eviction logging (iter2-low-5)', () => {
    it('calls log callback on eviction with correct counts', async () => {
      const logFn = vi.fn();
      const finn = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finn, null, {
        maxAuditEntries: 5,
        log: logFn,
      });

      // Fill audit log beyond maxAuditEntries
      for (let i = 0; i < 7; i++) {
        await engine.checkPermission({
          nftId: 'oracle',
          capability: 'chat_initiate',
          requestedBy: '0xowner',
          estimatedCostMicroUsd: 10,
        });
      }

      // Log should have been called when buffer exceeded 5 entries (at entry 6)
      expect(logFn).toHaveBeenCalledWith('warn', expect.objectContaining({
        event: 'audit_log_eviction',
        nftId: 'oracle',
      }));

      // Verify eviction metadata
      const call = logFn.mock.calls.find(
        (c: unknown[]) => (c[1] as Record<string, unknown>).event === 'audit_log_eviction',
      );
      expect(call).toBeDefined();
      expect((call![1] as Record<string, unknown>).evictedCount).toBeGreaterThan(0);
      expect((call![1] as Record<string, unknown>).remainingCount).toBeGreaterThan(0);
    });

    it('does not call log when below threshold', async () => {
      const logFn = vi.fn();
      const finn = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finn, null, {
        maxAuditEntries: 100,
        log: logFn,
      });

      // Only 3 entries — well below threshold
      for (let i = 0; i < 3; i++) {
        await engine.checkPermission({
          nftId: 'oracle',
          capability: 'chat_initiate',
          requestedBy: '0xowner',
        });
      }

      expect(logFn).not.toHaveBeenCalled();
    });

    it('eviction still works without log callback', async () => {
      const finn = mockFinnClient({
        '/api/autonomous/oracle/permissions': enabledPermissions,
      });
      const engine = new AutonomousEngine(finn, null, {
        maxAuditEntries: 5,
        // no log callback
      });

      for (let i = 0; i < 10; i++) {
        await engine.checkPermission({
          nftId: 'oracle',
          capability: 'chat_initiate',
          requestedBy: '0xowner',
        });
      }

      // Audit log should be bounded (not 10 entries)
      const log = engine.getAuditLog('oracle', 100);
      expect(log.length).toBeLessThan(10);
    });
  });
});
