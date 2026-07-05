#!/usr/bin/env node
//
// Dependency provenance check — full-SHA pins for github: refs.
//
// Covers BOTH manifests release/audit consumers read:
//   1. package.json dependencies/devDependencies (github:owner/repo#ref)
//   2. package-lock.json — every dependency spec string AND every
//      git `resolved` URL (git+ssh://...#ref / git+https://...#ref)
//
// Runs standalone with zero dependencies so CI can execute it BEFORE
// `npm ci` — a malicious/moved GitHub ref must be rejected before any
// install-time code can run.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const failures = [];
const githubDependencyPattern = /^github:[^#]+#(.+)$/;
const gitResolvedPattern = /^git\+(?:ssh|https?):\/\/[^#]+#(.+)$/;
const fullShaPattern = /^[0-9a-f]{40}$/;

function checkSpec(source, name, spec) {
  if (typeof spec !== 'string') return;
  const match = spec.match(githubDependencyPattern);
  if (!match) return;
  const ref = match[1];
  if (!fullShaPattern.test(ref)) {
    failures.push(`${source}: ${name} uses GitHub ref ${ref}; expected a full 40-character commit SHA.`);
  }
}

// 1. package.json
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
for (const [name, spec] of Object.entries({
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
})) {
  checkSpec('package.json', name, spec);
}

// 2. package-lock.json — the installed graph, which release/audit consumers
// also read; a package-only check can pass while the lockfile still carries
// a short ref.
const lockPath = resolve(process.cwd(), 'package-lock.json');
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));

  for (const [pkgPath, entry] of Object.entries(lock.packages ?? {})) {
    if (!entry || typeof entry !== 'object') continue;
    // Dependency spec strings (root stanza + nested)
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, spec] of Object.entries(entry[field] ?? {})) {
        checkSpec(`package-lock.json ${pkgPath || '(root)'}`, name, spec);
      }
    }
    // Git resolved URLs must pin a full SHA
    if (typeof entry.resolved === 'string') {
      const match = entry.resolved.match(gitResolvedPattern);
      if (match && !fullShaPattern.test(match[1])) {
        failures.push(
          `package-lock.json ${pkgPath || '(root)'}: resolved ${entry.resolved} does not pin a full 40-character commit SHA.`,
        );
      }
    }
  }
} else {
  failures.push('package-lock.json not found — the provenance check requires the lockfile.');
}

if (failures.length > 0) {
  console.error('Dependency provenance check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Dependency provenance check passed (package.json + package-lock.json).');
