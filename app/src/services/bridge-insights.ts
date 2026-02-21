import type { BridgeInsight, BridgeInsightsArtifact } from '../types/bridge-insights.js';

/**
 * Bridge Insights Generator — extracts structured meta-learning from bridge reviews.
 *
 * Generates YAML artifacts at .run/bridge-insights/ that auto-load during
 * /plan-and-analyze context synthesis for cross-cycle learning.
 *
 * See: SDD §4.8, PRD FR-10
 */
export class BridgeInsightsGenerator {
  private readonly insights: BridgeInsight[] = [];

  /**
   * Add an insight from a bridge review.
   */
  addInsight(insight: BridgeInsight): void {
    this.insights.push(insight);
  }

  /**
   * Generate the insights artifact for a cycle.
   */
  generate(cycleId: string): BridgeInsightsArtifact {
    const themes = this.extractThemes();
    const summary = this.generateSummary(themes);

    return {
      cycleId,
      generatedAt: new Date().toISOString(),
      insights: [...this.insights],
      themes,
      summary,
    };
  }

  /**
   * Load insights for context synthesis during /plan-and-analyze.
   */
  loadForPlanning(): { themes: string[]; actionableInsights: BridgeInsight[] } {
    return {
      themes: this.extractThemes(),
      actionableInsights: this.insights.filter((i) => i.actionable),
    };
  }

  /**
   * Get all insights.
   */
  getInsights(): BridgeInsight[] {
    return [...this.insights];
  }

  /**
   * Serialize to YAML-compatible structure.
   */
  toYaml(cycleId: string): string {
    const artifact = this.generate(cycleId);
    const lines: string[] = [
      `# Bridge Insights — ${cycleId}`,
      `# Generated: ${artifact.generatedAt}`,
      '',
      `cycle_id: ${artifact.cycleId}`,
      `generated_at: "${artifact.generatedAt}"`,
      `summary: "${artifact.summary}"`,
      '',
      'themes:',
      ...artifact.themes.map((t) => `  - "${t}"`),
      '',
      'insights:',
    ];

    for (const insight of artifact.insights) {
      lines.push(`  - id: "${insight.id}"`);
      lines.push(`    category: "${insight.category}"`);
      lines.push(`    insight: "${insight.insight}"`);
      lines.push(`    actionable: ${insight.actionable}`);
      lines.push('    implications:');
      for (const imp of insight.implications) {
        lines.push(`      - "${imp}"`);
      }
      lines.push('    tags:');
      for (const tag of insight.tags) {
        lines.push(`      - "${tag}"`);
      }
      lines.push(`    source:`);
      lines.push(`      bridge_iteration: ${insight.source.bridgeIteration}`);
      if (insight.source.prNumber) {
        lines.push(`      pr_number: ${insight.source.prNumber}`);
      }
      lines.push(`      review_date: "${insight.source.reviewDate}"`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private extractThemes(): string[] {
    const tagCounts = new Map<string, number>();
    for (const insight of this.insights) {
      for (const tag of insight.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    // Top themes by frequency
    return [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private generateSummary(themes: string[]): string {
    const count = this.insights.length;
    const actionable = this.insights.filter((i) => i.actionable).length;
    const categories = [...new Set(this.insights.map((i) => i.category))];
    return `${count} insights across ${categories.length} categories (${actionable} actionable). Key themes: ${themes.join(', ') || 'none'}`;
  }
}
