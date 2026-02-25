-- Migration: 005_reputation_aggregates.sql
-- Reputation aggregate storage with hybrid JSONB + indexed columns.
-- The `data` column stores the full ReputationAggregate as JSONB.
-- Key fields are lifted to columns for indexed queries.
-- See: SDD §3.1 PostgreSQL ReputationStore (FR-1)

CREATE TABLE IF NOT EXISTS reputation_aggregates (
  nft_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'cold',
  blended_score NUMERIC(6,4) NOT NULL DEFAULT 0,
  sample_count INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_agg_state ON reputation_aggregates(state);
CREATE INDEX IF NOT EXISTS idx_rep_agg_version ON reputation_aggregates(version);
