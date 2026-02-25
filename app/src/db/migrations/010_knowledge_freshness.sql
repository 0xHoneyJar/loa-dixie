-- Migration: 010_knowledge_freshness.sql
-- Knowledge governance freshness state persistence.
-- Columns for all KnowledgeItem fields plus governance metadata.
-- See: SDD §3.5 Knowledge Governor (FR-4, FR-5)

CREATE TABLE IF NOT EXISTS knowledge_freshness (
  corpus_id TEXT PRIMARY KEY,
  source_count INTEGER NOT NULL DEFAULT 0,
  citation_count INTEGER NOT NULL DEFAULT 0,
  freshness_score NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  freshness_state TEXT NOT NULL DEFAULT 'fresh',
  decay_rate NUMERIC(8,6) NOT NULL DEFAULT 0.023,
  minimum_freshness NUMERIC(5,4) NOT NULL DEFAULT 0.1,
  last_ingested TIMESTAMPTZ NOT NULL DEFAULT now(),
  dimension_scores JSONB NOT NULL DEFAULT '{"accuracy":0,"coverage":0,"recency":0}',
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
