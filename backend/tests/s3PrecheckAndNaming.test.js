import test from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../src/services/dynamoStorage.js';
import { s3Service, buildScanS3Prefix, parseScanFromS3Key, sanitizeTargetHost } from '../src/services/s3Storage.js';

test('S3 Naming Convention: sanitizeTargetHost, buildScanS3Prefix, and parseScanFromS3Key', () => {
  const host = 'https://Example.com/test-path?param=1';
  const sanitized = sanitizeTargetHost(host);
  assert.equal(sanitized, 'example.com');

  const scanId = 'scn_9876543210';
  const prefix = buildScanS3Prefix(sanitized, scanId);
  assert.equal(prefix, 'example.com__scn_9876543210');

  // Verify trimming and extraction
  const parsed1 = parseScanFromS3Key(`scans/${prefix}/report.json`);
  assert.equal(parsed1.hostname, 'example.com');
  assert.equal(parsed1.scanId, 'scn_9876543210');

  const parsed2 = parseScanFromS3Key(`audits/${prefix}.json`);
  assert.equal(parsed2.hostname, 'example.com');
  assert.equal(parsed2.scanId, 'scn_9876543210');
});

test('S3 & SQLite Pre-Check: detects globally cached audits and verifies S3 object presence', async () => {
  const timestamp = Date.now();
  const scanId = `scn_test_${timestamp}`;
  const hostname = `precheck-${timestamp}.pixir.in`;
  const targetUrl = `https://${hostname}`;

  // 1. Initial state: verify nothing exists
  const initialCheck = await dbService.getLatestCompletedScanForSite(hostname);
  assert.equal(initialCheck, null);

  // 2. Save a completed scan record
  const s3ReportKey = `scans/${sanitizeTargetHost(hostname)}__${scanId}/report.json`;
  const reportData = {
    scanId,
    targetUrl,
    hostname,
    status: 'COMPLETED',
    summary: { readinessScore: 92, totalFindings: 3 },
  };

  // 3. Save to S3 and SQLite
  await s3Service.saveReport(scanId, reportData, '# Demo Report', hostname);
  await dbService.saveScan({
    scanId,
    ownerUserId: 'user-alice-123',
    targetUrl,
    normalizedHostname: hostname,
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    s3ReportKey,
    summary: { readinessScore: 92, totalFindings: 3 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 4. Global lookup: another user (or unauthenticated) checks the same host
  const foundScan = await dbService.getLatestCompletedScanForSite(hostname);
  assert.ok(foundScan);
  assert.equal(foundScan.scanId, scanId);
  assert.equal(foundScan.summary.readinessScore, 92);

  // 5. Verify object existence in S3
  const existsInS3 = await s3Service.objectExists(foundScan.s3ReportKey);
  assert.equal(existsInS3, true);
});
