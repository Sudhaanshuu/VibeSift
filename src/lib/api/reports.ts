import { apiClient, USE_MOCK_API, ApiError } from './client';
import { mockStore } from './mockData';
import { AuditReport, VerificationStatus } from '../../types/audit';

/**
 * Retrieves a full detailed audit report by scan ID.
 */
export async function getReport(scanId: string): Promise<AuditReport> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 200));
    const report = mockStore.getScan(scanId);
    if (!report) {
      throw new ApiError(`Audit report "${scanId}" does not exist.`, 404, 'REPORT_NOT_FOUND');
    }
    return report;
  }

  return apiClient<AuditReport>(`/reports/${encodeURIComponent(scanId)}`);
}

/**
 * Marks a finding resolution status (e.g. 'open' | 'fixed' | 'waived').
 */
export async function resolveFinding(
  scanId: string,
  findingId: string,
  status: VerificationStatus
): Promise<void> {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 250));
    const ok = mockStore.resolveFinding(scanId, findingId, status);
    if (!ok) {
      throw new ApiError(`Finding "${findingId}" could not be updated.`, 404, 'FINDING_NOT_FOUND');
    }
    return;
  }

  return apiClient<void>(`/reports/${encodeURIComponent(scanId)}/findings/${encodeURIComponent(findingId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Generates an executive Markdown audit report.
 */
export function generateReportMarkdown(report: AuditReport): string {
  const dateStr = new Date(report.createdAt).toUTCString();

  let md = `# Website Audit Report: ${report.normalizedHostname}\n\n`;
  md += `**Target Website:** ${report.targetUrl}  \n`;
  md += `**Audit Mode:** ${report.scanProfile === 'authorized_deep' ? 'Authorized Deep Security & DPDP Audit' : 'Basic Public Quality & SEO Audit'}  \n`;
  md += `**Scan ID:** \`${report.scanId}\`  \n`;
  md += `**Audit Date:** ${dateStr}  \n`;
  md += `**Status:** ${report.status}  \n`;
  md += `**Launch Readiness Score:** ${report.summary.readinessScore}/100  \n\n`;

  md += `## Audit Execution Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|---|---|\n`;
  md += `| Total Checks Evaluated | ${report.summary.totalChecks ?? report.checks?.length ?? report.summary.totalFindings} |\n`;
  md += `| Checks Passed | ${report.summary.passedChecks ?? 0} |\n`;
  md += `| Actionable Findings / Failures | ${report.summary.failedChecks ?? (report.summary.critical + report.summary.high)} |\n`;
  md += `| Warnings | ${report.summary.warningChecks ?? (report.summary.medium + report.summary.low)} |\n`;
  md += `| Not Tested / Skipped | ${report.summary.notTestedChecks ?? 0} |\n`;
  md += `| Confirmed Vulnerabilities | ${report.summary.confirmedVulnerabilities ?? report.summary.critical} |\n`;
  md += `| Potential Risks | ${report.summary.potentialRisks ?? report.summary.medium} |\n\n`;

  if (report.deepComparison) {
    const dc = report.deepComparison;
    md += `## Deep Audit vs Basic Audit Comparison\n\n`;
    md += `- **Additional Checks Executed:** ${dc.additionalChecksExecuted}\n`;
    md += `- **Independent Security Tests:** ${dc.independentTestsCount}\n`;
    md += `- **Reused Baseline Observations:** ${dc.reusedEvidenceCount}\n`;
    md += `- **Tests Omitted with Reason:** ${dc.notTestedCount}\n\n`;
  }

  if (report.privacyCompliance) {
    const pc = report.privacyCompliance;
    md += `## Privacy & Indian DPDP Act (2023) Assessment\n\n`;
    md += `> **Disclaimer:** ${pc.disclaimer}\n\n`;
    md += `- **Compliance Rating:** **${(pc.complianceRating || pc.overallRating || 'needs_attention').toUpperCase()}**\n`;
    md += `- **Privacy Signals Verified:** ${pc.checksPassed}/${pc.checksTotal}\n`;
    md += `- **Grievance Officer in India:** ${pc.hasGrievanceOfficer ? 'Disclosed ✅' : 'Missing ⚠️'}\n`;
    md += `- **Consent Reject Parity:** ${pc.hasRejectParity ? 'Balanced ✅' : 'Asymmetric / Missing ⚠️'}\n`;
    md += `- **Pre-Consent Trackers:** ${pc.hasTrackersBeforeConsent ? 'Active before consent ⚠️' : 'None detected ✅'}\n\n`;
  }

  md += `## Category Scores\n\n`;
  md += `| Category | Score |\n`;
  md += `|---|---|\n`;
  Object.entries(report.summary.categoryScores).forEach(([cat, score]) => {
    md += `| ${cat.toUpperCase()} | ${score}/100 |\n`;
  });

  md += `\n## Detailed Findings (${report.findings.length})\n\n`;
  report.findings.forEach((f, idx) => {
    md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n\n`;
    md += `- **Rule ID:** \`${f.ruleId}\`\n`;
    md += `- **Category:** ${f.category}\n`;
    md += `- **Affected URL:** ${f.affectedUrl}\n`;
    md += `- **Detection Method:** ${f.detectionMethod}\n`;
    md += `- **Verification Status:** ${f.verificationStatus}\n\n`;
    md += `**Description:**  \n${f.description}\n\n`;
    md += `**Impact:**  \n${f.impact}\n\n`;
    md += `**Remediation Guidance:**  \n${f.remediation.summary}\n\n`;
    if (f.remediation.codeSnippet) {
      md += `\`\`\`\n${f.remediation.codeSnippet}\n\`\`\`\n\n`;
    }
    if (f.evidence?.observedHeader || f.evidence?.responseSnippet) {
      md += `**Observed Evidence:**  \n\`\`\`\n${f.evidence.observedHeader || f.evidence.responseSnippet}\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
  });

  md += `## What Was Not Tested\n\n`;
  report.checksNotPerformed.forEach((item) => {
    md += `- ${item}\n`;
  });

  return md;
}

/**
 * Initiates browser download of JSON report.
 */
export function downloadReportJson(report: AuditReport): void {
  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibesift-audit-${report.normalizedHostname}-${report.scanId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
