/**
 * NL Scheduling & Cron Integration types.
 *
 * See: SDD §4.6 (Schedule Manager), §5.2.1 (Schedules Table),
 *      §6.1.2 (Schedule API), PRD FR-5
 */

/** Schedule status (lifecycle states) */
export type ScheduleStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';

/** A scheduled task */
export interface Schedule {
  readonly id: string;
  readonly nftId: string;
  readonly ownerWallet: string;
  readonly name: string;
  readonly description?: string;
  readonly cronExpression: string;
  readonly humanReadable: string;
  readonly status: ScheduleStatus;
  readonly finnCronId?: string;
  readonly prompt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly nextFireAt?: string;
  readonly lastFiredAt?: string;
  readonly fireCount: number;
  readonly maxFires?: number;
}

/** Input for creating a schedule */
export interface CreateScheduleRequest {
  readonly nlExpression: string;
  readonly prompt: string;
  readonly name?: string;
  readonly maxFires?: number;
}

/** Response from schedule creation (confirmation step) */
export interface CreateScheduleResponse {
  readonly parsed: {
    readonly cronExpression: string;
    readonly humanReadable: string;
    readonly nextFireAt: string;
  };
  readonly schedule?: Schedule;
  readonly needsConfirmation: boolean;
}

/** Execution record for a schedule fire */
export interface ScheduleExecution {
  readonly scheduleId: string;
  readonly firedAt: string;
  readonly status: 'success' | 'failed' | 'skipped';
  readonly messageId?: string;
  readonly error?: string;
  readonly costMicroUsd?: number;
}

/** Maximum active schedules per NFT */
export const MAX_SCHEDULES_PER_NFT = 50;

/** Common NL schedule patterns and their cron equivalents */
export const NL_SCHEDULE_PATTERNS: Array<{ pattern: RegExp; cron: string; human: string }> = [
  { pattern: /^every\s+morning$/i, cron: '0 9 * * *', human: 'Every day at 9:00 AM' },
  { pattern: /^every\s+evening$/i, cron: '0 18 * * *', human: 'Every day at 6:00 PM' },
  { pattern: /^every\s+monday\s+morning$/i, cron: '0 9 * * 1', human: 'Every Monday at 9:00 AM' },
  { pattern: /^daily\s+at\s+(\d{1,2})(am|pm)$/i, cron: '', human: '' }, // dynamic
  { pattern: /^every\s+(\d+)\s+hours?$/i, cron: '', human: '' }, // dynamic
  { pattern: /^every\s+(\d+)\s+minutes?$/i, cron: '', human: '' }, // dynamic
  { pattern: /^weekly\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, cron: '', human: '' }, // dynamic
];

const DAYS_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/**
 * Parse a natural language schedule expression to cron.
 * Returns null if the expression can't be parsed.
 */
export function parseNLToCron(nl: string): { cronExpression: string; humanReadable: string } | null {
  const trimmed = nl.trim();

  // Static patterns
  for (const { pattern, cron, human } of NL_SCHEDULE_PATTERNS) {
    if (cron && pattern.test(trimmed)) {
      return { cronExpression: cron, humanReadable: human };
    }
  }

  // "daily at Xam/pm"
  const dailyMatch = trimmed.match(/^daily\s+at\s+(\d{1,2})\s*(am|pm)$/i);
  if (dailyMatch) {
    let hour = parseInt(dailyMatch[1], 10);
    if (dailyMatch[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (dailyMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0;
    return { cronExpression: `0 ${hour} * * *`, humanReadable: `Every day at ${dailyMatch[1]}${dailyMatch[2].toUpperCase()}` };
  }

  // "every N hours"
  const hoursMatch = trimmed.match(/^every\s+(\d+)\s+hours?$/i);
  if (hoursMatch) {
    const n = parseInt(hoursMatch[1], 10);
    if (n >= 1 && n <= 23) {
      return { cronExpression: `0 */${n} * * *`, humanReadable: `Every ${n} hour${n > 1 ? 's' : ''}` };
    }
  }

  // "every N minutes"
  const minutesMatch = trimmed.match(/^every\s+(\d+)\s+minutes?$/i);
  if (minutesMatch) {
    const n = parseInt(minutesMatch[1], 10);
    if (n >= 1 && n <= 59) {
      return { cronExpression: `*/${n} * * * *`, humanReadable: `Every ${n} minute${n > 1 ? 's' : ''}` };
    }
  }

  // "weekly on <day>"
  const weeklyMatch = trimmed.match(/^weekly\s+on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i);
  if (weeklyMatch) {
    const day = DAYS_MAP[weeklyMatch[1].toLowerCase()];
    const dayName = weeklyMatch[1].charAt(0).toUpperCase() + weeklyMatch[1].slice(1).toLowerCase();
    return { cronExpression: `0 9 * * ${day}`, humanReadable: `Every ${dayName} at 9:00 AM` };
  }

  // "every day at HH:MM"
  const timeMatch = trimmed.match(/^every\s+day\s+at\s+(\d{1,2}):(\d{2})$/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { cronExpression: `${minute} ${hour} * * *`, humanReadable: `Every day at ${hour}:${minute.toString().padStart(2, '0')}` };
    }
  }

  return null;
}
