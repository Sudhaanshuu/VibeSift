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
 * Calculates Launch Readiness Score (0-100) and category scores based on findings,
 * real Lighthouse category scores, and check evaluations.
 * @param {Array<{ category: string, severity: string }>} findings
 * @param {object} [rawLighthouse]
 * @param {Array<object>} [checks]
 * @returns {{ readinessScore: number, categoryScores: Record<string, number>, counts: { total: number, critical: number, high: number, medium: number, low: number, info: number } }}
 */
export function calculateAuditScores(findings = [], rawLighthouse = null, checks = []) {
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

  // Calculate default category scores from deductions
  const categoryScores = {};
  for (const cat of CATEGORIES) {
    const rawCatScore = 100 - (categoryDeductions[cat] || 0);
    categoryScores[cat] = Math.max(0, Math.min(100, Math.round(rawCatScore)));
  }

  // If real Lighthouse audit categories are present, incorporate genuine engine scores
  const lhCats = rawLighthouse?.categories;
  if (lhCats) {
    if (lhCats.performance?.score !== undefined && lhCats.performance?.score !== null) {
      categoryScores.performance = Math.max(0, Math.min(100, Math.round(lhCats.performance.score * 100)));
    }
    if (lhCats.accessibility?.score !== undefined && lhCats.accessibility?.score !== null) {
      categoryScores.accessibility = Math.max(0, Math.min(100, Math.round(lhCats.accessibility.score * 100)));
    }
    if (lhCats['best-practices']?.score !== undefined && lhCats['best-practices']?.score !== null) {
      categoryScores['best-practices'] = Math.max(0, Math.min(100, Math.round(lhCats['best-practices'].score * 100)));
    }
    if (lhCats.seo?.score !== undefined && lhCats.seo?.score !== null) {
      categoryScores.seo = Math.max(0, Math.min(100, Math.round(lhCats.seo.score * 100)));
    }
  }

  // Calculate readiness score
  let readinessScore;
  if (lhCats) {
    // Weighted multi-pillar readiness score when real Lighthouse is available
    const weights = {
      security: 0.25,
      performance: 0.20,
      accessibility: 0.15,
      seo: 0.15,
      privacy: 0.15,
      completeness: 0.05,
      trust: 0.05,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    for (const [cat, weight] of Object.entries(weights)) {
      if (categoryScores[cat] !== undefined) {
        weightedSum += categoryScores[cat] * weight;
        totalWeight += weight;
      }
    }

    const baselineReadiness = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

    // Critical vulnerabilities cap readiness at 50 to prevent launching insecure software
    if (counts.critical > 0) {
      readinessScore = Math.min(50, baselineReadiness);
    } else {
      readinessScore = Math.max(0, Math.min(100, baselineReadiness));
    }
  } else {
    // Pure deduction based readiness score (clean backward compatibility for tests and offline audits)
    readinessScore = Math.max(0, Math.min(100, Math.round(100 - totalDeductions)));
  }

  return {
    readinessScore,
    categoryScores,
    counts,
  };
}
