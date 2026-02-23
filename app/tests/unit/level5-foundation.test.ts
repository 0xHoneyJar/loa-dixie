/**
 * Level 5 Foundation Tests — Sprint 7
 *
 * Tests for:
 * - Task 7.1: Runtime conformance middleware
 * - Task 7.2: Conformance fixture auto-generation
 * - Task 7.3: Conformance violation signal pipeline
 *
 * @see grimoires/loa/context/adr-hounfour-alignment.md (Level 5)
 * @since Sprint 7 — Level 5 Foundation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createConformanceMiddleware } from '../../src/middleware/conformance-middleware.js';
import type {
  ConformanceViolationEvent,
  ConformanceSchema,
  ConformanceMiddlewareOptions,
} from '../../src/middleware/conformance-middleware.js';
import {
  createConformanceSignalCallback,
  CONFORMANCE_SIGNAL_SUBJECT,
} from '../../src/services/conformance-signal.js';
import type { ConformanceViolationSignal } from '../../src/services/conformance-signal.js';
import { SignalEmitter } from '../../src/services/signal-emitter.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Helpers ────────────────────────────────────────────────────────

/** Create a test Hono app with conformance middleware and a simple route. */
function createTestApp(opts: ConformanceMiddlewareOptions) {
  const app = new Hono();
  app.use('*', createConformanceMiddleware(opts));

  // Test route that returns JSON matching a specific schema
  app.get('/api/test/valid-policy', (c) => {
    return c.json({
      policy: {
        type: 'role_based',
        roles: ['team'],
        audit_required: true,
        revocable: false,
      },
    });
  });

  app.get('/api/test/invalid-policy', (c) => {
    return c.json({
      policy: {
        type: 'role_based',
        // Missing required 'audit_required' field
        // TypeBox will flag this as invalid
        roles: ['team'],
      },
    });
  });

  app.get('/api/test/no-policy', (c) => {
    return c.json({ message: 'no policy here' });
  });

  app.get('/api/test/text', (c) => {
    return c.text('plain text response');
  });

  return app;
}

/** Access policy schema config for tests. */
const accessPolicySchema: ConformanceSchema = {
  name: 'accessPolicy',
  extract: (body: unknown) => {
    const b = body as Record<string, unknown> | null;
    return b?.policy ?? null;
  },
};

// ─── Task 7.1: Runtime Conformance Middleware ────────────────────────

