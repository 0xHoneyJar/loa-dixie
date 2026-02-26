/**
 * Context Enrichment Engine — Three-Tier Prompt Assembly with Token Budget Management
 *
 * Assembles enriched prompts for agent tasks by layering context sections
 * in priority order (CRITICAL > RELEVANT > BACKGROUND). Each section carries
 * a token estimate (chars / 4) and a tier classification. Sections are
 * included in tier order until the token budget is exhausted.
 *
 * Context tiers:
 * - CRITICAL: Always included. Task definition, constraints, invariants.
 * - RELEVANT: Included if budget allows. Related code, recent changes.
 * - BACKGROUND: Included only if space remains. Architecture docs, history.
 *
 * Also provides captureFailureContext() for reading worktree state on failure,
 * with sanitization to strip sensitive data (env vars, paths, secret patterns).
 *
 * See: SDD (cycle-012, Sprint 89) — Context Enrichment Engine
 * @since cycle-012 — Sprint 89
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Context Tiers
// ---------------------------------------------------------------------------

/**
 * Priority tier for context sections.
 * Determines inclusion order when assembling prompts under token budgets.
 */
export type ContextTier = 'CRITICAL' | 'RELEVANT' | 'BACKGROUND';

/** Numeric priority for tier ordering (lower = higher priority). */
const TIER_PRIORITY: Record<ContextTier, number> = {
  CRITICAL: 0,
  RELEVANT: 1,
  BACKGROUND: 2,
};

// ---------------------------------------------------------------------------
// Context Section
// ---------------------------------------------------------------------------

/**
 * A single section of context to be included in an enriched prompt.
 * Sections are prioritized by tier and included in order until budget exhaustion.
 */
export interface ContextSection {
  /** Priority tier controlling inclusion order. */
  readonly tier: ContextTier;
  /** Human-readable label for the section (e.g., "Task Definition", "Related Code"). */
  readonly label: string;
  /** The text content of this context section. */
  readonly content: string;
  /** Estimated token count for this section (chars / 4). */
  readonly tokenEstimate: number;
}

// ---------------------------------------------------------------------------
// Enriched Prompt
// ---------------------------------------------------------------------------

/**
 * The result of prompt assembly: the final prompt string with metadata
 * about included sections, token usage, and content integrity.
 */
export interface EnrichedPrompt {
  /** The assembled prompt string with all included context sections. */
  readonly prompt: string;
  /** SHA-256 hash of the prompt content for deterministic cache keys. */
  readonly contextHash: string;
  /** The sections that were included in the prompt, in inclusion order. */
  readonly sections: ReadonlyArray<ContextSection>;
  /** Total estimated token count across all included sections. */
  readonly totalTokenEstimate: number;
  /** Whether any sections were truncated or omitted due to budget constraints. */
  readonly truncated: boolean;
}

// ---------------------------------------------------------------------------
// Token Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate token count from a string using the chars/4 heuristic.
 *
 * This is a rough approximation suitable for budget planning. Actual token
 * counts vary by model tokenizer, but chars/4 provides a conservative
 * estimate that avoids prompt overflow in practice.
 *
 * @since cycle-012 — Sprint 89
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Patterns matched during sanitization of failure context.
 * Strips environment variables, filesystem paths, and common secret formats.
 */
