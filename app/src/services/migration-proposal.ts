/**
 * Migration Proposal Generator — consumes ProtocolChangeManifest
 * and produces actionable MigrationProposal documents.
 *
 * Part of the Level 6 (Adaptive Protocol Co-Evolution) infrastructure.
 * When the ProtocolDiffEngine detects changes between hounfour versions,
 * this generator produces human-readable, prioritized migration proposals
 * that guide consumers through the upgrade process.
 *
 * Each proposal item includes:
 * - Actionable description of what needs to change
 * - Effort estimate (trivial/small/medium/large)
 * - Priority (required/recommended/optional)
 *
 * Parallel: Protobuf schema evolution — when a `.proto` file changes,
 * tools like `buf breaking` produce structured reports. This generator
 * serves a similar role for hounfour protocol evolution.
 *
 * @since Sprint 12 — Task 12.2 (Level 6 Foundation)
 * @see protocol-diff-engine.ts — Produces the ProtocolChangeManifest consumed here
 * @see grimoires/loa/context/adr-constitutional-amendment.md — Amendment process
 */
import type { ProtocolChangeManifest, ProtocolChange } from './protocol-diff-engine.js';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Effort estimate for a migration action.
 *
 * - trivial: Can be done in minutes (e.g., import rename)
 * - small: Can be done in an hour (e.g., add a new conformance test)
 * - medium: Half-day to full-day effort (e.g., migrate to new validator API)
 * - large: Multi-day effort (e.g., redesign a boundary integration)
 */
export type EffortEstimate = 'trivial' | 'small' | 'medium' | 'large';

/**
 * Priority of a migration action.
 *
 * - required: Must be completed before upgrading. Breaking changes.
 * - recommended: Should be completed within one sprint. Advisory changes.
 * - optional: Nice to have. Informational changes.
 */
export type MigrationPriority = 'required' | 'recommended' | 'optional';

/**
 * A single actionable item in a migration proposal.
 */
export interface MigrationItem {
  /** Unique identifier within the proposal. */
  readonly id: string;
  /** Category matching the ProtocolChange category. */
  readonly category: ProtocolChange['category'];
  /** Actionable description of what needs to be done. */
  readonly description: string;
  /** Affected schema, validator, or field. */
  readonly affected: string;
  /** Estimated effort to complete this item. */
  readonly effort: EffortEstimate;
  /** Priority: required, recommended, or optional. */
  readonly priority: MigrationPriority;
  /** Suggested action — the concrete step to take. */
  readonly action: string;
}

/**
 * A complete migration proposal generated from a ProtocolChangeManifest.
 *
 * Machine-readable JSON document that can be rendered into a human-readable
 * migration guide, fed into project management tools, or processed by
 * automated migration bots.
 */
export interface MigrationProposal {
  /** Source version being migrated from. */
  readonly from_version: string;
  /** Target version being migrated to. */
  readonly to_version: string;
  /** ISO 8601 timestamp when proposal was generated. */
  readonly generated_at: string;
  /** All migration items, sorted by priority (required first). */
  readonly items: readonly MigrationItem[];
  /** Summary statistics. */
  readonly summary: {
    readonly total_items: number;
    readonly required_count: number;
    readonly recommended_count: number;
    readonly optional_count: number;
    readonly estimated_total_effort: string;
    readonly has_breaking_changes: boolean;
  };
}

// ─── Generator ───────────────────────────────────────────────────────

/**
 * Generate a MigrationProposal from a ProtocolChangeManifest.
 *
 * Transforms each change in the manifest into an actionable migration item
 * with effort estimate and priority. Items are sorted by priority (required
 * first, then recommended, then optional).
 *
 * @param manifest - The change manifest from ProtocolDiffEngine.diffVersions()
 * @returns A complete MigrationProposal with actionable items
 *
 * @since Sprint 12 — Task 12.2
 */
export function generateMigrationProposal(manifest: ProtocolChangeManifest): MigrationProposal {
  const items: MigrationItem[] = [];
  let nextId = 1;

  // Process new validators (additive, optional)
  for (const change of manifest.new_validators) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'small',
      priority: 'optional',
      action: `Add conformance test for new validator "${change.affected}". ` +
        `Import from @0xhoneyjar/loa-hounfour and add to the conformance suite.`,
    });
  }

  // Process deprecated validators (breaking, required)
  for (const change of manifest.deprecated_validators) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'medium',
      priority: 'required',
      action: `Schedule removal of validator "${change.affected}" usage. ` +
        `Find all imports and call sites, migrate to the replacement validator, ` +
        `and remove dead code.`,
    });
  }

  // Process new evaluators (advisory, recommended)
  for (const change of manifest.new_evaluators) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'small',
      priority: 'recommended',
      action: `Add cross-field validation tests for new evaluator on schema "${change.affected}". ` +
        `Ensure payloads pass both schema and cross-field validation.`,
    });
  }

  // Process removed evaluators (advisory)
  for (const change of manifest.removed_evaluators) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'trivial',
      priority: 'recommended',
      action: `Review whether local code relied on cross-field validation for "${change.affected}". ` +
        `If so, implement equivalent validation locally or update to the new evaluator.`,
    });
  }

  // Process new fields/schemas (additive, optional)
  for (const change of manifest.new_fields) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'trivial',
      priority: 'optional',
      action: `New schema "${change.affected}" available. ` +
        `Evaluate whether this schema is relevant to Dixie's domain. ` +
        `If so, add imports and conformance tests.`,
    });
  }

  // Process removed fields/schemas (breaking, required)
  for (const change of manifest.removed_fields) {
    items.push({
      id: `MIG-${String(nextId++).padStart(3, '0')}`,
      category: change.category,
      description: change.description,
      affected: change.affected,
      effort: 'large',
      priority: 'required',
      action: `Schema "${change.affected}" was removed. ` +
        `Find all imports and usages, migrate to the replacement schema, ` +
        `update conformance tests, and verify runtime validation still passes.`,
    });
  }

  // Sort by priority: required > recommended > optional
  const priorityOrder: Record<MigrationPriority, number> = {
    required: 0,
    recommended: 1,
    optional: 2,
  };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Compute summary
  const requiredCount = items.filter(i => i.priority === 'required').length;
  const recommendedCount = items.filter(i => i.priority === 'recommended').length;
  const optionalCount = items.filter(i => i.priority === 'optional').length;

  return {
    from_version: manifest.from_version,
    to_version: manifest.to_version,
    generated_at: new Date().toISOString(),
    items,
    summary: {
      total_items: items.length,
      required_count: requiredCount,
      recommended_count: recommendedCount,
      optional_count: optionalCount,
      estimated_total_effort: estimateTotalEffort(items),
      has_breaking_changes: manifest.breaking_changes.length > 0,
    },
  };
}

/**
 * Estimate the total effort across all migration items.
 *
 * Returns a human-readable string like "~2 days" based on the
 * sum of individual effort estimates.
 */
function estimateTotalEffort(items: readonly MigrationItem[]): string {
  const effortHours: Record<EffortEstimate, number> = {
    trivial: 0.25,
    small: 1,
    medium: 4,
    large: 16,
  };

  const totalHours = items.reduce(
    (sum, item) => sum + effortHours[item.effort],
    0,
  );

  if (totalHours <= 1) return '< 1 hour';
  if (totalHours <= 4) return `~${Math.ceil(totalHours)} hours`;
  if (totalHours <= 8) return '~1 day';
  return `~${Math.ceil(totalHours / 8)} days`;
}
