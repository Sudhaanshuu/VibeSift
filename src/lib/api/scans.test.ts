import { describe, it, expect } from 'vitest';
import { submitScan, getScanStatus, rescanTarget, cancelScan } from './scans';
import { isScanTerminal, TERMINAL_SCAN_STATUSES } from '../../hooks/useScans';

describe('Scan API & Lifecycle State Machine', () => {
  it('correctly categorizes terminal scan statuses', () => {
    expect(isScanTerminal('COMPLETED')).toBe(true);
    expect(isScanTerminal('PARTIAL')).toBe(true);
    expect(isScanTerminal('FAILED')).toBe(true);
    expect(isScanTerminal('CANCELLED')).toBe(true);

    expect(isScanTerminal('QUEUED')).toBe(false);
    expect(isScanTerminal('VALIDATING')).toBe(false);
    expect(isScanTerminal('RUNNING')).toBe(false);
    expect(isScanTerminal('NORMALIZING')).toBe(false);
    expect(isScanTerminal(undefined)).toBe(false);
  });

  it('submits a new scan job and returns initial status', async () => {
    const submission = await submitScan({
      url: 'https://vibe-landing-demo.dev',
      profile: 'baseline_public',
      acknowledgedTerms: true,
    });

    expect(submission.scanId).toBeDefined();
    expect(submission.scanId).toMatch(/^scan-/);
    expect(submission.status).toBe('QUEUED');
    expect(submission.targetUrl).toBe('https://vibe-landing-demo.dev');

    // Retrieve initial status
    const report = await getScanStatus(submission.scanId);
    expect(report.scanId).toBe(submission.scanId);
    expect(report.normalizedHostname).toBe('vibe-landing-demo.dev');
  });

  it('handles scan cancellation', async () => {
    const submission = await submitScan({
      url: 'https://cancel-test.dev',
      profile: 'baseline_public',
      acknowledgedTerms: true,
    });

    await cancelScan(submission.scanId);
    const report = await getScanStatus(submission.scanId);
    expect(report.status).toBe('CANCELLED');
    expect(isScanTerminal(report.status)).toBe(true);
  });

  it('triggers a rescan creating a new linked audit ID', async () => {
    const initial = await submitScan({
      url: 'https://rescan-test.dev',
      profile: 'baseline_public',
      acknowledgedTerms: true,
    });

    const rescanned = await rescanTarget(initial.scanId);
    expect(rescanned.scanId).not.toBe(initial.scanId);
    expect(rescanned.targetUrl).toBe(initial.targetUrl);
  });

  it('correctly reports failure with reason and error message instead of mock data', async () => {
    const submission = await submitScan({
      url: 'https://fail-test-unreachable.dev',
      profile: 'baseline_public',
      acknowledgedTerms: true,
    });

    await new Promise((r) => setTimeout(r, 1400));
    const report = await getScanStatus(submission.scanId);
    expect(report.status).toBe('FAILED');
    expect(report.errorMessage).toBeDefined();
    expect(report.errorMessage).toContain('Target website is unreachable');
    expect(report.findings).toHaveLength(0);
  });
});
