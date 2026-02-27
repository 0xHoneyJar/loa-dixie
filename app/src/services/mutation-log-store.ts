/**
 * MutationLogStore — Durable recording of every governance mutation.
 *
 * Uses Hounfour's GovernanceMutation envelope as the schema reference.
 * Supports append-only insertion and flexible querying by session, actor,
 * resource type, and time range.
 *
 * @since cycle-009 Sprint 2 — Task 2.2 (FR-2)
 */
import type { DbPool } from '../db/client.js';

export interface MutationLogEntry {
  readonly mutation_id: string;
  readonly session_id: string;
  readonly actor_id: string;
  readonly resource_type: string;
  readonly mutation_type: string;
  readonly payload: Record<string, unknown>;
  readonly created_at: string;
}

export interface MutationLogQuery {
  session_id?: string;
  actor_id?: string;
  resource_type?: string;
  since?: string;
  limit?: number;
}

export class MutationLogStore {
  constructor(private readonly pool: DbPool) {}

  /**
   * Append a mutation log entry. Uses UUID primary key for idempotency —
   * duplicate mutation_id inserts are silently ignored.
   */
  async append(entry: MutationLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO governance_mutations
         (mutation_id, session_id, actor_id, resource_type, mutation_type, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (mutation_id) DO NOTHING`,
      [
        entry.mutation_id,
        entry.session_id,
        entry.actor_id,
        entry.resource_type,
        entry.mutation_type,
        JSON.stringify(entry.payload),
        entry.created_at,
      ],
    );
  }

  /**
   * Query mutation log with optional filters. All filter fields are optional.
   * Results ordered by created_at descending (most recent first).
   */
  async query(filter: MutationLogQuery): Promise<MutationLogEntry[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filter.session_id) {
      conditions.push(`session_id = $${paramIndex++}`);
      values.push(filter.session_id);
    }
    if (filter.actor_id) {
      conditions.push(`actor_id = $${paramIndex++}`);
      values.push(filter.actor_id);
    }
    if (filter.resource_type) {
      conditions.push(`resource_type = $${paramIndex++}`);
      values.push(filter.resource_type);
    }
    if (filter.since) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filter.since);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = filter.limit
      ? `LIMIT $${paramIndex++}`
      : '';
    if (filter.limit) {
      values.push(filter.limit);
    }

    const result = await this.pool.query<{
      mutation_id: string;
      session_id: string;
      actor_id: string;
      resource_type: string;
      mutation_type: string;
      payload: Record<string, unknown>;
      created_at: string;
    }>(
      `SELECT mutation_id, session_id, actor_id, resource_type, mutation_type, payload, created_at
       FROM governance_mutations
       ${whereClause}
       ORDER BY created_at DESC
       ${limitClause}`,
      values,
    );

    return result.rows.map((row) => ({
      mutation_id: row.mutation_id,
      session_id: row.session_id,
      actor_id: row.actor_id,
      resource_type: row.resource_type,
      mutation_type: row.mutation_type,
      payload: row.payload,
      created_at: String(row.created_at),
    }));
  }

  /**
   * Count mutations for a specific session.
   */
  async countBySession(sessionId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM governance_mutations WHERE session_id = $1',
      [sessionId],
    );
    return parseInt(result.rows[0].count, 10);
  }
}
