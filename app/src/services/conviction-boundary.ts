/**
 * Economic Boundary evaluation for conviction-gated wallets.
 *
 * Maps Dixie's ConvictionTier model to Hounfour's EconomicBoundary evaluation
 * engine. Each conviction tier implies a trust profile (blended_score +
 * reputation_state) that feeds into the economic boundary decision.
 *
 * Sprint 6 adds reputation blending: when a ReputationAggregate exists for a
 * wallet, the personal score is blended with the tier-based collection prior
 * using Bayesian inference. When no aggregate exists (cold start), falls back
 * to the existing tier-based score.
 *
 * Tier → Trust mapping follows Ostrom's graduated sanctions: higher conviction
 * tiers imply greater demonstrated commitment to the commons.
 *
 * See: SDD §4.3 (Conviction Tier Resolver), Hounfour v7.9.0 FR-1
 * @since Sprint 3 — Economic Boundary Integration
 * @since Sprint 6 — Reputation blending in conviction boundary evaluation
 */
import { evaluateEconomicBoundary } from '@0xhoneyjar/loa-hounfour';
import { computeBlendedScore } from '@0xhoneyjar/loa-hounfour/governance';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
  EconomicBoundaryEvaluationResult,
} from '@0xhoneyjar/loa-hounfour/economy';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { ConstraintOrigin } from '@0xhoneyjar/loa-hounfour/constraints';
import type { ConvictionTier } from '../types/conviction.js';
import type { TaskType, ScoringPathLog } from '../types/reputation-evolution.js';
import type { DixieReputationAggregate } from '../types/reputation-evolution.js';
import type { ScoringPathTracker } from './scoring-path-tracker.js';

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
 * Default budget period in days — matches monthly billing cycle.
 *
 * This determines the `budget_period_end` timestamp in the CapitalLayerSnapshot
 * passed to Hounfour's evaluateEconomicBoundary. A 30-day period aligns with
 * the standard monthly billing cycle used by most cloud/SaaS providers.
 *
 * Override via:
 * - `budgetPeriodDays` parameter on `evaluateEconomicBoundaryForWallet()`
 * - `DIXIE_BUDGET_PERIOD_DAYS` environment variable (global default)
 *
 * @since Sprint 5 — LOW-4 (Bridge iter1 deferred finding)
 */
export const DEFAULT_BUDGET_PERIOD_DAYS = 30;

/**
 * Resolve the effective budget period in days.
 * Priority: explicit parameter > env var > constant default.
 */
function resolveBudgetPeriodDays(override?: number): number {
  if (override !== undefined && override > 0) return override;
  const envVal = process.env.DIXIE_BUDGET_PERIOD_DAYS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_BUDGET_PERIOD_DAYS;
}

/**
 * Options for evaluateEconomicBoundaryForWallet.
 * @since Sprint 6 — Task 6.2
 */
export interface EconomicBoundaryOptions {
  /** Override qualification criteria. */
  criteria?: QualificationCriteria;
  /** Override budget period in days (default: 30). */
  budgetPeriodDays?: number;
  /**
   * When a ReputationAggregate exists for the wallet, the personal score
   * is Bayesian-blended with the tier-based collection prior. When absent
   * (cold start), falls back to the hardcoded tier score.
   *
   * Accepts both standard ReputationAggregate and DixieReputationAggregate
   * (which may include task_cohorts).
   *
   * @since Sprint 6 — Task 6.2
   * @since Sprint 10 — Task 10.4 (DixieReputationAggregate support)
   */
  reputationAggregate?: ReputationAggregate | DixieReputationAggregate | null;
  /**
   * When provided along with a DixieReputationAggregate that has task_cohorts,
   * the economic boundary evaluation will prefer task-specific reputation data
   * for the given task type. This enables more precise access decisions when
   * the request context includes a known task type.
   *
   * Scoring path priority:
   * 1. task_cohort — Task-specific cohort exists for this model + task type
   * 2. aggregate — Fall back to overall aggregate personal score
   * 3. tier_default — Fall back to static tier-based score (cold start)
   *
   * @since Sprint 10 — Task 10.4
   */
  taskType?: TaskType;
  /**
   * When provided, scoring path entries are recorded with hash chain integrity.
   * Each entry gets `entry_hash` (SHA-256 of canonical JSON) and `previous_hash`
   * (link to preceding entry). When absent, scoring paths are plain objects
   * without hash fields (backward compatible).
   *
   * @since cycle-005 — Sprint 61 (Hounfour v7.11.0 hash chain)
   */
  scoringPathTracker?: ScoringPathTracker;
}