const SANITIZE_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // Environment variable assignments (KEY=value or export KEY=value)
  { pattern: /(?:export\s+)?[A-Z_][A-Z0-9_]*=\S+/g, replacement: '[ENV_REDACTED]' },
  // Common secret patterns (API keys, tokens, passwords)
  { pattern: /(?:api[_-]?key|token|secret|password|credential|auth)\s*[:=]\s*\S+/gi, replacement: '[SECRET_REDACTED]' },
  // Bearer tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, replacement: 'Bearer [TOKEN_REDACTED]' },
  // Absolute filesystem paths (Unix)
  { pattern: /\/(?:home|Users|var|etc|tmp)\/[^\s'",)}\]]+/g, replacement: '[PATH_REDACTED]' },
  // AWS-style access keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[AWS_KEY_REDACTED]' },
  // Hex strings that look like secrets (32+ chars)
  { pattern: /\b[0-9a-f]{32,}\b/gi, replacement: '[HEX_REDACTED]' },
];

/**
 * Sanitize text by removing sensitive patterns.
 *
 * Applied to failure context captured from worktrees to prevent
 * accidental leakage of credentials, paths, or environment variables
 * into prompts sent to external model providers.
 *
 * @since cycle-012 — Sprint 89
 */
export function sanitize(text: string): string {
  let result = text;
  for (const { pattern, replacement } of SANITIZE_PATTERNS) {
    // Reset lastIndex for global regexps reused across calls
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Context Enrichment Engine
// ---------------------------------------------------------------------------

/** Default maximum prompt token budget. */
const DEFAULT_MAX_PROMPT_TOKENS = 8000;

/**
 * ContextEnrichmentEngine — assembles enriched prompts from tiered context sections.
 *
 * Usage:
 * ```ts
 * const engine = new ContextEnrichmentEngine();
 * const prompt = engine.buildPrompt(sections, { maxPromptTokens: 8000 });
 * ```
 *
 * @since cycle-012 — Sprint 89
 */
export class ContextEnrichmentEngine {
  private readonly maxPromptTokens: number;

  constructor(options: { maxPromptTokens?: number } = {}) {
    this.maxPromptTokens = options.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
  }

  /**
   * Build an enriched prompt from context sections.
   *
   * Sections are sorted by tier priority (CRITICAL first, BACKGROUND last).
   * Within the same tier, sections maintain their original order.
   * Sections are included until the token budget is exhausted.
   *
   * CRITICAL sections are always included regardless of budget (they represent
   * the minimum viable context for a correct response).
   *
   * RELEVANT and BACKGROUND sections are included only if they fit within
   * the remaining token budget after higher-priority sections.
   *
   * @param sections - Context sections to assemble
   * @param options - Override max token budget for this call
   * @returns EnrichedPrompt with assembled content and metadata
   *
   * @since cycle-012 — Sprint 89
   */
  buildPrompt(
    sections: ReadonlyArray<ContextSection>,
    options: { maxPromptTokens?: number } = {},
  ): EnrichedPrompt {
    const budget = options.maxPromptTokens ?? this.maxPromptTokens;

    // Sort sections by tier priority (stable sort preserves intra-tier order)
    const sorted = [...sections].sort(
      (a, b) => TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier],
    );

    const included: ContextSection[] = [];
    let totalTokens = 0;
    let truncated = false;

    for (const section of sorted) {
      if (section.tier === 'CRITICAL') {
        // CRITICAL sections are always included
        included.push(section);
        totalTokens += section.tokenEstimate;
      } else if (totalTokens + section.tokenEstimate <= budget) {
        // RELEVANT and BACKGROUND included if they fit
        included.push(section);
        totalTokens += section.tokenEstimate;
      } else {
        // Section omitted — budget exceeded
        truncated = true;
      }
    }

    // Assemble the prompt text from included sections
    const promptParts: string[] = [];
    for (const section of included) {
      promptParts.push(`--- ${section.label} [${section.tier}] ---`);
      promptParts.push(section.content);
      promptParts.push('');
    }
    const prompt = promptParts.join('\n').trim();

    // Compute deterministic content hash (SHA-256)
    const contextHash = createHash('sha256').update(prompt).digest('hex');

    return {
      prompt,
      contextHash,
      sections: included,
      totalTokenEstimate: totalTokens,
      truncated,
    };
  }

  /**
   * Capture failure context from worktree state.
   *
   * Reads diff output and error messages, applies sanitization to strip
   * sensitive data, and returns context sections suitable for inclusion
   * in a failure-analysis prompt.
   *
   * @param diff - Git diff output from the worktree
   * @param errorOutput - stderr/stdout from the failed command
   * @returns Array of sanitized context sections at CRITICAL and RELEVANT tiers
   *
   * @since cycle-012 — Sprint 89
   */
  captureFailureContext(
    diff: string,
    errorOutput: string,
  ): ContextSection[] {
    const sections: ContextSection[] = [];

    if (errorOutput) {
      const sanitizedError = sanitize(errorOutput);
      sections.push({
        tier: 'CRITICAL',
        label: 'Error Output',
        content: sanitizedError,
        tokenEstimate: estimateTokens(sanitizedError),
      });
    }

    if (diff) {
      const sanitizedDiff = sanitize(diff);
      sections.push({
        tier: 'RELEVANT',
        label: 'Worktree Diff',
        content: sanitizedDiff,
        tokenEstimate: estimateTokens(sanitizedDiff),
      });
    }

    return sections;
  }
}

// ---------------------------------------------------------------------------
// Convenience: Create a ContextSection with auto-estimated tokens
// ---------------------------------------------------------------------------

/**
 * Create a ContextSection with automatic token estimation.
 *
 * @param tier - Priority tier
 * @param label - Human-readable label
 * @param content - Text content
 * @returns A fully-formed ContextSection
 *
 * @since cycle-012 — Sprint 89
 */
export function createSection(
  tier: ContextTier,
  label: string,
  content: string,
): ContextSection {
  return {
    tier,
    label,
    content,
    tokenEstimate: estimateTokens(content),
  };
}
