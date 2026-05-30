// Phase 32K — dev/operator seeded live estate (default-off smoke mechanism).
//
// Phase 32J (PR #116, docs/RECALL-WEDGE-SEEDED-LIVE-ESTATE-STORAGE-DESIGN.md)
// established that a live Dixie `POST /api/recall/intake` reaches the
// Straylight seam but returns `seam.storage_unavailable` because the
// process-local bounded estate store has no seeded tenant slot. Phase 32J
// recommended the narrowest safe path: a dev/operator-only, default-off,
// idempotent, in-process `seedTenant` seed wired near the recall-intake
// mount in `server.ts`, using the `served-path.test.ts` seed shape as the
// canonical real-runtime reference. This module is that helper.
//
// SCOPE / NON-GOALS (carried verbatim from the Phase 32J design gate):
//   * dev/operator ONLY — never a user-facing or public write path;
//   * default-OFF — only runs when the dedicated env gate is enabled;
//   * idempotent — `seedTenant` replaces the tenant slot, so re-seeding the
//     same tenant on every process startup is a no-op-equivalent overwrite;
//   * NO production memory admission, NO Discord/Telegram ingestion, NO
//     "remember this" / candidate-memory write, NO public rollout;
//   * NO secrets, private keys, live IDs, tokens, URLs, or signatures are
//     stored. The seed carries only synthetic signer/keyring METADATA. The
//     `dev_signature` a caller presents at request time is computed by the
//     CALLER (HMAC_SHA256 over the canonical recall payload, keyed by the
//     PUBLIC `key_ref` label below) and is NEVER persisted here — see
//     `@loa/straylight` `signatures.ts#verifyEnvelopeSelfConsistency`, which
//     checks only the envelope's internal consistency, not key custody. The
//     `dev_signature` type is explicitly marked DEVELOPMENT-ONLY upstream
//     and carries no cryptographic authority.
//
// Import discipline (mirrors `bounded-estate-store.ts`): type-only imports
// from `@loa/straylight` are safe under ADR-026A §"Decision" §5. This module
// performs NO runtime value import from Straylight; it only constructs
// plain data objects and calls the Dixie-local `BoundedEstateStore.seedTenant`.

import type { Actor, ActorEstate, Keyring, SignerType } from '@loa/straylight';
import type { BoundedEstateStore } from './bounded-estate-store.js';

// ── Synthetic, public-safe seed identity ─────────────────────────────────────
//
// These are PUBLIC labels, not secrets. They are exported so a dev/operator
// caller (and the Phase 32K tests) can construct a self-consistent
// `dev_signature` whose `signer_id` / `signer_type` / `key_ref` match the
// seeded keyring. Reusing these constants keeps the seed and the caller in
// lockstep without copying seed shape into tests or importing test material
// into production source.
//
// `DEV_SEED_KEY_REF` is the HMAC key label the caller signs with. It is a
// synthetic dev-only identifier — NOT a private key, NOT live key material.
export const DEV_SEED_SIGNER_ID = 'signer:dixie-dev-seeded-operator';
export const DEV_SEED_SIGNER_TYPE: SignerType = 'actor_controller';
export const DEV_SEED_KEY_REF = 'dev-seed-key:dixie-operator-smoke';

// Fixed, synthetic timestamps. `valid_from` is far enough in the past that
// the seeded signer is currently-valid under any real wall clock
// (`isSignerCurrentlyValid` rejects `now < valid_from`). The recall path does
// NOT enforce a timelock or `valid_until` for `recall_estate_context`, so a
// stable past `valid_from` is sufficient and keeps the seed fully
// deterministic across process restarts.
export const DEV_SEED_VALID_FROM = '2020-01-01T00:00:00.000Z';
const DEV_SEED_CREATED_AT = '2020-01-01T00:00:00.000Z';

// Competence vocabulary for the served recall path. Mirrors the canonical
// `served-path.test.ts` seed: a single `recall_estate_context` rule whose
// `required_signer_roles` admits the seeded signer's role. No quorum, no
// timelock, no human-review requirement — a low-risk private-frame recall by
// the actor's own controller is an `allow`.
const DEV_SEED_REQUIRED_ROLES: SignerType[] = [
  DEV_SEED_SIGNER_TYPE,
  'operator',
  'runtime',
  'reviewer',
];

export interface DevSeedMaterial {
  actor: Actor;
  estate: ActorEstate;
  keyring: Keyring;
}

/**
 * Build deterministic, synthetic, public-safe seed material for one
 * dev/operator tenant. All ids are derived from `tenantId` so the seed is
 * stable across restarts; no live identifiers, secrets, or signatures are
 * present. The estate/actor/keyring ids that the recall seam reads
 * (`estate_id`, `actor_id`, `keyring_id`) are bound to `tenantId` because the
 * route enforces `request.actor_id === request.estate_id === session wallet`,
 * and the bounded store scopes every write to the bound estate.
 */
export function buildDevSeedMaterial(tenantId: string): DevSeedMaterial {
  const keyringId = `kr:dev-seed:${tenantId}`;

  const actor: Actor = {
    actor_id: tenantId,
    actor_type: 'agent',
    estate_id: tenantId,
    keyring_id: keyringId,
    status: 'active',
    controller_refs: [tenantId],
    schema_version: '0.1.0',
    created_at: DEV_SEED_CREATED_AT,
    updated_at: DEV_SEED_CREATED_AT,
  };

  const estate: ActorEstate = {
    estate_id: tenantId,
    actor_id: tenantId,
    schema_version: '0.1.0',
    status: 'active',
    assertion_index_ref: `index:dev-seed:${tenantId}`,
    keyring_id: keyringId,
    policy_id: 'straylight.default-agent-estate.v0',
    audit_log_ref: `audit:dev-seed:${tenantId}`,
    created_at: DEV_SEED_CREATED_AT,
    updated_at: DEV_SEED_CREATED_AT,
  };

  const keyring: Keyring = {
    keyring_id: keyringId,
    actor_id: tenantId,
    estate_id: tenantId,
    version: '0.1.0',
    signer_entries: [
      {
        signer_id: DEV_SEED_SIGNER_ID,
        signer_type: DEV_SEED_SIGNER_TYPE,
        key_ref: DEV_SEED_KEY_REF,
        status: 'active',
        valid_from: DEV_SEED_VALID_FROM,
        scopes: [`estate:${tenantId}`],
      },
    ],
    competence_rules: [
      {
        rule_id: 'rule:dixie-dev-seed-recall-default',
        transition_type: 'recall_estate_context',
        required_signer_roles: DEV_SEED_REQUIRED_ROLES,
      },
    ],
    revoked_key_refs: [],
    created_at: DEV_SEED_CREATED_AT,
    updated_at: DEV_SEED_CREATED_AT,
  };

  return { actor, estate, keyring };
}

/**
 * Seed exactly one explicitly-configured dev/operator tenant into the
 * process-local bounded estate store. Idempotent: `seedTenant` replaces the
 * slot, so calling this on every startup (or more than once) leaves a single,
 * empty (zero-assertion) seeded estate. Seeds NO assertions — a served recall
 * over an empty estate returns an `allow` pack with `included: []`, which is
 * the dev/operator smoke target. This NEVER seeds arbitrary tenants, NEVER
 * reads request/Discord/user input, and NEVER admits production memory.
 */
export function seedDevOperatorEstate(
  store: BoundedEstateStore,
  tenantId: string,
): void {
  const { actor, estate, keyring } = buildDevSeedMaterial(tenantId);
  store.seedTenant({ tenant_id: tenantId, actor, estate, keyring });
}
