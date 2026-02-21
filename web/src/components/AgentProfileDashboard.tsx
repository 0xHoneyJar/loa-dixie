import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface TopicCluster {
  topic: string;
  count: number;
  percentage: number;
}

interface KnowledgeGap {
  topic: string;
  missRate: number;
  queryCount: number;
  severity: 'low' | 'medium' | 'high';
}

interface LearningInsight {
  nftId: string;
  windowStart: string;
  windowEnd: string;
  interactionCount: number;
  topicClusters: TopicCluster[];
  sourceMetrics: {
    totalQueries: number;
    sourceHits: number;
    sourceMisses: number;
    hitRate: number;
    missRate: number;
  };
  toolUsagePatterns: Array<{ tool: string; useCount: number; percentage: number }>;
  knowledgeGaps: KnowledgeGap[];
  personalityDrift: {
    dimension: string;
    delta: number;
    significantDrift: boolean;
  } | null;
}

interface AgentProfileDashboardProps {
  nftId: string;
}

/**
 * AgentProfileDashboard — learning insights, topic expertise,
 * knowledge gaps, and personality drift visualization.
 *
 * See: SDD §4.5, PRD FR-11
 */
export function AgentProfileDashboard({ nftId }: AgentProfileDashboardProps) {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [insightsRes, gapsRes] = await Promise.all([
        api.get<{ insights: LearningInsight[] }>(`/api/learning/${nftId}/insights?limit=5`),
        api.get<{ gaps: KnowledgeGap[]; alerting: boolean }>(`/api/learning/${nftId}/gaps`),
      ]);
      setInsights(insightsRes.insights);
      setGaps(gapsRes.gaps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load learning data');
    } finally {
      setLoading(false);
    }
  }, [nftId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ color: '#9CA3AF', padding: '16px' }}>Loading learning insights...</div>;
  if (error) return <div style={{ color: '#EF4444', padding: '16px' }}>{error}</div>;

  const latest = insights[insights.length - 1];

  const severityColor: Record<string, string> = {
    low: '#F59E0B',
    medium: '#F97316',
    high: '#EF4444',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '16px' }}>Agent Profile</h3>

      {/* Topic Expertise */}
      {latest && latest.topicClusters.length > 0 && (
        <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '8px' }}>TOPIC EXPERTISE</div>
          {latest.topicClusters.slice(0, 5).map((tc) => (
            <div key={tc.topic} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{
                flex: 1, height: '6px', backgroundColor: '#374151', borderRadius: '3px', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${tc.percentage}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px',
                }} />
              </div>
              <span style={{ color: '#F9FAFB', fontSize: '11px', minWidth: '80px' }}>{tc.topic}</span>
              <span style={{ color: '#6B7280', fontSize: '11px' }}>{tc.percentage}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Source Hit Rate */}
      {latest && (
        <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '8px' }}>KNOWLEDGE SOURCE METRICS</div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <div style={{ color: '#34D399', fontSize: '20px', fontWeight: 700 }}>
                {Math.round(latest.sourceMetrics.hitRate * 100)}%
              </div>
              <div style={{ color: '#6B7280', fontSize: '11px' }}>Hit Rate</div>
            </div>
            <div>
              <div style={{ color: '#F9FAFB', fontSize: '20px', fontWeight: 700 }}>
                {latest.sourceMetrics.totalQueries}
              </div>
              <div style={{ color: '#6B7280', fontSize: '11px' }}>Total Queries</div>
            </div>
            <div>
              <div style={{ color: '#F59E0B', fontSize: '20px', fontWeight: 700 }}>
                {latest.interactionCount}
              </div>
              <div style={{ color: '#6B7280', fontSize: '11px' }}>Interactions</div>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
          <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '8px' }}>KNOWLEDGE GAPS</div>
          {gaps.map((gap) => (
            <div key={gap.topic} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 0', borderBottom: '1px solid #374151',
            }}>
              <span style={{ color: '#F9FAFB', fontSize: '12px' }}>{gap.topic}</span>
              <span style={{
                color: severityColor[gap.severity] ?? '#9CA3AF',
                fontSize: '11px', fontWeight: 600,
              }}>
                {Math.round(gap.missRate * 100)}% miss ({gap.severity})
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Personality Drift */}
      {latest?.personalityDrift && (
        <div style={{
          padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px',
          borderLeft: latest.personalityDrift.significantDrift ? '3px solid #F59E0B' : '3px solid #374151',
        }}>
          <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '4px' }}>PERSONALITY EVOLUTION</div>
          <div style={{ color: '#F9FAFB', fontSize: '12px' }}>
            {latest.personalityDrift.dimension}: delta {latest.personalityDrift.delta.toFixed(1)}%
            {latest.personalityDrift.significantDrift && (
              <span style={{ color: '#F59E0B', marginLeft: '8px' }}>significant drift</span>
            )}
          </div>
        </div>
      )}

      {/* No data state */}
      {insights.length === 0 && (
        <div style={{ color: '#6B7280', fontSize: '13px' }}>
          No learning insights yet. Insights are generated after every 10 interactions.
        </div>
      )}
    </div>
  );
}
