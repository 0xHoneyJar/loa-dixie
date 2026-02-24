// Sprint-organized test file. When sprint structure stabilizes, consider
// consolidating into domain-organized files (e.g., wallet.test.ts,
// agent-validation.test.ts) for cross-sprint coverage of the same domain.
/**
 * Input Validation & Coverage Test Suite — Sprint 56 (Global)
 *
 * Covers:
 * - Task 2.1: Agent route input validation (query length, maxTokens, sessionId, knowledgeDomain)
 * - Task 2.2: Rate limit cleanup optimization (interval-based, eviction metrics)
 * - Task 2.3: Protocol evolution edge cases (tested in protocol-evolution.test.ts)
 * - Task 2.4: Wallet normalization consistency
 * - Task 2.5: This test file
 *
 * @since Sprint 56 — Input Validation & Test Coverage Gaps
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createAgentRoutes } from '../../src/routes/agent.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { ConvictionResolver } from '../../src/services/conviction-resolver.js';
import { isValidPathParam } from '../../src/validation.js';
import { normalizeWallet } from '../../src/utils/normalize-wallet.js';

// ─── Shared Agent Route Test Helpers ─────────────────────────────────

function mockFinnClient(): FinnClient {
  return {
    request: vi.fn().mockResolvedValue({
      response: 'The Oracle speaks.',
      model: 'claude-opus-4-6',
      input_tokens: 100,
      output_tokens: 200,
      sources: [],
    }),
  } as unknown as FinnClient;
}

function mockConvictionResolver(): ConvictionResolver {
  return {
    resolve: vi.fn().mockResolvedValue({
      tier: 'architect',
      bgtStaked: 1000,
      capabilities: ['query', 'memory', 'agent_api'],
      modelPool: ['claude-opus-4-6', 'claude-sonnet-4-6'],
      source: 'freeside',
    }),
  } as unknown as ConvictionResolver;
}

function createApp(finnClient?: FinnClient, convictionResolver?: ConvictionResolver) {
  const app = new Hono();
  app.route('/api/agent', createAgentRoutes({
    finnClient: finnClient ?? mockFinnClient(),
    convictionResolver: convictionResolver ?? mockConvictionResolver(),
    memoryStore: null,
  }));
  return app;
}

function agentHeaders(extra?: Record<string, string>) {
  return {
    'Content-Type': 'application/json',
    'x-agent-tba': '0xTBA001',
    'x-agent-owner': '0xOwner',
    ...extra,
  };
}

// ─── Task 2.1: Agent Route Input Validation ──────────────────────────

describe('Task 2.1: Agent route input validation', () => {
  it('rejects query exceeding 10000 characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'x'.repeat(10_001) }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_request');
    expect(body.message).toContain('10000');
  });

  it('allows query at exactly 10000 characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'x'.repeat(10_000) }),
    });
    // Should pass validation — may succeed or fail downstream, but not 400 for length
    expect(res.status).not.toBe(400);
  });

  it('rejects maxTokens of 0', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', maxTokens: 0 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('maxTokens');
  });

  it('rejects maxTokens exceeding 4096', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', maxTokens: 4097 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('maxTokens');
  });

  it('rejects non-integer maxTokens', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', maxTokens: 1.5 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('maxTokens');
  });

  it('allows valid maxTokens within range', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', maxTokens: 2048 }),
    });
    expect(res.status).not.toBe(400);
  });

  it('rejects sessionId with path traversal characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', sessionId: '../../../etc/passwd' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('sessionId');
  });

  it('rejects sessionId with special characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', sessionId: 'ses<script>alert(1)</script>' }),
    });
    expect(res.status).toBe(400);
  });

  it('allows valid sessionId format', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', sessionId: 'session-abc-123' }),
    });
    expect(res.status).not.toBe(400);
  });

  it('rejects knowledgeDomain exceeding 100 characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', knowledgeDomain: 'a'.repeat(101) }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('knowledgeDomain');
  });

  it('allows knowledgeDomain at exactly 100 characters', async () => {
    const app = createApp();
    const res = await app.request('/api/agent/query', {
      method: 'POST',
      headers: agentHeaders(),
      body: JSON.stringify({ query: 'test', knowledgeDomain: 'a'.repeat(100) }),
    });
    expect(res.status).not.toBe(400);
  });
});

// ─── Task 2.2: isValidPathParam Unit Tests ───────────────────────────

describe('Task 2.2: isValidPathParam validation', () => {
  it('accepts alphanumeric with hyphens and underscores', () => {
    expect(isValidPathParam('session-abc_123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidPathParam('')).toBe(false);
  });

  it('rejects path traversal (../)', () => {
    expect(isValidPathParam('../etc/passwd')).toBe(false);
  });

  it('rejects slashes', () => {
    expect(isValidPathParam('foo/bar')).toBe(false);
  });

  it('rejects strings exceeding 128 characters', () => {
    expect(isValidPathParam('a'.repeat(129))).toBe(false);
  });

  it('accepts string at exactly 128 characters', () => {
    expect(isValidPathParam('a'.repeat(128))).toBe(true);
  });

  it('rejects special characters', () => {
    expect(isValidPathParam('foo@bar')).toBe(false);
    expect(isValidPathParam('foo bar')).toBe(false);
    expect(isValidPathParam('<script>')).toBe(false);
  });
});

// ─── Task 2.4: Wallet Normalization ──────────────────────────────────

describe('Task 2.4: Wallet normalization', () => {
  it('normalizes lowercase address to checksum format', () => {
    const lower = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
    const result = normalizeWallet(lower);
    // EIP-55 checksum should produce mixed-case
    expect(result).not.toBe(lower);
    expect(result.toLowerCase()).toBe(lower.toLowerCase());
  });

  it('normalizes uppercase address to checksum format', () => {
    const upper = '0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045';
    const result = normalizeWallet(upper);
    expect(result.toLowerCase()).toBe(upper.toLowerCase());
  });

  it('produces consistent output for same address in different cases', () => {
    const lower = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
    const upper = '0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045';
    const mixed = '0xd8dA6BF26964aF9D7EeD9e03E53415D37aA96045';
    expect(normalizeWallet(lower)).toBe(normalizeWallet(upper));
    expect(normalizeWallet(lower)).toBe(normalizeWallet(mixed));
  });

  it('is idempotent — normalizing twice yields same result', () => {
    const addr = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
    const first = normalizeWallet(addr);
    const second = normalizeWallet(first);
    expect(first).toBe(second);
  });

  it('falls back to lowercase for non-standard addresses', () => {
    // Short addresses that are not valid EIP-55 — should not throw
    const short = '0xABC123';
    expect(normalizeWallet(short)).toBe('0xabc123');
  });
});
