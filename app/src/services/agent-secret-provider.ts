/**
 * Agent Secret Provider — Scoped Secret Issuance & Cleanup
 *
 * Provides task-scoped secrets to fleet agents based on agent type.
 * Each agent type receives only the minimal set of environment variables
 * required for its operation. All issuances are audit-logged.
 *
 * See: SDD §2.5 (secret scoping), §4.1 (audit trail)
 * @since cycle-012 — Sprint 87, Task T-2.11
 */
import type { AgentType } from '../types/fleet.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Interface for providing scoped secrets to fleet agents. */
export interface AgentSecretProvider {
  /**
   * Retrieve scoped secrets for a given task and agent type.
   * Returns a record of environment variable key-value pairs.
   */
  getSecrets(taskId: string, scope: AgentType): Promise<Record<string, string>>;

  /**
   * Clean up any resources associated with a task's secrets.
   * Must be called after the agent process has terminated.
   */
  cleanup(taskId: string): Promise<void>;
}

/** A single audit log entry for secret issuance. */
export interface SecretAuditEntry {
  readonly taskId: string;
  readonly scope: AgentType;
  readonly keysIssued: readonly string[];
  readonly issuedAt: string;
  readonly cleanedUpAt?: string;
}

/** Injectable dependencies for the default secret provider. */
export interface SecretProviderDeps {
  /** Function to retrieve a secret by key from a backing store. */
  readonly getSecret: (key: string) => Promise<string | undefined>;
  /** Optional logger for audit trail. */
  readonly log?: (level: string, data: Record<string, unknown>) => void;
  /** Cleanup delay in milliseconds (default: 5000). */
  readonly cleanupDelayMs?: number;
  /** Timer function (injectable for testing). */
  readonly setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof globalThis.setTimeout>;
}

// ---------------------------------------------------------------------------
// Scoped Secret Definitions
// ---------------------------------------------------------------------------

/**
 * Maps each agent type to the environment variable keys it is allowed to receive.
 * This enforces the principle of least privilege for secret distribution.
 */
const SCOPED_SECRET_KEYS: Record<AgentType, readonly string[]> = {
  claude_code: [
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN',
    'FLEET_TASK_ID',
  ],
  codex: [
    'OPENAI_API_KEY',
    'GITHUB_TOKEN',
    'FLEET_TASK_ID',
  ],
  gemini: [
    'GOOGLE_AI_API_KEY',
    'GITHUB_TOKEN',
    'FLEET_TASK_ID',
  ],
};

// ---------------------------------------------------------------------------
// DefaultAgentSecretProvider
// ---------------------------------------------------------------------------

/**
 * Default implementation of AgentSecretProvider.
 *
 * - Scoped: each agent type only receives its allowed secrets
 * - Audited: every issuance and cleanup is logged
 * - Testable: all dependencies are injectable
 */
export class DefaultAgentSecretProvider implements AgentSecretProvider {
  private readonly deps: SecretProviderDeps;
  private readonly auditLog: SecretAuditEntry[] = [];
  private readonly pendingCleanups: Map<string, ReturnType<typeof globalThis.setTimeout>> = new Map();

  constructor(deps: SecretProviderDeps) {
    this.deps = deps;
  }

  /**
   * Retrieve scoped secrets for a task.
   * Only keys allowed by SCOPED_SECRET_KEYS[scope] are resolved.
   */
  async getSecrets(taskId: string, scope: AgentType): Promise<Record<string, string>> {
    const allowedKeys = SCOPED_SECRET_KEYS[scope];
    if (!allowedKeys) {
      this.log('warn', {
        event: 'secret_scope_unknown',
        taskId,
        scope,
      });
      return {};
    }

    const secrets: Record<string, string> = {};
    const keysIssued: string[] = [];

    for (const key of allowedKeys) {
      const value = await this.deps.getSecret(key);
      if (value !== undefined) {
        secrets[key] = value;
        keysIssued.push(key);
      }
    }

    // Audit trail
    const entry: SecretAuditEntry = {
      taskId,
      scope,
      keysIssued,
      issuedAt: new Date().toISOString(),
    };
    this.auditLog.push(entry);

    this.log('info', {
      event: 'secrets_issued',
      taskId,
      scope,
      keyCount: keysIssued.length,
      keys: keysIssued,
    });

    // Schedule automatic cleanup
    this.scheduleCleanup(taskId);

    return secrets;
  }

  /**
   * Clean up resources associated with a task's secrets.
   * Cancels any pending automatic cleanup timer.
   */
  async cleanup(taskId: string): Promise<void> {
    // Cancel pending auto-cleanup timer
    const pendingTimer = this.pendingCleanups.get(taskId);
    if (pendingTimer !== undefined) {
      clearTimeout(pendingTimer);
      this.pendingCleanups.delete(taskId);
    }

    // Mark audit entry as cleaned up
    const entry = this.auditLog.find(
      (e) => e.taskId === taskId && !e.cleanedUpAt,
    );
    if (entry) {
      // Mutate in-place (bounded internal buffer)
      (entry as { cleanedUpAt?: string }).cleanedUpAt = new Date().toISOString();
    }

    this.log('info', {
      event: 'secrets_cleaned_up',
      taskId,
    });
  }

  /**
   * Get the audit log (for testing and inspection).
   */
  getAuditLog(): readonly SecretAuditEntry[] {
    return this.auditLog;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  /**
   * Schedule automatic cleanup within the configured delay (default 5s).
   * This ensures env files don't linger if explicit cleanup isn't called.
   */
  private scheduleCleanup(taskId: string): void {
    const delayMs = this.deps.cleanupDelayMs ?? 5000;
    const timerFn = this.deps.setTimeout ?? globalThis.setTimeout;

    const timer = timerFn(() => {
      this.pendingCleanups.delete(taskId);
      this.cleanup(taskId).catch(() => {
        // Swallow errors from automatic cleanup
      });
    }, delayMs);

    this.pendingCleanups.set(taskId, timer);
  }

  private log(level: string, data: Record<string, unknown>): void {
    if (this.deps.log) {
      this.deps.log(level, data);
    }
  }
}
