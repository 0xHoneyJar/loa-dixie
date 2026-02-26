/**
 * Fleet API Routes — Hono sub-app for fleet orchestration endpoints.
 *
 * Routes delegate to ConductorEngine for all fleet operations.
 * Tenant isolation: default scope is caller-only (operatorId from context),
 * ?all=true requires admin privileges.
 *
 * See: SDD §6.3 (API Routes), §6.4 (spawn endpoint), §6.5 (task endpoints)
 * @since cycle-012 — Sprint 91, Tasks T-6.3, T-6.4, T-6.5
 */
import { Hono } from 'hono';

import type { ConductorEngine } from '../services/conductor-engine.js';
import { SpawnDeniedError, TaskNotFoundError, ActiveTaskDeletionError } from '../services/conductor-engine.js';
import { TIER_ORDER } from '../types/conviction.js';
import type { ConvictionTier } from '../types/conviction.js';
import type { TaskType, AgentType } from '../types/fleet.js';

const VALID_TIERS: ReadonlySet<string> = new Set(TIER_ORDER);

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface FleetRouteDeps {
  conductor: ConductorEngine;
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

const VALID_TASK_TYPES = ['bug_fix', 'feature', 'refactor', 'review', 'docs'] as const;
const VALID_TASK_TYPES_SET: Set<string> = new Set(VALID_TASK_TYPES);

const VALID_AGENT_TYPES = ['claude_code', 'codex', 'gemini'] as const;
const VALID_AGENT_TYPES_SET: Set<string> = new Set(VALID_AGENT_TYPES);

function isValidTaskType(v: unknown): v is TaskType {
  return typeof v === 'string' && VALID_TASK_TYPES_SET.has(v);
}

function isValidAgentType(v: unknown): v is AgentType {
  return typeof v === 'string' && VALID_AGENT_TYPES_SET.has(v);
}

/** Path param safety: alphanumeric, hyphens, underscores only. */
const PATH_PARAM_RE = /^[a-zA-Z0-9_-]+$/;

function isValidId(value: string): boolean {
  return PATH_PARAM_RE.test(value) && value.length > 0 && value.length <= 128;
}

// ---------------------------------------------------------------------------
// Route Factory
// ---------------------------------------------------------------------------

/**
 * Create fleet API routes.
 *
 * Expects upstream middleware/proxy to set request headers:
 * - x-operator-id: string — the authenticated caller's operator ID
 * - x-operator-tier: ConvictionTier — the caller's conviction tier (validated at route level)
 * - c.get('isFleetAdmin'): boolean — admin flag set by fleet-auth middleware
 */
export function createFleetRoutes(deps: FleetRouteDeps): Hono {
  const { conductor } = deps;
  const fleet = new Hono();

  // -------------------------------------------------------------------------
  // POST /spawn — Create new fleet task
  // -------------------------------------------------------------------------

  fleet.post('/spawn', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    const operatorTierRaw = c.req.header('x-operator-tier');
    const operatorTier: ConvictionTier | undefined = operatorTierRaw && VALID_TIERS.has(operatorTierRaw)
      ? operatorTierRaw as ConvictionTier
      : undefined;

    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    if (!operatorTier) {
      return c.json({ error: 'unauthorized', message: 'Operator tier required' }, 401);
    }

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json({ error: 'invalid_request', message: 'Invalid request body' }, 400);
    }

    const { description, taskType, repository } = body as Record<string, unknown>;

    // Validate required fields
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return c.json({ error: 'invalid_request', message: 'description is required' }, 400);
    }

    if (!isValidTaskType(taskType)) {
      return c.json({
        error: 'invalid_request',
        message: `taskType must be one of: ${VALID_TASK_TYPES.join(', ')}`,
      }, 400);
    }

    if (!repository || typeof repository !== 'string' || repository.trim().length === 0) {
      return c.json({ error: 'invalid_request', message: 'repository is required' }, 400);
    }

    // Validate optional fields
    const { agentType, model, baseBranch, maxRetries, timeoutMinutes, contextOverrides } =
      body as Record<string, unknown>;

    if (agentType !== undefined && !isValidAgentType(agentType)) {
      return c.json({
        error: 'invalid_request',
        message: `agentType must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
      }, 400);
    }

    if (model !== undefined && typeof model !== 'string') {
      return c.json({ error: 'invalid_request', message: 'model must be a string' }, 400);
    }

    try {
      const result = await conductor.spawn(
        {
          operatorId,
          description: description as string,
          taskType: taskType as TaskType,
          repository: repository as string,
          baseBranch: typeof baseBranch === 'string' ? baseBranch : undefined,
          agentType: agentType as AgentType | undefined,
          model: typeof model === 'string' ? model : undefined,
          maxRetries: typeof maxRetries === 'number' ? maxRetries : undefined,
          timeoutMinutes: typeof timeoutMinutes === 'number' ? timeoutMinutes : undefined,
          contextOverrides: contextOverrides as Record<string, string> | undefined,
        },
        operatorTier,
      );

      return c.json(result, 201);
    } catch (err) {
      if (err instanceof SpawnDeniedError) {
        return c.json({
          error: 'spawn_denied',
          message: err.message,
          tier: err.tier,
          activeCount: err.activeCount,
          tierLimit: err.tierLimit,
        }, 403);
      }
      return c.json({ error: 'internal_error', message: 'Spawn failed' }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // GET /status — Fleet status summary
  // -------------------------------------------------------------------------

  fleet.get('/status', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    const isAdmin = c.req.header('x-fleet-admin') === 'true';
    const showAll = c.req.query('all') === 'true';

    // Non-admin can only see their own tasks
    const scopedOperatorId = (showAll && isAdmin) ? undefined : operatorId;

    const status = await conductor.getStatus(scopedOperatorId);
    return c.json(status);
  });

  // -------------------------------------------------------------------------
  // GET /tasks/:id — Task detail
  // -------------------------------------------------------------------------

  fleet.get('/tasks/:id', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    const taskId = c.req.param('id');
    if (!isValidId(taskId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid task ID' }, 400);
    }

    const task = await conductor.getTask(taskId);
    if (!task) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    // Tenant isolation: non-admin can only see their own tasks
    const isAdmin = c.req.header('x-fleet-admin') === 'true';
    if (task.operatorId !== operatorId && !isAdmin) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    return c.json(task);
  });

  // -------------------------------------------------------------------------
  // POST /tasks/:id/stop — Stop task
  // -------------------------------------------------------------------------

  fleet.post('/tasks/:id/stop', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    const taskId = c.req.param('id');
    if (!isValidId(taskId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid task ID' }, 400);
    }

    // Verify ownership before stopping
    const task = await conductor.getTask(taskId);
    if (!task) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    const isAdmin = c.req.header('x-fleet-admin') === 'true';
    if (task.operatorId !== operatorId && !isAdmin) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    try {
      await conductor.stopTask(taskId);
      return c.json({ ok: true, taskId, status: 'cancelled' });
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return c.json({ error: 'not_found', message: err.message }, 404);
      }
      return c.json({ error: 'internal_error', message: 'Failed to stop task' }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // GET /tasks/:id/logs — Task logs
  // -------------------------------------------------------------------------

  fleet.get('/tasks/:id/logs', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    const taskId = c.req.param('id');
    if (!isValidId(taskId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid task ID' }, 400);
    }

    // Verify ownership before showing logs
    const task = await conductor.getTask(taskId);
    if (!task) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    const isAdmin = c.req.header('x-fleet-admin') === 'true';
    if (task.operatorId !== operatorId && !isAdmin) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    const linesParam = c.req.query('lines');
    const lines = linesParam ? parseInt(linesParam, 10) : undefined;

    try {
      const logs = await conductor.getTaskLogs(taskId, lines);
      return c.json({ taskId, logs });
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return c.json({ error: 'not_found', message: err.message }, 404);
      }
      return c.json({ error: 'internal_error', message: 'Failed to get task logs' }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /tasks/:id — Delete task
  // -------------------------------------------------------------------------

  fleet.delete('/tasks/:id', async (c) => {
    const operatorId = c.req.header('x-operator-id');
    if (!operatorId) {
      return c.json({ error: 'unauthorized', message: 'Operator ID required' }, 401);
    }

    const taskId = c.req.param('id');
    if (!isValidId(taskId)) {
      return c.json({ error: 'invalid_request', message: 'Invalid task ID' }, 400);
    }

    // Verify ownership before deleting
    const task = await conductor.getTask(taskId);
    if (!task) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    const isAdmin = c.req.header('x-fleet-admin') === 'true';
    if (task.operatorId !== operatorId && !isAdmin) {
      return c.json({ error: 'not_found', message: `Task ${taskId} not found` }, 404);
    }

    try {
      await conductor.deleteTask(taskId);
      return c.json({ ok: true, taskId });
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        return c.json({ error: 'not_found', message: err.message }, 404);
      }
      if (err instanceof ActiveTaskDeletionError) {
        return c.json({
          error: 'conflict',
          message: err.message,
          status: err.status,
        }, 409);
      }
      return c.json({ error: 'internal_error', message: 'Failed to delete task' }, 500);
    }
  });

  return fleet;
}

export { createFleetRoutes as fleet };
