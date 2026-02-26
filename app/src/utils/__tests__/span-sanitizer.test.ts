/**
 * Span Sanitizer Tests — Allowlist enforcement, hash determinism, PII protection.
 *
 * @since cycle-014 Sprint 2 — Task T2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashForSpan, sanitizeAttributes, startSanitizedSpan } from '../span-sanitizer.js';

// ---------------------------------------------------------------------------
// hashForSpan
// ---------------------------------------------------------------------------

describe('hashForSpan', () => {
  it('returns a 12-character hex string', () => {
    const result = hashForSpan('0xDeAdBeEf123456');
    expect(result).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic — same input yields same hash', () => {
    const a = hashForSpan('0xABC');
    const b = hashForSpan('0xABC');
    expect(a).toBe(b);
  });

  it('different inputs produce different hashes', () => {
    const a = hashForSpan('wallet-A');
    const b = hashForSpan('wallet-B');
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// sanitizeAttributes
// ---------------------------------------------------------------------------

describe('sanitizeAttributes', () => {
  it('filters attributes to the allowlist for dixie.request', () => {
    const result = sanitizeAttributes('dixie.request', {
      method: 'GET',
      url: '/api/health',
      status_code: 200,
      duration_ms: 42,
      secret_header: 'should-be-stripped',
      wallet: '0xDeAdBeEf',
    });

    expect(result).toEqual({
      method: 'GET',
      url: '/api/health',
      status_code: 200,
      duration_ms: 42,
    });
    expect(result).not.toHaveProperty('secret_header');
    expect(result).not.toHaveProperty('wallet');
  });

  it('hashes wallet → wallet_hash for dixie.auth', () => {
    const result = sanitizeAttributes('dixie.auth', {
      auth_type: 'jwt',
      wallet: '0xDeAdBeEf123456',
      tier: 'gold',
    });

    expect(result).toEqual({
      auth_type: 'jwt',
      wallet_hash: hashForSpan('0xDeAdBeEf123456'),
      tier: 'gold',
    });
    // No raw wallet in output
    expect(result).not.toHaveProperty('wallet');
  });

  it('hashes identity → identity_hash for dixie.fleet.spawn', () => {
    const result = sanitizeAttributes('dixie.fleet.spawn', {
      task_type: 'code-review',
      cost: 100,
      identity: '0xOperator123',
    });

    expect(result).toEqual({
      task_type: 'code-review',
      cost: 100,
      identity_hash: hashForSpan('0xOperator123'),
    });
    expect(result).not.toHaveProperty('identity');
  });

  it('hashes operator_id → identity_hash for dixie.fleet.spawn', () => {
    const result = sanitizeAttributes('dixie.fleet.spawn', {
      task_type: 'audit',
      cost: 50,
      operator_id: '0xOperator456',
    });

    expect(result).toEqual({
      task_type: 'audit',
      cost: 50,
      identity_hash: hashForSpan('0xOperator456'),
    });
  });

  it('returns empty object for unknown span types', () => {
    const result = sanitizeAttributes('unknown.span', {
      secret: 'should-not-appear',
      wallet: '0xDeAdBeEf',
    });

    expect(result).toEqual({});
  });

  it('handles all 6 span types', () => {
    const spanTypes = [
      'dixie.request',
      'dixie.auth',
      'dixie.finn.inference',
      'dixie.reputation.update',
      'dixie.fleet.spawn',
      'dixie.governance.check',
    ];

    for (const spanType of spanTypes) {
      const result = sanitizeAttributes(spanType, { method: 'GET' });
      expect(typeof result).toBe('object');
    }
  });

  it('does not include undefined values', () => {
    const result = sanitizeAttributes('dixie.request', {
      method: 'GET',
      url: undefined,
      status_code: 200,
    });

    expect(result).toEqual({
      method: 'GET',
      status_code: 200,
    });
  });

  it('no raw wallet/identity values in any span type output', () => {
    const rawValues = ['0xDeAdBeEf', 'vitalik.eth', '0x1234567890abcdef'];

    for (const rawValue of rawValues) {
      const result = sanitizeAttributes('dixie.auth', {
        wallet: rawValue,
        auth_type: 'jwt',
        tier: 'silver',
      });

      const allValues = Object.values(result);
      expect(allValues).not.toContain(rawValue);
    }
  });

  it('dixie.finn.inference allowlist', () => {
    const result = sanitizeAttributes('dixie.finn.inference', {
      model: 'gpt-4',
      tokens: 1500,
      latency_ms: 230,
      circuit_state: 'open',
      api_key: 'sk-secret',
    });

    expect(result).toEqual({
      model: 'gpt-4',
      tokens: 1500,
      latency_ms: 230,
      circuit_state: 'open',
    });
    expect(result).not.toHaveProperty('api_key');
  });

  it('dixie.reputation.update allowlist', () => {
    const result = sanitizeAttributes('dixie.reputation.update', {
      model_id: 'gpt-4',
      score: 0.85,
      ema_value: 0.72,
      nft_id: 'should-strip',
    });

    expect(result).toEqual({
      model_id: 'gpt-4',
      score: 0.85,
      ema_value: 0.72,
    });
  });

  it('dixie.governance.check allowlist', () => {
    const result = sanitizeAttributes('dixie.governance.check', {
      resource_type: 'fleet_task',
      decision: 'denied',
      witness_count: 3,
      denial_reason: 'tier_limit_exceeded',
      operator_wallet: '0xShouldStrip',
    });

    expect(result).toEqual({
      resource_type: 'fleet_task',
      decision: 'denied',
      witness_count: 3,
      denial_reason: 'tier_limit_exceeded',
    });
  });
});

// ---------------------------------------------------------------------------
// startSanitizedSpan
// ---------------------------------------------------------------------------

describe('startSanitizedSpan', () => {
  it('returns the value from the wrapped function', async () => {
    const result = await startSanitizedSpan('dixie.request', { method: 'GET' }, async () => {
      return 'hello';
    });

    expect(result).toBe('hello');
  });

  it('propagates errors from the wrapped function', async () => {
    await expect(
      startSanitizedSpan('dixie.auth', { auth_type: 'jwt' }, async () => {
        throw new Error('auth failed');
      }),
    ).rejects.toThrow('auth failed');
  });

  it('works with unknown span types (no-op attributes)', async () => {
    const result = await startSanitizedSpan('unknown.type', { secret: 'value' }, async () => {
      return 42;
    });

    expect(result).toBe(42);
  });
});
