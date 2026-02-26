/**
 * Agent Model Router Unit Tests — Task-Aware Model Selection with Reputation Weighting
 *
 * Tests verify:
 * - Default routing for each task type (bug_fix->opus, feature->opus, refactor->codex-mini, review->gemini, docs->sonnet)
 * - Explicit override bypasses all other routing logic
 * - Reputation-weighted: score >= 0.8 gets premium model (claude-opus-4-6)
 * - Reputation-weighted: score < 0.8 uses task-type default
 * - Unavailable model falls through to next candidate in priority chain
 * - Fallback model used when all others unavailable
 * - setModelAvailability toggles correctly
 * - resolveAgentType() returns correct agent type for each model string
 *
 * @since cycle-012 — Sprint 89, Task T-4.5
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  AgentModelRouter,
  resolveAgentType,
  DEFAULT_MODEL_ROUTING_CONFIG,
  type TaskType,
  type RoutingDecision,
  type ModelRoutingConfig,
} from '../agent-model-router.js';

// ---------------------------------------------------------------------------
// T-4.5: resolveAgentType() Tests
// ---------------------------------------------------------------------------

describe('resolveAgentType', () => {
  it('maps claude models to claude_code', () => {
    expect(resolveAgentType('claude-opus-4-6')).toBe('claude_code');
    expect(resolveAgentType('claude-sonnet-4-5')).toBe('claude_code');
    expect(resolveAgentType('claude-3-opus')).toBe('claude_code');
  });

  it('maps models containing "sonnet" to claude_code', () => {
    expect(resolveAgentType('sonnet-4-5')).toBe('claude_code');
    expect(resolveAgentType('some-sonnet-model')).toBe('claude_code');
  });

  it('maps models containing "opus" to claude_code', () => {
    expect(resolveAgentType('opus-4-6')).toBe('claude_code');
    expect(resolveAgentType('some-opus-variant')).toBe('claude_code');
  });

  it('maps codex models to codex', () => {
    expect(resolveAgentType('codex-mini-latest')).toBe('codex');
    expect(resolveAgentType('codex-large')).toBe('codex');
  });

  it('maps gemini models to gemini', () => {
    expect(resolveAgentType('gemini-2.5-pro')).toBe('gemini');
    expect(resolveAgentType('gemini-flash')).toBe('gemini');
  });

  it('defaults unknown models to claude_code', () => {
    expect(resolveAgentType('gpt-5')).toBe('claude_code');
    expect(resolveAgentType('llama-3')).toBe('claude_code');
    expect(resolveAgentType('unknown-model')).toBe('claude_code');
  });

  it('is case-insensitive', () => {
    expect(resolveAgentType('CLAUDE-OPUS-4-6')).toBe('claude_code');
    expect(resolveAgentType('Gemini-2.5-Pro')).toBe('gemini');
    expect(resolveAgentType('CODEX-MINI-LATEST')).toBe('codex');
  });
});

// ---------------------------------------------------------------------------
// T-4.5: Default Routing Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — default routing per task type', () => {
  let router: AgentModelRouter;

  beforeEach(() => {
    router = new AgentModelRouter();
  });

  it('routes bug_fix to claude-opus-4-6', () => {
    const decision = router.selectModel('bug_fix');
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.agentType).toBe('claude_code');
    expect(decision.reason).toBe('task_type_default');
    expect(decision.reputationScore).toBeNull();
  });

  it('routes feature to claude-opus-4-6', () => {
    const decision = router.selectModel('feature');
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.agentType).toBe('claude_code');
    expect(decision.reason).toBe('task_type_default');
  });

  it('routes refactor to codex-mini-latest', () => {
    const decision = router.selectModel('refactor');
    expect(decision.model).toBe('codex-mini-latest');
    expect(decision.agentType).toBe('codex');
    expect(decision.reason).toBe('task_type_default');
  });

  it('routes review to gemini-2.5-pro', () => {
    const decision = router.selectModel('review');
    expect(decision.model).toBe('gemini-2.5-pro');
    expect(decision.agentType).toBe('gemini');
    expect(decision.reason).toBe('task_type_default');
  });

  it('routes docs to claude-sonnet-4-5', () => {
    const decision = router.selectModel('docs');
    expect(decision.model).toBe('claude-sonnet-4-5');
    expect(decision.agentType).toBe('claude_code');
    expect(decision.reason).toBe('task_type_default');
  });
});

// ---------------------------------------------------------------------------
// T-4.5: Explicit Override Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — explicit override', () => {
  let router: AgentModelRouter;

  beforeEach(() => {
    router = new AgentModelRouter();
  });

  it('explicit override bypasses task-type default', () => {
    const decision = router.selectModel('bug_fix', {
      explicitModel: 'gemini-2.5-pro',
    });
    expect(decision.model).toBe('gemini-2.5-pro');
    expect(decision.agentType).toBe('gemini');
    expect(decision.reason).toBe('explicit_override');
  });

  it('explicit override bypasses reputation-weighted selection', () => {
    const decision = router.selectModel('refactor', {
      explicitModel: 'codex-mini-latest',
      reputationScore: 0.95, // would normally trigger premium
    });
    expect(decision.model).toBe('codex-mini-latest');
    expect(decision.reason).toBe('explicit_override');
    expect(decision.reputationScore).toBe(0.95);
  });

  it('explicit override with an unknown model still resolves', () => {
    const decision = router.selectModel('docs', {
      explicitModel: 'custom-model-v1',
    });
    expect(decision.model).toBe('custom-model-v1');
    expect(decision.agentType).toBe('claude_code'); // unknown defaults to claude_code
    expect(decision.reason).toBe('explicit_override');
  });

  it('explicit override falls through when model is unavailable', () => {
    router.setModelAvailability('gemini-2.5-pro', false);

    const decision = router.selectModel('bug_fix', {
      explicitModel: 'gemini-2.5-pro',
    });
    // Should fall through to task_type_default since explicit model is unavailable
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('task_type_default');
  });
});

// ---------------------------------------------------------------------------
// T-4.5: Reputation-Weighted Selection Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — reputation-weighted selection', () => {
  let router: AgentModelRouter;

  beforeEach(() => {
    router = new AgentModelRouter();
  });

  it('score >= 0.8 gets premium model (claude-opus-4-6)', () => {
    // Use a task type that does NOT default to opus to verify reputation override
    const decision = router.selectModel('refactor', {
      reputationScore: 0.85,
    });
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('reputation_weighted');
    expect(decision.reputationScore).toBe(0.85);
  });

  it('score exactly at threshold (0.8) gets premium model', () => {
    const decision = router.selectModel('refactor', {
      reputationScore: 0.8,
    });
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('reputation_weighted');
  });

  it('score 1.0 gets premium model', () => {
    const decision = router.selectModel('docs', {
      reputationScore: 1.0,
    });
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('reputation_weighted');
    expect(decision.reputationScore).toBe(1.0);
  });

  it('score < 0.8 uses task-type default', () => {
    const decision = router.selectModel('refactor', {
      reputationScore: 0.79,
    });
    expect(decision.model).toBe('codex-mini-latest');
    expect(decision.reason).toBe('task_type_default');
    expect(decision.reputationScore).toBe(0.79);
  });

  it('score of 0 uses task-type default', () => {
    const decision = router.selectModel('review', {
      reputationScore: 0,
    });
    expect(decision.model).toBe('gemini-2.5-pro');
    expect(decision.reason).toBe('task_type_default');
    expect(decision.reputationScore).toBe(0);
  });

  it('null reputation score uses task-type default', () => {
    const decision = router.selectModel('review', {
      reputationScore: null,
    });
    expect(decision.model).toBe('gemini-2.5-pro');
    expect(decision.reason).toBe('task_type_default');
    expect(decision.reputationScore).toBeNull();
  });

  it('omitted reputationScore treated as null', () => {
    const decision = router.selectModel('review');
    expect(decision.reputationScore).toBeNull();
    expect(decision.reason).toBe('task_type_default');
  });

  it('reputation-weighted selection falls through when premium model unavailable', () => {
    router.setModelAvailability('claude-opus-4-6', false);

    const decision = router.selectModel('refactor', {
      reputationScore: 0.95,
    });
    // Premium model unavailable, should fall through to task-type default
    expect(decision.model).toBe('codex-mini-latest');
    expect(decision.reason).toBe('task_type_default');
    expect(decision.reputationScore).toBe(0.95);
  });
});

// ---------------------------------------------------------------------------
// T-4.5: Unavailable Model Fallthrough Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — unavailable model fallthrough', () => {
  let router: AgentModelRouter;

  beforeEach(() => {
    router = new AgentModelRouter();
  });

  it('falls through to fallback when task-type default is unavailable', () => {
    router.setModelAvailability('codex-mini-latest', false);

    const decision = router.selectModel('refactor');
    // codex-mini-latest is unavailable, fallback is claude-opus-4-6
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('fallback');
  });

  it('falls through entire chain: explicit unavailable -> reputation skip -> default unavailable -> fallback', () => {
    router.setModelAvailability('gemini-2.5-pro', false);
    router.setModelAvailability('claude-opus-4-6', false);
    router.setModelAvailability('codex-mini-latest', false);

    // Explicit: gemini unavailable
    // Reputation: opus unavailable (premium model)
    // Task default for refactor: codex-mini-latest unavailable
    // Fallback: opus also unavailable — but fallback is always returned
    const decision = router.selectModel('refactor', {
      explicitModel: 'gemini-2.5-pro',
      reputationScore: 0.95,
    });

    // The fallback is always returned regardless of availability
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('fallback');
  });

  it('fallback model is always used when all other models are unavailable', () => {
    // Disable all default models
    router.setModelAvailability('claude-opus-4-6', false);
    router.setModelAvailability('codex-mini-latest', false);
    router.setModelAvailability('gemini-2.5-pro', false);
    router.setModelAvailability('claude-sonnet-4-5', false);

    const decision = router.selectModel('docs');
    expect(decision.model).toBe('claude-opus-4-6');
    expect(decision.reason).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// T-4.5: setModelAvailability / isAvailable Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — setModelAvailability / isAvailable', () => {
  let router: AgentModelRouter;

  beforeEach(() => {
    router = new AgentModelRouter();
  });

  it('all models start as available', () => {
    expect(router.isAvailable('claude-opus-4-6')).toBe(true);
    expect(router.isAvailable('codex-mini-latest')).toBe(true);
    expect(router.isAvailable('gemini-2.5-pro')).toBe(true);
    expect(router.isAvailable('claude-sonnet-4-5')).toBe(true);
  });

  it('setModelAvailability(false) marks model unavailable', () => {
    router.setModelAvailability('gemini-2.5-pro', false);
    expect(router.isAvailable('gemini-2.5-pro')).toBe(false);
  });

  it('setModelAvailability(true) restores availability', () => {
    router.setModelAvailability('gemini-2.5-pro', false);
    expect(router.isAvailable('gemini-2.5-pro')).toBe(false);

    router.setModelAvailability('gemini-2.5-pro', true);
    expect(router.isAvailable('gemini-2.5-pro')).toBe(true);
  });

  it('unknown models are assumed available (open-world assumption)', () => {
    expect(router.isAvailable('never-seen-before-model')).toBe(true);
  });

  it('can disable and re-enable the fallback model', () => {
    router.setModelAvailability('claude-opus-4-6', false);
    expect(router.isAvailable('claude-opus-4-6')).toBe(false);

    router.setModelAvailability('claude-opus-4-6', true);
    expect(router.isAvailable('claude-opus-4-6')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-4.5: Custom Config Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — custom configuration', () => {
  it('uses custom defaults when provided', () => {
    const customConfig: ModelRoutingConfig = {
      defaults: [
        { taskType: 'bug_fix', model: 'gemini-2.5-pro' },
        { taskType: 'feature', model: 'codex-mini-latest' },
        { taskType: 'refactor', model: 'claude-sonnet-4-5' },
        { taskType: 'review', model: 'claude-opus-4-6' },
        { taskType: 'docs', model: 'codex-mini-latest' },
      ],
      fallbackModel: 'claude-sonnet-4-5',
      reputationThreshold: 0.9,
      premiumModel: 'gemini-2.5-pro',
    };

    const router = new AgentModelRouter(customConfig);

    const bugDecision = router.selectModel('bug_fix');
    expect(bugDecision.model).toBe('gemini-2.5-pro');

    // Reputation threshold is 0.9 in custom config
    const repDecision = router.selectModel('feature', { reputationScore: 0.85 });
    expect(repDecision.reason).toBe('task_type_default'); // 0.85 < 0.9

    const highRepDecision = router.selectModel('feature', { reputationScore: 0.95 });
    expect(highRepDecision.model).toBe('gemini-2.5-pro'); // custom premium model
    expect(highRepDecision.reason).toBe('reputation_weighted');
  });

  it('uses custom fallback model', () => {
    const customConfig: ModelRoutingConfig = {
      defaults: [],
      fallbackModel: 'codex-mini-latest',
      reputationThreshold: 0.8,
      premiumModel: 'claude-opus-4-6',
    };

    const router = new AgentModelRouter(customConfig);

    // No defaults configured, so everything falls through to fallback
    const decision = router.selectModel('bug_fix');
    expect(decision.model).toBe('codex-mini-latest');
    expect(decision.reason).toBe('fallback');
    expect(decision.agentType).toBe('codex');
  });
});

// ---------------------------------------------------------------------------
// T-4.5: RoutingDecision Shape Tests
// ---------------------------------------------------------------------------

describe('AgentModelRouter — RoutingDecision shape', () => {
  it('always returns all required fields', () => {
    const router = new AgentModelRouter();
    const decision = router.selectModel('bug_fix');

    expect(decision).toHaveProperty('agentType');
    expect(decision).toHaveProperty('model');
    expect(decision).toHaveProperty('reason');
    expect(decision).toHaveProperty('reputationScore');
  });

  it('preserves reputation score in the decision when provided', () => {
    const router = new AgentModelRouter();
    const decision = router.selectModel('bug_fix', { reputationScore: 0.42 });
    expect(decision.reputationScore).toBe(0.42);
  });

  it('reason is one of: explicit_override, reputation_weighted, task_type_default, fallback', () => {
    const router = new AgentModelRouter();
    const validReasons = ['explicit_override', 'reputation_weighted', 'task_type_default', 'fallback'];

    const d1 = router.selectModel('bug_fix');
    expect(validReasons).toContain(d1.reason);

    const d2 = router.selectModel('bug_fix', { explicitModel: 'gemini-2.5-pro' });
    expect(validReasons).toContain(d2.reason);

    const d3 = router.selectModel('refactor', { reputationScore: 0.9 });
    expect(validReasons).toContain(d3.reason);

    router.setModelAvailability('codex-mini-latest', false);
    router.setModelAvailability('claude-opus-4-6', false);
    const d4 = router.selectModel('refactor');
    expect(validReasons).toContain(d4.reason);
  });
});
