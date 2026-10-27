import test from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../src/services/dynamoStorage.js';

test('Idempotency: duplicate submissions with same idempotencyKey return original scan', async () => {
  const idempotencyKey = 'idem_key_unique_999';
  const ownerUserId = 'user_charlie';

  const scanRecord = {
    scanId: 'scn_idem_001',
    ownerUserId,
    targetUrl: 'https://charlie.com',
    normalizedHostname: 'charlie.com',
    scanProfile: 'baseline_public',
    status: 'QUEUED',
    createdAt: new Date().toISOString(),
    idempotencyKey,
  };

  await dbService.saveScan(scanRecord);

  // Lookup by idempotency key
  const match = await dbService.getScanByIdempotencyKey(ownerUserId, idempotencyKey);
  assert.ok(match);
  assert.equal(match.scanId, 'scn_idem_001');

  // Different user cannot match Charlie's idempotency key
  const wrongUserMatch = await dbService.getScanByIdempotencyKey('user_david', idempotencyKey);
  assert.equal(wrongUserMatch, null);
});
