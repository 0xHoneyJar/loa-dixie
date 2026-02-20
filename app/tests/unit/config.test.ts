import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it('throws when FINN_URL is missing', () => {
    delete process.env.FINN_URL;
    expect(() => loadConfig()).toThrow('FINN_URL is required');
  });

  it('loads with defaults when FINN_URL is set', () => {
    process.env.FINN_URL = 'http://localhost:4000';
    const config = loadConfig();

    expect(config.finnUrl).toBe('http://localhost:4000');
    expect(config.finnWsUrl).toBe('ws://localhost:4000');
    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('test'); // vitest sets NODE_ENV=test
    expect(config.logLevel).toBe('info');
    expect(config.rateLimitRpm).toBe(100);
    expect(config.otelEndpoint).toBeNull();
  });

  it('respects custom port', () => {
    process.env.FINN_URL = 'http://finn:4000';
    process.env.DIXIE_PORT = '8080';
    const config = loadConfig();
    expect(config.port).toBe(8080);
  });

  it('splits CORS origins by comma', () => {
    process.env.FINN_URL = 'http://finn:4000';
    process.env.DIXIE_CORS_ORIGINS = 'http://a.com, http://b.com';
    const config = loadConfig();
    expect(config.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
  });

  it('derives WS URL from FINN_URL when FINN_WS_URL not set', () => {
    process.env.FINN_URL = 'https://finn.example.com';
    const config = loadConfig();
    expect(config.finnWsUrl).toBe('wss://finn.example.com');
  });
});
