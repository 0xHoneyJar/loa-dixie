-- Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike (EXPERIMENTAL forward DDL).
--
-- NON-PRODUCTION, dev/operator-only, disabled-by-default, route-owned spike DDL.
--
-- ISOLATION (by construction):
--   * This file lives OUTSIDE the normal production migration directory
--     (app/src/db/migrations/). The normal production runner scans only its own
--     single directory and the production packager copies only that directory's
--     `.sql` assets — neither ever discovers, executes, or bundles this file.
--   * This file is applied ONLY by the explicit dev/operator runner
--     (app/scripts/aw-sql-isolation-spike-runner.mjs), and only when the
--     dev/operator opt-in env gate is set to exactly `true` AND the environment
--     is NOT production. It NEVER runs on app startup and NEVER runs through any
--     package lifecycle script.
--
-- NON-GOALS (explicit): this is NOT production storage, NOT the final Straylight
-- store, NOT a final schema freeze, NOT a route-contract freeze, and NOT an
-- ADR-022E gate #8 discharge. The shape below is the Phase 46S DRAFT
-- (schema_final FALSE), realized here as an obviously-experimental
-- `aw_isolation_spike_*` family for a dev/operator spike only.
--
-- DATA MINIMIZATION (BOUNDED OPAQUE REFERENCES ONLY; enforced, not commented):
--   Every reference column is a short, bounded, opaque `awref:<kind>:<short-id>`
--   string — NEVER a raw candidate payload, source material, raw reasons, private
--   audit internals, or any public-response-expanding material. This is enforced
--   in the SCHEMA itself: each ref column is VARCHAR(80) AND carries a CHECK
--   constraint pinning a narrow `awref:` prefix + character set + length bound, so
--   a raw JSON blob, long source text, or free-form reason can NOT be stored by
--   schema design. `candidate_payload_ref` is therefore a short reference, never
--   the payload; `public_receipt_ref` is a public-safe short reference or NULL.

-- The synthetic admitted-assertion artifact. Every row is scoped by
-- (tenant_ref, estate_ref, actor_ref) and pins an opaque assertion_ref.
CREATE TABLE IF NOT EXISTS aw_isolation_spike_assertion (
  spike_row_id           BIGSERIAL PRIMARY KEY,
  tenant_ref             VARCHAR(80) NOT NULL,
  estate_ref             VARCHAR(80) NOT NULL,
  actor_ref              VARCHAR(80) NOT NULL,
  assertion_ref          VARCHAR(80) NOT NULL,
  assertion_class        VARCHAR(64) NOT NULL,
  assertion_status       VARCHAR(16) NOT NULL DEFAULT 'active',
  candidate_payload_ref  VARCHAR(80),
  public_receipt_ref     VARCHAR(80),
  recorded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aw_isolation_spike_assertion_status_chk
    CHECK (assertion_status IN ('active', 'superseded')),
  CONSTRAINT aw_isolation_spike_assertion_class_chk
    CHECK (assertion_class ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT aw_isolation_spike_assertion_tenant_ref_chk
    CHECK (tenant_ref ~ '^awref:tenant:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_estate_ref_chk
    CHECK (estate_ref ~ '^awref:estate:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_actor_ref_chk
    CHECK (actor_ref ~ '^awref:actor:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_assertion_ref_chk
    CHECK (assertion_ref ~ '^awref:assertion:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_candidate_payload_ref_chk
    CHECK (candidate_payload_ref IS NULL
           OR candidate_payload_ref ~ '^awref:payload:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_public_receipt_ref_chk
    CHECK (public_receipt_ref IS NULL
           OR public_receipt_ref ~ '^awref:receipt:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_assertion_uniq
    UNIQUE (tenant_ref, estate_ref, actor_ref, assertion_ref)
);

-- Dixie-local INVERSE link only (never a rewrite of the canonical append-only
-- chain): repoints recall from a superseded reference to its correction. The row
-- is actor-scoped (actor_ref) so every scoped artifact carries the actor, exactly
-- as the assertion table does.
CREATE TABLE IF NOT EXISTS aw_isolation_spike_supersession_link (
  spike_link_id             BIGSERIAL PRIMARY KEY,
  tenant_ref                VARCHAR(80) NOT NULL,
  estate_ref                VARCHAR(80) NOT NULL,
  actor_ref                 VARCHAR(80) NOT NULL,
  superseded_assertion_ref  VARCHAR(80) NOT NULL,
  correcting_assertion_ref  VARCHAR(80) NOT NULL,
  linked_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aw_isolation_spike_supersession_tenant_ref_chk
    CHECK (tenant_ref ~ '^awref:tenant:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_supersession_estate_ref_chk
    CHECK (estate_ref ~ '^awref:estate:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_supersession_actor_ref_chk
    CHECK (actor_ref ~ '^awref:actor:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_supersession_superseded_ref_chk
    CHECK (superseded_assertion_ref ~ '^awref:assertion:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_supersession_correcting_ref_chk
    CHECK (correcting_assertion_ref ~ '^awref:assertion:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_supersession_uniq
    UNIQUE (tenant_ref, estate_ref, actor_ref, superseded_assertion_ref)
);

-- Explicit dev/operator cleanup marker (the reversible drop/cleanup story lives
-- in the paired `_down.sql`; this records intent for a bounded dev artifact). The
-- row is actor-scoped (actor_ref) so every scoped artifact carries the actor.
CREATE TABLE IF NOT EXISTS aw_isolation_spike_tombstone (
  spike_tombstone_id  BIGSERIAL PRIMARY KEY,
  tenant_ref          VARCHAR(80) NOT NULL,
  estate_ref          VARCHAR(80) NOT NULL,
  actor_ref           VARCHAR(80) NOT NULL,
  assertion_ref       VARCHAR(80) NOT NULL,
  tombstoned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT aw_isolation_spike_tombstone_tenant_ref_chk
    CHECK (tenant_ref ~ '^awref:tenant:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_tombstone_estate_ref_chk
    CHECK (estate_ref ~ '^awref:estate:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_tombstone_actor_ref_chk
    CHECK (actor_ref ~ '^awref:actor:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$'),
  CONSTRAINT aw_isolation_spike_tombstone_assertion_ref_chk
    CHECK (assertion_ref ~ '^awref:assertion:[A-Za-z0-9][A-Za-z0-9_-]{0,59}$')
);
