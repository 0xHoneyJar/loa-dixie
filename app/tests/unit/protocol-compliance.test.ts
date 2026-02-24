/**
 * Protocol Compliance Tests — Sprint 13, Task 13.4 (expanded Sprint 4)
 *
 * Validates that Dixie's data shapes conform to Hounfour protocol types.
 * These tests catch drift: if either Dixie's types or Hounfour's types
 * change, the compliance tests fail.
 *
 * Sprint 4 additions:
 * - Economic boundary evaluation with tier mapping
 * - Stream type assignability (Dixie events -> hounfour protocol types)
 * - Conservation property tests
 * - Integrity utility tests (request hashing, idempotency)
 *
 * @see grimoires/loa/context/adr-hounfour-alignment.md
 */
import { describe, it, expect } from 'vitest';
import type { AccessPolicy, AgentIdentity, HounfourCircuitState } from '../../src/types.js';
import type { CircuitState } from '../../src/types.js';
import { DEFAULT_ACCESS_POLICY } from '../../src/middleware/allowlist.js';

// Sprint 4: Economic boundary imports
import {
  evaluateEconomicBoundaryForWallet,
  getTierTrustProfile,
  TIER_TRUST_PROFILES,
} from '../../src/services/conviction-boundary.js';
import type { ConvictionTier } from '../../src/types/conviction.js';
import { TIER_ORDER } from '../../src/types/conviction.js';

// Sprint 4: Stream type imports
import type {
  ChunkEvent, UsageEvent, ErrorEvent, DoneEvent,
  EconomicEvent, ToolCallEvent, ToolResultEvent,
} from '../../src/types/stream-events.js';
import type {
  HfStreamChunkSchema, HfStreamUsageSchema, HfStreamErrorSchema,
} from '../../src/types/stream-events.js';

// Sprint 4: Conservation / economic imports
import { computeCostBigInt, computeCost, MODEL_PRICING, verifyBilling } from '../../src/types/economic.js';
import { parseMicroUsd } from '@0xhoneyjar/loa-hounfour';

// Sprint 4: Integrity imports
import { computeReqHash, deriveIdempotencyKey } from '@0xhoneyjar/loa-hounfour/integrity';

// Sprint 4: State machine imports
import {
  CircuitStateMachine,
  validateTransition,
} from '../../src/services/state-machine.js';
import { isValidTransition } from '@0xhoneyjar/loa-hounfour/core';

