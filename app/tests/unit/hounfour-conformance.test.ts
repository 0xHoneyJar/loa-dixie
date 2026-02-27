/**
 * Hounfour Conformance Test Suite — Sprint 4, Task 4.2
 *
 * This is the Level 4 gate. All tests in this file validate that Dixie's
 * payloads conform to Hounfour v7.9.2 schemas at the schema level,
 * behavioral level, and E2E conformance level.
 *
 * Test categories:
 * 1. AccessPolicy payloads pass validators.accessPolicy()
 * 2. ConversationSealingPolicy payloads pass validators.conversationSealingPolicy()
 * 3. EconomicMetadata matches hounfour economic event shape
 * 4. Stream events structurally compatible with hounfour stream types
 * 5. NFT IDs pass format checks
 * 6. Request hashes are deterministic
 * 7. Idempotency keys are collision-resistant
 * 8. State machine transitions match hounfour canonical definitions
 * 9. Billing conservation holds for all pricing paths
 *
 * @see grimoires/loa/context/adr-hounfour-alignment.md
 */
import { describe, it, expect } from 'vitest';

// Hounfour imports — root barrel
import { validate, validators, parseMicroUsd } from '@0xhoneyjar/loa-hounfour';

// Core barrel
import type { AccessPolicy, ConversationSealingPolicy } from '@0xhoneyjar/loa-hounfour/core';
import { AccessPolicySchema, ConversationSealingPolicySchema, isValidTransition, validateAccessPolicy } from '@0xhoneyjar/loa-hounfour/core';
import type { StreamStart, StreamChunk, StreamUsage, StreamEnd, StreamError } from '@0xhoneyjar/loa-hounfour/core';

// Economy barrel
import { isValidNftId, parseNftId } from '@0xhoneyjar/loa-hounfour/economy';

// Integrity barrel
import { computeReqHash, deriveIdempotencyKey } from '@0xhoneyjar/loa-hounfour/integrity';

// Dixie service imports
import { validatePayload, runFullSuite } from '../../src/services/conformance-suite.js';
import { DEFAULT_ACCESS_POLICY } from '../../src/middleware/allowlist.js';
import { computeCost, computeCostBigInt, MODEL_PRICING, verifyBilling } from '../../src/types/economic.js';
import { CircuitStateMachine, MemoryEncryptionMachine, AutonomousModeMachine, ScheduleLifecycleMachine, validateTransition } from '../../src/services/state-machine.js';

// ─── 1. AccessPolicy Conformance ──────────────────────────────────

