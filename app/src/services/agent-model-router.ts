/**
 * Agent Model Router — Task-Aware Model Selection with Reputation Weighting
 *
 * Routes agent tasks to the optimal model based on a priority chain:
 * 1. Explicit override (caller-specified model)
 * 2. Reputation-weighted selection (agents with high scores get premium models)
 * 3. Task-type default (bug_fix -> opus, refactor -> codex-mini, etc.)
 * 4. Fallback (claude-opus-4-6)
 *
 * Each model is mapped to an AgentType that determines which execution backend
 * handles the request:
 * - claude_code: Claude models (opus, sonnet)
 * - codex: OpenAI Codex models
 * - gemini: Google Gemini models
 *
 * Model availability can be toggled at runtime via setModelAvailability()
 * to handle degraded upstream services without redeployment.
 *
 * See: SDD (cycle-012, Sprint 89) — Agent Model Router
 * @since cycle-012 — Sprint 89
 */

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

/**
 * Execution backend type for a given model.
 * Determines which SDK/API client handles the request.
 */
export type AgentType = 'claude_code' | 'codex' | 'gemini';

// ---------------------------------------------------------------------------
// Task Types
// ---------------------------------------------------------------------------

/**
 * Supported task types for model routing decisions.
 */
export type TaskType = 'bug_fix' | 'feature' | 'refactor' | 'review' | 'docs';

// ---------------------------------------------------------------------------
// Model Routing Config
// ---------------------------------------------------------------------------

/** Maps a task type to a default model identifier. */
export interface TaskModelMapping {
  readonly taskType: TaskType;
  readonly model: string;
}

/**
 * Configuration for the model routing system.
 * Defines default model assignments per task type and the global fallback.
 */
export interface ModelRoutingConfig {
  /** Default model assignments per task type. */
  readonly defaults: ReadonlyArray<TaskModelMapping>;
  /** Global fallback model when no other selection criteria match. */
  readonly fallbackModel: string;
  /** Reputation score threshold above which premium routing is considered. */
  readonly reputationThreshold: number;
  /** Model to use for high-reputation agents (reputation-weighted selection). */
  readonly premiumModel: string;
}

// ---------------------------------------------------------------------------
// Routing Decision
// ---------------------------------------------------------------------------

/**
 * The result of a model routing decision, including the selected model,
 * agent execution type, reason for selection, and reputation context.
 */
export interface RoutingDecision {
  /** Execution backend type (claude_code, codex, gemini). */
  readonly agentType: AgentType;
  /** Selected model identifier. */
  readonly model: string;
  /** Human-readable reason for the routing decision. */
  readonly reason: string;
  /** Agent reputation score at time of routing (null if unavailable). */
  readonly reputationScore: number | null;
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

/**
 * DEFAULT_MODEL_ROUTING_CONFIG — Production routing defaults.
 *
 * Task-type model assignments reflect the strengths of each model:
 * - bug_fix: claude-opus-4-6 (deep reasoning for root cause analysis)
 * - feature: claude-opus-4-6 (complex multi-file feature implementation)
 * - refactor: codex-mini-latest (fast, cost-efficient structural transforms)
 * - review: gemini-2.5-pro (broad context window for code review)
 * - docs: claude-sonnet-4-5 (balanced quality/cost for documentation)
 *
 * @since cycle-012 — Sprint 89
 */
export const DEFAULT_MODEL_ROUTING_CONFIG: ModelRoutingConfig = {
  defaults: [
    { taskType: 'bug_fix', model: 'claude-opus-4-6' },
    { taskType: 'feature', model: 'claude-opus-4-6' },
    { taskType: 'refactor', model: 'codex-mini-latest' },
    { taskType: 'review', model: 'gemini-2.5-pro' },
    { taskType: 'docs', model: 'claude-sonnet-4-5' },
  ],
  fallbackModel: 'claude-opus-4-6',
  reputationThreshold: 0.8,
  premiumModel: 'claude-opus-4-6',
};

// ---------------------------------------------------------------------------
// Agent Type Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the AgentType for a given model identifier.
 *
 * Mapping rules:
 * - Models containing 'claude' or 'sonnet' or 'opus' -> claude_code
 * - Models containing 'codex' -> codex
 * - Models containing 'gemini' -> gemini
 * - Unknown models default to claude_code (safest fallback)
 *
 * @since cycle-012 — Sprint 89
 */
export function resolveAgentType(model: string): AgentType {
  const lower = model.toLowerCase();
  if (lower.includes('claude') || lower.includes('sonnet') || lower.includes('opus')) {
    return 'claude_code';
  }
  if (lower.includes('codex')) {
    return 'codex';
  }
  if (lower.includes('gemini')) {
    return 'gemini';
  }
  // Conservative fallback — claude_code is the most capable backend
  return 'claude_code';
}

// ---------------------------------------------------------------------------
// Agent Model Router
// ---------------------------------------------------------------------------

/**
 * AgentModelRouter — routes tasks to models using a priority chain.
 *
 * Selection priority:
 * 1. Explicit override (caller passes a specific model)
 * 2. Reputation-weighted (high-reputation agents get the premium model)
 * 3. Task-type default (from config)
 * 4. Fallback (config.fallbackModel)
 *
 * Model health is tracked in-memory. Unavailable models are skipped
 * in the selection chain, falling through to the next candidate.
 *
 * @since cycle-012 — Sprint 89
 */
export class AgentModelRouter {
  private readonly config: ModelRoutingConfig;
  private readonly availability: Map<string, boolean> = new Map();

