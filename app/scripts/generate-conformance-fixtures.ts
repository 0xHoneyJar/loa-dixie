#!/usr/bin/env npx tsx
/**
 * Conformance Fixture Auto-Generation from Hounfour — Sprint 7, Task 7.2
 *
 * Introspects hounfour's exported validators and generates minimal valid
 * samples using TypeBox's Value.Create(). When hounfour adds new schemas,
 * re-running this script auto-generates new samples.
 *
 * Some schemas with `format` or `pattern` constraints lack default values
 * in their TypeBox definition, which causes Value.Create() to fail. These
 * are logged as "skipped" with the reason, and must be manually populated
 * or have defaults added upstream.
 *
 * Usage:
 *   cd app && npx tsx scripts/generate-conformance-fixtures.ts
 *
 * Output:
 *   app/tests/fixtures/hounfour-generated-samples.json
 *
 * See: grimoires/loa/context/adr-hounfour-alignment.md (Level 5)
 * @since Sprint 7 — Level 5 Foundation
 */

import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validators } from '@0xhoneyjar/loa-hounfour';

// TypeBox Value is a nested dependency of hounfour — resolve it from there.
// We resolve from hounfour's package directory (not its main entry) to find
// the correct typebox version that matches hounfour's compiled schemas.
const require = createRequire(import.meta.url);
const typeboxValuePath = require.resolve('@sinclair/typebox/value', {
  paths: [join(process.cwd(), 'node_modules', '@0xhoneyjar', 'loa-hounfour')],
});

// Dynamic import since it's ESM
const { Value } = await import(typeboxValuePath);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'tests', 'fixtures', 'hounfour-generated-samples.json');

interface SampleEntry {
  schema: string;
  valid: boolean;
  sample: unknown;
  skipped?: boolean;
  skip_reason?: string;
}

interface GenerationResult {
  generated_at: string;
  hounfour_version: string;
  total_schemas: number;
  generated_count: number;
  skipped_count: number;
  samples: SampleEntry[];
}

async function main() {
  const validatorKeys = Object.keys(validators) as Array<keyof typeof validators>;
  const samples: SampleEntry[] = [];
  let generatedCount = 0;
  let skippedCount = 0;

  console.log(`Found ${validatorKeys.length} hounfour validator schemas`);
  console.log('Generating minimal valid samples...\n');

  for (const key of validatorKeys) {
    const validatorFn = validators[key];
    if (typeof validatorFn !== 'function') {
      console.log(`  SKIP  ${key} — not a function`);
      skippedCount++;
      samples.push({
        schema: key,
        valid: false,
        sample: null,
        skipped: true,
        skip_reason: 'not a function',
      });
      continue;
    }

    try {
      const compiled = validatorFn();
      const schema = (compiled as { schema?: unknown }).schema;

      if (!schema) {
        console.log(`  SKIP  ${key} — no schema property on compiled validator`);
        skippedCount++;
        samples.push({
          schema: key,
          valid: false,
          sample: null,
          skipped: true,
          skip_reason: 'no schema property',
        });
        continue;
      }

      // Attempt to generate a minimal valid sample
      const sample = Value.Create(schema);

      // Verify the generated sample passes validation
      const isValid = compiled.Check(sample);

      if (isValid) {
        console.log(`  OK    ${key}`);
        generatedCount++;
        samples.push({ schema: key, valid: true, sample });
      } else {
        // Sample was generated but doesn't pass validation
        // (e.g., cross-field validators require specific combinations)
        const errors = [...compiled.Errors(sample)].map(
          (e: { path: string; message: string }) => `${e.path}: ${e.message}`,
        );
        console.log(`  WARN  ${key} — generated but invalid: ${errors[0]}`);
        skippedCount++;
        samples.push({
          schema: key,
          valid: false,
          sample,
          skipped: true,
          skip_reason: `generated but invalid: ${errors.join('; ')}`,
        });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`  SKIP  ${key} — ${reason}`);
      skippedCount++;
      samples.push({
        schema: key,
        valid: false,
        sample: null,
        skipped: true,
        skip_reason: reason,
      });
    }
  }

  // Read hounfour version
  let hounfourVersion = 'unknown';
  try {
    const pkgPath = require.resolve('@0xhoneyjar/loa-hounfour/package.json', {
      paths: [process.cwd()],
    });
    const pkg = require(pkgPath);
    hounfourVersion = pkg.version ?? 'unknown';
  } catch {
    // Fall back to reading from symlink
    hounfourVersion = 'linked';
  }

  const result: GenerationResult = {
    generated_at: new Date().toISOString(),
    hounfour_version: hounfourVersion,
    total_schemas: validatorKeys.length,
    generated_count: generatedCount,
    skipped_count: skippedCount,
    samples,
  };

  // Ensure output directory exists
  mkdirSync(dirname(outputPath), { recursive: true });

  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');

  console.log(`\nResults:`);
  console.log(`  Generated: ${generatedCount}/${validatorKeys.length}`);
  console.log(`  Skipped:   ${skippedCount}/${validatorKeys.length}`);
  console.log(`  Output:    ${outputPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
