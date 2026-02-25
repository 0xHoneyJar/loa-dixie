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
 * @since cycle-009 Sprint 2 — Tasks 2.4, 2.5 (FR-3)
 */
import {
  computeAuditEntryHash,
  AUDIT_TRAIL_GENESIS_HASH,
} from '@0xhoneyjar/loa-hounfour/commons';
import type { DbPool } from '../db/client.js';

/** Domain tag format for Dixie audit entries. */
const DOMAIN_TAG_PREFIX = 'loa-dixie:audit';
const CONTRACT_VERSION = '9.0.0';

function buildDomainTag(resourceType: string): string {
  return `${DOMAIN_TAG_PREFIX}:${resourceType}:${CONTRACT_VERSION}`;
}

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
   * 1. Fetch the tip hash for this resource type's chain
   * 2. Compute the entry hash using Hounfour's computeAuditEntryHash()
   * 3. Insert the entry with hash chain metadata
   */
  async append(
    resourceType: string,
    entry: AuditEntryInput,
  ): Promise<AuditEntry> {
    const previousHash = await this.getTipHash(resourceType);
    const domainTag = buildDomainTag(resourceType);

    const entryHash = computeAuditEntryHash(
      {
        entry_id: entry.entry_id,
        timestamp: entry.timestamp,
        event_type: entry.event_type,
        ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
        ...(entry.payload !== undefined && { payload: entry.payload }),
      },
      domainTag,
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

    await this.pool.query(
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
  }

  /**
   * Get the latest hash for a resource type's audit chain.
   * Returns AUDIT_TRAIL_GENESIS_HASH if the chain is empty.
   */
  async getTipHash(resourceType: string): Promise<string> {
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
      timestamp:
        row.timestamp instanceof Date
          ? row.timestamp.toISOString()
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
   * Two-phase verification:
   * 1. Re-compute each entry's hash and verify it matches
   * 2. Verify each entry's previous_hash matches the preceding entry's hash
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

      // Phase 1: Recompute content hash
      const recomputedHash = computeAuditEntryHash(
        {
          entry_id: entry.entry_id,
          timestamp: entry.timestamp,
          event_type: entry.event_type,
          ...(entry.actor_id !== undefined && { actor_id: entry.actor_id }),
          ...(entry.payload !== undefined && { payload: entry.payload }),
        },
        entry.hash_domain_tag,
      );

      if (recomputedHash !== entry.entry_hash) {
        return {
          valid: false,
          entries_checked: i + 1,
          detail: `Content hash mismatch at entry ${entry.entry_id} (index ${i})`,
        };
      }

      // Phase 2: Verify chain linkage
      const expectedPrevious =
        i === 0 ? AUDIT_TRAIL_GENESIS_HASH : entries[i - 1].entry_hash;

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
