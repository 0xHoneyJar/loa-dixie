import type { InteractionSignal } from '../types/economic.js';

/**
 * Compound Learning Pipeline — signal aggregation, pattern extraction,
 * personality evolution, and knowledge gap identification.
 *
 * Processes interaction signals in batches (every 10 interactions per NFT)
 * to extract topic clusters, source hit/miss ratios, sentiment patterns,
 * and trigger personality evolution events.
 *
 * See: SDD §4.5, PRD FR-11 (compound learning), FR-7 (interaction signals)
 */

/** Aggregated interaction insights for a time window */
export interface LearningInsights {
  readonly nftId: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly interactionCount: number;
  readonly topicClusters: ReadonlyArray<TopicCluster>;
  readonly sourceMetrics: SourceMetrics;
  readonly sentimentTrend: SentimentTrend;
  readonly toolUsagePatterns: ReadonlyArray<ToolUsageEntry>;
  readonly knowledgeGaps: ReadonlyArray<KnowledgeGap>;
  readonly personalityDrift: PersonalityDrift | null;
}

/** Topic cluster from interaction analysis */
export interface TopicCluster {
  readonly topic: string;
  readonly count: number;
  readonly percentage: number;
  readonly recentQueries: readonly string[];
}

/** Knowledge source hit/miss metrics */
export interface SourceMetrics {
  readonly totalQueries: number;
  readonly sourceHits: number;
  readonly sourceMisses: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly topSources: ReadonlyArray<{ source: string; hitCount: number }>;
}

/** Sentiment trend over the window */
export interface SentimentTrend {
  readonly averageSentiment: number; // -1 to 1
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly sampleSize: number;
}

/** Tool usage pattern entry */
export interface ToolUsageEntry {
  readonly tool: string;
  readonly useCount: number;
  readonly percentage: number;
}

/** Knowledge gap — area where source miss rate is high */
export interface KnowledgeGap {
  readonly topic: string;
  readonly missRate: number;
  readonly queryCount: number;
  readonly severity: 'low' | 'medium' | 'high';
}

/** Personality drift measurement */
export interface PersonalityDrift {
  readonly dimension: string;
  readonly previousValue: number;
  readonly currentValue: number;
  readonly delta: number;
  readonly significantDrift: boolean;
}

/**
 * CompoundLearningEngine — processes signals and extracts learning insights.
 *
 * In-memory signal buffer with batch processing every `batchSize` interactions.
 * Production deployment would use NATS JetStream consumer.
 */
export class CompoundLearningEngine {
  private readonly signalBuffer = new Map<string, { signals: InteractionSignal[]; lastActivity: number }>();
  private readonly insights = new Map<string, LearningInsights[]>();
  private readonly lastEvolution = new Map<string, string>(); // nftId → ISO date
  private readonly batchSize: number;
  private readonly maxNfts: number;
  private readonly inactivityFlushMs: number;

  constructor(opts?: { batchSize?: number; maxNfts?: number; inactivityFlushMs?: number }) {
    this.batchSize = opts?.batchSize ?? 10;
    this.maxNfts = opts?.maxNfts ?? 10_000;
    this.inactivityFlushMs = opts?.inactivityFlushMs ?? 3_600_000; // 1 hour
  }

  /**
   * Ingest an interaction signal.
   * Triggers batch processing when batchSize is reached for an NFT.
   */
  ingest(signal: InteractionSignal): LearningInsights | null {
    const { nftId } = signal;

    // Evict LRU NFTs if at capacity (Bridge medium-2)
    if (!this.signalBuffer.has(nftId) && this.signalBuffer.size >= this.maxNfts) {
      this.evictLruNft();
    }

    let entry = this.signalBuffer.get(nftId);
    if (!entry) {
      entry = { signals: [], lastActivity: Date.now() };
      this.signalBuffer.set(nftId, entry);
    }
    entry.signals.push(signal);
    entry.lastActivity = Date.now();

    // Process batch when threshold reached
    if (entry.signals.length >= this.batchSize) {
      const batch = entry.signals.splice(0, this.batchSize);
      return this.processBatch(nftId, batch);
    }

    return null;
  }

