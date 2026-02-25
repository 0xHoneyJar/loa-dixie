/**
 * PostgresReputationStore — PostgreSQL-backed implementation of ReputationStore.
 *
 * Stores reputation aggregates, task cohorts, and events in PostgreSQL using
 * JSONB for complex nested types. Extracted fields (state, event_type) are
 * indexed for efficient queries.
 *
 * @since cycle-006 Sprint 1 — FR-1 Persistent Reputation Storage
 */
import type pg from 'pg';
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type { ReputationStore } from '../services/reputation-service.js';
import type { TaskTypeCohort, ReputationEvent } from '../types/reputation-evolution.js';

export class PostgresReputationStore implements ReputationStore {
  constructor(private readonly pool: pg.Pool) {}

  async get(nftId: string): Promise<ReputationAggregate | undefined> {
    const result = await this.pool.query(
      'SELECT aggregate FROM reputation_aggregates WHERE nft_id = $1',
      [nftId],
    );
    if (result.rows.length === 0) return undefined;
    return result.rows[0].aggregate as ReputationAggregate;
  }

  async put(nftId: string, aggregate: ReputationAggregate): Promise<void> {
    await this.pool.query(
      `INSERT INTO reputation_aggregates (nft_id, state, aggregate, snapshot_version)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (nft_id) DO UPDATE
       SET state = $2, aggregate = $3,
           snapshot_version = reputation_aggregates.snapshot_version + 1,
           updated_at = now()`,
      [nftId, aggregate.state, JSON.stringify(aggregate)],
    );
  }

  async listCold(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> {
    const result = await this.pool.query(
      "SELECT nft_id, aggregate FROM reputation_aggregates WHERE state = 'cold'",
    );
    return result.rows.map((row: { nft_id: string; aggregate: ReputationAggregate }) => ({
      nftId: row.nft_id,
      aggregate: row.aggregate,
    }));
  }

  async count(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM reputation_aggregates');
    return result.rows[0].count;
  }

  async listAll(): Promise<Array<{ nftId: string; aggregate: ReputationAggregate }>> {
    const result = await this.pool.query('SELECT nft_id, aggregate FROM reputation_aggregates');
    return result.rows.map((row: { nft_id: string; aggregate: ReputationAggregate }) => ({
      nftId: row.nft_id,
      aggregate: row.aggregate,
    }));
  }

  async getTaskCohort(
    nftId: string,
    model: string,
    taskType: string,
  ): Promise<TaskTypeCohort | undefined> {
    const result = await this.pool.query(
      `SELECT cohort FROM reputation_task_cohorts
       WHERE nft_id = $1 AND model_id = $2 AND task_type = $3`,
      [nftId, model, taskType],
    );
    if (result.rows.length === 0) return undefined;
    return result.rows[0].cohort as TaskTypeCohort;
  }

  async putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void> {
    await this.pool.query(
      `INSERT INTO reputation_task_cohorts (nft_id, model_id, task_type, cohort)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nft_id, model_id, task_type) DO UPDATE
       SET cohort = $4, updated_at = now()`,
      [nftId, cohort.model_id, cohort.task_type, JSON.stringify(cohort)],
    );
  }

  async appendEvent(nftId: string, event: ReputationEvent): Promise<void> {
    // Transactional: INSERT event + UPDATE event_count must succeed or fail together.
    // If the UPDATE fails after INSERT, event_count drifts from actual event count,
    // causing needsCompaction() to make decisions on stale metadata.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO reputation_events (nft_id, event_type, event)
         VALUES ($1, $2, $3)`,
        [nftId, event.type, JSON.stringify(event)],
      );
      // Increment event_count on the aggregate row (if it exists).
      // Missing aggregate is valid — events can precede aggregate creation.
      await client.query(
        `UPDATE reputation_aggregates SET event_count = event_count + 1 WHERE nft_id = $1`,
        [nftId],
      );
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* don't shadow original error */ }
      throw err;
    } finally {
      client.release();
    }
  }

  async getEventHistory(nftId: string, limit = 1000): Promise<ReputationEvent[]> {
    const result = await this.pool.query(
      `SELECT event FROM reputation_events
       WHERE nft_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [nftId, limit],
    );
    return result.rows.map((row: { event: ReputationEvent }) => row.event);
  }

