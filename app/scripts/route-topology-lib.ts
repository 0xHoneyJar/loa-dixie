/**
 * Route/middleware topology builder — generated truth for API docs.
 *
 * Builds the REAL Dixie app (createDixieApp) and enumerates its Hono route
 * table, so endpoint counts, module inventory, and middleware registrations
 * are derived from live route registration instead of hand-maintained docs.
 *
 * Consumed by:
 * - scripts/generate-route-topology.ts  (writes docs/api-topology.json)
 * - tests/unit/route-topology-parity.test.ts (fails CI on drift)
 *
 * Issues: #212, #213, #216, #219, #225, #228, #229, #232, #237, #239, #241, #243.
 */
import { Hono } from 'hono';
import { createDixieApp } from '../src/server.js';
import { createFleetRoutes } from '../src/routes/fleet.js';
import type { ConductorEngine } from '../src/services/conductor-engine.js';
import type { DixieConfig } from '../src/config.js';

export interface TopologyEndpoint {
  method: string;
  path: string;
}

export interface TopologyModule {
  module: string;
  mount: string;
  /** 'active' = registered in createDixieApp; 'planned' = defined but not mounted. */
  status: 'active' | 'planned';
  endpoint_count: number;
  endpoints: TopologyEndpoint[];
}

export interface TopologyMiddleware {
  position: number;
  path: string;
}

export interface RouteTopology {
  $comment: string;
  counts: {
    modules_active: number;
    modules_planned: number;
    endpoints_active: number;
    endpoints_planned: number;
    endpoints_total: number;
    middleware_registrations: number;
  };
  modules: TopologyModule[];
  middleware: TopologyMiddleware[];
  conditional_modules: string[];
}

/** Minimal config: default feature gates, no external infrastructure. */
function topologyConfig(): DixieConfig {
  return {
    port: 0,
    finnUrl: 'http://localhost:14000',
    finnWsUrl: 'ws://localhost:14000',
    corsOrigins: ['*'],
    allowlistPath: '',
    adminKey: 'topology-admin-key',
    jwtPrivateKey: 'topology-jwt-secret-32-characters!!',
    jwtAlgorithm: 'HS256',
    jwtLegacyHs256Secret: null,
    nodeEnv: 'test',
    logLevel: 'error',
    rateLimitRpm: 1000,
    otelEndpoint: null,
    databaseUrl: null,
    redisUrl: null,
    natsUrl: null,
    memoryProjectionTtlSec: 300,
    memoryMaxEventsPerQuery: 100,
    convictionTierTtlSec: 300,
    personalityTtlSec: 1800,
    autonomousPermissionTtlSec: 300,
    autonomousBudgetDefaultMicroUsd: 100_000,
    databasePoolSize: 10,
    rateLimitBackend: 'memory',
    scheduleCallbackSecret: '',
    x402Enabled: false,
    x402FacilitatorUrl: null,
    billingJwtSecret: null,
    pricingApiUrl: null,
    pricingTtlSec: 300,
    recallIntakeEnabled: false,
    straylightRuntimeDixieKey: '',
    recallIntakeBodyMaxBytes: 32_768,
    recallIntakeRateRpm: 30,
    recallIntakeMaxAssertionsPerTenant: 512,
    recallIntakeMaxAssertionBytesPerTenant: 1_048_576,
    recallIntakeIdempotencyTtlSec: 900,
    recallIntakeIdempotencyMaxEntries: 4_096,
    recallIntakeDevSeedEnabled: false,
    recallIntakeDevSeedTenantId: '',
    admissionIntakeSpikeEnabled: false,
    admissionIntakeSpikeServiceToken: '',
    admissionIntakeSpikeOperatorIds: [],
    admissionIntakeStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeEnabled: false,
    admissionIntakeDurableStorageSpikeDir: '',
  };
}

function moduleNameFor(path: string): { module: string; mount: string } {
  if (path === '/' || !path.startsWith('/api/')) {
    return { module: 'root', mount: '/' };
  }
  const segments = path.split('/').filter(Boolean); // ['api', 'x', ...]
  if (segments[1] === 'ws') {
    return { module: 'ws-ticket', mount: '/api/ws/ticket' };
  }
  return { module: segments[1], mount: `/api/${segments[1]}` };
}

function collectEndpoints(app: Hono): TopologyEndpoint[] {
  const seen = new Set<string>();
  const endpoints: TopologyEndpoint[] = [];
  for (const route of app.routes) {
    if (route.method === 'ALL') continue; // middleware registration
    const key = `${route.method} ${route.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    endpoints.push({ method: route.method, path: route.path });
  }
  return endpoints;
}

function sortEndpoints(endpoints: TopologyEndpoint[]): TopologyEndpoint[] {
  return [...endpoints].sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
  );
}

/** Enumerate the fleet module (defined in the codebase, NOT mounted). */
function collectPlannedFleetEndpoints(): TopologyEndpoint[] {
  // Registration-time enumeration only: handlers never run, so a null
  // conductor is safe here.
  const fleet = createFleetRoutes({ conductor: null as unknown as ConductorEngine });
  const scratch = new Hono();
  scratch.route('/api/fleet', fleet);
  return collectEndpoints(scratch);
}

export function buildRouteTopology(): RouteTopology {
  const dixie = createDixieApp(topologyConfig());

  const middleware: TopologyMiddleware[] = [];
  let position = 0;
  for (const route of dixie.app.routes) {
    if (route.method !== 'ALL') continue;
    position += 1;
    middleware.push({ position, path: route.path });
  }

  const endpoints = collectEndpoints(dixie.app);
  const byModule = new Map<string, TopologyModule>();
  for (const endpoint of endpoints) {
    const { module, mount } = moduleNameFor(endpoint.path);
    let entry = byModule.get(module);
    if (!entry) {
      entry = { module, mount, status: 'active', endpoint_count: 0, endpoints: [] };
      byModule.set(module, entry);
    }
    entry.endpoints.push(endpoint);
  }

  const modules = [...byModule.values()]
    .map((m) => ({ ...m, endpoints: sortEndpoints(m.endpoints), endpoint_count: m.endpoints.length }))
    .sort((a, b) => a.module.localeCompare(b.module));

  const fleetEndpoints = sortEndpoints(collectPlannedFleetEndpoints());
  modules.push({
    module: 'fleet',
    mount: '/api/fleet',
    status: 'planned',
    endpoint_count: fleetEndpoints.length,
    endpoints: fleetEndpoints,
  });

  const active = endpoints.length;
  const planned = fleetEndpoints.length;

  return {
    $comment:
      'GENERATED from live route registration — do not edit by hand. Regenerate: cd app && npm run topology:generate. Parity: tests/unit/route-topology-parity.test.ts.',
    counts: {
      modules_active: modules.filter((m) => m.status === 'active').length,
      modules_planned: modules.filter((m) => m.status === 'planned').length,
      endpoints_active: active,
      endpoints_planned: planned,
      endpoints_total: active + planned,
      middleware_registrations: middleware.length,
    },
    modules,
    middleware,
    conditional_modules: [
      '/api/recall/intake (mounted only when DIXIE_RECALL_INTAKE_ENABLED)',
      '/api/admission/intake (mounted only when the admission-wedge spike gates are enabled)',
    ],
  };
}