/**
 * Evaluate economic boundary for a wallet based on their conviction tier.
 *
 * Translates Dixie's conviction tier into Hounfour's trust/capital snapshot
 * model and runs the economic boundary evaluation engine.
 *
 * When `opts.reputationAggregate` is provided and has a non-null personal_score,
 * the blended score is computed via Bayesian inference instead of using the
 * hardcoded tier score. This enables the trust snapshot to reflect actual
 * on-chain reputation data rather than static tier defaults.
 *
 * ## Social Contract: Enforcing the Conservation Invariants
 *
 * This function is the enforcement point for three conservation invariants
 * that constitute the economic social contract of the Dixie commons:
 *
 * **I-1: committed + reserved + available = limit**
 * "Community resources are finite and accounted for." The `budgetRemainingMicroUsd`
 * parameter represents the `available` portion of the wallet's budget. The
 * economic boundary decision engine verifies that this value is sufficient
 * before granting access. No wallet can consume more than the community has
 * allocated — this is the scarcity constraint that makes the commons viable.
 *
 * **I-2: SUM(lot_entries) per lot = original_micro**
 * "Every credit lot is fully consumed." When access is granted and a response
 * incurs cost, that cost flows through the billing pipeline where conservation
 * is verified by `verifyPricingConservation()`. No value is created or destroyed.
 *
 * **I-3: Redis.committed ~ Postgres.usage_events**
 * "Fast storage matches durable storage." The budget_remaining value fed to
 * this function may come from Redis (fast path) or Postgres (durable path).
 * The invariant that these eventually converge ensures that access decisions
 * made on the fast path are consistent with the durable record of truth.
 *
 * In Web4 terms: this function is the gatekeeper that translates conviction
 * (demonstrated commitment to the commons) into economic access (the right
 * to consume shared resources). The conservation invariants ensure that this
 * translation is honest — no wallet gets more than it has earned, and every
 * unit of consumed resource is accounted for.
 *
 * @param wallet - Wallet address (used as boundary_id for traceability)
 * @param tier - Resolved conviction tier for the wallet
 * @param budgetRemainingMicroUsd - Remaining budget in micro-USD string format
 * @param criteriaOrOpts - QualificationCriteria for backward compat, or EconomicBoundaryOptions
 * @param budgetPeriodDays - Optional budget period in days (deprecated: use opts)
 * @returns EconomicBoundaryEvaluationResult with access decision, denial codes, and gap info
 *
 * @since Sprint 3 — Economic Boundary Integration
 * @since Sprint 12 — Conservation invariant social contract framing (Task 12.6)
 */
