-- Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike (EXPERIMENTAL cleanup/drop DDL).
--
-- NON-PRODUCTION, dev/operator-only. This is the reversible cleanup / drop /
-- tombstone path for the experimental `aw_isolation_spike_*` family created by
-- the paired forward file. It is applied ONLY by the explicit dev/operator
-- runner under an explicit cleanup invocation — never on app startup, never via
-- the normal production runner (which ignores `_down` files by construction),
-- and never via any package lifecycle script.
--
-- Dropping these experimental objects removes the entire dev/operator spike
-- footprint and leaves NO production state behind (the objects are synthetic and
-- dev-only). Order is reverse of creation.

DROP TABLE IF EXISTS aw_isolation_spike_tombstone;
DROP TABLE IF EXISTS aw_isolation_spike_supersession_link;
DROP TABLE IF EXISTS aw_isolation_spike_assertion;
