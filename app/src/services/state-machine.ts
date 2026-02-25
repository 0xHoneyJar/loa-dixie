/**
 * State Machine Validation — Hounfour Level 2 (Structural) compliance.
 *
 * Validates state transitions at runtime — invalid transitions rejected with 409.
 * Transition maps for: CircuitState, MemoryEncryptionState, AutonomousMode, ScheduleLifecycle.
 *
 * v8.2.0 (cycle-007): Each state machine is now also expressed as a
 * `StateMachineConfig` from commons, alongside the existing concise record
 * format. The `toStateMachineConfig()` helper converts from the record format.
 * Existing public API (validateTransition, assertTransition) unchanged.
 *
 * See: SDD §13.2 (Hounfour state machines), PRD FR-9 (Level 2 targets)
 * @since cycle-007 — Sprint 76, Tasks S4-T1, S4-T2, S4-T3
 */

import type { CircuitState as HounfourCircuitState } from '@0xhoneyjar/loa-hounfour/core';
import { isValidTransition } from '@0xhoneyjar/loa-hounfour/core';
import type {
  StateMachineConfig,
  State,
  Transition,
} from '@0xhoneyjar/loa-hounfour/commons';

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

// ---------------------------------------------------------------------------
// StateMachineConfig Conversion (S4-T1) — commons format alongside records
// ---------------------------------------------------------------------------

/**
 * Convert a concise record-format state machine to a commons StateMachineConfig.
 * Executed once at module load — zero runtime overhead per transition.
 *
 * @since cycle-007 — Sprint 76, Task S4-T1
 */
export function toStateMachineConfig<S extends string>(
  machine: StateMachine<S>,
  terminalStates: S[],
): StateMachineConfig {
  return {
    states: toStates(machine),
    transitions: toTransitions(machine),
    initial_state: machine.initial,
    terminal_states: terminalStates,
  };
}

/**
 * Extract unique State[] from a StateMachine's transition record.
 * @since cycle-007 — Sprint 76, Task S4-T1
 */
function toStates<S extends string>(machine: StateMachine<S>): State[] {
  const stateNames = new Set<string>();
  for (const from of Object.keys(machine.transitions)) {
    stateNames.add(from);
    for (const to of machine.transitions[from as S]) {
      stateNames.add(to);
    }
  }
  return Array.from(stateNames).map((name) => ({ name }));
}

/**
 * Convert a transition record to commons Transition[].
 * Handles self-loops and terminal states (empty target arrays).
 * @since cycle-007 — Sprint 76, Task S4-T1
 */
function toTransitions<S extends string>(machine: StateMachine<S>): Transition[] {
  const result: Transition[] = [];
  for (const from of Object.keys(machine.transitions) as S[]) {
    for (const to of machine.transitions[from]) {
      result.push({ from, to });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// StateMachineConfig Instances (S4-T2)
// ---------------------------------------------------------------------------

/** Commons StateMachineConfig for the circuit breaker. */
export const CIRCUIT_STATE_CONFIG: StateMachineConfig = toStateMachineConfig(
  CircuitStateMachine,
  [], // no terminal states — circuit always recoverable
);

/** Commons StateMachineConfig for memory encryption. */
export const MEMORY_ENCRYPTION_CONFIG: StateMachineConfig = toStateMachineConfig(
  MemoryEncryptionMachine,
  [], // no terminal states — always reversible
);

/** Commons StateMachineConfig for autonomous mode. */
export const AUTONOMOUS_MODE_CONFIG: StateMachineConfig = toStateMachineConfig(
  AutonomousModeMachine,
  [], // no terminal states — can always re-enable
);

/** Commons StateMachineConfig for schedule lifecycle. */
export const SCHEDULE_LIFECYCLE_CONFIG: StateMachineConfig = toStateMachineConfig(
  ScheduleLifecycleMachine,
  ['completed', 'cancelled'], // terminal states
);
