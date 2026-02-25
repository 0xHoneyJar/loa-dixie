-- Migration: 008_mutation_log.sql
-- Durable recording of every governance mutation.
-- UUID primary key for idempotency. Indexes for flexible querying.
-- See: SDD §3.3 Mutation Log Store (FR-2)

CREATE TABLE IF NOT EXISTS governance_mutations (
  mutation_id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  actor_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  mutation_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mutations_session ON governance_mutations(session_id);
CREATE INDEX IF NOT EXISTS idx_mutations_resource ON governance_mutations(resource_type, created_at);
CREATE INDEX IF NOT EXISTS idx_mutations_actor ON governance_mutations(actor_id, created_at);
