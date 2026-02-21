import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface AutonomousPermissions {
  nftId: string;
  enabled: boolean;
  ownerWallet: string;
  delegatedWallets: string[];
  capabilities: Record<string, boolean>;
  budget: {
    dailyCapMicroUsd: number;
    hourlyRateLimit: number;
    requireConfirmationAboveUsd: number;
  };
  toolWhitelist: string[];
}

interface DailySummary {
  totalActions: number;
  allowedActions: number;
  deniedActions: number;
  totalSpendMicroUsd: number;
  capabilitiesUsed: string[];
  toolsUsed: string[];
  confirmationsRequired: number;
}

interface AuditEntry {
  timestamp: string;
  action: { capability: string; tool?: string; estimatedCostMicroUsd?: number };
  result: { allowed: boolean; reason: string };
}

const CAPABILITY_LABELS: Record<string, { label: string; description: string }> = {
  chat_initiate: { label: 'Start Conversations', description: 'Agent can initiate chat sessions' },
  knowledge_search: { label: 'Search Knowledge', description: 'Agent can search the knowledge corpus' },
  schedule_manage: { label: 'Manage Schedules', description: 'Agent can create and cancel schedules' },
  memory_write: { label: 'Write Memory', description: 'Agent can write to soul memory' },
  tool_execute: { label: 'Execute Tools', description: 'Agent can execute whitelisted tools' },
  agent_communicate: { label: 'Agent Communication', description: 'Agent can communicate with other agents' },
};

interface AutonomousConfigProps {
  nftId: string;
}

/**
 * AutonomousConfig — permission management for autonomous agent operation.
 * Only visible to sovereign-tier users who own the NFT.
 */
export function AutonomousConfig({ nftId }: AutonomousConfigProps) {
  const [permissions, setPermissions] = useState<AutonomousPermissions | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [perms, sum, auditRes] = await Promise.all([
        api.get<AutonomousPermissions>(`/api/autonomous/${nftId}/permissions`),
        api.get<DailySummary>(`/api/autonomous/${nftId}/summary`),
        api.get<{ entries: AuditEntry[] }>(`/api/autonomous/${nftId}/audit?limit=20`),
      ]);
      setPermissions(perms);
      setSummary(sum);
      setAudit(auditRes.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [nftId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div style={{ color: '#9CA3AF', padding: '16px' }}>Loading autonomous config...</div>;
  if (error) return <div style={{ color: '#EF4444', padding: '16px' }}>{error}</div>;
  if (!permissions) return null;

  const formatUsd = (microUsd: number) => `$${(microUsd / 1_000_000).toFixed(2)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#F9FAFB', fontSize: '16px' }}>Autonomous Mode</h3>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: permissions.enabled ? '#064E3B' : '#1F2937',
            color: permissions.enabled ? '#34D399' : '#9CA3AF',
          }}
        >
          {permissions.enabled ? 'ENABLED' : 'DISABLED'}
        </span>
      </div>

      {/* Capabilities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ margin: 0, color: '#D1D5DB', fontSize: '13px' }}>Capabilities</h4>
        {Object.entries(CAPABILITY_LABELS).map(([key, { label, description }]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <div>
              <div style={{ color: '#F9FAFB', fontSize: '13px' }}>{label}</div>
              <div style={{ color: '#6B7280', fontSize: '11px' }}>{description}</div>
            </div>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: permissions.capabilities[key] ? '#34D399' : '#4B5563',
            }} />
          </div>
        ))}
      </div>

      {/* Budget */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
        <h4 style={{ margin: 0, color: '#D1D5DB', fontSize: '13px' }}>Budget</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: '#9CA3AF' }}>Daily cap</span>
          <span style={{ color: '#F9FAFB' }}>{formatUsd(permissions.budget.dailyCapMicroUsd)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: '#9CA3AF' }}>Today's spend</span>
          <span style={{ color: '#F9FAFB' }}>{formatUsd(summary?.totalSpendMicroUsd ?? 0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <span style={{ color: '#9CA3AF' }}>Hourly rate limit</span>
          <span style={{ color: '#F9FAFB' }}>{permissions.budget.hourlyRateLimit}/hr</span>
        </div>
      </div>

      {/* Daily Summary */}
      {summary && summary.totalActions > 0 && (
        <div style={{ padding: '12px', backgroundColor: '#1F2937', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px', color: '#D1D5DB', fontSize: '13px' }}>Today's Activity</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div><div style={{ color: '#9CA3AF' }}>Total</div><div style={{ color: '#F9FAFB', fontWeight: 600 }}>{summary.totalActions}</div></div>
            <div><div style={{ color: '#9CA3AF' }}>Allowed</div><div style={{ color: '#34D399', fontWeight: 600 }}>{summary.allowedActions}</div></div>
            <div><div style={{ color: '#9CA3AF' }}>Denied</div><div style={{ color: '#EF4444', fontWeight: 600 }}>{summary.deniedActions}</div></div>
          </div>
        </div>
      )}

      {/* Audit Trail Toggle */}
      <button
        onClick={() => setShowAudit(!showAudit)}
        style={{
          background: 'none', border: '1px solid #374151', borderRadius: '6px',
          color: '#9CA3AF', padding: '8px', cursor: 'pointer', fontSize: '12px',
        }}
      >
        {showAudit ? 'Hide' : 'Show'} Audit Trail ({audit.length})
      </button>

      {showAudit && audit.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
          {audit.map((entry, i) => (
            <div key={i} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#111827', borderRadius: '4px' }}>
              <span style={{ color: entry.result.allowed ? '#34D399' : '#EF4444' }}>
                {entry.result.allowed ? 'ALLOWED' : 'DENIED'}
              </span>
              {' '}
              <span style={{ color: '#D1D5DB' }}>{entry.action.capability}</span>
              {entry.action.tool && <span style={{ color: '#6B7280' }}> ({entry.action.tool})</span>}
              <span style={{ color: '#4B5563', marginLeft: '8px' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
