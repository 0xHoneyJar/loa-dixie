-- Migration 015: Agent Ecology — Identity, Insights, Geometry Groups
-- Cycle: cycle-013 (From Fleet to Collective)
-- Strategy: expand-only (all new columns nullable or defaulted)
--
-- New tables:
--   agent_identities  — persistent agent identity with reputation
--   fleet_insights    — cross-agent discovery propagation
--   geometry_groups   — meeting geometry group lifecycle
--
-- Altered tables:
--   fleet_tasks       — FK to agent_identities and geometry_groups

-- ---------------------------------------------------------------------------
-- Agent Identities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id TEXT NOT NULL,
  model TEXT NOT NULL,
  autonomy_level TEXT NOT NULL DEFAULT 'constrained'
    CHECK (autonomy_level IN ('constrained', 'standard', 'autonomous')),
  aggregate_reputation REAL NOT NULL DEFAULT 0.5,
  task_count INTEGER NOT NULL DEFAULT 0 CHECK (task_count >= 0),
  success_count INTEGER NOT NULL DEFAULT 0 CHECK (success_count >= 0),
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_task_id UUID,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_id, model)
);

CREATE INDEX IF NOT EXISTS idx_agent_identities_operator
  ON agent_identities(operator_id);

-- Trigger: auto-update last_active_at
CREATE OR REPLACE FUNCTION update_agent_identity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_identity_updated ON agent_identities;
CREATE TRIGGER trg_agent_identity_updated
  BEFORE UPDATE ON agent_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_identity_timestamp();

-- ---------------------------------------------------------------------------
-- Geometry Groups
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS geometry_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geometry TEXT NOT NULL CHECK (geometry IN ('factory', 'jam', 'study_group')),
  operator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dissolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_geometry_groups_operator
  ON geometry_groups(operator_id);

-- ---------------------------------------------------------------------------
-- Fleet Insights
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fleet_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES fleet_tasks(id) ON DELETE CASCADE,
  source_agent_id UUID REFERENCES agent_identities(id) ON DELETE SET NULL,
  group_id UUID REFERENCES geometry_groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  relevance_context TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fleet_insights_group
  ON fleet_insights(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fleet_insights_expires
  ON fleet_insights(expires_at);
CREATE INDEX IF NOT EXISTS idx_fleet_insights_source_task
  ON fleet_insights(source_task_id);

-- ---------------------------------------------------------------------------
-- Alter fleet_tasks — add ecology FKs
-- ---------------------------------------------------------------------------

ALTER TABLE fleet_tasks
  ADD COLUMN IF NOT EXISTS agent_identity_id UUID
    REFERENCES agent_identities(id) ON DELETE SET NULL;

ALTER TABLE fleet_tasks
  ADD COLUMN IF NOT EXISTS group_id UUID
    REFERENCES geometry_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fleet_tasks_identity
  ON fleet_tasks(agent_identity_id) WHERE agent_identity_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------

ALTER TABLE agent_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_identities_tenant_select ON agent_identities
  FOR SELECT USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY agent_identities_tenant_insert ON agent_identities
  FOR INSERT WITH CHECK (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY agent_identities_tenant_update ON agent_identities
  FOR UPDATE USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

ALTER TABLE geometry_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY geometry_groups_tenant_select ON geometry_groups
  FOR SELECT USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY geometry_groups_tenant_insert ON geometry_groups
  FOR INSERT WITH CHECK (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

ALTER TABLE fleet_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY fleet_insights_tenant_select ON fleet_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_insights.source_task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );

CREATE POLICY fleet_insights_tenant_insert ON fleet_insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_insights.source_task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );
