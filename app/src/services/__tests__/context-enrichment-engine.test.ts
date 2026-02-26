/**
 * Context Enrichment Engine Unit Tests — Three-Tier Prompt Assembly + Failure Context
 *
 * T-4.6 tests:
 * - CRITICAL sections always included regardless of token budget
 * - RELEVANT sections included when budget allows
 * - BACKGROUND sections omitted when budget tight
 * - Truncated flag set when sections pruned
 * - contextHash is deterministic (same input = same hash)
 * - Sections sorted by tier priority (CRITICAL first, BACKGROUND last)
 * - Token estimate is chars/4
 *
 * T-4.7 tests:
 * - captureFailureContext captures error output at CRITICAL tier
 * - captureFailureContext captures diff at RELEVANT tier
 * - sanitize() removes env var assignments (KEY=value)
 * - sanitize() removes secret patterns (api_key=..., token=...)
 * - sanitize() removes Bearer tokens
 * - sanitize() removes filesystem paths (/home/...)
 * - sanitize() removes AWS keys (AKIA...)
 * - sanitize() removes long hex strings
 * - Empty diff and error handled gracefully
 *
 * @since cycle-012 — Sprint 89, Tasks T-4.6, T-4.7
 */
import { describe, it, expect } from 'vitest';

import {
  ContextEnrichmentEngine,
  estimateTokens,
  sanitize,
  createSection,
  type ContextSection,
  type ContextTier,
} from '../context-enrichment-engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a section with a known content length for predictable token estimates. */
function makeSection(tier: ContextTier, label: string, charCount: number): ContextSection {
  const content = 'x'.repeat(charCount);
  return createSection(tier, label, content);
}

// ---------------------------------------------------------------------------
// T-4.6: estimateTokens() Tests
// ---------------------------------------------------------------------------

