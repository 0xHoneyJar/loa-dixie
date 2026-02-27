/**
 * Agent Spawner — Worktree + Process Isolation for Fleet Agents
 *
 * Spawns agent processes in either local (tmux) or container (docker/podman)
 * mode. Manages the full lifecycle: spawn, monitor, kill, cleanup.
 *
 * All subprocess invocations use execFile with argument arrays — never
 * shell strings — to prevent injection attacks.
 *
 * See: SDD §2.2 (spawner), §2.3 (container isolation), §2.4 (lifecycle)
 * @since cycle-012 — Sprint 87, Tasks T-2.1 through T-2.6
 */
import { execFile as execFileRaw } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink, mkdir, cp, rm, access } from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import type { AgentSecretProvider } from './agent-secret-provider.js';
import type { AgentType } from '../types/fleet.js';
import { startSanitizedSpan } from '../utils/span-sanitizer.js';

const execFile = promisify(execFileRaw);

// ---------------------------------------------------------------------------
// Types (T-2.1)
// ---------------------------------------------------------------------------

/** Configuration for the AgentSpawner. */
export interface AgentSpawnerConfig {
  /** Base directory for git worktrees (e.g., /tmp/dixie-fleet). */
  readonly worktreeBaseDir: string;
  /** Execution mode: local uses tmux, container uses docker/podman. */
  readonly mode: 'local' | 'container';
  /** Container image for container mode (e.g., ghcr.io/org/dixie-agent:latest). */
  readonly containerImage?: string;
  /** Container runtime binary. */
  readonly containerRuntime?: 'docker' | 'podman';
  /** Absolute path to the repository root. */
  readonly repoRoot: string;
  /** Path to Loa hooks directory to copy into worktrees. */
  readonly loaHooksPath?: string;
  /** Default timeout for agent processes in minutes. */
  readonly defaultTimeoutMinutes?: number;
  /** Maximum number of concurrent agents. */
  readonly maxConcurrentAgents?: number;
  /** Path to pnpm store for offline installs. */
  readonly pnpmStorePath?: string;
  /** Docker host (unix socket or tcp proxy URL). */
  readonly dockerHost?: string;
}

/** Handle to a spawned agent process. */
export interface AgentHandle {
  /** Task identifier from the fleet_tasks table. */
  readonly taskId: string;
  /** Git branch for this agent's worktree. */
  readonly branch: string;
  /** Absolute path to the git worktree. */
  readonly worktreePath: string;
  /** Process reference: tmux session name or container ID. */
  readonly processRef: string;
  /** Execution mode this agent was spawned in. */
  readonly mode: 'local' | 'container';
  /** ISO timestamp when the agent was spawned. */
  readonly spawnedAt: string;
}

/** Environment variables scoped to an agent. */
export type AgentEnvironment = Record<string, string>;

/** Error codes for spawn failures. */
export type SpawnErrorCode =
  | 'WORKTREE_FAILED'
  | 'INSTALL_FAILED'
  | 'PROCESS_FAILED'
  | 'TIMEOUT';

/** Typed error thrown during spawn failures. */
export class SpawnError extends Error {
  readonly code: SpawnErrorCode;

