// Phase 30C — Dixie recall-intake contract preflight.
//
// These tests pin the ingress boundary between Dixie (BFF/host) and the
// Straylight runtime seam at `@loa/straylight/runtime/recall-intake`.
// The contract:
//
//   * Bodies whose `request` shape disagrees with Straylight's
//     `RecallIntakeRequest` (host-ish / legacy / mismatched) are REFUSED
//     at ingress with `ingress.invalid_request` BEFORE the seam is
//     called. There is no silent cast.
//   * Bodies whose `request` shape *is* a wedge-aligned
//     `RecallIntakeRequest` reach the seam and receive a wedge-shaped
//     response (served / denied / needs_review) mapped through the
//     existing refusal-mapping pipeline.
//   * Refusal envelopes are stable: shape, http status, error class.
//
// The seam is observed via a spy on `handleRecallIntake` that the route
// imports from `@loa/straylight/runtime/recall-intake`.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import {
  createBoundedEstateStore,
  createCapabilityHolder,
  createIdempotencyCache,
  createPerEstateMutex,
  createPerTenantRateLimit,
} from '../../../src/services/straylight-recall-intake/index.js';
import { createInMemoryIntakeDenyLog } from '../../../src/services/straylight-host/index.js';
import { createRecallIntakeRoutes } from '../../../src/routes/recall-intake.js';
import type { Actor, ActorEstate, Keyring } from '@loa/straylight';

// Spy on the seam: any call into Straylight's runtime recall-intake
// entrypoint is observable here. If preflight rejects a request, this
// mock must NOT fire; if preflight accepts, it must fire exactly once.
const handleRecallIntakeSpy = vi.fn();
vi.mock('@loa/straylight/runtime/recall-intake', async () => {
  const actual = await vi.importActual<
    typeof import('@loa/straylight/runtime/recall-intake')
  >('@loa/straylight/runtime/recall-intake');
  return {
    ...actual,
    handleRecallIntake: (...args: Parameters<typeof actual.handleRecallIntake>) => {
      handleRecallIntakeSpy(...args);
      return actual.handleRecallIntake(...args);
    },
  };
});

const KEY = 'phase-30c-preflight-key-32-bytes-aaaaaa';
const WALLET = '0xabcdef0000000000000000000000000000000010';

