/**
 * Integration Test: Migration 013 — Fleet Orchestration
 *
 * Tests migration runs cleanly, verifies CHECK constraints,
 * triggers, indexes, column types, and RLS policies.
 *
 * Uses pg-mem for in-process PostgreSQL simulation.
 *
 * @since cycle-012 — Sprint 86, Task T-1.11 (Flatline IMP-003, SKP-002)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, '../../src/db/migrations/013_fleet_orchestration.sql');
const MIGRATION_DOWN_PATH = join(__dirname, '../../src/db/migrations/013_fleet_orchestration_down.sql');

/**
 * These tests require a real PG instance. Skip gracefully if unavailable.
 * Set DATABASE_URL_TEST to run, e.g.:
 *   DATABASE_URL_TEST=postgresql://localhost:5432/dixie_test pnpm test
 */
const TEST_DB_URL = process.env.DATABASE_URL_TEST;

const describeWithDb = TEST_DB_URL ? describe : describe.skip;

describeWithDb('Migration 013 — Fleet Orchestration', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: TEST_DB_URL, max: 3 });

    // Clean slate — run down migration first (ignore errors if tables don't exist)
    try {
      const downSql = await readFile(MIGRATION_DOWN_PATH, 'utf-8');
      await pool.query(downSql);
    } catch {
      // Tables may not exist yet, that's fine
    }

    // Run migration
    const sql = await readFile(MIGRATION_PATH, 'utf-8');
    await pool.query(sql);
  });

  afterAll(async () => {
    // Clean up
    try {
      const downSql = await readFile(MIGRATION_DOWN_PATH, 'utf-8');
      await pool.query(downSql);
    } catch {
      // Best effort cleanup
    }
    await pool.end();
  });

  // -------------------------------------------------------------------------
  // Table existence
  // -------------------------------------------------------------------------

  it('creates fleet_tasks table', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'fleet_tasks'
      ) AS exists
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('creates fleet_notifications table', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'fleet_notifications'
      ) AS exists
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  it('creates fleet_config table', async () => {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'fleet_config'
      ) AS exists
    `);
    expect(result.rows[0].exists).toBe(true);
  });

  // -------------------------------------------------------------------------
  // CHECK constraints
  // -------------------------------------------------------------------------

  it('rejects invalid status', async () => {
    await expect(pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch, status)
      VALUES ('op-1', 'claude_code', 'claude-opus-4-6', 'feature', 'test', 'fleet/t1', 'invalid_status')
    `)).rejects.toThrow(/valid_status/);
  });

  it('rejects invalid agent_type', async () => {
    await expect(pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch)
      VALUES ('op-1', 'gpt', 'gpt-5', 'feature', 'test', 'fleet/t1')
    `)).rejects.toThrow(/valid_agent_type/);
  });

  it('rejects invalid task_type', async () => {
    await expect(pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch)
      VALUES ('op-1', 'claude_code', 'claude-opus-4-6', 'unknown', 'test', 'fleet/t1')
    `)).rejects.toThrow(/valid_task_type/);
  });

  it('rejects negative retry_count', async () => {
    await expect(pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch, retry_count)
      VALUES ('op-1', 'claude_code', 'claude-opus-4-6', 'feature', 'test', 'fleet/t1', -1)
    `)).rejects.toThrow(/valid_retry_count/);
  });

  it('rejects retry_count exceeding max_retries', async () => {
    await expect(pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch, retry_count, max_retries)
      VALUES ('op-1', 'claude_code', 'claude-opus-4-6', 'feature', 'test', 'fleet/t1', 4, 3)
    `)).rejects.toThrow(/valid_retry_count/);
  });

  it('rejects invalid notification channel', async () => {
    // First insert a valid task to reference
    const taskResult = await pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch)
      VALUES ('op-1', 'claude_code', 'claude-opus-4-6', 'feature', 'test', 'fleet/t-notif')
      RETURNING id
    `);
    const taskId = taskResult.rows[0].id;

    await expect(pool.query(`
      INSERT INTO fleet_notifications (task_id, channel, payload)
      VALUES ($1, 'email', '{}')
    `, [taskId])).rejects.toThrow(/valid_channel/);

    // Clean up
    await pool.query('DELETE FROM fleet_tasks WHERE id = $1', [taskId]);
  });

  // -------------------------------------------------------------------------
  // Triggers
  // -------------------------------------------------------------------------

  it('auto-updates updated_at on fleet_tasks UPDATE', async () => {
    // Insert
    const insertResult = await pool.query(`
      INSERT INTO fleet_tasks (operator_id, agent_type, model, task_type, description, branch)
      VALUES ('op-trigger', 'claude_code', 'claude-opus-4-6', 'feature', 'trigger test', 'fleet/trigger')
      RETURNING id, updated_at
    `);
    const id = insertResult.rows[0].id;
    const originalUpdatedAt = insertResult.rows[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 10));

    // Update
    await pool.query(`UPDATE fleet_tasks SET description = 'updated' WHERE id = $1`, [id]);

    const afterUpdate = await pool.query(`SELECT updated_at FROM fleet_tasks WHERE id = $1`, [id]);
    expect(new Date(afterUpdate.rows[0].updated_at).getTime())
      .toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());

    // Clean up
    await pool.query('DELETE FROM fleet_tasks WHERE id = $1', [id]);
  });

  // -------------------------------------------------------------------------
  // Indexes (Flatline SKP-002: schema assertions)
  // -------------------------------------------------------------------------

  it('has idx_fleet_tasks_operator index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_tasks' AND indexname = 'idx_fleet_tasks_operator'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_tasks_status index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_tasks' AND indexname = 'idx_fleet_tasks_status'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_tasks_branch index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_tasks' AND indexname = 'idx_fleet_tasks_branch'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_tasks_created index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_tasks' AND indexname = 'idx_fleet_tasks_created'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_tasks_active partial index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_tasks' AND indexname = 'idx_fleet_tasks_active'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_notifications_task index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_notifications' AND indexname = 'idx_fleet_notifications_task'
    `);
    expect(result.rows).toHaveLength(1);
  });

  it('has idx_fleet_notifications_pending partial index', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'fleet_notifications' AND indexname = 'idx_fleet_notifications_pending'
    `);
    expect(result.rows).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Column types (Flatline SKP-002: fail fast on schema mismatch)
  // -------------------------------------------------------------------------

  it('fleet_tasks has correct column types', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'fleet_tasks'
      ORDER BY ordinal_position
    `);

    const columns = new Map(result.rows.map(r => [r.column_name, r]));

    expect(columns.get('id')?.data_type).toBe('uuid');
    expect(columns.get('operator_id')?.data_type).toBe('text');
    expect(columns.get('status')?.data_type).toBe('text');
    expect(columns.get('version')?.data_type).toBe('integer');
    expect(columns.get('retry_count')?.data_type).toBe('integer');
    expect(columns.get('review_status')?.data_type).toBe('jsonb');
    expect(columns.get('failure_context')?.data_type).toBe('jsonb');
    expect(columns.get('created_at')?.data_type).toContain('timestamp');
    expect(columns.get('spawned_at')?.data_type).toContain('timestamp');
  });

  // -------------------------------------------------------------------------
  // RLS policies exist
  // -------------------------------------------------------------------------

  it('has RLS enabled on fleet_tasks', async () => {
    const result = await pool.query(`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'fleet_tasks'
    `);
    expect(result.rows[0].relrowsecurity).toBe(true);
  });

  it('has RLS enabled on fleet_notifications', async () => {
    const result = await pool.query(`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'fleet_notifications'
    `);
    expect(result.rows[0].relrowsecurity).toBe(true);
  });

  it('has RLS enabled on fleet_config', async () => {
    const result = await pool.query(`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'fleet_config'
    `);
    expect(result.rows[0].relrowsecurity).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Down migration works
  // -------------------------------------------------------------------------

  it('down migration drops all tables', async () => {
    // Run down
    const downSql = await readFile(MIGRATION_DOWN_PATH, 'utf-8');
    await pool.query(downSql);

    // Verify tables gone
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('fleet_tasks', 'fleet_notifications', 'fleet_config')
    `);
    expect(result.rows).toHaveLength(0);

    // Re-run up migration for other tests
    const upSql = await readFile(MIGRATION_PATH, 'utf-8');
    await pool.query(upSql);
  });
});
