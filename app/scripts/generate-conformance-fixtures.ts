#!/usr/bin/env npx tsx
/**
 * Conformance Fixture Auto-Generation from Hounfour — Sprint 7, Task 7.2
 *
 * ## Hybrid Fixture Strategy
 *
 * This script implements a two-source fixture pipeline:
 *
 * 1. **Auto-generated** (TypeBox `Value.Create()`) — Produces minimal valid
 *    samples for schemas whose TypeBox definitions include default values
 *    for all required fields. Approximately 15 of 53 schemas auto-generate.
 *
 * 2. **Manually-crafted** (`hounfour-manual-samples.json`) — Supplements
 *    auto-generation for the ~38 schemas that `Value.Create()` cannot handle.
 *    These schemas use `format: "date-time"`, `format: "uuid"`, `format: "uri"`,
 *    or `pattern:` constraints (e.g., EIP-155 NFT IDs `^eip155:...`, SHA-256
 *    hashes `^sha256:[a-f0-9]{64}$`, semver `^\d+\.\d+\.\d+$`) where TypeBox
 *    has no default value generator.
 *
 * ## Merge Pipeline
 *
 * - Auto-generated samples are always preferred (canonical minimal shape).
 * - Manual samples only merge for schemas that auto-generation skipped.
 * - Each manual sample is validated against the current hounfour validator
 *   at merge time — invalid manual samples are logged as WARN, not merged.
 *
 * ## Adding New Manual Samples
 *
 * When hounfour adds a new schema that `Value.Create()` cannot generate:
 * 1. Run this script — new schema will appear as SKIP in output
 * 2. Check the validator type definition for required fields and valid union values:
 *    `node_modules/@0xhoneyjar/loa-hounfour/dist/validators/index.d.ts`
 * 3. Check pattern/format constraints: `npx tsx scripts/check-patterns.mjs`
 * 4. Add a sample to `tests/fixtures/hounfour-manual-samples.json`
 * 5. Re-run this script — should show OK for the new schema
 *
 * ## CI Integration
 *
 * The test `hounfour-conformance.test.ts` section "Fixture Freshness" validates:
 * - All fixture samples pass current hounfour validators (detects schema drift)
 * - Combined coverage meets minimum threshold (currently ≥35 of 53)
 * - Total schema count matches hounfour registry (detects added/removed schemas)
 *
 * Usage:
 *   cd app && npx tsx scripts/generate-conformance-fixtures.ts
 *
 * Output:
 *   app/tests/fixtures/hounfour-generated-samples.json
 *
 * See: grimoires/loa/context/adr-hounfour-alignment.md (Level 5)
 * @since Sprint 7 — Level 5 Foundation
 * @updated Sprint 8 — Conformance Excellence (25 manual samples, 74% coverage)
 */

import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
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
const manualSamplesPath = join(__dirname, '..', 'tests', 'fixtures', 'hounfour-manual-samples.json');

interface SampleEntry {
  schema: string;
  valid: boolean;
  sample: unknown;
  skipped?: boolean;
  skip_reason?: string;
}

interface ManualSampleEntry {
  schema: string;
  sample: unknown;
}

interface ManualSamplesFile {
  _comment?: string;
  samples: ManualSampleEntry[];
}

interface GenerationResult {
  generated_at: string;
  hounfour_version: string;
  total_schemas: number;
  generated_count: number;
  skipped_count: number;
  manual_count: number;
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

  // Merge manual samples for schemas that Value.Create() can't handle.
  // Manual samples supplement (not replace) auto-generated ones: if a schema
  // was already successfully generated, the auto-generated sample is kept.
  let manualCount = 0;
  if (existsSync(manualSamplesPath)) {
    try {
      const manualFile: ManualSamplesFile = JSON.parse(readFileSync(manualSamplesPath, 'utf-8'));
      const autoGeneratedSchemas = new Set(
        samples.filter(s => s.valid && !s.skipped).map(s => s.schema),
      );

      for (const manual of manualFile.samples) {
        if (autoGeneratedSchemas.has(manual.schema)) {
          console.log(`  SKIP  ${manual.schema} (manual) — already auto-generated`);
          continue;
        }

        // Validate the manual sample against the hounfour schema
        const validatorFn = (validators as Record<string, (() => { Check: (d: unknown) => boolean; Errors: (d: unknown) => Iterable<{ path: string; message: string }> }) | undefined>)[manual.schema];
        if (!validatorFn) {
          console.log(`  SKIP  ${manual.schema} (manual) — no matching hounfour validator`);
          continue;
        }

        try {
          const compiled = validatorFn();
          const isValid = compiled.Check(manual.sample);

          if (isValid) {
            console.log(`  OK    ${manual.schema} (manual)`);
            // Replace the skipped entry with the valid manual sample
            const existingIdx = samples.findIndex(s => s.schema === manual.schema);
            if (existingIdx >= 0) {
              skippedCount--;
              samples[existingIdx] = { schema: manual.schema, valid: true, sample: manual.sample };
            } else {
              samples.push({ schema: manual.schema, valid: true, sample: manual.sample });
            }
            generatedCount++;
            manualCount++;
          } else {
            const errors = [...compiled.Errors(manual.sample)].map(
              (e: { path: string; message: string }) => `${e.path}: ${e.message}`,
            );
            console.log(`  WARN  ${manual.schema} (manual) — invalid: ${errors[0]}`);
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.log(`  WARN  ${manual.schema} (manual) — validation error: ${reason}`);
        }
      }

      console.log(`\nManual samples: ${manualCount} merged from ${manualSamplesPath}`);
    } catch (err) {
      console.log(`\nWARN: Could not read manual samples: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    console.log(`\nNo manual samples file at ${manualSamplesPath}`);
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
    manual_count: manualCount,
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
