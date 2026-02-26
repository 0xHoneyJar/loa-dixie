/**
 * Fleet Notification Service — Multi-Channel Delivery with Backoff + Fallback
 *
 * Delivers notifications to Discord (webhook), Telegram (bot API), and CLI (stdout).
 * Parallel delivery to all configured channels. Exponential backoff on transient
 * failures with automatic fallback to CLI when webhook delivery fails.
 *
 * INV-018: Notification record is inserted BEFORE delivery attempt to guarantee
 * auditability even on crash-during-delivery.
 *
 * See: SDD §7.1 (Notification Architecture), §7.2 (Delivery Pipeline)
 * @since cycle-012 — Sprint 92, Tasks T-7.1 through T-7.8
 */
import type { DbPool } from '../db/client.js';
import type { FleetTaskStatus, AgentType, TaskType } from '../types/fleet.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Channel-specific delivery outcome. */
export interface DeliveryResult {
  readonly channel: 'discord' | 'telegram' | 'cli';
  readonly success: boolean;
  readonly attempts: number;
  readonly error?: string;
  readonly fallbackUsed?: boolean;
}

/** Operator notification preferences (mirrors fleet_config columns). */
export interface FleetNotificationConfig {
  readonly operatorId: string;
  readonly discordWebhookUrl?: string;
  readonly telegramBotToken?: string;
  readonly telegramChatId?: string;
  readonly notifyOnSpawn: boolean;
  readonly notifyOnComplete: boolean;
  readonly notifyOnFailure: boolean;
}

/** Notification payload — what is being communicated. */
export interface NotificationPayload {
  readonly taskId: string;
  readonly operatorId: string;
  readonly type: 'spawn' | 'complete' | 'failure' | 'status_change';
  readonly status: FleetTaskStatus;
  readonly description: string;
  readonly agentType: AgentType;
  readonly model: string;
  readonly taskType: TaskType;
  readonly branch: string;
  readonly prNumber?: number;
  readonly error?: string;
  readonly retryCount?: number;
}

/** Options for the notification service constructor. */
export interface NotificationServiceOptions {
  readonly pool: DbPool;
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
  /** Injectable fetch for testing. Defaults to global fetch. */
  readonly fetch?: typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;

/** Discord embed color by notification type. */
const DISCORD_COLORS: Record<NotificationPayload['type'], number> = {
  spawn: 0x3498db,         // blue
  complete: 0x2ecc71,      // green
  failure: 0xe74c3c,       // red
  status_change: 0xf39c12, // orange
};

/** Human-readable label by notification type. */
const TYPE_LABELS: Record<NotificationPayload['type'], string> = {
  spawn: 'Spawned',
  complete: 'Completed',
  failure: 'Failed',
  status_change: 'Status Changed',
};

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------

export class NotificationService {
  private readonly pool: DbPool;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly log: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
  private readonly _fetch: typeof globalThis.fetch;

