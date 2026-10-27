import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeterministicExplanationService,
  BedrockExplanationService,
} from '../src/services/bedrockExplanation.js';

test('Bedrock: deterministic fallback provides accurate remediation and explanations without LLM', async () => {
  const fallbackService = new DeterministicExplanationService();
  const finding = {
    ruleId: 'SEC_HSTS_MISSING',
    category: 'security',
    severity: 'medium',
    title: 'HSTS Header Missing',
    description: 'HSTS is not configured on HTTPS responses.',
    engine: 'custom-python',
    detectionMethod: 'passive',
    remediation: {
      summary: 'Configure Strict-Transport-Security header.',
      codeSnippet: 'add_header Strict-Transport-Security "max-age=31536000";',
    },
  };

  const result = await fallbackService.explainFinding(finding, 'nginx');
  assert.equal(result.source, 'deterministic');
  assert.equal(result.summary, 'HSTS Header Missing');
  assert.ok(result.explanation.includes('custom-python'));
  assert.equal(result.remediationSnippet, 'add_header Strict-Transport-Security "max-age=31536000";');

  const summary = await fallbackService.generateExecutiveSummary(
    { readinessScore: 82, totalFindings: 4, critical: 0, high: 1 },
    [finding]
  );
  assert.ok(summary.includes('82/100'));
  assert.ok(summary.includes('4 total findings'));
});

test('Bedrock: service sanitizes finding fields before prompt generation', () => {
  const bedrockService = new BedrockExplanationService();
  const dirtyFinding = {
    ruleId: 'SEC_COOKIE_LEAK',
    category: 'security',
    severity: 'high',
    title: 'Found Bearer Token in URL',
    description: 'URL contained access_token=sensitive_jwt_token',
    impact: 'Token exposure',
    evidence: {
      observedHeader: 'Cookie: session=super_secret_cookie_value',
      responseSnippet: 'password=admin123',
    },
  };

  const sanitized = bedrockService.sanitizeFinding(dirtyFinding);
  assert.equal(sanitized.ruleId, 'SEC_COOKIE_LEAK');
  assert.equal(sanitized.category, 'security');
  // Critical: evidence object with potential raw passwords/cookies is omitted from prompt payload
  assert.equal(sanitized.evidence, undefined);
});
