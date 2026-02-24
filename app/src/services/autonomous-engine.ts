import type { FinnClient } from '../proxy/finn-client.js';
import type { ProjectionCache } from './projection-cache.js';
import {
  defaultPermissions,
  type AutonomousAction,
  type AutonomousAuditEntry,
  type AutonomousBudget,
  type AutonomousCapability,
  type AutonomousPermissions,
  type DailySummary,
  type PermissionResult,
} from '../types/autonomous.js';

/**
 * Autonomous Permission Engine — manages owner-delegated agent autonomy.
 *
 * Permission check flow (SDD §4.7):
 * 1. Load permissions for nftId
 * 2. Verify autonomous mode is enabled
 * 3. Verify requester is owner or delegate
 * 4. Verify capability is enabled
 * 5. Verify tool is whitelisted (if tool action)
 * 6. Check budget (daily cap)
 * 7. Check if confirmation required (above threshold)
 *
 * See: SDD §4.7, §5.2.2, §7.4, PRD FR-8
 */
export class AutonomousEngine {
  private readonly auditLog: AutonomousAuditEntry[] = [];
  private readonly maxAuditEntries: number;
  private readonly budgetDefaultMicroUsd: number;
  private readonly log?: (level: string, data: Record<string, unknown>) => void;

  constructor(
    private readonly finnClient: FinnClient,
    private readonly cache: ProjectionCache<AutonomousPermissions> | null,
    opts?: { budgetDefaultMicroUsd?: number; maxAuditEntries?: number; log?: (level: string, data: Record<string, unknown>) => void },
  ) {
    this.budgetDefaultMicroUsd = opts?.budgetDefaultMicroUsd ?? 100_000;
    this.maxAuditEntries = opts?.maxAuditEntries ?? 10_000;
    this.log = opts?.log;
  }

  /**
   * Check if an autonomous action is permitted.
   * 7-step permission flow per SDD §4.7.
   */
  async checkPermission(action: AutonomousAction): Promise<PermissionResult> {
    const permissions = await this.getPermissions(action.nftId);
    const dailySpend = this.getDailySpend(action.nftId);

    // Step 1-2: Autonomous mode must be enabled
    if (!permissions.enabled) {
      const result: PermissionResult = {
        allowed: false,
        reason: 'Autonomous mode is not enabled',
        requiresConfirmation: false,
        dailySpendMicroUsd: dailySpend,
        dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
      };
      this.logAudit(action, result, permissions);
      return result;
    }

    // Step 3: Verify requester is owner or delegate
    const isAuthorized =
      action.requestedBy === permissions.ownerWallet ||
      permissions.delegatedWallets.includes(action.requestedBy);
    if (!isAuthorized) {
      const result: PermissionResult = {
        allowed: false,
        reason: 'Requester is not owner or authorized delegate',
        requiresConfirmation: false,
        dailySpendMicroUsd: dailySpend,
        dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
      };
      this.logAudit(action, result, permissions);
      return result;
    }

    // Step 4: Verify capability is enabled
    if (!permissions.capabilities[action.capability]) {
      const result: PermissionResult = {
        allowed: false,
        reason: `Capability '${action.capability}' is not enabled`,
        requiresConfirmation: false,
        dailySpendMicroUsd: dailySpend,
        dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
      };
      this.logAudit(action, result, permissions);
      return result;
    }

    // Step 5: Verify tool is whitelisted (if tool action)
    if (action.tool && permissions.toolWhitelist.length > 0) {
      if (!permissions.toolWhitelist.includes(action.tool)) {
        const result: PermissionResult = {
          allowed: false,
          reason: `Tool '${action.tool}' is not in the whitelist`,
          requiresConfirmation: false,
          dailySpendMicroUsd: dailySpend,
          dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
        };
        this.logAudit(action, result, permissions);
        return result;
      }
    }

    // Step 6: Check budget (daily cap)
    const estimatedCost = action.estimatedCostMicroUsd ?? 0;
    if (dailySpend + estimatedCost > permissions.budget.dailyCapMicroUsd) {
      const result: PermissionResult = {
        allowed: false,
        reason: `Daily budget exceeded (${dailySpend + estimatedCost} > ${permissions.budget.dailyCapMicroUsd} micro-USD)`,
        requiresConfirmation: false,
        dailySpendMicroUsd: dailySpend,
        dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
      };
      this.logAudit(action, result, permissions);
      return result;
    }

    // Step 7: Check if confirmation required (above threshold)
    const requiresConfirmation = estimatedCost > permissions.budget.requireConfirmationAboveUsd;

    const result: PermissionResult = {
      allowed: true,
      reason: requiresConfirmation
        ? `Action requires confirmation (cost ${estimatedCost} > threshold ${permissions.budget.requireConfirmationAboveUsd})`
        : 'Action permitted',
      requiresConfirmation,
      dailySpendMicroUsd: dailySpend,
      dailyCapMicroUsd: permissions.budget.dailyCapMicroUsd,
    };
    this.logAudit(action, result, permissions);
    return result;
  }

  /**
   * Get autonomous permissions for an NFT.
   */
  async getPermissions(nftId: string): Promise<AutonomousPermissions> {
    // Try cache
    if (this.cache) {
      const cached = await this.cache.get(nftId).catch(() => null);
      if (cached) return cached;
    }

    // Fetch from loa-finn
    try {
      const result = await this.finnClient.request<AutonomousPermissions>(
        'GET',
        `/api/autonomous/${encodeURIComponent(nftId)}/permissions`,
      );

      if (this.cache) {
        await this.cache.set(nftId, result).catch(() => {});
      }

      return result;
    } catch {
      // Return defaults (all disabled)
      return defaultPermissions(nftId, '', this.budgetDefaultMicroUsd);
    }
  }