describe('estimateTokens', () => {
  it('estimates tokens as ceil(chars / 4)', () => {
    expect(estimateTokens('a')).toBe(1); // 1/4 = 0.25 -> ceil = 1
    expect(estimateTokens('abcd')).toBe(1); // 4/4 = 1
    expect(estimateTokens('abcde')).toBe(2); // 5/4 = 1.25 -> ceil = 2
    expect(estimateTokens('abcdefgh')).toBe(2); // 8/4 = 2
    expect(estimateTokens('abcdefghi')).toBe(3); // 9/4 = 2.25 -> ceil = 3
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('handles long strings', () => {
    const longText = 'a'.repeat(1000);
    expect(estimateTokens(longText)).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: createSection() Tests
// ---------------------------------------------------------------------------

describe('createSection', () => {
  it('creates a section with auto-estimated token count', () => {
    const section = createSection('CRITICAL', 'Task Def', 'hello world');
    expect(section.tier).toBe('CRITICAL');
    expect(section.label).toBe('Task Def');
    expect(section.content).toBe('hello world');
    expect(section.tokenEstimate).toBe(estimateTokens('hello world'));
  });

  it('works for all three tiers', () => {
    const tiers: ContextTier[] = ['CRITICAL', 'RELEVANT', 'BACKGROUND'];
    for (const tier of tiers) {
      const section = createSection(tier, `Section ${tier}`, 'content');
      expect(section.tier).toBe(tier);
    }
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — CRITICAL Sections Always Included
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — CRITICAL sections', () => {
  it('CRITICAL sections always included regardless of token budget', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 1 });

    // CRITICAL section has 100 chars = 25 tokens, exceeds budget of 1
    const critical = createSection('CRITICAL', 'Task', 'a'.repeat(100));
    const result = engine.buildPrompt([critical]);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].tier).toBe('CRITICAL');
    expect(result.prompt).toContain('a'.repeat(100));
  });

  it('multiple CRITICAL sections all included even when exceeding budget', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 1 });

    const sections = [
      createSection('CRITICAL', 'Constraints', 'constraint data here'),
      createSection('CRITICAL', 'Task Definition', 'define the task'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections).toHaveLength(2);
    expect(result.sections.every(s => s.tier === 'CRITICAL')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — RELEVANT Sections Included When Budget Allows
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — RELEVANT sections', () => {
  it('RELEVANT sections included when budget allows', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'task content'),
      createSection('RELEVANT', 'Related Code', 'some code here'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[1].tier).toBe('RELEVANT');
    expect(result.truncated).toBe(false);
  });

  it('RELEVANT sections omitted when budget is too tight', () => {
    // CRITICAL takes up tokens and RELEVANT won't fit
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10 });

    const sections = [
      createSection('CRITICAL', 'Task', 'critical content here'), // ~5 tokens as CRITICAL (always included)
      createSection('RELEVANT', 'Related', 'x'.repeat(200)), // 50 tokens, exceeds remaining budget
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].tier).toBe('CRITICAL');
    expect(result.truncated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — BACKGROUND Sections Omitted When Budget Tight
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — BACKGROUND sections', () => {
  it('BACKGROUND sections included when ample budget', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'task content'),
      createSection('RELEVANT', 'Code', 'code here'),
      createSection('BACKGROUND', 'Architecture', 'arch docs'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });

  it('BACKGROUND sections omitted when budget tight', () => {
    // Set budget so CRITICAL + RELEVANT fit but BACKGROUND does not
    const criticalContent = 'task data';
    const relevantContent = 'code data';
    const criticalTokens = estimateTokens(criticalContent);
    const relevantTokens = estimateTokens(relevantContent);
    // Budget = just enough for CRITICAL (always included) + RELEVANT
    const budget = criticalTokens + relevantTokens;

    const engine = new ContextEnrichmentEngine({ maxPromptTokens: budget });

    const sections = [
      createSection('CRITICAL', 'Task', criticalContent),
      createSection('RELEVANT', 'Code', relevantContent),
      createSection('BACKGROUND', 'History', 'lots of historical context data'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections).toHaveLength(2);
    expect(result.sections.map(s => s.tier)).toEqual(['CRITICAL', 'RELEVANT']);
    expect(result.truncated).toBe(true);
  });

  it('BACKGROUND omitted before RELEVANT when budget is limited', () => {
    // Budget enough for CRITICAL (always) + RELEVANT but not BACKGROUND
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 50 });

    const sections = [
      createSection('BACKGROUND', 'History', 'x'.repeat(80)), // 20 tokens
      createSection('RELEVANT', 'Code', 'x'.repeat(40)),      // 10 tokens
      createSection('CRITICAL', 'Task', 'x'.repeat(40)),      // 10 tokens (always included)
    ];
    const result = engine.buildPrompt(sections);

    // CRITICAL always included (10 tokens), RELEVANT fits (10+10=20 <= 50), BACKGROUND (20+20=40 <= 50)
    // Actually: after CRITICAL (10 consumed always), RELEVANT adds 10 (total 20 <= 50), BACKGROUND adds 20 (total 40 <= 50) — all fit
    // Let's use tighter budget
    const engine2 = new ContextEnrichmentEngine({ maxPromptTokens: 15 });
    const result2 = engine2.buildPrompt(sections);

    // CRITICAL: 10 tokens (always included, doesn't count against budget for CRITICAL, but does for total)
    // After CRITICAL: totalTokens = 10. RELEVANT: 10+10=20 > 15? Yes => omitted
    // BACKGROUND: 10+20=30 > 15? Yes => omitted
    expect(result2.sections).toHaveLength(1);
    expect(result2.sections[0].tier).toBe('CRITICAL');
    expect(result2.truncated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — Truncated Flag
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — truncated flag', () => {
  it('truncated is false when all sections included', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'task'),
      createSection('RELEVANT', 'Code', 'code'),
      createSection('BACKGROUND', 'Docs', 'docs'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.truncated).toBe(false);
  });

  it('truncated is true when any section is omitted', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 5 });

    const sections = [
      createSection('CRITICAL', 'Task', 'task'),
      createSection('RELEVANT', 'Code', 'x'.repeat(100)), // 25 tokens, won't fit
    ];
    const result = engine.buildPrompt(sections);

    expect(result.truncated).toBe(true);
  });

  it('truncated is false with empty section list', () => {
    const engine = new ContextEnrichmentEngine();
    const result = engine.buildPrompt([]);

    expect(result.truncated).toBe(false);
    expect(result.sections).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — contextHash Determinism
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — contextHash', () => {
  it('same input produces same hash', () => {
    const engine = new ContextEnrichmentEngine();

    const sections = [
      createSection('CRITICAL', 'Task', 'implement feature X'),
      createSection('RELEVANT', 'Code', 'function foo() {}'),
    ];

    const result1 = engine.buildPrompt(sections);
    const result2 = engine.buildPrompt(sections);

    expect(result1.contextHash).toBe(result2.contextHash);
  });

  it('different input produces different hash', () => {
    const engine = new ContextEnrichmentEngine();

    const sections1 = [createSection('CRITICAL', 'Task', 'implement feature X')];
    const sections2 = [createSection('CRITICAL', 'Task', 'implement feature Y')];

    const result1 = engine.buildPrompt(sections1);
    const result2 = engine.buildPrompt(sections2);

    expect(result1.contextHash).not.toBe(result2.contextHash);
  });

  it('hash is a valid SHA-256 hex string (64 characters)', () => {
    const engine = new ContextEnrichmentEngine();
    const result = engine.buildPrompt([createSection('CRITICAL', 'Task', 'test')]);

    expect(result.contextHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — Tier Priority Sorting
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — tier sorting', () => {
  it('sections sorted by tier priority: CRITICAL first, BACKGROUND last', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    // Provide sections in reverse order
    const sections = [
      createSection('BACKGROUND', 'History', 'historical context'),
      createSection('RELEVANT', 'Code', 'related code'),
      createSection('CRITICAL', 'Task', 'task definition'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections[0].tier).toBe('CRITICAL');
    expect(result.sections[1].tier).toBe('RELEVANT');
    expect(result.sections[2].tier).toBe('BACKGROUND');
  });

  it('intra-tier order is preserved (stable sort)', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'First Critical', 'aaa'),
      createSection('CRITICAL', 'Second Critical', 'bbb'),
      createSection('RELEVANT', 'First Relevant', 'ccc'),
      createSection('RELEVANT', 'Second Relevant', 'ddd'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.sections[0].label).toBe('First Critical');
    expect(result.sections[1].label).toBe('Second Critical');
    expect(result.sections[2].label).toBe('First Relevant');
    expect(result.sections[3].label).toBe('Second Relevant');
  });

  it('prompt text includes tier labels in output', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'do the thing'),
      createSection('RELEVANT', 'Code', 'function bar() {}'),
    ];
    const result = engine.buildPrompt(sections);

    expect(result.prompt).toContain('--- Task [CRITICAL] ---');
    expect(result.prompt).toContain('--- Code [RELEVANT] ---');
    expect(result.prompt).toContain('do the thing');
    expect(result.prompt).toContain('function bar() {}');
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — Token Budget from Options Override
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — options override', () => {
  it('per-call maxPromptTokens overrides constructor default', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'task'),
      createSection('RELEVANT', 'Code', 'x'.repeat(200)), // 50 tokens
    ];

    // Override to very small budget
    const result = engine.buildPrompt(sections, { maxPromptTokens: 5 });

    // CRITICAL always included, RELEVANT should be omitted
    expect(result.sections).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-4.6: buildPrompt — totalTokenEstimate
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — buildPrompt — totalTokenEstimate', () => {
  it('totalTokenEstimate sums included sections', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 10000 });

    const sections = [
      createSection('CRITICAL', 'Task', 'abcd'),     // 1 token
      createSection('RELEVANT', 'Code', 'abcdefgh'), // 2 tokens
    ];
    const result = engine.buildPrompt(sections);

    expect(result.totalTokenEstimate).toBe(
      estimateTokens('abcd') + estimateTokens('abcdefgh'),
    );
  });

  it('totalTokenEstimate excludes omitted sections', () => {
    const engine = new ContextEnrichmentEngine({ maxPromptTokens: 5 });

    const sections = [
      createSection('CRITICAL', 'Task', 'abcd'),         // 1 token (always included)
      createSection('RELEVANT', 'Code', 'x'.repeat(100)), // 25 tokens (omitted)
    ];
    const result = engine.buildPrompt(sections);

    expect(result.totalTokenEstimate).toBe(estimateTokens('abcd'));
  });
});

