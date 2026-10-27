import { deduplicateFindings } from './findingsNormalizer.js';
import { calculateAuditScores } from './scoring.js';

/**
 * Builds the comprehensive AuditReport data structure
 * @param {object} params
 * @param {string} params.scanId
 * @param {string} params.ownerUserId
 * @param {string} params.targetUrl
 * @param {string} params.normalizedHostname
 * @param {'baseline_public' | 'authorized_deep'} params.scanProfile
 * @param {'COMPLETED' | 'PARTIAL' | 'FAILED'} params.status
 * @param {string} params.createdAt
 * @param {string} [params.completedAt]
 * @param {Array<object>} params.allFindings
 * @param {Array<object>} params.enginesRun
 * @param {Array<string>} [params.checksNotPerformed]
 * @returns {object} AuditReport
 */
export function buildAuditReport({
  scanId,
  ownerUserId,
  targetUrl,
  normalizedHostname,
  scanProfile,
  status,
  createdAt,
  completedAt = new Date().toISOString(),
  allFindings = [],
  enginesRun = [],
  checksNotPerformed = [],
}) {
  const deduplicated = deduplicateFindings(allFindings);
  const scoreResult = calculateAuditScores(deduplicated);

  const durationSeconds = Math.max(
    1,
    Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000)
  );

  const defaultChecksNotPerformed = [
    'Destructive exploitation and denial-of-service tests are excluded by policy.',
    'Backend source code, internal SQL query formulation, and private databases were not inspected.',
    'Authenticated internal admin routes requiring session credentials were not accessed.',
  ];

  if (scanProfile === 'baseline_public') {
    defaultChecksNotPerformed.push('Authorized active vulnerability scanning (OWASP ZAP / Nuclei) was skipped because baseline profile was chosen.');
  }

  const finalChecksNotPerformed = checksNotPerformed.length > 0 ? checksNotPerformed : defaultChecksNotPerformed;

  return {
    scanId,
    ownerUserId,
    targetUrl,
    normalizedHostname,
    scanProfile,
    status,
    createdAt,
    completedAt,
    durationSeconds,
    summary: {
      totalFindings: scoreResult.counts.total,
      critical: scoreResult.counts.critical,
      high: scoreResult.counts.high,
      medium: scoreResult.counts.medium,
      low: scoreResult.counts.low,
      info: scoreResult.counts.info,
      readinessScore: scoreResult.readinessScore,
      categoryScores: scoreResult.categoryScores,
    },
    enginesRun,
    checksNotPerformed: finalChecksNotPerformed,
    findings: deduplicated,
  };
}

/**
 * Builds the executive Markdown version of the audit report
 * @param {object} report
 * @returns {string}
 */
export function generateMarkdownReport(report) {
  const dateStr = new Date(report.createdAt).toUTCString();
  const summary = report.summary;

  let md = `# Website Launch-Readiness Audit Report\n\n`;
  md += `**Target Website:** ${report.targetUrl}  \n`;
  md += `**Normalized Hostname:** \`${report.normalizedHostname}\`  \n`;
  md += `**Scan ID:** \`${report.scanId}\`  \n`;
  md += `**Audit Date:** ${dateStr}  \n`;
  md += `**Scan Profile:** ${report.scanProfile}  \n`;
  md += `**Execution Status:** ${report.status}  \n`;
  md += `**Launch Readiness Score:** ${summary.readinessScore}/100  \n\n`;

  md += `## Category Scores\n\n`;
  md += `| Category | Score |\n`;
  md += `| :--- | :--- |\n`;
  for (const [cat, score] of Object.entries(summary.categoryScores)) {
    md += `| **${cat.toUpperCase()}** | ${score}/100 |\n`;
  }

  md += `\n## Severity Breakdown\n\n`;
  md += `- **Critical:** ${summary.critical}\n`;
  md += `- **High:** ${summary.high}\n`;
  md += `- **Medium:** ${summary.medium}\n`;
  md += `- **Low:** ${summary.low}\n`;
  md += `- **Informational:** ${summary.info}\n\n`;

  md += `## Engine Execution Status\n\n`;
  md += `| Engine | Display Name | Status | Duration |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  for (const eng of report.enginesRun) {
    const time = eng.executionTimeMs ? `${eng.executionTimeMs}ms` : 'N/A';
    md += `| \`${eng.engine}\` | ${eng.displayName} | **${eng.status}** | ${time} |\n`;
  }

  md += `\n## Detailed Findings (${report.findings.length})\n\n`;
  if (report.findings.length === 0) {
    md += `*No security, performance, or SEO findings observed.*  \n\n`;
  } else {
    report.findings.forEach((f, idx) => {
      md += `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n\n`;
      md += `- **Rule ID:** \`${f.ruleId}\`\n`;
      md += `- **Category:** ${f.category}\n`;
      md += `- **Engine:** ${f.engine}\n`;
      md += `- **Detection Method:** ${f.detectionMethod}\n`;
      md += `- **Affected URL:** \`${f.affectedUrl}\`\n\n`;
      md += `**Description:**  \n${f.description}\n\n`;
      md += `**Impact:**  \n${f.impact}\n\n`;
      md += `**Recommended Remediation:**  \n${f.remediation.summary}\n\n`;

      if (f.remediation.codeSnippet) {
        md += `\`\`\`\n${f.remediation.codeSnippet}\n\`\`\`\n\n`;
      }

      if (f.evidence?.observedHeader || f.evidence?.responseSnippet || f.evidence?.reproductionCurl) {
        md += `**Observed Evidence:**  \n\`\`\`\n`;
        if (f.evidence.observedHeader) md += `Observed Header: ${f.evidence.observedHeader}\n`;
        if (f.evidence.responseSnippet) md += `Snippet: ${f.evidence.responseSnippet}\n`;
        if (f.evidence.reproductionCurl) md += `Reproduction: ${f.evidence.reproductionCurl}\n`;
        md += `\`\`\`\n\n`;
      }
      md += `---\n\n`;
    });
  }

  md += `## Scope Limitations and Untested Areas\n\n`;
  report.checksNotPerformed.forEach((item) => {
    md += `- ${item}\n`;
  });

  return md;
}
