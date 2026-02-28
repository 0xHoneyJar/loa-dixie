/**
 * AuditTrailStore — Durable, hash-chained audit entries.
 *
 * Each governance action produces an audit entry with SHA-256 hash linking
 * using Hounfour's computeAuditEntryHash() and AUDIT_TRAIL_GENESIS_HASH.
 *
 * The hash chain is per-resource_type: each resource type has its own
 * independent chain with its own genesis hash.
 *
 * Cross-chain verification compares the scoring path tracker's tip hash
 * against the audit trail's latest scoring-related entry.
 *
 * Version-aware hash verification (ADR-006, Sprint 121):
 * - Legacy entries (domain tag version with dots, e.g., 9.0.0) use the v9
 *   double-hash algorithm (computeChainBoundHash_v9).
 * - New entries (domain tag version "v10") use hounfour's canonical
 *   computeChainBoundHash (direct concatenation + SHA-256).
 * - Mixed chains are verified entry-by-entry with the creating algorithm.
 *
 * @since cycle-009 Sprint 2 — Tasks 2.4, 2.5 (FR-3)
 * @since cycle-019 Sprint 121 — Version-aware hash verification (ADR-006, P3)
 */
import {
  computeAuditEntryHash,
  computeChainBoundHash as canonicalChainBoundHash,
  AUDIT_TRAIL_GENESIS_HASH,
  validateAuditTimestamp,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { DbPool } from '../db/client.js';
import { withTransaction } from '../db/transaction.js';

/**
 * Typed error for audit timestamp validation failures.
 * @since cycle-019 bridge iter 2 — HF830-LOW-05
 */
export class AuditTimestampError extends Error {
  constructor(detail: string) {
    super(`Invalid audit timestamp: ${detail}`);
    this.name = 'AuditTimestampError';
  }
}

// ---------------------------------------------------------------------------
// Domain tag construction
// ---------------------------------------------------------------------------

/** Domain tag format for Dixie audit entries. */
const DOMAIN_TAG_PREFIX = 'loa-dixie:audit';

/**
 * Valid resource type pattern: lowercase alphanumeric with hyphens/underscores, max 64 chars.
 * Rejects colons (domain tag injection — Red Team RT-2), dots (legacy format confusion),
 * and other special characters. Length cap prevents DoS via oversized domain tags.
 * @since cycle-021 — Red Team RT-2 mitigation (ATTACK-3: Domain Tag Collision)
 * @since cycle-021 bridge iter 1 — HF831-MED-03 length cap, HF831-HIGH-01 defense-in-depth
 */
const VALID_RESOURCE_TYPE = /^[a-z][a-z0-9_-]{0,63}$/;

/**
 * Validate resourceType at every public entry point (defense-in-depth).
 * @throws {Error} if resourceType fails pattern or length validation
 * @since cycle-021 bridge iter 1 — HF831-HIGH-01
 */
function assertValidResourceType(resourceType: string): void {
  if (!VALID_RESOURCE_TYPE.test(resourceType)) {
    throw new Error(`Invalid resourceType format`);
  }
}

/**
 * Local buildDomainTag — intentionally retained post-hounfour v8.3.1.
 *
 * Hounfour v8.3.1 introduces deterministic sanitization (dots → hyphens),
 * making this workaround technically optional. However, we keep it because:
 * - 12 migrations store entries with 'v10' domain tags (loa-dixie:audit:*:v10)
 * - Canonical hounfour would produce a different prefix ('loa-commons:audit:')
 * - Changing mid-chain would require re-hashing all stored entries
 * - verifyAuditTrailIntegrity() already handles mixed chains via stored tags
 *
 * Decision: cycle-021, Issue #71, Option A (keep local workaround).
 * @see ADR-006, computeChainBoundHashVersionAware()
 * @since cycle-019 Sprint 121 — T6.3 (original impedance mismatch workaround)
 * @since cycle-021 — Decision to retain post-v8.3.1
 */
function buildDomainTag(resourceType: string): string {
  return `${DOMAIN_TAG_PREFIX}:${resourceType}:v10`;
}

// ---------------------------------------------------------------------------
// Legacy hash algorithm — preserved for verifying existing chain entries
// ---------------------------------------------------------------------------

/**
 * Legacy chain-bound hash: double-hash via synthetic 'chain_binding' entry.
 *
 * @deprecated Use canonical computeChainBoundHash from hounfour for new entries.
 *   Preserved for verifying existing chain entries with domain tag version ≤9.x.x.
 *   See ADR-006 for migration details.
 * @since cycle-009 Sprint 2 — original implementation
 * @since cycle-019 Sprint 121 — renamed from computeChainBoundHash, marked deprecated
 */
function computeChainBoundHash_v9(
  entry: {
    entry_id: string;
    timestamp: string;
    event_type: string;
    actor_id?: string;
    payload?: Record<string, unknown>;
  },
  domainTag: string,
  previousHash: string,
): string {
  const contentHash = computeAuditEntryHash(entry, domainTag);
  // Chain-bind via synthetic entry (legacy algorithm — see ADR-006)
  const chainHash = computeAuditEntryHash(
    {
      entry_id: contentHash,
      timestamp: previousHash,
      event_type: 'chain_binding',
    },
    domainTag,
  );
  return chainHash;
}

// ---------------------------------------------------------------------------
// Version-aware dispatch
// ---------------------------------------------------------------------------

/**
 * Detect whether a domain tag uses the legacy version format (contains dots).
 *
 * Legacy format: `loa-dixie:audit:{resourceType}:{semver}` (e.g., 9.0.0)
 * Canonical format: `loa-dixie:audit:{resourceType}:v10` (no dots)
 *
 * @since cycle-019 Sprint 121 — T6.4
 */
function isLegacyDomainTag(domainTag: string): boolean {
  const segments = domainTag.split(':');
  const version = segments[segments.length - 1];
  // Legacy tags have dots in version (e.g., "9.0.0")
  // Canonical tags use dot-free format (e.g., "v10")
  // Default to legacy if version segment is missing or unclear
  return version?.includes('.') ?? true;
}

/**
 * Compute chain-bound hash using the appropriate algorithm for the domain tag.
 *
 * @since cycle-019 Sprint 121 — T6.4
 */
function computeChainBoundHashVersionAware(
  entry: {
    entry_id: string;
    timestamp: string;
    event_type: string;
    actor_id?: string;
    payload?: Record<string, unknown>;
  },
  domainTag: string,
  previousHash: string,
): string {
  if (isLegacyDomainTag(domainTag)) {
    return computeChainBoundHash_v9(entry, domainTag, previousHash);
  }
  return canonicalChainBoundHash(entry, domainTag, previousHash);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AuditEntry {
  readonly entry_id: string;
  readonly resource_type: string;
  readonly timestamp: string;
  readonly event_type: string;
  readonly actor_id?: string;
  readonly payload?: Record<string, unknown>;
  readonly entry_hash: string;
  readonly previous_hash: string;
  readonly hash_domain_tag: string;
}

export interface AuditEntryInput {
  readonly entry_id: string;
  readonly timestamp: string;
  readonly event_type: string;
  readonly actor_id?: string;
  readonly payload?: Record<string, unknown>;
}

export class AuditTrailStore {
  constructor(private readonly pool: DbPool) {}

  /**
   * Append a new audit entry, computing its hash and linking to the chain.
   *
   * Runs within a serialized transaction to prevent TOCTOU races:
   * 1. BEGIN transaction
   * 2. SELECT tip hash with FOR UPDATE lock on the chain
   * 3. Compute chain-bound entry hash (content + previous_hash)
   * 4. INSERT entry
   * 5. COMMIT
   *
   * New entries use canonical computeChainBoundHash with v10 domain tag (Sprint 121).
   *
   * @since cycle-009 Sprint 2 — Task 2.4 (FR-3)
   * @since bridge-iter1: Fixed HIGH-1 (chain-bound hash) and HIGH-2 (TOCTOU serialization)
   * @since bridge-iter2: Added UNIQUE(resource_type, previous_hash) guard for genesis race
   * @since cycle-019 Sprint 121: Switched to canonical hash algorithm for new entries
   */
  async append(
    resourceType: string,
    entry: AuditEntryInput,
  ): Promise<AuditEntry> {
    return withTransaction(this.pool, async (client) => {
      // Validate resourceType against strict pattern (Red Team RT-2, cycle-021)
      assertValidResourceType(resourceType);

      // Validate timestamp format and boundaries (hounfour v8.3.0)
      const tsResult = validateAuditTimestamp(entry.timestamp);
      if (!tsResult.valid) {
        throw new AuditTimestampError(tsResult.error ?? 'unknown');
      }

      // Lock-aware tip read: SELECT ... FOR UPDATE serializes concurrent appends
      const tipResult = await client.query<{ entry_hash: string }>(
        `SELECT entry_hash FROM audit_entries
         WHERE resource_type = $1
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [resourceType],
      );
      const previousHash =
        tipResult.rows[0]?.entry_hash ?? AUDIT_TRAIL_GENESIS_HASH;

      const domainTag = buildDomainTag(resourceType);

      // Canonical chain-bound hash (v10 — see ADR-006)
      const entryHash = canonicalChainBoundHash(
        {
          entry_id: entry.entry_id,
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
          ...(entry.payload !== undefined && { payload: entry.payload }),
        },
        domainTag,
        previousHash,
      );

      const fullEntry: AuditEntry = {
        entry_id: entry.entry_id,
        resource_type: resourceType,
        timestamp: entry.timestamp,
        event_type: entry.event_type,
        actor_id: entry.actor_id,
        payload: entry.payload,
        entry_hash: entryHash,
        previous_hash: previousHash,
        hash_domain_tag: domainTag,
      };

      await client.query(
        `INSERT INTO audit_entries
           (entry_id, resource_type, timestamp, event_type, actor_id, payload,
            entry_hash, previous_hash, hash_domain_tag)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          fullEntry.entry_id,
          fullEntry.resource_type,
          fullEntry.timestamp,
          fullEntry.event_type,
          fullEntry.actor_id ?? null,
          fullEntry.payload ? JSON.stringify(fullEntry.payload) : null,
          fullEntry.entry_hash,
          fullEntry.previous_hash,
          fullEntry.hash_domain_tag,
        ],
      );

      return fullEntry;
    });
  }

  /**
   * Get the latest hash for a resource type's audit chain.
   * Returns AUDIT_TRAIL_GENESIS_HASH if the chain is empty.
   */
  async getTipHash(resourceType: string): Promise<string> {
    assertValidResourceType(resourceType);
    const result = await this.pool.query<{ entry_hash: string }>(
      `SELECT entry_hash FROM audit_entries
       WHERE resource_type = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [resourceType],
    );
    return result.rows[0]?.entry_hash ?? AUDIT_TRAIL_GENESIS_HASH;
  }

  /**
   * Retrieve audit entries for a resource type, ordered by created_at.
   */
  async getEntries(
    resourceType: string,
    limit?: number,
  ): Promise<AuditEntry[]> {
    assertValidResourceType(resourceType);
    const query = limit
      ? `SELECT * FROM audit_entries WHERE resource_type = $1 ORDER BY created_at ASC LIMIT $2`
      : `SELECT * FROM audit_entries WHERE resource_type = $1 ORDER BY created_at ASC`;
    const params: unknown[] = limit
      ? [resourceType, limit]
      : [resourceType];

    const result = await this.pool.query<{
      entry_id: string;
      resource_type: string;
      timestamp: string;
      event_type: string;
      actor_id: string | null;
      payload: Record<string, unknown> | null;
      entry_hash: string;
      previous_hash: string;
      hash_domain_tag: string;
    }>(query, params);

    return result.rows.map((row) => ({
      entry_id: row.entry_id,
      resource_type: row.resource_type,
      timestamp: typeof row.timestamp === 'object' && row.timestamp !== null && 'toISOString' in row.timestamp
        ? (row.timestamp as unknown as Date).toISOString()
        : String(row.timestamp),
      event_type: row.event_type,
      ...(row.actor_id !== null && { actor_id: row.actor_id }),
      ...(row.payload !== null && { payload: row.payload }),
      entry_hash: row.entry_hash,
      previous_hash: row.previous_hash,
      hash_domain_tag: row.hash_domain_tag,
    }));
  }

  /**
   * Verify integrity of the audit chain for a resource type.
   *
   * Version-aware verification (ADR-006):
   * - Entries with dots in domain tag version (e.g., 9.0.0) use legacy algorithm
   * - Entries with dot-free version (e.g., v10) use canonical algorithm
   * - A single chain may contain entries from both eras
   *
   * Two-phase verification per entry:
   * 1. Re-compute chain-bound hash with version-appropriate algorithm
   * 2. Verify stored previous_hash matches the preceding entry's hash
   *
   * @since cycle-019 Sprint 121 — version-aware dispatch (T6.4)
   */
  async verifyIntegrity(
    resourceType: string,
  ): Promise<{ valid: boolean; entries_checked: number; detail?: string }> {
    const entries = await this.getEntries(resourceType);

    if (entries.length === 0) {
      return { valid: true, entries_checked: 0 };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Phase 1: Recompute chain-bound hash with version-aware dispatch
      const expectedPrevious =
        i === 0 ? AUDIT_TRAIL_GENESIS_HASH : entries[i - 1].entry_hash;

      const recomputedHash = computeChainBoundHashVersionAware(
        {
          entry_id: entry.entry_id,
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
          ...(entry.payload !== undefined && { payload: entry.payload }),
        },
        entry.hash_domain_tag,
        expectedPrevious,
      );

      if (recomputedHash !== entry.entry_hash) {
        return {
          valid: false,
          entries_checked: i + 1,
          detail: `Hash mismatch at entry ${entry.entry_id} (index ${i}) — content or chain linkage tampered`,
        };
      }

      // Phase 2: Verify stored previous_hash matches expected predecessor
      // (This is now also enforced by the chain-bound hash, but we check
      // the stored column for explicit error reporting.)
      if (entry.previous_hash !== expectedPrevious) {
        return {
          valid: false,
          entries_checked: i + 1,
          detail: `Chain linkage broken at entry ${entry.entry_id} (index ${i})`,
        };
      }
    }

    return { valid: true, entries_checked: entries.length };
  }

  /**
   * Cross-chain verification: compare scoring path tip hash against
   * the latest audit trail entry for resource_type 'scoring-path'.
   *
   * Detects divergence between the in-memory scoring chain and the
   * durable audit chain.
   */
  async verifyCrossChain(
    scoringPathTipHash: string,
  ): Promise<{ consistent: boolean; detail: string }> {
    const auditTipHash = await this.getTipHash('scoring-path');

    if (auditTipHash === AUDIT_TRAIL_GENESIS_HASH) {
      return {
        consistent: true,
        detail: 'Audit trail empty for scoring-path — no cross-chain verification possible',
      };
    }

    if (auditTipHash === scoringPathTipHash) {
      return {
        consistent: true,
        detail: `Scoring path and audit trail tips match: ${scoringPathTipHash}`,
      };
    }

    return {
      consistent: false,
      detail: `Cross-chain divergence detected: scoring-path tip=${scoringPathTipHash}, audit tip=${auditTipHash}`,
    };
  }
}

export { AUDIT_TRAIL_GENESIS_HASH };

// Test-only exports for version-aware verification testing
export { computeChainBoundHash_v9, isLegacyDomainTag, computeChainBoundHashVersionAware, VALID_RESOURCE_TYPE };
