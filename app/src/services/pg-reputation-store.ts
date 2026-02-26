/**
 * PostgreSQLReputationStore — Durable persistence for reputation aggregates.
 *
 * Drop-in replacement for InMemoryReputationStore. Implements the full
 * ReputationStore interface against PostgreSQL with:
 * - Hybrid JSONB + indexed columns for aggregates
 * - Optimistic concurrency via version column
 * - Append-only event log
 * - Parameterized queries (no SQL concatenation)
 *
 * @since cycle-009 Sprint 1 — Task 1.5 (FR-1)
 */
import type { ReputationAggregate } from '@0xhoneyjar/loa-hounfour/governance';
import type {
  TaskTypeCohort,
  ReputationEvent,
} from '../types/reputation-evolution.js';
import type { ReputationStore } from './reputation-service.js';
import type { DbPool } from '../db/client.js';
import { withTransaction } from '../db/transaction.js';

/**
 * Error thrown when an optimistic concurrency conflict is detected.
 * This means another process updated the aggregate between read and write.
 */
export class ConflictError extends Error {
  readonly nftId: string;
  readonly expectedVersion: number;

  constructor(nftId: string, expectedVersion: number) {
    super(
      `Version conflict for ${nftId}: expected version ${expectedVersion} was already superseded`,
    );
    this.name = 'ConflictError';
    this.nftId = nftId;
    this.expectedVersion = expectedVersion;
  }
}

export class PostgreSQLReputationStore implements ReputationStore {
  constructor(private readonly pool: DbPool) {}

  async get(nftId: string): Promise<ReputationAggregate | undefined> {
    const result = await this.pool.query<{ data: ReputationAggregate }>(
      'SELECT data FROM reputation_aggregates WHERE nft_id = $1',
      [nftId],
    );
    return result.rows[0]?.data;
  }

  async put(
    nftId: string,
    aggregate: ReputationAggregate,
    expectedVersion?: number,
  ): Promise<void> {
    // Extract indexed fields from the aggregate
    const state = aggregate.state ?? 'cold';
    const blendedScore = aggregate.blended_score ?? 0;
    const sampleCount = aggregate.sample_count ?? 0;

    if (expectedVersion !== undefined) {
      // Optimistic concurrency: caller supplies expected version
      const updateResult = await this.pool.query(
        `UPDATE reputation_aggregates
         SET data = $2, state = $3, blended_score = $4, sample_count = $5,
             version = version + 1, updated_at = now()
         WHERE nft_id = $1 AND version = $6
         RETURNING version`,
        [nftId, JSON.stringify(aggregate), state, blendedScore, sampleCount, expectedVersion],
      );

      if (updateResult.rowCount === 0) {
        throw new ConflictError(nftId, expectedVersion);
      }
      return;
    }

    // No expected version: upsert without concurrency check (backward compatible).
    // Wrapped in a transaction to close the TOCTOU window between UPDATE and INSERT.
    await withTransaction(this.pool, async (client) => {
      const updateResult = await client.query(
        `UPDATE reputation_aggregates
         SET data = $2, state = $3, blended_score = $4, sample_count = $5,
             version = version + 1, updated_at = now()
         WHERE nft_id = $1
         RETURNING version`,
        [nftId, JSON.stringify(aggregate), state, blendedScore, sampleCount],
      );

      if (updateResult.rowCount === 0) {
        // Row doesn't exist — INSERT
        const insertResult = await client.query(
          `INSERT INTO reputation_aggregates (nft_id, data, state, blended_score, sample_count, version)
           VALUES ($1, $2, $3, $4, $5, 0)
           ON CONFLICT (nft_id) DO NOTHING
           RETURNING version`,
          [nftId, JSON.stringify(aggregate), state, blendedScore, sampleCount],
        );

        if (insertResult.rowCount === 0) {
          // Conflict: another process inserted between our UPDATE and INSERT
          const current = await client.query<{ version: number }>(
            'SELECT version FROM reputation_aggregates WHERE nft_id = $1',
            [nftId],
          );
          throw new ConflictError(nftId, current.rows[0]?.version ?? -1);
        }
      }
    });
  }

  async listCold(): Promise<
    Array<{ nftId: string; aggregate: ReputationAggregate }>
  > {
    const result = await this.pool.query<{
      nft_id: string;
      data: ReputationAggregate;
    }>("SELECT nft_id, data FROM reputation_aggregates WHERE state = 'cold'");
    return result.rows.map((row) => ({
      nftId: row.nft_id,
      aggregate: row.data,
    }));
  }

  async count(): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM reputation_aggregates',
    );
    return parseInt(result.rows[0].count, 10);
  }

  async listAll(): Promise<
    Array<{ nftId: string; aggregate: ReputationAggregate }>
  > {
    const result = await this.pool.query<{
      nft_id: string;
      data: ReputationAggregate;
    }>('SELECT nft_id, data FROM reputation_aggregates');
    return result.rows.map((row) => ({
      nftId: row.nft_id,
      aggregate: row.data,
    }));
  }

  async getTaskCohort(
    nftId: string,
    model: string,
    taskType: string,
  ): Promise<TaskTypeCohort | undefined> {
    const result = await this.pool.query<{ data: TaskTypeCohort }>(
      'SELECT data FROM reputation_task_cohorts WHERE nft_id = $1 AND model_id = $2 AND task_type = $3',
      [nftId, model, taskType],
    );
    return result.rows[0]?.data;
  }

  async putTaskCohort(nftId: string, cohort: TaskTypeCohort): Promise<void> {
    await this.pool.query(
      `INSERT INTO reputation_task_cohorts (nft_id, model_id, task_type, data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nft_id, model_id, task_type) DO UPDATE SET data = $4, updated_at = now()`,
      [nftId, cohort.model_id, cohort.task_type, JSON.stringify(cohort)],
    );
  }

  async appendEvent(nftId: string, event: ReputationEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO reputation_events (nft_id, event_type, data)
       VALUES ($1, $2, $3)`,
      [nftId, event.type, JSON.stringify(event)],
    );
  }

  async getEventHistory(nftId: string): Promise<ReputationEvent[]> {
    const result = await this.pool.query<{ data: ReputationEvent }>(
      'SELECT data FROM reputation_events WHERE nft_id = $1 ORDER BY id ASC',
      [nftId],
    );
    return result.rows.map((row) => row.data);
  }

  async transact<T>(fn: (store: ReputationStore) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, async () => {
      return fn(this);
    });
  }
}
