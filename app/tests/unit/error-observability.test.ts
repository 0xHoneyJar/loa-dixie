// Sprint-organized test file. When sprint structure stabilizes, consider
// consolidating into domain-organized files (e.g., error-handling.test.ts,
// stream-enricher.test.ts) for cross-sprint coverage of the same domain.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { enrichStream } from '../../src/services/stream-enricher.js';
import type { StreamEvent } from '../../src/types/stream-events.js';
import type { SignalEmitter } from '../../src/services/signal-emitter.js';
import type { EnrichmentContext } from '../../src/services/stream-enricher.js';
import { handleRouteError } from '../../src/utils/error-handler.js';
import { BffError } from '../../src/errors.js';
import { ConvictionResolver } from '../../src/services/conviction-resolver.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';

/**
 * Error Observability Test Suite — Sprint 55 (Global)
 *
 * Verifies that fire-and-forget operations log on failure,
 * conviction resolver categorizes errors, shared error handler
 * works correctly, and stream enricher handles incomplete sequences.
 */

function mockSignalEmitter(publishFn?: (...args: unknown[]) => Promise<boolean>) {
  return {
    publish: publishFn ?? vi.fn().mockResolvedValue(true),
  } as unknown as SignalEmitter;
}

function baseContext(overrides?: Partial<EnrichmentContext>): EnrichmentContext {
  return {
    sessionId: 'sess-001',
    wallet: '0xabc',
    nftId: 'nft-123',
    model: 'claude-sonnet-4-6',
    pool: 'default',
    ...overrides,
  };
}

describe('Task 1.1: Fire-and-forget error logging', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('stream enricher logs [signal-loss] when NATS publish fails', () => {
    const rejectingPublish = vi.fn().mockRejectedValue(new Error('NATS timeout'));
    const emitter = mockSignalEmitter(rejectingPublish);

    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'usage', prompt_tokens: 100, completion_tokens: 50 },
      { type: 'done', messageId: 'msg-1' },
    ];

    enrichStream(events, baseContext(), emitter);

    // The publish is async fire-and-forget — give it a tick
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          '[signal-loss]',
          expect.objectContaining({ event: 'stream_interaction' }),
        );
        resolve();
      }, 10);
    });
  });

  it('stream enricher logs include error string on failure', () => {
    const rejectingPublish = vi.fn().mockRejectedValue(new Error('connection lost'));
    const emitter = mockSignalEmitter(rejectingPublish);

    const events: StreamEvent[] = [
      { type: 'chunk', content: 'x' },
      { type: 'usage', prompt_tokens: 10, completion_tokens: 5 },
      { type: 'done', messageId: 'msg-2' },
    ];

    enrichStream(events, baseContext(), emitter);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          '[signal-loss]',
          expect.objectContaining({ error: expect.stringContaining('connection lost') }),
        );
        resolve();
      }, 10);
    });
  });
});

describe('Task 1.2: Conviction resolver error categorization', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function createResolver(requestFn: FinnClient['request']): ConvictionResolver {
    const mockFinnClient = { request: requestFn } as unknown as FinnClient;
    return new ConvictionResolver(mockFinnClient, null, null);
  }

  it('returns null silently on 404 (wallet not found)', async () => {
    const resolver = createResolver((() => {
      throw new BffError(404, { error: 'not_found', message: 'Wallet not found' });
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');

    // Should fall through to default since freeside returned null
    expect(result.source).toBe('default');
    // 404 should NOT log a warning
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs auth_failure on 401', async () => {
    const resolver = createResolver((() => {
      throw new BffError(401, { error: 'unauthorized', message: 'Bad credentials' });
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');
    expect(result.source).toBe('default');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ status: 401, error: 'auth_failure' }),
    );
  });

  it('logs auth_failure on 403', async () => {
    const resolver = createResolver((() => {
      throw new BffError(403, { error: 'forbidden', message: 'Access denied' });
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');
    expect(result.source).toBe('default');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ status: 403, error: 'auth_failure' }),
    );
  });

  it('logs transient_failure on 503', async () => {
    const resolver = createResolver((() => {
      throw new BffError(503, { error: 'service_unavailable', message: 'Freeside down' });
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');
    expect(result.source).toBe('default');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ status: 503, error: 'transient_failure' }),
    );
  });

  it('logs transient_failure on 500', async () => {
    const resolver = createResolver((() => {
      throw new BffError(500, { error: 'internal_error', message: 'Server error' });
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');
    expect(result.source).toBe('default');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ status: 500, error: 'transient_failure' }),
    );
  });

  it('logs generic error for non-BffError exceptions', async () => {
    const resolver = createResolver((() => {
      throw new Error('Network timeout');
    }) as FinnClient['request']);

    const result = await resolver.resolve('0x1234567890abcdef');
    expect(result.source).toBe('default');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ error: expect.stringContaining('Network timeout') }),
    );
  });

  it('truncates wallet address in log messages', async () => {
    const resolver = createResolver((() => {
      throw new BffError(503, { error: 'unavailable', message: 'Down' });
    }) as FinnClient['request']);

    await resolver.resolve('0x1234567890abcdef1234567890abcdef12345678');
    expect(warnSpy).toHaveBeenCalledWith(
      '[conviction-resolver]',
      expect.objectContaining({ wallet: '0x12345678' }),
    );
  });
});