export function evaluateEconomicBoundaryForWallet(
  wallet: string,
  tier: ConvictionTier,
  budgetRemainingMicroUsd: number | string = '0',
  criteriaOrOpts?: QualificationCriteria | EconomicBoundaryOptions,
  budgetPeriodDays?: number,
): EconomicBoundaryEvaluationResult {
  // Resolve overloaded parameter: if it has 'reputationAggregate' or 'criteria', it's opts
  let criteria: QualificationCriteria = DEFAULT_CRITERIA;
  let periodDaysOverride: number | undefined = budgetPeriodDays;
  let reputationAggregate: ReputationAggregate | null | undefined;

  if (criteriaOrOpts) {
    // Discriminate via negative check: QualificationCriteria always has
    // 'min_trust_score', so its absence definitively indicates
    // EconomicBoundaryOptions. This single check scales regardless of
    // how many fields are added to EconomicBoundaryOptions.
    // (Bridge iter1 LOW-2: replaces growing 5-field OR chain)
    if (!('min_trust_score' in criteriaOrOpts)) {
      // New: EconomicBoundaryOptions
      const opts = criteriaOrOpts as EconomicBoundaryOptions;
      criteria = opts.criteria ?? DEFAULT_CRITERIA;
      periodDaysOverride = opts.budgetPeriodDays ?? budgetPeriodDays;
      reputationAggregate = opts.reputationAggregate;
    } else {
      // Legacy: direct QualificationCriteria
      criteria = criteriaOrOpts as QualificationCriteria;
    }
  }

  const profile = TIER_TRUST_PROFILES[tier];
  const periodDays = resolveBudgetPeriodDays(periodDaysOverride);

  // Compute timestamp once to avoid multiple Date constructions in hot path (Bridge iter2-medium-6)
  const now = new Date();
  const nowIso = now.toISOString();

  // Sprint 6 — Task 6.2: Blend personal reputation with tier-based collection prior
  // when a reputation aggregate is available. Fall back to tier score otherwise.
  //
  // Sprint 10 — Task 10.4: When a taskType is provided and the aggregate has
  // task_cohorts matching that task type, use the task-specific score instead
  // of the aggregate score. This provides more precise access decisions when
  // the request context includes a known task type.
  // Resolve taskType and tracker from options (may be undefined even when opts is provided)
  const taskType = (criteriaOrOpts && 'taskType' in criteriaOrOpts)
    ? (criteriaOrOpts as EconomicBoundaryOptions).taskType
    : undefined;
  const tracker = (criteriaOrOpts && 'scoringPathTracker' in criteriaOrOpts)
    ? (criteriaOrOpts as EconomicBoundaryOptions).scoringPathTracker
    : undefined;

  let blendedScore = profile.blended_score;
  let reputationState = profile.reputation_state;
  // Governance origin tag for scoring path reasons (Sprint 64 — Q5 governance provenance)
  const weightsTag = `[weights: ${CONVICTION_ACCESS_MATRIX_ORIGIN.origin}]`;

  let scoringPathInput: Pick<ScoringPathLog, 'path' | 'model_id' | 'task_type' | 'reason'> = {
    path: 'tier_default',
    reason: `No reputation aggregate available; using static tier-based score ${weightsTag}`,
  };

  // cycle-007 — Sprint 73, Task S1-T5: Handle 'unspecified' TaskType explicitly.
  // When taskType is 'unspecified' or undefined, skip cohort lookup entirely
  // and route directly to aggregate-only scoring. The 'unspecified' literal
  // is the v8.2.0 explicit aggregate-only routing signal.
  const isUnspecifiedTask = taskType === undefined || taskType === 'unspecified';

  if (reputationAggregate) {
    // Sprint 10 — Task 10.4: Try task-specific cohort first
    const dixieAggregate = reputationAggregate as DixieReputationAggregate;
    const taskCohorts = dixieAggregate.task_cohorts;
    let usedTaskCohort = false;

    if (!isUnspecifiedTask && taskType && taskCohorts && taskCohorts.length > 0) {
      // Find cohorts matching the requested task type
      const matchingCohorts = taskCohorts.filter(c => c.task_type === taskType);
      if (matchingCohorts.length > 0) {
        // Use the first matching cohort with a non-null personal score.
        // When multiple models have task cohorts, the first match is used.
        // Future: could blend across models using computeTaskAwareCrossModelScore.
        const activeCohort = matchingCohorts.find(c => c.personal_score !== null);
        if (activeCohort && activeCohort.personal_score !== null) {
          blendedScore = computeBlendedScore(
            activeCohort.personal_score,
            profile.blended_score, // collection prior = tier-based score
            activeCohort.sample_count,
            reputationAggregate.pseudo_count,
          );
          reputationState = reputationAggregate.state;
          scoringPathInput = {
            path: 'task_cohort',
            model_id: activeCohort.model_id,
            task_type: taskType,
            reason: `Task-specific cohort found for ${activeCohort.model_id}:${taskType} ${weightsTag}`,
          };
          usedTaskCohort = true;
        }
      }
    }

    // Fall back to aggregate personal score if no task cohort was used
    if (!usedTaskCohort && reputationAggregate.personal_score !== null) {
      blendedScore = computeBlendedScore(
        reputationAggregate.personal_score,
        profile.blended_score, // collection prior = tier-based score
        reputationAggregate.sample_count,
        reputationAggregate.pseudo_count,
      );
      reputationState = reputationAggregate.state;
      // Differentiated reason messages for aggregate-only routing
      const aggregateReason = isUnspecifiedTask
        ? (taskType === 'unspecified'
          ? `Explicit 'unspecified' TaskType — aggregate-only routing (v8.2.0) ${weightsTag}`
          : `No task type provided — aggregate-only routing ${weightsTag}`)
        : `Using aggregate personal score (no task-specific cohort for '${taskType}') ${weightsTag}`;
      scoringPathInput = { path: 'aggregate', reason: aggregateReason };
    }
  }

  // Compute reputation freshness when aggregate is available (Sprint 63 — Q3 temporal blindness)
  const reputationFreshness = reputationAggregate
    ? { sample_count: reputationAggregate.sample_count, newest_event_at: reputationAggregate.last_updated }
    : undefined;

  // Record scoring path — with hash chain when tracker is provided, plain object otherwise
  const scoringPath: ScoringPathLog = tracker
    ? tracker.record(scoringPathInput, { reputation_freshness: reputationFreshness })
    : scoringPathInput;

  // Structured provenance log: what happened, with what data, and how fresh
  // (Sprint 63 — Task 4.4, Bridge deep review Q3)
  console.debug('[conviction-boundary] scoring_path:', JSON.stringify({
    ...scoringPath,
    wallet,
    tier,
    blending_used: !!reputationAggregate,
    reputation_freshness: reputationFreshness,
  }));

  const trustSnapshot: TrustLayerSnapshot = {
    reputation_state: reputationState,
    blended_score: blendedScore,
    snapshot_at: nowIso,
  };

  const capitalSnapshot: CapitalLayerSnapshot = {
    budget_remaining: String(budgetRemainingMicroUsd),
    billing_tier: tier,
    budget_period_end: new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
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

/**
 * ConvictionAccessMatrix — explicit mapping of which tiers can do what
 * across both the knowledge governance (voting) and economic boundary systems.
 *
 * ## Separation of Concerns
 *
 * Conviction tiers are a **shared input** used by two **independent systems**:
 *
 * 1. **Knowledge Governance (Voting)**: Determines a wallet's governance
 *    voice weight when prioritizing knowledge sources. Implemented in
 *    `knowledge-priority-store.ts` via TIER_WEIGHTS. Even 'observer' tier
 *    can submit a vote — it simply has weight 0, meaning it's recorded
 *    but doesn't influence aggregate scores. This is by design: participation
 *    in governance is universal (Ostrom Principle 3), but influence scales
 *    with conviction.
 *
 * 2. **Economic Boundary**: Determines whether a wallet qualifies for
 *    economic access (budgets, billing tiers). Implemented here via
 *    `evaluateEconomicBoundaryForWallet()`. Uses trust scores and reputation
 *    states that map from tiers. Default criteria require min_trust_score=0.3
 *    and min_reputation_state='warming', so only 'builder' and above pass.
 *
 * These produce **different outputs** from the **same input**: a wallet may
 * have enough conviction to vote (governance voice) but not enough to pass
 * the economic boundary (resource access). This is intentional — governance
 * participation should be more accessible than economic resource consumption.
 *
 * ## Three-Dimensional Permission Model
 *
 * Each conviction tier maps to three independent permission dimensions:
 *
 * 1. **Participation** (`can_vote`): Whether the tier holder may participate
 *    in governance at all. Currently universal — all tiers can vote. This
 *    dimension answers: "Can you be heard?"
 *
 * 2. **Influence** (`vote_weight`): How much weight the tier holder's
 *    governance voice carries. Ranges from 0 (observer — present but not
 *    influential) to 25 (sovereign — authoritative voice). This dimension
 *    answers: "How loud is your voice?"
 *
 * 3. **Access** (`passes_economic_boundary`): Whether the tier holder
 *    qualifies for economic resource consumption (model pools, billing
 *    tiers, budget allocation). This dimension answers: "Can you use
 *    the commons' resources?"
 *
 * The three dimensions are deliberately independent: an observer participates
 * (can_vote=true) with zero influence (vote_weight=0) and no access
 * (passes_economic_boundary=false). This is not a limitation — it is the
 * architecture of graduated inclusion.
 *
 * ## Ostrom's Principles in the Matrix
 *
 * **Principle 3 — Collective-Choice Arrangements**: "Most individuals
 * affected by the operational rules can participate in modifying the
 * operational rules." (Ostrom, *Governing the Commons*, 1990, p. 93)
 *
 * Implementation: `can_vote: true` for ALL tiers, including observer.
 * Even zero-weight participants are included in collective choice because
 * their participation signals emerging community interest, provides
 * transparency into governance activity, and creates a progression path
 * that incentivizes deeper commitment. Excluding observers from voting
 * would violate Principle 3 by denying affected individuals the right
 * to participate in rule modification.
 *
 * **Principle 5 — Graduated Sanctions**: "Appropriators who violate
 * operational rules are likely to be assessed graduated sanctions."
 * (Ostrom, *Governing the Commons*, 1990, p. 94)
 *
 * Implementation: The tier progression IS the graduated sanction/reward
 * system. Lower conviction (less BGT staked, lower reputation) results
 * in reduced influence and access — not binary exclusion. An observer
 * is not banned; they are graduated to minimal influence. A participant
 * who increases their stake graduates to builder-level access. The
 * sanctions are proportional, not punitive — mirroring Ostrom's finding
 * that successful commons governance uses graduated responses rather
 * than all-or-nothing enforcement.
 *
 * ## Hirschman's Exit, Voice, and Loyalty Mapping
 *
 * Albert O. Hirschman's *Exit, Voice, and Loyalty* (1970) describes
 * three responses to organizational decline:
 *
 * - **Exit**: Leave the organization (unstake BGT, abandon dNFT)
 * - **Voice**: Express dissatisfaction to change the organization (governance voting)
 * - **Loyalty**: Endure decline due to attachment (continued staking despite issues)
 *
 * The ConvictionAccessMatrix maps these concepts:
 *
 * | Hirschman Concept | Matrix Dimension | Implementation |
 * |-------------------|-----------------|----------------|
 * | Exit              | (external)      | Unstake BGT → tier drops → access reduced |
 * | Voice             | can_vote + vote_weight | Universal participation, graduated influence |
 * | Loyalty           | trust_score + reputation_state | Demonstrated commitment over time |
 *
 * The key design insight: **Voice is universal but graduated, not gated.**
 * Hirschman warned that organizations that suppress Voice force Exit.
 * By granting all tiers the right to vote (even at weight 0), the system
 * preserves Voice as an alternative to Exit, encouraging Loyalty through
 * the progression path from observer → sovereign.
 *
 * ## The Observer's Zero-Weight Vote
 *
 * Why does an observer (zero BGT stake, cold reputation) have `can_vote: true`
 * with `vote_weight: 0`? Three reasons:
 *
 * 1. **Transparency**: The observer can see governance activity and understand
 *    the system before committing resources. Voting at weight 0 is read access
 *    to governance — participating without influencing.
 *
 * 2. **Progression incentive**: The act of voting (even at zero weight) creates
 *    a behavioral record that can feed into reputation aggregation (Stage 2 of
 *    the conviction-to-currency path). Today's observer who votes consistently
 *    builds a track record for tomorrow's participant tier.
 *
 * 3. **Emergent signal detection**: Aggregate zero-weight votes reveal community
 *    interest patterns that weighted votes miss. If 100 observers all vote for
 *    the same knowledge source, the collective signal is meaningful even though
 *    each individual vote carries zero weight. This is the "wisdom of the
 *    periphery" — newcomers see things incumbents cannot.
 *
 * See also: `grimoires/loa/context/adr-conviction-currency-path.md` (Stage 2)
 *
 * @since Sprint 5 — Bridgebuilder Q4 (conviction voting x economic boundary reconciliation)
 * @since Sprint 9 — PRAISE-1 formalization (Ostrom annotation, Hirschman mapping, three-dimensional model)
 */
export interface ConvictionAccessCapabilities {
  /**
   * Whether the tier can submit governance votes.
   * All tiers can vote (Ostrom Principle 3: collective-choice arrangements),
   * but weight may be 0 for observer tier.
   * Dimension: Participation — "Can you be heard?"
   */
  readonly can_vote: boolean;
  /**
   * Governance vote weight multiplier (from TIER_WEIGHTS in knowledge-priority-store).
   * Graduated from 0 (observer) to 25 (sovereign) — Ostrom Principle 5.
   * Dimension: Influence — "How loud is your voice?"
   */
  readonly vote_weight: number;
  /**
   * Whether the tier passes the default economic boundary criteria.
   * Requires min_trust_score=0.3 and min_reputation_state='warming'.
   * Dimension: Access — "Can you use the commons' resources?"
   */
  readonly passes_economic_boundary: boolean;
  /** Trust score mapped from the tier (feeds Hounfour's TrustLayerSnapshot). */
  readonly trust_score: number;
  /** Reputation state mapped from the tier (feeds Hounfour's TrustLayerSnapshot). */
  readonly reputation_state: 'cold' | 'warming' | 'established' | 'authoritative';
}

/**
 * The matrix: conviction tier → capabilities across governance and economics.
 *
 * ## Constitutional Annotation
 *
 * This constant is the governance policy of the Dixie commons encoded in code.
 * Each row defines a social contract between the community and a class of
 * participants: "If you demonstrate THIS level of conviction, the community
 * grants you THESE capabilities."
 *
 * The matrix embodies two of Elinor Ostrom's design principles for governing
 * the commons (*Governing the Commons*, Cambridge University Press, 1990):
 *
 * - **Principle 3** (Collective-Choice Arrangements): All tiers can vote,
 *   ensuring that those affected by governance rules can participate in
 *   modifying them — even observers with zero weight.
 *
 * - **Principle 5** (Graduated Sanctions): The progression from observer
 *   (weight 0, no access) through sovereign (weight 25, full access)
 *   implements graduated, proportional consequences for different levels
 *   of demonstrated commitment.
 *
 * The three permission dimensions (participation × influence × access) map
 * to Hirschman's Voice mechanism: participation IS Voice, influence IS the
 * volume of Voice, and access IS what Loyalty earns. Exit (unstaking) is
 * the external fourth dimension that the matrix does not encode but implicitly
 * enables — the community cannot prevent Exit, only incentivize Loyalty.
 *
 * Key insight: `can_vote: true` but `passes_economic_boundary: false` for
 * observer and participant is by design. Governance voice != economic access.
 *
 * Vote weights sourced from knowledge-priority-store.ts TIER_WEIGHTS.
 * Economic boundary pass/fail derived from TIER_TRUST_PROFILES vs DEFAULT_CRITERIA.
 *
 * @since Sprint 5 — Bridgebuilder Q4 (conviction voting x economic boundary reconciliation)
 * @since Sprint 9 — PRAISE-1 formalization (constitutional annotation)
 * @since cycle-005 — Sprint 64, Task 5.1 (Bridge deep review Q5: governance bootstrap)
 */
export const CONVICTION_ACCESS_MATRIX: Record<ConvictionTier, ConvictionAccessCapabilities> = {
  observer: {
    can_vote: true,
    vote_weight: 0,
    passes_economic_boundary: false,
    trust_score: 0.0,
    reputation_state: 'cold',
  },
  participant: {
    can_vote: true,
    vote_weight: 1,
    passes_economic_boundary: false,
    trust_score: 0.2,
    reputation_state: 'warming',
  },
  builder: {
    can_vote: true,
    vote_weight: 3,
    passes_economic_boundary: true,
    trust_score: 0.5,
    reputation_state: 'established',
  },
  architect: {
    can_vote: true,
    vote_weight: 10,
    passes_economic_boundary: true,
    trust_score: 0.8,
    reputation_state: 'established',
  },
  sovereign: {
    can_vote: true,
    vote_weight: 25,
    passes_economic_boundary: true,
    trust_score: 1.0,
    reputation_state: 'authoritative',
  },
} as const;

/**
 * Constitutional provenance annotation for the CONVICTION_ACCESS_MATRIX.
 *
 * Tags the governance policy with its origin per Hounfour v7.9.1
 * ConstraintOrigin taxonomy:
 * - `genesis`: Set at system creation (current state — values defined by founding team)
 * - `enacted`: Modified through conviction-weighted governance vote (future)
 * - `migrated`: Carried forward from a prior system version (future)
 *
 * This annotation shifts the architectural framing from "hardcoded policy"
 * to "initial policy awaiting governance evolution." Even though the values
 * don't change today, the metadata signals that these are genesis parameters
 * subject to future conviction-weighted modification — closing the governance
 * bootstrap gap identified in Bridgebuilder Deep Review Q5.
 *
 * The governance evolution path:
 * 1. Current weights are `origin: 'genesis'` (set at system creation)
 * 2. A governance proposal (via conviction voting) could produce `origin: 'enacted'` weights
 * 3. The hash chain records which weights were in effect for each scoring decision
 *
 * @since cycle-005 — Sprint 64, Task 5.1 (Bridge deep review Q5)
 */
export interface GovernanceAnnotation {
  readonly origin: ConstraintOrigin;
  readonly enacted_at?: string;
  readonly enacted_by?: string;
}

export const CONVICTION_ACCESS_MATRIX_ORIGIN: GovernanceAnnotation = {
  origin: 'genesis',
};

export { TIER_TRUST_PROFILES, DEFAULT_CRITERIA };
export type { TierTrustProfile };
export type { ScoringPathLog } from '../types/reputation-evolution.js';
