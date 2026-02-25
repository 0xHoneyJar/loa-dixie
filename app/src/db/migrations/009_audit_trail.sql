-- Migration: 009_audit_trail.sql
-- Hash-chained audit trail entries. Each entry carries SHA-256 hash
-- linking to its predecessor, forming a tamper-evident chain.
-- See: SDD §3.4 Audit Trail Store (FR-3)

CREATE TABLE IF NOT EXISTS audit_entries (
  entry_id UUID PRIMARY KEY,
  resource_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  payload JSONB,
  entry_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  hash_domain_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_entries(resource_type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_hash ON audit_entries(entry_hash);
