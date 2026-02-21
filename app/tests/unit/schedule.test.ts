import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  parseNLToCron,
  MAX_SCHEDULES_PER_NFT,
  NL_SCHEDULE_PATTERNS,
} from '../../src/types/schedule.js';
import { ScheduleStore } from '../../src/services/schedule-store.js';
import { createScheduleRoutes } from '../../src/routes/schedule.js';
import type { FinnClient } from '../../src/proxy/finn-client.js';
import type { ConvictionResolver } from '../../src/services/conviction-resolver.js';

// --- NL Parser Tests ---

describe('parseNLToCron', () => {
  it('parses "every morning" → 0 9 * * *', () => {
    const result = parseNLToCron('every morning');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 9 * * *');
    expect(result!.humanReadable).toBe('Every day at 9:00 AM');
  });

  it('parses "every evening" → 0 18 * * *', () => {
    const result = parseNLToCron('every evening');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 18 * * *');
  });

  it('parses "every monday morning" → 0 9 * * 1', () => {
    const result = parseNLToCron('every monday morning');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 9 * * 1');
  });

  it('parses "daily at 3pm" → 0 15 * * *', () => {
    const result = parseNLToCron('daily at 3pm');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 15 * * *');
    expect(result!.humanReadable).toBe('Every day at 3PM');
  });

  it('parses "daily at 12am" → 0 0 * * *', () => {
    const result = parseNLToCron('daily at 12am');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 0 * * *');
  });

  it('parses "daily at 12pm" → 0 12 * * *', () => {
    const result = parseNLToCron('daily at 12 pm');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 12 * * *');
  });

  it('parses "every 2 hours" → 0 */2 * * *', () => {
    const result = parseNLToCron('every 2 hours');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 */2 * * *');
    expect(result!.humanReadable).toBe('Every 2 hours');
  });

  it('parses "every 1 hour" (singular)', () => {
    const result = parseNLToCron('every 1 hour');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 */1 * * *');
  });

  it('parses "every 30 minutes" → */30 * * * *', () => {
    const result = parseNLToCron('every 30 minutes');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('*/30 * * * *');
    expect(result!.humanReadable).toBe('Every 30 minutes');
  });

  it('parses "every 1 minute" (singular)', () => {
    const result = parseNLToCron('every 1 minute');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('*/1 * * * *');
  });

  it('parses "weekly on friday" → 0 9 * * 5', () => {
    const result = parseNLToCron('weekly on friday');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 9 * * 5');
    expect(result!.humanReadable).toBe('Every Friday at 9:00 AM');
  });

  it('parses "weekly on sunday" → 0 9 * * 0', () => {
    const result = parseNLToCron('weekly on sunday');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('0 9 * * 0');
  });

  it('parses "every day at 14:30" → 30 14 * * *', () => {
    const result = parseNLToCron('every day at 14:30');
    expect(result).not.toBeNull();
    expect(result!.cronExpression).toBe('30 14 * * *');
    expect(result!.humanReadable).toBe('Every day at 14:30');
  });

  it('is case-insensitive', () => {
    expect(parseNLToCron('Every Morning')).not.toBeNull();
    expect(parseNLToCron('DAILY AT 3PM')).not.toBeNull();
    expect(parseNLToCron('Weekly On Monday')).not.toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseNLToCron('  every morning  ')).not.toBeNull();
  });

  it('returns null for unparseable expressions', () => {
    expect(parseNLToCron('whenever i feel like it')).toBeNull();
    expect(parseNLToCron('')).toBeNull();
    expect(parseNLToCron('every 0 hours')).toBeNull();
    expect(parseNLToCron('every 60 minutes')).toBeNull();
    expect(parseNLToCron('every 24 hours')).toBeNull();
  });

  it('exports NL_SCHEDULE_PATTERNS array', () => {
    expect(NL_SCHEDULE_PATTERNS).toBeDefined();
    expect(NL_SCHEDULE_PATTERNS.length).toBeGreaterThan(0);
  });

  it('MAX_SCHEDULES_PER_NFT is 50', () => {
    expect(MAX_SCHEDULES_PER_NFT).toBe(50);
  });
});

// --- ScheduleStore Tests ---