function buildApp() {
  const app = new Hono();
  app.use('/api/recall/intake/*', async (c, next) => {
    const w = c.req.header('x-test-wallet');
    if (w) c.req.raw.headers.set('x-wallet-address', w);
    await next();
  });
  const boundedStore = createBoundedEstateStore({
    maxAssertionsPerTenant: 100,
    maxAssertionBytesPerTenant: 1_000_000,
  });
  const actor: Actor = {
    actor_id: WALLET,
    actor_class: 'agent',
    display_name: 'test',
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Actor;
  const estate: ActorEstate = {
    estate_id: WALLET,
    actor_id: WALLET,
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as ActorEstate;
  const keyring: Keyring = {
    keyring_id: `kr_${WALLET}`,
    actor_id: WALLET,
    signers: [
      {
        signer_id: 'signer_test',
        actor_id: WALLET,
        public_key: 'pk_test',
        roles: ['actor_self'],
        active: true,
        added_at: '2026-05-18T00:00:00Z',
      },
    ],
    created_at: '2026-05-18T00:00:00Z',
  } as unknown as Keyring;
  boundedStore.seedTenant({ tenant_id: WALLET, actor, estate, keyring });
  app.route(
    '/api/recall/intake',
    createRecallIntakeRoutes({
      bodyMaxBytes: 8_192,
      capabilityHolder: createCapabilityHolder(),
      boundedStore,
      idempotencyCache: createIdempotencyCache({ ttlSec: 60, maxEntries: 64 }),
      perEstateMutex: createPerEstateMutex(),
      perTenantRateLimit: createPerTenantRateLimit({ rpm: 60 }),
      intakeLog: createInMemoryIntakeDenyLog(),
    }),
  );
  return app;
}

function wedgeAlignedBody(wallet: string, request_id: string) {
  return {
    request: {
      recall_request_id: request_id,
      actor_id: wallet,
      estate_id: wallet,
      requested_by: wallet,
      task: 'recall-intake-preflight',
      environment_frame: 'private_chat',
      risk_profile: 'low',
      include_receipt_detail: 'minimal',
      signature: {
        signature_id: 'sig_1',
        signer_id: 'signer_test',
        signer_type: 'actor_controller',
        signature_type: 'dev_signature',
        signed_payload_hash:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        signature: 'devsig',
        signed_at: '2026-05-18T00:00:00Z',
        key_ref: 'kref_test',
      },
      created_at: '2026-05-18T00:00:00Z',
    },
    detail_level: 'minimal',
    caller: { tenant_id: wallet, actor_id: wallet },
  };
}

beforeEach(() => {
  process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY = KEY;
  handleRecallIntakeSpy.mockClear();
});
afterEach(() => {
  delete process.env.STRAYLIGHT_RUNTIME_DIXIE_KEY;
});

describe('Phase 30C — recall-intake preflight rejects host-ish/legacy shapes', () => {
  it('rejects legacy {signature_value, algorithm} signature shape', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-legacy-sig');
    // Replace the wedge SignatureEnvelope with the pre-Phase-30C "host-ish"
    // shape. Any field name that no longer matches the wedge contract MUST
    // be refused at ingress, never silently cast onto the seam request.
    (body.request as unknown as Record<string, unknown>).signature = {
      signature_id: 'sig_1',
      signer_id: 'signer_test',
      signature_value: 'devsig',
      algorithm: 'ed25519',
      signed_at: '2026-05-18T00:00:00Z',
    };
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-legacy-sig',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string; outcome: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(j.outcome).toBe('denied');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });

  it('rejects host-ish risk_profile (routine|sensitive instead of wedge RiskLevel)', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-bad-risk');
    (body.request as unknown as { risk_profile: string }).risk_profile = 'routine';
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-bad-risk',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });

  it('rejects host-ish environment_frame value (actor_private not in wedge enum)', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-bad-frame');
    (body.request as unknown as { environment_frame: string }).environment_frame =
      'actor_private';
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-bad-frame',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });

  it('rejects bodies missing required wedge fields (requested_by, task, created_at)', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-missing-fields');
    delete (body.request as unknown as Record<string, unknown>).requested_by;
    delete (body.request as unknown as Record<string, unknown>).task;
    delete (body.request as unknown as Record<string, unknown>).created_at;
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-missing-fields',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });

  it('rejects bodies with unknown extra fields (strict zod)', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-extra');
    (body.request as unknown as Record<string, unknown>).rogue_field = true;
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-extra',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });

  it('rejects bodies with unknown signature.signer_type / signature_type enum values', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-bad-sig-enum');
    (body.request.signature as unknown as { signer_type: string }).signer_type =
      'unknown_role';
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-bad-sig-enum',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as { error: string };
    expect(j.error).toBe('ingress.invalid_request');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });
});

describe('Phase 30C — recall-intake preflight admits wedge-aligned bodies', () => {
  it('a wedge-aligned RecallIntakeRequest reaches the seam exactly once', async () => {
    const app = buildApp();
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-aligned',
      },
      body: JSON.stringify(wedgeAlignedBody(WALLET, 'r-aligned')),
    });
    // The response may be 200 / 4xx / 503 depending on wedge state; what
    // preflight guarantees is that the seam was *reached* (not refused at
    // ingress before being called).
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(413);
    expect(res.status).not.toBe(429);
    if (res.status >= 400) {
      const j = (await res.json()) as { error?: string };
      // Whatever refusal class fires, it MUST NOT be an ingress.* refusal.
      expect(j.error?.startsWith('ingress.')).toBeFalsy();
    }
    expect(handleRecallIntakeSpy).toHaveBeenCalledTimes(1);
    // The seam was invoked with a request whose enums match the wedge
    // vocabulary — i.e. preflight propagated the validated shape, not a
    // host-ish surrogate.
    const args = handleRecallIntakeSpy.mock.calls[0]!;
    const seamReq = args[1] as {
      request: { environment_frame: string; risk_profile: string };
      caller: { tenant_id: string; actor_id: string };
    };
    expect(seamReq.request.environment_frame).toBe('private_chat');
    expect(seamReq.request.risk_profile).toBe('low');
    expect(seamReq.caller.tenant_id).toBe(WALLET);
    expect(seamReq.caller.actor_id).toBe(WALLET);
  });

  it('refusal envelope for a rejected preflight is the documented stable shape', async () => {
    const app = buildApp();
    const body = wedgeAlignedBody(WALLET, 'r-stable-refusal');
    (body.request as unknown as { risk_profile: string }).risk_profile = 'routine';
    const res = await app.request('/api/recall/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-wallet': WALLET,
        'idempotency-key': 'k-stable-refusal',
      },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
    const j = (await res.json()) as Record<string, unknown>;
    // Refusal-mapping pattern: {outcome, error, message}.
    expect(j.outcome).toBe('denied');
    expect(j.error).toBe('ingress.invalid_request');
    expect(typeof j.message).toBe('string');
    expect(handleRecallIntakeSpy).not.toHaveBeenCalled();
  });
});