describe('middleware/conformance-middleware', () => {
  let log: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    log = vi.fn();
  });

  describe('createConformanceMiddleware', () => {
    it('passes through valid responses without logging violations', async () => {
      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [accessPolicySchema],
        onViolation: 'log',
        log,
      });

      const res = await app.request('/api/test/valid-policy');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.policy.type).toBe('role_based');

      // No violation should be logged
      const violationCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.event === 'conformance_violation',
      );
      expect(violationCalls).toHaveLength(0);
    });

    it('logs violation for invalid responses in log mode', async () => {
      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [accessPolicySchema],
        onViolation: 'log',
        log,
      });

      // Force an invalid response by using a schema that rejects anything
      const strictSchema: ConformanceSchema = {
        name: 'healthStatus',
        extract: (body: unknown) => body, // validate full body as healthStatus
      };

      const strictApp = createTestApp({
        sampleRate: 1.0,
        schemas: [strictSchema],
        onViolation: 'log',
        log,
      });

      const res = await strictApp.request('/api/test/valid-policy');
      expect(res.status).toBe(200); // Log mode doesn't change status

      // Should have logged a violation
      const violationCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.event === 'conformance_violation',
      );
      expect(violationCalls.length).toBeGreaterThan(0);
      expect(violationCalls[0][0]).toBe('error');
      expect((violationCalls[0][1] as Record<string, unknown>).schema).toBe('healthStatus');
    });

    it('replaces response with 500 in reject mode', async () => {
      // Use a schema that will fail for the test route's response
      const strictSchema: ConformanceSchema = {
        name: 'healthStatus',
        extract: (body: unknown) => body,
      };

      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [strictSchema],
        onViolation: 'reject',
        log,
      });

      const res = await app.request('/api/test/valid-policy');
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.error).toBe('conformance_violation');
      expect(body.schema).toBe('healthStatus');
    });

    it('calls onSignal callback in signal mode', async () => {
      const onSignal = vi.fn();
      const strictSchema: ConformanceSchema = {
        name: 'healthStatus',
        extract: (body: unknown) => body,
      };

      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [strictSchema],
        onViolation: 'signal',
        log,
        onSignal,
      });

      await app.request('/api/test/valid-policy');

      expect(onSignal).toHaveBeenCalledTimes(1);
      const violation: ConformanceViolationEvent = onSignal.mock.calls[0][0];
      expect(violation.event).toBe('conformance_violation');
      expect(violation.schema).toBe('healthStatus');
      expect(violation.endpoint).toBe('/api/test/valid-policy');
      expect(violation.sample_rate).toBe(1.0);
      expect(violation.timestamp).toBeDefined();
    });

    it('skips extraction when extract returns null', async () => {
      const nullSchema: ConformanceSchema = {
        name: 'accessPolicy',
        extract: () => null, // Always returns null
      };

      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [nullSchema],
        onViolation: 'log',
        log,
      });

      const res = await app.request('/api/test/valid-policy');
      expect(res.status).toBe(200);

      // No violation should be logged
      const violationCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.event === 'conformance_violation',
      );
      expect(violationCalls).toHaveLength(0);
    });

    it('skips non-JSON responses', async () => {
      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [accessPolicySchema],
        onViolation: 'log',
        log,
      });

      const res = await app.request('/api/test/text');
      expect(res.status).toBe(200);

      // No violation calls at all
      expect(log).not.toHaveBeenCalledWith('error', expect.anything());
    });

    it('respects sampleRate 0 (no validation)', async () => {
      const strictSchema: ConformanceSchema = {
        name: 'healthStatus',
        extract: (body: unknown) => body,
      };

      const app = createTestApp({
        sampleRate: 0,
        schemas: [strictSchema],
        onViolation: 'log',
        log,
      });

      // Make multiple requests — none should trigger validation
      for (let i = 0; i < 10; i++) {
        await app.request('/api/test/valid-policy');
      }

      const violationCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.event === 'conformance_violation',
      );
      expect(violationCalls).toHaveLength(0);
    });

    it('warns for unknown schema names', async () => {
      const unknownSchema: ConformanceSchema = {
        name: 'nonExistentSchema',
        extract: (body: unknown) => body,
      };

      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [unknownSchema],
        onViolation: 'log',
        log,
      });

      await app.request('/api/test/valid-policy');

      expect(log).toHaveBeenCalledWith('warn', expect.objectContaining({
        event: 'conformance_unknown_schema',
        schema: 'nonExistentSchema',
      }));
    });

    it('violation event includes required context fields', async () => {
      const onSignal = vi.fn();
      const strictSchema: ConformanceSchema = {
        name: 'healthStatus',
        extract: (body: unknown) => body,
      };

      const app = createTestApp({
        sampleRate: 1.0,
        schemas: [strictSchema],
        onViolation: 'signal',
        log,
        onSignal,
      });

      await app.request('/api/test/valid-policy');

      const violation: ConformanceViolationEvent = onSignal.mock.calls[0][0];
      expect(violation).toMatchObject({
        event: 'conformance_violation',
        schema: 'healthStatus',
        response_status: 200,
        sample_rate: 1.0,
      });
      expect(typeof violation.path).toBe('string');
      expect(typeof violation.error).toBe('string');
      expect(typeof violation.endpoint).toBe('string');
      expect(typeof violation.timestamp).toBe('string');
    });
  });
});

// ─── Task 7.2: Conformance Fixture Auto-Generation ──────────────────

