import type { FinnClient } from '../proxy/finn-client.js';
import {
  parseNLToCron,
  MAX_SCHEDULES_PER_NFT,
  type Schedule,
  type ScheduleExecution,
  type CreateScheduleRequest,
  type CreateScheduleResponse,
} from '../types/schedule.js';

/**
 * Schedule Store — NL parsing, CRUD, loa-finn cron registration.
 *
 * Parse pipeline: NL → cron expression → validate → store → register with loa-finn.
 *
 * See: SDD §4.6, §8.3 (loa-finn Cron API), PRD FR-5
 */
export class ScheduleStore {
  private readonly schedules = new Map<string, Schedule>();
  private readonly executions: ScheduleExecution[] = [];
  private nextId = 1;

  constructor(
    private readonly finnClient: FinnClient,
  ) {}

  /**
   * Parse and create a schedule from NL expression.
   * Returns confirmation response — caller must confirm before activation.
   */
  async createSchedule(
    nftId: string,
    ownerWallet: string,
    request: CreateScheduleRequest,
  ): Promise<CreateScheduleResponse> {
    // Enforce max schedules per NFT
    const existing = this.getSchedulesForNft(nftId);
    if (existing.length >= MAX_SCHEDULES_PER_NFT) {
      throw {
        status: 400,
        body: { error: 'limit_exceeded', message: `Maximum ${MAX_SCHEDULES_PER_NFT} active schedules per NFT` },
      };
    }

    // Parse NL to cron
    const parsed = parseNLToCron(request.nlExpression);
    if (!parsed) {
      throw {
        status: 400,
        body: { error: 'parse_error', message: `Could not parse schedule expression: "${request.nlExpression}"` },
      };
    }

    // Compute next fire time (simplified — in production, use cron-parser)
    const nextFireAt = new Date(Date.now() + 60_000).toISOString();

    // Create schedule
    const id = `sched-${this.nextId++}`;
    const schedule: Schedule = {
      id,
      nftId,
      ownerWallet,
      name: request.name ?? request.nlExpression,
      cronExpression: parsed.cronExpression,
      humanReadable: parsed.humanReadable,
      status: 'pending',
      prompt: request.prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextFireAt,
      fireCount: 0,
      maxFires: request.maxFires,
    };

    this.schedules.set(id, schedule);

    // Register with loa-finn cron API
    try {
      const registration = await this.finnClient.request<{ cronId: string }>(
        'POST',
        '/api/cron/register',
        {
          body: {
            scheduleId: id,
            nftId,
            cron: parsed.cronExpression,
            callbackUrl: `/api/schedule/callback`,
            prompt: request.prompt,
          },
        },
      );

      // Update with finn cron ID
      const activated: Schedule = {
        ...schedule,
        status: 'active',
        finnCronId: registration.cronId,
        updatedAt: new Date().toISOString(),
      };
      this.schedules.set(id, activated);

      return {
        parsed: { cronExpression: parsed.cronExpression, humanReadable: parsed.humanReadable, nextFireAt },
        schedule: activated,
        needsConfirmation: false,
      };
    } catch {
      // Registration failed — keep as pending
      return {
        parsed: { cronExpression: parsed.cronExpression, humanReadable: parsed.humanReadable, nextFireAt },
        schedule,
        needsConfirmation: true,
      };
    }
  }

  /**
   * Cancel a schedule.
   */
  async cancelSchedule(scheduleId: string, wallet: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;
    if (schedule.ownerWallet !== wallet) return false;

    const cancelled: Schedule = {
      ...schedule,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    this.schedules.set(scheduleId, cancelled);

    // Deregister from loa-finn
    if (schedule.finnCronId) {
      await this.finnClient.request(
        'DELETE',
        `/api/cron/${encodeURIComponent(schedule.finnCronId)}`,
      ).catch(() => {});
    }

    return true;
  }

  /**
   * Handle callback from loa-finn when a schedule fires.
   */
  handleCallback(scheduleId: string, messageId?: string): ScheduleExecution {
    const schedule = this.schedules.get(scheduleId);
    const execution: ScheduleExecution = {
      scheduleId,
      firedAt: new Date().toISOString(),
      status: schedule ? 'success' : 'skipped',
      messageId,
    };

    this.executions.push(execution);

    if (schedule) {
      const updated: Schedule = {
        ...schedule,
        lastFiredAt: execution.firedAt,
        fireCount: schedule.fireCount + 1,
        updatedAt: new Date().toISOString(),
        // Auto-complete if max fires reached
        status: schedule.maxFires && schedule.fireCount + 1 >= schedule.maxFires
          ? 'completed'
          : schedule.status,
      };
      this.schedules.set(scheduleId, updated);
    }

    return execution;
  }

  /**
   * Get all schedules for an NFT.
   */
  getSchedulesForNft(nftId: string): Schedule[] {
    return [...this.schedules.values()].filter((s) => s.nftId === nftId);
  }

  /**
   * Get execution history for a schedule.
   */
  getExecutions(scheduleId: string, limit = 50): ScheduleExecution[] {
    return this.executions
      .filter((e) => e.scheduleId === scheduleId)
      .slice(-limit);
  }

  /**
   * Get a schedule by ID.
   */
  getSchedule(scheduleId: string): Schedule | null {
    return this.schedules.get(scheduleId) ?? null;
  }
}
