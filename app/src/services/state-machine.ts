/**
 * State Machine Validation — Hounfour Level 2 (Structural) compliance.
 *
 * Validates state transitions at runtime — invalid transitions rejected with 409.
 * Transition maps for: CircuitState, MemoryEncryptionState, AutonomousMode, ScheduleLifecycle.
 *
 * See: SDD §13.2 (Hounfour state machines), PRD FR-9 (Level 2 targets)
 */

import type { CircuitState as HounfourCircuitState } from '@0xhoneyjar/loa-hounfour/core';
import { isValidTransition } from '@0xhoneyjar/loa-hounfour/core';

/** Generic state machine definition */
export interface StateMachine<S extends string> {
  readonly name: string;
  readonly initial: S;
  readonly transitions: Record<S, readonly S[]>;
}

/** Validation result */
export interface TransitionResult {
  readonly valid: boolean;
  readonly from: string;
  readonly to: string;
  readonly machine: string;
  readonly error?: string;
}

/**
 * Validate a state transition against a state machine definition.
 * Returns a TransitionResult — never throws.
 */
export function validateTransition<S extends string>(
  machine: StateMachine<S>,
  from: S,
  to: S,
): TransitionResult {
  const allowed = machine.transitions[from];
  if (!allowed) {
    return {
      valid: false,
      from,
      to,
      machine: machine.name,
      error: `Unknown state '${from}' in ${machine.name}`,
    };
  }

  if (!allowed.includes(to)) {
    return {
      valid: false,
      from,
      to,
      machine: machine.name,
      error: `Invalid transition ${from} → ${to} in ${machine.name}. Allowed: [${allowed.join(', ')}]`,
    };
  }

  return { valid: true, from, to, machine: machine.name };
}

/**
 * Assert a valid transition — throws if invalid.
 * For use at API boundaries where invalid transitions should return 409.
 */
export function assertTransition<S extends string>(
  machine: StateMachine<S>,
  from: S,
  to: S,
): void {
  const result = validateTransition(machine, from, to);
  if (!result.valid) {
    throw {
      status: 409,
      body: {
        error: 'invalid_transition',
        message: result.error,
        from,
        to,
        machine: machine.name,
      },
    };
  }
}

// --- State Machine Definitions ---

/**
 * Circuit breaker state machine.
 * HounfourCircuitState imported from @0xhoneyjar/loa-hounfour/core.
 * Hounfour naming: half_open (not half-open).
 */
export type { HounfourCircuitState };

export const CircuitStateMachine: StateMachine<HounfourCircuitState> = {
  name: 'CircuitState',
  initial: 'closed',
  transitions: {
    closed: ['open'],
    open: ['half_open'],
    half_open: ['closed', 'open'],
  },
};

/**
 * Memory encryption state machine.
 * Governs seal/unseal transitions for soul memory.
 */
export type MemoryEncryptionState = 'unsealed' | 'sealing' | 'sealed' | 'unsealing';

export const MemoryEncryptionMachine: StateMachine<MemoryEncryptionState> = {
  name: 'MemoryEncryptionState',
  initial: 'unsealed',
  transitions: {
    unsealed: ['sealing'],
    sealing: ['sealed', 'unsealed'], // sealed on success, unsealed on failure
    sealed: ['unsealing'],
    unsealing: ['unsealed', 'sealed'], // unsealed on success, sealed on failure
  },
};

/**
 * Autonomous mode state machine.
 * Governs enable/disable/suspend transitions.
 */
export type AutonomousModeState = 'disabled' | 'enabled' | 'suspended' | 'confirming';

export const AutonomousModeMachine: StateMachine<AutonomousModeState> = {
  name: 'AutonomousMode',
  initial: 'disabled',
  transitions: {
    disabled: ['enabled'],
    enabled: ['disabled', 'suspended', 'confirming'],
    suspended: ['enabled', 'disabled'],
    confirming: ['enabled', 'suspended'],
  },
};

/**
 * Schedule lifecycle state machine.
 */
export type ScheduleState = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';

export const ScheduleLifecycleMachine: StateMachine<ScheduleState> = {
  name: 'ScheduleLifecycle',
  initial: 'pending',
  transitions: {
    pending: ['active', 'cancelled'],
    active: ['paused', 'completed', 'cancelled', 'failed'],
    paused: ['active', 'cancelled'],
    completed: [], // terminal
    cancelled: [], // terminal
    failed: ['pending', 'cancelled'], // can retry
  },
};
