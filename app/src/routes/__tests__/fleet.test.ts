/**
 * Fleet API Route Tests — Hono endpoint behavior verification
 *
 * Tests route-level concerns: request validation, status codes, tenant
 * isolation, error mapping. Uses Hono's test client for in-process HTTP.
 *
 * All ConductorEngine methods are mocked with vi.fn().
 *
 * @since cycle-012 — Sprint 91, Task T-6.6
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createFleetRoutes } from '../fleet.js';
import { SpawnDeniedError } from '../../services/fleet-governor.js';
import { TaskNotFoundError, ActiveTaskDeletionError } from '../../services/task-registry.js';
import type { FleetTaskRecord } from '../../types/fleet.js';

// ---------------------------------------------------------------------------
// Mock Conductor
// ---------------------------------------------------------------------------

function makeTaskRecord(overrides: Partial<FleetTaskRecord> = {}): FleetTaskRecord {
  return {
    id: 'task-001',
    operatorId: 'operator-1',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    description: 'Build the thing',
    branch: 'fleet/task-001',
    worktreePath: '/tmp/fleet/task-001',
    containerId: null,
    tmuxSession: 'fleet-task-001',
    status: 'running',
    version: 1,
    prNumber: null,
    ciStatus: null,
    reviewStatus: null,
    retryCount: 0,
    maxRetries: 3,
    contextHash: null,
    failureContext: null,
    spawnedAt: '2026-02-26T00:00:00Z',
    agentIdentityId: null,
    completedAt: null,
    createdAt: '2026-02-26T00:00:00Z',
    updatedAt: '2026-02-26T00:00:00Z',
    groupId: null,
    ...overrides,
  };
}

function createMockConductor() {
  return {
    spawn: vi.fn().mockResolvedValue({
      taskId: 'task-001',
      branch: 'fleet/task-001',
      worktreePath: '/tmp/fleet/task-001',
      agentType: 'claude_code',
      model: 'claude-opus-4-6',
      status: 'spawning',
    }),
    getStatus: vi.fn().mockResolvedValue({
      activeTasks: 2,
      completedTasks: 1,
      failedTasks: 0,
      tasks: [],
    }),
    getTask: vi.fn().mockResolvedValue(makeTaskRecord()),
    stopTask: vi.fn().mockResolvedValue(undefined),
    getTaskLogs: vi.fn().mockResolvedValue('log output here'),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
    shutdown: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Test Helper
// ---------------------------------------------------------------------------

function buildApp(conductor: ReturnType<typeof createMockConductor>) {
  const app = new Hono();
  // Simulate fleet-auth middleware: populate isFleetAdmin from header
  app.use('/fleet/*', async (c, next) => {
    c.set('isFleetAdmin', c.req.header('x-fleet-admin') === 'true');
    await next();
  });
  const fleetRoutes = createFleetRoutes({ conductor: conductor as any });
  app.route('/fleet', fleetRoutes);
  return app;
}

function authHeaders(
  operatorId = 'operator-1',
  opts: { tier?: string; admin?: boolean } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-operator-id': operatorId,
    'x-operator-tier': opts.tier ?? 'architect',
  };
  if (opts.admin) {
    headers['x-fleet-admin'] = 'true';
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Fleet API Routes', () => {
  let conductor: ReturnType<typeof createMockConductor>;
  let app: Hono;

  beforeEach(() => {
    vi.restoreAllMocks();
    conductor = createMockConductor();
    app = buildApp(conductor);
  });

  // -------------------------------------------------------------------------
  // POST /fleet/spawn
  // -------------------------------------------------------------------------

  describe('POST /fleet/spawn', () => {
    const validBody = {
      description: 'Fix the login bug',
      taskType: 'bug_fix',
      repository: 'org/repo',
    };

    it('returns 201 with SpawnResult on valid request', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.taskId).toBe('task-001');
      expect(body.branch).toBe('fleet/task-001');
      expect(body.agentType).toBe('claude_code');
      expect(body.model).toBe('claude-opus-4-6');
      expect(body.status).toBe('spawning');
    });

    it('returns 401 when x-operator-id is missing', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(401);
    });

    it('returns 401 when x-operator-tier is missing', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          'x-operator-id': 'operator-1',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(401);
    });

    it('returns 400 when description is missing', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskType: 'bug_fix', repository: 'org/repo' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('description');
    });

    it('returns 400 when taskType is invalid', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Fix it',
          taskType: 'not_a_type',
          repository: 'org/repo',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('taskType');
    });

    it('returns 400 when repository is missing', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'Fix it',
          taskType: 'bug_fix',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain('repository');
    });

    it('returns 400 when body is not valid JSON', async () => {
      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: 'not json',
      });

      expect(res.status).toBe(400);
    });

    it('returns 403 when SpawnDeniedError is thrown', async () => {
      conductor.spawn.mockRejectedValue(
        new SpawnDeniedError(
          { operatorId: 'operator-1', tier: 'builder', activeCount: 1, tierLimit: 1 },
          'Active count (1) has reached tier limit (1)',
        ),
      );

      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('spawn_denied');
      expect(body.tier).toBe('builder');
      expect(body.tierLimit).toBe(1);
    });

    it('returns 500 on unexpected error', async () => {
      conductor.spawn.mockRejectedValue(new Error('DB down'));

      const res = await app.request('/fleet/spawn', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validBody),
      });

      expect(res.status).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // GET /fleet/status
  // -------------------------------------------------------------------------

  describe('GET /fleet/status', () => {
    it('returns FleetStatusSummary', async () => {
      const res = await app.request('/fleet/status', {
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.activeTasks).toBe(2);
      expect(body.completedTasks).toBe(1);
    });

    it('scopes to caller operatorId by default', async () => {
      await app.request('/fleet/status', {
        headers: authHeaders('operator-42'),
      });

      expect(conductor.getStatus).toHaveBeenCalledWith('operator-42');
    });

    it('returns 401 without operator ID', async () => {
      const res = await app.request('/fleet/status');

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /fleet/tasks/:id
  // -------------------------------------------------------------------------

  describe('GET /fleet/tasks/:id', () => {
    it('returns task detail', async () => {
      const res = await app.request('/fleet/tasks/task-001', {
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe('task-001');
      expect(body.status).toBe('running');
    });

    it('returns 404 for unknown task', async () => {
      conductor.getTask.mockResolvedValue(null);

      const res = await app.request('/fleet/tasks/nonexistent', {
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });

    it('returns 401 without operator ID', async () => {
      const res = await app.request('/fleet/tasks/task-001');

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /fleet/tasks/:id/stop
  // -------------------------------------------------------------------------

  describe('POST /fleet/tasks/:id/stop', () => {
    it('returns 200 on successful stop', async () => {
      const res = await app.request('/fleet/tasks/task-001/stop', {
        method: 'POST',
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.status).toBe('cancelled');
    });

    it('returns 404 when task does not exist', async () => {
      conductor.getTask.mockResolvedValue(null);

      const res = await app.request('/fleet/tasks/nonexistent/stop', {
        method: 'POST',
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /fleet/tasks/:id/logs
  // -------------------------------------------------------------------------

  describe('GET /fleet/tasks/:id/logs', () => {
    it('returns logs', async () => {
      const res = await app.request('/fleet/tasks/task-001/logs', {
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.taskId).toBe('task-001');
      expect(body.logs).toBe('log output here');
    });

    it('passes lines query param to conductor', async () => {
      await app.request('/fleet/tasks/task-001/logs?lines=50', {
        headers: authHeaders(),
      });

      expect(conductor.getTaskLogs).toHaveBeenCalledWith('task-001', 50);
    });

    it('returns 404 when task does not exist', async () => {
      conductor.getTask.mockResolvedValue(null);

      const res = await app.request('/fleet/tasks/nonexistent/logs', {
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /fleet/tasks/:id
  // -------------------------------------------------------------------------

  describe('DELETE /fleet/tasks/:id', () => {
    it('returns 200 on successful delete of terminal task', async () => {
      conductor.getTask.mockResolvedValue(makeTaskRecord({ status: 'merged' }));

      const res = await app.request('/fleet/tasks/task-001', {
        method: 'DELETE',
        headers: authHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
    });

    it('returns 409 when task is active (ActiveTaskDeletionError)', async () => {
      conductor.getTask.mockResolvedValue(makeTaskRecord({ status: 'running' }));
      conductor.deleteTask.mockRejectedValue(
        new ActiveTaskDeletionError('task-001', 'running'),
      );

      const res = await app.request('/fleet/tasks/task-001', {
        method: 'DELETE',
        headers: authHeaders(),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('conflict');
    });

    it('returns 404 when task does not exist', async () => {
      conductor.getTask.mockResolvedValue(null);

      const res = await app.request('/fleet/tasks/nonexistent', {
        method: 'DELETE',
        headers: authHeaders(),
      });

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // Tenant Isolation
  // -------------------------------------------------------------------------

  describe('Tenant isolation', () => {
    it('non-admin cannot see other operator tasks (GET /tasks/:id)', async () => {
      // Task belongs to operator-2
      conductor.getTask.mockResolvedValue(
        makeTaskRecord({ operatorId: 'operator-2' }),
      );

      const res = await app.request('/fleet/tasks/task-001', {
        headers: authHeaders('operator-1'), // operator-1 requesting
      });

      // Should return 404 (not 403) to avoid leaking task existence
      expect(res.status).toBe(404);
    });

    it('admin with x-fleet-admin=true can see other operator tasks', async () => {
      conductor.getTask.mockResolvedValue(
        makeTaskRecord({ operatorId: 'operator-2' }),
      );

      const res = await app.request('/fleet/tasks/task-001', {
        headers: authHeaders('operator-1', { admin: true }),
      });

      expect(res.status).toBe(200);
    });

    it('non-admin cannot stop other operator tasks', async () => {
      conductor.getTask.mockResolvedValue(
        makeTaskRecord({ operatorId: 'operator-2' }),
      );

      const res = await app.request('/fleet/tasks/task-001/stop', {
        method: 'POST',
        headers: authHeaders('operator-1'),
      });

      expect(res.status).toBe(404);
      expect(conductor.stopTask).not.toHaveBeenCalled();
    });

    it('non-admin cannot delete other operator tasks', async () => {
      conductor.getTask.mockResolvedValue(
        makeTaskRecord({ operatorId: 'operator-2', status: 'merged' }),
      );

      const res = await app.request('/fleet/tasks/task-001', {
        method: 'DELETE',
        headers: authHeaders('operator-1'),
      });

      expect(res.status).toBe(404);
      expect(conductor.deleteTask).not.toHaveBeenCalled();
    });

    it('non-admin cannot view other operator logs', async () => {
      conductor.getTask.mockResolvedValue(
        makeTaskRecord({ operatorId: 'operator-2' }),
      );

      const res = await app.request('/fleet/tasks/task-001/logs', {
        headers: authHeaders('operator-1'),
      });

      expect(res.status).toBe(404);
    });

    it('GET /status scopes to caller operatorId by default', async () => {
      await app.request('/fleet/status', {
        headers: authHeaders('operator-1'),
      });

      expect(conductor.getStatus).toHaveBeenCalledWith('operator-1');
    });

    it('GET /status?all=true without admin still scopes to caller', async () => {
      await app.request('/fleet/status?all=true', {
        headers: authHeaders('operator-1'),
      });

      // Non-admin: should scope to operator-1
      expect(conductor.getStatus).toHaveBeenCalledWith('operator-1');
    });

    it('GET /status?all=true with admin returns all tasks', async () => {
      await app.request('/fleet/status?all=true', {
        headers: authHeaders('operator-1', { admin: true }),
      });

      // Admin with ?all=true: should pass undefined (no operatorId filter)
      expect(conductor.getStatus).toHaveBeenCalledWith(undefined);
    });
  });
});
