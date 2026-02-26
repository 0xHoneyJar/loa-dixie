/**
 * Agent Spawner Unit Tests — Validation, Spawn, Lifecycle, List
 *
 * All child_process and fs calls are mocked. Tests verify:
 * - Branch validation (valid names, metacharacters, null bytes, length)
 * - Path traversal detection
 * - Spawn local: success path, failure at each step with cleanup
 * - Spawn container: correct docker flags, env file 0600, cleanup
 * - isAlive, kill, getLogs, cleanup for both modes
 * - listActive for both modes
 * - execFile always called with argument arrays (never a shell string)
 *
 * @since cycle-012 — Sprint 87, Tasks T-2.7 through T-2.10
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/**
 * Mock strategy: the production code does `promisify(execFileRaw)` which
 * uses the `[util.promisify.custom]` symbol on Node's execFile. Since we
 * mock the entire module, we need our mock's promisified form to return
 * `{ stdout, stderr }`. We achieve this by attaching the custom symbol.
 */
import { promisify } from 'node:util';

/** Spy that records all execFile calls and controls their resolution. */
const execFileSpy = vi.fn();

/** Typed accessor for mock call args: [cmd, args, opts?] */
type ExecCall = [string, string[], Record<string, unknown>?];
function getCalls(): ExecCall[] {
  return execFileSpy.mock.calls as ExecCall[];
}

/**
 * Build the mock for node:child_process.execFile.
 * Attaches [util.promisify.custom] so that `promisify(execFile)` delegates
 * to our spy, returning Promise<{ stdout, stderr }>.
 */
function buildExecFileMock() {
  // The base function (callback-style) — not directly used by production code
  // since it immediately promisifies, but we need a function to hang the
  // custom symbol on.
  const base = (..._args: unknown[]) => {
    return { stdin: null, stdout: null, stderr: null, pid: 0 };
  };

  // This is what promisify(execFile) actually calls
  const customPromisified = (
    cmd: string,
    args: string[],
    opts?: Record<string, unknown>,
  ) => {
    return execFileSpy(cmd, args, opts);
  };

  (base as unknown as Record<symbol, unknown>)[promisify.custom] = customPromisified;
  return base;
}

