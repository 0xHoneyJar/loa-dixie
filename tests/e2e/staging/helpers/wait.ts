/**
 * Health check polling — waits for staging compose to become healthy.
 */

const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

export interface WaitOptions {
  url?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Poll the health endpoint until it returns a healthy response.
 * Throws if timeout is exceeded.
 */
export async function waitForHealthy(opts: WaitOptions = {}): Promise<void> {
  const url = opts.url ?? 'http://localhost:3001/api/health';
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const interval = opts.pollIntervalMs ?? POLL_INTERVAL_MS;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json() as { status?: string };
        if (body.status === 'healthy' || body.status === 'degraded') {
          return;
        }
      }
    } catch {
      // Connection refused — service not up yet
    }
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Health check at ${url} did not pass within ${timeout}ms`);
}
