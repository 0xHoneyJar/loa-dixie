// Phase 47F — Lane-1 aw_* SQL ISOLATED dev/operator implementation spike: planner / guard module.
//
// NON-PRODUCTION, dev/operator-only, disabled-by-default, route-owned spike.
// Authorized (acceptance-gated) by Phase 47E
// (docs/ADMISSION-WEDGE-LANE1-AW-SQL-ISOLATION-AUTHORIZATION-CHECKLIST-GATE.md).
//
// WHAT THIS MODULE IS. A small, dependency-free planning + validation layer for
// an EXPERIMENTAL, isolated `aw_isolation_spike_*` family of statements that
// live ONLY as `.sql` files under this directory's `sql/` subfolder, named by an
// exact `manifest.json` allowlist. It resolves the manifest, fails closed on any
// unsafe path (traversal, absolute, outside the isolated folder, a symlink, or a
// normal production location), reconciles the on-disk `.sql` set against the
// exact allowlist (refusing any unlisted or missing file), reads the
// experimental statement text, and builds a dry-run PLAN. It can also apply that
// plan through an INJECTED sink (a fake in tests; a real dev/operator client only
// via the explicit out-of-band runner) — it never opens a connection, never
// reaches a normal runner, and contains no statement text of its own (the text
// is read at runtime from the `.sql` files).
//
// It also exposes a PURE, in-memory synthetic-write reducer that models planned
// write identity + a content fingerprint, so the dev/operator spike can define
// (and the tests can prove) identical-replay / conflict / fail-closed semantics
// WITHOUT any real persistence. The reducer never touches a real client, opens no
// connection, and is wired to NO route or startup path.
//
// WHAT THIS MODULE IS NOT. It is NOT production storage, NOT the final
// Straylight store, NOT a final schema freeze, NOT a route-contract freeze, and
// NOT an ADR-022E gate #8 discharge. It is NEVER imported by app startup, NEVER
// imported by the route gate, and NEVER wired into a package lifecycle script —
// the only caller is the explicit dev/operator runner
// (app/scripts/aw-sql-isolation-spike-runner.mjs).
//
// ISOLATION POSTURE (by construction). The experimental material lives OUTSIDE
// the single production source directory the normal forward-only runner scans
// and OUTSIDE the single source directory the production build packager copies.
// So the normal runner can neither discover nor run it, and the packager can
// neither bundle it — without any change to the normal runner or packager, and
// without any change to the canonical scope guards. This module also imports
// only `node:` built-ins, so it stays inside the existing import allowlist.
//
// AUTH / CONSENT / SIGNER (explicit non-coverage). SQL isolation here does NOT
// solve production auth, end-user authorization, signer authority, or consent
// proof / receipt. Each remains its own separately-gated future blocker.