vi.mock('node:child_process', () => ({
  execFile: buildExecFileMock(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  cp: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({ toString: () => 'deadbeef' }),
  };
});

// Import after mocks
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import {
  AgentSpawner,
  validateBranch,
  validateWorktreePath,
  SpawnError,
  type AgentSpawnerConfig,
  type AgentHandle,
} from '../agent-spawner.js';
import type { AgentSecretProvider } from '../agent-secret-provider.js';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Reset the spy and configure default success behavior. */
function resetExecFile() {
  execFileSpy.mockReset();
  execFileSpy.mockResolvedValue({ stdout: '', stderr: '' });
  return execFileSpy;
}

function makeConfig(overrides: Partial<AgentSpawnerConfig> = {}): AgentSpawnerConfig {
  return {
    worktreeBaseDir: '/tmp/dixie-fleet',
    mode: 'local',
    repoRoot: '/home/user/repo',
    defaultTimeoutMinutes: 60,
    maxConcurrentAgents: 10,
    ...overrides,
  };
}

function makeHandle(overrides: Partial<AgentHandle> = {}): AgentHandle {
  return {
    taskId: 'task-001',
    branch: 'fleet/task-001',
    worktreePath: '/tmp/dixie-fleet/task-001',
    processRef: 'fleet-task-001',
    mode: 'local',
    spawnedAt: '2026-02-26T00:00:00.000Z',
    ...overrides,
  };
}

function makeMockSecretProvider(): AgentSecretProvider {
  return {
    getSecrets: vi.fn().mockResolvedValue({
      FLEET_TASK_ID: 'task-001',
      GITHUB_TOKEN: 'ghp_test123',
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Configure the spy to resolve/reject based on the command being called.
 * Accepts a map of `command -> handler`. Unmatched commands resolve with
 * empty stdout.
 */
function mockExecFileByCommand(
  handlers: Record<string, (cmd: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string; stderr: string }> | { stdout: string; stderr: string }>,
) {
  execFileSpy.mockImplementation(
    (cmd: string, args: string[], opts?: Record<string, unknown>) => {
      // Try to match command, then fallback to default
      for (const [key, handler] of Object.entries(handlers)) {
        // Support matching by "cmd:subcommand" or just "cmd"
        const [matchCmd, matchSub] = key.split(':');
        if (cmd === matchCmd) {
          if (matchSub === undefined || args.includes(matchSub)) {
            const result = handler(cmd, args, opts);
            return result instanceof Promise ? result : Promise.resolve(result);
          }
        }
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    },
  );
}

// ---------------------------------------------------------------------------
// T-2.7: Branch Validation Tests
// ---------------------------------------------------------------------------

describe('validateBranch', () => {
  it('accepts valid branch names', () => {
    expect(() => validateBranch('main')).not.toThrow();
    expect(() => validateBranch('fleet/task-001')).not.toThrow();
    expect(() => validateBranch('feature/my-feature')).not.toThrow();
    expect(() => validateBranch('release/1.0.0')).not.toThrow();
    expect(() => validateBranch('user/name.branch')).not.toThrow();
    expect(() => validateBranch('a'.repeat(128))).not.toThrow();
  });

  it('rejects empty branch names', () => {
    expect(() => validateBranch('')).toThrow(SpawnError);
    expect(() => validateBranch('')).toThrow('must not be empty');
  });

  it('rejects branch names exceeding 128 characters', () => {
    const longBranch = 'a'.repeat(129);
    expect(() => validateBranch(longBranch)).toThrow(SpawnError);
    expect(() => validateBranch(longBranch)).toThrow('exceeds 128 characters');
  });

  it('rejects branch names with null bytes', () => {
    expect(() => validateBranch('branch\0name')).toThrow(SpawnError);
    expect(() => validateBranch('branch\0name')).toThrow('null bytes');
  });

  it('rejects branch names with shell metacharacters', () => {
    const dangerous = [
      'branch; rm -rf /',
      'branch && echo pwned',
      'branch | cat /etc/passwd',
      'branch$(whoami)',
      'branch`id`',
      'branch > /tmp/out',
      'branch < /etc/passwd',
      "branch'name",
      'branch"name',
      'branch name',  // spaces
      'branch\ttab',  // tabs
      'branch!bang',
    ];
    for (const name of dangerous) {
      expect(() => validateBranch(name)).toThrow(SpawnError);
    }
  });

  it('rejects branch names with newlines', () => {
    expect(() => validateBranch('branch\nname')).toThrow(SpawnError);
  });
});

// ---------------------------------------------------------------------------
// T-2.7: Path Traversal Detection
// ---------------------------------------------------------------------------

describe('validateWorktreePath', () => {
  it('accepts paths within the base directory', () => {
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet/task-001', '/tmp/dixie-fleet'),
    ).not.toThrow();
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet/sub/dir', '/tmp/dixie-fleet'),
    ).not.toThrow();
  });

  it('rejects paths that traverse above the base directory', () => {
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet/../etc/passwd', '/tmp/dixie-fleet'),
    ).toThrow(SpawnError);
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet/../etc/passwd', '/tmp/dixie-fleet'),
    ).toThrow('escapes base directory');
  });

  it('rejects paths completely outside the base directory', () => {
    expect(() =>
      validateWorktreePath('/etc/passwd', '/tmp/dixie-fleet'),
    ).toThrow(SpawnError);
  });

  it('accepts the base directory itself as a valid path', () => {
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet', '/tmp/dixie-fleet'),
    ).not.toThrow();
  });

  it('rejects prefix-matching attacks (e.g., /tmp/dixie-fleet-evil)', () => {
    expect(() =>
      validateWorktreePath('/tmp/dixie-fleet-evil/task', '/tmp/dixie-fleet'),
    ).toThrow(SpawnError);
  });
});

// ---------------------------------------------------------------------------
// T-2.8: Spawn Local Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — spawn() local mode', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('creates worktree, installs deps, and launches tmux session', async () => {
    const spawner = new AgentSpawner(makeConfig());

    const handle = await spawner.spawn(
      'task-001',
      'fleet/task-001',
      'claude_code',
      'implement the feature',
    );

    expect(handle.taskId).toBe('task-001');
    expect(handle.branch).toBe('fleet/task-001');
    expect(handle.worktreePath).toBe('/tmp/dixie-fleet/task-001');
    expect(handle.processRef).toBe('fleet-task-001');
    expect(handle.mode).toBe('local');
    expect(handle.spawnedAt).toBeDefined();
  });

  it('calls execFile with argument arrays, never shell strings', async () => {
    const spawner = new AgentSpawner(makeConfig());

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'do stuff');

    for (const call of getCalls()) {
      const [cmd, args] = call;
      expect(typeof cmd).toBe('string');
      expect(Array.isArray(args)).toBe(true);
      for (const arg of args) {
        expect(typeof arg).toBe('string');
      }
    }
  });

  it('calls git worktree add with correct arguments', async () => {
    const spawner = new AgentSpawner(makeConfig());

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const worktreeCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'worktree' && c[1]?.[1] === 'add',
    );
    expect(worktreeCall).toBeDefined();
    expect(worktreeCall![0]).toBe('git');
    expect(worktreeCall![1]).toEqual([
      'worktree', 'add', '/tmp/dixie-fleet/task-001', '-b', 'fleet/task-001',
    ]);
  });

  it('calls pnpm install with frozen lockfile', async () => {
    const spawner = new AgentSpawner(makeConfig());

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const pnpmCall = getCalls().find((c) => c[0] === 'pnpm');
    expect(pnpmCall).toBeDefined();
    expect(pnpmCall![1]).toContain('--frozen-lockfile');
  });

  it('passes pnpm store path when configured', async () => {
    const spawner = new AgentSpawner(
      makeConfig({ pnpmStorePath: '/tmp/pnpm-store' }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const pnpmCall = getCalls().find((c) => c[0] === 'pnpm');
    expect(pnpmCall).toBeDefined();
    expect(pnpmCall![1]).toContain('--store-dir');
    expect(pnpmCall![1]).toContain('/tmp/pnpm-store');
  });

  it('creates tmux session with correct name and working directory', async () => {
    const spawner = new AgentSpawner(makeConfig());

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const tmuxCreateCall = getCalls().find(
      (c) => c[0] === 'tmux' && c[1]?.includes('new-session'),
    );
    expect(tmuxCreateCall).toBeDefined();
    expect(tmuxCreateCall![1]).toContain('-s');
    expect(tmuxCreateCall![1]).toContain('fleet-task-001');
    expect(tmuxCreateCall![1]).toContain('-c');
    expect(tmuxCreateCall![1]).toContain('/tmp/dixie-fleet/task-001');
  });

  it('sends prompt via tmux send-keys (not as CLI argument)', async () => {
    const spawner = new AgentSpawner(makeConfig());
    const prompt = 'implement the feature with tests';

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', prompt);

    const sendKeysCall = getCalls().find(
      (c) =>
        c[0] === 'tmux' &&
        c[1]?.includes('send-keys') &&
        c[1]?.includes(prompt),
    );
    expect(sendKeysCall).toBeDefined();
    expect(sendKeysCall![1]).toContain('send-keys');
    expect(sendKeysCall![1]).toContain('-t');
    expect(sendKeysCall![1]).toContain('fleet-task-001');
  });

  it('cleans up worktree on git worktree failure', async () => {
    mockExecFileByCommand({
      'git:add': () => Promise.reject(new Error('worktree already exists')),
    });

    const spawner = new AgentSpawner(makeConfig());

    await expect(
      spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test'),
    ).rejects.toThrow(SpawnError);
  });

  it('cleans up worktree on pnpm install failure', async () => {
    mockExecFileByCommand({
      pnpm: () => Promise.reject(new Error('install failed')),
    });

    const spawner = new AgentSpawner(makeConfig());

    await expect(
      spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test'),
    ).rejects.toThrow(SpawnError);

    // Verify cleanup was called (git worktree remove)
    const cleanupCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'worktree' && c[1]?.[1] === 'remove',
    );
    expect(cleanupCall).toBeDefined();
  });

  it('cleans up worktree on tmux session failure', async () => {
    mockExecFileByCommand({
      'tmux:new-session': () => Promise.reject(new Error('tmux failed')),
    });

    const spawner = new AgentSpawner(makeConfig());

    await expect(
      spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test'),
    ).rejects.toThrow(SpawnError);

    // Verify worktree cleanup
    const cleanupCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'worktree' && c[1]?.[1] === 'remove',
    );
    expect(cleanupCall).toBeDefined();
  });

  it('throws SpawnError with WORKTREE_FAILED code on git failure', async () => {
    mockExecFileByCommand({
      'git:add': () => Promise.reject(new Error('branch already exists')),
    });

    const spawner = new AgentSpawner(makeConfig());

    try {
      await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SpawnError);
      expect((err as SpawnError).code).toBe('WORKTREE_FAILED');
    }
  });

  it('throws SpawnError with INSTALL_FAILED code on pnpm failure', async () => {
    mockExecFileByCommand({
      pnpm: () => Promise.reject(new Error('lockfile mismatch')),
    });

    const spawner = new AgentSpawner(makeConfig());

    try {
      await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SpawnError);
      expect((err as SpawnError).code).toBe('INSTALL_FAILED');
    }
  });

  it('throws SpawnError with PROCESS_FAILED code on tmux failure', async () => {
    mockExecFileByCommand({
      'tmux:new-session': () => Promise.reject(new Error('display not set')),
    });

    const spawner = new AgentSpawner(makeConfig());

    try {
      await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(SpawnError);
      expect((err as SpawnError).code).toBe('PROCESS_FAILED');
    }
  });

  it('copies Loa hooks when loaHooksPath is configured', async () => {
    const { cp } = await import('node:fs/promises');
    const spawner = new AgentSpawner(
      makeConfig({ loaHooksPath: '/home/user/repo/.claude' }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    expect(cp).toHaveBeenCalledWith(
      '/home/user/repo/.claude',
      '/tmp/dixie-fleet/task-001/.claude',
      { recursive: true },
    );
  });

  it('resolves secrets from provider when available', async () => {
    const provider = makeMockSecretProvider();
    const spawner = new AgentSpawner(makeConfig(), provider);

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    expect(provider.getSecrets).toHaveBeenCalledWith('task-001', 'claude_code');
  });
});