  async getRecentEvents(nftId: string, limit: number): Promise<ReputationEvent[]> {
    const result = await this.pool.query(
      `SELECT event FROM reputation_events
       WHERE nft_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [nftId, limit],
    );
    // Reverse to return chronological order (oldest first among the recent N)
    return result.rows.map((row: { event: ReputationEvent }) => row.event).reverse();
  }

  /**
   * Count aggregates grouped by state. Used for tier distribution
   * without loading full JSONB blobs (avoids O(n) data transfer).
   */
  async countByState(): Promise<Map<string, number>> {
    const result = await this.pool.query(
      'SELECT state, COUNT(*)::int AS count FROM reputation_aggregates GROUP BY state',
    );
    const map = new Map<string, number>();
    for (const row of result.rows as Array<{ state: string; count: number }>) {
      map.set(row.state, row.count);
    }
    return map;
  }

  /**
   * Atomically compact the aggregate snapshot and reset event_count.
   *
   * Writes the aggregate via put() (incrementing snapshot_version),
   * then resets event_count to 0 within the same transaction.
   * On failure, the transaction rolls back — no partial compaction.
   *
   * @param nftId - The dNFT ID to compact
   * @param aggregate - The current aggregate state to snapshot
   * @since Sprint 7 (G-71) — Task 7.1
   */
  async compactSnapshot(nftId: string, aggregate: ReputationAggregate): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO reputation_aggregates (nft_id, state, aggregate, snapshot_version)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (nft_id) DO UPDATE
         SET state = $2, aggregate = $3,
             snapshot_version = reputation_aggregates.snapshot_version + 1,
             event_count = 0,
             updated_at = now()`,
        [nftId, aggregate.state, JSON.stringify(aggregate)],
      );
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* don't shadow original error */ }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Check whether an aggregate needs snapshot compaction.
   *
   * @param nftId - The dNFT ID to check
   * @param threshold - Event count threshold (default: 100)
   * @returns true if event_count >= threshold
   * @since Sprint 7 (G-71) — Task 7.1
   */
  async needsCompaction(nftId: string, threshold = 100): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT event_count FROM reputation_aggregates WHERE nft_id = $1',
      [nftId],
    );
    if (result.rows.length === 0) return false;
    return (result.rows[0].event_count as number) >= threshold;
  }

  /**
   * Count events older than the given cutoff date.
   * Used for retention monitoring dashboards.
   *
   * @param cutoff - Events with created_at < cutoff are counted
   * @returns Number of events older than cutoff
   * @since Sprint 7 (G-71) — Task 7.3
   */
  async countEventsBefore(cutoff: Date): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM reputation_events WHERE created_at < $1',
      [cutoff],
    );
    return result.rows[0].count;
  }

  /**
   * Delete events older than the given cutoff date.
   *
   * @param cutoff - Events with created_at < cutoff are deleted
   * @param dryRun - When true (default), returns count without deleting
   * @returns Number of events deleted (or would be deleted in dry run)
   * @since Sprint 7 (G-71) — Task 7.3
   */
  async deleteEventsBefore(cutoff: Date, dryRun = true): Promise<number> {
    if (dryRun) {
      return this.countEventsBefore(cutoff);
    }
    const result = await this.pool.query(
      'DELETE FROM reputation_events WHERE created_at < $1',
      [cutoff],
    );
    return result.rowCount ?? 0;
  }

  /**
   * Return the created_at of the oldest event in the table.
   * Useful for retention alerting and dashboard displays.
   *
   * @returns Date of the oldest event, or null when table is empty
   * @since Sprint 7 (G-71) — Task 7.3
   */
  async getOldestEventDate(): Promise<Date | null> {
    const result = await this.pool.query(
      'SELECT MIN(created_at) AS oldest FROM reputation_events',
    );
    const oldest = result.rows[0]?.oldest;
    return oldest ? new Date(oldest) : null;
  }
}
