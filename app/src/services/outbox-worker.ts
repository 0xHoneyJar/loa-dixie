/**
 * Outbox Worker — Transactional Outbox for Durable Event Delivery
 *
 * Polls the fleet_outbox table for unprocessed entries and delivers them
 * via a pluggable delivery function. Entries are inserted within the same
 * transaction as the state change (e.g. task status transition), ensuring
 * at-least-once delivery semantics.
 *
 * Pattern: Transactional Outbox (see SDD §7.3)
 *
 * - insert() is called within an existing transaction to atomically
 *   enqueue an event alongside a state change.
 * - processBatch() polls for unprocessed entries, delivers them, and
 *   marks them as processed. Failed deliveries increment retry_count.
 * - Entries at or above maxRetries are skipped (dead-lettered).
 * - Dedup keys prevent duplicate inserts for the same logical event.
 *
 * @since cycle-012 — Sprint 92, Task T-7.9
 */
import type { DbPool } from '../db/client.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single row in the fleet_outbox table. */
export interface OutboxEntry {
  readonly id: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
  readonly processedAt: string | null;
  readonly retryCount: number;
  readonly dedupKey: string | null;
}

/** Configuration for the OutboxWorker. */
export interface OutboxWorkerConfig {
  /** Polling interval in milliseconds (default: 5000). */
  readonly pollIntervalMs?: number;
  /** Maximum entries per batch (default: 10). */
  readonly batchSize?: number;
  /** Maximum delivery retries before skipping an entry (default: 5). */
  readonly maxRetries?: number;
  /** Base delay between poll cycles in milliseconds (default: 1000). */
  readonly retryDelayMs?: number;
  /** Optional structured logger. */
  readonly log?: (level: string, data: Record<string, unknown>) => void;
}

/** A function that delivers an event to an external system. */
export type OutboxDeliveryFn = (
  eventType: string,
  payload: Record<string, unknown>,
) => Promise<void>;

/** Queryable interface — accepts pg.PoolClient or pg.Pool. */
interface Queryable {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// OutboxWorker
// ---------------------------------------------------------------------------

/**
 * Outbox Worker — polls fleet_outbox and delivers events.
 *
 * @since cycle-012 — Sprint 92
 */
export class OutboxWorker {
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly log: (level: string, data: Record<string, unknown>) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly pool: DbPool,
    private readonly deliveryFn: OutboxDeliveryFn,
    config?: OutboxWorkerConfig,
  ) {
    this.pollIntervalMs = config?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.batchSize = config?.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.log = config?.log ?? (() => {});
  }

  // -------------------------------------------------------------------------
  // Static: Insert an outbox entry within an existing transaction
  // -------------------------------------------------------------------------

  /**
   * Insert an outbox entry atomically within the caller's transaction.
   *
   * Call this inside the same transaction as the state change to ensure
   * the event is enqueued if and only if the state change commits.
   *
   * @param client - A transactional database client (e.g. from withTransaction)
   * @param eventType - Event type identifier (e.g. 'AGENT_SPAWNED')
   * @param payload - Event payload (must be JSON-serializable)
   * @param dedupKey - Optional deduplication key (prevents duplicate inserts)
   * @returns The UUID of the inserted outbox entry
   */
  static async insert(
    client: Queryable,
    eventType: string,
    payload: Record<string, unknown>,
    dedupKey?: string,
  ): Promise<string> {
    const result = await client.query(
      `INSERT INTO fleet_outbox (event_type, payload, dedup_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (dedup_key) DO NOTHING
       RETURNING id`,
      [eventType, JSON.stringify(payload), dedupKey ?? null],
    );

    // If dedup conflict, look up the existing entry
    if (result.rows.length === 0) {
      const existing = await client.query(
        `SELECT id FROM fleet_outbox WHERE dedup_key = $1`,
        [dedupKey],
      );
      return String(existing.rows[0].id);
    }

    return String(result.rows[0].id);
  }

  // -------------------------------------------------------------------------
  // Lifecycle: start / stop
  // -------------------------------------------------------------------------

  /** Start the polling loop. Idempotent — calling start() twice is safe. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.log('info', { event: 'outbox_worker_started', pollIntervalMs: this.pollIntervalMs });

    this.timer = setInterval(() => {
      void this.processBatch().catch((err) => {
        this.log('error', {
          event: 'outbox_batch_error',
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, this.pollIntervalMs);
  }

  /** Stop the polling loop. Idempotent — calling stop() twice is safe. */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.log('info', { event: 'outbox_worker_stopped' });
  }

  // -------------------------------------------------------------------------
  // Core: Process one batch
  // -------------------------------------------------------------------------

  /**
   * Process one batch of unprocessed outbox entries.
   *
   * Algorithm:
   * 1. SELECT unprocessed entries (FOR UPDATE SKIP LOCKED for concurrency)
   * 2. For each entry: call deliveryFn(eventType, payload)
   * 3. On success: mark as processed (SET processed_at = NOW())
   * 4. On failure: increment retry_count and record the error
   * 5. Skip entries where retry_count >= maxRetries
   *
   * @returns Number of entries successfully delivered in this batch
   */
  async processBatch(): Promise<number> {
    const client = await this.pool.connect();
    let delivered = 0;

    try {
      // Fetch a batch of unprocessed entries that haven't exceeded max retries.
      // FOR UPDATE SKIP LOCKED allows concurrent workers without contention.
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT id, event_type, payload, created_at, processed_at, retry_count, dedup_key
         FROM fleet_outbox
         WHERE processed_at IS NULL
           AND retry_count < $1
         ORDER BY created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [this.maxRetries, this.batchSize],
      );

      await client.query('COMMIT');

      // Process each entry individually (outside the lock transaction)
      for (const row of rows) {
        const entry = this.rowToEntry(row);

        try {
          await this.deliveryFn(entry.eventType, entry.payload);

          // Mark as processed
          await this.pool.query(
            `UPDATE fleet_outbox SET processed_at = NOW() WHERE id = $1`,
            [entry.id],
          );

          delivered++;
          this.log('info', {
            event: 'outbox_entry_delivered',
            entryId: entry.id,
            eventType: entry.eventType,
          });
        } catch (err) {
          // Increment retry count and record the error
          const errorMsg = err instanceof Error ? err.message : String(err);
          await this.pool.query(
            `UPDATE fleet_outbox SET retry_count = retry_count + 1, error = $2 WHERE id = $1`,
            [entry.id, errorMsg],
          );

          this.log('warn', {
            event: 'outbox_delivery_failed',
            entryId: entry.id,
            eventType: entry.eventType,
            retryCount: entry.retryCount + 1,
            error: errorMsg,
          });
        }
      }
    } catch (err) {
      // Ensure transaction is rolled back if the SELECT/COMMIT fails
      try {
        await client.query('ROLLBACK');
      } catch {
        // ROLLBACK failure must not mask the original error
      }
      throw err;
    } finally {
      client.release();
    }

    return delivered;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Map a database row to an OutboxEntry. */
  private rowToEntry(row: Record<string, unknown>): OutboxEntry {
    return {
      id: String(row.id),
      eventType: String(row.event_type),
      payload: (typeof row.payload === 'string'
        ? JSON.parse(row.payload)
        : row.payload) as Record<string, unknown>,
      createdAt: String(row.created_at),
      processedAt: row.processed_at != null ? String(row.processed_at) : null,
      retryCount: Number(row.retry_count),
      dedupKey: row.dedup_key != null ? String(row.dedup_key) : null,
    };
  }
}