  constructor(opts: NotificationServiceOptions) {
    this.pool = opts.pool;
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.log = opts.log ?? (() => {});
    this._fetch = opts.fetch ?? globalThis.fetch;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Send a notification to all configured channels in parallel.
   *
   * INV-018: Inserts notification records BEFORE delivery. Each channel gets
   * its own record so partial delivery is tracked per-channel.
   *
   * @returns Array of delivery results, one per attempted channel.
   */
  async send(
    config: FleetNotificationConfig,
    payload: NotificationPayload,
  ): Promise<DeliveryResult[]> {
    // Determine which channels to deliver to
    const shouldNotify = this.shouldNotify(config, payload.type);
    if (!shouldNotify) {
      this.log('info', {
        event: 'notification_skip',
        taskId: payload.taskId,
        type: payload.type,
        reason: 'config_disabled',
      });
      return [];
    }

    const channels = this.resolveChannels(config);
    if (channels.length === 0) {
      // No webhooks configured — fall through to CLI only
      const cliResult = await this.deliverCli(payload);
      return [cliResult];
    }

    // INV-018: Insert notification records BEFORE delivery
    const recordIds = await this.insertRecords(payload.taskId, channels, payload);

    // Deliver to all channels in parallel
    const deliveryPromises = channels.map(async (channel, idx) => {
      const recordId = recordIds[idx];
      let result: DeliveryResult;

      switch (channel) {
        case 'discord':
          result = await this.deliverDiscord(config, payload);
          break;
        case 'telegram':
          result = await this.deliverTelegram(config, payload);
          break;
        case 'cli':
          result = await this.deliverCli(payload);
          break;
      }

      // If webhook failed, fallback to CLI
      if (!result.success && channel !== 'cli') {
        this.log('warn', {
          event: 'notification_fallback_cli',
          channel,
          taskId: payload.taskId,
          error: result.error,
        });
        const cliResult = await this.deliverCli(payload);
        result = {
          ...result,
          fallbackUsed: true,
        };
        // Still mark as the original channel for tracking
        void cliResult; // CLI fallback is best-effort side effect
      }

      // Update the notification record with delivery outcome
      await this.updateRecord(recordId, result);

      return result;
    });

    return Promise.all(deliveryPromises);
  }

  // -----------------------------------------------------------------------
  // Channel Delivery
  // -----------------------------------------------------------------------

  /**
   * Deliver via Discord webhook with embed formatting.
   */
  private async deliverDiscord(
    config: FleetNotificationConfig,
    payload: NotificationPayload,
  ): Promise<DeliveryResult> {
    if (!config.discordWebhookUrl) {
      return { channel: 'discord', success: false, attempts: 0, error: 'No webhook URL' };
    }

    const embed = {
      title: `Fleet ${TYPE_LABELS[payload.type]}: ${payload.taskType}`,
      description: payload.description,
      color: DISCORD_COLORS[payload.type],
      fields: [
        { name: 'Task ID', value: payload.taskId, inline: true },
        { name: 'Agent', value: `${payload.agentType} / ${payload.model}`, inline: true },
        { name: 'Status', value: payload.status, inline: true },
        { name: 'Branch', value: payload.branch, inline: true },
        ...(payload.prNumber ? [{ name: 'PR', value: `#${payload.prNumber}`, inline: true }] : []),
        ...(payload.error ? [{ name: 'Error', value: payload.error.slice(0, 200) }] : []),
      ],
      timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify({ embeds: [embed] });

    return this.deliverWithRetry('discord', config.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  /**
   * Deliver via Telegram Bot API with MarkdownV2 formatting.
   */
  private async deliverTelegram(
    config: FleetNotificationConfig,
    payload: NotificationPayload,
  ): Promise<DeliveryResult> {
    if (!config.telegramBotToken || !config.telegramChatId) {
      return { channel: 'telegram', success: false, attempts: 0, error: 'Missing bot token or chat ID' };
    }

    const text = this.formatTelegramMessage(payload);
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    const body = JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      parse_mode: 'MarkdownV2',
    });

    return this.deliverWithRetry('telegram', url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  /**
   * Deliver to CLI via structured stdout log.
   * Always succeeds (best-effort logging).
   */
  private async deliverCli(payload: NotificationPayload): Promise<DeliveryResult> {
    const line = `[FLEET] ${payload.type} | ${payload.taskId} | ${payload.status} | ${payload.description}`;
    process.stdout.write(line + '\n');

    this.log('info', {
      event: 'notification_cli',
      taskId: payload.taskId,
      type: payload.type,
      status: payload.status,
    });

    return { channel: 'cli', success: true, attempts: 1 };
  }

  // -----------------------------------------------------------------------
  // Retry with Exponential Backoff
  // -----------------------------------------------------------------------

  /**
   * Deliver an HTTP request with exponential backoff.
   *
   * Formula: delay = min(baseDelay * 2^attempt, maxDelay)
   * Cap: 30s default to prevent unbounded waits.
   */
  private async deliverWithRetry(
    channel: 'discord' | 'telegram',
    url: string,
    init: RequestInit,
  ): Promise<DeliveryResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this._fetch(url, init);

        if (response.ok) {
          this.log('info', {
            event: 'notification_delivered',
            channel,
            attempts: attempt + 1,
          });
          return { channel, success: true, attempts: attempt + 1 };
        }

        // Non-retryable HTTP errors (4xx except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const body = await response.text().catch(() => 'unknown');
          lastError = `HTTP ${response.status}: ${body.slice(0, 200)}`;
          this.log('error', {
            event: 'notification_http_error',
            channel,
            status: response.status,
            error: lastError,
          });
          return { channel, success: false, attempts: attempt + 1, error: lastError };
        }

        // Retryable: 5xx or 429 — compute backoff
        lastError = `HTTP ${response.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      // Backoff before retry (skip on last attempt)
      if (attempt < this.maxRetries) {
        const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt), this.maxDelayMs);
        this.log('warn', {
          event: 'notification_retry',
          channel,
          attempt: attempt + 1,
          delayMs: delay,
          error: lastError,
        });
        await this.sleep(delay);
      }
    }

    this.log('error', {
      event: 'notification_exhausted',
      channel,
      maxRetries: this.maxRetries,
      error: lastError,
    });

    return {
      channel,
      success: false,
      attempts: this.maxRetries + 1,
      error: lastError,
    };
  }

  // -----------------------------------------------------------------------
  // Database Operations (INV-018)
  // -----------------------------------------------------------------------

  /**
   * INV-018: Insert notification records BEFORE delivery.
   * Returns the array of record IDs matching the channels array.
   */
  private async insertRecords(
    taskId: string,
    channels: Array<'discord' | 'telegram' | 'cli'>,
    payload: NotificationPayload,
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const channel of channels) {
      try {
        const result = await this.pool.query<{ id: string }>(
          `INSERT INTO fleet_notifications (task_id, channel, payload)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [taskId, channel, JSON.stringify(payload)],
        );
        ids.push(result.rows[0].id);
      } catch (err) {
        // Log but don't block delivery — record insertion is best-effort
        this.log('error', {
          event: 'notification_record_insert_error',
          taskId,
          channel,
          error: err instanceof Error ? err.message : String(err),
        });
        ids.push('');
      }
    }

