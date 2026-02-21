import { Redis } from 'ioredis';

export type RedisClient = Redis;

export interface RedisClientOptions {
  url: string;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
}

/**
 * Create an ioredis client from a connection URL.
 *
 * Supports redis:// and rediss:// (TLS) schemes.
 * AUTH is extracted from the URL userinfo component.
 * See: SDD §3.1, §5.3 Redis Schema
 */
export function createRedisClient(opts: RedisClientOptions): RedisClient {
  const client = new Redis(opts.url, {
    keyPrefix: opts.keyPrefix,
    maxRetriesPerRequest: opts.maxRetriesPerRequest ?? 3,
    lazyConnect: opts.lazyConnect ?? false,
    retryStrategy(times: number) {
      // Exponential backoff: 100ms, 200ms, 400ms, ..., capped at 5s
      const delay = Math.min(times * 100, 5_000);
      return delay;
    },
    reconnectOnError(err: Error) {
      // Reconnect on READONLY errors (happens during Redis failover)
      return err.message.includes('READONLY');
    },
  });

  client.on('error', (err: Error) => {
    opts.log?.('error', {
      event: 'redis_error',
      message: err.message,
    });
  });

  client.on('connect', () => {
    opts.log?.('info', { event: 'redis_connect' });
  });

  client.on('reconnecting', () => {
    opts.log?.('warn', { event: 'redis_reconnecting' });
  });

  return client;
}

/**
 * Health check — sends PING command.
 * Returns latency in ms or throws on failure.
 */
export async function checkRedisHealth(client: RedisClient): Promise<number> {
  const start = Date.now();
  const result = await client.ping();
  if (result !== 'PONG') {
    throw new Error(`Redis PING returned unexpected: ${result}`);
  }
  return Date.now() - start;
}

/**
 * Graceful shutdown — closes the connection.
 */
export async function closeRedisClient(client: RedisClient): Promise<void> {
  await client.quit();
}