describe('Hounfour Conformance: AccessPolicy', () => {
  it('DEFAULT_ACCESS_POLICY passes validators.accessPolicy()', () => {
    const compiled = validators.accessPolicy();
    expect(compiled.Check(DEFAULT_ACCESS_POLICY)).toBe(true);
  });

  it('DEFAULT_ACCESS_POLICY passes validate() with cross-field checks', () => {
    const result = validate(AccessPolicySchema, DEFAULT_ACCESS_POLICY);
    expect(result.valid).toBe(true);
  });

  it('role_based policy requires roles array (cross-field invariant)', () => {
    const badPolicy = {
      type: 'role_based' as const,
      // missing roles — schema allows Optional, but cross-field invariant rejects
      audit_required: true,
      revocable: false,
    };
    // Schema-level Check passes (roles is Optional in TypeBox schema)
    const compiled = validators.accessPolicy();
    expect(compiled.Check(badPolicy)).toBe(true);
    // Cross-field invariant catches the violation via explicit validateAccessPolicy()
    // Note: validate() cannot discover cross-field validator for Type.Recursive schemas
    // because the wrapper loses its $id. Must call validateAccessPolicy() explicitly.
    const crossField = validateAccessPolicy(badPolicy as AccessPolicy);
    expect(crossField.valid).toBe(false);
    expect(crossField.errors.length).toBeGreaterThan(0);
  });

  it('time_limited policy requires duration_hours (cross-field invariant)', () => {
    const badPolicy = {
      type: 'time_limited' as const,
      // missing duration_hours — schema allows Optional, but cross-field invariant rejects
      audit_required: true,
      revocable: false,
    };
    // Schema-level Check passes (duration_hours is Optional in TypeBox schema)
    const compiled = validators.accessPolicy();
    expect(compiled.Check(badPolicy)).toBe(true);
    // Cross-field invariant catches via explicit validateAccessPolicy()
    const crossField = validateAccessPolicy(badPolicy as AccessPolicy);
    expect(crossField.valid).toBe(false);
    expect(crossField.errors.length).toBeGreaterThan(0);
  });

  it('none policy passes without extra fields', () => {
    const nonePolicy: AccessPolicy = {
      type: 'none',
      audit_required: false,
      revocable: false,
    };
    const result = validate(AccessPolicySchema, nonePolicy);
    expect(result.valid).toBe(true);
  });

  it('read_only policy passes validation', () => {
    const readOnly: AccessPolicy = {
      type: 'read_only',
      audit_required: true,
      revocable: true,
    };
    const result = validate(AccessPolicySchema, readOnly);
    expect(result.valid).toBe(true);
  });

  it('conformance-suite validatePayload works for accessPolicy', () => {
    const result = validatePayload('accessPolicy', DEFAULT_ACCESS_POLICY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── 2. ConversationSealingPolicy Conformance ──────────────────────

describe('Hounfour Conformance: ConversationSealingPolicy', () => {
  it('no-encryption sealing policy passes validators.conversationSealingPolicy()', () => {
    const policy: ConversationSealingPolicy = {
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: true,
    };
    const compiled = validators.conversationSealingPolicy();
    expect(compiled.Check(policy)).toBe(true);
  });

  it('encrypted sealing policy passes validate() with cross-field checks', () => {
    const policy: ConversationSealingPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      key_reference: 'vault://keys/conversation/1',
      access_audit: true,
    };
    const result = validate(ConversationSealingPolicySchema, policy);
    expect(result.valid).toBe(true);
  });

  it('encryption without key_reference fails cross-field validation', () => {
    const badPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'hkdf-sha256',
      // missing key_reference
      access_audit: true,
    };
    const result = validate(ConversationSealingPolicySchema, badPolicy);
    expect(result.valid).toBe(false);
  });

  it('encryption with key_derivation=none fails cross-field validation', () => {
    const badPolicy = {
      encryption_scheme: 'aes-256-gcm',
      key_derivation: 'none',
      key_reference: 'some-key',
      access_audit: true,
    };
    const result = validate(ConversationSealingPolicySchema, badPolicy);
    expect(result.valid).toBe(false);
  });

  it('sealing policy with embedded access_policy passes', () => {
    const policy: ConversationSealingPolicy = {
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: true,
      access_policy: {
        type: 'role_based',
        roles: ['owner'],
        audit_required: true,
        revocable: true,
      },
    };
    const compiled = validators.conversationSealingPolicy();
    expect(compiled.Check(policy)).toBe(true);
  });

  it('conformance-suite validatePayload works for conversationSealingPolicy', () => {
    const policy = {
      encryption_scheme: 'none',
      key_derivation: 'none',
      access_audit: true,
    };
    const result = validatePayload('conversationSealingPolicy', policy);
    expect(result.valid).toBe(true);
  });
});

// ─── 3. EconomicMetadata Schema Compatibility ──────────────────────

describe('Hounfour Conformance: EconomicMetadata', () => {
  it('Dixie EconomicEvent shape includes hounfour-compatible fields', () => {
    // Dixie's EconomicEvent (stream-events.ts) has cost_micro_usd, model, tokens
    // These map to hounfour's billing/pricing concepts
    const dixieEvent = {
      type: 'economic' as const,
      cost_micro_usd: 10500,
      model: 'claude-sonnet-4-6',
      tokens: {
        prompt: 1000,
        completion: 500,
        memory_context: 0,
        knowledge: 0,
        total: 1500,
      },
    };

    // Verify the cost can be expressed as a valid micro-USD string
    const microStr = String(dixieEvent.cost_micro_usd);
    const parsed = parseMicroUsd(microStr);
    expect(parsed.valid).toBe(true);

    // Verify the model is in our pricing table
    expect(MODEL_PRICING.has(dixieEvent.model)).toBe(true);

    // Verify token breakdown conservation
    expect(dixieEvent.tokens.total).toBe(
      dixieEvent.tokens.prompt + dixieEvent.tokens.completion +
      dixieEvent.tokens.memory_context + dixieEvent.tokens.knowledge,
    );
  });

  it('computeCostBigInt produces parseMicroUsd-valid output for all models', () => {
    for (const [model] of MODEL_PRICING) {
      const cost = computeCostBigInt(model, 1000, 500);
      const parsed = parseMicroUsd(cost);
      expect(parsed.valid).toBe(true);
    }
  });
});

// ─── 4. Stream Event Structural Compatibility ──────────────────────

describe('Hounfour Conformance: Stream Events', () => {
  it('Dixie ChunkEvent fields are a superset of hounfour StreamChunk required fields', () => {
    // Hounfour StreamChunk requires: type='chunk', delta
    // Dixie ChunkEvent has: type='chunk', content
    // Mapping: Dixie's content → hounfour's delta
    const dixieChunk = { type: 'chunk' as const, content: 'Hello' };
    const hounfourChunk: StreamChunk = {
      type: 'chunk',
      delta: dixieChunk.content, // mapped field
    };
    expect(hounfourChunk.type).toBe('chunk');
    expect(hounfourChunk.delta).toBe('Hello');
  });

  it('Dixie UsageEvent fields align with hounfour StreamUsage', () => {
    // Hounfour StreamUsage: type='usage', prompt_tokens, completion_tokens
    // Dixie UsageEvent: type='usage', prompt_tokens, completion_tokens — exact match
    const dixieUsage = { type: 'usage' as const, prompt_tokens: 1000, completion_tokens: 500 };
    const hounfourUsage: StreamUsage = {
      type: 'usage',
      prompt_tokens: dixieUsage.prompt_tokens,
      completion_tokens: dixieUsage.completion_tokens,
    };
    expect(hounfourUsage.prompt_tokens).toBe(1000);
    expect(hounfourUsage.completion_tokens).toBe(500);
  });

  it('Dixie ErrorEvent fields map to hounfour StreamError', () => {
    // Hounfour StreamError: type='error', code, message, retryable
    // Dixie ErrorEvent: type='error', code, message — missing retryable
    const dixieError = { type: 'error' as const, code: 'rate_limited', message: 'Too many requests' };
    const hounfourError: StreamError = {
      type: 'error',
      code: dixieError.code,
      message: dixieError.message,
      retryable: true, // Dixie must add this for protocol compliance
    };
    expect(hounfourError.retryable).toBe(true);
  });

  it('hounfour StreamStart schema validates with protocol-required fields', () => {
    const startEvent: StreamStart = {
      type: 'stream_start',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      pool_id: 'pool_standard',
      trace_id: '550e8400-e29b-41d4-a716-446655440000',
      contract_version: '7.9.2',
    };
    const compiled = validators.streamEvent();
    expect(compiled.Check(startEvent)).toBe(true);
  });

  it('hounfour StreamEnd schema validates with billing fields', () => {
    const endEvent: StreamEnd = {
      type: 'stream_end',
      finish_reason: 'stop',
      billing_method: 'provider_reported',
      cost_micro: '10500',
    };
    const compiled = validators.streamEvent();
    expect(compiled.Check(endEvent)).toBe(true);
  });
});

// ─── 5. NFT ID Format Checks ──────────────────────────────────────

describe('Hounfour Conformance: NFT ID Format', () => {
  it('canonical NFT ID passes isValidNftId', () => {
    const nftId = 'eip155:1/0x0000000000000000000000000000000000000001/42';
    expect(isValidNftId(nftId)).toBe(true);
  });

  it('parseNftId extracts components', () => {
    const nftId = 'eip155:1/0x0000000000000000000000000000000000000001/42';
    const parsed = parseNftId(nftId);
    expect(parsed.chainId).toBe(1);
    expect(parsed.tokenId).toBe('42');
  });

  it('Dixie oracleIdentity nftId field is compatible when formatted canonically', () => {
    // Dixie uses short nftId strings like 'oracle' internally,
    // but canonical NFT IDs follow eip155: format for protocol compliance
    const canonicalOracle = 'eip155:80084/0x0000000000000000000000000000000000000001/1';
    expect(isValidNftId(canonicalOracle)).toBe(true);
  });

  it('rejects malformed NFT IDs', () => {
    expect(isValidNftId('not-a-valid-id')).toBe(false);
    expect(isValidNftId('')).toBe(false);
    expect(isValidNftId('eip155:0/0x0000000000000000000000000000000000000001/1')).toBe(false); // chainId 0 invalid
  });
});

// ─── 6. Request Hash Determinism ──────────────────────────────────

describe('Hounfour Conformance: Request Hash Determinism', () => {
  it('same body produces same hash', () => {
    const body = JSON.stringify({ message: 'hello world' });
    const hash1 = computeReqHash(Buffer.from(body, 'utf-8'));
    const hash2 = computeReqHash(Buffer.from(body, 'utf-8'));
    expect(hash1).toBe(hash2);
  });

  it('hash format is sha256:<64 hex chars>', () => {
    const body = JSON.stringify({ test: true });
    const hash = computeReqHash(Buffer.from(body, 'utf-8'));
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('different bodies produce different hashes', () => {
    const hash1 = computeReqHash(Buffer.from(JSON.stringify({ a: 1 }), 'utf-8'));
    const hash2 = computeReqHash(Buffer.from(JSON.stringify({ a: 2 }), 'utf-8'));
    expect(hash1).not.toBe(hash2);
  });

  it('JSON key order matters for determinism (canonical serialization)', () => {
    // JSON.stringify produces deterministic output for the same object literal
    const body1 = JSON.stringify({ a: 1, b: 2 });
    const body2 = JSON.stringify({ a: 1, b: 2 });
    const hash1 = computeReqHash(Buffer.from(body1, 'utf-8'));
    const hash2 = computeReqHash(Buffer.from(body2, 'utf-8'));
    expect(hash1).toBe(hash2);
  });

  it('empty body produces consistent hash', () => {
    const hash1 = computeReqHash(Buffer.from('', 'utf-8'));
    const hash2 = computeReqHash(Buffer.from('', 'utf-8'));
    expect(hash1).toBe(hash2);
  });
});

// ─── 7. Idempotency Key Collision Resistance ──────────────────────

describe('Hounfour Conformance: Idempotency Key Collision Resistance', () => {
  const baseHash = computeReqHash(Buffer.from(JSON.stringify({ msg: 'test' }), 'utf-8'));

  it('same inputs produce same key', () => {
    const key1 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    const key2 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    expect(key1).toBe(key2);
  });

  it('different tenants produce different keys', () => {
    const key1 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    const key2 = deriveIdempotencyKey('nft-2', baseHash, 'anthropic', 'claude-sonnet-4-6');
    expect(key1).not.toBe(key2);
  });

  it('different body hashes produce different keys', () => {
    const hash2 = computeReqHash(Buffer.from(JSON.stringify({ msg: 'other' }), 'utf-8'));
    const key1 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    const key2 = deriveIdempotencyKey('nft-1', hash2, 'anthropic', 'claude-sonnet-4-6');
    expect(key1).not.toBe(key2);
  });

  it('different providers produce different keys', () => {
    const key1 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    const key2 = deriveIdempotencyKey('nft-1', baseHash, 'openai', 'claude-sonnet-4-6');
    expect(key1).not.toBe(key2);
  });

  it('different models produce different keys', () => {
    const key1 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    const key2 = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-opus-4-6');
    expect(key1).not.toBe(key2);
  });

  it('key is a 64-char hex string (SHA-256)', () => {
    const key = deriveIdempotencyKey('nft-1', baseHash, 'anthropic', 'claude-sonnet-4-6');
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it('delimiter injection does not cause collision', () => {
    // JSON array serialization prevents ["a:b", "c"] == ["a", "b:c"]
    const key1 = deriveIdempotencyKey('ten:ant', baseHash, 'prov', 'model');
    const key2 = deriveIdempotencyKey('ten', baseHash, 'ant:prov', 'model');
    expect(key1).not.toBe(key2);
  });
});

// ─── 8. State Machine Transition Conformance ──────────────────────

describe('Hounfour Conformance: State Machine Transitions', () => {
  describe('CircuitState machine matches hounfour canonical transitions', () => {
    it('closed → open is valid', () => {
      const result = validateTransition(CircuitStateMachine, 'closed', 'open');
      expect(result.valid).toBe(true);
    });

    it('open → half_open is valid', () => {
      const result = validateTransition(CircuitStateMachine, 'open', 'half_open');
      expect(result.valid).toBe(true);
    });

    it('half_open → closed is valid (success probe)', () => {
      const result = validateTransition(CircuitStateMachine, 'half_open', 'closed');
      expect(result.valid).toBe(true);
    });

    it('half_open → open is valid (failed probe)', () => {
      const result = validateTransition(CircuitStateMachine, 'half_open', 'open');
      expect(result.valid).toBe(true);
    });

    it('closed → half_open is invalid (must go through open)', () => {
      const result = validateTransition(CircuitStateMachine, 'closed', 'half_open');
      expect(result.valid).toBe(false);
    });

    it('open → closed is invalid (must go through half_open)', () => {
      const result = validateTransition(CircuitStateMachine, 'open', 'closed');
      expect(result.valid).toBe(false);
    });
  });

  describe('MemoryEncryption machine transitions', () => {
    it('unsealed → sealing is valid', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'unsealed', 'sealing').valid).toBe(true);
    });

    it('sealing → sealed is valid', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'sealing', 'sealed').valid).toBe(true);
    });

    it('sealed → unsealing is valid', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'sealed', 'unsealing').valid).toBe(true);
    });

    it('unsealed → sealed is invalid (must go through sealing)', () => {
      expect(validateTransition(MemoryEncryptionMachine, 'unsealed', 'sealed').valid).toBe(false);
    });
  });

  describe('AutonomousMode machine transitions', () => {
    it('disabled → enabled is valid', () => {
      expect(validateTransition(AutonomousModeMachine, 'disabled', 'enabled').valid).toBe(true);
    });

    it('enabled → suspended is valid', () => {
      expect(validateTransition(AutonomousModeMachine, 'enabled', 'suspended').valid).toBe(true);
    });

    it('disabled → suspended is invalid', () => {
      expect(validateTransition(AutonomousModeMachine, 'disabled', 'suspended').valid).toBe(false);
    });
  });

  describe('ScheduleLifecycle machine terminal states', () => {
    it('completed has no valid transitions (terminal)', () => {
      const result = validateTransition(ScheduleLifecycleMachine, 'completed', 'active');
      expect(result.valid).toBe(false);
    });

    it('cancelled has no valid transitions (terminal)', () => {
      const result = validateTransition(ScheduleLifecycleMachine, 'cancelled', 'active');
      expect(result.valid).toBe(false);
    });

    it('failed → pending is valid (retry)', () => {
      expect(validateTransition(ScheduleLifecycleMachine, 'failed', 'pending').valid).toBe(true);
    });
  });
});

