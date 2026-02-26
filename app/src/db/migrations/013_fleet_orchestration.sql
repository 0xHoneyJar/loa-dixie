-- Migration 013: Fleet Orchestration Tables
--
-- Creates fleet_tasks, fleet_notifications, fleet_config tables
-- with CHECK constraints, indexes, triggers, and RLS policies.
--
-- Expand/contract strategy: This migration creates new tables only (expand).
-- No existing tables or columns are modified. To rollback, run
-- 013_fleet_orchestration_down.sql which drops tables in reverse order.
--
-- @since cycle-012 — Sprint 86, Tasks T-1.2, T-1.12

-- =========================================================================
-- fleet_tasks — Primary task tracking with state machine
-- =========================================================================
CREATE TABLE IF NOT EXISTS fleet_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     TEXT NOT NULL,
  agent_type      TEXT NOT NULL,
  model           TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  description     TEXT NOT NULL,
  branch          TEXT NOT NULL,
  worktree_path   TEXT,
  container_id    TEXT,
  tmux_session    TEXT,
  status          TEXT NOT NULL DEFAULT 'proposed',
  version         INTEGER NOT NULL DEFAULT 0,
  pr_number       INTEGER,
  ci_status       TEXT,
  review_status   JSONB,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  max_retries     INTEGER NOT NULL DEFAULT 3,
  context_hash    TEXT,
  failure_context JSONB,
  spawned_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN (
    'proposed', 'spawning', 'running', 'pr_created', 'reviewing',
    'ready', 'merged', 'failed', 'retrying', 'abandoned', 'rejected', 'cancelled'
  )),
  CONSTRAINT valid_agent_type CHECK (agent_type IN ('claude_code', 'codex', 'gemini')),
  CONSTRAINT valid_task_type CHECK (task_type IN ('bug_fix', 'feature', 'refactor', 'review', 'docs')),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_operator ON fleet_tasks (operator_id);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_status ON fleet_tasks (status);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_branch ON fleet_tasks (branch);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_created ON fleet_tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_tasks_active ON fleet_tasks (status)
  WHERE status IN ('proposed', 'spawning', 'running', 'pr_created', 'reviewing', 'retrying');

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_fleet_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_tasks_updated_at ON fleet_tasks;
CREATE TRIGGER trg_fleet_tasks_updated_at
  BEFORE UPDATE ON fleet_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_tasks_updated_at();

-- =========================================================================
-- fleet_notifications — Delivery tracking with retry
-- =========================================================================
CREATE TABLE IF NOT EXISTS fleet_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES fleet_tasks(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,
  payload         JSONB NOT NULL,
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_channel CHECK (channel IN ('discord', 'telegram', 'cli'))
);

CREATE INDEX IF NOT EXISTS idx_fleet_notifications_task ON fleet_notifications (task_id);
CREATE INDEX IF NOT EXISTS idx_fleet_notifications_pending ON fleet_notifications (delivered, created_at)
  WHERE delivered = FALSE;

-- =========================================================================
-- fleet_config — Operator-level preferences
-- =========================================================================
CREATE TABLE IF NOT EXISTS fleet_config (
  operator_id             TEXT PRIMARY KEY,
  discord_webhook_url     TEXT,
  telegram_bot_token      TEXT,
  telegram_chat_id        TEXT,
  notify_on_spawn         BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_complete      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_failure       BOOLEAN NOT NULL DEFAULT TRUE,
  default_max_retries     INTEGER NOT NULL DEFAULT 3,
  default_timeout_minutes INTEGER NOT NULL DEFAULT 120,
  preferred_model         TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger for fleet_config
CREATE OR REPLACE FUNCTION update_fleet_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fleet_config_updated_at ON fleet_config;
CREATE TRIGGER trg_fleet_config_updated_at
  BEFORE UPDATE ON fleet_config
  FOR EACH ROW
  EXECUTE FUNCTION update_fleet_config_updated_at();

-- =========================================================================
-- RLS Policies — Tenant isolation (T-1.12, Flatline SKP-008)
-- =========================================================================

-- fleet_tasks: operator can only access their own tasks
ALTER TABLE fleet_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY fleet_tasks_tenant_select ON fleet_tasks
  FOR SELECT USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_tasks_tenant_update ON fleet_tasks
  FOR UPDATE USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_tasks_tenant_delete ON fleet_tasks
  FOR DELETE USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_tasks_tenant_insert ON fleet_tasks
  FOR INSERT WITH CHECK (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

-- fleet_notifications: access through fleet_tasks FK (tenant inherited)
ALTER TABLE fleet_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY fleet_notifications_tenant_select ON fleet_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_notifications.task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );

CREATE POLICY fleet_notifications_tenant_insert ON fleet_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_notifications.task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );

CREATE POLICY fleet_notifications_tenant_update ON fleet_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_notifications.task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );

CREATE POLICY fleet_notifications_tenant_delete ON fleet_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fleet_tasks
      WHERE fleet_tasks.id = fleet_notifications.task_id
        AND (
          current_setting('app.operator_id', true) = fleet_tasks.operator_id
          OR current_setting('app.is_admin', true) = 'true'
        )
    )
  );

-- fleet_config: operator can only access their own config
ALTER TABLE fleet_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY fleet_config_tenant_select ON fleet_config
  FOR SELECT USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_config_tenant_update ON fleet_config
  FOR UPDATE USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_config_tenant_insert ON fleet_config
  FOR INSERT WITH CHECK (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );

CREATE POLICY fleet_config_tenant_delete ON fleet_config
  FOR DELETE USING (
    current_setting('app.operator_id', true) = operator_id
    OR current_setting('app.is_admin', true) = 'true'
  );
