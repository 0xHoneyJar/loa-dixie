/**
 * copy-migrations.mjs — Build asset packaging for SQL migrations.
 *
 * `tsc` compiles only `.ts` sources and does not copy `.sql` assets. The
 * migration runner (`src/db/migrate.ts`) resolves its migrations directory
 * relative to the compiled file via `import.meta.url`, so at runtime
 * `dist/db/migrate.js` scans `dist/db/migrations/`. Without this step that
 * directory is absent and the app crashes on start with:
 *   ENOENT: no such file or directory, scandir '/app/dist/db/migrations'
 *
 * This script mirrors `src/db/migrations/*.sql` into `dist/db/migrations/`
 * after `tsc`, preserving the migrator's existing discovery semantics
 * (including its `_down` filtering at runtime). It fails closed if the
 * source migrations directory is missing.
 *
 * Run after `tsc` via the package `build` script.
 */
import { readdir, mkdir, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', 'src', 'db', 'migrations');
const DEST_DIR = resolve(__dirname, '..', 'dist', 'db', 'migrations');

async function main() {
  // Fail closed: the source migrations directory must exist.
  try {
    await access(SRC_DIR);
  } catch {
    throw new Error(
      `copy-migrations: source migrations directory not found: ${SRC_DIR}`,
    );
  }

  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  // Copy only SQL migration assets — the only files the migrator reads.
  const sqlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name);

  if (sqlFiles.length === 0) {
    throw new Error(
      `copy-migrations: no .sql migration files found in ${SRC_DIR}`,
    );
  }

  await mkdir(DEST_DIR, { recursive: true });

  for (const name of sqlFiles) {
    await copyFile(join(SRC_DIR, name), join(DEST_DIR, name));
  }

  console.log(
    `copy-migrations: copied ${sqlFiles.length} migration file(s) to ${DEST_DIR}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
