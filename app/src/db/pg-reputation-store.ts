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
      `INSERT INTO reputation_aggregates (nft_id, state, aggregate)
       VALUES ($1, $2, $3)
       ON CONFLICT (nft_id) DO UPDATE
       SET state = $2, aggregate = $3, updated_at = now()`,
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
    await this.pool.query(
      `INSERT INTO reputation_events (nft_id, event_type, event)
       VALUES ($1, $2, $3)`,
      [nftId, event.type, JSON.stringify(event)],
    );
  }

  async getEventHistory(nftId: string, limit = 1000): Promise<ReputationEvent[]> {
    const result = await this.pool.query(
      `SELECT event FROM reputation_events
       WHERE nft_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [nftId, limit],
    );
    return result.rows.map((row: { event: ReputationEvent }) => row.event);
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
}