describe('conformance fixture auto-generation', () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixturesPath = join(__dirname, '..', 'fixtures', 'hounfour-generated-samples.json');

  it('generated fixtures file exists', () => {
    expect(existsSync(fixturesPath)).toBe(true);
  });

  it('generated fixtures file is valid JSON', () => {
    const content = readFileSync(fixturesPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed).toBeDefined();
    expect(typeof parsed.generated_at).toBe('string');
    expect(typeof parsed.total_schemas).toBe('number');
    expect(typeof parsed.generated_count).toBe('number');
    expect(typeof parsed.skipped_count).toBe('number');
    expect(typeof parsed.manual_count).toBe('number');
    expect(Array.isArray(parsed.samples)).toBe(true);
  });

  it('generated samples have required fields', () => {
    const content = readFileSync(fixturesPath, 'utf-8');
    const parsed = JSON.parse(content);

    for (const entry of parsed.samples) {
      expect(typeof entry.schema).toBe('string');
      expect(typeof entry.valid).toBe('boolean');
      // sample can be null for skipped entries
      if (!entry.skipped) {
        expect(entry.sample).not.toBeNull();
      }
    }
  });

  it('total = generated + skipped', () => {
    const content = readFileSync(fixturesPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.generated_count + parsed.skipped_count).toBe(parsed.total_schemas);
  });

  it('at least some schemas generate valid samples', () => {
    const content = readFileSync(fixturesPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.generated_count).toBeGreaterThan(0);
  });

  it('valid samples actually pass hounfour validators', async () => {
    const { validators } = await import('@0xhoneyjar/loa-hounfour');
    const content = readFileSync(fixturesPath, 'utf-8');
    const parsed = JSON.parse(content);

    for (const entry of parsed.samples) {
      if (!entry.valid || entry.skipped) continue;

      const validatorFn = (validators as Record<string, (() => { Check: (d: unknown) => boolean }) | undefined>)[entry.schema];
      if (!validatorFn) continue;

      const compiled = validatorFn();
      const isValid = compiled.Check(entry.sample);
      expect(isValid).toBe(true);
    }
  });
});

// ─── Task 7.3: Conformance Violation Signal Pipeline ────────────────

// Mock nats module — same pattern as signal-emitter.test.ts
vi.mock('nats', () => {
  const mockJsPublish = vi.fn().mockResolvedValue({ stream: 'DIXIE_SIGNALS', seq: 1 });
  const mockJs = { publish: mockJsPublish };

  const mockStreamInfo = vi.fn().mockResolvedValue({ config: {} });
  const mockStreamAdd = vi.fn().mockResolvedValue({ config: {} });
  const mockJsm = {
    streams: { info: mockStreamInfo, add: mockStreamAdd },
  };

  const mockNc = {
    jetstream: vi.fn().mockReturnValue(mockJs),
    jetstreamManager: vi.fn().mockResolvedValue(mockJsm),
    isClosed: vi.fn().mockReturnValue(false),
    flush: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    closed: vi.fn().mockReturnValue(new Promise(() => {})),
    _js: mockJs,
    _jsm: mockJsm,
  };

  return {
    connect: vi.fn().mockResolvedValue(mockNc),
    StringCodec: vi.fn().mockReturnValue({
      encode: vi.fn((s: string) => new TextEncoder().encode(s)),
      decode: vi.fn((b: Uint8Array) => new TextDecoder().decode(b)),
    }),
    RetentionPolicy: { Limits: 'limits', Interest: 'interest', Workqueue: 'workqueue' },
    StorageType: { File: 'file', Memory: 'memory' },
    _mockNc: mockNc,
    _mockJsPublish: mockJsPublish,
    _mockStreamInfo: mockStreamInfo,
    _mockStreamAdd: mockStreamAdd,
  };
});

