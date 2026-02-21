/**
 * Knowledge Corpus Contract Tests
 *
 * Bilateral contract pattern (Pact-style):
 * - Producer contracts: what the corpus promises to any consumer
 * - Consumer contracts: what the Oracle runtime specifically needs
 *
 * Structural tests remain in knowledge-health.test.ts.
 *
 * See: Sprint 16.5 (horizon2-reframe-1), deep-review build-next-1
 */
import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SOURCES_JSON_PATH = path.resolve(
  __dirname,
  '../../../knowledge/sources.json',
);
const SOURCES_DIR = path.resolve(__dirname, '../../../knowledge/sources');
const EVENTS_PATH = path.resolve(
  __dirname,
  '../../../knowledge/corpus-events.json',
);

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

interface CorpusEvent {
  seq: number;
  type: string;
  timestamp: string;
  detail: string;
  author: string;
  files_affected: number;
  corpus_version_after: number;
}

function loadConfig(): SourcesConfig {
  const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
  return JSON.parse(raw);
}

function loadEvents(): CorpusEvent[] {
  try {
    const raw = fs.readFileSync(EVENTS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { events: CorpusEvent[] };
    return parsed.events;
  } catch {
    return [];
  }
}

// Contract report accumulator
const contractResults: Array<{
  type: 'producer' | 'consumer';
  name: string;
  status: 'PASS' | 'FAIL';
}> = [];

function recordContract(
  type: 'producer' | 'consumer',
  name: string,
  passed: boolean,
) {
  contractResults.push({ type, name, status: passed ? 'PASS' : 'FAIL' });
}

afterAll(() => {
  // Contract report output
  console.log('\n═══ Knowledge Corpus Contract Report ═══');

  const producers = contractResults.filter((r) => r.type === 'producer');
  const consumers = contractResults.filter((r) => r.type === 'consumer');

  console.log(`\nProducer Contracts (${producers.length}):`);
  for (const c of producers) {
    console.log(`  ${c.status === 'PASS' ? '✓' : '✗'} ${c.name}`);
  }

  console.log(`\nConsumer Contracts (${consumers.length}):`);
  for (const c of consumers) {
    console.log(`  ${c.status === 'PASS' ? '✓' : '✗'} ${c.name}`);
  }

  const total = contractResults.length;
  const passing = contractResults.filter((r) => r.status === 'PASS').length;
  console.log(`\nTotal: ${passing}/${total} contracts passing`);
  console.log('═══════════════════════════════════════\n');
});

// ─── Producer Contracts: what the corpus promises ───

describe('producer contracts — corpus freshness', () => {
  it('all sources are within their max_age_days', () => {
    const config = loadConfig();
    const now = new Date('2026-02-22');
    let passed = true;

    for (const source of config.sources) {
      const lastUpdated = new Date(source.last_updated);
      const ageDays = Math.floor(
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (ageDays > source.max_age_days) {
        passed = false;
      }

      expect(
        ageDays,
        `${source.id}: stale — last updated ${source.last_updated} (${ageDays} days ago, max ${source.max_age_days})`,
      ).toBeLessThanOrEqual(source.max_age_days);
    }

    recordContract('producer', 'freshness: all sources within max_age_days', passed);
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

    const passed = healthy + stale === config.sources.length && stale === 0;
    expect(healthy + stale).toBe(config.sources.length);
    expect(stale).toBe(0);

    recordContract('producer', 'freshness: status computable (0 stale)', passed);
  });
});

describe('producer contracts — terminology consistency', () => {
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
        /arrakis\.local/i,
        /formerly\s+arrakis/i,
      ],
    },
    {
      pattern: /0xHoneyJar\/arrakis/g,
      name: '0xHoneyJar/arrakis URL',
      allowedContexts: [],
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
          term.pattern.lastIndex = 0;

          const isAllowed = term.allowedContexts.some((ctx) => ctx.test(line));
          if (!isAllowed) {
            violations.push(
              `${filename}:${i + 1}: deprecated term "${term.name}" — "${line.trim().substring(0, 80)}"`,
            );
          }
        }
      }
    }

    const passed = violations.length === 0;
    expect(
      violations,
      `Deprecated terminology found:\n${violations.join('\n')}`,
    ).toHaveLength(0);

    recordContract('producer', 'terminology: no deprecated terms', passed);
  });

  it('no knowledge source references 0xHoneyJar/arrakis as a live URL', () => {
    const config = loadConfig();
    const violations: string[] = [];

    for (const source of config.sources) {
      const filename = path.basename(source.path);
      const filePath = path.join(SOURCES_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf-8');

      const urlPattern = /github\.com\/0xHoneyJar\/arrakis/g;
      let match;
      while ((match = urlPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split('\n').length;
        violations.push(`${filename}:${lineNum}: old repo URL — ${match[0]}`);
      }
    }

    const passed = violations.length === 0;
    expect(
      violations,
      `Old repo URLs found:\n${violations.join('\n')}`,
    ).toHaveLength(0);

    recordContract('producer', 'terminology: no old repo URLs', passed);
  });
});