  constructor(code: SpawnErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SpawnError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Validation (T-2.1)
// ---------------------------------------------------------------------------

/** Branch name safety regex: alphanumeric, dots, underscores, hyphens, slashes. */
const BRANCH_REGEX = /^[a-zA-Z0-9._/-]+$/;

/** Maximum branch name length. */
const MAX_BRANCH_LENGTH = 128;

/**
 * Validate a git branch name for safety.
 *
 * @throws SpawnError if the branch name is invalid
 */
export function validateBranch(branch: string): void {
  if (!branch || branch.length === 0) {
    throw new SpawnError('WORKTREE_FAILED', 'Branch name must not be empty');
  }
  if (branch.length > MAX_BRANCH_LENGTH) {
    throw new SpawnError(
      'WORKTREE_FAILED',
      `Branch name exceeds ${MAX_BRANCH_LENGTH} characters: ${branch.length}`,
    );
  }
  if (branch.includes('\0')) {
    throw new SpawnError('WORKTREE_FAILED', 'Branch name must not contain null bytes');
  }
  if (!BRANCH_REGEX.test(branch)) {
    throw new SpawnError(
      'WORKTREE_FAILED',
      `Branch name contains invalid characters: ${branch}`,
    );
  }
}

/**
 * Validate a worktree path stays within the base directory.
 * Uses path.resolve() to canonicalize and prevent traversal.
 *
 * @throws SpawnError if the path escapes the base directory
 */
export function validateWorktreePath(worktreePath: string, baseDir: string): void {
  const resolved = path.resolve(worktreePath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new SpawnError(
      'WORKTREE_FAILED',
      `Worktree path escapes base directory: ${worktreePath} is not under ${baseDir}`,
    );
  }
}

// ---------------------------------------------------------------------------
// AgentSpawner
// ---------------------------------------------------------------------------

export class AgentSpawner {
  private readonly config: Required<
    Pick<AgentSpawnerConfig, 'worktreeBaseDir' | 'mode' | 'repoRoot'>
  > &
    AgentSpawnerConfig;

  private readonly secretProvider: AgentSecretProvider | null;

  /** In-memory tracking of active handles. */
  private readonly activeHandles: Map<string, AgentHandle> = new Map();

  constructor(config: AgentSpawnerConfig, secretProvider?: AgentSecretProvider) {
    this.config = {
      containerRuntime: 'docker',
      defaultTimeoutMinutes: 60,
      maxConcurrentAgents: 10,
      ...config,
    };
    this.secretProvider = secretProvider ?? null;
  }

  // -------------------------------------------------------------------------
  // Spawn (T-2.2, T-2.3)
  // -------------------------------------------------------------------------

  /**
   * Spawn an agent in the configured mode.
   *
   * Steps:
   * 1. Validate branch and worktree path
   * 2. Create git worktree
   * 3. Install dependencies
   * 4. Copy Loa hooks (if configured)
   * 5. Launch process (tmux session or container)
   * 6. Return AgentHandle
   *
   * On failure at any step, cleans up partial state before rethrowing.
   */
  async spawn(
    taskId: string,
    branch: string,
    agentType: AgentType,
    prompt: string,
  ): Promise<AgentHandle> {
    return startSanitizedSpan(
      'dixie.fleet.spawn',
      { task_type: agentType, cost: 0, identity: taskId },
      async () => {
        const worktreePath = path.join(this.config.worktreeBaseDir, taskId);

        // Step 1: Validate
        validateBranch(branch);
        validateWorktreePath(worktreePath, this.config.worktreeBaseDir);

        // Track cleanup steps that need to be reversed on failure
        let worktreeCreated = false;

        try {
          // Step 2: Create git worktree
          await this.createWorktree(worktreePath, branch);
          worktreeCreated = true;

          // Step 3: Install dependencies
          await this.installDependencies(worktreePath);

          // Step 4: Copy Loa hooks if configured
          if (this.config.loaHooksPath) {
            await this.copyLoaHooks(worktreePath);
          }

          // Step 5: Launch process
          let processRef: string;
          if (this.config.mode === 'local') {
            processRef = await this.spawnLocal(taskId, worktreePath, agentType, prompt);
          } else {
            processRef = await this.spawnContainer(taskId, worktreePath, agentType, prompt);
          }

          // Step 6: Build handle
          const handle: AgentHandle = {
            taskId,
            branch,
            worktreePath,
            processRef,
            mode: this.config.mode,
            spawnedAt: new Date().toISOString(),
          };

          this.activeHandles.set(taskId, handle);
          return handle;
        } catch (err) {
          // Cleanup partial state on failure
          await this.cleanupPartialState(worktreePath, worktreeCreated);

          if (err instanceof SpawnError) {
            throw err;
          }
          throw new SpawnError(
            'PROCESS_FAILED',
            `Spawn failed for task ${taskId}: ${err instanceof Error ? err.message : String(err)}`,
            { cause: err },
          );
        }
      },
    );
  }

  // -------------------------------------------------------------------------
  // Lifecycle (T-2.4)
  // -------------------------------------------------------------------------

  /**
   * Check if an agent process is still alive.
   */
  async isAlive(handle: AgentHandle): Promise<boolean> {
    try {
      if (handle.mode === 'local') {
        await execFile('tmux', ['has-session', '-t', handle.processRef]);
        return true;
      } else {
        const { stdout } = await execFile(this.runtime(), [
          'inspect',
          '--format',
          '{{.State.Running}}',
          handle.processRef,
        ]);
        return stdout.trim() === 'true';
      }
    } catch {
      return false;
    }
  }

  /**
   * Kill an agent process.
   */
  async kill(handle: AgentHandle): Promise<void> {
    if (handle.mode === 'local') {
      await execFile('tmux', ['kill-session', '-t', handle.processRef]);
    } else {
      // Stop with a 10-second grace period, then remove
      await execFile(this.runtime(), ['stop', '-t', '10', handle.processRef]);
      await execFile(this.runtime(), ['rm', '-f', handle.processRef]);
    }
    this.activeHandles.delete(handle.taskId);
  }

  /**
   * Get recent logs from an agent process.
   */
  async getLogs(handle: AgentHandle, lines = 200): Promise<string> {
    if (handle.mode === 'local') {
      const { stdout } = await execFile('tmux', [
        'capture-pane',
        '-t',
        handle.processRef,
        '-p',
        '-S',
        `-${lines}`,
      ]);
      return stdout;
    } else {
      const { stdout } = await execFile(this.runtime(), [
        'logs',
        '--tail',
        String(lines),
        handle.processRef,
      ]);
      return stdout;
    }
  }

  /**
   * Cleanup an agent's resources.
   *
   * 1. Verify the branch has been pushed (snapshot unpushed work)
   * 2. Remove the git worktree
   * 3. Delete the branch only if merged
   */
  async cleanup(handle: AgentHandle): Promise<void> {
    // Check if branch has unpushed commits
    const hasPushed = await this.branchIsPushed(handle.branch, handle.worktreePath);

    if (!hasPushed) {
      // Snapshot unpushed work before cleanup
      await this.snapshotUnpushed(handle);
    }

    // Remove worktree
    await execFile('git', ['worktree', 'remove', '--force', handle.worktreePath], {
      cwd: this.config.repoRoot,
    });

    // Delete branch only if merged
    try {
      await execFile('git', ['branch', '-d', handle.branch], {
        cwd: this.config.repoRoot,
      });
    } catch {
      // Branch not merged — leave it for manual cleanup
    }

    this.activeHandles.delete(handle.taskId);
  }

  // -------------------------------------------------------------------------
  // List Active (T-2.5)
  // -------------------------------------------------------------------------

  /**
   * Enumerate active agent processes from the runtime.
   *
   * Local mode: list tmux sessions matching fleet-* prefix.
   * Container mode: list containers with dixie-fleet=true label.
   */
  async listActive(): Promise<AgentHandle[]> {
    if (this.config.mode === 'local') {
      return this.listActiveTmux();
    } else {
      return this.listActiveContainers();
    }
  }

  // -------------------------------------------------------------------------
  // Private: Local Mode (T-2.2)
  // -------------------------------------------------------------------------

  private async spawnLocal(
    taskId: string,
    worktreePath: string,
    agentType: AgentType,
    prompt: string,
  ): Promise<string> {
    const sessionName = `fleet-${taskId}`;

    // Resolve secrets for this agent
    const env = await this.resolveEnvironment(taskId, agentType);

    try {
      // Create tmux session
      await execFile('tmux', [
        'new-session',
        '-d',
        '-s',
        sessionName,
        '-c',
        worktreePath,
      ]);

      // Set environment variables in the tmux session
      for (const [key, value] of Object.entries(env)) {
        await execFile('tmux', [
          'send-keys',
          '-t',
          sessionName,
          `export ${key}=${this.shellEscape(value)}`,
          'Enter',
        ]);
      }

      // Send the prompt via tmux send-keys (stdin, not CLI arg)
      // This avoids shell metacharacter injection through the prompt text
      await execFile('tmux', [
        'send-keys',
        '-t',
        sessionName,
        prompt,
        'Enter',
      ]);

      return sessionName;
    } catch (err) {
      // Try to clean up the tmux session if it was partially created
      try {
        await execFile('tmux', ['kill-session', '-t', sessionName]);
      } catch {
        // Ignore cleanup errors
      }
      throw new SpawnError(
        'PROCESS_FAILED',
        `Failed to create tmux session: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }

  // -------------------------------------------------------------------------
  // Private: Container Mode (T-2.3)
  // -------------------------------------------------------------------------

  private async spawnContainer(
    taskId: string,
    worktreePath: string,
    agentType: AgentType,
    prompt: string,
  ): Promise<string> {
    const runtime = this.runtime();
    const image = this.config.containerImage;
    if (!image) {
      throw new SpawnError(
        'PROCESS_FAILED',
        'containerImage is required for container mode',
      );
    }

    // Write secrets to a temp env file with restricted permissions
    const envFilePath = await this.writeEnvFile(taskId, agentType);

    try {
      const args: string[] = [
        'run',
        '-d',
        // Read-only root filesystem
        '--read-only',
        // Writable tmp
        '--tmpfs', '/tmp',
        // Mount worktree
        '-v', `${worktreePath}:/workspace`,
        // Resource limits
        '--memory=2g',
        '--cpus=2',
        // Security hardening
        '--security-opt', 'no-new-privileges',
        '--cap-drop', 'ALL',
        '--cap-add', 'NET_BIND_SERVICE',
        '--security-opt', 'seccomp=fleet-seccomp.json',
        // Network policy
        '--network', 'fleet-egress',
        // Env file
        '--env-file', envFilePath,
        // Labels for fleet management
        '--label', 'dixie-fleet=true',
        '--label', `fleet-task-id=${taskId}`,
        // Name for easy lookup
        '--name', `fleet-${taskId}`,
      ];

      // Rootless mode for podman
      if (runtime === 'podman') {
        args.push('--userns=keep-id');
      }

      // Docker host configuration (T-2.6)
      const dockerHostEnv: Record<string, string> = {};
      if (this.config.dockerHost) {
        dockerHostEnv.DOCKER_HOST = this.config.dockerHost;
      }

      // Image and command
      args.push(image);
      // Pass the prompt as a command argument to the entrypoint
      args.push('--prompt', prompt);

      const { stdout } = await execFile(runtime, args, {
        env: { ...process.env, ...dockerHostEnv },
      });

      const containerId = stdout.trim();
      return containerId;
    } catch (err) {
      throw new SpawnError(
        'PROCESS_FAILED',
        `Failed to start container: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    } finally {
      // Always delete the env file after container start (or failure)
      await this.deleteEnvFile(envFilePath);
    }
  }

  // -------------------------------------------------------------------------
  // Private: Git Operations
  // -------------------------------------------------------------------------

  private async createWorktree(worktreePath: string, branch: string): Promise<void> {
    try {
      await mkdir(path.dirname(worktreePath), { recursive: true });
      await execFile('git', ['worktree', 'add', worktreePath, '-b', branch], {
        cwd: this.config.repoRoot,
      });
    } catch (err) {
      throw new SpawnError(
        'WORKTREE_FAILED',
        `Failed to create worktree at ${worktreePath}: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }

  private async installDependencies(worktreePath: string): Promise<void> {
    try {
      const args = ['install', '--frozen-lockfile'];
      if (this.config.pnpmStorePath) {
        args.push('--store-dir', this.config.pnpmStorePath);
      }
      await execFile('pnpm', args, {
        cwd: worktreePath,
        timeout: 120_000, // 2 minutes for install
      });
    } catch (err) {
      throw new SpawnError(
        'INSTALL_FAILED',
        `pnpm install failed in ${worktreePath}: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }

  private async copyLoaHooks(worktreePath: string): Promise<void> {
    const hooksPath = this.config.loaHooksPath;
    if (!hooksPath) return;

    const destHooksDir = path.join(worktreePath, '.claude');
    try {
      await cp(hooksPath, destHooksDir, { recursive: true });
    } catch {
      // Non-fatal: hooks copy failure shouldn't prevent spawn
    }
  }

  private async branchIsPushed(branch: string, worktreePath: string): Promise<boolean> {
    try {
      const { stdout } = await execFile(
        'git',
        ['log', `origin/${branch}..${branch}`, '--oneline'],
        { cwd: worktreePath },
      );
      // If output is empty, all commits are pushed
      return stdout.trim().length === 0;
    } catch {
      // origin/<branch> doesn't exist — branch was never pushed
      return false;
    }
  }

  private async snapshotUnpushed(handle: AgentHandle): Promise<void> {
    const snapshotDir = path.join(this.config.repoRoot, '.fleet-snapshots');
    const snapshotPath = path.join(snapshotDir, handle.taskId);
    try {
      await mkdir(snapshotDir, { recursive: true });
      // Create a bundle of the worktree's current state
      await execFile(
        'git',
        ['bundle', 'create', `${snapshotPath}.bundle`, handle.branch],
        { cwd: handle.worktreePath },
      );
    } catch {
      // Best-effort: snapshot failure shouldn't prevent cleanup
    }
  }

  // -------------------------------------------------------------------------
  // Private: Environment & Secrets
  // -------------------------------------------------------------------------

  private async resolveEnvironment(
    taskId: string,
    agentType: AgentType,
  ): Promise<AgentEnvironment> {
    const base: AgentEnvironment = {
      FLEET_TASK_ID: taskId,
      FLEET_AGENT_TYPE: agentType,
    };

    if (this.secretProvider) {
      const secrets = await this.secretProvider.getSecrets(taskId, agentType);
      return { ...base, ...secrets };
    }

    return base;
  }

  private async writeEnvFile(
    taskId: string,
    agentType: AgentType,
  ): Promise<string> {
    const env = await this.resolveEnvironment(taskId, agentType);
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const envFilePath = path.join(
      this.config.worktreeBaseDir,
      `.env-${taskId}-${crypto.randomBytes(4).toString('hex')}`,
    );

    // Write with restricted permissions (owner read-only)
    await writeFile(envFilePath, envContent, { mode: 0o600 });
    return envFilePath;
  }

  private async deleteEnvFile(envFilePath: string): Promise<void> {
    try {
      await unlink(envFilePath);
    } catch {
      // Best-effort: file may already be deleted
    }
  }

  // -------------------------------------------------------------------------
  // Private: List Active Helpers
  // -------------------------------------------------------------------------

  private async listActiveTmux(): Promise<AgentHandle[]> {
    try {
      const { stdout } = await execFile('tmux', [
        'list-sessions',
        '-F',
        '#{session_name}',
      ]);

      const sessions = stdout
        .trim()
        .split('\n')
        .filter((s) => s.startsWith('fleet-'));

      const handles: AgentHandle[] = [];
      for (const session of sessions) {
        const taskId = session.replace(/^fleet-/, '');
        const existing = this.activeHandles.get(taskId);
        if (existing) {
          handles.push(existing);
        } else {
          // Discovered session without tracked handle — partial info
          handles.push({
            taskId,
            branch: 'unknown',
            worktreePath: path.join(this.config.worktreeBaseDir, taskId),
            processRef: session,
            mode: 'local',
            spawnedAt: 'unknown',
          });
        }
      }

      return handles;
    } catch {
      // tmux server not running or no sessions
      return [];
    }
  }

  private async listActiveContainers(): Promise<AgentHandle[]> {
    try {
      const dockerHostEnv: Record<string, string> = {};
      if (this.config.dockerHost) {
        dockerHostEnv.DOCKER_HOST = this.config.dockerHost;
      }

      const { stdout } = await execFile(
        this.runtime(),
        [
          'ps',
          '--filter', 'label=dixie-fleet=true',
          '--format', '{{.ID}}\t{{.Label "fleet-task-id"}}',
        ],
        { env: { ...process.env, ...dockerHostEnv } },
      );

      if (!stdout.trim()) return [];

      const handles: AgentHandle[] = [];
      for (const line of stdout.trim().split('\n')) {
        const [containerId, taskId] = line.split('\t');
        if (!containerId || !taskId) continue;

        const existing = this.activeHandles.get(taskId);
        if (existing) {
          handles.push(existing);
        } else {
          handles.push({
            taskId,
            branch: 'unknown',
            worktreePath: path.join(this.config.worktreeBaseDir, taskId),
            processRef: containerId,
            mode: 'container',
            spawnedAt: 'unknown',
          });
        }
      }

      return handles;
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Private: Cleanup
  // -------------------------------------------------------------------------

  private async cleanupPartialState(
    worktreePath: string,
    worktreeCreated: boolean,
  ): Promise<void> {
    if (worktreeCreated) {
      try {
        await execFile('git', ['worktree', 'remove', '--force', worktreePath], {
          cwd: this.config.repoRoot,
        });
      } catch {
        // Force-remove the directory if worktree removal fails
        try {
          await rm(worktreePath, { recursive: true, force: true });
        } catch {
          // Swallow — best effort
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private: Utilities
  // -------------------------------------------------------------------------

  /** Get the container runtime binary name. */
  private runtime(): string {
    return this.config.containerRuntime ?? 'docker';
  }

  /**
   * Escape a value for safe use in a shell export statement.
   * Wraps the value in single quotes and escapes embedded single quotes.
   */
  private shellEscape(value: string): string {
    return `'${value.replace(/'/g, "'\\''")}'`;
  }
}
