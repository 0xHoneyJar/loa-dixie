/**
 * Economic Boundary evaluation for conviction-gated wallets.
 *
 * Maps Dixie's ConvictionTier model to Hounfour's EconomicBoundary evaluation
 * engine. Each conviction tier implies a trust profile (blended_score +
 * reputation_state) that feeds into the economic boundary decision.
 *
 * Tier → Trust mapping follows Ostrom's graduated sanctions: higher conviction
 * tiers imply greater demonstrated commitment to the commons.
 *
 * See: SDD §4.3 (Conviction Tier Resolver), Hounfour v7.9.0 FR-1
 * @since Sprint 3 — Economic Boundary Integration
 */
import { evaluateEconomicBoundary } from '@0xhoneyjar/loa-hounfour';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
  EconomicBoundaryEvaluationResult,
} from '@0xhoneyjar/loa-hounfour/economy';
import type { ConvictionTier } from '../types/conviction.js';

/**
 * Trust profile derived from a conviction tier.
 * Maps the 5-tier conviction model to Hounfour's 4-state reputation model.
 */
interface TierTrustProfile {
  readonly blended_score: number;
  readonly reputation_state: 'cold' | 'warming' | 'established' | 'authoritative';
}

/**
 * Conviction tier → trust profile mapping.
 *
 * - observer:    No stake → cold start, zero trust score
 * - participant: Minimal stake → warming, low trust
 * - builder:     Moderate stake → established, mid trust
 * - architect:   High stake → established, high trust
 * - sovereign:   Maximum stake → authoritative, full trust
 */
const TIER_TRUST_PROFILES: Record<ConvictionTier, TierTrustProfile> = {
  observer:    { blended_score: 0.0, reputation_state: 'cold' },
  participant: { blended_score: 0.2, reputation_state: 'warming' },
  builder:     { blended_score: 0.5, reputation_state: 'established' },
  architect:   { blended_score: 0.8, reputation_state: 'established' },
  sovereign:   { blended_score: 1.0, reputation_state: 'authoritative' },
} as const;

/** Default qualification criteria for conviction-based boundary evaluation. */
const DEFAULT_CRITERIA: QualificationCriteria = {
  min_trust_score: 0.3,
  min_reputation_state: 'warming',
  min_available_budget: '0',
} as const;

/**
 * Evaluate economic boundary for a wallet based on their conviction tier.
 *
 * Translates Dixie's conviction tier into Hounfour's trust/capital snapshot
 * model and runs the economic boundary evaluation engine.
 *
 * @param wallet - Wallet address (used as boundary_id for traceability)
 * @param tier - Resolved conviction tier for the wallet
 * @param budgetRemainingMicroUsd - Remaining budget in micro-USD string format
 * @param criteria - Optional override for qualification criteria
 * @returns EconomicBoundaryEvaluationResult with access decision, denial codes, and gap info
 */
export function evaluateEconomicBoundaryForWallet(
  wallet: string,
  tier: ConvictionTier,
  budgetRemainingMicroUsd: number | string = '0',
  criteria: QualificationCriteria = DEFAULT_CRITERIA,
): EconomicBoundaryEvaluationResult {
  const profile = TIER_TRUST_PROFILES[tier];

  // Compute timestamp once to avoid multiple Date constructions in hot path (Bridge iter2-medium-6)
  const now = new Date();
  const nowIso = now.toISOString();

  const trustSnapshot: TrustLayerSnapshot = {
    reputation_state: profile.reputation_state,
    blended_score: profile.blended_score,
    snapshot_at: nowIso,
  };

  const capitalSnapshot: CapitalLayerSnapshot = {
    budget_remaining: String(budgetRemainingMicroUsd),
    billing_tier: tier,
    budget_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  return evaluateEconomicBoundary(
    trustSnapshot,
    capitalSnapshot,
    criteria,
    nowIso,
    `wallet:${wallet}`,
  );
}

/**
 * Get the trust profile for a conviction tier.
 * Exposed for testing and composability.
 */
export function getTierTrustProfile(tier: ConvictionTier): TierTrustProfile {
  return TIER_TRUST_PROFILES[tier];
}

/**
 * Build a structured 403 denial response body for conviction tier failures.
 *
 * Includes denial_codes and evaluation_gap from the economic boundary
 * evaluation so that clients can programmatically understand what is
 * needed to qualify. Implements "denial as feedback, not death" (v7.9.1 Q4).
 *
 * @param actualTier - The wallet's resolved conviction tier
 * @param requiredTier - The minimum tier required for this endpoint
 * @param message - Human-readable denial message
 * @returns Structured denial response body for HTTP 403
 */
export function buildConvictionDenialResponse(
  actualTier: ConvictionTier,
  requiredTier: ConvictionTier,
  message: string,
): {
  error: string;
  message: string;
  actual_tier: ConvictionTier;
  required_tier: ConvictionTier;
  denial_codes: string[];
  evaluation_gap: { trust_score_gap?: number; reputation_state_gap?: number };
} {
  const actualProfile = TIER_TRUST_PROFILES[actualTier];
  const requiredProfile = TIER_TRUST_PROFILES[requiredTier];

  const denialCodes: string[] = [];
  const evaluationGap: { trust_score_gap?: number; reputation_state_gap?: number } = {};

  if (actualProfile.blended_score < requiredProfile.blended_score) {
    denialCodes.push('TRUST_SCORE_BELOW_THRESHOLD');
    evaluationGap.trust_score_gap = requiredProfile.blended_score - actualProfile.blended_score;
  }

  const stateOrder = ['cold', 'warming', 'established', 'authoritative'] as const;
  const actualIdx = stateOrder.indexOf(actualProfile.reputation_state);
  const requiredIdx = stateOrder.indexOf(requiredProfile.reputation_state);
  if (actualIdx < requiredIdx) {
    denialCodes.push('TRUST_STATE_BELOW_THRESHOLD');
    evaluationGap.reputation_state_gap = requiredIdx - actualIdx;
  }

  return {
    error: 'forbidden',
    message,
    actual_tier: actualTier,
    required_tier: requiredTier,
    denial_codes: denialCodes,
    evaluation_gap: evaluationGap,
  };
}

export { TIER_TRUST_PROFILES, DEFAULT_CRITERIA };
export type { TierTrustProfile };
