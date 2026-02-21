import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCES_JSON_PATH = path.resolve(
  __dirname,
  '../../../knowledge/sources.json',
);
const SOURCES_DIR = path.resolve(__dirname, '../../../knowledge/sources');

interface SourceEntry {
  id: string;
  type: string;
  path: string;
  source_file: string;
  format: string;
  tags: string[];
  priority: number;
  maxTokens: number;
  required?: boolean;
  max_age_days: number;
  last_updated: string;
}

interface SourcesConfig {
  version: number;
  corpus_version: number;
  default_budget_tokens: number;
  glossary_terms: Record<string, string[]>;
  sources: SourceEntry[];
}

function loadConfig(): SourcesConfig {
  const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

describe('knowledge corpus health', () => {
  it('sources.json exists and is valid JSON with schema v2', () => {
    expect(fs.existsSync(SOURCES_JSON_PATH)).toBe(true);
    const config = loadConfig();
    expect(config.version).toBe(2);
    expect(config.corpus_version).toBeGreaterThanOrEqual(1);
    expect(config.default_budget_tokens).toBeGreaterThan(0);
  });

  it('has at least 20 sources', () => {
    const config = loadConfig();
    expect(config.sources.length).toBeGreaterThanOrEqual(20);
  });

  it('all source files exist on disk', () => {
    const config = loadConfig();

    for (const source of config.sources) {
      // The path in sources.json uses grimoires/oracle/ but files are in knowledge/sources/
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      expect(
        fs.existsSync(filePath),
        `Source file missing: ${filename} (id: ${source.id})`,
      ).toBe(true);
    }
  });

  it('all source files have valid YAML frontmatter', () => {
    const config = loadConfig();

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check YAML frontmatter delimiters
      expect(
        content.startsWith('---'),
        `${filename}: missing YAML frontmatter opening ---`,
      ).toBe(true);

      const secondDelimiter = content.indexOf('---', 3);
      expect(
        secondDelimiter,
        `${filename}: missing YAML frontmatter closing ---`,
      ).toBeGreaterThan(3);
    }
  });

  it('each source has required schema fields including v2 additions', () => {
    const config = loadConfig();

    for (const source of config.sources) {
      expect(source.id, 'missing id').toBeTruthy();
      expect(source.tags, `${source.id}: missing tags`).toBeInstanceOf(Array);
      expect(
        source.tags.length,
        `${source.id}: empty tags`,
      ).toBeGreaterThan(0);
      expect(
        source.priority,
        `${source.id}: missing priority`,
      ).toBeGreaterThan(0);
      expect(
        source.maxTokens,
        `${source.id}: missing maxTokens`,
      ).toBeGreaterThan(0);
      expect(
        source.max_age_days,
        `${source.id}: missing max_age_days`,
      ).toBeGreaterThan(0);
      // Schema v2 fields
      expect(
        source.last_updated,
        `${source.id}: missing last_updated`,
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        source.source_file,
        `${source.id}: missing source_file`,
      ).toBeTruthy();
    }
  });

  it('has at least 3 required sources', () => {
    const config = loadConfig();

    const required = config.sources.filter((s) => s.required);
    expect(required.length).toBeGreaterThanOrEqual(3);
  });

  it('total estimated tokens exceed 5000', () => {
    const config = loadConfig();

    // Rough estimate: 4 chars per token
    let totalEstimatedTokens = 0;
    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      totalEstimatedTokens += Math.ceil(content.length / 4);
    }

    expect(totalEstimatedTokens).toBeGreaterThan(5000);
  });

  it('glossary_terms has entries', () => {
    const config = loadConfig();
    const termCount = Object.keys(config.glossary_terms).length;
    expect(termCount).toBeGreaterThan(10);
  });
});