import { readFileSync, existsSync, lstatSync, realpathSync, readdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The dev/operator opt-in env var. Strict `=== 'true'`; default off. */
export const AW_SQL_ISOLATION_SPIKE_GATE_ENV =
  'DIXIE_ADMISSION_INTAKE_AW_SQL_ISOLATION_SPIKE_ENABLED';

/** The isolated folder name (the obvious experimental marker). */
export const AW_SQL_ISOLATION_SPIKE_DIR_NAME = 'aw-sql-isolation-spike';

/** The leaf folder that holds the experimental `.sql` files. */
export const AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR = 'sql';

/** The exact allowlist file name. */
export const AW_SQL_ISOLATION_SPIKE_MANIFEST_FILE = 'manifest.json';

/** The exact `spike` literal the manifest MUST carry (no coercion, exact match). */
export const AW_SQL_ISOLATION_SPIKE_EXPECTED_SPIKE = 'phase-47f-aw-sql-isolation-spike';

/** The exact `kind` literal the manifest MUST carry (no coercion, exact match). */
export const AW_SQL_ISOLATION_SPIKE_EXPECTED_KIND = 'experimental-dev-operator-only';

/** The EXACT set of allowed manifest top-level keys. Any other key fails closed. */
export const AW_SQL_ISOLATION_SPIKE_MANIFEST_KEYS = Object.freeze([
  'spike',
  'kind',
  'production',
  'schemaFinal',
  'note',
  'forward',
  'cleanup',
] as const);

/** The cleanup/down filename suffix. A forward entry may not carry it; a cleanup
 *  entry must. Mirrors the production runner's `_down` exclusion semantics. */
export const AW_SQL_ISOLATION_SPIKE_DOWN_SUFFIX = '_down.sql';

/** Plan direction — forward DDL, or the reversible cleanup / drop path. */
export type IsolationSpikeDirection = 'forward' | 'cleanup';

/** The exact manifest shape. `production` and `schemaFinal` MUST be false. */
export interface IsolationSpikeManifest {
  spike: string;
  kind: string;
  production: boolean;
  schemaFinal: boolean;
  note?: string;
  forward: string[];
  cleanup: string[];
}

/** A single resolved, contained, read step of a plan. */
export interface IsolationSpikeStep {
  /** The manifest-relative path, verbatim. */
  relPath: string;
  /** The resolved real absolute path (proven inside the isolated `sql/` folder). */
  absolutePath: string;
  /** The verbatim experimental statement text, read from the `.sql` file. */
  statementsText: string;
}

/** A dry-run plan: an ordered, validated list of steps for one direction. */
export interface IsolationSpikePlan {
  spikeRoot: string;
  direction: IsolationSpikeDirection;
  steps: IsolationSpikeStep[];
}

/** Inputs to the dev/operator gate (explicit, so the gate is testable). */
export interface IsolationSpikeGateInput {
  /** The raw value of the opt-in env var (or undefined when unset). */
  enabledFlag: string | undefined;
  /** The raw value of NODE_ENV (or undefined when unset). */
  nodeEnv: string | undefined;
}

/** An injected sink the runner uses to apply a plan. Deliberately NOT named
 *  with any normal-runner / client verb — the spike never reaches one. */
export interface IsolationSpikeStatementSink {
  begin(): void | Promise<void>;
  applyStatement(statementsText: string): void | Promise<void>;
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

/** Result of applying a plan through an injected sink. */
export interface IsolationSpikeApplyResult {
  direction: IsolationSpikeDirection;
  appliedCount: number;
  appliedRelPaths: string[];
}

export class IsolationSpikeDisabledError extends Error {
  constructor() {
    super(
      `Phase 47F aw_* SQL isolation spike is disabled by default. Set ${AW_SQL_ISOLATION_SPIKE_GATE_ENV}=true (dev/operator only, non-production) to opt in.`,
    );
    this.name = 'IsolationSpikeDisabledError';
  }
}

export class IsolationSpikeProductionRefusedError extends Error {
  constructor(observedNodeEnv: string) {
    super(
      `Phase 47F aw_* SQL isolation spike refuses to run in a production environment (NODE_ENV=${observedNodeEnv}). It is dev/operator-only and non-production.`,
    );
    this.name = 'IsolationSpikeProductionRefusedError';
  }
}

export class IsolationSpikeManifestError extends Error {
  constructor(reason: string) {
    super(`Phase 47F aw_* SQL isolation spike manifest is invalid: ${reason}`);
    this.name = 'IsolationSpikeManifestError';
  }
}

export class IsolationSpikePathEscapeError extends Error {
  constructor(relPath: string, reason: string) {
    super(
      `Phase 47F aw_* SQL isolation spike rejected path "${relPath}": ${reason}`,
    );
    this.name = 'IsolationSpikePathEscapeError';
  }
}

export class IsolationSpikeApplyError extends Error {
  constructor(reason: string) {
    super(`Phase 47F aw_* SQL isolation spike apply failed (rolled back): ${reason}`);
    this.name = 'IsolationSpikeApplyError';
  }
}

/** Thrown when a synthetic write carries non-opaque / unbounded / malformed
 *  reference material — the spike persists ONLY short bounded opaque references,
 *  never raw payload, source material, or raw reasons. */
export class IsolationSpikeSyntheticInputError extends Error {
  constructor(reason: string) {
    super(`Phase 47F aw_* SQL isolation spike rejected synthetic write input: ${reason}`);
    this.name = 'IsolationSpikeSyntheticInputError';
  }
}

/** Thrown when a replay reuses an identity with DIFFERENT material — fail-closed,
 *  nothing recorded, so no partially-admitted recallable artifact survives. */
export class IsolationSpikeReplayConflictError extends Error {
  /** The scope+identity key whose material changed. */
  readonly identityKey: string;
  constructor(identityKey: string) {
    super(
      `Phase 47F aw_* SQL isolation spike refused a replay conflict: the same identity was re-presented with different material (fail-closed; nothing recorded).`,
    );
    this.name = 'IsolationSpikeReplayConflictError';
    this.identityKey = identityKey;
  }
}

/** Resolve this module's own directory — the spike root. */
export function defaultSpikeRoot(): string {
  return dirname(fileURLToPath(import.meta.url));
}

/** The absolute path of the isolated `sql/` folder under a spike root. */
export function isolatedSqlDir(spikeRoot: string): string {
  return resolve(spikeRoot, AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR);
}

/** True when the opt-in flag is exactly the literal `true`. Fail-closed. */
export function isDevOperatorGateOpen(input: IsolationSpikeGateInput): boolean {
  return input.enabledFlag === 'true' && !isProductionEnv(input.nodeEnv);
}

/** True when NODE_ENV indicates a production environment. */
export function isProductionEnv(nodeEnv: string | undefined): boolean {
  return (nodeEnv ?? '').trim().toLowerCase() === 'production';
}

/**
 * Fail closed unless the dev/operator opt-in is exactly `true` AND the
 * environment is not production. Throws a typed error otherwise — never a
 * silent skip, never a production fallback.
 */
export function assertDevOperatorGateOpen(input: IsolationSpikeGateInput): void {
  if (isProductionEnv(input.nodeEnv)) {
    throw new IsolationSpikeProductionRefusedError((input.nodeEnv ?? '').trim());
  }
  if (input.enabledFlag !== 'true') {
    throw new IsolationSpikeDisabledError();
  }
}

/**
 * Validate one manifest-relative path and return its proven-contained absolute
 * path — LEXICAL containment only (no disk access). Fails closed for: a
 * non-string / empty entry; an absolute path; any `..` (parent) or `.` segment;
 * a backslash separator; a non-`.sql` suffix; an entry that is not EXACTLY a
 * single file directly under the isolated `sql/` folder; or a path that does not
 * resolve strictly inside that folder. The disk-level guards (symlink rejection
 * + realpath containment) are layered on top by `resolveRealContainedSqlFile`.
 */
export function resolveContainedSqlPath(spikeRoot: string, relPath: unknown): string {
  if (typeof relPath !== 'string' || relPath.trim().length === 0) {
    throw new IsolationSpikePathEscapeError(String(relPath), 'entry is not a non-empty string');
  }
  if (isAbsolute(relPath)) {
    throw new IsolationSpikePathEscapeError(relPath, 'absolute paths are not allowed');
  }
  if (relPath.includes('\\')) {
    throw new IsolationSpikePathEscapeError(relPath, 'backslash separators are not allowed');
  }
  const segments = relPath.split('/');
  for (const segment of segments) {
    if (segment === '..' || segment === '.' || segment.length === 0) {
      throw new IsolationSpikePathEscapeError(relPath, 'relative or empty path segments are not allowed');
    }
  }
  if (!relPath.endsWith('.sql')) {
    throw new IsolationSpikePathEscapeError(relPath, 'only .sql files are allowed');
  }
  // An entry must be EXACTLY `sql/<file>.sql` — the isolated leaf folder followed
  // by a single filename. This forbids nested subfolders (so the on-disk
  // reconciliation by basename is sound) and any sibling / normal location.
  if (segments.length !== 2 || segments[0] !== AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR) {
    throw new IsolationSpikePathEscapeError(
      relPath,
      `entries must be exactly "${AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR}/<file>.sql"`,
    );
  }
  const sqlDir = isolatedSqlDir(spikeRoot);
  const resolved = resolve(spikeRoot, relPath);
  const containmentRoot = sqlDir + sep;
  if (resolved !== sqlDir && !resolved.startsWith(containmentRoot)) {
    throw new IsolationSpikePathEscapeError(
      relPath,
      'resolved path escapes the isolated sql/ folder',
    );
  }
  return resolved;
}

/** True iff a manifest-relative path is LEXICALLY contained (does not throw). */
export function isContainedSqlPath(spikeRoot: string, relPath: unknown): boolean {
  try {
    resolveContainedSqlPath(spikeRoot, relPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Assert a realpath-resolved child stays strictly inside a realpath-resolved
 * parent — using `path.relative`, never a string-prefix check (so a sibling like
 * `sql-evil/` next to `sql/` cannot satisfy a prefix match). Both sides are
 * realpath'd by the caller, so platform symlinks in the shared prefix cancel out.
 */
function assertRealpathContained(
  parentReal: string,
  childReal: string,
  relPath: string,
  label: string,
): void {
  const rel = relative(parentReal, childReal);
  if (rel.length === 0 || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    throw new IsolationSpikePathEscapeError(
      relPath,
      `realpath of ${label} escapes the isolated spike folder`,
    );
  }
}

/**
 * Disk-level path guard for a single manifested file. On top of lexical
 * containment it: confirms the file exists; rejects a symlink (via `lstat`,
 * which does NOT follow the link) so a `sql/*.sql` symlink cannot point at a
 * production file or anywhere outside the folder; rejects a non-regular file;
 * and verifies the file's REALPATH still resolves strictly inside the isolated
 * `sql/` folder's realpath. Returns the proven-contained real absolute path.
 */
export function resolveRealContainedSqlFile(spikeRoot: string, relPath: unknown): string {
  const lexical = resolveContainedSqlPath(spikeRoot, relPath);
  const rel = String(relPath);
  let lst;
  try {
    lst = lstatSync(lexical);
  } catch {
    throw new IsolationSpikeManifestError(`manifested file is missing on disk: ${rel}`);
  }
  if (lst.isSymbolicLink()) {
    throw new IsolationSpikePathEscapeError(rel, 'symlinks are not allowed');
  }
  if (!lst.isFile()) {
    throw new IsolationSpikePathEscapeError(rel, 'manifested entry is not a regular file');
  }
  const realFile = realpathSync(lexical);
  const realSqlDir = realpathSync(isolatedSqlDir(spikeRoot));
  assertRealpathContained(realSqlDir, realFile, rel, 'manifested file');
  return realFile;
}

/** The EXACT basenames a manifest lists across both directions (forward∪cleanup). */
function manifestListedBasenames(manifest: IsolationSpikeManifest): Set<string> {
  return new Set([...manifest.forward, ...manifest.cleanup].map((p) => basename(p)));
}

/**
 * Reconcile the on-disk `.sql` set against the exact manifest allowlist. Fails
 * closed if ANY present `.sql` file is not listed (no "adopt every .sql in the
 * folder" fallback) and if ANY listed file is absent. The reconciliation is by
 * basename, which is sound because every entry is exactly `sql/<file>.sql`.
 */
function reconcileSqlDirAgainstManifest(spikeRoot: string, manifest: IsolationSpikeManifest): void {
  const sqlDir = isolatedSqlDir(spikeRoot);
  if (!existsSync(sqlDir)) {
    throw new IsolationSpikeManifestError(`isolated sql/ folder not found at ${sqlDir}`);
  }
  // Reject a symlinked sql/ dir and verify its realpath stays inside the root.
  const sqlDirStat = lstatSync(sqlDir);
  if (sqlDirStat.isSymbolicLink()) {
    throw new IsolationSpikePathEscapeError(AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR, 'the sql/ folder must not be a symlink');
  }
  const realRoot = realpathSync(spikeRoot);
  const realSqlDir = realpathSync(sqlDir);
  assertRealpathContained(realRoot, realSqlDir, AW_SQL_ISOLATION_SPIKE_SQL_SUBDIR, 'sql/ folder');

  const presentSql = readdirSync(sqlDir).filter((f) => f.endsWith('.sql'));
  const listed = manifestListedBasenames(manifest);

  // (1) Fail closed on any present `.sql` that the manifest does not list.
  for (const f of presentSql) {
    if (!listed.has(f)) {
      throw new IsolationSpikeManifestError(
        `an unlisted .sql file is present in the isolated sql/ folder: ${f} (the manifest is an EXACT allowlist; unlisted files fail closed)`,
      );
    }
  }
  // (2) Fail closed on any listed file that is absent on disk.
  const present = new Set(presentSql);
  for (const f of listed) {
    if (!present.has(f)) {
      throw new IsolationSpikeManifestError(`manifested file is missing on disk: ${f}`);
    }
  }
}

/** Validate the strict manifest schema and return the normalized manifest. No
 *  coercion: every field must already be the exact expected type/literal. */
function validateManifestSchema(parsed: unknown): IsolationSpikeManifest {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new IsolationSpikeManifestError('manifest must be a JSON object');
  }
  const obj = parsed as Record<string, unknown>;

  // (a) EXACT top-level keys — reject any unknown key (no extra metadata).
  const allowed = new Set<string>(AW_SQL_ISOLATION_SPIKE_MANIFEST_KEYS);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new IsolationSpikeManifestError(`unknown top-level key "${key}" (the manifest schema is exact)`);
    }
  }

  // (b) Exact literal scalars — NO coercion. A wrong type or value fails closed.
  if (obj.spike !== AW_SQL_ISOLATION_SPIKE_EXPECTED_SPIKE) {
    throw new IsolationSpikeManifestError(
      `manifest "spike" must be exactly "${AW_SQL_ISOLATION_SPIKE_EXPECTED_SPIKE}"`,
    );
  }
  if (obj.kind !== AW_SQL_ISOLATION_SPIKE_EXPECTED_KIND) {
    throw new IsolationSpikeManifestError(
      `manifest "kind" must be exactly "${AW_SQL_ISOLATION_SPIKE_EXPECTED_KIND}"`,
    );
  }
  if (obj.production !== false) {
    throw new IsolationSpikeManifestError('manifest "production" must be exactly false');
  }
  if (obj.schemaFinal !== false) {
    throw new IsolationSpikeManifestError('manifest "schemaFinal" must be exactly false');
  }
  if ('note' in obj && typeof obj.note !== 'string') {
    throw new IsolationSpikeManifestError('manifest "note", when present, must be a string');
  }

  // (c) forward / cleanup — non-empty arrays of strings, no coercion.
  const forward = obj.forward;
  const cleanup = obj.cleanup;
  if (!Array.isArray(forward) || forward.length === 0) {
    throw new IsolationSpikeManifestError('manifest "forward" must be a non-empty array');
  }
  if (!Array.isArray(cleanup) || cleanup.length === 0) {
    throw new IsolationSpikeManifestError('manifest "cleanup" must be a non-empty array');
  }
  for (const entry of [...forward, ...cleanup]) {
    if (typeof entry !== 'string') {
      throw new IsolationSpikeManifestError('every forward/cleanup entry must be a string path');
    }
  }
  const forwardStr = forward as string[];
  const cleanupStr = cleanup as string[];

  // (d) Determinism — reject duplicate paths within a list and across lists.
  assertNoDuplicates(forwardStr, 'forward');
  assertNoDuplicates(cleanupStr, 'cleanup');
  const cleanupSet = new Set(cleanupStr);
  for (const f of forwardStr) {
    if (cleanupSet.has(f)) {
      throw new IsolationSpikeManifestError(`path "${f}" appears in BOTH forward and cleanup (lists must be disjoint)`);
    }
  }

  // (e) Role / filename consistency — a forward entry may not carry the cleanup
  //     suffix; a cleanup entry must. Mirrors the production runner's `_down`
  //     exclusion so a drop step can never land in the forward apply list.
  for (const f of forwardStr) {
    if (f.endsWith(AW_SQL_ISOLATION_SPIKE_DOWN_SUFFIX)) {
      throw new IsolationSpikeManifestError(
        `forward entry "${f}" must not be a cleanup ("${AW_SQL_ISOLATION_SPIKE_DOWN_SUFFIX}") file`,
      );
    }
  }
  for (const c of cleanupStr) {
    if (!c.endsWith(AW_SQL_ISOLATION_SPIKE_DOWN_SUFFIX)) {
      throw new IsolationSpikeManifestError(
        `cleanup entry "${c}" must be a "${AW_SQL_ISOLATION_SPIKE_DOWN_SUFFIX}" file`,
      );
    }
  }

  return {
    spike: AW_SQL_ISOLATION_SPIKE_EXPECTED_SPIKE,
    kind: AW_SQL_ISOLATION_SPIKE_EXPECTED_KIND,
    production: false,
    schemaFinal: false,
    note: typeof obj.note === 'string' ? obj.note : undefined,
    forward: forwardStr,
    cleanup: cleanupStr,
  };
}

function assertNoDuplicates(list: string[], label: string): void {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item)) {
      throw new IsolationSpikeManifestError(`duplicate ${label} entry "${item}" (entries must be unique)`);
    }
    seen.add(item);
  }
}

