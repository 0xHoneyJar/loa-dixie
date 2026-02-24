-- Migration: 006_reputation_snapshot.sql
-- Adds event-sourcing bookkeeping columns to reputation_aggregates.
-- See: Bridgebuilder Meditation §II, SPECULATION-1 (event-sourced reputation)

-- snapshot_version: Monotonically increasing version for event-sourced snapshot compaction.
-- Incremented on each put(). When replay produces a higher version than
-- stored, the aggregate is stale and should be recomputed.
ALTER TABLE reputation_aggregates
  ADD COLUMN IF NOT EXISTS snapshot_version BIGINT NOT NULL DEFAULT 0;

-- event_count: Count of events appended since last snapshot compaction.
-- When event_count exceeds a threshold (e.g., 100), the aggregate
-- should be recomputed from the event log and snapshot_version reset.
ALTER TABLE reputation_aggregates
  ADD COLUMN IF NOT EXISTS event_count BIGINT NOT NULL DEFAULT 0;
