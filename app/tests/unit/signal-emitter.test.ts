import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalEmitter } from '../../src/services/signal-emitter.js';

// Mock nats module — must include actual enum exports
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
    // Real enum values from nats
    RetentionPolicy: { Limits: 'limits', Interest: 'interest', Workqueue: 'workqueue' },
    StorageType: { File: 'file', Memory: 'memory' },
    _mockNc: mockNc,
    _mockJsPublish: mockJsPublish,
    _mockStreamInfo: mockStreamInfo,
    _mockStreamAdd: mockStreamAdd,
  };
});

describe('services/signal-emitter', () => {
  let emitter: SignalEmitter;
  const log = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    emitter = new SignalEmitter({ url: 'nats://localhost:4222', log });
  });

  describe('static properties', () => {
    it('has correct stream name', () => {
      expect(SignalEmitter.STREAM_NAME).toBe('DIXIE_SIGNALS');
    });

    it('has 5 signal subjects', () => {
      expect(SignalEmitter.SUBJECTS).toHaveLength(5);
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.interaction');
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.personality');
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.schedule');
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.economic');
      expect(SignalEmitter.SUBJECTS).toContain('dixie.signal.conformance');
    });
  });

  describe('connect', () => {
    it('connects and checks for existing stream', async () => {
      await emitter.connect();

      expect(emitter.connected).toBe(true);
      expect(log).toHaveBeenCalledWith('info', expect.objectContaining({
        event: 'nats_connect',
      }));
    });

    it('creates stream when not found', async () => {
      const nats = await import('nats');
      const streamInfo = (nats as any)._mockStreamInfo;
      const streamAdd = (nats as any)._mockStreamAdd;

      streamInfo.mockRejectedValueOnce(new Error('stream not found'));
      await emitter.connect();

      expect(streamAdd).toHaveBeenCalledWith(expect.objectContaining({
        name: 'DIXIE_SIGNALS',
        subjects: ['dixie.signal.>'],
      }));
    });
  });

  describe('publish', () => {
    it('returns false when not connected', async () => {
      const result = await emitter.publish('dixie.signal.interaction', { test: true });
      expect(result).toBe(false);
    });

    it('publishes data after connection', async () => {
      await emitter.connect();

      const data = { nftId: 'test-nft', sessionId: 'sess-1' };
      const result = await emitter.publish('dixie.signal.interaction', data);
      expect(result).toBe(true);
    });

    it('returns false and logs error on publish failure', async () => {
      await emitter.connect();

      const nats = await import('nats');
      const jsPublish = (nats as any)._mockJsPublish;
      jsPublish.mockRejectedValueOnce(new Error('publish failed'));

      const result = await emitter.publish('dixie.signal.interaction', {});
      expect(result).toBe(false);
      expect(log).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'nats_publish_error',
      }));
    });
  });

  describe('healthCheck', () => {
    it('throws when not connected', async () => {
      await expect(emitter.healthCheck()).rejects.toThrow('NATS not connected');
    });

    it('returns latency when connected', async () => {
      await emitter.connect();
      const latency = await emitter.healthCheck();
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('close', () => {
    it('drains and nullifies connection', async () => {
      await emitter.connect();
      await emitter.close();
      expect(emitter.connected).toBe(false);
    });
  });
});
