/**
 * Conviction-Gated Access — Ostrom's Commons Governance
 *
 * 5-tier conviction model replacing binary allowlist with graduated capability
 * access. Tiers derive from BGT conviction staking via freeside API.
 *
 * See: SDD §4.3 (Conviction Tier Resolver), PRD FR-4, ADR communitarian-agents
 */

/**
 * The 5 conviction tiers — ordered from lowest to highest access.
 * BGT staking thresholds determine tier placement.
 */
export type ConvictionTier = 'observer' | 'participant' | 'builder' | 'architect' | 'sovereign';

/** Ordered tiers for comparison */
export const TIER_ORDER: readonly ConvictionTier[] = [
  'observer',
  'participant',
  'builder',
  'architect',
  'sovereign',
] as const;

/** BGT staking thresholds for each tier (in whole BGT tokens) */
export const TIER_THRESHOLDS: Record<ConvictionTier, number> = {
  observer: 0,
  participant: 1,
  builder: 100,
  architect: 1_000,
  sovereign: 10_000,
};

/** Capabilities unlocked at each tier */
export type Capability =
  | 'chat'
  | 'personality_view'
  | 'memory'
  | 'tool_events'
  | 'economic_metadata'
  | 'scheduling'
  | 'agent_api'
  | 'autonomous_mode';

/** Capability map — each tier includes all capabilities of lower tiers */
export const TIER_CAPABILITIES: Record<ConvictionTier, readonly Capability[]> = {
  observer: ['chat', 'personality_view'],
  participant: ['chat', 'personality_view', 'memory', 'tool_events'],
  builder: ['chat', 'personality_view', 'memory', 'tool_events', 'economic_metadata', 'scheduling'],
  architect: ['chat', 'personality_view', 'memory', 'tool_events', 'economic_metadata', 'scheduling', 'agent_api'],
  sovereign: ['chat', 'personality_view', 'memory', 'tool_events', 'economic_metadata', 'scheduling', 'agent_api', 'autonomous_mode'],
};

/** Model pool assigned per conviction tier */
export const TIER_MODEL_POOLS: Record<ConvictionTier, string> = {
  observer: 'pool_observer',
  participant: 'pool_standard',
  builder: 'pool_standard',
  architect: 'pool_premium',
  sovereign: 'pool_premium',
};

/** Result of conviction tier resolution */
export interface ConvictionResult {
  readonly tier: ConvictionTier;
  readonly bgtStaked: number;
  readonly capabilities: readonly Capability[];
  readonly modelPool: string;
  readonly source: 'freeside' | 'legacy_allowlist' | 'admin' | 'default';
  readonly cachedAt?: string;
}

/** Response from freeside conviction staking API */
export interface FreesideConvictionResponse {
  readonly wallet: string;
  readonly bgtStaked: number;
  readonly stakedSince?: string;
  readonly validatorId?: string;
}

/** Set of valid tier strings for runtime validation. */
const VALID_TIERS: ReadonlySet<string> = new Set(TIER_ORDER);

/**
 * Parse and validate a ConvictionTier from an untrusted string (e.g., request header).
 * Returns the validated tier or the fallback (default: 'observer').
 */
export function parseConvictionTier(raw: string | undefined): ConvictionTier {
  if (raw && VALID_TIERS.has(raw)) return raw as ConvictionTier;
  return 'observer';
}

/**
 * Strict variant: returns undefined on invalid input (for routes that reject invalid tiers).
 */
export function parseConvictionTierStrict(raw: string | undefined): ConvictionTier | undefined {
  if (raw && VALID_TIERS.has(raw)) return raw as ConvictionTier;
  return undefined;
}

/**
 * Check if a tier meets or exceeds a required tier.
 */
export function tierMeetsRequirement(actual: ConvictionTier, required: ConvictionTier): boolean {
  return TIER_ORDER.indexOf(actual) >= TIER_ORDER.indexOf(required);
}

/**
 * Resolve a BGT staking amount to a conviction tier.
 */
export function bgtToTier(bgtStaked: number): ConvictionTier {
  // Walk tiers from highest to lowest
  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    if (bgtStaked >= TIER_THRESHOLDS[TIER_ORDER[i]]) {
      return TIER_ORDER[i];
    }
  }
  return 'observer';
}

/**
 * Check if a tier has a specific capability.
 */
export function tierHasCapability(tier: ConvictionTier, capability: Capability): boolean {
  return TIER_CAPABILITIES[tier].includes(capability);
}
