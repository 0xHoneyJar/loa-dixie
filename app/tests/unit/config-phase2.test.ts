import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig — Phase 2 extensions', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
    process.env.FINN_URL = 'http://localhost:4000';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = original;
  });

  it('returns null for unconfigured infrastructure URLs', () => {
    const config = loadConfig();
    expect(config.databaseUrl).toBeNull();
    expect(config.redisUrl).toBeNull();
    expect(config.natsUrl).toBeNull();
  });

  it('reads DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dixie';
    const config = loadConfig();
    expect(config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/dixie');
  });

  it('reads REDIS_URL', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const config = loadConfig();
    expect(config.redisUrl).toBe('redis://localhost:6379');
  });

  it('reads NATS_URL', () => {
    process.env.NATS_URL = 'nats://localhost:4222';
    const config = loadConfig();
    expect(config.natsUrl).toBe('nats://localhost:4222');
  });

  it('has default TTLs', () => {
    const config = loadConfig();
    expect(config.memoryProjectionTtlSec).toBe(300);
    expect(config.convictionTierTtlSec).toBe(300);
    expect(config.personalityTtlSec).toBe(1800);
    expect(config.memoryMaxEventsPerQuery).toBe(100);
  });

  it('reads custom TTLs', () => {
    process.env.DIXIE_MEMORY_PROJECTION_TTL = '600';
    process.env.DIXIE_CONVICTION_TIER_TTL = '120';
    process.env.DIXIE_PERSONALITY_TTL = '3600';
    process.env.DIXIE_MEMORY_MAX_EVENTS = '50';
    const config = loadConfig();
    expect(config.memoryProjectionTtlSec).toBe(600);
    expect(config.convictionTierTtlSec).toBe(120);
    expect(config.personalityTtlSec).toBe(3600);
    expect(config.memoryMaxEventsPerQuery).toBe(50);
  });

  it('has default autonomous budget of 100000 micro-USD', () => {
    const config = loadConfig();
    expect(config.autonomousBudgetDefaultMicroUsd).toBe(100000);
  });

  it('reads custom autonomous budget', () => {
    process.env.DIXIE_AUTONOMOUS_BUDGET = '500000';
    const config = loadConfig();
    expect(config.autonomousBudgetDefaultMicroUsd).toBe(500000);
  });

  describe('rate limit backend', () => {
    it('defaults to memory when no Redis', () => {
      const config = loadConfig();
      expect(config.rateLimitBackend).toBe('memory');
    });

    it('auto-upgrades to redis when REDIS_URL is set', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const config = loadConfig();
      expect(config.rateLimitBackend).toBe('redis');
    });

    it('respects explicit memory override even with REDIS_URL', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.DIXIE_RATE_LIMIT_BACKEND = 'memory';
      const config = loadConfig();
      expect(config.rateLimitBackend).toBe('memory');
    });

    it('respects explicit redis override', () => {
      process.env.DIXIE_RATE_LIMIT_BACKEND = 'redis';
      const config = loadConfig();
      expect(config.rateLimitBackend).toBe('redis');
    });
  });

  it('preserves all Phase 1 defaults', () => {
    const config = loadConfig();
    expect(config.finnUrl).toBe('http://localhost:4000');
    expect(config.finnWsUrl).toBe('ws://localhost:4000');
    expect(config.port).toBe(3001);
    expect(config.rateLimitRpm).toBe(100);
    expect(config.otelEndpoint).toBeNull();
    expect(config.logLevel).toBe('info');
  });
});
