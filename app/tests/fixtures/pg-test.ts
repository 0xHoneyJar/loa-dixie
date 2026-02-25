/**
 * PostgreSQL Test Fixture — Shared test infrastructure for PG-backed tests.
 *
 * Provides helpers for setting up a test database, running migrations,
 * and cleaning tables between tests. Uses TEST_DATABASE_URL env var
 * with a localhost fallback.
 *
 * For unit tests, use the mock pool from `createMockPool()`.
 * For integration tests (when PG is available), use `setupTestDb()`.
 *
 * @since cycle-009 Sprint 1 — Task 1.6 (FR-1)
 */
import { vi } from 'vitest';
import type { DbPool } from '../../src/db/client.js';

/**
 * Test database URL — uses env var or falls back to localhost.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/dixie_test';

/**
 * Create a mock PostgreSQL pool for unit tests.
 *
 * Returns a mock pool that tracks queries and supports configurable
 * responses via the `mockQueryResponse` helper.
 */
export function createMockPool(): DbPool & {
  _queries: Array<{ text: string; values?: unknown[] }>;
  _mockResponses: Map<string, { rows: unknown[]; rowCount: number }>;
  _setResponse: (
    pattern: string,
    response: { rows: unknown[]; rowCount: number },
  ) => void;
  _mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
} {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const mockResponses = new Map<
    string,
    { rows: unknown[]; rowCount: number }
  >();

  const mockClient = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      // Check for matching mock response
      for (const [pattern, response] of mockResponses) {
        if (text.includes(pattern)) {
          return response;
        }
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };

  const pool = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      // Check for matching mock response
      for (const [pattern, response] of mockResponses) {
        if (text.includes(pattern)) {
          return response;
        }
      }
      return { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(async () => mockClient),
    end: vi.fn(async () => {}),
    on: vi.fn(),
    _queries: queries,
    _mockResponses: mockResponses,
    _setResponse: (
      pattern: string,
      response: { rows: unknown[]; rowCount: number },
    ) => {
      mockResponses.set(pattern, response);
    },
    _mockClient: mockClient,
  } as unknown as DbPool & {
    _queries: Array<{ text: string; values?: unknown[] }>;
    _mockResponses: Map<string, { rows: unknown[]; rowCount: number }>;
    _setResponse: (
      pattern: string,
      response: { rows: unknown[]; rowCount: number },
    ) => void;
    _mockClient: {
      query: ReturnType<typeof vi.fn>;
      release: ReturnType<typeof vi.fn>;
    };
  };

  return pool;
}

/**
 * Table names used by the reputation system.
 * Used for cleanup between tests.
 */
export const REPUTATION_TABLES = [
  'reputation_aggregates',
  'reputation_task_cohorts',
  'reputation_events',
] as const;

/**
 * Clean (truncate) all reputation tables.
 * For use with real PG connections in integration tests.
 */
export async function cleanTables(pool: DbPool): Promise<void> {
  await pool.query(
    `TRUNCATE ${REPUTATION_TABLES.join(', ')} CASCADE`,
  );
}