// ---------------------------------------------------------------------------
// T-4.7: captureFailureContext Tests
// ---------------------------------------------------------------------------

describe('ContextEnrichmentEngine — captureFailureContext', () => {
  it('captures error output at CRITICAL tier', () => {
    const engine = new ContextEnrichmentEngine();
    const sections = engine.captureFailureContext('', 'Error: module not found');

    expect(sections).toHaveLength(1);
    expect(sections[0].tier).toBe('CRITICAL');
    expect(sections[0].label).toBe('Error Output');
    expect(sections[0].content).toContain('module not found');
  });

  it('captures diff at RELEVANT tier', () => {
    const engine = new ContextEnrichmentEngine();
    const diff = '+added line\n-removed line';
    const sections = engine.captureFailureContext(diff, '');

    expect(sections).toHaveLength(1);
    expect(sections[0].tier).toBe('RELEVANT');
    expect(sections[0].label).toBe('Worktree Diff');
    expect(sections[0].content).toContain('+added line');
  });

  it('captures both error and diff when both present', () => {
    const engine = new ContextEnrichmentEngine();
    const sections = engine.captureFailureContext(
      '+new code\n-old code',
      'TypeError: cannot read property',
    );

    expect(sections).toHaveLength(2);

    const errorSection = sections.find(s => s.label === 'Error Output');
    const diffSection = sections.find(s => s.label === 'Worktree Diff');

    expect(errorSection).toBeDefined();
    expect(errorSection!.tier).toBe('CRITICAL');
    expect(diffSection).toBeDefined();
    expect(diffSection!.tier).toBe('RELEVANT');
  });

  it('returns empty array when both diff and error are empty', () => {
    const engine = new ContextEnrichmentEngine();
    const sections = engine.captureFailureContext('', '');

    expect(sections).toEqual([]);
  });

  it('token estimates are computed on sanitized content', () => {
    const engine = new ContextEnrichmentEngine();
    const errorOutput = 'Error occurred at /home/user/project/src/index.ts';
    const sections = engine.captureFailureContext('', errorOutput);

    // Content is sanitized (path replaced with [PATH_REDACTED])
    const sanitizedContent = sections[0].content;
    expect(sections[0].tokenEstimate).toBe(estimateTokens(sanitizedContent));
  });

  it('sanitizes error output before creating section', () => {
    const engine = new ContextEnrichmentEngine();
    const errorOutput = 'Failed at /home/user/project/src/app.ts with API_KEY=sk-12345';
    const sections = engine.captureFailureContext('', errorOutput);

    expect(sections[0].content).not.toContain('/home/user/project');
    expect(sections[0].content).not.toContain('sk-12345');
  });

  it('sanitizes diff output before creating section', () => {
    const engine = new ContextEnrichmentEngine();
    // Use a Bearer token without "token =" prefix so the secret pattern doesn't consume it first
    const diff = '+Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload';
    const sections = engine.captureFailureContext(diff, '');

    expect(sections[0].content).not.toContain('eyJhbGciOiJIUzI1NiJ9.payload');
    expect(sections[0].content).toContain('Bearer [TOKEN_REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// T-4.7: sanitize() Tests
// ---------------------------------------------------------------------------

describe('sanitize', () => {
  it('removes environment variable assignments (KEY=value)', () => {
    const input = 'Running with DATABASE_URL=postgres://localhost:5432/db';
    const result = sanitize(input);

    expect(result).not.toContain('DATABASE_URL=postgres');
    expect(result).toContain('[ENV_REDACTED]');
  });

  it('removes export KEY=value patterns', () => {
    const input = 'export SECRET_KEY=mysecretvalue123';
    const result = sanitize(input);

    expect(result).not.toContain('mysecretvalue123');
    expect(result).toContain('[ENV_REDACTED]');
  });

  it('removes secret patterns: api_key=...', () => {
    const input = 'Config: api_key=sk-abc123def456';
    const result = sanitize(input);

    expect(result).not.toContain('sk-abc123def456');
    expect(result).toContain('[SECRET_REDACTED]');
  });

  it('removes secret patterns: token=...', () => {
    const input = 'auth token=ghp_abcdef123456';
    const result = sanitize(input);

    expect(result).not.toContain('ghp_abcdef123456');
    expect(result).toContain('[SECRET_REDACTED]');
  });

  it('removes secret patterns: password=...', () => {
    const input = 'password: hunter2';
    const result = sanitize(input);

    expect(result).not.toContain('hunter2');
    expect(result).toContain('[SECRET_REDACTED]');
  });

  it('removes Bearer tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI=';
    const result = sanitize(input);

    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toContain('Bearer [TOKEN_REDACTED]');
  });

  it('removes filesystem paths (/home/...)', () => {
    const input = 'File not found: /home/user/project/src/config.ts';
    const result = sanitize(input);

    expect(result).not.toContain('/home/user/project');
    expect(result).toContain('[PATH_REDACTED]');
  });

  it('removes /Users/ paths (macOS)', () => {
    const input = 'Error at /Users/developer/workspace/app.js:42';
    const result = sanitize(input);

    expect(result).not.toContain('/Users/developer/workspace');
    expect(result).toContain('[PATH_REDACTED]');
  });

  it('removes /var/ paths', () => {
    const input = 'Log at /var/log/myapp/error.log';
    const result = sanitize(input);

    expect(result).not.toContain('/var/log/myapp');
    expect(result).toContain('[PATH_REDACTED]');
  });

  it('removes AWS access keys (AKIA...)', () => {
    // Use a context where the secret pattern won't match first
    // (avoid "credential:" prefix which triggers the secret pattern)
    const input = 'Access key found: AKIAIOSFODNN7EXAMPLE in config';
    const result = sanitize(input);

    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).toContain('[AWS_KEY_REDACTED]');
  });

  it('removes long hex strings (32+ characters)', () => {
    const hexString = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'; // 32 hex chars
    const input = `Hash: ${hexString}`;
    const result = sanitize(input);

    expect(result).not.toContain(hexString);
    expect(result).toContain('[HEX_REDACTED]');
  });

  it('preserves non-sensitive content', () => {
    const input = 'Error: Cannot find module "lodash"\n  at require (internal/modules/cjs)';
    const result = sanitize(input);

    expect(result).toContain('Cannot find module "lodash"');
    expect(result).toContain('at require');
  });

  it('handles multiple sensitive patterns in same string', () => {
    const input = 'api_key=secret123 at /home/user/app running with TOKEN_VAR=abc';
    const result = sanitize(input);

    expect(result).not.toContain('secret123');
    expect(result).not.toContain('/home/user/app');
    // Multiple redaction markers should be present
    expect(result).toContain('[SECRET_REDACTED]');
    expect(result).toContain('[PATH_REDACTED]');
  });

  it('handles empty string', () => {
    expect(sanitize('')).toBe('');
  });

  it('is safe to call multiple times (regex lastIndex reset)', () => {
    // Verify that global regexps don't carry state between calls
    const input = 'AKIA1234567890ABCDEF at /home/user/file';
    const result1 = sanitize(input);
    const result2 = sanitize(input);

    expect(result1).toBe(result2);
    expect(result1).toContain('[AWS_KEY_REDACTED]');
    expect(result1).toContain('[PATH_REDACTED]');
  });
});
