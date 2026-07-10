/**
 * Generate docs/api-topology.json from live route registration.
 *
 * Usage: cd app && npm run topology:generate
 *
 * The output is the generated source of truth for endpoint counts and
 * module/middleware inventory; tests/unit/route-topology-parity.test.ts
 * fails CI when the checked-in file (or README/api-reference counts)
 * drift from live registration.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRouteTopology } from './route-topology-lib.js';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../../docs/api-topology.json');

const topology = buildRouteTopology();
writeFileSync(outPath, JSON.stringify(topology, null, 2) + '\n');

console.log(`Wrote ${outPath}`);
console.log(
  `modules: ${topology.counts.modules_active} active + ${topology.counts.modules_planned} planned; ` +
  `endpoints: ${topology.counts.endpoints_active} active + ${topology.counts.endpoints_planned} planned = ${topology.counts.endpoints_total}; ` +
  `middleware registrations: ${topology.counts.middleware_registrations}`,
);
