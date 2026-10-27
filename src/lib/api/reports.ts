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
  const findingsBySev = {
    critical: report.findings.filter((f) => f.severity === 'critical'),
    high: report.findings.filter((f) => f.severity === 'high'),
    medium: report.findings.filter((f) => f.severity === 'medium'),
    low: report.findings.filter((f) => f.severity === 'low'),
    info: report.findings.filter((f) => f.severity === 'info'),
  };

  let md = `# Website Launch-Readiness Audit Report\n\n`;
  md += `**Target Website:** ${report.targetUrl}  \n`;
  md += `**Scan ID:** \`${report.scanId}\`  \n`;
  md += `**Audit Date:** ${dateStr}  \n`;
  md += `**Scan Profile:** ${report.scanProfile}  \n`;
  md += `**Status:** ${report.status}  \n`;
  md += `**Launch Readiness Score:** ${report.summary.readinessScore}/100  \n\n`;

  md += `## Category Scores\n\n`;
  md += `| Category | Score |\n`;
  md += `|---|---|\n`;
  Object.entries(report.summary.categoryScores).forEach(([cat, score]) => {
    md += `| ${cat.toUpperCase()} | ${score}/100 |\n`;
  });

  md += `\n## Severity Breakdown\n\n`;
  md += `- **Critical:** ${report.summary.critical}\n`;
  md += `- **High:** ${report.summary.high}\n`;
  md += `- **Medium:** ${report.summary.medium}\n`;
  md += `- **Low:** ${report.summary.low}\n`;
  md += `- **Informational:** ${report.summary.info}\n\n`;

  md += `## Detailed Findings (${report.findings.length})\n\n`;
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
 * Downloads report as formatted JSON file.
 */
export function downloadReportJson(report: AuditReport): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `audit-report-${report.normalizedHostname}-${report.scanId}.json`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
