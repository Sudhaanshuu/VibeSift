import test from 'node:test';
import assert from 'node:assert/strict';
import {
  redactSensitiveData,
  deduplicateFindings,
  normalizePythonFindings,
  normalizeLighthouseFindings,
  normalizeZapFindings,
  normalizeNucleiFindings,
} from '../src/normalizer/findingsNormalizer.js';
import { calculateAuditScores } from '../src/normalizer/scoring.js';
import { buildAuditReport } from '../src/normalizer/reportBuilder.js';

test('Normalizer: redacts AWS keys, tokens, and credentials from text', () => {
  const text = 'Found AKIAIOSFODNN7EXAMPLE and secret=superSecret123 with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
  const redacted = redactSensitiveData(text);

  assert.equal(redacted.includes('AKIAIOSFODNN7EXAMPLE'), false);
  assert.equal(redacted.includes('AKIA[REDACTED_AWS_KEY]'), true);
  assert.equal(redacted.includes('superSecret123'), false);
  assert.equal(redacted.includes('Bearer [REDACTED_TOKEN]'), true);
});

test('Normalizer: deduplicates findings with matching rule, category, and URL', () => {
  const f1 = {
    ruleId: 'SEC_HSTS_MISSING',
    category: 'security',
    severity: 'medium',
    affectedUrl: 'https://example.com',
    title: 'Missing HSTS',
    evidence: { responseSnippet: 'Snippet 1' },
  };

  const f2 = {
    ruleId: 'SEC_HSTS_MISSING',
    category: 'security',
    severity: 'medium',
    affectedUrl: 'https://example.com',
    title: 'Missing HSTS duplicate',
    evidence: { responseSnippet: 'Snippet 2' },
  };

  const f3 = {
    ruleId: 'SEC_CSP_MISSING',
    category: 'security',
    severity: 'medium',
    affectedUrl: 'https://example.com',
    title: 'Missing CSP',
    evidence: {},
  };

  const deduplicated = deduplicateFindings([f1, f2, f3]);
  assert.equal(deduplicated.length, 2);
  assert.equal(deduplicated[0].evidence.secondarySnippets.length, 1);
});

test('Scoring: correctly calculates launch readiness score and category scores', () => {
  // Clean scan
  const cleanScores = calculateAuditScores([]);
  assert.equal(cleanScores.readinessScore, 100);
  assert.equal(cleanScores.counts.total, 0);

  // Scan with 1 critical (-25), 1 high (-12), 1 medium (-5)
  const findings = [
    { category: 'security', severity: 'critical' },
    { category: 'performance', severity: 'high' },
    { category: 'seo', severity: 'medium' },
  ];

  const scores = calculateAuditScores(findings);
  // Total deductions = 25 + 12 + 5 = 42 -> 100 - 42 = 58
  assert.equal(scores.readinessScore, 58);
  assert.equal(scores.counts.critical, 1);
  assert.equal(scores.counts.high, 1);
  assert.equal(scores.counts.medium, 1);
  assert.ok(scores.categoryScores.security < 100);
});

test('ReportBuilder: constructs a full AuditReport adhering to schema', () => {
  const report = buildAuditReport({
    scanId: 'scan-test-123',
    ownerUserId: 'user-456',
    targetUrl: 'https://example.com',
    normalizedHostname: 'example.com',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    allFindings: [
      {
        id: 'f1',
        ruleId: 'SEC_HSTS_MISSING',
        category: 'security',
        severity: 'medium',
        confidence: 'certain',
        title: 'Strict-Transport-Security Header Missing',
        description: 'HSTS is not configured.',
        affectedUrl: 'https://example.com',
        detectionMethod: 'passive',
        engine: 'custom-python',
        evidence: {},
        impact: 'Vulnerable to downgrade attacks.',
        remediation: { summary: 'Add Strict-Transport-Security header.' },
        verificationStatus: 'open',
      },
    ],
    enginesRun: [
      { engine: 'custom-python', displayName: 'Python Inspector', status: 'passed', executionTimeMs: 120 },
      { engine: 'lighthouse', displayName: 'Lighthouse', status: 'passed', executionTimeMs: 450 },
    ],
  });

  assert.equal(report.scanId, 'scan-test-123');
  assert.equal(report.status, 'COMPLETED');
  assert.equal(report.findings.length, 1);
  assert.ok(report.summary.readinessScore > 0);
  assert.ok(report.checksNotPerformed.length > 0);
});
