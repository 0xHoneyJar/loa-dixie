/**
 * Agent-to-Agent API types.
 *
 * ERC-6551 Token-Bound Account (TBA) authentication with x402 metering.
 * Enables organism-to-organism communication per Conway thesis.
 *
 * See: SDD §6.1.3 (Agent API), §7.2 (TBA Authentication),
 *      §8.5 (x402 Micropayments), PRD FR-6
 */

/** Agent query request (POST /api/agent/query) */
export interface AgentQueryRequest {
  /** Query text for the Oracle */
  readonly query: string;
  /** Desired response format */
  readonly format?: 'text' | 'json' | 'structured';
  /** Maximum response tokens */
  readonly maxTokens?: number;
  /** Knowledge domain filter */
  readonly knowledgeDomain?: string;
  /** Maximum acceptable cost in micro-USD */
  readonly maxCostMicroUsd?: number;
  /** Session context for multi-turn conversations */
  readonly sessionId?: string;
}

/** Agent query response */
export interface AgentQueryResponse {
  /** Response content */
  readonly response: string;
  /** Response format used */
  readonly format: 'text' | 'json' | 'structured';
  /** Knowledge sources referenced */
  readonly sources: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly relevance: number;
  }>;
  /** Cost metadata */
  readonly cost: {
    readonly modelUsed: string;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly costMicroUsd: number;
  };
  /** x402 receipt for payment verification */
  readonly receipt?: X402Receipt;
  /** Session ID for multi-turn */
  readonly sessionId?: string;
  /** Knowledge freshness metadata (Task 19.3: Adaptive Retrieval) */
  readonly freshness?: {
    readonly confidence: 'high' | 'medium' | 'low';
    readonly disclaimer: string | null;
    readonly staleSourceCount: number;
  };
}

/** Agent capabilities discovery (GET /api/agent/capabilities) */
export interface AgentCapabilities {
  /** Oracle identity */
  readonly oracleId: string;
  /** Available knowledge domains */
  readonly knowledgeDomains: readonly string[];
  /** Supported query formats */
  readonly supportedFormats: readonly string[];
  /** Model pool available */
  readonly modelPool: string;
  /** Available skills/tools */
  readonly skills: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly costEstimateMicroUsd: number;
  }>;
  /** Rate limits for agent API */
  readonly rateLimits: {
    readonly requestsPerMinute: number;
    readonly requestsPerDay: number;
  };
  /** Pricing info */
  readonly pricing: {
    readonly baseCostMicroUsd: number;
    readonly perTokenMicroUsd: number;
  };
}

/** x402 payment receipt */
export interface X402Receipt {
  readonly receiptId: string;
  readonly payer: string;
  readonly payee: string;
  readonly amountMicroUsd: number;
  readonly timestamp: string;
  readonly transactionHash?: string;
}

/** TBA (Token-Bound Account) verification result */
export interface TBAVerification {
  /** The verified TBA address */
  readonly tbaAddress: string;
  /** Parent NFT contract address */
  readonly nftContract: string;
  /** Parent NFT token ID */
  readonly tokenId: string;
  /** Owner wallet address */
  readonly ownerWallet: string;
  /** Verification timestamp */
  readonly verifiedAt: string;
  /** Whether result was from cache */
  readonly cached: boolean;
}

/** Agent rate limit configuration */
export interface AgentRateLimitConfig {
  /** Requests per minute per agent */
  readonly agentRpm: number;
  /** Requests per day per agent */
  readonly agentRpd: number;
}

/** Default agent rate limits */
export const DEFAULT_AGENT_RATE_LIMITS: AgentRateLimitConfig = {
  agentRpm: 30,
  agentRpd: 1000,
};

/** Agent interaction log entry (for memory system) */
export interface AgentInteractionLog {
  readonly type: 'agent_interaction';
  readonly fromAgent: string;
  readonly toOracle: string;
  readonly query: string;
  readonly responseTokens: number;
  readonly costMicroUsd: number;
  readonly timestamp: string;
}
