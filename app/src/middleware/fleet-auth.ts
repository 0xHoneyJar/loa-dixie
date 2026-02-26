/**
 * Fleet Auth Middleware — Sets PG session variables for RLS
 *
 * Extracts operator identity from JWT (via wallet set by jwt middleware)
 * and sets `app.operator_id` in the PG transaction context so RLS policies
 * can enforce tenant isolation at the database level.
 *
 * See: SDD §5.1 (RLS), Sprint 86 T-1.12 (Flatline SKP-008)
 * @since cycle-012 — Sprint 86, Task T-1.12
 */
import { createMiddleware } from 'hono/factory';
import type { DbPool } from '../db/client.js';

/**
 * Create middleware that sets PG session variables for RLS enforcement.
 *
 * Must be placed AFTER jwt middleware (which sets c.get('wallet')).
 * Sets `app.operator_id` to the wallet address from the JWT sub claim.
 * Admin detection via `app.is_admin` is based on the admin header/role.
 */
export function createFleetAuthMiddleware(pool: DbPool) {
  return createMiddleware(async (c, next) => {
    const wallet = c.get('wallet');

    if (!wallet) {
      return c.json({ error: 'unauthorized', message: 'Fleet operations require authentication' }, 401);
    }

    // Store operator ID on context for route-level access
    c.set('operatorId', wallet);

    // Check admin status (set by admin-key middleware)
    const isAdmin = c.get('isAdmin') === true;
    c.set('isFleetAdmin', isAdmin);

    // Set PG session variables for RLS
    // These are set per-connection when needed by the TaskRegistry
    c.set('fleetDbContext', {
      operatorId: wallet,
      isAdmin,
    });

    await next();
  });
}

/**
 * Set PG session variables for RLS on a specific client connection.
 * Call this before any query that relies on RLS policies.
 */
export async function setFleetDbContext(
  client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  operatorId: string,
  isAdmin: boolean,
): Promise<void> {
  await client.query(`SET LOCAL app.operator_id = $1`, [operatorId]);
  await client.query(`SET LOCAL app.is_admin = $1`, [isAdmin ? 'true' : 'false']);
}