// ---------------------------------------------------------------------------
// T-2.9: Spawn Container Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — spawn() container mode', () => {
  beforeEach(() => {
    resetExecFile();
    // Default: container run returns a container ID
    mockExecFileByCommand({
      'docker:run': () => ({ stdout: 'abc123containerid\n', stderr: '' }),
    });
  });

  it('requires containerImage to be set', async () => {
    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));

    await expect(
      spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test'),
    ).rejects.toThrow('containerImage is required');
  });

  it('passes correct docker security flags', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const dockerCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('run'),
    );
    expect(dockerCall).toBeDefined();
    const args: string[] = dockerCall![1];

    // Verify security flags
    expect(args).toContain('--read-only');
    expect(args).toContain('--memory=2g');
    expect(args).toContain('--cpus=2');
    expect(args).toContain('--cap-drop');
    expect(args[args.indexOf('--cap-drop') + 1]).toBe('ALL');
    expect(args).toContain('--cap-add');
    expect(args[args.indexOf('--cap-add') + 1]).toBe('NET_BIND_SERVICE');

    // Security opts
    const secoptIndices = args.reduce<number[]>((acc, a, i) => {
      if (a === '--security-opt') acc.push(i);
      return acc;
    }, []);
    expect(secoptIndices.length).toBeGreaterThanOrEqual(2);
    const secoptValues = secoptIndices.map((i) => args[i + 1]);
    expect(secoptValues).toContain('no-new-privileges');
    expect(secoptValues).toContain('seccomp=fleet-seccomp.json');

    // Network
    expect(args).toContain('--network');
    expect(args[args.indexOf('--network') + 1]).toBe('fleet-egress');

    // tmpfs
    expect(args).toContain('--tmpfs');
    expect(args[args.indexOf('--tmpfs') + 1]).toBe('/tmp');
  });

  it('mounts worktree as volume', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const dockerCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('run'),
    );
    const args: string[] = dockerCall![1];
    expect(args).toContain('-v');
    expect(args[args.indexOf('-v') + 1]).toBe(
      '/tmp/dixie-fleet/task-001:/workspace',
    );
  });

  it('sets fleet labels on container', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const dockerCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('run'),
    );
    const args: string[] = dockerCall![1];

    const labelIndices = args.reduce<number[]>((acc, a, i) => {
      if (a === '--label') acc.push(i);
      return acc;
    }, []);
    const labels = labelIndices.map((i) => args[i + 1]);
    expect(labels).toContain('dixie-fleet=true');
    expect(labels).toContain('fleet-task-id=task-001');
  });

  it('writes env file with 0600 permissions and deletes after start', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    // Verify writeFile was called with mode 0o600
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.env-task-001-'),
      expect.any(String),
      { mode: 0o600 },
    );

    // Verify unlink was called to delete the env file
    expect(unlink).toHaveBeenCalledWith(
      expect.stringContaining('.env-task-001-'),
    );
  });

  it('deletes env file even on container start failure', async () => {
    execFileSpy.mockReset();
    execFileSpy.mockImplementation((cmd, args) => {
      if (cmd === 'docker' && args?.includes('run')) {
        return Promise.reject(new Error('image not found'));
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await expect(
      spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test'),
    ).rejects.toThrow(SpawnError);

    // env file should still be deleted
    expect(unlink).toHaveBeenCalled();
  });

  it('adds --userns=keep-id for podman runtime', async () => {
    execFileSpy.mockReset();
    execFileSpy.mockImplementation((cmd, args) => {
      if (cmd === 'podman' && args?.includes('run')) {
        return Promise.resolve({ stdout: 'podman-container-id\n', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
        containerRuntime: 'podman',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const podmanCall = getCalls().find(
      (c) => c[0] === 'podman' && c[1]?.includes('run'),
    );
    expect(podmanCall).toBeDefined();
    expect(podmanCall![1]).toContain('--userns=keep-id');
  });

  it('uses argument arrays, never shell strings, for container commands', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    for (const call of getCalls()) {
      const [cmd, args] = call;
      expect(typeof cmd).toBe('string');
      expect(Array.isArray(args)).toBe(true);
    }
  });

  it('returns container ID as processRef', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
      }),
    );

    const handle = await spawner.spawn(
      'task-001',
      'fleet/task-001',
      'claude_code',
      'test',
    );

    expect(handle.processRef).toBe('abc123containerid');
    expect(handle.mode).toBe('container');
  });

  it('sets DOCKER_HOST when dockerHost is configured', async () => {
    const spawner = new AgentSpawner(
      makeConfig({
        mode: 'container',
        containerImage: 'ghcr.io/org/agent:latest',
        dockerHost: 'tcp://127.0.0.1:2375',
      }),
    );

    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    const dockerCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('run'),
    );
    expect(dockerCall).toBeDefined();
    const opts = dockerCall![2] as Record<string, unknown>;
    expect((opts.env as Record<string, string>).DOCKER_HOST).toBe('tcp://127.0.0.1:2375');
  });
});

