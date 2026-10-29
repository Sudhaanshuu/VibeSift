import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  buildBasicAuditReport,
  buildDeepAuditReport,
  buildBasicAuditChecks,
  buildDeepSecurityChecks,
  buildDpdpComplianceChecks,
} from '../data/auditReportBuilder';
import { CheckRegistryView } from '../components/common/CheckRegistryView';
import { PrivacyComplianceSection } from '../components/common/PrivacyComplianceSection';
import { DeepComparisonSection } from '../components/common/DeepComparisonSection';

describe('Audit Modes Builder & Engine Separation', () => {
  it('buildBasicAuditReport creates a strictly quality & trust baseline report', () => {
    const report = buildBasicAuditReport('https://example.com', 'scan-basic-001');

    expect(report.scanProfile).toBe('baseline_public');
    expect(report.checks).toBeDefined();
    expect(report.checks!.length).toBeGreaterThanOrEqual(30);

    // Should include completeness, trust, SEO, performance, accessibility
    const categories = new Set(report.checks!.map((c) => c.category));
    expect(categories.has('completeness')).toBe(true);
    expect(categories.has('trust')).toBe(true);
    expect(categories.has('seo')).toBe(true);
    expect(categories.has('performance')).toBe(true);
    expect(categories.has('accessibility')).toBe(true);

    // Deep comparison should show not active
    expect(report.deepComparison).toBeUndefined();

    // Basic audit summary should report 0 confirmed vulnerabilities
    expect(report.summary.confirmedVulnerabilities).toBe(0);
    expect(report.summary.totalChecksEvaluated).toBeGreaterThanOrEqual(30);
  });

  it('buildDeepAuditReport creates a distinct deep audit with 22 security tests & DPDP checks', () => {
    const report = buildDeepAuditReport('https://example.com', 'scan-deep-001');

    expect(report.scanProfile).toBe('authorized_deep');
    expect(report.checks).toBeDefined();
    // 34 basic + 22 deep security + 15 DPDP = 71 total checks
    expect(report.checks!.length).toBeGreaterThanOrEqual(55);

    // Deep comparison must be present and distinct
    expect(report.deepComparison).toBeDefined();
    expect(report.deepComparison!.totalDeepChecks ?? 0).toBeGreaterThanOrEqual(15);
    expect(report.deepComparison!.additionalSecurityTests!.length).toBeGreaterThanOrEqual(15);

    // Indian DPDP Act assessment must be present
    expect(report.privacyCompliance).toBeDefined();
    expect(report.privacyCompliance!.applicableLaw).toContain('Digital Personal Data Protection');
    expect(report.privacyCompliance!.disclaimer.toLowerCase()).toContain('legal');
    expect(report.privacyCompliance!.dpdpChecks!.length).toBe(15);
  });
});

describe('CheckRegistryView Component', () => {
  it('renders check registry, supports search and filtering by status', () => {
    const sampleChecks = [
      {
        checkId: 'B01_FOOTER',
        name: 'Footer Navigation Presence',
        category: 'completeness' as const,
        status: 'pass' as const,
        severity: 'info' as const,
        description: 'Standard footer located',
        evidence: { footerFound: true },
        remediation: 'None required',
        mode: 'baseline_public' as const,
        isSecurityVulnerability: false,
      },
      {
        checkId: 'D01_XSS_CANARY',
        name: 'Reflected Canary XSS Execution',
        category: 'security' as const,
        status: 'fail' as const,
        severity: 'high' as const,
        description: 'Safe canary reflected in DOM',
        evidence: { canary: '<vibesift_safe_xss_probe>' },
        remediation: 'Apply context-aware escaping',
        mode: 'authorized_deep' as const,
        isSecurityVulnerability: true,
        findingType: 'confirmed_vulnerability' as const,
      },
      {
        checkId: 'D17_BRUTE_FORCE_DEFENSE',
        name: 'Login Brute-Force Throttling',
        category: 'abuse' as const,
        status: 'not_tested' as const,
        severity: 'info' as const,
        description: 'No auth endpoint found',
        evidence: { reason: 'No login form' },
        remediation: 'Implement 429 rate limiting on /login',
        mode: 'authorized_deep' as const,
        isSecurityVulnerability: false,
      },
    ];

    render(<CheckRegistryView checks={sampleChecks} />);

    // Expect search & check count
    expect(screen.getByPlaceholderText(/Search checks/i)).toBeInTheDocument();
    expect(screen.getByText(/All \(/i)).toBeInTheDocument();
    expect(screen.getByText('B01_FOOTER')).toBeInTheDocument();
    expect(screen.getByText('D01_XSS_CANARY')).toBeInTheDocument();
    expect(screen.getByText('D17_BRUTE_FORCE_DEFENSE')).toBeInTheDocument();

    // Filter by 'fail' status
    const failFilterBtn = screen.getByRole('button', { name: /Failed/i });
    fireEvent.click(failFilterBtn);

    expect(screen.getByText('D01_XSS_CANARY')).toBeInTheDocument();
    expect(screen.queryByText('B01_FOOTER')).not.toBeInTheDocument();
  });
});

describe('PrivacyComplianceSection Component', () => {
  it('renders DPDP Act card with legal disclaimer and compliance summary', () => {
    const summary = {
      overallRating: 'partially_compliant' as const,
      checksPassed: 10,
      checksFailed: 3,
      checksWarning: 2,
      disclaimer: 'Preliminary automated assessment only. Not formal legal advice.',
      applicableLaw: 'Digital Personal Data Protection Act, 2023 (India)',
      dpdpChecks: [
        {
          section: 'Section 5(1)',
          item: 'Notice & Itemized Processing Description',
          status: 'pass' as const,
          details: 'Clear notice given before personal data collection.',
        },
        {
          section: 'Section 6(4)',
          item: 'Ease of Consent Withdrawal',
          status: 'fail' as const,
          details: 'No self-service consent revocation mechanism found.',
        },
      ],
      keyDeficiencies: ['No consent withdrawal widget', 'Missing DPO contact in India'],
    };

    render(<PrivacyComplianceSection summary={summary} />);

    expect(screen.getByText(/India DPDP Act 2023 & Privacy Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Preliminary Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Grievance Officer in India/i)).toBeInTheDocument();
    expect(screen.getByText(/Reject Choice Parity/i)).toBeInTheDocument();
  });
});

describe('DeepComparisonSection Component', () => {
  it('renders differential comparison between Basic and Deep audits', () => {
    const comparison = {
      totalBasicChecks: 34,
      totalDeepChecks: 22,
      additionalChecksExecuted: 22,
      independentTestsCount: 22,
      reusedEvidenceCount: 34,
      notTestedCount: 0,
      confirmedVulnerabilitiesCount: 1,
      potentialRisksCount: 2,
      additionalSecurityTests: [
        'Cross-Site Scripting (XSS) Canary Injection',
        'SQL Injection Safe Syntax Anomaly',
        'CORS Arbitrary Origin Reflection',
      ],
      skippedBasicChecksInDeep: [],
      scopeDifferenceDescription:
        'Deep Audit performs harmless canary injections, sensitive file probing with content verification, and TLS ciphersuite evaluation.',
    };

    render(<DeepComparisonSection comparison={comparison} scanProfile="authorized_deep" />);

    expect(screen.getByText(/Deep vs Basic Audit Differential/i)).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText(/Cross-Site Scripting \(XSS\) Canary Injection/i)).toBeInTheDocument();
  });
});