describe('Task 1.3: Shared error handler', () => {
  function mockContext() {
    const jsonCalls: Array<{ data: unknown; status: number }> = [];
    return {
      c: {
        json: (data: unknown, status: number) => {
          jsonCalls.push({ data, status });
          return { data, status };
        },
      },
      jsonCalls,
    };
  }

  it('handles BffError with correct status and body', () => {
    const { c, jsonCalls } = mockContext();
    const err = new BffError(429, { error: 'rate_limited', message: 'Too many requests' });

    handleRouteError(c, err);

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(429);
    expect(jsonCalls[0].data).toEqual({ error: 'rate_limited', message: 'Too many requests' });
  });

  it('handles legacy plain object errors with { status, body }', () => {
    const { c, jsonCalls } = mockContext();
    const err = { status: 502, body: { error: 'bad_gateway', message: 'Upstream error' } };

    handleRouteError(c, err);

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(502);
    expect(jsonCalls[0].data).toEqual({ error: 'bad_gateway', message: 'Upstream error' });
  });

  it('returns 500 with fallback message for unknown errors', () => {
    const { c, jsonCalls } = mockContext();

    handleRouteError(c, new Error('something broke'), 'Agent query failed');

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(500);
    expect(jsonCalls[0].data).toEqual({ error: 'internal_error', message: 'Agent query failed' });
  });

  it('returns 500 for null/undefined errors', () => {
    const { c, jsonCalls } = mockContext();

    handleRouteError(c, null);

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(500);
  });

  it('returns 500 for string errors', () => {
    const { c, jsonCalls } = mockContext();

    handleRouteError(c, 'string error');

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(500);
  });

  it('validates status code range on legacy errors', () => {
    const { c, jsonCalls } = mockContext();
    const err = { status: 99999, body: { error: 'bad', message: 'invalid' } };

    handleRouteError(c, err);

    expect(jsonCalls).toHaveLength(1);
    expect(jsonCalls[0].status).toBe(500);
  });

  it('uses default fallback message when none provided', () => {
    const { c, jsonCalls } = mockContext();

    handleRouteError(c, new TypeError('cannot read'));

    expect(jsonCalls[0].data).toEqual({ error: 'internal_error', message: 'Internal server error' });
  });
});

describe('Task 1.4: Stream enricher incomplete sequence handling', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits economic event with incomplete flag when usage is missing', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);

    const economic = result.find((e) => e.type === 'economic') as Record<string, unknown> | undefined;
    expect(economic).toBeDefined();
    expect(economic?.cost_micro_usd).toBe(0);
    expect(economic?.incomplete).toBe(true);
    expect(economic?.model).toBe('claude-sonnet-4-6');
  });

  it('logs warning when emitting incomplete economic event', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    enrichStream(events, baseContext(), null);

    expect(warnSpy).toHaveBeenCalledWith(
      '[stream-enricher] incomplete economic event — usage data missing',
    );
  });

  it('emits zero tokens in incomplete economic event', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);
    const economic = result.find((e) => e.type === 'economic') as Record<string, unknown> | undefined;

    expect(economic?.tokens).toEqual({
      prompt: 0,
      completion: 0,
      memory_context: 0,
      knowledge: 0,
      total: 0,
    });
  });

  it('still emits normal economic event when usage IS present', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'usage', prompt_tokens: 100, completion_tokens: 50 },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, baseContext(), null);
    const economic = result.find((e) => e.type === 'economic') as Record<string, unknown> | undefined;

    expect(economic).toBeDefined();
    expect(economic?.cost_micro_usd).toBeGreaterThan(0);
    expect(economic?.incomplete).toBeUndefined();
  });

  it('does not emit any economic event when there is no done event', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
    ];

    const result = enrichStream(events, baseContext(), null);
    const economic = result.find((e) => e.type === 'economic');
    expect(economic).toBeUndefined();
  });

  it('uses unknown model when context.model is unset', () => {
    const events: StreamEvent[] = [
      { type: 'chunk', content: 'Hello' },
      { type: 'done', messageId: 'msg-1' },
    ];

    const result = enrichStream(events, { sessionId: 'sess-001' }, null);
    const economic = result.find((e) => e.type === 'economic') as Record<string, unknown> | undefined;

    expect(economic?.model).toBe('unknown');
    expect(economic?.incomplete).toBe(true);
  });
});