describe('producer contracts — cross-reference conservation', () => {
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

    const passed = violations.length === 0;
    expect(
      violations,
      `Unknown repo references:\n${violations.join('\n')}`,
    ).toHaveLength(0);

    recordContract('producer', 'conservation: repo references valid', passed);
  });

  it('source_file paths in sources.json map to existing files', () => {
    const config = loadConfig();
    const projectRoot = path.resolve(__dirname, '../../..');
    let passed = true;

    for (const source of config.sources) {
      const absPath = path.resolve(projectRoot, source.source_file);
      const exists = fs.existsSync(absPath);
      if (!exists) passed = false;
      expect(
        exists,
        `${source.id}: source_file "${source.source_file}" does not exist`,
      ).toBe(true);
    }

    recordContract('producer', 'conservation: source_file paths resolve', passed);
  });
});

describe('producer contracts — event log integrity', () => {
  it('corpus-events.json has monotonically increasing seq numbers', () => {
    const events = loadEvents();
    let passed = events.length > 0;

    for (let i = 1; i < events.length; i++) {
      const seqOk = events[i]!.seq > events[i - 1]!.seq;
      if (!seqOk) passed = false;
      expect(
        events[i]!.seq,
        `Event seq ${events[i]!.seq} not greater than ${events[i - 1]!.seq}`,
      ).toBeGreaterThan(events[i - 1]!.seq);
    }

    recordContract('producer', 'events: monotonic seq numbers', passed);
  });

  it('all events have required schema fields', () => {
    const events = loadEvents();
    let passed = events.length > 0;

    for (const event of events) {
      const hasFields =
        typeof event.seq === 'number' &&
        typeof event.type === 'string' &&
        typeof event.timestamp === 'string' &&
        typeof event.detail === 'string' &&
        typeof event.author === 'string' &&
        typeof event.files_affected === 'number' &&
        typeof event.corpus_version_after === 'number';

      if (!hasFields) passed = false;
      expect(hasFields, `Event seq ${event.seq} missing required fields`).toBe(
        true,
      );
    }

    recordContract('producer', 'events: schema validated', passed);
  });
});

// ─── Consumer Contracts: what the Oracle runtime needs ───

describe('consumer contracts — minimum sources', () => {
  it('has at least 3 required sources', () => {
    const config = loadConfig();
    const required = config.sources.filter((s) => s.required);
    const passed = required.length >= 3;
    expect(required.length).toBeGreaterThanOrEqual(3);
    recordContract('consumer', 'min 3 required sources', passed);
  });

  it('has at least 15 total sources', () => {
    const config = loadConfig();
    const passed = config.sources.length >= 15;
    expect(config.sources.length).toBeGreaterThanOrEqual(15);
    recordContract('consumer', 'min 15 total sources', passed);
  });
});

describe('consumer contracts — code-reality coverage', () => {
  // Map repo short names to their source IDs in sources.json
  const REQUIRED_REPOS: Array<{ repo: string; sourceIds: string[] }> = [
    { repo: 'finn', sourceIds: ['code-reality-finn'] },
    { repo: 'freeside', sourceIds: ['code-reality-freeside'] },
    { repo: 'hounfour', sourceIds: ['code-reality-hounfour'] },
    { repo: 'dixie', sourceIds: ['dixie-architecture', 'code-reality-dixie'] },
  ];

  it('has code-reality files for all active repos', () => {
    const config = loadConfig();
    const missingRepos: string[] = [];

    for (const { repo, sourceIds } of REQUIRED_REPOS) {
      const hasReality = config.sources.some((s) =>
        sourceIds.includes(s.id),
      );
      if (!hasReality) {
        missingRepos.push(repo);
      }
    }

    const passed = missingRepos.length === 0;
    expect(
      missingRepos,
      `Missing code-reality for repos: ${missingRepos.join(', ')}`,
    ).toHaveLength(0);

    recordContract('consumer', 'code-reality coverage: all repos', passed);
  });
});

describe('consumer contracts — glossary completeness', () => {
  const REQUIRED_TERMS = [
    'hounfour',
    'freeside',
    'oracle',
    'beauvoir',
    'x402',
    'conviction',
    'dixie',
  ];

  it('glossary covers all protocol-critical terms', () => {
    const config = loadConfig();
    const glossaryTerms = Object.keys(config.glossary_terms).map((t) =>
      t.toLowerCase(),
    );
    const missingTerms: string[] = [];

    for (const term of REQUIRED_TERMS) {
      if (!glossaryTerms.includes(term.toLowerCase())) {
        missingTerms.push(term);
      }
    }

    const passed = missingTerms.length === 0;
    expect(
      missingTerms,
      `Missing glossary terms: ${missingTerms.join(', ')}`,
    ).toHaveLength(0);

    recordContract('consumer', 'glossary: all protocol terms present', passed);
  });

  it('glossary has at least 20 terms', () => {
    const config = loadConfig();
    const termCount = Object.keys(config.glossary_terms).length;
    const passed = termCount >= 20;
    expect(termCount).toBeGreaterThanOrEqual(20);
    recordContract('consumer', 'glossary: min 20 terms', passed);
  });
});

describe('consumer contracts — token budget', () => {
  it('default_budget_tokens is within acceptable range (30K-100K)', () => {
    const config = loadConfig();
    const passed =
      config.default_budget_tokens >= 30000 &&
      config.default_budget_tokens <= 100000;
    expect(config.default_budget_tokens).toBeGreaterThanOrEqual(30000);
    expect(config.default_budget_tokens).toBeLessThanOrEqual(100000);
    recordContract('consumer', 'token budget: within 30K-100K', passed);
  });
});