/** Read + parse + strictly validate the exact manifest under a spike root, then
 *  reconcile the on-disk `.sql` set and prove every listed file is a contained,
 *  non-symlink, realpath-verified regular file. Any deviation fails closed. */
export function loadIsolationSpikeManifest(spikeRoot: string): IsolationSpikeManifest {
  const manifestPath = join(spikeRoot, AW_SQL_ISOLATION_SPIKE_MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    throw new IsolationSpikeManifestError(`manifest not found at ${manifestPath}`);
  }
  // The manifest file itself must be a non-symlink whose realpath is in the root.
  if (lstatSync(manifestPath).isSymbolicLink()) {
    throw new IsolationSpikePathEscapeError(AW_SQL_ISOLATION_SPIKE_MANIFEST_FILE, 'the manifest must not be a symlink');
  }
  const realRoot = realpathSync(spikeRoot);
  const realManifest = realpathSync(manifestPath);
  assertRealpathContained(realRoot, realManifest, AW_SQL_ISOLATION_SPIKE_MANIFEST_FILE, 'manifest');

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new IsolationSpikeManifestError(
      `manifest is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const manifest = validateManifestSchema(parsed);

  // Every listed entry must be a LEXICALLY contained `.sql` path — fail closed.
  for (const entry of [...manifest.forward, ...manifest.cleanup]) {
    resolveContainedSqlPath(spikeRoot, entry);
  }

  // Reconcile the on-disk set: no unlisted file, no missing file.
  reconcileSqlDirAgainstManifest(spikeRoot, manifest);

  // Disk-level guard for every listed file: no symlink, realpath-contained.
  for (const entry of [...manifest.forward, ...manifest.cleanup]) {
    resolveRealContainedSqlFile(spikeRoot, entry);
  }

  return manifest;
}

/**
 * Build a validated dry-run plan for one direction. Every step is path-checked
 * (lexical + realpath, no symlink), proven present on disk, and its experimental
 * statement text is read verbatim from the realpath-verified file. Building a
 * plan opens no connection and applies nothing.
 */
export function buildIsolationSpikePlan(
  spikeRoot: string,
  direction: IsolationSpikeDirection,
): IsolationSpikePlan {
  const manifest = loadIsolationSpikeManifest(spikeRoot);
  const relPaths = direction === 'forward' ? manifest.forward : manifest.cleanup;
  const steps: IsolationSpikeStep[] = relPaths.map((relPath) => {
    // Re-verify the file right before reading (symlink + realpath containment)
    // so a swap between load and read still fails closed.
    const absolutePath = resolveRealContainedSqlFile(spikeRoot, relPath);
    const statementsText = readFileSync(absolutePath, 'utf8');
    return { relPath, absolutePath, statementsText };
  });
  return { spikeRoot, direction, steps };
}

/**
 * Apply a plan through an injected sink, all-or-nothing. Calls `begin()`, then
 * `applyStatement(text)` for each step in order, then `commit()`. Any throw
 * triggers `rollback()` and a wrapped fail-closed error — so a partial failure
 * never leaves a half-applied, partially-admitted footprint. The sink is
 * injected (a fake in tests; a real dev/operator client only from the explicit
 * runner). This function names no client, opens no connection, and embeds no
 * statement text.
 */
export async function applyIsolationSpikePlan(
  plan: IsolationSpikePlan,
  sink: IsolationSpikeStatementSink,
): Promise<IsolationSpikeApplyResult> {
  const appliedRelPaths: string[] = [];
  await sink.begin();
  try {
    for (const step of plan.steps) {
      await sink.applyStatement(step.statementsText);
      appliedRelPaths.push(step.relPath);
    }
    await sink.commit();
  } catch (err) {
    try {
      await sink.rollback();
    } catch {
      // A rollback fault must not mask the original failure.
    }
    throw new IsolationSpikeApplyError(err instanceof Error ? err.message : String(err));
  }
  return {
    direction: plan.direction,
    appliedCount: appliedRelPaths.length,
    appliedRelPaths,
  };
}

// ── Bounded opaque references + dev-only replay / conflict reducer ─────────────
//
// The experimental schema persists ONLY short, bounded, opaque `awref:` strings —
// never raw payload, source material, or raw reasons. The SQL DDL enforces this
// with CHECK constraints; the reducer below enforces the SAME shape in the
// in-memory dev model so the replay/conflict semantics are exercised against the
// real boundary, not an unbounded string.

/** Max length (chars) of any bounded opaque reference. Mirrors the DDL bound. */
export const SYNTHETIC_REF_MAX_LENGTH = 80;

/** The narrow opaque-reference kinds the spike recognizes. Each maps to a
 *  predictable `awref:<kind>:<short-id>` prefix. */
export const SYNTHETIC_REF_KINDS = Object.freeze([
  'tenant',
  'estate',
  'actor',
  'assertion',
  'payload',
  'receipt',
  'transition',
  'audit',
] as const);

export type SyntheticRefKind = (typeof SYNTHETIC_REF_KINDS)[number];

/** The bounded opaque-reference body: a short id of a narrow character set. The
 *  `{0,59}` bound keeps the full string well under SYNTHETIC_REF_MAX_LENGTH so a
 *  raw JSON blob, source text, or long raw reason can never fit. */
const SYNTHETIC_REF_BODY = '[A-Za-z0-9][A-Za-z0-9_-]{0,59}';

const SYNTHETIC_REF_RE_BY_KIND: Record<SyntheticRefKind, RegExp> = (() => {
  const map = {} as Record<SyntheticRefKind, RegExp>;
  for (const k of SYNTHETIC_REF_KINDS) {
    map[k] = new RegExp(`^awref:${k}:${SYNTHETIC_REF_BODY}$`);
  }
  return Object.freeze(map);
})();

/** A bounded synthetic assertion-class label (NOT a reference): lower-snake, short. */
const SYNTHETIC_CLASS_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** True iff `value` is a bounded opaque reference of the given kind. */
export function isSyntheticOpaqueRef(value: unknown, kind: SyntheticRefKind): boolean {
  return (
    typeof value === 'string' &&
    value.length <= SYNTHETIC_REF_MAX_LENGTH &&
    SYNTHETIC_REF_RE_BY_KIND[kind].test(value)
  );
}

function assertSyntheticOpaqueRef(value: unknown, kind: SyntheticRefKind, field: string): string {
  if (!isSyntheticOpaqueRef(value, kind)) {
    throw new IsolationSpikeSyntheticInputError(
      `field "${field}" must be a bounded opaque "awref:${kind}:<short-id>" reference (max ${SYNTHETIC_REF_MAX_LENGTH} chars)`,
    );
  }
  return value as string;
}

/** A synthetic, route-owned admitted-assertion write. Identity is the
 *  (tenant, estate, actor, assertion) tuple; material is the class + opaque refs.
 *  Every field is a bounded opaque reference / label — NO raw payload. */
export interface SyntheticAssertionWrite {
  tenantRef: string;
  estateRef: string;
  actorRef: string;
  assertionRef: string;
  assertionClass: string;
  candidatePayloadRef?: string | null;
  publicReceiptRef?: string | null;
}

/** The outcome of planning/recording a synthetic write. */
export type SyntheticWriteStatus = 'planned' | 'applied' | 'identical_replay' | 'conflict';

export interface SyntheticWriteResult {
  status: SyntheticWriteStatus;
  /** Scope+identity key (tenant|estate|actor|assertion). */
  identityKey: string;
  /** Stable fingerprint over the write's identity-defining + material fields. */
  fingerprint: string;
}

/** A pure, in-memory model of the synthetic admitted-assertion sink. It never
 *  touches a real client, opens no connection, and persists nothing durably. */
export interface SyntheticWriteReducer {
  /** Dry-run: returns what WOULD happen WITHOUT mutating
   *  ('planned' | 'identical_replay' | 'conflict'). */
  plan(write: SyntheticAssertionWrite): SyntheticWriteResult;
  /** Record into the in-memory model: 'applied' for new material, 'identical_replay'
   *  for an exact retry (no-op), and a THROW (fail-closed) on a conflicting replay
   *  — nothing is recorded on conflict, so no partial admit survives. */
  record(write: SyntheticAssertionWrite): SyntheticWriteResult;
  /** Record a batch atomically: a conflict mid-batch rolls back every write this
   *  batch recorded and rethrows, so a conflict never leaves a partial footprint. */
  recordBatch(writes: SyntheticAssertionWrite[]): SyntheticWriteResult[];
  /** A read-only snapshot of the recorded identity keys (for assertions/recovery). */
  recordedKeys(): string[];
}

/** Validate a write and derive its (identityKey, fingerprint). Validation
 *  rejects any non-opaque / unbounded field, so raw material cannot enter. */
function deriveSyntheticIdentity(write: SyntheticAssertionWrite): {
  identityKey: string;
  fingerprint: string;
} {
  if (write === null || typeof write !== 'object') {
    throw new IsolationSpikeSyntheticInputError('synthetic write must be an object');
  }
  const tenantRef = assertSyntheticOpaqueRef(write.tenantRef, 'tenant', 'tenantRef');
  const estateRef = assertSyntheticOpaqueRef(write.estateRef, 'estate', 'estateRef');
  const actorRef = assertSyntheticOpaqueRef(write.actorRef, 'actor', 'actorRef');
  const assertionRef = assertSyntheticOpaqueRef(write.assertionRef, 'assertion', 'assertionRef');

  if (typeof write.assertionClass !== 'string' || !SYNTHETIC_CLASS_RE.test(write.assertionClass)) {
    throw new IsolationSpikeSyntheticInputError(
      'field "assertionClass" must be a short lower-snake label (max 64 chars)',
    );
  }
  const candidatePayloadRef =
    write.candidatePayloadRef === undefined || write.candidatePayloadRef === null
      ? null
      : assertSyntheticOpaqueRef(write.candidatePayloadRef, 'payload', 'candidatePayloadRef');
  const publicReceiptRef =
    write.publicReceiptRef === undefined || write.publicReceiptRef === null
      ? null
      : assertSyntheticOpaqueRef(write.publicReceiptRef, 'receipt', 'publicReceiptRef');

  // Identity = the scope tuple that the SQL unique constraint pins.
  const identityKey = JSON.stringify([tenantRef, estateRef, actorRef, assertionRef]);
  // Fingerprint = identity + all material, so an identical retry matches and any
  // material change is a conflict. Bounded because every field is bounded above.
  const fingerprint = JSON.stringify([
    tenantRef,
    estateRef,
    actorRef,
    assertionRef,
    write.assertionClass,
    candidatePayloadRef,
    publicReceiptRef,
  ]);
  return { identityKey, fingerprint };
}

/**
 * Create a fresh, pure in-memory synthetic-write reducer that defines the
 * dev-only replay / conflict semantics for the spike. It is NOT a real sink: it
 * opens no connection, names no client, and persists nothing durably — it exists
 * so the spike can prove identical-replay vs conflict behavior in isolation.
 */
export function createSyntheticWriteReducer(): SyntheticWriteReducer {
  // identityKey -> fingerprint of the recorded material.
  const recorded = new Map<string, string>();

  function plan(write: SyntheticAssertionWrite): SyntheticWriteResult {
    const { identityKey, fingerprint } = deriveSyntheticIdentity(write);
    const prior = recorded.get(identityKey);
    if (prior === undefined) {
      return { status: 'planned', identityKey, fingerprint };
    }
    if (prior === fingerprint) {
      return { status: 'identical_replay', identityKey, fingerprint };
    }
    return { status: 'conflict', identityKey, fingerprint };
  }

  function record(write: SyntheticAssertionWrite): SyntheticWriteResult {
    const { identityKey, fingerprint } = deriveSyntheticIdentity(write);
    const prior = recorded.get(identityKey);
    if (prior === undefined) {
      recorded.set(identityKey, fingerprint);
      return { status: 'applied', identityKey, fingerprint };
    }
    if (prior === fingerprint) {
      // Idempotent retry: explicit no-op, NOT a generic duplicate failure.
      return { status: 'identical_replay', identityKey, fingerprint };
    }
    // Conflicting replay: fail closed, record nothing.
    throw new IsolationSpikeReplayConflictError(identityKey);
  }

  function recordBatch(writes: SyntheticAssertionWrite[]): SyntheticWriteResult[] {
    // Snapshot the prior state so a conflict mid-batch leaves NO partial footprint.
    const saved = new Map(recorded);
    const results: SyntheticWriteResult[] = [];
    try {
      for (const w of writes) {
        results.push(record(w));
      }
      return results;
    } catch (err) {
      recorded.clear();
      for (const [k, v] of saved) {
        recorded.set(k, v);
      }
      throw err;
    }
  }

  function recordedKeys(): string[] {
    return [...recorded.keys()];
  }

  return { plan, record, recordBatch, recordedKeys };
}
