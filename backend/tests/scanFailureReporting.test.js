import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditReport } from '../src/normalizer/reportBuilder.js';
import { determineTerminalStatus } from '../src/services/scanStateService.js';
import { sqliteStorage } from '../src/services/sqliteStorage.js';
import { validateAndNormalizeUrl } from '../src/services/ssrfGuard.js';
import { SSRFProtectionError } from '../src/services/ssrfGuard.js';

test('Scan Failure Reporting: buildAuditReport preserves error message and avoids mock findings on failure', () => {
  const failedEngines = [
    {
      engine: 'custom-python',
      displayName: 'Python Website Inspector (Live)',
      status: 'failed',
      errorMessage: 'DNS resolution failed for host "unresolvable-domain-xyz.local"',
    },
    {
      engine: 'lighthouse',
      displayName: 'Google Lighthouse CWV (Live)',
      status: 'failed',
      errorMessage: 'Lighthouse worker execution failed or unavailable',
    },
  ];

  const terminalStatus = determineTerminalStatus(failedEngines);
  assert.equal(terminalStatus, 'FAILED');

  const report = buildAuditReport({
    scanId: 'scn_test_failure_001',
    ownerUserId: 'usr_test_123',
    targetUrl: 'https://unresolvable-domain-xyz.local',
    normalizedHostname: 'unresolvable-domain-xyz.local',
    scanProfile: 'baseline_public',
    status: terminalStatus,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    allFindings: [], // No mock findings!
    enginesRun: failedEngines,
    checks: [],
    errorMessage: 'DNS resolution failed for host "unresolvable-domain-xyz.local"',
  });

  assert.equal(report.status, 'FAILED');
  assert.equal(report.errorMessage, 'DNS resolution failed for host "unresolvable-domain-xyz.local"');
  assert.equal(report.findings.length, 0, 'Must not inject mock findings on failed scans');
  assert.equal(report.summary.totalFindings, 0);
  assert.equal(report.summary.readinessScore, 100); // 0 findings
  assert.equal(report.enginesRun[0].status, 'failed');
  assert.equal(report.enginesRun[0].errorMessage, 'DNS resolution failed for host "unresolvable-domain-xyz.local"');
});

test('Scan Failure Reporting: sqliteStorage preserves and retrieves scan errorMessage', async () => {
  const scanId = `scn_test_db_${Date.now()}`;
  const now = new Date().toISOString();

  await sqliteStorage.saveScan({
    scanId,
    ownerUserId: 'usr_failure_test',
    targetUrl: 'https://test-fail.example',
    normalizedHostname: 'test-fail.example',
    scanProfile: 'baseline_public',
    status: 'FAILED',
    errorMessage: 'Connection refused by remote host on port 443',
    enginesRun: [
      { engine: 'custom-python', displayName: 'Python Inspector', status: 'failed', errorMessage: 'Connection refused' },
      { engine: 'lighthouse', displayName: 'Lighthouse', status: 'failed', errorMessage: 'Chrome launch failed' }
    ],
    createdAt: now,
    updatedAt: now,
  });

  const retrieved = await sqliteStorage.getScan(scanId, 'usr_failure_test');
  assert.ok(retrieved, 'Scan record should exist in database');
  assert.equal(retrieved.status, 'FAILED');
  assert.equal(retrieved.errorMessage, 'Connection refused by remote host on port 443');
  assert.equal(retrieved.enginesRun.length, 2);
  assert.equal(retrieved.enginesRun[0].errorMessage, 'Connection refused');
});

test('Scan Failure Reporting: SSRF Guard rejects blocked targets with accurate security reason', () => {
  assert.throws(
    () => validateAndNormalizeUrl('http://localhost:8080'),
    (err) => {
      assert.ok(err instanceof SSRFProtectionError);
      assert.equal(err.code, 'BLOCKED_HOST');
      assert.ok(err.message.includes('is blocked'));
      return true;
    }
  );

  assert.throws(
    () => validateAndNormalizeUrl('http://169.254.169.254/latest/meta-data'),
    (err) => {
      assert.ok(err instanceof SSRFProtectionError);
      assert.equal(err.code, 'BLOCKED_HOST');
      return true;
    }
  );

  assert.throws(
    () => validateAndNormalizeUrl('ftp://example.com'),
    (err) => {
      assert.ok(err instanceof SSRFProtectionError);
      assert.equal(err.code, 'DISALLOWED_PROTOCOL');
      return true;
    }
  );
});

test('Scan Failure Reporting: Partial engine success isolates real findings without mock data', () => {
  const enginesRun = [
    {
      engine: 'custom-python',
      displayName: 'Python Website Inspector (Live)',
      status: 'passed',
      executionTimeMs: 450,
    },
    {
      engine: 'lighthouse',
      displayName: 'Google Lighthouse CWV (Live)',
      status: 'failed',
      errorMessage: 'Lighthouse or chrome-launcher dependencies are not installed in worker environment.',
      executionTimeMs: 15,
    },
  ];

  const terminalStatus = determineTerminalStatus(enginesRun);
  assert.equal(terminalStatus, 'PARTIAL', 'Should be PARTIAL when one engine passes and one fails');

  const realFinding = {
    id: 'fnd_real_001',
    scanId: 'scn_partial_001',
    ruleId: 'B14_HSTS_HEADER',
    category: 'security',
    severity: 'medium',
    confidence: 'high',
    title: 'Strict-Transport-Security (HSTS) Header Missing',
    description: 'Real finding observed on live target response headers.',
    affectedUrl: 'https://example.com',
    detectionMethod: 'passive',
    engine: 'custom-python',
    impact: 'Users are vulnerable to SSL-stripping.',
    remediation: { summary: 'Add HSTS header' },
    evidence: { observedHeaders: {} },
  };

  const report = buildAuditReport({
    scanId: 'scn_partial_001',
    ownerUserId: 'usr_partial_123',
    targetUrl: 'https://example.com',
    normalizedHostname: 'example.com',
    scanProfile: 'baseline_public',
    status: terminalStatus,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    allFindings: [realFinding],
    enginesRun,
    checks: [],
    errorMessage: 'Google Lighthouse CWV (Live): Lighthouse or chrome-launcher dependencies are not installed in worker environment.',
  });

  assert.equal(report.status, 'PARTIAL');
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].id, 'fnd_real_001');
  assert.equal(report.errorMessage, 'Google Lighthouse CWV (Live): Lighthouse or chrome-launcher dependencies are not installed in worker environment.');
  assert.equal(report.enginesRun.find(e => e.engine === 'lighthouse')?.status, 'failed');
  assert.equal(report.enginesRun.find(e => e.engine === 'custom-python')?.status, 'passed');
});
