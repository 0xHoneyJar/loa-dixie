/**
 * Protocol version parity (issues #210, #214, #224, #227, #238, #244).
 *
 * Dixie advertises DIXIE_PROTOCOL_VERSION via X-Protocol-Version while
 * consuming the @0xhoneyjar/loa-hounfour contract package at a (possibly
 * newer) version. docs/protocol-compatibility.json is the single checked
 * source for that mapping. These tests fail whenever runtime, docs, or the
 * dependency drift from the map without an explicit, reviewed update.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIXIE_PROTOCOL_VERSION } from '../../src/services/protocol-version.js';

const appRoot = resolve(__dirname, '../..');
const repoRoot = resolve(appRoot, '..');

interface CompatibilityMap {
  advertised_protocol_version: string;
  hounfour_package_version: string;
  hounfour_dependency_ref: string;
  status: string;
  reason: string;
}

const compat: CompatibilityMap = JSON.parse(
  readFileSync(resolve(repoRoot, 'docs/protocol-compatibility.json'), 'utf8'),
);

describe('protocol compatibility map', () => {
  it('matches the runtime advertised version (single source of truth)', () => {
    expect(compat.advertised_protocol_version).toBe(DIXIE_PROTOCOL_VERSION);
  });

  it('matches the declared Hounfour dependency ref in package.json', () => {
    const pkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@0xhoneyjar/loa-hounfour']).toBe(compat.hounfour_dependency_ref);
  });

  it('pins the Hounfour dependency to a full 40-character commit SHA', () => {
    const ref = compat.hounfour_dependency_ref.split('#')[1];
    expect(ref).toMatch(/^[0-9a-f]{40}$/);
  });

  it('matches the installed Hounfour package version', () => {
    const installed = JSON.parse(
      readFileSync(
        resolve(appRoot, 'node_modules/@0xhoneyjar/loa-hounfour/package.json'),
        'utf8',
      ),
    );
    expect(installed.version).toBe(compat.hounfour_package_version);
  });

  it('explains any gap between advertised and dependency versions', () => {
    if (compat.advertised_protocol_version !== compat.hounfour_package_version) {
      expect(compat.status).toBe('intentional-lag');
      expect(compat.reason.length).toBeGreaterThan(40);
    }
  });
});

describe('documentation parity', () => {
  it('README advertises the mapped protocol version and references the map', () => {
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8');
    expect(readme).toContain(`Protocol version \`${compat.advertised_protocol_version}\``);
    expect(readme).toContain('docs/protocol-compatibility.json');
  });

  it('API reference advertises the mapped protocol version', () => {
    const apiRef = readFileSync(resolve(repoRoot, 'docs/api-reference.md'), 'utf8');
    expect(apiRef).toContain(`X-Protocol-Version: ${compat.advertised_protocol_version}`);
  });
});