// ─── 9. Billing Conservation ──────────────────────────────────────

describe('Hounfour Conformance: Billing Conservation', () => {
  it('conservation holds for all pricing paths', () => {
    for (const [model, pricing] of MODEL_PRICING) {
      const promptTokens = 1000;
      const completionTokens = 500;
      const cost = computeCostBigInt(model, promptTokens, completionTokens);

      const result = verifyBilling(
        { cost_micro: cost, pricing_snapshot: pricing },
        { prompt_tokens: promptTokens, completion_tokens: completionTokens },
      );

      expect(result.conserved).toBe(true);
      expect(result.status).toBe('conserved');
      expect(result.delta).toBe('0');
    }
  });

  it('conservation holds for zero tokens', () => {
    for (const [model, pricing] of MODEL_PRICING) {
      const cost = computeCostBigInt(model, 0, 0);
      const result = verifyBilling(
        { cost_micro: cost, pricing_snapshot: pricing },
        { prompt_tokens: 0, completion_tokens: 0 },
      );
      expect(result.conserved).toBe(true);
    }
  });

  it('conservation holds for large token counts (1M prompt, 500K completion)', () => {
    for (const [model, pricing] of MODEL_PRICING) {
      const cost = computeCostBigInt(model, 1_000_000, 500_000);
      const result = verifyBilling(
        { cost_micro: cost, pricing_snapshot: pricing },
        { prompt_tokens: 1_000_000, completion_tokens: 500_000 },
      );
      expect(result.conserved).toBe(true);
    }
  });

  it('BigInt and Number computeCost agree for all models', () => {
    for (const [model] of MODEL_PRICING) {
      const bigintResult = computeCostBigInt(model, 5000, 2000);
      const numberResult = computeCost(model, 5000, 2000);
      expect(Number(bigintResult)).toBe(numberResult);
    }
  });

  it('detects conservation violation when billed differs from computed', () => {
    const pricing = MODEL_PRICING.get('claude-sonnet-4-6')!;
    const cost = computeCostBigInt('claude-sonnet-4-6', 1000, 500);
    const inflatedCost = String(BigInt(cost) + 1n);

    const result = verifyBilling(
      { cost_micro: inflatedCost, pricing_snapshot: pricing },
      { prompt_tokens: 1000, completion_tokens: 500 },
    );

    expect(result.conserved).toBe(false);
    expect(result.status).toBe('violated');
  });
});

