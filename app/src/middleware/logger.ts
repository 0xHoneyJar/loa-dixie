import { createMiddleware } from 'hono/factory';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Structured JSON logger.
 *
 * Emits one JSON log line per request to stdout with:
 * - level, timestamp, service, request_id
 * - method, path, status, latency_ms
 * - wallet (if authenticated)
 */
export function createLogger(
  serviceName: string,
  configuredLevel: LogLevel = 'info',
) {
  const threshold = LEVEL_ORDER[configuredLevel];

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] <= threshold;
  }

  function log(level: LogLevel, data: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    const entry = {
      level,
      timestamp: new Date().toISOString(),
      service: serviceName,
      ...data,
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  const middleware = createMiddleware(async (c, next) => {
    const start = Date.now();
    await next();
    const latencyMs = Date.now() - start;

    const requestId = c.res.headers.get('X-Request-Id') ?? '';
    const wallet = c.req.header('x-wallet-address') ?? undefined;
    const status = c.res.status;

    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    log(level, {
      request_id: requestId,
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status,
      latency_ms: latencyMs,
      ...(wallet ? { wallet } : {}),
    });
  });

  return { middleware, log };
}