  constructor(config: ModelRoutingConfig = DEFAULT_MODEL_ROUTING_CONFIG) {
    this.config = config;
    // All models start as available
    for (const mapping of config.defaults) {
      this.availability.set(mapping.model, true);
    }
    this.availability.set(config.fallbackModel, true);
    this.availability.set(config.premiumModel, true);
  }

  /**
   * Select the optimal model for a task.
   *
   * @param taskType - The type of task being routed
   * @param options - Optional overrides and context
   * @returns A RoutingDecision with the selected model and reasoning
   *
   * @since cycle-012 — Sprint 89
   */
  selectModel(
    taskType: TaskType,
    options: {
      explicitModel?: string;
      reputationScore?: number | null;
    } = {},
  ): RoutingDecision {
    const reputationScore = options.reputationScore ?? null;

    // Priority 1: Explicit override
    if (options.explicitModel) {
      if (this.isAvailable(options.explicitModel)) {
        return {
          agentType: resolveAgentType(options.explicitModel),
          model: options.explicitModel,
          reason: 'explicit_override',
          reputationScore,
        };
      }
      // Explicit model unavailable — fall through with warning in reason
    }

    // Priority 2: Reputation-weighted selection
    if (reputationScore !== null && reputationScore >= this.config.reputationThreshold) {
      if (this.isAvailable(this.config.premiumModel)) {
        return {
          agentType: resolveAgentType(this.config.premiumModel),
          model: this.config.premiumModel,
          reason: 'reputation_weighted',
          reputationScore,
        };
      }
    }

    // Priority 3: Task-type default
    const taskDefault = this.config.defaults.find(d => d.taskType === taskType);
    if (taskDefault && this.isAvailable(taskDefault.model)) {
      return {
        agentType: resolveAgentType(taskDefault.model),
        model: taskDefault.model,
        reason: 'task_type_default',
        reputationScore,
      };
    }

    // Priority 4: Fallback
    return {
      agentType: resolveAgentType(this.config.fallbackModel),
      model: this.config.fallbackModel,
      reason: 'fallback',
      reputationScore,
    };
  }

  /**
   * Toggle model availability at runtime.
   *
   * When a model is marked unavailable, it is skipped during selection.
   * This allows graceful degradation when upstream providers experience
   * outages without requiring redeployment.
   *
   * @param model - The model identifier to toggle
   * @param available - Whether the model is available for routing
   *
   * @since cycle-012 — Sprint 89
   */
  setModelAvailability(model: string, available: boolean): void {
    this.availability.set(model, available);
  }

  /**
   * Check whether a model is currently available for routing.
   *
   * Models not explicitly tracked are assumed available (open-world assumption).
   */
  isAvailable(model: string): boolean {
    return this.availability.get(model) ?? true;
  }
}