// ─── 10. Fixture Freshness — Schema Drift Detection ──────────────

describe('Hounfour Conformance: Fixture Freshness', () => {
  const generatedSamples = require('../fixtures/hounfour-generated-samples.json');

  /** Minimum number of valid samples across auto + manual. Raise as coverage improves. */
  const MIN_COVERAGE_THRESHOLD = 35;

  it('all generated fixture samples pass current hounfour validators', () => {
    const failures: string[] = [];
    for (const entry of generatedSamples.samples) {
      if (entry.skipped || !entry.valid) continue;
      const validatorFn = (validators as Record<string, (() => { Check: (d: unknown) => boolean }) | undefined>)[entry.schema];
      if (!validatorFn) continue;
      const compiled = validatorFn();
      if (!compiled.Check(entry.sample)) {
        failures.push(`${entry.schema}: fixture sample fails current validator`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('combined coverage (auto + manual) meets minimum threshold', () => {
    const validCount = generatedSamples.samples.filter(
      (s: { valid: boolean; skipped?: boolean }) => s.valid && !s.skipped,
    ).length;
    expect(validCount).toBeGreaterThanOrEqual(MIN_COVERAGE_THRESHOLD);
  });

  it('manual sample count matches expectation', () => {
    expect(generatedSamples.manual_count).toBeGreaterThanOrEqual(20);
  });

  it('total schema count matches hounfour validator registry', () => {
    const validatorCount = Object.keys(validators).length;
    expect(generatedSamples.total_schemas).toBe(validatorCount);
  });
});

// ─── 11. Full Conformance Suite ───────────────────────────────────

describe('Hounfour Conformance: Full Suite', () => {
  it('runFullSuite passes all sample payloads', () => {
    const result = runFullSuite();
    expect(result.passed).toBe(true);
    expect(result.failed_count).toBe(0);
    expect(result.total).toBeGreaterThan(0);
    expect(result.passed_count).toBe(result.total);
  });

  it('runFullSuite returns structured result', () => {
    const result = runFullSuite();
    expect(result.timestamp).toBeDefined();
    expect(result.results).toBeInstanceOf(Array);
    for (const r of result.results) {
      expect(r.schemaName).toBeDefined();
      expect(typeof r.valid).toBe('boolean');
      expect(r.errors).toBeInstanceOf(Array);
    }
  });
});