describe('ScheduleStore', () => {
  let store: ScheduleStore;
  let mockFinnClient: FinnClient;

  beforeEach(() => {
    mockFinnClient = {
      request: vi.fn().mockResolvedValue({ cronId: 'finn-cron-001' }),
    } as unknown as FinnClient;
    store = new ScheduleStore(mockFinnClient);
  });

  describe('createSchedule', () => {
    it('creates a schedule from NL expression', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'Check the news',
      });

      expect(result.parsed.cronExpression).toBe('0 9 * * *');
      expect(result.parsed.humanReadable).toBe('Every day at 9:00 AM');
      expect(result.schedule).toBeDefined();
      expect(result.schedule!.status).toBe('active');
      expect(result.schedule!.nftId).toBe('nft-001');
      expect(result.schedule!.ownerWallet).toBe('0xWallet');
    });

    it('registers with loa-finn cron API', async () => {
      await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'Check the news',
      });

      expect(mockFinnClient.request).toHaveBeenCalledWith(
        'POST',
        '/api/cron/register',
        expect.objectContaining({
          body: expect.objectContaining({
            nftId: 'nft-001',
            cron: '0 9 * * *',
            prompt: 'Check the news',
          }),
        }),
      );
    });

    it('stays pending when finn registration fails', async () => {
      (mockFinnClient.request as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('finn unavailable'),
      );

      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'Check the news',
      });

      expect(result.schedule!.status).toBe('pending');
      expect(result.needsConfirmation).toBe(true);
    });

    it('uses custom name when provided', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'Check the news',
        name: 'Morning News Check',
      });

      expect(result.schedule!.name).toBe('Morning News Check');
    });

    it('defaults name to nlExpression', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'Check the news',
      });

      expect(result.schedule!.name).toBe('every morning');
    });

    it('throws parse_error for invalid NL', async () => {
      await expect(
        store.createSchedule('nft-001', '0xWallet', {
          nlExpression: 'whenever i feel like it',
          prompt: 'do stuff',
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          status: 400,
          body: expect.objectContaining({ error: 'parse_error' }),
        }),
      );
    });

    it('enforces MAX_SCHEDULES_PER_NFT', async () => {
      // Create MAX_SCHEDULES_PER_NFT schedules
      for (let i = 0; i < MAX_SCHEDULES_PER_NFT; i++) {
        await store.createSchedule('nft-001', '0xWallet', {
          nlExpression: 'every morning',
          prompt: `Task ${i}`,
        });
      }

      await expect(
        store.createSchedule('nft-001', '0xWallet', {
          nlExpression: 'every morning',
          prompt: 'One too many',
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          status: 400,
          body: expect.objectContaining({ error: 'limit_exceeded' }),
        }),
      );
    });
  });

  describe('cancelSchedule', () => {
    it('cancels an owned schedule', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });
      const id = result.schedule!.id;

      const cancelled = await store.cancelSchedule(id, '0xWallet');
      expect(cancelled).toBe(true);

      const schedule = store.getSchedule(id);
      expect(schedule!.status).toBe('cancelled');
    });

    it('rejects cancel from non-owner', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });

      const cancelled = await store.cancelSchedule(result.schedule!.id, '0xOther');
      expect(cancelled).toBe(false);
    });

    it('returns false for non-existent schedule', async () => {
      const cancelled = await store.cancelSchedule('sched-999', '0xWallet');
      expect(cancelled).toBe(false);
    });

    it('deregisters from finn when finnCronId exists', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });

      await store.cancelSchedule(result.schedule!.id, '0xWallet');

      expect(mockFinnClient.request).toHaveBeenCalledWith(
        'DELETE',
        expect.stringContaining('/api/cron/'),
      );
    });
  });

  describe('handleCallback', () => {
    it('records execution and increments fireCount', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });
      const id = result.schedule!.id;

      const exec = store.handleCallback(id, 'msg-001');
      expect(exec.status).toBe('success');
      expect(exec.scheduleId).toBe(id);
      expect(exec.messageId).toBe('msg-001');

      const schedule = store.getSchedule(id);
      expect(schedule!.fireCount).toBe(1);
    });

    it('auto-completes when maxFires reached', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
        maxFires: 2,
      });
      const id = result.schedule!.id;

      store.handleCallback(id);
      store.handleCallback(id);

      const schedule = store.getSchedule(id);
      expect(schedule!.status).toBe('completed');
      expect(schedule!.fireCount).toBe(2);
    });

    it('returns skipped for unknown schedule', () => {
      const exec = store.handleCallback('sched-unknown');
      expect(exec.status).toBe('skipped');
    });
  });

  describe('getSchedulesForNft', () => {
    it('returns schedules for a specific NFT', async () => {
      await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'task 1',
      });
      await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every evening',
        prompt: 'task 2',
      });
      await store.createSchedule('nft-002', '0xOther', {
        nlExpression: 'every morning',
        prompt: 'task 3',
      });

      const nft1Schedules = store.getSchedulesForNft('nft-001');
      expect(nft1Schedules).toHaveLength(2);

      const nft2Schedules = store.getSchedulesForNft('nft-002');
      expect(nft2Schedules).toHaveLength(1);
    });
  });

  describe('getExecutions', () => {
    it('returns execution history for a schedule', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });
      const id = result.schedule!.id;

      store.handleCallback(id, 'msg-1');
      store.handleCallback(id, 'msg-2');

      const execs = store.getExecutions(id);
      expect(execs).toHaveLength(2);
      expect(execs[0].messageId).toBe('msg-1');
      expect(execs[1].messageId).toBe('msg-2');
    });

    it('respects limit parameter', async () => {
      const result = await store.createSchedule('nft-001', '0xWallet', {
        nlExpression: 'every morning',
        prompt: 'test',
      });
      const id = result.schedule!.id;

      for (let i = 0; i < 5; i++) {
        store.handleCallback(id);
      }

      const execs = store.getExecutions(id, 3);
      expect(execs).toHaveLength(3);
    });
  });
});

