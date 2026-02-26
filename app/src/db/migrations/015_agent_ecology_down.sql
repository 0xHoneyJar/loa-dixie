-- Rollback migration 015: Agent Ecology
-- Drop in reverse dependency order

-- Drop RLS policies
DROP POLICY IF EXISTS fleet_insights_tenant_insert ON fleet_insights;
DROP POLICY IF EXISTS fleet_insights_tenant_select ON fleet_insights;
DROP POLICY IF EXISTS geometry_groups_tenant_insert ON geometry_groups;
DROP POLICY IF EXISTS geometry_groups_tenant_select ON geometry_groups;
DROP POLICY IF EXISTS agent_identities_tenant_update ON agent_identities;
DROP POLICY IF EXISTS agent_identities_tenant_insert ON agent_identities;
DROP POLICY IF EXISTS agent_identities_tenant_select ON agent_identities;

-- Drop indexes on fleet_tasks
DROP INDEX IF EXISTS idx_fleet_tasks_identity;

-- Drop columns from fleet_tasks
ALTER TABLE fleet_tasks DROP COLUMN IF EXISTS group_id;
ALTER TABLE fleet_tasks DROP COLUMN IF EXISTS agent_identity_id;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS fleet_insights;
DROP TABLE IF EXISTS geometry_groups;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_agent_identity_updated ON agent_identities;
DROP FUNCTION IF EXISTS update_agent_identity_timestamp();

DROP TABLE IF EXISTS agent_identities;