describe('services/conformance-signal', () => {
  describe('CONFORMANCE_SIGNAL_SUBJECT', () => {
    it('is defined and follows naming convention', () => {
      expect(CONFORMANCE_SIGNAL_SUBJECT).toBe('dixie.signal.conformance');
    });

    it('is included in SignalEmitter SUBJECTS', () => {
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.conformance');
    });
  });

  describe('createConformanceSignalCallback', () => {
    it('returns no-op when signalEmitter is null', () => {
      const callback = createConformanceSignalCallback(null);
      expect(typeof callback).toBe('function');

      // Should not throw
      callback({
        event: 'conformance_violation',
        schema: 'test',
        path: '/',
        error: 'test error',
        endpoint: '/api/test',
        response_status: 200,
        sample_rate: 1.0,
        timestamp: new Date().toISOString(),
      });
    });

    it('publishes violation to NATS when connected', async () => {
      const emitter = new SignalEmitter({ url: 'nats://localhost:4222' });
      await emitter.connect();

      const nats = await import('nats');
      const jsPublish = (nats as unknown as { _mockJsPublish: ReturnType<typeof vi.fn> })._mockJsPublish;
      jsPublish.mockClear();

      const callback = createConformanceSignalCallback(emitter);

      const violation: ConformanceViolationEvent = {
        event: 'conformance_violation',
        schema: 'accessPolicy',
        path: '/type',
        error: '/type: Expected string',
        endpoint: '/api/chat',
        response_status: 200,
        sample_rate: 1.0,
        timestamp: '2026-02-24T12:00:00.000Z',
      };

      callback(violation);

      // Allow the async publish to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(jsPublish).toHaveBeenCalledTimes(1);
      // Verify the subject is correct
      const [subject, data] = jsPublish.mock.calls[0];
      expect(subject).toBe('dixie.signal.conformance');

      // Verify the published data contains the signal fields
      const decoded = new TextDecoder().decode(data);
      const signal: ConformanceViolationSignal = JSON.parse(decoded);
      expect(signal.signal_type).toBe('conformance_violation');
      expect(signal.schema).toBe('accessPolicy');
      expect(signal.error_path).toBe('/type');
      expect(signal.error_message).toBe('/type: Expected string');
      expect(signal.endpoint).toBe('/api/chat');
      expect(signal.response_status).toBe(200);
      expect(signal.sample_rate).toBe(1.0);
      expect(signal.timestamp).toBe('2026-02-24T12:00:00.000Z');
    });

    it('signal includes enough context for alerting', async () => {
      const emitter = new SignalEmitter({ url: 'nats://localhost:4222' });
      await emitter.connect();

      const nats = await import('nats');
      const jsPublish = (nats as unknown as { _mockJsPublish: ReturnType<typeof vi.fn> })._mockJsPublish;
      jsPublish.mockClear();

      const callback = createConformanceSignalCallback(emitter);
      callback({
        event: 'conformance_violation',
        schema: 'billingEntry',
        path: '/total_cost_micro',
        error: '/total_cost_micro: Expected string',
        endpoint: '/api/learning/process',
        response_status: 200,
        sample_rate: 0.001,
        timestamp: '2026-02-24T12:00:00.000Z',
      });

      await new Promise((r) => setTimeout(r, 10));

      const [, data] = jsPublish.mock.calls[0];
      const decoded = new TextDecoder().decode(data);
      const signal = JSON.parse(decoded);

      // All alerting-relevant fields present
      expect(signal.signal_type).toBeDefined();
      expect(signal.schema).toBeDefined();
      expect(signal.error_path).toBeDefined();
      expect(signal.error_message).toBeDefined();
      expect(signal.endpoint).toBeDefined();
      expect(signal.response_status).toBeDefined();
      expect(signal.sample_rate).toBeDefined();
      expect(signal.timestamp).toBeDefined();
    });
  });
});

// ─── Signal Subject Registration ────────────────────────────────────

describe('SignalEmitter conformance subject', () => {
  it('SUBJECTS list contains 5 subjects (including conformance)', () => {
    expect(SignalEmitter.SUBJECTS).toHaveLength(5);
  });

  it('dixie.signal.conformance is the 5th subject', () => {
    expect(SignalEmitter.SUBJECTS[4]).toBe('dixie.signal.conformance');
  });
});

// ─── Sampling Rate Behavior ─────────────────────────────────────────

describe('conformance middleware sampling', () => {
  it('sampleRate 1.0 validates every request', async () => {
    const onSignal = vi.fn();
    const strictSchema: ConformanceSchema = {
      name: 'healthStatus',
      extract: (body: unknown) => body,
    };

    const app = new Hono();
    app.use('*', createConformanceMiddleware({
      sampleRate: 1.0,
      schemas: [strictSchema],
      onViolation: 'signal',
      onSignal,
    }));
    app.get('/test', (c) => c.json({ not: 'a health status' }));

    // All 5 requests should trigger validation
    for (let i = 0; i < 5; i++) {
      await app.request('/test');
    }
    expect(onSignal).toHaveBeenCalledTimes(5);
  });

  it('sampleRate 0 never validates', async () => {
    const onSignal = vi.fn();
    const strictSchema: ConformanceSchema = {
      name: 'healthStatus',
      extract: (body: unknown) => body,
    };

    const app = new Hono();
    app.use('*', createConformanceMiddleware({
      sampleRate: 0,
      schemas: [strictSchema],
      onViolation: 'signal',
      onSignal,
    }));
    app.get('/test', (c) => c.json({ not: 'a health status' }));

    for (let i = 0; i < 20; i++) {
      await app.request('/test');
    }
    expect(onSignal).toHaveBeenCalledTimes(0);
  });
});