    return ids;
  }

  /**
   * Update a notification record after delivery attempt.
   */
  private async updateRecord(recordId: string, result: DeliveryResult): Promise<void> {
    if (!recordId) return;

    try {
      await this.pool.query(
        `UPDATE fleet_notifications
         SET delivered = $1, attempts = $2, last_error = $3,
             delivered_at = CASE WHEN $1 THEN NOW() ELSE delivered_at END
         WHERE id = $4`,
        [result.success, result.attempts, result.error ?? null, recordId],
      );
    } catch (err) {
      this.log('error', {
        event: 'notification_record_update_error',
        recordId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /** Determine if this notification type is enabled for the operator. */
  private shouldNotify(
    config: FleetNotificationConfig,
    type: NotificationPayload['type'],
  ): boolean {
    switch (type) {
      case 'spawn':
        return config.notifyOnSpawn;
      case 'complete':
        return config.notifyOnComplete;
      case 'failure':
        return config.notifyOnFailure;
      case 'status_change':
        // Status changes always deliver if any notification is enabled
        return config.notifyOnSpawn || config.notifyOnComplete || config.notifyOnFailure;
    }
  }

  /** Resolve which channels to deliver to based on config. */
  private resolveChannels(
    config: FleetNotificationConfig,
  ): Array<'discord' | 'telegram' | 'cli'> {
    const channels: Array<'discord' | 'telegram' | 'cli'> = [];
    if (config.discordWebhookUrl) channels.push('discord');
    if (config.telegramBotToken && config.telegramChatId) channels.push('telegram');
    channels.push('cli'); // CLI is always included
    return channels;
  }

  /**
   * Format a notification for Telegram MarkdownV2.
   *
   * MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
   */
  private formatTelegramMessage(payload: NotificationPayload): string {
    const esc = (s: string) => s.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

    const lines = [
      `*Fleet ${esc(TYPE_LABELS[payload.type])}*`,
      ``,
      `*Task:* ${esc(payload.taskType)} \\- ${esc(payload.description.slice(0, 100))}`,
      `*ID:* \`${esc(payload.taskId)}\``,
      `*Agent:* ${esc(payload.agentType)} / ${esc(payload.model)}`,
      `*Status:* ${esc(payload.status)}`,
      `*Branch:* \`${esc(payload.branch)}\``,
    ];

    if (payload.prNumber) {
      lines.push(`*PR:* \\#${payload.prNumber}`);
    }
    if (payload.error) {
      lines.push(`*Error:* ${esc(payload.error.slice(0, 150))}`);
    }

    return lines.join('\n');
  }

  /** Sleeper extracted for testability. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
