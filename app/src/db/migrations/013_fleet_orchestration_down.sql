-- Rollback Migration 013: Fleet Orchestration Tables
--
-- Drops tables in reverse dependency order:
--   fleet_config → fleet_notifications → fleet_tasks
--
-- Also drops associated triggers and functions.
-- @since cycle-012 — Sprint 86, Task T-1.2 (Flatline SKP-001)

-- Drop RLS policies first
DROP POLICY IF EXISTS fleet_config_tenant_delete ON fleet_config;
DROP POLICY IF EXISTS fleet_config_tenant_insert ON fleet_config;
DROP POLICY IF EXISTS fleet_config_tenant_update ON fleet_config;
DROP POLICY IF EXISTS fleet_config_tenant_select ON fleet_config;

DROP POLICY IF EXISTS fleet_notifications_tenant_delete ON fleet_notifications;
DROP POLICY IF EXISTS fleet_notifications_tenant_update ON fleet_notifications;
DROP POLICY IF EXISTS fleet_notifications_tenant_insert ON fleet_notifications;
DROP POLICY IF EXISTS fleet_notifications_tenant_select ON fleet_notifications;

DROP POLICY IF EXISTS fleet_tasks_tenant_insert ON fleet_tasks;
DROP POLICY IF EXISTS fleet_tasks_tenant_delete ON fleet_tasks;
DROP POLICY IF EXISTS fleet_tasks_tenant_update ON fleet_tasks;
DROP POLICY IF EXISTS fleet_tasks_tenant_select ON fleet_tasks;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS fleet_config CASCADE;
DROP TABLE IF EXISTS fleet_notifications CASCADE;
DROP TABLE IF EXISTS fleet_tasks CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_fleet_config_updated_at();
DROP FUNCTION IF EXISTS update_fleet_tasks_updated_at();
