/**
 * Migration Runner — Forward-only SQL migration framework.
 *
 * Discovers SQL files in `migrations/`, tracks applied migrations in a
 * `_migrations` table, and applies pending ones in order. Handles existing
 * migrations (003, 004) retroactively by seeding the tracking table.
 *
 * Design principles:
 * - Forward-only: no rollbacks (aligns with DynamicContract monotonic expansion)
 * - Idempotent: re-running migrate() is always safe
 * - Checksum verification: warns if applied migration files change
 *
 * @since cycle-009 Sprint 1 — Task 1.1 (FR-13)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import type { DbPool } from './client.js';

/**
 * Compute a deterministic advisory lock ID from an application name.
 * Uses a simple hash to map a string to a 31-bit positive integer,
 * preventing cross-app collisions in shared PostgreSQL clusters.
 * @since cycle-014 Sprint 105 — BB-DEEP-04
 */
function computeLockId(appName: string): number {
  const hash = createHash('sha256').update(appName).digest();
  // Read first 4 bytes as unsigned 32-bit integer, mask to 31-bit positive
  return hash.readUInt32BE(0) & 0x7FFFFFFF;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');

export interface MigrationResult {
  /** Filenames of newly applied migrations. */
  applied: string[];
  /** Filenames of previously applied migrations (skipped). */
  skipped: string[];
  /** Total migration files discovered. */
  total: number;
  /** Warnings (e.g., checksum mismatches). */
  warnings: string[];
}

/**
 * Compute SHA-256 checksum of migration file content.
 */
function computeChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Ensure the _migrations tracking table exists.
 */
async function ensureMigrationsTable(pool: DbPool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

/**
 * Get all previously applied migrations from the tracking table.
 */
async function getAppliedMigrations(
  pool: DbPool,
): Promise<Map<string, string>> {
  const result = await pool.query<{ filename: string; checksum: string }>(
    'SELECT filename, checksum FROM _migrations ORDER BY id',
  );
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.filename, row.checksum);
  }
  return map;
}

/**
 * Discover SQL migration files from the migrations directory, sorted numerically.
 */
async function discoverMigrations(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter((f) => f.endsWith('.sql') && !f.includes('_down'))
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0], 10);
      const numB = parseInt(b.split('_')[0], 10);
      return numA - numB;
    });
}

/**
 * Seed the _migrations table for pre-existing migrations.
 *
 * Checks if tables created by migrations 003 and 004 exist but aren't
 * tracked. If so, seeds the tracking table with their checksums.
 */
async function seedExistingMigrations(
  pool: DbPool,
  applied: Map<string, string>,
  migrationFiles: string[],
): Promise<string[]> {
  const seeded: string[] = [];

  // Map of migration filename -> table it creates
  const knownTables: Record<string, string> = {
    '003_schedules.sql': 'schedules',
    '004_autonomous_permissions.sql': 'autonomous_permissions',
  };

  for (const [filename, tableName] of Object.entries(knownTables)) {
    if (applied.has(filename)) continue;
    if (!migrationFiles.includes(filename)) continue;

    // Check if the table exists (created outside migration tracking)
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists`,
      [tableName],
    );

    if (tableCheck.rows[0]?.exists) {
      const content = await readFile(join(MIGRATIONS_DIR, filename), 'utf-8');
      const checksum = computeChecksum(content);
      await pool.query(
        'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2) ON CONFLICT (filename) DO NOTHING',
        [filename, checksum],
      );
      applied.set(filename, checksum);
      seeded.push(filename);
    }
  }

  return seeded;
}

/**
 * Run all pending migrations in order.
 *
 * @param pool - PostgreSQL connection pool
 * @returns Migration result with applied/skipped counts and warnings
 */
export async function migrate(pool: DbPool): Promise<MigrationResult> {
  const result: MigrationResult = {
    applied: [],
    skipped: [],
    total: 0,
    warnings: [],
  };

  // 0. Acquire advisory lock (prevents concurrent migration across replicas)
  // BB-DEEP-04: Lock ID derived from app name hash for collision-resistance.
  // Prevents cross-app collisions in shared PostgreSQL clusters.
  const MIGRATION_LOCK_ID = computeLockId('dixie-bff:migration');
  const LOCK_TIMEOUT_MS = 30_000;
  const lockClient = await pool.connect();
  let lockAcquired = false;
  try {
    await lockClient.query(`SELECT set_config('lock_timeout', $1, false)`, [`${LOCK_TIMEOUT_MS}ms`]);
    try {
      await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
      lockAcquired = true;
    } catch {
      throw new Error(
        `Failed to acquire migration lock within ${LOCK_TIMEOUT_MS}ms. ` +
          'Another instance may be migrating. Check and retry.',
      );
    }
  } catch (err) {
    // S5-F17: Single release point — avoid double-release on lock failure
    if (!lockAcquired) {
      lockClient.release();
    }
    throw err;
  }

  try {
    // S6-T2: Reset lock_timeout INSIDE the outer try block so that if this
    // fails, the finally block still releases the advisory lock and client.
    // Previously at line 178 in the inner try — a failure there would skip
    // the outer try/finally entirely, leaking the lock client.
    await lockClient.query("SET lock_timeout = '0'");
    // 1. Ensure tracking table exists
    await ensureMigrationsTable(pool);

    // 2. Get applied migrations
    const applied = await getAppliedMigrations(pool);

    // 3. Discover migration files
    const migrationFiles = await discoverMigrations();
    result.total = migrationFiles.length;

    // 4. Seed pre-existing migrations (003, 004) if tables exist but aren't tracked
    const seeded = await seedExistingMigrations(pool, applied, migrationFiles);
    for (const filename of seeded) {
      result.skipped.push(filename);
    }

    // 5. Apply pending migrations in order
    for (const filename of migrationFiles) {
      const content = await readFile(join(MIGRATIONS_DIR, filename), 'utf-8');
      const checksum = computeChecksum(content);

      const existingChecksum = applied.get(filename);
      if (existingChecksum !== undefined) {
        // Already applied — verify checksum
        if (existingChecksum !== checksum) {
          result.warnings.push(
            `Checksum mismatch for ${filename}: expected ${existingChecksum}, got ${checksum}. Migration file has changed after application.`,
          );
        }
        if (!seeded.includes(filename)) {
          result.skipped.push(filename);
        }
        continue;
      }

      // Apply migration
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(content);
        await client.query(
          'INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum],
        );
        await client.query('COMMIT');
        result.applied.push(filename);
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ROLLBACK failure must not mask the original migration error
        }
        throw new Error(
          `Migration ${filename} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        client.release();
      }
    }

    return result;
  } finally {
    // Release advisory lock
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [
        MIGRATION_LOCK_ID,
      ]);
    } catch {
      // Unlock failure must not mask migration result
    }
    lockClient.release();
  }
}
