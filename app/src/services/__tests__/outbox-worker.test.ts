/**
 * Outbox Worker Unit Tests
 *
 * Tests transactional outbox insert, batch processing, retry semantics,
 * deduplication, and start/stop lifecycle.
 *
 * @since cycle-012 — Sprint 92, Task T-7.9
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutboxWorker } from '../outbox-worker.js';
import type { OutboxDeliveryFn, OutboxWorkerConfig } from '../outbox-worker.js';

// ---------------------------------------------------------------------------
// Mock Factories
// ---------------------------------------------------------------------------

/** Create a mock queryable client (for insert() calls within transactions). */
function createMockClient() {
  return {
    query: vi.fn(),
  };
}

/** Create a mock pool that returns controlled query results. */
function createMockPool() {
  const mockClient = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };

  const pool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    _mockClient: mockClient,
  };

  return pool;
}

/** Build a row that looks like a fleet_outbox database row. */
function makeOutboxRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    event_type: 'AGENT_SPAWNED',
    payload: { taskId: 'task-1', operatorId: 'op-1' },
    created_at: '2026-02-26T00:00:00Z',
    processed_at: null,
    retry_count: 0,
    dedup_key: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: OutboxWorker.insert()
// ---------------------------------------------------------------------------

describe('OutboxWorker.insert()', () => {
  it('creates entry with correct fields', async () => {
    const client = createMockClient();
    client.query.mockResolvedValueOnce({
      rows: [{ id: 'new-entry-uuid' }],
    });

    const id = await OutboxWorker.insert(
      client,
      'AGENT_SPAWNED',
      { taskId: 'task-1', operatorId: 'op-1' },
    );

    expect(id).toBe('new-entry-uuid');
    expect(client.query).toHaveBeenCalledTimes(1);

    const [sql, params] = client.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO fleet_outbox');
    expect(params[0]).toBe('AGENT_SPAWNED');
    expect(params[1]).toBe(JSON.stringify({ taskId: 'task-1', operatorId: 'op-1' }));
    expect(params[2]).toBeNull(); // no dedup key
  });

  it('with dedup_key prevents duplicates and returns existing id', async () => {
    const client = createMockClient();

    // INSERT returns no rows (conflict — dedup key already exists)
    client.query.mockResolvedValueOnce({ rows: [] });
    // SELECT for existing entry
    client.query.mockResolvedValueOnce({
      rows: [{ id: 'existing-entry-uuid' }],
    });

    const id = await OutboxWorker.insert(
      client,
      'AGENT_SPAWNED',
      { taskId: 'task-1' },
      'dedup-key-123',
    );

    expect(id).toBe('existing-entry-uuid');
    expect(client.query).toHaveBeenCalledTimes(2);

    // First call: INSERT with dedup key
    const [insertSql, insertParams] = client.query.mock.calls[0];
    expect(insertSql).toContain('ON CONFLICT (dedup_key) DO NOTHING');
    expect(insertParams[2]).toBe('dedup-key-123');

    // Second call: SELECT by dedup key
    const [selectSql, selectParams] = client.query.mock.calls[1];
    expect(selectSql).toContain('SELECT id FROM fleet_outbox');
    expect(selectParams[0]).toBe('dedup-key-123');
  });

  it('with dedup_key returns new id when no conflict', async () => {
    const client = createMockClient();
    client.query.mockResolvedValueOnce({
      rows: [{ id: 'fresh-entry-uuid' }],
    });

    const id = await OutboxWorker.insert(
      client,
      'AGENT_FAILED',
      { taskId: 'task-2' },
      'unique-dedup-key',
    );

    expect(id).toBe('fresh-entry-uuid');
    expect(client.query).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: OutboxWorker.processBatch()
// ---------------------------------------------------------------------------

describe('OutboxWorker.processBatch()', () => {
  let pool: ReturnType<typeof createMockPool>;
  let deliveryFn: ReturnType<typeof vi.fn>;
  let worker: OutboxWorker;

  beforeEach(() => {
    pool = createMockPool();
    deliveryFn = vi.fn().mockResolvedValue(undefined);
    worker = new OutboxWorker(pool as any, deliveryFn as OutboxDeliveryFn, {
      batchSize: 10,
      maxRetries: 5,
      pollIntervalMs: 5000,
    });
  });

  it('delivers entries and marks them as processed', async () => {
    const row = makeOutboxRow();

    // BEGIN succeeds
    pool._mockClient.query
      .mockResolvedValueOnce({ rows: [] })   // BEGIN
      .mockResolvedValueOnce({ rows: [row] }) // SELECT ... FOR UPDATE SKIP LOCKED
      .mockResolvedValueOnce({ rows: [] });   // COMMIT

    // UPDATE processed_at via pool.query (not client.query)
    pool.query.mockResolvedValueOnce({ rows: [] });

    const count = await worker.processBatch();

    expect(count).toBe(1);
    expect(deliveryFn).toHaveBeenCalledWith('AGENT_SPAWNED', {
      taskId: 'task-1',
      operatorId: 'op-1',
    });

    // Verify the UPDATE call to mark as processed
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE fleet_outbox SET processed_at'),
      ['entry-1'],
    );
  });

  it('increments retry_count on delivery failure', async () => {
    const row = makeOutboxRow({ retry_count: 2 });

    pool._mockClient.query
      .mockResolvedValueOnce({ rows: [] })   // BEGIN
      .mockResolvedValueOnce({ rows: [row] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });   // COMMIT

    deliveryFn.mockRejectedValueOnce(new Error('NATS connection refused'));

    // UPDATE retry_count via pool.query
    pool.query.mockResolvedValueOnce({ rows: [] });

    const count = await worker.processBatch();

    expect(count).toBe(0);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('retry_count = retry_count + 1'),
      ['entry-1', 'NATS connection refused'],
    );
  });

  it('skips entries at max retries (via SQL WHERE clause)', async () => {
    // The SQL query itself filters out entries at max retries
    // (retry_count < maxRetries). If all entries are at max retries,
    // the SELECT returns no rows.
    pool._mockClient.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // SELECT returns empty (all at max retries)
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const count = await worker.processBatch();

    expect(count).toBe(0);
    expect(deliveryFn).not.toHaveBeenCalled();
  });

  it('returns 0 with empty batch', async () => {
    pool._mockClient.query
      .mockResolvedValueOnce({ rows: [] })  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // SELECT — no unprocessed entries
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const count = await worker.processBatch();

    expect(count).toBe(0);
    expect(deliveryFn).not.toHaveBeenCalled();
  });

  it('delivery error does not crash the batch — other entries still processed', async () => {
    const row1 = makeOutboxRow({ id: 'entry-1', event_type: 'AGENT_SPAWNED' });
    const row2 = makeOutboxRow({ id: 'entry-2', event_type: 'AGENT_FAILED' });

    pool._mockClient.query
      .mockResolvedValueOnce({ rows: [] })          // BEGIN
      .mockResolvedValueOnce({ rows: [row1, row2] }) // SELECT
      .mockResolvedValueOnce({ rows: [] });          // COMMIT

    // First delivery fails, second succeeds
    deliveryFn
      .mockRejectedValueOnce(new Error('Delivery failed for entry-1'))
      .mockResolvedValueOnce(undefined);

    // First entry: UPDATE retry_count (failure path)
    pool.query.mockResolvedValueOnce({ rows: [] });
    // Second entry: UPDATE processed_at (success path)
    pool.query.mockResolvedValueOnce({ rows: [] });

    const count = await worker.processBatch();

    expect(count).toBe(1); // Only the second entry was delivered
    expect(deliveryFn).toHaveBeenCalledTimes(2);

    // First call: retry_count increment for entry-1
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('retry_count = retry_count + 1'),
      ['entry-1', 'Delivery failed for entry-1'],
    );

    // Second call: processed_at for entry-2
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('processed_at'),
      ['entry-2'],
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: start() / stop() lifecycle
// ---------------------------------------------------------------------------

describe('OutboxWorker start/stop lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start() begins polling and stop() halts it', () => {
    const pool = createMockPool();
    const deliveryFn = vi.fn().mockResolvedValue(undefined);
    const log = vi.fn();

    const worker = new OutboxWorker(pool as any, deliveryFn, {
      pollIntervalMs: 1000,
      log,
    });

    // Spy on processBatch — we use the prototype to intercept instance calls
    const processBatchSpy = vi.spyOn(worker, 'processBatch').mockResolvedValue(0);

    worker.start();

    expect(log).toHaveBeenCalledWith('info', expect.objectContaining({
      event: 'outbox_worker_started',
    }));

    // Advance timers past one interval
    vi.advanceTimersByTime(1001);
    expect(processBatchSpy).toHaveBeenCalledTimes(1);

    // Advance again
    vi.advanceTimersByTime(1000);
    expect(processBatchSpy).toHaveBeenCalledTimes(2);

    worker.stop();

    expect(log).toHaveBeenCalledWith('info', expect.objectContaining({
      event: 'outbox_worker_stopped',
    }));

    // After stop, no more calls
    vi.advanceTimersByTime(5000);
    expect(processBatchSpy).toHaveBeenCalledTimes(2);
  });

  it('start() is idempotent — calling twice does not double the interval', () => {
    const pool = createMockPool();
    const deliveryFn = vi.fn().mockResolvedValue(undefined);
    const worker = new OutboxWorker(pool as any, deliveryFn, {
      pollIntervalMs: 1000,
    });

    const processBatchSpy = vi.spyOn(worker, 'processBatch').mockResolvedValue(0);

    worker.start();
    worker.start(); // Second call should be a no-op

    vi.advanceTimersByTime(1001);
    expect(processBatchSpy).toHaveBeenCalledTimes(1); // Not 2
  });

  it('stop() is idempotent — calling twice does not throw', () => {
    const pool = createMockPool();
    const deliveryFn = vi.fn().mockResolvedValue(undefined);
    const worker = new OutboxWorker(pool as any, deliveryFn);

    worker.start();
    worker.stop();
    expect(() => worker.stop()).not.toThrow(); // Second stop is safe
  });
});
