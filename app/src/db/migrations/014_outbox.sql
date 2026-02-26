-- Migration 014: Transactional Outbox for durable event delivery
-- Replaces fire-and-forget NATS publish with at-least-once delivery
-- See: SDD §7.3 (Outbox Pattern)

CREATE TABLE IF NOT EXISTS fleet_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  dedup_key VARCHAR(128) UNIQUE,
  error TEXT
);

-- Index for polling unprocessed entries
CREATE INDEX IF NOT EXISTS idx_fleet_outbox_unprocessed
  ON fleet_outbox (created_at ASC) WHERE processed_at IS NULL;

-- Index for dedup key lookups
CREATE INDEX IF NOT EXISTS idx_fleet_outbox_dedup
  ON fleet_outbox (dedup_key) WHERE dedup_key IS NOT NULL;
