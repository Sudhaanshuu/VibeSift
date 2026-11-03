/**
 * Deterministic Explanation & Executive Summary Service
 * Replaces external AI dependencies with fast, consistent, rules-based explanations.
 */
export class DeterministicExplanationService {
  async explainFinding(finding) {
    return {
      summary: finding.title,
      remediationSnippet: finding.remediation?.codeSnippet || null,
      explanation: `${finding.description} (Observed via ${finding.detectionMethod} inspection by ${finding.engine}).`,
      source: 'deterministic',
    };
  }

  async generateExecutiveSummary(reportSummary, topFindings = []) {
    const score = reportSummary.readinessScore;
    let posture = 'Strong';
    if (score < 50) posture = 'Critical Action Required';
    else if (score < 75) posture = 'Moderate Action Required';
    else if (score < 90) posture = 'Good - Minor Improvements Recommended';

    const criticalCount = reportSummary.critical || 0;
    const highCount = reportSummary.high || 0;

    return (
      `The launch-readiness score is ${score}/100 (${posture}). ` +
      `Identified ${reportSummary.totalFindings} total findings across inspected categories, ` +
      `including ${criticalCount} critical and ${highCount} high severity items requiring attention before production launch.`
    );
  }
}

export const explanationService = new DeterministicExplanationService();
