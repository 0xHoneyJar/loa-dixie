-- Migration: 003_schedules.sql
-- Dixie-owned table for NL-parsed cron schedules.
-- See: SDD §5.2.1

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id TEXT NOT NULL,
  owner_wallet TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  original_expression TEXT NOT NULL,
  action TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  max_executions INTEGER,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ NOT NULL,
  finn_cron_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedules_per_nft CHECK (true)  -- Enforced at app layer: max 50
);

CREATE INDEX IF NOT EXISTS idx_schedules_nft ON schedules(nft_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_schedules_next ON schedules(next_execution_at) WHERE enabled = true;
