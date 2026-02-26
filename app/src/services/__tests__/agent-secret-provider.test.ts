/**
 * Agent Secret Provider Unit Tests — Scoped Secrets, Cleanup, Audit
 *
 * Tests the DefaultAgentSecretProvider implementation:
 * - Scoped secret retrieval per agent type
 * - Secret cleanup timing (within 5s default)
 * - Audit logging of issuance and cleanup
 * - Injectable dependencies for testability
 *
 * @since cycle-012 — Sprint 87, Task T-2.11
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DefaultAgentSecretProvider,
  type SecretProviderDeps,
  type SecretAuditEntry,
} from '../agent-secret-provider.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeDeps(overrides: Partial<SecretProviderDeps> = {}): SecretProviderDeps {
  const secrets: Record<string, string> = {
    ANTHROPIC_API_KEY: 'sk-ant-test-123',
    OPENAI_API_KEY: 'sk-openai-test-456',
    GOOGLE_AI_API_KEY: 'ai-google-test-789',
    GITHUB_TOKEN: 'ghp_testtoken123',
    FLEET_TASK_ID: 'injected-by-provider',
  };

  return {
    getSecret: vi.fn().mockImplementation(async (key: string) => secrets[key]),
    log: vi.fn(),
    cleanupDelayMs: 5000,
    setTimeout: vi.fn().mockImplementation((fn: () => void, _ms: number) => {
      // Return a fake timer ID, don't actually schedule
      return 42 as unknown as ReturnType<typeof globalThis.setTimeout>;
    }),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scoped Secret Retrieval
// ---------------------------------------------------------------------------

describe('DefaultAgentSecretProvider — getSecrets()', () => {
  let deps: SecretProviderDeps;
  let provider: DefaultAgentSecretProvider;

  beforeEach(() => {
    deps = makeDeps();
    provider = new DefaultAgentSecretProvider(deps);
  });

  it('returns only claude_code-scoped secrets for claude_code agents', async () => {
    const secrets = await provider.getSecrets('task-001', 'claude_code');

    expect(secrets).toHaveProperty('ANTHROPIC_API_KEY');
    expect(secrets).toHaveProperty('GITHUB_TOKEN');
    expect(secrets).toHaveProperty('FLEET_TASK_ID');
    // Should NOT contain other agent type secrets
    expect(secrets).not.toHaveProperty('OPENAI_API_KEY');
    expect(secrets).not.toHaveProperty('GOOGLE_AI_API_KEY');
  });

  it('returns only codex-scoped secrets for codex agents', async () => {
    const secrets = await provider.getSecrets('task-002', 'codex');

    expect(secrets).toHaveProperty('OPENAI_API_KEY');
    expect(secrets).toHaveProperty('GITHUB_TOKEN');
    expect(secrets).toHaveProperty('FLEET_TASK_ID');
    expect(secrets).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(secrets).not.toHaveProperty('GOOGLE_AI_API_KEY');
  });

  it('returns only gemini-scoped secrets for gemini agents', async () => {
    const secrets = await provider.getSecrets('task-003', 'gemini');

    expect(secrets).toHaveProperty('GOOGLE_AI_API_KEY');
    expect(secrets).toHaveProperty('GITHUB_TOKEN');
    expect(secrets).toHaveProperty('FLEET_TASK_ID');
    expect(secrets).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(secrets).not.toHaveProperty('OPENAI_API_KEY');
  });

  it('omits secrets that are not available in the backing store', async () => {
    const sparseDeps = makeDeps({
      getSecret: vi.fn().mockImplementation(async (key: string) => {
        if (key === 'GITHUB_TOKEN') return 'ghp_123';
        return undefined; // Everything else unavailable
      }),
    });
    const sparseProvider = new DefaultAgentSecretProvider(sparseDeps);

    const secrets = await sparseProvider.getSecrets('task-001', 'claude_code');

    expect(secrets).toHaveProperty('GITHUB_TOKEN', 'ghp_123');
    expect(secrets).not.toHaveProperty('ANTHROPIC_API_KEY');
    expect(secrets).not.toHaveProperty('FLEET_TASK_ID');
  });

  it('calls getSecret for each key in the agent scope', async () => {
    await provider.getSecrets('task-001', 'claude_code');

    const getSecret = deps.getSecret as ReturnType<typeof vi.fn>;
    expect(getSecret).toHaveBeenCalledWith('ANTHROPIC_API_KEY');
    expect(getSecret).toHaveBeenCalledWith('GITHUB_TOKEN');
    expect(getSecret).toHaveBeenCalledWith('FLEET_TASK_ID');
    expect(getSecret).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Cleanup Timing
// ---------------------------------------------------------------------------

describe('DefaultAgentSecretProvider — cleanup()', () => {
  let deps: SecretProviderDeps;
  let provider: DefaultAgentSecretProvider;

  beforeEach(() => {
    deps = makeDeps();
    provider = new DefaultAgentSecretProvider(deps);
  });

  it('schedules automatic cleanup with default 5s delay', async () => {
    await provider.getSecrets('task-001', 'claude_code');

    const setTimeoutMock = deps.setTimeout as ReturnType<typeof vi.fn>;
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('schedules automatic cleanup with custom delay', async () => {
    const customDeps = makeDeps({ cleanupDelayMs: 3000 });
    const customProvider = new DefaultAgentSecretProvider(customDeps);

    await customProvider.getSecrets('task-001', 'claude_code');

    const setTimeoutMock = customDeps.setTimeout as ReturnType<typeof vi.fn>;
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 3000);
  });

  it('explicit cleanup cancels pending auto-cleanup timer', async () => {
    // Use real-ish setTimeout mock that returns a recognizable timer
    const timers: Array<ReturnType<typeof globalThis.setTimeout>> = [];
    const customDeps = makeDeps({
      setTimeout: vi.fn().mockImplementation((fn: () => void, ms: number) => {
        const id = 999 as unknown as ReturnType<typeof globalThis.setTimeout>;
        timers.push(id);
        return id;
      }),
    });
    const customProvider = new DefaultAgentSecretProvider(customDeps);

    await customProvider.getSecrets('task-001', 'claude_code');

    // Explicit cleanup should work without errors
    await customProvider.cleanup('task-001');

    // The audit log should show the cleanup
    const auditLog = customProvider.getAuditLog();
    const entry = auditLog.find((e) => e.taskId === 'task-001');
    expect(entry).toBeDefined();
    expect(entry!.cleanedUpAt).toBeDefined();
  });

  it('marks audit entry as cleaned up on explicit cleanup', async () => {
    await provider.getSecrets('task-001', 'claude_code');
    await provider.cleanup('task-001');

    const auditLog = provider.getAuditLog();
    const entry = auditLog.find((e) => e.taskId === 'task-001');
    expect(entry).toBeDefined();
    expect(entry!.cleanedUpAt).toBeDefined();
    expect(entry!.cleanedUpAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles cleanup for unknown task gracefully', async () => {
    // Should not throw for a task that was never issued secrets
    await expect(provider.cleanup('unknown-task')).resolves.toBeUndefined();
  });

  it('triggers scheduled cleanup callback', async () => {
    let capturedFn: (() => void) | null = null;
    const customDeps = makeDeps({
      setTimeout: vi.fn().mockImplementation((fn: () => void, _ms: number) => {
        capturedFn = fn;
        return 42 as unknown as ReturnType<typeof globalThis.setTimeout>;
      }),
    });
    const customProvider = new DefaultAgentSecretProvider(customDeps);

    await customProvider.getSecrets('task-001', 'claude_code');
    expect(capturedFn).not.toBeNull();

    // Simulate timer firing
    capturedFn!();

    // Wait a tick for the async cleanup to process
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const log = customDeps.log as ReturnType<typeof vi.fn>;
    const cleanupLog = (log.mock.calls as unknown[][]).find(
      (c) =>
        c[0] === 'info' && (c[1] as Record<string, unknown>).event === 'secrets_cleaned_up',
    );
    expect(cleanupLog).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Audit Logging
// ---------------------------------------------------------------------------

describe('DefaultAgentSecretProvider — audit logging', () => {
  let deps: SecretProviderDeps;
  let provider: DefaultAgentSecretProvider;

  beforeEach(() => {
    deps = makeDeps();
    provider = new DefaultAgentSecretProvider(deps);
  });

  it('logs each secret issuance with task ID, scope, and key names', async () => {
    await provider.getSecrets('task-001', 'claude_code');

    const log = deps.log as ReturnType<typeof vi.fn>;
    const issuanceLog = (log.mock.calls as unknown[][]).find(
      (c) =>
        c[0] === 'info' && (c[1] as Record<string, unknown>).event === 'secrets_issued',
    );
    expect(issuanceLog).toBeDefined();
    expect(issuanceLog![1]).toMatchObject({
      event: 'secrets_issued',
      taskId: 'task-001',
      scope: 'claude_code',
      keyCount: 3,
      keys: ['ANTHROPIC_API_KEY', 'GITHUB_TOKEN', 'FLEET_TASK_ID'],
    });
  });

  it('logs cleanup events', async () => {
    await provider.getSecrets('task-001', 'claude_code');
    await provider.cleanup('task-001');

    const log = deps.log as ReturnType<typeof vi.fn>;
    const cleanupLog = (log.mock.calls as unknown[][]).find(
      (c) =>
        c[0] === 'info' && (c[1] as Record<string, unknown>).event === 'secrets_cleaned_up',
    );
    expect(cleanupLog).toBeDefined();
    expect(cleanupLog![1]).toMatchObject({
      event: 'secrets_cleaned_up',
      taskId: 'task-001',
    });
  });

  it('records audit trail with timestamps', async () => {
    await provider.getSecrets('task-001', 'claude_code');

    const auditLog = provider.getAuditLog();
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0].taskId).toBe('task-001');
    expect(auditLog[0].scope).toBe('claude_code');
    expect(auditLog[0].issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(auditLog[0].cleanedUpAt).toBeUndefined();
  });

  it('records multiple issuances in audit trail', async () => {
    await provider.getSecrets('task-001', 'claude_code');
    await provider.getSecrets('task-002', 'codex');
    await provider.getSecrets('task-003', 'gemini');

    const auditLog = provider.getAuditLog();
    expect(auditLog).toHaveLength(3);
    expect(auditLog[0].scope).toBe('claude_code');
    expect(auditLog[1].scope).toBe('codex');
    expect(auditLog[2].scope).toBe('gemini');
  });

  it('audit entry records keys issued (not values)', async () => {
    await provider.getSecrets('task-001', 'claude_code');

    const auditLog = provider.getAuditLog();
    // Keys should be listed, but values should NOT be in the audit entry
    expect(auditLog[0].keysIssued).toContain('ANTHROPIC_API_KEY');
    expect(auditLog[0].keysIssued).toContain('GITHUB_TOKEN');
    // Verify the entry structure doesn't contain actual secret values
    const serialized = JSON.stringify(auditLog[0]);
    expect(serialized).not.toContain('sk-ant-test-123');
    expect(serialized).not.toContain('ghp_testtoken123');
  });

  it('works without a logger (no-op)', async () => {
    const silentDeps = makeDeps({ log: undefined });
    const silentProvider = new DefaultAgentSecretProvider(silentDeps);

    // Should not throw when log is undefined
    await expect(
      silentProvider.getSecrets('task-001', 'claude_code'),
    ).resolves.toBeDefined();
    await expect(
      silentProvider.cleanup('task-001'),
    ).resolves.toBeUndefined();
  });
});
