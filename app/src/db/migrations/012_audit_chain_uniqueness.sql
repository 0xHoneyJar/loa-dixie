-- Migration: 012_audit_chain_uniqueness.sql
-- Prevents chain forking by ensuring each (resource_type, previous_hash) pair
-- is unique. This guards against concurrent first-appends to a new resource_type
-- where FOR UPDATE locks zero rows (empty chain).
-- See: Bridgebuilder review ITER2-001

CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_chain_unique
  ON audit_entries(resource_type, previous_hash);