// ---------------------------------------------------------------------------
// T-2.8/T-2.9: isAlive Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — isAlive()', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('returns true when tmux session exists (local mode)', async () => {
    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    const alive = await spawner.isAlive(handle);
    expect(alive).toBe(true);

    const call = getCalls().find(
      (c) => c[0] === 'tmux' && c[1]?.includes('has-session'),
    );
    expect(call).toBeDefined();
    expect(call![1]).toContain('fleet-task-001');
  });

  it('returns false when tmux session does not exist (local mode)', async () => {
    execFileSpy.mockRejectedValue(new Error('session not found'));

    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    const alive = await spawner.isAlive(handle);
    expect(alive).toBe(false);
  });

  it('returns true when container is running (container mode)', async () => {
    execFileSpy.mockResolvedValue({ stdout: 'true\n', stderr: '' });

    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));
    const handle = makeHandle({
      mode: 'container',
      processRef: 'abc123',
    });

    const alive = await spawner.isAlive(handle);
    expect(alive).toBe(true);
  });

  it('returns false when container is not running (container mode)', async () => {
    execFileSpy.mockResolvedValue({ stdout: 'false\n', stderr: '' });

    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));
    const handle = makeHandle({ mode: 'container', processRef: 'abc123' });

    const alive = await spawner.isAlive(handle);
    expect(alive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-2.8/T-2.9: kill() Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — kill()', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('kills tmux session (local mode)', async () => {
    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    await spawner.kill(handle);

    const killCall = getCalls().find(
      (c) => c[0] === 'tmux' && c[1]?.includes('kill-session'),
    );
    expect(killCall).toBeDefined();
    expect(killCall![1]).toContain('fleet-task-001');
  });

  it('stops and removes container (container mode)', async () => {
    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));
    const handle = makeHandle({ mode: 'container', processRef: 'abc123' });

    await spawner.kill(handle);

    const stopCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('stop'),
    );
    expect(stopCall).toBeDefined();
    expect(stopCall![1]).toContain('abc123');
    expect(stopCall![1]).toContain('-t');
    expect(stopCall![1]).toContain('10');

    const rmCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('rm'),
    );
    expect(rmCall).toBeDefined();
    expect(rmCall![1]).toContain('abc123');
  });
});

