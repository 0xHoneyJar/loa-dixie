/**
 * Autonomous Operation Mode — Owner-delegated agent autonomy.
 *
 * Enables dNFT agents to operate independently within governance constraints
 * with complete audit trails, budget enforcement, and daily summaries.
 *
 * See: SDD §4.7 (Autonomous Permission Engine), §5.2.2 (DB schema),
 *      §6.1.4 (Autonomous API), §7.4 (Security), PRD FR-8
 */

/** Capabilities that can be independently toggled for autonomous operation */
export type AutonomousCapability =
  | 'chat_initiate'       // Agent can start conversations
  | 'knowledge_search'    // Agent can search knowledge corpus
  | 'schedule_manage'     // Agent can create/cancel schedules
  | 'memory_write'        // Agent can write to soul memory
  | 'tool_execute'        // Agent can execute tools
  | 'agent_communicate';  // Agent can communicate with other agents

/** All available autonomous capabilities */
export const ALL_AUTONOMOUS_CAPABILITIES: readonly AutonomousCapability[] = [
  'chat_initiate',
  'knowledge_search',
  'schedule_manage',
  'memory_write',
  'tool_execute',
  'agent_communicate',
] as const;

/** Autonomous permissions for an NFT agent */
export interface AutonomousPermissions {
  readonly nftId: string;
  readonly enabled: boolean;
  readonly ownerWallet: string;
  readonly delegatedWallets: string[];
  readonly capabilities: Record<AutonomousCapability, boolean>;
  readonly budget: AutonomousBudget;
  readonly toolWhitelist: string[];
  readonly updatedAt: string;
}

/** Budget constraints for autonomous operation */
export interface AutonomousBudget {
  readonly dailyCapMicroUsd: number;
  readonly hourlyRateLimit: number;
  readonly requireConfirmationAboveUsd: number;
}

/** An autonomous action subject to permission checking */
export interface AutonomousAction {
  readonly nftId: string;
  readonly capability: AutonomousCapability;
  readonly tool?: string;
  readonly estimatedCostMicroUsd?: number;
  readonly requestedBy: string;
}

/** Result of a permission check */
export interface PermissionResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly requiresConfirmation: boolean;
  readonly dailySpendMicroUsd: number;
  readonly dailyCapMicroUsd: number;
}

/** Audit log entry for autonomous actions */
export interface AutonomousAuditEntry {
  readonly nftId: string;
  readonly timestamp: string;
  readonly action: AutonomousAction;
  readonly result: PermissionResult;
  readonly executedBy: 'agent' | 'owner' | 'delegate';
}

/** Daily summary of autonomous activity */
export interface DailySummary {
  readonly nftId: string;
  readonly date: string;
  readonly totalActions: number;
  readonly allowedActions: number;
  readonly deniedActions: number;
  readonly totalSpendMicroUsd: number;
  readonly capabilitiesUsed: AutonomousCapability[];
  readonly toolsUsed: string[];
  readonly confirmationsRequired: number;
}

/** Default permissions — all capabilities disabled, conservative budget */
export function defaultPermissions(nftId: string, ownerWallet: string, budgetDefaultMicroUsd: number): AutonomousPermissions {
  return {
    nftId,
    enabled: false,
    ownerWallet,
    delegatedWallets: [],
    capabilities: {
      chat_initiate: false,
      knowledge_search: false,
      schedule_manage: false,
      memory_write: false,
      tool_execute: false,
      agent_communicate: false,
    },
    budget: {
      dailyCapMicroUsd: budgetDefaultMicroUsd,
      hourlyRateLimit: 60,
      requireConfirmationAboveUsd: 1_000_000, // $1 in micro-USD
    },
    toolWhitelist: [],
    updatedAt: new Date().toISOString(),
  };
}
