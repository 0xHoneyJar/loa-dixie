import React from 'react';

export type ConvictionTier = 'observer' | 'participant' | 'builder' | 'architect' | 'sovereign';

interface ConvictionBadgeProps {
  tier: ConvictionTier;
  bgtStaked?: number;
  modelPool?: string;
  compact?: boolean;
}

const TIER_CONFIG: Record<ConvictionTier, { label: string; color: string; bgColor: string; icon: string }> = {
  observer: { label: 'Observer', color: '#9CA3AF', bgColor: '#1F2937', icon: '👁' },
  participant: { label: 'Participant', color: '#60A5FA', bgColor: '#1E3A5F', icon: '🤝' },
  builder: { label: 'Builder', color: '#34D399', bgColor: '#064E3B', icon: '🔨' },
  architect: { label: 'Architect', color: '#F59E0B', bgColor: '#78350F', icon: '🏛' },
  sovereign: { label: 'Sovereign', color: '#A78BFA', bgColor: '#4C1D95', icon: '👑' },
};

const POOL_LABELS: Record<string, string> = {
  pool_observer: 'Standard',
  pool_standard: 'Standard',
  pool_premium: 'Premium',
};

/**
 * ConvictionBadge — displays user's conviction tier with visual indicator.
 * Reflects BGT staking level and unlocked model pool.
 */
export function ConvictionBadge({ tier, bgtStaked, modelPool, compact }: ConvictionBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.observer;

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          color: config.color,
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}33`,
        }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}33`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>{config.icon}</span>
        <span style={{ fontWeight: 700, fontSize: '14px', color: config.color }}>
          {config.label}
        </span>
        {modelPool && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              color: '#9CA3AF',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: '#374151',
            }}
          >
            {POOL_LABELS[modelPool] ?? modelPool}
          </span>
        )}
      </div>
      {bgtStaked !== undefined && bgtStaked > 0 && (
        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
          {bgtStaked.toLocaleString()} BGT staked
        </div>
      )}
    </div>
  );
}
