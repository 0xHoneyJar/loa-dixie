/**
 * Route/middleware topology parity (issues #212, #213, #216, #219, #225,
 * #228, #229, #232, #237, #239, #241, #243).
 *
 * Endpoint counts and module inventory in docs must match live route
 * registration. buildRouteTopology() derives the truth from the real app;
 * these tests fail when docs/api-topology.json, README.md, or
 * docs/api-reference.md drift from it.
 *
 * Regenerate after route changes: cd app && npm run topology:generate
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRouteTopology, type RouteTopology } from '../../scripts/route-topology-lib.js';

const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');

const topology = buildRouteTopology();
const counts = topology.counts;

/** Extract `| module | \`mount\` | N |` endpoint counts from a markdown table. */
function tableCounts(markdown: string): Map<string, number> {
  const out = new Map<string, number>();
  const rowRe = /^\|\s*([a-z-]+)\s*\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/gm;
  for (const match of markdown.matchAll(rowRe)) {
    out.set(match[1], Number(match[3]));
  }
  return out;
}

describe('generated topology file', () => {
  it('docs/api-topology.json matches live route registration', () => {
    const checked: RouteTopology = JSON.parse(
      readFileSync(resolve(repoRoot, 'docs/api-topology.json'), 'utf8'),
    );
    expect(checked).toEqual(JSON.parse(JSON.stringify(topology)));
  });

  it('fleet is planned (not wired) and excluded from active registration', () => {
    const fleet = topology.modules.find((m) => m.module === 'fleet');
    expect(fleet?.status).toBe('planned');
    const activeFleetEndpoints = topology.modules
      .filter((m) => m.status === 'active')
      .flatMap((m) => m.endpoints)
      .filter((e) => e.path.startsWith('/api/fleet'));
    expect(activeFleetEndpoints).toEqual([]);
  });

  it('active counts exclude planned endpoints', () => {
    expect(counts.endpoints_total).toBe(counts.endpoints_active + counts.endpoints_planned);
  });
});

describe('README parity', () => {
  const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');

  it('states the generated active endpoint count', () => {
    expect(readme).toContain(`${counts.endpoints_active} active endpoints`);
  });

  it('states the generated total including planned endpoints', () => {
    expect(readme).toContain(
      `${counts.endpoints_total} total including the ${counts.endpoints_planned} planned fleet endpoints`,
    );
  });

  it('module table matches generated per-module endpoint counts', () => {
    const documented = tableCounts(readme);
    for (const module of topology.modules) {
      if (module.module === 'root') continue; // status route, not an API module
      expect(
        documented.get(module.module),
        `README table row for module "${module.module}"`,
      ).toBe(module.endpoint_count);
    }
  });
});

describe('API reference parity', () => {
  const apiRef = readFileSync(resolve(repoRoot, 'docs/api-reference.md'), 'utf8');

  it('endpoint summary matches generated per-module endpoint counts', () => {
    const documented = tableCounts(apiRef);
    for (const module of topology.modules) {
      if (module.module === 'root') continue;
      expect(
        documented.get(module.module),
        `api-reference summary row for module "${module.module}"`,
      ).toBe(module.endpoint_count);
    }
  });

  it('states generated totals', () => {
    expect(apiRef).toContain(`**${counts.endpoints_total}**`);
    expect(apiRef).toContain(`**${counts.endpoints_active} active, ${counts.endpoints_planned} planned**`);
  });

  it('labels fleet as experimental / not wired', () => {
    expect(apiRef.toLowerCase()).toContain('experimental');
    expect(apiRef).toContain('Not wired');
  });
});
