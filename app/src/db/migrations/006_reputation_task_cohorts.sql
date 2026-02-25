-- Migration: 006_reputation_task_cohorts.sql
-- Per-model per-task reputation cohort storage.
-- Composite primary key: (nft_id, model_id, task_type).
-- See: SDD §3.1 PostgreSQL ReputationStore (FR-1)

CREATE TABLE IF NOT EXISTS reputation_task_cohorts (
  nft_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (nft_id, model_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_task_cohorts_nft ON reputation_task_cohorts(nft_id);
