/**
 * Cross-Governor Event Bus Unit Tests — Handler Registration, Emission, NATS
 *
 * Tests in-process handler invocation, wildcard subscriptions, NATS
 * publish integration, graceful degradation, and handler lifecycle.
 *
 * @since cycle-012 — Sprint 90, Task T-5.9
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CrossGovernorEventBus,
} from '../cross-governor-event-bus.js';
import type { FleetEvent, FleetEventType, FleetEventHandler } from '../cross-governor-event-bus.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<FleetEvent> = {}): FleetEvent {
  return {
    type: 'AGENT_SPAWNED',
    taskId: 'task-1',
    operatorId: 'op-1',
    timestamp: '2026-02-26T00:00:00Z',
    ...overrides,
  };
}

function createMockSignalEmitter(overrides: Partial<{ connected: boolean; publish: ReturnType<typeof vi.fn> }> = {}) {
  return {
    connected: overrides.connected ?? true,
    publish: overrides.publish ?? vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CrossGovernorEventBus', () => {
  let bus: CrossGovernorEventBus;
  let mockLog: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog = vi.fn();
    bus = new CrossGovernorEventBus({ log: mockLog });
  });

  // -------------------------------------------------------------------------
  // Handler Registration and Invocation
  // -------------------------------------------------------------------------

  describe('handler registration and invocation', () => {
    it('invokes handler for the specific registered event type', async () => {
      const handler = vi.fn();
      bus.on('AGENT_SPAWNED', handler);

      const event = makeEvent({ type: 'AGENT_SPAWNED' });
      await bus.emit(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('does not invoke handler for a different event type', async () => {
      const handler = vi.fn();
      bus.on('AGENT_SPAWNED', handler);

      await bus.emit(makeEvent({ type: 'AGENT_FAILED' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('invokes multiple handlers for the same event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on('AGENT_COMPLETED', handler1);
      bus.on('AGENT_COMPLETED', handler2);
      bus.on('AGENT_COMPLETED', handler3);

      const event = makeEvent({ type: 'AGENT_COMPLETED' });
      await bus.emit(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // Wildcard Handlers
  // -------------------------------------------------------------------------

  describe('wildcard handler', () => {
    it('receives all event types', async () => {
      const wildcardHandler = vi.fn();
      bus.on('*', wildcardHandler);

      const events: FleetEventType[] = [
        'AGENT_SPAWNED',
        'AGENT_COMPLETED',
        'AGENT_FAILED',
        'AGENT_RETRYING',
        'AGENT_CANCELLED',
        'FLEET_CAPACITY_WARNING',
        'FLEET_CAPACITY_RESTORED',
        'SPAWN_DENIED',
      ];

      for (const type of events) {
        await bus.emit(makeEvent({ type }));
      }

      expect(wildcardHandler).toHaveBeenCalledTimes(events.length);
    });

    it('receives events alongside type-specific handlers', async () => {
      const typeHandler = vi.fn();
      const wildcardHandler = vi.fn();

      bus.on('AGENT_FAILED', typeHandler);
      bus.on('*', wildcardHandler);

      const event = makeEvent({ type: 'AGENT_FAILED' });
      await bus.emit(event);

      expect(typeHandler).toHaveBeenCalledOnce();
      expect(wildcardHandler).toHaveBeenCalledOnce();
      expect(typeHandler).toHaveBeenCalledWith(event);
      expect(wildcardHandler).toHaveBeenCalledWith(event);
    });
  });

  // -------------------------------------------------------------------------
  // NATS Publishing via SignalEmitter
  // -------------------------------------------------------------------------

  describe('NATS publishing', () => {
    it('publishes to NATS when SignalEmitter is connected', async () => {
      const mockEmitter = createMockSignalEmitter();
      const natsBus = new CrossGovernorEventBus({
        signalEmitter: mockEmitter as any,
        log: mockLog,
      });

      const event = makeEvent({ type: 'AGENT_SPAWNED' });
      await natsBus.emit(event);

      expect(mockEmitter.publish).toHaveBeenCalledOnce();
      expect(mockEmitter.publish).toHaveBeenCalledWith(
        'dixie.fleet.agent_spawned',
        event,
      );
    });

    it('uses custom natsSubjectPrefix', async () => {
      const mockEmitter = createMockSignalEmitter();
      const natsBus = new CrossGovernorEventBus({
        signalEmitter: mockEmitter as any,
        natsSubjectPrefix: 'custom.prefix',
        log: mockLog,
      });

      await natsBus.emit(makeEvent({ type: 'FLEET_CAPACITY_WARNING' }));

      expect(mockEmitter.publish).toHaveBeenCalledWith(
        'custom.prefix.fleet_capacity_warning',
        expect.any(Object),
      );
    });

    it('gracefully degrades when NATS is unavailable (emitter not connected)', async () => {
      const mockEmitter = createMockSignalEmitter({ connected: false });
      const natsBus = new CrossGovernorEventBus({
        signalEmitter: mockEmitter as any,
        log: mockLog,
      });

      // Should not throw
      await expect(natsBus.emit(makeEvent())).resolves.toBeUndefined();

      // Should not attempt to publish
      expect(mockEmitter.publish).not.toHaveBeenCalled();
    });

    it('gracefully degrades when no SignalEmitter is configured', async () => {
      const noNatsBus = new CrossGovernorEventBus({ log: mockLog });

      // Should not throw
      await expect(noNatsBus.emit(makeEvent())).resolves.toBeUndefined();
    });

    it('gracefully handles NATS publish failure (caught, logged)', async () => {
      const mockEmitter = createMockSignalEmitter({
        publish: vi.fn().mockRejectedValue(new Error('NATS timeout')),
      });
      const natsBus = new CrossGovernorEventBus({
        signalEmitter: mockEmitter as any,
        log: mockLog,
      });

      // Should not throw
      await expect(natsBus.emit(makeEvent())).resolves.toBeUndefined();

      // Error should be logged
      expect(mockLog).toHaveBeenCalledWith('warn', expect.objectContaining({
        event: 'fleet_event_nats_publish_failed',
        error: 'NATS timeout',
      }));
    });
  });

  // -------------------------------------------------------------------------
  // off() — Handler Removal
  // -------------------------------------------------------------------------

  describe('off', () => {
    it('removes a specific handler', async () => {
      const handler = vi.fn();
      bus.on('AGENT_SPAWNED', handler);

      // Verify it fires first
      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));
      expect(handler).toHaveBeenCalledOnce();

      // Remove it
      bus.off('AGENT_SPAWNED', handler);
      handler.mockClear();

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('removes a wildcard handler', async () => {
      const handler = vi.fn();
      bus.on('*', handler);

      await bus.emit(makeEvent());
      expect(handler).toHaveBeenCalledOnce();

      bus.off('*', handler);
      handler.mockClear();

      await bus.emit(makeEvent());
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not affect other handlers for the same event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('AGENT_FAILED', handler1);
      bus.on('AGENT_FAILED', handler2);

      bus.off('AGENT_FAILED', handler1);

      await bus.emit(makeEvent({ type: 'AGENT_FAILED' }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('is a no-op for a handler that was not registered', () => {
      const handler = vi.fn();
      // Should not throw
      bus.off('AGENT_SPAWNED', handler);
    });
  });

  // -------------------------------------------------------------------------
  // Handler Error Isolation
  // -------------------------------------------------------------------------

  describe('handler error isolation', () => {
    it('does not prevent subsequent handlers from executing', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('handler broke'));
      const successHandler = vi.fn();

      bus.on('AGENT_SPAWNED', failingHandler);
      bus.on('AGENT_SPAWNED', successHandler);

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));

      expect(failingHandler).toHaveBeenCalledOnce();
      expect(successHandler).toHaveBeenCalledOnce();
    });

    it('logs handler errors', async () => {
      const failingHandler = vi.fn().mockRejectedValue(new Error('boom'));
      bus.on('AGENT_SPAWNED', failingHandler);

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));

      expect(mockLog).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'fleet_event_handler_error',
        eventType: 'AGENT_SPAWNED',
        error: 'boom',
      }));
    });

    it('isolates wildcard handler errors from type-specific handlers', async () => {
      const typeHandler = vi.fn();
      const failingWildcard = vi.fn().mockRejectedValue(new Error('wildcard broke'));
      const anotherWildcard = vi.fn();

      bus.on('AGENT_SPAWNED', typeHandler);
      bus.on('*', failingWildcard);
      bus.on('*', anotherWildcard);

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));

      expect(typeHandler).toHaveBeenCalledOnce();
      expect(failingWildcard).toHaveBeenCalledOnce();
      expect(anotherWildcard).toHaveBeenCalledOnce();
    });

    it('logs wildcard handler errors with correct event name', async () => {
      const failingWildcard = vi.fn().mockRejectedValue(new Error('wildcard boom'));
      bus.on('*', failingWildcard);

      await bus.emit(makeEvent({ type: 'SPAWN_DENIED' }));

      expect(mockLog).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'fleet_event_wildcard_handler_error',
        eventType: 'SPAWN_DENIED',
        error: 'wildcard boom',
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  describe('handlerCount', () => {
    it('returns 0 when no handlers registered', () => {
      expect(bus.handlerCount).toBe(0);
    });

    it('counts type-specific handlers', () => {
      bus.on('AGENT_SPAWNED', vi.fn());
      bus.on('AGENT_FAILED', vi.fn());
      expect(bus.handlerCount).toBe(2);
    });

    it('counts wildcard handlers', () => {
      bus.on('*', vi.fn());
      expect(bus.handlerCount).toBe(1);
    });

    it('returns correct total of type-specific and wildcard handlers', () => {
      bus.on('AGENT_SPAWNED', vi.fn());
      bus.on('AGENT_SPAWNED', vi.fn());
      bus.on('AGENT_FAILED', vi.fn());
      bus.on('*', vi.fn());
      bus.on('*', vi.fn());
      expect(bus.handlerCount).toBe(5);
    });
  });

  describe('removeAllHandlers', () => {
    it('clears all type-specific and wildcard handlers', async () => {
      const typeHandler = vi.fn();
      const wildcardHandler = vi.fn();

      bus.on('AGENT_SPAWNED', typeHandler);
      bus.on('*', wildcardHandler);

      expect(bus.handlerCount).toBe(2);

      bus.removeAllHandlers();

      expect(bus.handlerCount).toBe(0);

      // Emit should not invoke any handlers
      await bus.emit(makeEvent());
      expect(typeHandler).not.toHaveBeenCalled();
      expect(wildcardHandler).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles emit with no handlers for the event type', async () => {
      // No handlers registered at all
      await expect(bus.emit(makeEvent())).resolves.toBeUndefined();
    });

    it('handler invocation order is registration order for type-specific', async () => {
      const order: number[] = [];
      bus.on('AGENT_SPAWNED', () => { order.push(1); });
      bus.on('AGENT_SPAWNED', () => { order.push(2); });
      bus.on('AGENT_SPAWNED', () => { order.push(3); });

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));

      expect(order).toEqual([1, 2, 3]);
    });

    it('type-specific handlers fire before wildcard handlers', async () => {
      const order: string[] = [];
      bus.on('AGENT_SPAWNED', () => { order.push('type'); });
      bus.on('*', () => { order.push('wildcard'); });

      await bus.emit(makeEvent({ type: 'AGENT_SPAWNED' }));

      expect(order).toEqual(['type', 'wildcard']);
    });
  });
});
