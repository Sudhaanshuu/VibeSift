import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransition,
  assertTransition,
  determineTerminalStatus,
  InvalidStateTransitionError,
} from '../src/services/scanStateService.js';

test('ScanStateService: allows valid progression transitions', () => {
  assert.equal(canTransition('QUEUED', 'VALIDATING'), true);
  assert.equal(canTransition('VALIDATING', 'RUNNING'), true);
  assert.equal(canTransition('RUNNING', 'NORMALIZING'), true);
  assert.equal(canTransition('NORMALIZING', 'COMPLETED'), true);
  assert.equal(canTransition('NORMALIZING', 'PARTIAL'), true);
  assert.equal(canTransition('RUNNING', 'CANCELLED'), true);
});

test('ScanStateService: rejects backwards and illegal state transitions', () => {
  assert.equal(canTransition('COMPLETED', 'RUNNING'), false);
  assert.equal(canTransition('FAILED', 'RUNNING'), false);
  assert.equal(canTransition('CANCELLED', 'VALIDATING'), false);
  assert.equal(canTransition('QUEUED', 'COMPLETED'), false);

  assert.throws(
    () => assertTransition('COMPLETED', 'RUNNING', 'scan_123'),
    InvalidStateTransitionError
  );
});

test('ScanStateService: determines terminal status based on engine results', () => {
  // All passed -> COMPLETED
  const allPassed = [
    { engine: 'custom-python', status: 'passed' },
    { engine: 'lighthouse', status: 'passed' },
  ];
  assert.equal(determineTerminalStatus(allPassed), 'COMPLETED');

  // Some passed, some failed -> PARTIAL
  const mixed = [
    { engine: 'custom-python', status: 'passed' },
    { engine: 'lighthouse', status: 'failed' },
  ];
  assert.equal(determineTerminalStatus(mixed), 'PARTIAL');

  // All failed -> FAILED
  const allFailed = [
    { engine: 'custom-python', status: 'failed' },
    { engine: 'lighthouse', status: 'failed' },
  ];
  assert.equal(determineTerminalStatus(allFailed), 'FAILED');
});
