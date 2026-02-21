/**
 * Bridge Insights — structured meta-learning from bridge reviews.
 *
 * Not findings (those are addressed in fix sprints), but reframings —
 * moments where the review reveals something about what the project
 * is becoming, rather than what it's doing wrong.
 *
 * See: SDD §4.8, PRD FR-10
 */

/** A single bridge insight */
export interface BridgeInsight {
  readonly id: string;
  readonly source: {
    readonly bridgeIteration: number;
    readonly prNumber?: number;
    readonly reviewDate: string;
  };
  readonly category: 'architectural' | 'governance' | 'economic' | 'identity' | 'integration';
  readonly insight: string;
  readonly implications: string[];
  readonly actionable: boolean;
  readonly tags: string[];
}

/** Collection of bridge insights for a cycle */
export interface BridgeInsightsArtifact {
  readonly cycleId: string;
  readonly generatedAt: string;
  readonly insights: BridgeInsight[];
  readonly themes: string[];
  readonly summary: string;
}
