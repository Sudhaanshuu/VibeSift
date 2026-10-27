import crypto from 'node:crypto';

// Redaction regex patterns
const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,                                        // AWS Access Key ID
  /([a-zA-Z0-9+/]{40})/g,                                      // Potential AWS Secret Key (context dependent)
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,                          // Bearer tokens
  /ghp_[0-9a-zA-Z]{36}/g,                                      // GitHub Personal Access Token
  /(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi, // Secret assignments
];

/**
 * Redacts sensitive credentials, tokens, and secrets from text
 * @param {string} text
 * @returns {string}
 */
export function redactSensitiveData(text) {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;

  // AWS Access Key
  sanitized = sanitized.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA[REDACTED_AWS_KEY]');
  
  // Bearer tokens
  sanitized = sanitized.replace(/bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, 'Bearer [REDACTED_TOKEN]');

  // Password / API key assignments
  sanitized = sanitized.replace(
    /((?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*['"]?)[^'"\s]+(['"]?)/gi,
    '$1[REDACTED]$2'
  );

  return sanitized;
}

/**
 * Computes deterministic deduplication hash for finding
 */
function computeDeduplicationKey(f) {
  return `${f.ruleId}:${f.category}:${f.affectedUrl}:${f.severity}`;
}

/**
 * Deduplicates findings while preserving multiple evidence references
 * @param {Array<object>} findings
 * @returns {Array<object>}
 */
export function deduplicateFindings(findings = []) {
  const map = new Map();

  for (const finding of findings) {
    const key = computeDeduplicationKey(finding);
    if (!map.has(key)) {
      map.set(key, { ...finding });
    } else {
      const existing = map.get(key);
      // Append secondary evidence snippet if new
      if (finding.evidence?.responseSnippet && existing.evidence?.responseSnippet !== finding.evidence.responseSnippet) {
        existing.evidence.secondarySnippets = existing.evidence.secondarySnippets || [];
        if (existing.evidence.secondarySnippets.length < 3) {
          existing.evidence.secondarySnippets.push(finding.evidence.responseSnippet);
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Normalizes Python inspection worker raw JSON into unified Findings
 * @param {object} raw
 * @param {string} scanId
 * @param {string} targetUrl
 * @returns {Array<object>}
 */
export function normalizePythonFindings(raw, scanId, targetUrl) {
  if (!raw || !Array.isArray(raw.findings)) return [];

  return raw.findings.map((item, index) => {
    const id = `fnd_py_${scanId.slice(0, 8)}_${index + 1}_${crypto.randomBytes(3).toString('hex')}`;
    const sanitizedTitle = redactSensitiveData(item.title);
    const sanitizedDesc = redactSensitiveData(item.description);
    const sanitizedImpact = redactSensitiveData(item.impact || 'Potential security or discoverability risk.');
    const sanitizedRemediation = item.remediation ? {
      summary: redactSensitiveData(item.remediation.summary || ''),
      codeSnippet: item.remediation.codeSnippet || undefined,
      diffBefore: item.remediation.diffBefore || undefined,
      diffAfter: item.remediation.diffAfter || undefined,
      frameworkNotes: item.remediation.frameworkNotes || undefined,
      docUrl: item.remediation.docUrl || undefined,
    } : { summary: 'Follow web standards to resolve this finding.' };

    const evidence = item.evidence ? {
      observedHeader: redactSensitiveData(item.evidence.observedHeader),
      expectedHeader: item.evidence.expectedHeader,
      responseSnippet: redactSensitiveData(item.evidence.responseSnippet),
      domSelector: item.evidence.domSelector,
      metrics: item.evidence.metrics,
      reproductionCurl: redactSensitiveData(item.evidence.reproductionCurl),
    } : {};

    return {
      id,
      scanId,
      ruleId: item.ruleId || 'PYTHON_INSPECT_CHECK',
      category: item.category || 'security',
      severity: item.severity || 'low',
      confidence: item.confidence || 'high',
      title: sanitizedTitle,
      description: sanitizedDesc,
      affectedUrl: item.affectedUrl || targetUrl,
      detectionMethod: item.detectionMethod || 'passive',
      engine: 'custom-python',
      evidence,
      impact: sanitizedImpact,
      remediation: sanitizedRemediation,
      verificationStatus: 'open',
    };
  });
}

/**
 * Normalizes Lighthouse runner output into unified Findings
 * @param {object} raw
 * @param {string} scanId
 * @param {string} targetUrl
 * @returns {Array<object>}
 */
export function normalizeLighthouseFindings(raw, scanId, targetUrl) {
  if (!raw || !raw.audits) return [];

  const findings = [];
  let index = 0;

  for (const [auditKey, audit] of Object.entries(raw.audits)) {
    // Only capture audits that failed (score < 0.9 or score === 0)
    if (audit.score === null || audit.score === 1 || audit.scoreDisplayMode === 'notApplicable') {
      continue;
    }

    if (audit.score >= 0.9) {
      continue; // Pass
    }

    index++;
    const id = `fnd_lh_${scanId.slice(0, 8)}_${index}_${crypto.randomBytes(3).toString('hex')}`;

    let category = 'performance';
    let severity = 'low';

    // Map Lighthouse categories
    if (auditKey.includes('seo') || auditKey.includes('crawl') || auditKey.includes('viewport') || auditKey.includes('meta')) {
      category = 'seo';
      severity = 'medium';
    } else if (auditKey.includes('color-contrast') || auditKey.includes('aria') || auditKey.includes('label') || auditKey.includes('alt')) {
      category = 'accessibility';
      severity = auditKey.includes('color-contrast') ? 'medium' : 'high';
    } else if (auditKey.includes('is-on-https') || auditKey.includes('csp') || auditKey.includes('vulnerable-libraries')) {
      category = 'security';
      severity = auditKey.includes('vulnerable-libraries') ? 'high' : 'medium';
    } else {
      // Performance metrics
      if (audit.score < 0.5) severity = 'high';
      else if (audit.score < 0.8) severity = 'medium';
      else severity = 'low';
    }

    findings.push({
      id,
      scanId,
      ruleId: `LH_${auditKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`,
      category,
      severity,
      confidence: 'certain',
      title: audit.title || auditKey,
      description: redactSensitiveData(audit.description || ''),
      affectedUrl: targetUrl,
      detectionMethod: 'active',
      engine: 'lighthouse',
      evidence: {
        metrics: {
          score: audit.score,
          numericValue: audit.numericValue ? Math.round(audit.numericValue) : undefined,
          displayValue: audit.displayValue || '',
        },
      },
      impact: `Affects user experience, Core Web Vitals, or search indexing.`,
      remediation: {
        summary: `Address ${audit.title}. Review recommendations in Lighthouse audit details.`,
        docUrl: audit.description?.match(/\[.*?\]\((https?:\/\/.*?)\)/)?.[1],
      },
      verificationStatus: 'open',
    });
  }

  return findings;
}

/**
 * Normalizes OWASP ZAP baseline JSON report into unified Findings
 * @param {object} raw
 * @param {string} scanId
 * @param {string} targetUrl
 * @returns {Array<object>}
 */
export function normalizeZapFindings(raw, scanId, targetUrl) {
  if (!raw) return [];

  const siteAlerts = raw.site?.[0]?.alerts || raw.alerts || [];
  const findings = [];
  let index = 0;

  for (const alert of siteAlerts) {
    index++;
    const id = `fnd_zap_${scanId.slice(0, 8)}_${index}_${crypto.randomBytes(3).toString('hex')}`;

    // Map ZAP Risk: 3 = High, 2 = Medium, 1 = Low, 0 = Informational
    let severity = 'low';
    const risk = String(alert.riskcode || alert.riskdesc || '').toLowerCase();
    if (risk.includes('3') || risk.includes('high')) severity = 'high';
    else if (risk.includes('2') || risk.includes('medium')) severity = 'medium';
    else if (risk.includes('1') || risk.includes('low')) severity = 'low';
    else severity = 'info';

    // Map confidence
    let confidence = 'high';
    const conf = String(alert.confidence || '').toLowerCase();
    if (conf.includes('3') || conf.includes('high')) confidence = 'certain';
    else if (conf.includes('2') || conf.includes('medium')) confidence = 'high';
    else if (conf.includes('1') || conf.includes('low')) confidence = 'medium';

    findings.push({
      id,
      scanId,
      ruleId: `ZAP_${alert.pluginId || alert.alertRef || 'ALERT'}`,
      category: 'security',
      severity,
      confidence,
      title: redactSensitiveData(alert.name || alert.alert || 'Security Vulnerability'),
      description: redactSensitiveData(alert.desc || alert.description || ''),
      affectedUrl: alert.instances?.[0]?.uri || targetUrl,
      detectionMethod: alert.instances?.[0]?.attack ? 'active' : 'passive',
      engine: 'owasp-zap',
      evidence: {
        responseSnippet: redactSensitiveData(alert.instances?.[0]?.evidence || ''),
        reproductionCurl: alert.instances?.[0]?.param ? `Parameter: ${alert.instances[0].param}` : undefined,
        cwe: alert.cweid ? `CWE-${alert.cweid}` : undefined,
        owaspCategory: alert.wascid ? `WASC-${alert.wascid}` : undefined,
      },
      impact: redactSensitiveData(alert.otherinfo || 'Potential application security vulnerability.'),
      remediation: {
        summary: redactSensitiveData(alert.solution || 'Apply vendor patch or secure coding practice.'),
        docUrl: alert.reference?.split('\n')[0],
      },
      verificationStatus: 'open',
    });
  }

  return findings;
}

/**
 * Normalizes ProjectDiscovery Nuclei output lines into unified Findings
 * @param {Array<object> | string} raw
 * @param {string} scanId
 * @param {string} targetUrl
 * @returns {Array<object>}
 */
export function normalizeNucleiFindings(raw, scanId, targetUrl) {
  if (!raw) return [];

  let items = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    items = raw.split('\n').filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  const findings = [];
  let index = 0;

  for (const item of items) {
    index++;
    const id = `fnd_nuc_${scanId.slice(0, 8)}_${index}_${crypto.randomBytes(3).toString('hex')}`;

    let severity = 'low';
    const rawSev = (item.info?.severity || '').toLowerCase();
    if (rawSev === 'critical') severity = 'critical';
    else if (rawSev === 'high') severity = 'high';
    else if (rawSev === 'medium') severity = 'medium';
    else if (rawSev === 'low') severity = 'low';
    else severity = 'info';

    let category = 'security';
    const templateId = (item['template-id'] || '').toLowerCase();
    if (templateId.includes('exposure') || templateId.includes('leak') || templateId.includes('config')) {
      category = 'exposure';
    }

    findings.push({
      id,
      scanId,
      ruleId: `NUCLEI_${(item['template-id'] || 'ITEM').toUpperCase().replace(/[^A-Z0-9_]/g, '_')}`,
      category,
      severity,
      confidence: 'high',
      title: redactSensitiveData(item.info?.name || item['template-id']),
      description: redactSensitiveData(item.info?.description || `Nuclei template match: ${item['template-id']}`),
      affectedUrl: item['matched-at'] || item.host || targetUrl,
      detectionMethod: 'active',
      engine: 'nuclei',
      evidence: {
        responseSnippet: redactSensitiveData(item['extracted-results'] ? JSON.stringify(item['extracted-results']) : ''),
        reproductionCurl: redactSensitiveData(item.curl_command || ''),
      },
      impact: `Observed security exposure detected by Nuclei template ${item['template-id']}.`,
      remediation: {
        summary: redactSensitiveData(item.info?.remediation || 'Remediate detected exposure or update vulnerable component.'),
        docUrl: item.info?.reference?.[0],
      },
      verificationStatus: 'open',
    });
  }

  return findings;
}