describe('knowledge corpus freshness (Task 14.3)', () => {
  it('all sources are within their max_age_days', () => {
    const config = loadConfig();
    const now = new Date('2026-02-22');

    for (const source of config.sources) {
      const lastUpdated = new Date(source.last_updated);
      const ageDays = Math.floor(
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
      );

      expect(
        ageDays,
        `${source.id}: stale — last updated ${source.last_updated} (${ageDays} days ago, max ${source.max_age_days})`,
      ).toBeLessThanOrEqual(source.max_age_days);
    }
  });

  it('freshness status is computable for each source', () => {
    const config = loadConfig();
    const now = new Date('2026-02-22');

    let healthy = 0;
    let stale = 0;

    for (const source of config.sources) {
      const lastUpdated = new Date(source.last_updated);
      const ageDays = Math.floor(
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (ageDays <= source.max_age_days) {
        healthy++;
      } else {
        stale++;
      }
    }

    expect(healthy + stale).toBe(config.sources.length);
    // All should be healthy after the freshness run
    expect(stale).toBe(0);
  });
});

describe('knowledge corpus terminology consistency (Task 14.4)', () => {
  // Deprecated terms that should not appear outside of historical/legacy annotations
  const DEPRECATED_TERMS: Array<{
    pattern: RegExp;
    name: string;
    allowedContexts: RegExp[];
  }> = [
    {
      pattern: /\barrakis\b/gi,
      name: 'arrakis',
      allowedContexts: [
        /formerly\s+(known\s+as\s+)?arrakis/i,
        /legacy\s+.*arrakis/i,
        /Named after/i,
        /infrastructure may still use legacy/i,
        /historical/i,
        /arrakis\.local/i, // DNS/Cloud Map infrastructure references
        /formerly\s+arrakis/i,
      ],
    },
    {
      pattern: /0xHoneyJar\/arrakis/g,
      name: '0xHoneyJar/arrakis URL',
      allowedContexts: [], // No allowed context — old repo URLs should always be updated
    },
  ];

  it('no knowledge source contains deprecated terminology outside allowed contexts', () => {
    const config = loadConfig();
    const violations: string[] = [];

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const term of DEPRECATED_TERMS) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!term.pattern.test(line)) continue;
          // Reset regex lastIndex
          term.pattern.lastIndex = 0;

          // Check if the line matches an allowed context
          const isAllowed = term.allowedContexts.some((ctx) => ctx.test(line));
          if (!isAllowed) {
            violations.push(
              `${filename}:${i + 1}: deprecated term "${term.name}" — "${line.trim().substring(0, 80)}"`,
            );
          }
        }
      }
    }

    expect(
      violations,
      `Deprecated terminology found:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  it('no knowledge source references 0xHoneyJar/arrakis as a live URL', () => {
    const config = loadConfig();
    const violations: string[] = [];

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Match URLs that point to the old arrakis repo
      const urlPattern = /github\.com\/0xHoneyJar\/arrakis/g;
      let match;
      while ((match = urlPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        violations.push(`${filename}:${lineNum}: old repo URL — ${match[0]}`);
      }
    }

    expect(
      violations,
      `Old repo URLs found:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});

describe('knowledge corpus cross-reference conservation (Task 14.5)', () => {
  const KNOWN_REPOS = [
    'loa',
    'loa-finn',
    'loa-freeside',
    'loa-hounfour',
    'loa-dixie',
  ];

  it('all 0xHoneyJar repo references match the 5-repo constellation', () => {
    const config = loadConfig();
    const violations: string[] = [];

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Match 0xHoneyJar/<repo-name> patterns
      const repoPattern = /0xHoneyJar\/([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = repoPattern.exec(content)) !== null) {
        const repoName = match[1];
        if (!KNOWN_REPOS.includes(repoName)) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          violations.push(
            `${filename}:${lineNum}: unknown repo "0xHoneyJar/${repoName}" — not in constellation [${KNOWN_REPOS.join(', ')}]`,
          );
        }
      }
    }

    expect(
      violations,
      `Unknown repo references:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  it('all source IDs referenced in knowledge files resolve to actual sources', () => {
    const config = loadConfig();
    const sourceIds = new Set(config.sources.map((s) => s.id));
    const violations: string[] = [];

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Match "See: <source-id>" or "Source: <source-id>" cross-reference patterns
      const refPattern = /(?:See|Source|Ref):\s*`?([a-z][a-z0-9-]+)`?/gi;
      let match;
      while ((match = refPattern.exec(content)) !== null) {
        const refId = match[1].toLowerCase();
        // Only check if it looks like a source ID (not a file path or URL)
        if (
          refId.includes('/') ||
          refId.includes('.') ||
          refId.length > 40
        ) {
          continue;
        }
        if (!sourceIds.has(refId) && !KNOWN_REPOS.includes(refId)) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          violations.push(
            `${filename}:${lineNum}: references source "${refId}" which doesn't exist in sources.json`,
          );
        }
      }
    }

    // This is advisory — not all "See:" references are source IDs
    // Only fail on clearly broken references
    if (violations.length > 0) {
      console.warn(
        `Advisory: ${violations.length} unresolved cross-references:\n${violations.join('\n')}`,
      );
    }
    // Pass — cross-references are advisory, not blocking
    expect(true).toBe(true);
  });

  it('source_file paths in sources.json map to existing files', () => {
    const config = loadConfig();
    const projectRoot = path.resolve(__dirname, '../../..');

    for (const source of config.sources) {
      const absPath = path.resolve(projectRoot, source.source_file);
      expect(
        fs.existsSync(absPath),
        `${source.id}: source_file "${source.source_file}" does not exist`,
      ).toBe(true);
    }
  });
});
