export const VALID_TRANSITIONS = {
  QUEUED: ['VALIDATING', 'CANCELLED', 'FAILED'],
  VALIDATING: ['RUNNING', 'CANCELLED', 'FAILED'],
  RUNNING: ['NORMALIZING', 'PARTIAL', 'FAILED', 'CANCELLED'],
  NORMALIZING: ['COMPLETED', 'PARTIAL', 'FAILED'],
  COMPLETED: [], // Terminal
  PARTIAL: [],   // Terminal
  FAILED: [],    // Terminal
  CANCELLED: [], // Terminal
};

export const TERMINAL_STATES = new Set(['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED']);

export class InvalidStateTransitionError extends Error {
  constructor(fromState, toState, scanId) {
    super(`Invalid scan state transition from ${fromState} to ${toState} for scan ${scanId}`);
    this.name = 'InvalidStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
    this.scanId = scanId;
    this.statusCode = 409;
  }
}

/**
 * Validates whether transition from currentState to nextState is permitted
 * @param {string} currentState
 * @param {string} nextState
 * @param {string} [scanId]
 * @returns {boolean}
 */
export function canTransition(currentState, nextState, scanId = 'unknown') {
  // Idempotent transition to same state is safe and accepted
  if (currentState === nextState) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(nextState)) {
    return false;
  }

  return true;
}

/**
 * Asserts transition is valid or throws InvalidStateTransitionError
 * @param {string} currentState
 * @param {string} nextState
 * @param {string} [scanId]
 */
export function assertTransition(currentState, nextState, scanId = 'unknown') {
  if (!canTransition(currentState, nextState, scanId)) {
    throw new InvalidStateTransitionError(currentState, nextState, scanId);
  }
}

/**
 * Evaluates terminal state based on engine execution results
 * @param {Array<{ status: 'passed' | 'partial' | 'failed' | 'skipped_unauthorized' | 'skipped_profile' }>} engines
 * @returns {'COMPLETED' | 'PARTIAL' | 'FAILED'}
 */
export function determineTerminalStatus(engines) {
  if (!engines || engines.length === 0) {
    return 'FAILED';
  }

  const failedEngines = engines.filter((e) => e.status === 'failed');
  const passedEngines = engines.filter((e) => e.status === 'passed' || e.status === 'partial');

  // If all failed, the entire scan failed
  if (failedEngines.length === engines.length) {
    return 'FAILED';
  }

  // If some failed and some passed, it's PARTIAL
  if (failedEngines.length > 0 && passedEngines.length > 0) {
    return 'PARTIAL';
  }

  return 'COMPLETED';
}
