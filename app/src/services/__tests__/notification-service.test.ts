/**
 * Notification Service Unit Tests — Multi-Channel Delivery, Backoff, Fallback
 *
 * Tests Discord/Telegram/CLI delivery, exponential backoff, INV-018
 * (record-before-delivery), shouldNotify config, and error handling.
 *
 * @since cycle-012 — Sprint 92, Task T-7.7
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotificationService,
} from '../notification-service.js';
import type {
  FleetNotificationConfig,
  NotificationPayload,
  DeliveryResult,
} from '../notification-service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPool() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [{ id: 'notif-uuid-1' }] }),
  };
}

function makeConfig(overrides: Partial<FleetNotificationConfig> = {}): FleetNotificationConfig {
  return {
    operatorId: 'op-1',
    notifyOnSpawn: true,
    notifyOnComplete: true,
    notifyOnFailure: true,
    ...overrides,
  };
}

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    taskId: 'task-1',
    operatorId: 'op-1',
    type: 'spawn',
    status: 'spawning',
    description: 'Spawning a test agent',
    agentType: 'claude_code',
    model: 'claude-opus-4-6',
    taskType: 'feature',
    branch: 'fleet/task-1',
    ...overrides,
  };
}

function createMockFetch(response?: Partial<Response>) {
  const defaultResponse = {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue('OK'),
    ...response,
  };
  return vi.fn().mockResolvedValue(defaultResponse);
}

function createService(opts: {
  pool?: ReturnType<typeof createMockPool>;
  fetch?: ReturnType<typeof createMockFetch>;
  log?: ReturnType<typeof vi.fn>;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
} = {}) {
  const pool = opts.pool ?? createMockPool();
  const mockFetch = opts.fetch ?? createMockFetch();
  const log = opts.log ?? vi.fn();

  const service = new NotificationService({
    pool: pool as unknown as import('../../db/client.js').DbPool,
    fetch: mockFetch as unknown as typeof globalThis.fetch,
    log,
    maxRetries: opts.maxRetries ?? 3,
    baseDelayMs: opts.baseDelayMs ?? 500,
    maxDelayMs: opts.maxDelayMs ?? 30_000,
  });

  return { service, pool, mockFetch, log };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  // -------------------------------------------------------------------------
  // Discord Delivery
  // -------------------------------------------------------------------------

  describe('Discord delivery', () => {
    it('sends embed with correct format (title, color, fields)', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const payload = makePayload({ type: 'spawn', taskType: 'feature' });

      await service.send(config, payload);

      expect(mockFetch).toHaveBeenCalled();

      // Find the Discord fetch call
      const discordCall = mockFetch.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('discord.com'),
      );
      expect(discordCall).toBeDefined();

      const body = JSON.parse(discordCall![1].body as string);
      expect(body.embeds).toHaveLength(1);

      const embed = body.embeds[0];
      expect(embed.title).toContain('Fleet');
      expect(embed.title).toContain('Spawned');
      expect(embed.title).toContain('feature');
      expect(embed.color).toBe(0x3498db); // blue for spawn
      expect(embed.description).toBe('Spawning a test agent');
      expect(embed.timestamp).toBeDefined();

      // Check fields
      const fieldNames = embed.fields.map((f: { name: string }) => f.name);
      expect(fieldNames).toContain('Task ID');
      expect(fieldNames).toContain('Agent');
      expect(fieldNames).toContain('Status');
      expect(fieldNames).toContain('Branch');
    });

    it('includes PR field when prNumber is present', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const payload = makePayload({ prNumber: 42 });

      await service.send(config, payload);

      const discordCall = mockFetch.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('discord.com'),
      );
      const body = JSON.parse(discordCall![1].body as string);
      const prField = body.embeds[0].fields.find((f: { name: string }) => f.name === 'PR');
      expect(prField).toBeDefined();
      expect(prField.value).toBe('#42');
    });

    it('includes Error field when error is present', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const payload = makePayload({ type: 'failure', error: 'Something went wrong' });

      await service.send(config, payload);

      const discordCall = mockFetch.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('discord.com'),
      );
      const body = JSON.parse(discordCall![1].body as string);
      const errorField = body.embeds[0].fields.find((f: { name: string }) => f.name === 'Error');
      expect(errorField).toBeDefined();
      expect(errorField.value).toBe('Something went wrong');
    });

    it('uses correct colors for each notification type', async () => {
      const types = [
        { type: 'spawn' as const, color: 0x3498db },
        { type: 'complete' as const, color: 0x2ecc71 },
        { type: 'failure' as const, color: 0xe74c3c },
        { type: 'status_change' as const, color: 0xf39c12 },
      ];

      for (const { type, color } of types) {
        const { service, mockFetch } = createService();
        const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
        const payload = makePayload({ type });

        await service.send(config, payload);

        const discordCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[0] as string).includes('discord.com'),
        );
        const body = JSON.parse(discordCall![1].body as string);
        expect(body.embeds[0].color).toBe(color);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Telegram Delivery
  // -------------------------------------------------------------------------

  describe('Telegram delivery', () => {
    it('sends message with MarkdownV2 format', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        telegramBotToken: 'bot123:abc',
        telegramChatId: '987654',
      });
      const payload = makePayload({ type: 'complete' });

      await service.send(config, payload);

      // Find the Telegram fetch call
      const telegramCall = mockFetch.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('api.telegram.org'),
      );
      expect(telegramCall).toBeDefined();

      // Verify URL contains the bot token
      expect(telegramCall![0]).toBe('https://api.telegram.org/botbot123:abc/sendMessage');

      // Verify body format
      const body = JSON.parse(telegramCall![1].body as string);
      expect(body.chat_id).toBe('987654');
      expect(body.parse_mode).toBe('MarkdownV2');
      expect(body.text).toContain('Fleet');
      expect(body.text).toContain('Completed');
    });

    it('includes task info in telegram message', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        telegramBotToken: 'bot-token',
        telegramChatId: 'chat-id',
      });
      const payload = makePayload({
        taskId: 'my-task',
        agentType: 'claude_code',
        model: 'claude-opus-4-6',
      });

      await service.send(config, payload);

      const telegramCall = mockFetch.mock.calls.find(
        (call: unknown[]) => (call[0] as string).includes('api.telegram.org'),
      );
      const body = JSON.parse(telegramCall![1].body as string);

      // The text should contain task info (MarkdownV2 escaped)
      expect(body.text).toContain('my\\-task');
    });
  });

  // -------------------------------------------------------------------------
  // CLI Output
  // -------------------------------------------------------------------------

  describe('CLI output', () => {
    it('writes to stdout with [FLEET] prefix', async () => {
      const { service } = createService();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      // Config with no webhooks - falls through to CLI only
      const config = makeConfig();
      const payload = makePayload({ type: 'spawn', taskId: 'task-42', status: 'spawning' });

      await service.send(config, payload);

      expect(writeSpy).toHaveBeenCalled();
      const output = (writeSpy.mock.calls[0][0] as string);
      expect(output).toContain('[FLEET]');
      expect(output).toContain('spawn');
      expect(output).toContain('task-42');
      expect(output).toContain('spawning');
    });

    it('CLI delivery always succeeds', async () => {
      const { service } = createService();

      const config = makeConfig(); // no webhooks
      const payload = makePayload();

      const results = await service.send(config, payload);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('cli');
      expect(results[0].success).toBe(true);
      expect(results[0].attempts).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Exponential Backoff
  // -------------------------------------------------------------------------

  describe('exponential backoff', () => {
    it('computes correct delay sequence: 500, 1000, 2000, capped at 30000', async () => {
      const delays: number[] = [];

      // Create a service that tracks sleep calls
      const { service, log } = createService({
        fetch: createMockFetch({ ok: false, status: 500 }),
        maxRetries: 3,
        baseDelayMs: 500,
        maxDelayMs: 30_000,
      });

      await service.send(
        makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' }),
        makePayload(),
      );

      // Extract delay values from log calls
      const retryCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>).event === 'notification_retry',
      );

      expect(retryCalls).toHaveLength(3); // 3 retries

      const loggedDelays = retryCalls.map(
        (call: unknown[]) => (call[1] as Record<string, unknown>).delayMs,
      );

      // Delays: 500 * 2^0 = 500, 500 * 2^1 = 1000, 500 * 2^2 = 2000
      expect(loggedDelays[0]).toBe(500);
      expect(loggedDelays[1]).toBe(1000);
      expect(loggedDelays[2]).toBe(2000);
    });

    it('caps delay at maxDelayMs', async () => {
      const { service, log } = createService({
        fetch: createMockFetch({ ok: false, status: 500 }),
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
      });

      await service.send(
        makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' }),
        makePayload(),
      );

      const retryCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>).event === 'notification_retry',
      );

      // All delays should be capped at maxDelayMs (5)
      for (const call of retryCalls) {
        const delay = (call[1] as Record<string, unknown>).delayMs as number;
        expect(delay).toBeLessThanOrEqual(5);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Fallback to CLI on Webhook Failure
  // -------------------------------------------------------------------------

  describe('fallback to CLI on webhook failure', () => {
    it('delivers via CLI when Discord webhook fails', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      const { service, log } = createService({
        fetch: createMockFetch({ ok: false, status: 500 }),
        maxRetries: 0, // No retries to speed up the test
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      // Discord result should show fallbackUsed
      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult).toBeDefined();
      expect(discordResult!.success).toBe(false);
      expect(discordResult!.fallbackUsed).toBe(true);

      // Log should show fallback
      expect(log).toHaveBeenCalledWith('warn', expect.objectContaining({
        event: 'notification_fallback_cli',
        channel: 'discord',
      }));

      // CLI write should have happened as fallback
      const cliCalls = writeSpy.mock.calls.filter(
        (call) => (call[0] as string).includes('[FLEET]'),
      );
      expect(cliCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // INV-018: Record Before Delivery
  // -------------------------------------------------------------------------

  describe('INV-018: notification record created BEFORE delivery', () => {
    it('INSERT happens before fetch for Discord', async () => {
      const callOrder: string[] = [];

      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('INSERT');
        return { rows: [{ id: 'notif-uuid-1' }] };
      });

      const mockFetch = vi.fn().mockImplementation(async () => {
        callOrder.push('FETCH');
        return { ok: true, status: 200, text: vi.fn().mockResolvedValue('OK') };
      });

      const { service } = createService({ pool, fetch: mockFetch });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload());

      // INV-018: INSERT must come before FETCH
      const insertIdx = callOrder.indexOf('INSERT');
      const fetchIdx = callOrder.indexOf('FETCH');

      expect(insertIdx).toBeGreaterThanOrEqual(0);
      expect(fetchIdx).toBeGreaterThanOrEqual(0);
      expect(insertIdx).toBeLessThan(fetchIdx);
    });

    it('INSERT happens before fetch for Telegram', async () => {
      const callOrder: string[] = [];

      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callOrder.push('INSERT');
        return { rows: [{ id: 'notif-uuid-1' }] };
      });

      const mockFetch = vi.fn().mockImplementation(async () => {
        callOrder.push('FETCH');
        return { ok: true, status: 200, text: vi.fn().mockResolvedValue('OK') };
      });

      const { service } = createService({ pool, fetch: mockFetch });

      const config = makeConfig({
        telegramBotToken: 'bot-token',
        telegramChatId: 'chat-id',
      });
      await service.send(config, makePayload());

      const insertIdx = callOrder.indexOf('INSERT');
      const fetchIdx = callOrder.indexOf('FETCH');
      expect(insertIdx).toBeLessThan(fetchIdx);
    });

    it('updates record after delivery with success result', async () => {
      const pool = createMockPool();
      const { service } = createService({ pool });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload());

      // There should be UPDATE calls after the INSERTs
      const updateCalls = pool.query.mock.calls.filter(
        (call: unknown[]) => (call[0] as string).includes('UPDATE fleet_notifications'),
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);

      // Check that the update passes success=true
      const firstUpdate = updateCalls[0];
      expect(firstUpdate[1][0]).toBe(true); // delivered = true
    });
  });

  // -------------------------------------------------------------------------
  // Notification Types
  // -------------------------------------------------------------------------

  describe('notification types', () => {
    it('handles spawn notification type', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload({ type: 'spawn' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles complete notification type', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload({ type: 'complete' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles failure notification type', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload({ type: 'failure' }));

      expect(mockFetch).toHaveBeenCalled();
    });

    it('handles status_change notification type', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      await service.send(config, makePayload({ type: 'status_change' }));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // shouldNotify Configuration
  // -------------------------------------------------------------------------

  describe('shouldNotify respects config', () => {
    it('skips spawn notification when notifyOnSpawn is false', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        notifyOnSpawn: false,
      });
      const results = await service.send(config, makePayload({ type: 'spawn' }));

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips complete notification when notifyOnComplete is false', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        notifyOnComplete: false,
      });
      const results = await service.send(config, makePayload({ type: 'complete' }));

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips failure notification when notifyOnFailure is false', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        notifyOnFailure: false,
      });
      const results = await service.send(config, makePayload({ type: 'failure' }));

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('status_change delivers when any notification flag is true', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        notifyOnSpawn: false,
        notifyOnComplete: false,
        notifyOnFailure: true, // only failure enabled
      });
      const results = await service.send(config, makePayload({ type: 'status_change' }));

      // Should deliver since notifyOnFailure is true
      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('status_change skips when all notification flags are false', async () => {
      const { service, mockFetch } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        notifyOnSpawn: false,
        notifyOnComplete: false,
        notifyOnFailure: false,
      });
      const results = await service.send(config, makePayload({ type: 'status_change' }));

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Non-retryable HTTP errors
  // -------------------------------------------------------------------------

  describe('non-retryable 4xx errors', () => {
    it('returns immediately on 400 without retry', async () => {
      const { service, mockFetch, log } = createService({
        fetch: createMockFetch({ ok: false, status: 400 }),
        maxRetries: 3,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.success).toBe(false);
      expect(discordResult!.attempts).toBe(1); // only 1 attempt, no retries
      expect(discordResult!.error).toContain('HTTP 400');

      // Verify no retry log entries
      const retryCalls = log.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>).event === 'notification_retry',
      );
      expect(retryCalls).toHaveLength(0);
    });

    it('returns immediately on 403 without retry', async () => {
      const { service, mockFetch } = createService({
        fetch: createMockFetch({ ok: false, status: 403 }),
        maxRetries: 3,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.attempts).toBe(1);
    });

    it('returns immediately on 404 without retry', async () => {
      const { service } = createService({
        fetch: createMockFetch({ ok: false, status: 404 }),
        maxRetries: 3,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.attempts).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Retryable errors
  // -------------------------------------------------------------------------

  describe('retryable 5xx and 429 errors', () => {
    it('retries on 500 server error', async () => {
      const { service, mockFetch } = createService({
        fetch: createMockFetch({ ok: false, status: 500 }),
        maxRetries: 2,
        baseDelayMs: 1, // minimal delay for test speed
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      // Should have attempted initial + retries = 3 attempts
      expect(discordResult!.attempts).toBe(3);
      expect(discordResult!.success).toBe(false);
    });

    it('retries on 429 rate limit', async () => {
      const { service, mockFetch } = createService({
        fetch: createMockFetch({ ok: false, status: 429 }),
        maxRetries: 1,
        baseDelayMs: 1,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.attempts).toBe(2); // initial + 1 retry
    });

    it('succeeds on retry after transient failure', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 503, text: vi.fn().mockResolvedValue('Service Unavailable') };
        }
        return { ok: true, status: 200, text: vi.fn().mockResolvedValue('OK') };
      });

      const { service } = createService({
        fetch: mockFetch,
        maxRetries: 3,
        baseDelayMs: 1,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.success).toBe(true);
      expect(discordResult!.attempts).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // No Webhooks — CLI Fallthrough
  // -------------------------------------------------------------------------

  describe('config with no webhooks', () => {
    it('falls through to CLI only', async () => {
      const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const { service, mockFetch } = createService();

      const config = makeConfig(); // no webhook URLs
      const results = await service.send(config, makePayload());

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('cli');
      expect(results[0].success).toBe(true);

      // No fetch calls for webhooks
      expect(mockFetch).not.toHaveBeenCalled();

      // CLI output happened
      expect(writeSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Notification Skip
  // -------------------------------------------------------------------------

  describe('notification skip when config disabled', () => {
    it('returns empty array and logs skip event', async () => {
      const { service, log, mockFetch } = createService();

      const config = makeConfig({
        notifyOnSpawn: false,
        notifyOnComplete: false,
        notifyOnFailure: false,
      });
      const results = await service.send(config, makePayload({ type: 'spawn' }));

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();

      // Should log the skip
      expect(log).toHaveBeenCalledWith('info', expect.objectContaining({
        event: 'notification_skip',
        reason: 'config_disabled',
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Channel Resolution
  // -------------------------------------------------------------------------

  describe('channel resolution', () => {
    it('includes discord and cli when discord webhook configured', async () => {
      const { service } = createService();

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const channels = results.map((r) => r.channel);
      expect(channels).toContain('discord');
      expect(channels).toContain('cli');
    });

    it('includes telegram and cli when telegram configured', async () => {
      const { service } = createService();

      const config = makeConfig({
        telegramBotToken: 'bot-token',
        telegramChatId: 'chat-id',
      });
      const results = await service.send(config, makePayload());

      const channels = results.map((r) => r.channel);
      expect(channels).toContain('telegram');
      expect(channels).toContain('cli');
    });

    it('includes all channels when both discord and telegram configured', async () => {
      const { service } = createService();

      const config = makeConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
        telegramBotToken: 'bot-token',
        telegramChatId: 'chat-id',
      });
      const results = await service.send(config, makePayload());

      const channels = results.map((r) => r.channel);
      expect(channels).toContain('discord');
      expect(channels).toContain('telegram');
      expect(channels).toContain('cli');
    });

    it('requires both bot token and chat ID for telegram', async () => {
      const { service, mockFetch } = createService();

      // Only bot token, no chat ID
      const config = makeConfig({ telegramBotToken: 'bot-token' });
      const results = await service.send(config, makePayload());

      // Should fall through to CLI only (telegram not resolved)
      const channels = results.map((r) => r.channel);
      expect(channels).not.toContain('telegram');

      // Fetch should not be called for telegram
      const telegramCalls = mockFetch.mock.calls.filter(
        (call: unknown[]) => (call[0] as string).includes('api.telegram.org'),
      );
      expect(telegramCalls).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Record Insert Error Handling
  // -------------------------------------------------------------------------

  describe('record insert error handling', () => {
    it('continues delivery even if record insert fails', async () => {
      const pool = createMockPool();
      (pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'));
      // Subsequent queries (UPDATE) can succeed
      (pool.query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [{ id: '' }] });

      const { service, mockFetch, log } = createService({ pool });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      // Delivery should still have been attempted
      expect(mockFetch).toHaveBeenCalled();

      // Error should be logged
      expect(log).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'notification_record_insert_error',
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Network Error (fetch throws)
  // -------------------------------------------------------------------------

  describe('network errors', () => {
    it('handles fetch throwing with backoff and eventual failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const { service } = createService({
        fetch: mockFetch,
        maxRetries: 1,
        baseDelayMs: 1,
      });

      const config = makeConfig({ discordWebhookUrl: 'https://discord.com/api/webhooks/test' });
      const results = await service.send(config, makePayload());

      const discordResult = results.find((r) => r.channel === 'discord');
      expect(discordResult!.success).toBe(false);
      expect(discordResult!.error).toBe('ECONNREFUSED');
      expect(discordResult!.attempts).toBe(2); // initial + 1 retry
    });
  });
});
