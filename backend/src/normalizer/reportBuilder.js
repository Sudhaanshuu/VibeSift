import { deduplicateFindings } from './findingsNormalizer.js';
import { calculateAuditScores } from './scoring.js';

/**
 * Extracts Core Web Vitals and key audits from live Lighthouse results into unified AuditCheckResult records.
 * @param {object} rawLighthouse
 * @param {string} hostname
 * @returns {Array<object>}
 */
export function extractLighthouseChecks(rawLighthouse, hostname = '') {
  if (!rawLighthouse || !rawLighthouse.audits) return [];
  const now = new Date().toISOString();
  const lhAudits = [
    { id: 'first-contentful-paint', name: 'First Contentful Paint (FCP)', category: 'performance' },
    { id: 'largest-contentful-paint', name: 'Largest Contentful Paint (LCP)', category: 'performance' },
    { id: 'total-blocking-time', name: 'Total Blocking Time (TBT)', category: 'performance' },
    { id: 'cumulative-layout-shift', name: 'Cumulative Layout Shift (CLS)', category: 'performance' },
    { id: 'speed-index', name: 'Speed Index', category: 'performance' },
    { id: 'interactive', name: 'Time to Interactive (TTI)', category: 'performance' },
    { id: 'color-contrast', name: 'Background and Foreground Color Contrast', category: 'accessibility' },
    { id: 'image-alt', name: 'Image Alternative Text Elements', category: 'accessibility' },
    { id: 'document-title', name: 'Document Title Element', category: 'seo' },
    { id: 'viewport', name: 'Mobile Viewport Meta Tag', category: 'seo' },
    { id: 'meta-description', name: 'Meta Description Tag', category: 'seo' },
    { id: 'crawlable-anchors', name: 'Crawlable Anchor Links', category: 'seo' },
    { id: 'http-status-code', name: 'Successful HTTP Status Code', category: 'seo' },
    { id: 'is-on-https', name: 'HTTPS Encryption and Transport Security', category: 'security' },
    { id: 'errors-in-console', name: 'Browser Console Error Logging', category: 'completeness' },
  ];

  const checks = [];
  for (const item of lhAudits) {
    const a = rawLighthouse.audits[item.id];
    if (!a) continue;

    let status = 'pass';
    let severity = 'info';
    let findingType = 'informational';

    if (a.score === null || a.scoreDisplayMode === 'notApplicable') {
      status = 'not_applicable';
    } else if (a.score === 1) {
      status = 'pass';
    } else if (a.score >= 0.5) {
      status = 'warning';
      severity = 'medium';
      findingType = 'potential_risk';
    } else {
      status = 'fail';
      severity = item.category === 'security' ? 'high' : 'medium';
      findingType = item.category === 'security' ? 'confirmed_vulnerability' : 'potential_risk';
    }

    checks.push({
      checkId: `LH_${item.id.toUpperCase().replace(/-/g, '_')}`,
      name: item.name || a.title,
      category: item.category,
      status,
      severity,
      findingType,
      auditMode: 'basic',
      explanation: a.description ? a.description.split('.')[0] + '.' : `${item.name} evaluated by Lighthouse.`,
      evidence: {
        displayValue: a.displayValue || (a.numericValue ? `${Math.round(a.numericValue)}ms` : undefined),
        numericValue: a.numericValue,
        score: a.score,
      },
      testTimestamp: now,
      scope: `lighthouse:${hostname}`,
      isIndependent: true,
    });
  }
  return checks;
}

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
 * @param {Array<object>} [params.checks]
 * @param {object} [params.rawLighthouse]
 * @param {object} [params.privacyCompliance]
 * @param {object} [params.deepComparison]
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
  checks = [],
  rawLighthouse = null,
  privacyCompliance = null,
  deepComparison = null,
  errorMessage,
  errorCategory,
}) {
  const deduplicated = deduplicateFindings(allFindings);

  // Combine Python checks with extracted Lighthouse checks
  const lhChecks = extractLighthouseChecks(rawLighthouse, normalizedHostname);
  const combinedChecks = [...(checks || []), ...lhChecks];
  const seenCheckIds = new Set();
  const finalChecks = combinedChecks.filter((c) => {
    if (!c || !c.checkId) return false;
    if (seenCheckIds.has(c.checkId)) return false;
    seenCheckIds.add(c.checkId);
    return true;
  });

  const scoreResult = calculateAuditScores(deduplicated, rawLighthouse, finalChecks);

  const durationSeconds = Math.max(
    1,
    Math.round((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000)
  );

  const defaultChecksNotPerformed = [
    'Destructive exploitation, mass denial-of-service, and fuzzing are excluded by policy.',
    'Backend private source code repositories and production database internal states were not accessed.',
    'Authenticated internal admin routes requiring session credentials were not accessed.',
  ];

  if (scanProfile === 'baseline_public') {
    defaultChecksNotPerformed.push('Deep active security tests (XSS canary injection, SQLi syntax verification, CORS reflection) omitted in Basic Public Audit.');
  }

  const finalChecksNotPerformed = checksNotPerformed.length > 0 ? checksNotPerformed : defaultChecksNotPerformed;

  // Calculate check counts
  const totalChecks = finalChecks.length;
  const passedChecks = finalChecks.filter((c) => c.status === 'pass').length;
  const failedChecks = finalChecks.filter((c) => c.status === 'fail').length;
  const warningChecks = finalChecks.filter((c) => c.status === 'warning').length;
  const infoChecks = finalChecks.filter((c) => c.status === 'info').length;
  const notTestedChecks = finalChecks.filter((c) => c.status === 'not_tested').length;
  const unknownChecks = finalChecks.filter((c) => c.status === 'unknown').length;
  const notApplicableChecks = finalChecks.filter((c) => c.status === 'not_applicable').length;

  const confirmedFromFindings = deduplicated.filter(
    (f) => f.confidence === 'certain' || f.severity === 'critical' || f.severity === 'high'
  ).length;
  const confirmedFromChecks = finalChecks.filter(
    (c) => c.findingType === 'confirmed_vulnerability' || (c.isSecurityVulnerability && c.status === 'fail')
  ).length;
  const confirmedVulnerabilities = Math.max(confirmedFromFindings, confirmedFromChecks);

  const potentialFromFindings = deduplicated.filter(
    (f) => f.severity === 'medium' || f.severity === 'low'
  ).length;
  const potentialFromChecks = finalChecks.filter(
    (c) => c.findingType === 'potential_risk' || (!c.isSecurityVulnerability && c.status === 'fail')
  ).length;
  const potentialRisks = Math.max(potentialFromFindings, potentialFromChecks);

  // If deepComparison not provided but authorized_deep, generate comparison metrics
  let finalDeepComparison = deepComparison;
  if (!finalDeepComparison && scanProfile === 'authorized_deep') {
    const deepChecks = finalChecks.filter((c) => c.auditMode === 'deep');
    finalDeepComparison = {
      additionalChecksExecuted: deepChecks.length,
      independentTestsCount: deepChecks.filter((c) => c.isIndependent !== false).length,
      reusedEvidenceCount: finalChecks.filter((c) => c.auditMode === 'basic').length,
      notTestedCount: deepChecks.filter((c) => c.status === 'not_tested').length,
      confirmedVulnerabilitiesCount: confirmedVulnerabilities,
      potentialRisksCount: potentialRisks,
      additionalTestNames: deepChecks.map((c) => c.name),
      skippedTestReasons: {
        D17_BRUTE_FORCE_DEFENSE: 'Active credential brute-forcing omitted without explicit test credentials to prevent account lockout.',
      },
    };
  }

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
      totalChecks,
      totalChecksEvaluated: totalChecks,
      passedChecks,
      checksPassed: passedChecks,
      failedChecks,
      checksFailed: failedChecks,
      warningChecks,
      checksWarning: warningChecks,
      infoChecks,
      notTestedChecks,
      checksNotTested: notTestedChecks,
      unknownChecks,
      notApplicableChecks,
      checksNotApplicable: notApplicableChecks,
      confirmedVulnerabilities,
      potentialRisks,
    },
    enginesRun,
    checksNotPerformed: finalChecksNotPerformed,
    findings: deduplicated,
    checks: finalChecks,
    privacyCompliance,
    deepComparison: finalDeepComparison,
    errorMessage,
    errorCategory,
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

  let md = `# Website Audit Report: ${report.normalizedHostname}\n\n`;
  md += `**Target Website:** ${report.targetUrl}  \n`;
  md += `**Audit Mode:** ${report.scanProfile === 'authorized_deep' ? 'Deep Security & Compliance Audit' : 'Basic Public Quality & SEO Audit'}  \n`;
  md += `**Scan ID:** \`${report.scanId}\`  \n`;
  md += `**Audit Date:** ${dateStr}  \n`;
  md += `**Status:** ${report.status}  \n`;
  md += `**Launch Readiness Score:** ${summary.readinessScore}/100  \n\n`;

  md += `## Audit Execution & Checks Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `| :--- | :--- |\n`;
  md += `| **Total Checks Evaluated** | ${summary.totalChecks ?? summary.totalFindings} |\n`;
  md += `| **Checks Passed** | ${summary.passedChecks ?? 0} |\n`;
  md += `| **Actionable Findings / Failures** | ${summary.failedChecks ?? (summary.critical + summary.high)} |\n`;
  md += `| **Warnings** | ${summary.warningChecks ?? (summary.medium + summary.low)} |\n`;
  md += `| **Not Tested / Skipped** | ${summary.notTestedChecks ?? 0} |\n`;
  md += `| **Confirmed Vulnerabilities** | ${summary.confirmedVulnerabilities ?? summary.critical} |\n`;
  md += `| **Potential Risks** | ${summary.potentialRisks ?? summary.medium} |\n\n`;

  if (report.deepComparison) {
    const dc = report.deepComparison;
    md += `## Deep Audit vs Basic Audit Comparison\n\n`;
    md += `- **Additional Security Checks Executed:** ${dc.additionalChecksExecuted}\n`;
    md += `- **Independent Security Tests:** ${dc.independentTestsCount}\n`;
    md += `- **Reused Baseline Observations:** ${dc.reusedEvidenceCount}\n`;
    md += `- **Tests Omitted with Reason:** ${dc.notTestedCount}\n\n`;
  }

  if (report.privacyCompliance && (report.privacyCompliance.complianceRating || report.privacyCompliance.overallRating)) {
    const pc = report.privacyCompliance;
    md += `## Privacy & Indian DPDP Act (2023) Assessment\n\n`;
    md += `> **Disclaimer:** ${pc.disclaimer || 'Preliminary automated assessment only.'}\n\n`;
    md += `- **Compliance Rating:** **${(pc.complianceRating || pc.overallRating || 'needs_attention').toUpperCase()}**\n`;
    md += `- **Privacy Signals Verified:** ${pc.checksPassed ?? 0}/${pc.checksTotal ?? 0}\n`;
    md += `- **Grievance Officer in India:** ${pc.hasGrievanceOfficer ? 'Disclosed ✅' : 'Missing ⚠️'}\n`;
    md += `- **Consent Reject Parity:** ${pc.hasRejectParity ? 'Balanced ✅' : 'Asymmetric / Missing ⚠️'}\n`;
    md += `- **Pre-Consent Trackers:** ${pc.hasTrackersBeforeConsent ? 'Active before consent ⚠️' : 'None detected ✅'}\n\n`;
  }

  md += `## Category Scores\n\n`;
  md += `| Category | Score |\n`;
  md += `| :--- | :--- |\n`;
  for (const [cat, score] of Object.entries(summary.categoryScores)) {
    md += `| ${cat.toUpperCase()} | ${score}/100 |\n`;
  }
  md += `\n`;

  if (report.findings.length > 0) {
    md += `## Actionable Findings (${report.findings.length})\n\n`;
    for (const f of report.findings) {
      md += `### [${f.severity.toUpperCase()}] ${f.title}\n\n`;
      md += `- **Rule ID:** \`${f.ruleId}\`\n`;
      md += `- **Category:** \`${f.category}\`\n`;
      md += `- **Affected URL:** \`${f.affectedUrl}\`\n`;
      md += `- **Description:** ${f.description}\n`;
      md += `- **Impact:** ${f.impact}\n`;
      md += `- **Remediation:** ${f.remediation.summary}\n\n`;
    }
  }

  return md;
}
