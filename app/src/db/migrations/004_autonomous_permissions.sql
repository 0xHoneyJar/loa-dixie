-- Migration: 004_autonomous_permissions.sql
-- Dixie-owned tables for autonomous operation permissions and audit trail.
-- See: SDD §5.2.2

CREATE TABLE IF NOT EXISTS autonomous_permissions (
  nft_id TEXT PRIMARY KEY,
  owner_wallet TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  delegated_wallets TEXT[] NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '{
    "tool_execution": false,
    "scheduling": false,
    "knowledge_query": false,
    "agent_communication": false,
    "fund_spending": false,
    "memory_write": false
  }'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{
    "max_spend_per_day_micro_usd": 100000,
    "max_tool_calls_per_hour": 50,
    "allowed_tools": [],
    "blocked_topics": [],
    "require_confirmation_above_usd": 10000
  }'::jsonb,
  audit_config JSONB NOT NULL DEFAULT '{
    "log_all_actions": true,
    "notify_owner_on_spend": true,
    "daily_summary": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autonomous_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id TEXT NOT NULL REFERENCES autonomous_permissions(nft_id),
  action_type TEXT NOT NULL,
  action_detail JSONB NOT NULL,
  permission_result JSONB NOT NULL,
  cost_micro_usd INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_nft_date ON autonomous_audit_log(nft_id, created_at DESC);
