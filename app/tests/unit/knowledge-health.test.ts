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
  format: string;
  tags: string[];
  priority: number;
  maxTokens: number;
  required?: boolean;
  max_age_days: number;
}

interface SourcesConfig {
  version: number;
  default_budget_tokens: number;
  glossary_terms: Record<string, string[]>;
  sources: SourceEntry[];
}

describe('knowledge corpus health', () => {
  let config: SourcesConfig;

  it('sources.json exists and is valid JSON', () => {
    expect(fs.existsSync(SOURCES_JSON_PATH)).toBe(true);
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);
    expect(config.version).toBe(1);
    expect(config.default_budget_tokens).toBeGreaterThan(0);
  });

  it('has at least 20 sources', () => {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);
    expect(config.sources.length).toBeGreaterThanOrEqual(20);
  });

  it('all source files exist on disk', () => {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);

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
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);

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

  it('each source has required schema fields', () => {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);

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
    }
  });

  it('has at least 3 required sources', () => {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);

    const required = config.sources.filter((s) => s.required);
    expect(required.length).toBeGreaterThanOrEqual(3);
  });

  it('total estimated tokens exceed 5000', () => {
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);

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
    const raw = fs.readFileSync(SOURCES_JSON_PATH, 'utf-8');
    config = JSON.parse(raw);
    const termCount = Object.keys(config.glossary_terms).length;
    expect(termCount).toBeGreaterThan(10);
  });
});
