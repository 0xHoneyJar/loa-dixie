-- Migration: 005_reputation.sql
-- Dixie-owned tables for persistent reputation storage.
-- Replaces InMemoryReputationStore for production use.
-- See: PRD v6.0.0 FR-7, SDD v6.0.0 §2.2

-- Table 1: reputation_aggregates
-- Stores the full ReputationAggregate as JSONB with extracted state for indexing.
CREATE TABLE IF NOT EXISTS reputation_aggregates (
  nft_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'cold',
  aggregate JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_aggregates_state
  ON reputation_aggregates(state);

-- Table 2: reputation_task_cohorts
-- Per-model per-task reputation tracking with composite primary key.
CREATE TABLE IF NOT EXISTS reputation_task_cohorts (
  nft_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  cohort JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (nft_id, model_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_reputation_task_cohorts_nft
  ON reputation_task_cohorts(nft_id);

-- Table 3: reputation_events (append-only event log)
-- Source of truth for event-sourced reputation reconstruction.
CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nft_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_events_nft_date
  ON reputation_events(nft_id, created_at);
