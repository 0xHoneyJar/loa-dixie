import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JetStreamManager,
  StringCodec,
  RetentionPolicy,
  StorageType,
} from 'nats';

export interface NatsClientOptions {
  url: string;
  name?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWaitMs?: number;
  log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
}

/**
 * NATS JetStream connection client.
 *
 * Manages connection to NATS, creates/verifies the DIXIE_SIGNALS stream,
 * and provides a publish interface for interaction signals.
 *
 * Architecture: Fire-and-forget signal emission. NATS publish failures
 * are logged but never block the request path. Compound learning is
 * eventually consistent by design.
 *
 * See: SDD §4.5, §5.4 (NATS JetStream Schema)
 */
export class SignalEmitter {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private readonly sc = StringCodec();
  private readonly opts: NatsClientOptions;

  static readonly STREAM_NAME = 'DIXIE_SIGNALS';
  static readonly SUBJECTS = [
    'dixie.signal.interaction',
    'dixie.signal.personality',
    'dixie.signal.schedule',
    'dixie.signal.economic',
    'dixie.signal.conformance',
  ] as const;

  constructor(opts: NatsClientOptions) {
    this.opts = opts;
  }

  /**
   * Connect to NATS and ensure the DIXIE_SIGNALS stream exists.
   */
  async connect(): Promise<void> {
    this.nc = await connect({
      servers: this.opts.url,
      name: this.opts.name ?? 'dixie-bff',
      maxReconnectAttempts: this.opts.maxReconnectAttempts ?? -1,
      reconnectTimeWait: this.opts.reconnectTimeWaitMs ?? 2_000,
    });

    this.opts.log?.('info', {
      event: 'nats_connect',
      server: this.opts.url,
    });

    // Set up reconnect/disconnect handlers
    this.nc.closed().then(() => {
      this.opts.log?.('warn', { event: 'nats_closed' });
    });

    // Ensure the DIXIE_SIGNALS stream exists
    const jsm = await this.nc.jetstreamManager();
    await this.ensureStream(jsm);

    this.js = this.nc.jetstream();
  }

  /**
   * Ensure the DIXIE_SIGNALS stream exists with correct configuration.
   * Creates it if missing; no-ops if already present.
   */
  private async ensureStream(jsm: JetStreamManager): Promise<void> {
    try {
      await jsm.streams.info(SignalEmitter.STREAM_NAME);
      this.opts.log?.('info', {
        event: 'nats_stream_exists',
        stream: SignalEmitter.STREAM_NAME,
      });
    } catch {
      // Stream doesn't exist — create it
      await jsm.streams.add({
        name: SignalEmitter.STREAM_NAME,
        subjects: ['dixie.signal.>'],
        retention: RetentionPolicy.Limits,
        max_msgs: 100_000,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
        storage: StorageType.File,
        num_replicas: 1,
      });
      this.opts.log?.('info', {
        event: 'nats_stream_created',
        stream: SignalEmitter.STREAM_NAME,
      });
    }
  }

  /**
   * Publish a signal to a NATS subject.
   * Fire-and-forget: logs errors but never throws.
   */
  async publish(subject: string, data: Record<string, unknown>): Promise<boolean> {
    if (!this.js) {
      this.opts.log?.('warn', {
        event: 'nats_publish_skip',
        reason: 'not_connected',
        subject,
      });
      return false;
    }

    try {
      await this.js.publish(subject, this.sc.encode(JSON.stringify(data)));
      return true;
    } catch (err) {
      this.opts.log?.('error', {
        event: 'nats_publish_error',
        subject,
        message: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Check if the NATS connection is healthy.
   */
  get connected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }

  /**
   * Health check — verifies connection is alive.
   * Returns latency in ms or throws on failure.
   */
  async healthCheck(): Promise<number> {
    if (!this.nc || this.nc.isClosed()) {
      throw new Error('NATS not connected');
    }
    const start = Date.now();
    await this.nc.flush();
    return Date.now() - start;
  }

  /**
   * Graceful shutdown — drains and closes the connection.
   */
  async close(): Promise<void> {
    if (this.nc && !this.nc.isClosed()) {
      await this.nc.drain();
    }
    this.nc = null;
    this.js = null;
  }
}
