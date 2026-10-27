import test from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../src/services/dynamoStorage.js';

test('Auth Ownership: user can only retrieve scans that belong to them', async () => {
  const scanUserA = {
    scanId: 'scn_user_a_001',
    ownerUserId: 'user_alice',
    targetUrl: 'https://alice-website.com',
    normalizedHostname: 'alice-website.com',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  const scanUserB = {
    scanId: 'scn_user_b_001',
    ownerUserId: 'user_bob',
    targetUrl: 'https://bob-website.com',
    normalizedHostname: 'bob-website.com',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  await dbService.saveScan(scanUserA);
  await dbService.saveScan(scanUserB);

  // Alice can read her own scan
  const aliceReadOwn = await dbService.getScan('scn_user_a_001', 'user_alice');
  assert.ok(aliceReadOwn);
  assert.equal(aliceReadOwn.scanId, 'scn_user_a_001');

  // Alice cannot read Bob's scan
  const aliceReadBob = await dbService.getScan('scn_user_b_001', 'user_alice');
  assert.equal(aliceReadBob, null);

  // Listing scans returns only user's scans
  const aliceScans = await dbService.listScansByUser('user_alice');
  assert.equal(aliceScans.some((s) => s.scanId === 'scn_user_a_001'), true);
  assert.equal(aliceScans.some((s) => s.scanId === 'scn_user_b_001'), false);
});

test('Auth Ownership: saved websites are strictly multi-tenant isolated', async () => {
  const siteAlice = {
    id: 'site_alice_1',
    ownerUserId: 'user_alice',
    hostname: 'alice.com',
    normalizedUrl: 'https://alice.com',
    isVerified: true,
  };

  const siteBob = {
    id: 'site_bob_1',
    ownerUserId: 'user_bob',
    hostname: 'bob.com',
    normalizedUrl: 'https://bob.com',
    isVerified: true,
  };

  await dbService.saveSite(siteAlice);
  await dbService.saveSite(siteBob);

  // Bob cannot delete Alice's site
  const bobDeleteAlice = await dbService.deleteSite('site_alice_1', 'user_bob');
  assert.equal(bobDeleteAlice, false);

  // Alice's site remains untouched
  const aliceSite = await dbService.getSite('site_alice_1', 'user_alice');
  assert.ok(aliceSite);
  assert.equal(aliceSite.hostname, 'alice.com');
});
