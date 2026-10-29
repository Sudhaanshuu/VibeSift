const SEVERITY_PENALTIES = {
  critical: 25,
  high: 12,
  medium: 5,
  low: 2,
  info: 0,
};

const CATEGORIES = [
  'seo',
  'performance',
  'accessibility',
  'security',
  'cookies',
  'exposure',
  'privacy',
  'completeness',
  'trust',
  'infrastructure',
  'abuse',
];

/**
 * Calculates Launch Readiness Score (0-100) and category scores based on findings
 * @param {Array<{ category: string, severity: string }>} findings
 * @returns {{ readinessScore: number, categoryScores: Record<string, number>, counts: { total: number, critical: number, high: number, medium: number, low: number, info: number } }}
 */
export function calculateAuditScores(findings = []) {
  const counts = {
    total: findings.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const categoryDeductions = {};
  for (const cat of CATEGORIES) {
    categoryDeductions[cat] = 0;
  }

  let totalDeductions = 0;

  for (const finding of findings) {
    const sev = (finding.severity || 'info').toLowerCase();
    const penalty = SEVERITY_PENALTIES[sev] !== undefined ? SEVERITY_PENALTIES[sev] : 1;

    if (counts[sev] !== undefined) {
      counts[sev]++;
    }

    totalDeductions += penalty;

    const cat = (finding.category || 'security').toLowerCase();
    if (categoryDeductions[cat] !== undefined) {
      categoryDeductions[cat] += penalty * 1.5;
    } else {
      categoryDeductions[cat] = penalty * 1.5;
    }
  }

  // Calculate readiness score (max 100, min 0)
  const readinessScore = Math.max(0, Math.min(100, Math.round(100 - totalDeductions)));

  // Calculate category scores
  const categoryScores = {};
  for (const cat of CATEGORIES) {
    const rawCatScore = 100 - (categoryDeductions[cat] || 0);
    categoryScores[cat] = Math.max(0, Math.min(100, Math.round(rawCatScore)));
  }

  return {
    readinessScore,
    categoryScores,
    counts,
  };
}