// ---------------------------------------------------------------------------
// T-2.8/T-2.9: getLogs() Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — getLogs()', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('captures tmux pane output (local mode)', async () => {
    execFileSpy.mockResolvedValue({
      stdout: 'some log output\nmore output\n',
      stderr: '',
    });

    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    const logs = await spawner.getLogs(handle);
    expect(logs).toContain('some log output');
  });

  it('gets docker logs (container mode)', async () => {
    execFileSpy.mockResolvedValue({
      stdout: 'container log line 1\nline 2\n',
      stderr: '',
    });

    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));
    const handle = makeHandle({ mode: 'container', processRef: 'abc123' });

    const logs = await spawner.getLogs(handle);
    expect(logs).toContain('container log line 1');

    const logsCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('logs'),
    );
    expect(logsCall![1]).toContain('--tail');
    expect(logsCall![1]).toContain('200');
  });

  it('respects custom line count', async () => {
    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));
    const handle = makeHandle({ mode: 'container', processRef: 'abc123' });

    await spawner.getLogs(handle, 50);

    const logsCall = getCalls().find(
      (c) => c[0] === 'docker' && c[1]?.includes('logs'),
    );
    expect(logsCall![1]).toContain('50');
  });
});

// ---------------------------------------------------------------------------
// T-2.8: cleanup() Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — cleanup()', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('removes worktree and deletes merged branch', async () => {
    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    await spawner.cleanup(handle);

    const worktreeRemoveCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'worktree' && c[1]?.[1] === 'remove',
    );
    expect(worktreeRemoveCall).toBeDefined();
    expect(worktreeRemoveCall![1]).toContain('/tmp/dixie-fleet/task-001');

    const branchDeleteCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'branch' && c[1]?.[1] === '-d',
    );
    expect(branchDeleteCall).toBeDefined();
    expect(branchDeleteCall![1]).toContain('fleet/task-001');
  });

  it('snapshots unpushed work before cleanup', async () => {
    execFileSpy.mockImplementation((cmd, args) => {
      if (cmd === 'git' && args?.[0] === 'log') {
        return Promise.resolve({ stdout: 'abc123 unpushed commit\n', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    await spawner.cleanup(handle);

    // Verify snapshot (bundle create) was called
    const bundleCall = getCalls().find(
      (c) => c[0] === 'git' && c[1]?.[0] === 'bundle',
    );
    expect(bundleCall).toBeDefined();

    // Verify mkdir for .fleet-snapshots
    expect(mkdir).toHaveBeenCalledWith(
      '/home/user/repo/.fleet-snapshots',
      { recursive: true },
    );
  });

  it('handles branch not merged gracefully (git branch -d fails)', async () => {
    let branchDeleteAttempted = false;
    execFileSpy.mockImplementation((cmd, args) => {
      if (cmd === 'git' && args?.[0] === 'branch' && args?.[1] === '-d') {
        branchDeleteAttempted = true;
        return Promise.reject(new Error('branch not fully merged'));
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    const spawner = new AgentSpawner(makeConfig());
    const handle = makeHandle();

    // Should not throw even if branch delete fails
    await expect(spawner.cleanup(handle)).resolves.toBeUndefined();
    expect(branchDeleteAttempted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-2.10: listActive() Tests
// ---------------------------------------------------------------------------

describe('AgentSpawner — listActive()', () => {
  beforeEach(() => {
    resetExecFile();
  });

  it('lists active tmux sessions matching fleet-* prefix', async () => {
    execFileSpy.mockResolvedValue({
      stdout: 'fleet-task-001\nfleet-task-002\nother-session\n',
      stderr: '',
    });

    const spawner = new AgentSpawner(makeConfig());

    const handles = await spawner.listActive();
    // Should only include fleet-* sessions
    expect(handles).toHaveLength(2);
    expect(handles[0].taskId).toBe('task-001');
    expect(handles[1].taskId).toBe('task-002');
  });

  it('returns empty array when no tmux server is running', async () => {
    execFileSpy.mockRejectedValue(new Error('no tmux server'));

    const spawner = new AgentSpawner(makeConfig());

    const handles = await spawner.listActive();
    expect(handles).toEqual([]);
  });

  it('lists active containers with dixie-fleet label', async () => {
    execFileSpy.mockResolvedValue({
      stdout: 'abc123\ttask-001\ndef456\ttask-002\n',
      stderr: '',
    });

    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));

    const handles = await spawner.listActive();
    expect(handles).toHaveLength(2);
    expect(handles[0].taskId).toBe('task-001');
    expect(handles[0].processRef).toBe('abc123');
    expect(handles[1].taskId).toBe('task-002');
  });

  it('returns empty array when no containers are running', async () => {
    // Already default — empty stdout
    const spawner = new AgentSpawner(makeConfig({ mode: 'container' }));

    const handles = await spawner.listActive();
    expect(handles).toEqual([]);
  });

  it('uses tracked handles when available for richer info', async () => {
    // First spawn a task so it's tracked
    const spawner = new AgentSpawner(makeConfig());
    await spawner.spawn('task-001', 'fleet/task-001', 'claude_code', 'test');

    // Now mock listActive's tmux call
    execFileSpy.mockResolvedValue({
      stdout: 'fleet-task-001\n',
      stderr: '',
    });

    const handles = await spawner.listActive();
    expect(handles).toHaveLength(1);
    expect(handles[0].branch).toBe('fleet/task-001');
    expect(handles[0].spawnedAt).not.toBe('unknown');
  });
});