  /**
   * Update autonomous permissions for an NFT.
   * Only the owner can update permissions.
   */
  async updatePermissions(
    nftId: string,
    ownerWallet: string,
    updates: Partial<Pick<AutonomousPermissions, 'enabled' | 'capabilities' | 'delegatedWallets' | 'toolWhitelist'>> & { budget?: Partial<AutonomousBudget> },
  ): Promise<AutonomousPermissions> {
    const current = await this.getPermissions(nftId);

    // Verify ownership
    if (current.ownerWallet && current.ownerWallet !== ownerWallet) {
      throw { status: 403, body: { error: 'forbidden', message: 'Only the owner can update permissions' } };
    }

    const updated: AutonomousPermissions = {
      ...current,
      ownerWallet,
      enabled: updates.enabled ?? current.enabled,
      capabilities: updates.capabilities
        ? { ...current.capabilities, ...updates.capabilities }
        : current.capabilities,
      delegatedWallets: updates.delegatedWallets ?? current.delegatedWallets,
      toolWhitelist: updates.toolWhitelist ?? current.toolWhitelist,
      budget: updates.budget
        ? { ...current.budget, ...updates.budget }
        : current.budget,
      updatedAt: new Date().toISOString(),
    };

    // Persist via loa-finn
    try {
      await this.finnClient.request(
        'PUT',
        `/api/autonomous/${encodeURIComponent(nftId)}/permissions`,
        { body: updated },
      );
    } catch (err) {
      console.warn('[signal-loss]', { event: 'autonomous_permission_write', nftId, error: String(err) });
    }

    // Update cache
    if (this.cache) {
      await this.cache.set(nftId, updated).catch(() => {});
    }

    return updated;
  }

  /**
   * Get daily summary of autonomous activity.
   */
  getDailySummary(nftId: string): DailySummary {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = this.auditLog.filter(
      (e) => e.nftId === nftId && e.timestamp.startsWith(today),
    );

    const allowedEntries = todayEntries.filter((e) => e.result.allowed);
    const deniedEntries = todayEntries.filter((e) => !e.result.allowed);

    const capabilitiesUsed = [...new Set(
      allowedEntries.map((e) => e.action.capability),
    )];
    const toolsUsed = [...new Set(
      allowedEntries
        .filter((e) => e.action.tool)
        .map((e) => e.action.tool!),
    )];

    return {
      nftId,
      date: today,
      totalActions: todayEntries.length,
      allowedActions: allowedEntries.length,
      deniedActions: deniedEntries.length,
      totalSpendMicroUsd: this.getDailySpend(nftId),
      capabilitiesUsed,
      toolsUsed,
      confirmationsRequired: todayEntries.filter((e) => e.result.requiresConfirmation).length,
    };
  }

  /**
   * Get audit log entries for an NFT.
   */
  getAuditLog(nftId: string, limit = 100): AutonomousAuditEntry[] {
    return this.auditLog
      .filter((e) => e.nftId === nftId)
      .slice(-limit);
  }

  /**
   * Record actual cost for a previously permitted action (Bridge medium-7).
   * Updates the audit entry so getDailySpend() uses actual cost.
   */
  recordActualCost(nftId: string, timestamp: string, actualCostMicroUsd: number): boolean {
    // Find the matching audit entry (by nftId + closest timestamp)
    const entry = this.auditLog.find(
      (e) => e.nftId === nftId && e.timestamp === timestamp && e.result.allowed,
    );
    if (entry) {
      // TypeScript readonly — cast for in-place mutation (bounded buffer, internal)
      (entry as { actualCostMicroUsd?: number }).actualCostMicroUsd = actualCostMicroUsd;
      return true;
    }
    return false;
  }

  /**
   * Invalidate cached permissions.
   */
  async invalidatePermissions(nftId: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidate(nftId).catch(() => {});
    }
  }

  private getDailySpend(nftId: string): number {
    const today = new Date().toISOString().split('T')[0];
    return this.auditLog
      .filter(
        (e) =>
          e.nftId === nftId &&
          e.timestamp.startsWith(today) &&
          e.result.allowed,
      )
      .reduce((sum, e) => {
        // Prefer actual cost over estimated (Bridge medium-7)
        return sum + (e.actualCostMicroUsd ?? e.action.estimatedCostMicroUsd ?? 0);
      }, 0);
  }

  private logAudit(
    action: AutonomousAction,
    result: PermissionResult,
    permissions: AutonomousPermissions,
  ): void {
    const entry: AutonomousAuditEntry = {
      nftId: action.nftId,
      timestamp: new Date().toISOString(),
      action,
      result,
      executedBy: action.requestedBy === permissions.ownerWallet ? 'owner' : 'delegate',
    };

    this.auditLog.push(entry);

    // Bounded buffer — evict oldest half when full (Bridge iter2-low-5)
    if (this.auditLog.length > this.maxAuditEntries) {
      const evictCount = Math.floor(this.auditLog.length / 2);
      if (this.log) {
        this.log('warn', {
          event: 'audit_log_eviction',
          nftId: action.nftId,
          evictedCount: evictCount,
          remainingCount: this.auditLog.length - evictCount,
        });
      }
      this.auditLog.splice(0, evictCount);
    }
  }
}
