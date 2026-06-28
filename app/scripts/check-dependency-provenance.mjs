#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const dependencies = {
  ...(pkg.dependencies ?? {}),
  ...(pkg.devDependencies ?? {}),
};

const failures = [];
const githubDependencyPattern = /^github:[^#]+#(.+)$/;
const fullShaPattern = /^[0-9a-f]{40}$/;

for (const [name, spec] of Object.entries(dependencies)) {
  if (typeof spec !== 'string') continue;
  const match = spec.match(githubDependencyPattern);
  if (!match) continue;

  const ref = match[1];
  if (!fullShaPattern.test(ref)) {
    failures.push(`${name} uses GitHub ref ${ref}; expected a full 40-character commit SHA.`);
  }
}

if (failures.length > 0) {
  console.error('Dependency provenance check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Dependency provenance check passed.');