// --- Schedule Route Tests (Bridge iter2-low-7, iter2-low-3) ---

describe('Schedule route — history ownership check (iter2-low-7)', () => {
  let scheduleStore: ScheduleStore;
  let mockFinnClient: FinnClient;
  let mockConvictionResolver: ConvictionResolver;

  beforeEach(() => {
    mockFinnClient = {
      request: vi.fn().mockResolvedValue({ cronId: 'finn-cron-001' }),
    } as unknown as FinnClient;
    scheduleStore = new ScheduleStore(mockFinnClient);
    mockConvictionResolver = {
      resolve: vi.fn().mockResolvedValue({ tier: 'builder', bgtStaked: 100, source: 'freeside' }),
    } as unknown as ConvictionResolver;
  });

  function createApp(resolveNftOwnership?: (wallet: string) => Promise<{ nftId: string } | null>) {
    const app = new Hono();
    app.route('/api/schedule', createScheduleRoutes({
      scheduleStore,
      convictionResolver: mockConvictionResolver,
      callbackSecret: 'test-secret',
      resolveNftOwnership,
    }));
    return app;
  }

  it('returns 403 when wallet does not own the NFT', async () => {
    const result = await scheduleStore.createSchedule('nft-001', '0xOwner', {
      nlExpression: 'every morning',
      prompt: 'test',
    });
    const id = result.schedule!.id;
    scheduleStore.handleCallback(id, 'msg-1');

    const app = createApp(async () => ({ nftId: 'nft-OTHER' })); // wrong NFT
    const res = await app.request(`/api/schedule/${id}/history`, {
      headers: { 'x-wallet-address': '0xStranger' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('returns 403 when resolveNftOwnership returns null', async () => {
    const result = await scheduleStore.createSchedule('nft-001', '0xOwner', {
      nlExpression: 'every morning',
      prompt: 'test',
    });
    const id = result.schedule!.id;

    const app = createApp(async () => null); // no ownership
    const res = await app.request(`/api/schedule/${id}/history`, {
      headers: { 'x-wallet-address': '0xStranger' },
    });

    expect(res.status).toBe(403);
  });

  it('returns 200 when wallet owns the NFT', async () => {
    const result = await scheduleStore.createSchedule('nft-001', '0xOwner', {
      nlExpression: 'every morning',
      prompt: 'test',
    });
    const id = result.schedule!.id;
    scheduleStore.handleCallback(id, 'msg-1');

    const app = createApp(async () => ({ nftId: 'nft-001' })); // correct NFT
    const res = await app.request(`/api/schedule/${id}/history`, {
      headers: { 'x-wallet-address': '0xOwner' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.executions).toHaveLength(1);
  });

  it('returns 404 when schedule does not exist', async () => {
    const app = createApp(async () => ({ nftId: 'nft-001' }));
    const res = await app.request('/api/schedule/nonexistent-id/history', {
      headers: { 'x-wallet-address': '0xOwner' },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
  });
});

describe('Schedule route — empty callback secret warning (iter2-low-3)', () => {
  it('warns when callbackSecret is empty', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockFinn = { request: vi.fn() } as unknown as FinnClient;
    const mockResolver = { resolve: vi.fn() } as unknown as ConvictionResolver;

    createScheduleRoutes({
      scheduleStore: new ScheduleStore(mockFinn),
      convictionResolver: mockResolver,
      callbackSecret: '',
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('callbackSecret is empty'),
    );
    spy.mockRestore();
  });

  it('does not warn when callbackSecret is set', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockFinn = { request: vi.fn() } as unknown as FinnClient;
    const mockResolver = { resolve: vi.fn() } as unknown as ConvictionResolver;

    createScheduleRoutes({
      scheduleStore: new ScheduleStore(mockFinn),
      convictionResolver: mockResolver,
      callbackSecret: 'a-real-secret',
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
