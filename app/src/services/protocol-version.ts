/**
 * Protocol Versioning — DynamicContract definition and middleware.
 *
 * Defines the Dixie BFF protocol surface per conviction tier and provides
 * Hono middleware that advertises the protocol version via response header.
 *
 * The DynamicContract maps ReputationState → ProtocolSurface, defining
 * which schemas, capabilities, and rate limit tiers are available at
 * each reputation level. This implements monotonic expansion: higher
 * reputation states always have equal or greater capabilities.
 *
 * @since cycle-007 — Sprint 76, Task S4-T4
 */
import type { DynamicContract } from '@0xhoneyjar/loa-hounfour/commons';
import type { Context, Next } from 'hono';

/** Dixie protocol version — tracks hounfour contract version. */
export const DIXIE_PROTOCOL_VERSION = '8.2.0';

/**
 * Dixie BFF DynamicContract — maps reputation state to protocol surface.
 *
 * Monotonic expansion: cold ⊂ warming ⊂ established ⊂ authoritative
 * Each higher tier adds capabilities without removing any from lower tiers.
 *
 * @since cycle-007 — Sprint 76, Task S4-T4
 */
export const DIXIE_CONTRACT: DynamicContract = {
  contract_id: '00000000-0000-4000-a000-000000000001',
  contract_version: DIXIE_PROTOCOL_VERSION,
  created_at: '2026-02-25T00:00:00Z',
  surfaces: {
    cold: {
      schemas: ['ReputationAggregate', 'ReputationEvent'],
      capabilities: ['inference'],
      rate_limit_tier: 'restricted',
    },
    warming: {
      schemas: ['ReputationAggregate', 'ReputationEvent', 'TaskTypeCohort', 'ScoringPathLog'],
      capabilities: ['inference', 'tools'],
      rate_limit_tier: 'standard',
    },
    established: {
      schemas: [
        'ReputationAggregate', 'ReputationEvent', 'TaskTypeCohort',
        'ScoringPathLog', 'DynamicContract', 'GovernanceMutation',
      ],
      capabilities: ['inference', 'tools', 'ensemble'],
      rate_limit_tier: 'extended',
    },
    authoritative: {
      schemas: [
        'ReputationAggregate', 'ReputationEvent', 'TaskTypeCohort',
        'ScoringPathLog', 'DynamicContract', 'GovernanceMutation',
        'AuditTrail', 'GovernedReputation',
      ],
      capabilities: ['inference', 'tools', 'ensemble', 'governance', 'byok'],
      rate_limit_tier: 'unlimited',
    },
  },
};

/**
 * Hono middleware that adds X-Protocol-Version header to all responses.
 *
 * Also reads the client's X-Protocol-Version request header and stores
 * it in the Hono context for downstream handlers.
 *
 * @returns Hono middleware function
 * @since cycle-007 — Sprint 76, Task S4-T4
 */
export function protocolVersionMiddleware() {
  return async (c: Context, next: Next): Promise<void> => {
    // Read client protocol version if provided
    const clientVersion = c.req.header('X-Protocol-Version');
    if (clientVersion) {
      c.set('clientProtocolVersion', clientVersion);
    }

    await next();

    // Always advertise server protocol version
    c.header('X-Protocol-Version', DIXIE_PROTOCOL_VERSION);
  };
}
