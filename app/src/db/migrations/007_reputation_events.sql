-- Migration: 007_reputation_events.sql
-- Append-only reputation event log for event sourcing.
-- BIGSERIAL primary key for strict ordering. Never updated or deleted.
-- See: SDD §3.1 PostgreSQL ReputationStore (FR-1)

CREATE TABLE IF NOT EXISTS reputation_events (
  id BIGSERIAL PRIMARY KEY,
  nft_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_events_nft ON reputation_events(nft_id, id);