  /**
   * Process a batch of signals into learning insights.
   */
  private processBatch(nftId: string, signals: InteractionSignal[]): LearningInsights {
    const windowStart = signals[0]!.timestamp;
    const windowEnd = signals[signals.length - 1]!.timestamp;

    // Extract topic clusters
    const topicCounts = new Map<string, { count: number; queries: string[] }>();
    for (const s of signals) {
      for (const topic of s.topics) {
        const entry = topicCounts.get(topic) ?? { count: 0, queries: [] };
        entry.count++;
        if (entry.queries.length < 3) {
          entry.queries.push(`interaction-${s.messageId}`);
        }
        topicCounts.set(topic, entry);
      }
    }

    const topicClusters: TopicCluster[] = [...topicCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([topic, data]) => ({
        topic,
        count: data.count,
        percentage: Math.round((data.count / signals.length) * 100),
        recentQueries: data.queries,
      }));

    // Source hit/miss metrics
    const allSources = signals.flatMap((s) => s.knowledgeSources);
    const sourceHits = allSources.length;
    const sourceMisses = signals.filter((s) => s.knowledgeSources.length === 0).length;
    const totalQueries = signals.length;

    const sourceCounts = new Map<string, number>();
    for (const src of allSources) {
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, hitCount]) => ({ source, hitCount }));

    const sourceMetrics: SourceMetrics = {
      totalQueries,
      sourceHits,
      sourceMisses,
      hitRate: totalQueries > 0 ? sourceHits / totalQueries : 0,
      missRate: totalQueries > 0 ? sourceMisses / totalQueries : 0,
      topSources,
    };

    // Sentiment trend (simplified — based on tool usage diversity as proxy)
    const avgToolDiversity = signals.reduce((sum, s) => sum + s.toolsUsed.length, 0) / signals.length;
    const sentimentTrend: SentimentTrend = {
      averageSentiment: Math.min(1, avgToolDiversity / 3), // Proxy: more tools = more engaged
      trend: 'stable',
      sampleSize: signals.length,
    };

    // Tool usage patterns
    const toolCounts = new Map<string, number>();
    for (const s of signals) {
      for (const tool of s.toolsUsed) {
        toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
      }
    }
    const totalToolUses = [...toolCounts.values()].reduce((a, b) => a + b, 0);
    const toolUsagePatterns: ToolUsageEntry[] = [...toolCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tool, useCount]) => ({
        tool,
        useCount,
        percentage: totalToolUses > 0 ? Math.round((useCount / totalToolUses) * 100) : 0,
      }));

    // Knowledge gaps — topics with high miss rate
    const topicMisses = new Map<string, { total: number; misses: number }>();
    for (const s of signals) {
      const hasSources = s.knowledgeSources.length > 0;
      for (const topic of s.topics) {
        const entry = topicMisses.get(topic) ?? { total: 0, misses: 0 };
        entry.total++;
        if (!hasSources) entry.misses++;
        topicMisses.set(topic, entry);
      }
    }

    const knowledgeGaps: KnowledgeGap[] = [...topicMisses.entries()]
      .filter(([, data]) => data.total >= 2 && data.misses / data.total > 0.3)
      .map(([topic, data]) => {
        const missRate = data.misses / data.total;
        return {
          topic,
          missRate,
          queryCount: data.total,
          severity: missRate > 0.7 ? 'high' as const : missRate > 0.5 ? 'medium' as const : 'low' as const,
        };
      });

    // Personality drift (rate-limited to max 1 per day)
    let personalityDrift: PersonalityDrift | null = null;
    const lastEvo = this.lastEvolution.get(nftId);
    const today = new Date().toISOString().split('T')[0]!;
    if (!lastEvo || lastEvo !== today) {
      // Check for significant topic shift as personality drift indicator
      const previousInsights = this.insights.get(nftId);
      if (previousInsights && previousInsights.length > 0) {
        const prev = previousInsights[previousInsights.length - 1]!;
        const prevTopTopic = prev.topicClusters[0]?.percentage ?? 0;
        const currTopTopic = topicClusters[0]?.percentage ?? 0;
        const delta = Math.abs(currTopTopic - prevTopTopic);

        if (delta > 10) {
          personalityDrift = {
            dimension: 'topic_focus',
            previousValue: prevTopTopic,
            currentValue: currTopTopic,
            delta,
            significantDrift: delta > 20,
          };
          this.lastEvolution.set(nftId, today);
        }
      }
    }

    const insight: LearningInsights = {
      nftId,
      windowStart,
      windowEnd,
      interactionCount: signals.length,
      topicClusters,
      sourceMetrics,
      sentimentTrend,
      toolUsagePatterns,
      knowledgeGaps,
      personalityDrift,
    };

    // Store insights
    const nftInsights = this.insights.get(nftId) ?? [];
    nftInsights.push(insight);
    // Keep last 100 insight windows per NFT
    if (nftInsights.length > 100) nftInsights.shift();
    this.insights.set(nftId, nftInsights);

    return insight;
  }

  /**
   * Get learning insights for an NFT.
   */
  getInsights(nftId: string, limit = 10): LearningInsights[] {
    return (this.insights.get(nftId) ?? []).slice(-limit);
  }

  /**
   * Get the latest knowledge gaps across all NFTs.
   */
  getKnowledgeGaps(nftId: string): KnowledgeGap[] {
    const insights = this.insights.get(nftId);
    if (!insights || insights.length === 0) return [];
    return insights[insights.length - 1]!.knowledgeGaps.slice();
  }

  /**
   * Get pending signal count for an NFT (not yet processed).
   */
  getPendingCount(nftId: string): number {
    return this.signalBuffer.get(nftId)?.signals.length ?? 0;
  }

  /**
   * Force process any pending signals (for testing or shutdown).
   */
  flush(nftId: string): LearningInsights | null {
    const entry = this.signalBuffer.get(nftId);
    if (!entry || entry.signals.length === 0) return null;

    const batch = entry.signals.splice(0);
    return this.processBatch(nftId, batch);
  }

  /**
   * Flush inactive signal buffers (Bridge medium-2).
   * Call periodically to prevent unbounded memory growth from inactive NFTs.
   */
  flushInactive(): number {
    const now = Date.now();
    let flushed = 0;
    for (const [nftId, entry] of this.signalBuffer) {
      if (now - entry.lastActivity > this.inactivityFlushMs && entry.signals.length > 0) {
        this.processBatch(nftId, entry.signals.splice(0));
        flushed++;
      }
    }
    return flushed;
  }

  private evictLruNft(): void {
    let oldestNft: string | null = null;
    let oldestTime = Infinity;
    for (const [nftId, entry] of this.signalBuffer) {
      if (entry.lastActivity < oldestTime) {
        oldestTime = entry.lastActivity;
        oldestNft = nftId;
      }
    }
    if (oldestNft) {
      // Flush before evicting to preserve data
      const entry = this.signalBuffer.get(oldestNft);
      if (entry && entry.signals.length > 0) {
        this.processBatch(oldestNft, entry.signals);
      }
      this.signalBuffer.delete(oldestNft);
    }
  }
}
