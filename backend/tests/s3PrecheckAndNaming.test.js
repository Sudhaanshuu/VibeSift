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

test('S3 & SQLite Pre-Check: distinguishes between baseline_public and authorized_deep profiles', async () => {
  const timestamp = Date.now();
  const scanIdBasic = `scn_basic_${timestamp}`;
  const hostname = `profile-test-${timestamp}.pixir.in`;
  const targetUrl = `https://${hostname}`;

  // 1. Save a completed BASIC scan
  const s3ReportKeyBasic = `scans/${sanitizeTargetHost(hostname)}__${scanIdBasic}/report.json`;
  const basicReport = {
    scanId: scanIdBasic,
    targetUrl,
    hostname,
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    summary: { readinessScore: 85, totalFindings: 2 },
  };
  await s3Service.saveReport(scanIdBasic, basicReport, '# Basic Report', hostname);
  await dbService.saveScan({
    scanId: scanIdBasic,
    ownerUserId: 'user-alice-123',
    targetUrl,
    normalizedHostname: hostname,
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    s3ReportKey: s3ReportKeyBasic,
    summary: { readinessScore: 85, totalFindings: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Query for basic scan -> should find it
  const foundBasic = await dbService.getLatestCompletedScanForSite(hostname, 'baseline_public');
  assert.ok(foundBasic);
  assert.equal(foundBasic.scanId, scanIdBasic);
  assert.equal(foundBasic.scanProfile, 'baseline_public');

  // 3. Query for deep scan -> should NOT find it (returns null)
  const foundDeep = await dbService.getLatestCompletedScanForSite(hostname, 'authorized_deep');
  assert.equal(foundDeep, null, 'Deep scan should not match a basic scan');

  // 4. Save a DEEP scan for the same host
  const scanIdDeep = `scn_deep_${timestamp}`;
  const s3ReportKeyDeep = `scans/${sanitizeTargetHost(hostname)}__${scanIdDeep}/report.json`;
  const deepReport = {
    scanId: scanIdDeep,
    targetUrl,
    hostname,
    scanProfile: 'authorized_deep',
    status: 'COMPLETED',
    summary: { readinessScore: 95, totalFindings: 1 },
  };
  await s3Service.saveReport(scanIdDeep, deepReport, '# Deep Report', hostname);
  await dbService.saveScan({
    scanId: scanIdDeep,
    ownerUserId: 'user-alice-123',
    targetUrl,
    normalizedHostname: hostname,
    scanProfile: 'authorized_deep',
    status: 'COMPLETED',
    s3ReportKey: s3ReportKeyDeep,
    summary: { readinessScore: 95, totalFindings: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 5. Query for deep scan -> now returns deep scan
  const foundDeepAfter = await dbService.getLatestCompletedScanForSite(hostname, 'authorized_deep');
  assert.ok(foundDeepAfter);
  assert.equal(foundDeepAfter.scanId, scanIdDeep);
  assert.equal(foundDeepAfter.scanProfile, 'authorized_deep');

  // 6. Query for basic scan -> still returns basic scan
  const foundBasicAfter = await dbService.getLatestCompletedScanForSite(hostname, 'baseline_public');
  assert.ok(foundBasicAfter);
  assert.equal(foundBasicAfter.scanId, scanIdBasic);
  assert.equal(foundBasicAfter.scanProfile, 'baseline_public');
});

test('Global Audit Retrieval: scan and findings can be retrieved globally even if owned by another user', async () => {
  const scanId = `scn_global_test_${Date.now()}`;
  const hostname = 'globally-cached-target.com';
  const ownerA = 'user_alice_original';
  const userB = 'user_bob_viewer';

  const reportData = {
    scanId,
    targetUrl: `https://${hostname}`,
    hostname,
    status: 'COMPLETED',
    summary: { readinessScore: 88, totalFindings: 1 },
    findings: [
      {
        id: `fnd_${scanId}_1`,
        scanId,
        title: 'Missing Content-Security-Policy',
        severity: 'high',
        category: 'security',
      },
    ],
  };

  const { jsonKey } = await s3Service.saveReport(scanId, reportData, null, hostname);
  await dbService.saveScan({
    scanId,
    ownerUserId: ownerA,
    targetUrl: `https://${hostname}`,
    normalizedHostname: hostname,
    scanProfile: 'basic_public',
    status: 'COMPLETED',
    s3ReportKey: jsonKey,
    summary: { readinessScore: 88, totalFindings: 1 },
  });

  // Verify that a global lookup (or fallback when userB is not owner) retrieves the scan
  let scan = await dbService.getScan(scanId, userB);
  if (!scan) {
    scan = await dbService.getScan(scanId);
  }
  assert.ok(scan);
  assert.equal(scan.scanId, scanId);
  assert.equal(scan.summary.readinessScore, 88);

  // Verify S3 report content is retrieved
  const rawContent = await s3Service.getObjectContent(scan.s3ReportKey);
  assert.ok(rawContent);
  const parsed = JSON.parse(rawContent);
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0].title, 'Missing Content-Security-Policy');
});

test('S3 Pre-Check Fallback: findLatestScanReportByHostname locates audit report directly in S3', async () => {
  const timestamp = Date.now();
  const scanId = `scn_s3_fallback_${timestamp}`;
  const hostname = `direct-s3-precheck-${timestamp}.dev`;

  const reportData = {
    scanId,
    targetUrl: `https://${hostname}`,
    hostname,
    status: 'COMPLETED',
    summary: { readinessScore: 94, totalFindings: 2 },
  };

  // Save report to S3 WITHOUT saving into DB
  const { jsonKey } = await s3Service.saveReport(scanId, reportData, null, hostname);

  // Direct S3 discovery
  const found = await s3Service.findLatestScanReportByHostname(hostname);
  assert.ok(found, 'Expected to find report via S3 prefix lookup');
  assert.equal(found.scanId, scanId);
  assert.equal(found.readinessScore, 94);
  assert.equal(found.s3Key, jsonKey);
});
