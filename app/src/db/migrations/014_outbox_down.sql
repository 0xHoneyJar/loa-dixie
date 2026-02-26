-- Rollback Migration 014: Transactional Outbox
-- Drops the fleet_outbox table and associated indexes.
-- @since cycle-012 — Sprint 92, Task T-7.9

DROP TABLE IF EXISTS fleet_outbox;
