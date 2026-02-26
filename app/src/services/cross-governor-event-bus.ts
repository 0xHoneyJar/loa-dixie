/**
 * Cross-Governor Event Bus — In-Process + NATS Event Distribution
 *
 * Provides a typed pub/sub bus for fleet lifecycle events. Handlers are
 * invoked synchronously in-process first, then (if a NATS SignalEmitter
 * is connected) fire-and-forget published to NATS for cross-service
 * distribution.
 *
 * Design: In-process handlers are the source of truth. NATS is an
 * eventually-consistent distribution layer that degrades gracefully —
 * publish failures are logged but never block the caller.
 *
 * See: SDD §5.4 (NATS JetStream Schema), §2.5 (fleet events)
 * @since cycle-012 — Sprint 90, Fleet Governor Event Bus
 */
import type { SignalEmitter } from './signal-emitter.js';

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

/** All fleet lifecycle event types. */
export type FleetEventType =
  | 'AGENT_SPAWNED'
  | 'AGENT_COMPLETED'
  | 'AGENT_FAILED'
  | 'AGENT_RETRYING'
  | 'AGENT_CANCELLED'
  | 'FLEET_CAPACITY_WARNING'
  | 'FLEET_CAPACITY_RESTORED'
  | 'SPAWN_DENIED';

/** Payload for a fleet event. */
export interface FleetEvent {
  readonly type: FleetEventType;
  readonly taskId: string;
  readonly operatorId?: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

/** Handler function for fleet events. */
export type FleetEventHandler = (event: FleetEvent) => void | Promise<void>;

// ---------------------------------------------------------------------------
// CrossGovernorEventBus
// ---------------------------------------------------------------------------

/**
 * Typed event bus with in-process handlers and optional NATS distribution.
 *
 * Handler execution semantics:
 * - In-process handlers are invoked in registration order
 * - Handler errors are caught and logged — one failing handler does not
 *   prevent subsequent handlers from executing
 * - NATS publish is fire-and-forget after all in-process handlers complete
 *
 * @since cycle-012 — Sprint 90
 */
export class CrossGovernorEventBus {
  private readonly handlers: Map<FleetEventType, Set<FleetEventHandler>> = new Map();
  private readonly wildcardHandlers: Set<FleetEventHandler> = new Set();
  private readonly signalEmitter: SignalEmitter | null;
  private readonly natsSubjectPrefix: string;
  private readonly log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;

  constructor(opts?: {
    signalEmitter?: SignalEmitter;
    natsSubjectPrefix?: string;
    log?: (level: 'error' | 'warn' | 'info', data: Record<string, unknown>) => void;
  }) {
    this.signalEmitter = opts?.signalEmitter ?? null;
    this.natsSubjectPrefix = opts?.natsSubjectPrefix ?? 'dixie.fleet';
    this.log = opts?.log;
  }

  // -------------------------------------------------------------------------
  // Subscription API
  // -------------------------------------------------------------------------

  /**
   * Register a handler for a specific event type.
   * Pass '*' as the event type to register a wildcard handler that
   * receives all events.
   */
  on(eventType: FleetEventType | '*', handler: FleetEventHandler): void {
    if (eventType === '*') {
      this.wildcardHandlers.add(handler);
      return;
    }
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler);
  }

  /**
   * Remove a previously registered handler.
   * Pass '*' as the event type to remove a wildcard handler.
   */
  off(eventType: FleetEventType | '*', handler: FleetEventHandler): void {
    if (eventType === '*') {
      this.wildcardHandlers.delete(handler);
      return;
    }
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Emission API
  // -------------------------------------------------------------------------

  /**
   * Emit a fleet event.
   *
   * 1. Invoke all in-process handlers (type-specific, then wildcard)
   * 2. Publish to NATS (fire-and-forget, graceful degradation)
   *
   * Returns after all in-process handlers have completed. NATS publish
   * is awaited but failures are swallowed (logged, never thrown).
   */
  async emit(event: FleetEvent): Promise<void> {
    // Phase 1: In-process handlers
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          await handler(event);
        } catch (err) {
          this.log?.('error', {
            event: 'fleet_event_handler_error',
            eventType: event.type,
            taskId: event.taskId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    // Wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        await handler(event);
      } catch (err) {
        this.log?.('error', {
          event: 'fleet_event_wildcard_handler_error',
          eventType: event.type,
          taskId: event.taskId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Phase 2: NATS distribution (fire-and-forget)
    if (this.signalEmitter?.connected) {
      const subject = `${this.natsSubjectPrefix}.${event.type.toLowerCase()}`;
      try {
        await this.signalEmitter.publish(subject, event as unknown as Record<string, unknown>);
      } catch (err) {
        this.log?.('warn', {
          event: 'fleet_event_nats_publish_failed',
          eventType: event.type,
          taskId: event.taskId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /** Number of registered handlers (type-specific + wildcard). */
  get handlerCount(): number {
    let count = this.wildcardHandlers.size;
    for (const set of this.handlers.values()) {
      count += set.size;
    }
    return count;
  }

  /** Remove all handlers. Useful for test cleanup. */
  removeAllHandlers(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}
