-- Migration: 011_dynamic_contracts.sql
-- DynamicContract storage for capability-gated access.
-- JSONB stores the full Hounfour DynamicContract object.
-- See: SDD §3.6 DynamicContract Adoption (FR-7)

CREATE TABLE IF NOT EXISTS dynamic_contracts (
  nft_id TEXT PRIMARY KEY,
  contract_id UUID NOT NULL UNIQUE,
  contract_data JSONB NOT NULL,
  contract_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
