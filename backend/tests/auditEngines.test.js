import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditReport } from '../src/normalizer/reportBuilder.js';
import { calculateAuditScores } from '../src/normalizer/scoring.js';
import {
  AuditCheckResultSchema,
  PrivacyComplianceSchema,
  DeepComparisonSchema,
  AuditReportSchema,
} from '../src/types/index.js';

test('Audit Engines: buildAuditReport aggregates check statistics accurately', () => {
  const sampleChecks = [
    {
      checkId: 'B01_FOOTER',
      name: 'Footer Structure & Links',
      category: 'completeness',
      status: 'pass',
      severity: 'info',
      description: 'Standard footer is present',
      evidence: { tagFound: true },
      remediation: 'No action required',
      mode: 'baseline_public',
      isSecurityVulnerability: false,
    },
    {
      checkId: 'B04_PRIVACY_POLICY',
      name: 'Privacy Policy Presence',
      category: 'trust',
      status: 'warning',
      severity: 'low',
      description: 'Privacy policy link not found in main nav',
      evidence: { found: false },
      remediation: 'Add a clear privacy policy link',
      mode: 'baseline_public',
      isSecurityVulnerability: false,
    },
    {
      checkId: 'D01_XSS_CANARY',
      name: 'Cross-Site Scripting (XSS) Reflection',
      category: 'security',
      status: 'fail',
      severity: 'high',
      description: 'Input reflection detected without HTML escaping',
      evidence: { reflectedPayload: '<vibesift_safe_xss_probe>' },
      remediation: 'Apply context-aware output encoding',
      mode: 'authorized_deep',
      isSecurityVulnerability: true,
      findingType: 'confirmed_vulnerability',
    },
    {
      checkId: 'D04_CSP_STRENGTH',
      name: 'Content Security Policy (CSP) Directives',
      category: 'security',
      status: 'fail',
      severity: 'medium',
      description: 'CSP permits unsafe-inline',
      evidence: { unsafeDirectives: ['unsafe-inline'] },
      remediation: 'Use nonces or hashes',
      mode: 'authorized_deep',
      isSecurityVulnerability: false,
      findingType: 'potential_risk',
    },
    {
      checkId: 'D17_BRUTE_FORCE_RATE_LIMIT',
      name: 'Login Brute-Force Throttling',
      category: 'abuse',
      status: 'not_tested',
      severity: 'info',
      description: 'No login endpoint discovered',
      evidence: { reason: 'No auth form located' },
      remediation: 'N/A',
      mode: 'authorized_deep',
      isSecurityVulnerability: false,
    },
  ];

  const privacySummary = {
    overallRating: 'partially_compliant',
    checksPassed: 10,
    checksFailed: 3,
    checksWarning: 2,
    disclaimer: 'Preliminary automated assessment only. Not legal advice.',
    dpdpChecks: [],
    keyDeficiencies: ['Grievance officer contact missing'],
  };

  const deepComparison = {
    totalBasicChecks: 34,
    totalDeepChecks: 22,
    additionalSecurityTests: ['D01_XSS_CANARY', 'D04_CSP_STRENGTH', 'D17_BRUTE_FORCE_RATE_LIMIT'],
    skippedBasicChecksInDeep: [],
    scopeDifferenceDescription: 'Deep audit runs active canary probes and bounded rate tests.',
  };

  const report = buildAuditReport({
    scanId: 'test-scan-001',
    ownerUserId: 'user-123',
    targetUrl: 'https://example.com',
    normalizedHostname: 'example.com',
    scanProfile: 'authorized_deep',
    createdAt: new Date(Date.now() - 15000).toISOString(),
    completedAt: new Date().toISOString(),
    findings: [],
    checks: sampleChecks,
    privacyCompliance: privacySummary,
    deepComparison,
    enginesRun: [{ engine: 'custom-python', displayName: 'Python Inspector', status: 'passed' }],
    status: 'COMPLETED',
  });

  // Verify aggregated counts
  assert.equal(report.summary.totalChecksEvaluated, 5);
  assert.equal(report.summary.checksPassed, 1);
  assert.equal(report.summary.checksWarning, 1);
  assert.equal(report.summary.checksFailed, 2);
  assert.equal(report.summary.checksNotTested, 1);
  assert.equal(report.summary.confirmedVulnerabilities, 1);
  assert.equal(report.summary.potentialRisks, 1);

  // Validate that report complies with Zod schema
  const parsed = AuditReportSchema.safeParse(report);
  assert.equal(parsed.success, true, parsed.error?.message);
});

test('Audit Engines: category scoring handles completeness, trust, abuse, and privacy', () => {
  const findings = [
    {
      ruleId: 'COMPL_MISSING_NAV',
      category: 'completeness',
      severity: 'medium',
      title: 'Missing Navigation',
      description: 'No nav landmark',
      affectedUrl: 'https://example.com',
    },
    {
      ruleId: 'TRUST_NO_CONTACT',
      category: 'trust',
      severity: 'low',
      title: 'Missing Contact Page',
      description: 'No contact route',
      affectedUrl: 'https://example.com',
    },
    {
      ruleId: 'PRIVACY_TRACKER_PRECONSENT',
      category: 'privacy',
      severity: 'high',
      title: 'Pre-consent tracking',
      description: 'Analytics fired prior to consent',
      affectedUrl: 'https://example.com',
    },
  ];

  const scores = calculateAuditScores(findings);

  assert.ok(scores.categoryScores.completeness < 100);
  assert.ok(scores.categoryScores.trust < 100);
  assert.ok(scores.categoryScores.privacy < 100);
  assert.equal(scores.categoryScores.seo, 100);
  assert.ok(scores.readinessScore < 100);
});

test('Audit Engines: Zod schema validates AuditCheckResult and PrivacyCompliance', () => {
  const validCheck = {
    checkId: 'P01_PRIVACY_POLICY',
    name: 'Privacy Policy Accessibility',
    category: 'privacy',
    status: 'pass',
    severity: 'info',
    description: 'Privacy policy is easily accessible',
    evidence: { url: 'https://example.com/privacy' },
    remediation: 'Maintain updated policy',
    mode: 'both',
    isSecurityVulnerability: false,
    findingType: 'hardening_signal',
  };

  const result = AuditCheckResultSchema.safeParse(validCheck);
  assert.equal(result.success, true);

  const validDpdp = {
    overallRating: 'compliant',
    checksPassed: 15,
    checksFailed: 0,
    checksWarning: 0,
    disclaimer: 'This automated scan is not legal counsel.',
    dpdpChecks: [
      {
        section: 'Section 5(1)',
        item: 'Notice & Itemized Processing',
        status: 'pass',
        details: 'Notice specifies purpose of data collection.',
      },
    ],
    keyDeficiencies: [],
  };

  const dpdpResult = PrivacyComplianceSchema.safeParse(validDpdp);
  assert.equal(dpdpResult.success, true);
});