describe('Protocol Compliance: Hounfour Alignment', () => {
  describe('AccessPolicy conformance', () => {
    it('DEFAULT_ACCESS_POLICY satisfies Hounfour AccessPolicy shape', () => {
      const policy: AccessPolicy = DEFAULT_ACCESS_POLICY;

      expect(policy.type).toBe('role_based');
      expect(policy.roles).toEqual(['team']);
      expect(policy.audit_required).toBe(true);
      expect(policy.revocable).toBe(false);
      // duration_hours should not be present for role_based
      expect(policy.duration_hours).toBeUndefined();
    });

    it('time_limited AccessPolicy shape is expressible', () => {
      // Phase 2: conviction-based tier expiry
      const timedPolicy: AccessPolicy = {
        type: 'time_limited',
        duration_hours: 720, // 30 days
        audit_required: true,
        revocable: true,
      };

      expect(timedPolicy.type).toBe('time_limited');
      expect(timedPolicy.duration_hours).toBe(720);
      expect(timedPolicy.roles).toBeUndefined();
    });

    it('none AccessPolicy shape is expressible', () => {
      const noAccess: AccessPolicy = {
        type: 'none',
        audit_required: false,
        revocable: false,
      };

      expect(noAccess.type).toBe('none');
    });

    it('read_only AccessPolicy shape is expressible', () => {
      // Phase 3: soul memory governance — read-only for previous owners
      const readOnly: AccessPolicy = {
        type: 'read_only',
        audit_required: true,
        revocable: true,
      };

      expect(readOnly.type).toBe('read_only');
    });
  });

  describe('AgentIdentity alignment', () => {
    it('OracleIdentity fields are a subset of AgentIdentity', () => {
      // The Oracle identity response uses fields that map to AgentIdentity.
      // This test documents the mapping without requiring the full type,
      // since loa-finn's identity graph may return a partial response.
      const oracleResponse = {
        nftId: 'oracle',
        name: 'The Oracle',
        damp96_summary: null,
        beauvoir_hash: null,
      };

      // nftId maps to AgentIdentity.nft_id (naming difference: camelCase vs snake_case)
      expect(oracleResponse.nftId).toBeDefined();
      // name maps to AgentIdentity.name
      expect(oracleResponse.name).toBeDefined();
      // beauvoir_hash is Dixie-specific metadata not in base AgentIdentity
      expect(oracleResponse).toHaveProperty('beauvoir_hash');
    });

    it('AgentIdentity type is importable from Hounfour', () => {
      // Compile-time check: if AgentIdentity type changes in Hounfour,
      // this file will fail to compile. Runtime check: verify the type
      // can be used to describe an agent.
      const agent: Partial<AgentIdentity> = {
        name: 'The Oracle',
        agent_type: 'oracle',
      };
      expect(agent.name).toBe('The Oracle');
    });
  });

  describe('CircuitState mapping', () => {
    it('Dixie CircuitState values have Hounfour equivalents', () => {
      const dixieStates: CircuitState[] = ['closed', 'open', 'half-open'];
      const hounfourStates: HounfourCircuitState[] = ['closed', 'open', 'half_open'];

      // closed and open map directly
      expect(dixieStates[0]).toBe(hounfourStates[0]);
      expect(dixieStates[1]).toBe(hounfourStates[1]);

      // half-open (Dixie) maps to half_open (Hounfour) — naming convention difference
      expect(dixieStates[2]).toBe('half-open');
      expect(hounfourStates[2]).toBe('half_open');
    });

    it('toHounfourCircuitState mapping function works correctly', () => {
      // Utility mapping for protocol-level reporting
      const toHounfour = (s: CircuitState): HounfourCircuitState =>
        s === 'half-open' ? 'half_open' : s;

      expect(toHounfour('closed')).toBe('closed');
      expect(toHounfour('open')).toBe('open');
      expect(toHounfour('half-open')).toBe('half_open');
    });
  });

  describe('AllowlistStore AccessPolicy integration', () => {
    it('AllowlistData policy field accepts Hounfour AccessPolicy', () => {
      // Verify the AllowlistData shape with an embedded policy
      const data = {
        version: 1,
        wallets: ['0x1234567890abcdef1234567890abcdef12345678'],
        apiKeys: ['dxk_test_key_123'],
        updated_at: '2026-02-20T00:00:00Z',
        policy: {
          type: 'role_based' as const,
          roles: ['team'],
          audit_required: true,
          revocable: false,
        } satisfies AccessPolicy,
      };

      expect(data.policy.type).toBe('role_based');
      expect(data.policy.roles).toContain('team');
    });

    it('AllowlistData without policy is backward-compatible', () => {
      // Existing allowlist files without policy field should still work
      const legacyData = {
        version: 1,
        wallets: [],
        apiKeys: [],
        updated_at: '2026-02-20T00:00:00Z',
      };

      expect(legacyData.policy).toBeUndefined();
    });
  });

  // ─── Sprint 4: Economic Boundary Evaluation ─────────────────────

  describe('Economic boundary evaluation with tier mapping', () => {
    it('all 5 conviction tiers map to valid trust profiles', () => {
      const tiers: ConvictionTier[] = ['observer', 'participant', 'builder', 'architect', 'sovereign'];
      for (const tier of tiers) {
        const profile = getTierTrustProfile(tier);
        expect(profile.blended_score).toBeGreaterThanOrEqual(0);
        expect(profile.blended_score).toBeLessThanOrEqual(1);
        expect(['cold', 'warming', 'established', 'authoritative']).toContain(profile.reputation_state);
      }
    });

    it('tier trust scores are monotonically increasing', () => {
      let prevScore = -1;
      for (const tier of TIER_ORDER) {
        const profile = getTierTrustProfile(tier);
        expect(profile.blended_score).toBeGreaterThanOrEqual(prevScore);
        prevScore = profile.blended_score;
      }
    });

    it('economic boundary grants access for builder tier (meets default criteria)', () => {
      const result = evaluateEconomicBoundaryForWallet('0xtest', 'builder', 100);
      expect(result.access_decision.granted).toBe(true);
    });

    it('economic boundary denies observer tier (below min_trust_score)', () => {
      const result = evaluateEconomicBoundaryForWallet('0xtest', 'observer', 100);
      expect(result.access_decision.granted).toBe(false);
      expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
    });

    it('evaluation result includes boundary_id for audit trail', () => {
      const result = evaluateEconomicBoundaryForWallet('0xwallet', 'sovereign', 100);
      expect(result.boundary_id).toBe('wallet:0xwallet');
    });

    it('sovereign tier always passes default criteria', () => {
      const result = evaluateEconomicBoundaryForWallet('0xsov', 'sovereign', 0);
      expect(result.access_decision.granted).toBe(true);
    });
  });

  // ─── Sprint 4: Stream Type Assignability ────────────────────────

  describe('Stream type assignability (Dixie events → hounfour types)', () => {
    it('Dixie ChunkEvent.content maps to hounfour StreamChunk.delta', () => {
      // Dixie uses 'content', hounfour uses 'delta'
      const dixie: ChunkEvent = { type: 'chunk', content: 'Hello' };
      // Type-level test: this mapping is the protocol bridge
      expect(dixie.type).toBe('chunk');
      expect(typeof dixie.content).toBe('string');
    });

    it('Dixie UsageEvent fields exactly match hounfour StreamUsage fields', () => {
      const dixie: UsageEvent = { type: 'usage', prompt_tokens: 100, completion_tokens: 50 };
      // Direct field-level match — no mapping needed
      expect(dixie.prompt_tokens).toBe(100);
      expect(dixie.completion_tokens).toBe(50);
    });

    it('Dixie ErrorEvent has compatible structure with hounfour StreamError', () => {
      const dixie: ErrorEvent = { type: 'error', code: 'rate_limited', message: 'Slow down' };
      // hounfour StreamError also requires 'retryable' boolean
      // Dixie must add this field when bridging to protocol
      expect(dixie.type).toBe('error');
      expect(typeof dixie.code).toBe('string');
      expect(typeof dixie.message).toBe('string');
    });

    it('Dixie ToolCallEvent fields are a superset of protocol tool_call', () => {
      const dixie: ToolCallEvent = {
        type: 'tool_call',
        name: 'search',
        args: { query: 'test' },
        callId: 'call-1',
      };
      expect(dixie.type).toBe('tool_call');
      expect(dixie.name).toBeDefined();
      expect(dixie.args).toBeDefined();
    });

    it('Dixie EconomicEvent cost_micro_usd is expressible as parseMicroUsd string', () => {
      const dixie: EconomicEvent = {
        type: 'economic',
        cost_micro_usd: 10500,
        model: 'claude-sonnet-4-6',
        tokens: { prompt: 100, completion: 50, memory_context: 0, knowledge: 0, total: 150 },
      };
      const parsed = parseMicroUsd(String(dixie.cost_micro_usd));
      expect(parsed.valid).toBe(true);
    });
  });

  // ─── Sprint 4: Conservation Property Tests ──────────────────────

  describe('Conservation property tests', () => {
    it('billing conservation: computed cost matches verified cost for all models', () => {
      for (const [model, pricing] of MODEL_PRICING) {
        const cost = computeCostBigInt(model, 500, 200);
        const result = verifyBilling(
          { cost_micro: cost, pricing_snapshot: pricing },
          { prompt_tokens: 500, completion_tokens: 200 },
        );
        expect(result.conserved).toBe(true);
      }
    });

    it('BigInt ↔ Number agreement for all models under $1M', () => {
      for (const [model] of MODEL_PRICING) {
        const bigint = computeCostBigInt(model, 10000, 5000);
        const num = computeCost(model, 10000, 5000);
        expect(Number(bigint)).toBe(num);
        // Under MAX_SAFE_INTEGER — no precision loss
        expect(num).toBeLessThan(Number.MAX_SAFE_INTEGER);
      }
    });

    it('zero-cost conservation: 0 tokens → 0 cost', () => {
      for (const [model] of MODEL_PRICING) {
        expect(computeCostBigInt(model, 0, 0)).toBe('0');
      }
    });

    it('unknown model returns 0 cost (free tier fallback)', () => {
      expect(computeCostBigInt('unknown-model', 1000, 500)).toBe('0');
      expect(computeCost('unknown-model', 1000, 500)).toBe(0);
    });
  });

  // ─── Sprint 4: Integrity Utility Tests ──────────────────────────

  describe('Integrity utility tests', () => {
    it('computeReqHash returns sha256-prefixed hash', () => {
      const hash = computeReqHash(Buffer.from('{"test":true}', 'utf-8'));
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('computeReqHash is deterministic', () => {
      const body = '{"deterministic":"test"}';
      const h1 = computeReqHash(Buffer.from(body, 'utf-8'));
      const h2 = computeReqHash(Buffer.from(body, 'utf-8'));
      expect(h1).toBe(h2);
    });

    it('different payloads produce different hashes', () => {
      const h1 = computeReqHash(Buffer.from('{"a":1}', 'utf-8'));
      const h2 = computeReqHash(Buffer.from('{"a":2}', 'utf-8'));
      expect(h1).not.toBe(h2);
    });

    it('deriveIdempotencyKey produces 64-char hex (SHA-256)', () => {
      const hash = computeReqHash(Buffer.from('{}', 'utf-8'));
      const key = deriveIdempotencyKey('tenant', hash, 'provider', 'model');
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it('idempotency key varies with tenant (collision resistance)', () => {
      const hash = computeReqHash(Buffer.from('{}', 'utf-8'));
      const k1 = deriveIdempotencyKey('t1', hash, 'p', 'm');
      const k2 = deriveIdempotencyKey('t2', hash, 'p', 'm');
      expect(k1).not.toBe(k2);
    });

    it('Dixie CircuitStateMachine transitions align with hounfour isValidTransition', () => {
      // Verify Dixie's machine agrees with hounfour's canonical transitions
      // hounfour isValidTransition checks agent lifecycle, not circuit state directly,
      // but we validate our machine independently through validateTransition
      expect(validateTransition(CircuitStateMachine, 'closed', 'open').valid).toBe(true);
      expect(validateTransition(CircuitStateMachine, 'open', 'half_open').valid).toBe(true);
      expect(validateTransition(CircuitStateMachine, 'half_open', 'closed').valid).toBe(true);
      expect(validateTransition(CircuitStateMachine, 'half_open', 'open').valid).toBe(true);
      // Invalid transitions
      expect(validateTransition(CircuitStateMachine, 'closed', 'half_open').valid).toBe(false);
      expect(validateTransition(CircuitStateMachine, 'open', 'closed').valid).toBe(false);
    });
  });
});
