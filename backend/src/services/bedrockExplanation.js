import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import crypto from 'node:crypto';
import { config } from '../config/env.js';

/**
 * Base ExplanationService interface
 */
export class ExplanationService {
  /**
   * Explains a finding in plain language and provides remediation guidance
   * @param {object} finding
   * @param {string} [framework]
   * @returns {Promise<{ summary: string, remediationSnippet?: string, explanation: string, source: 'bedrock' | 'deterministic' }>}
   */
  async explainFinding(finding, framework) {
    throw new Error('explainFinding must be implemented by subclass');
  }

  /**
   * Generates an executive summary of the overall scan report
   * @param {object} reportSummary
   * @param {Array<object>} topFindings
   * @returns {Promise<string>}
   */
  async generateExecutiveSummary(reportSummary, topFindings) {
    throw new Error('generateExecutiveSummary must be implemented by subclass');
  }
}

/**
 * Deterministic explanation service — rules-based fallback
 */
export class DeterministicExplanationService extends ExplanationService {
  async explainFinding(finding, framework = 'generic') {
    const defaultRemediation = finding.remediation?.summary || 'Review and apply recommended configuration changes.';
    return {
      summary: finding.title,
      remediationSnippet: finding.remediation?.codeSnippet || null,
      explanation: `${finding.description} (Observed via ${finding.detectionMethod} inspection by ${finding.engine}).`,
      source: 'deterministic',
    };
  }

  async generateExecutiveSummary(reportSummary, topFindings) {
    const score = reportSummary.readinessScore;
    let posture = 'Strong';
    if (score < 50) posture = 'Critical Action Required';
    else if (score < 75) posture = 'Moderate Action Required';
    else if (score < 90) posture = 'Good - Minor Improvements Recommended';

    const criticalCount = reportSummary.critical || 0;
    const highCount = reportSummary.high || 0;

    return `The launch-readiness score is ${score}/100 (${posture}). ` +
      `Identified ${reportSummary.totalFindings} total findings across inspected categories, ` +
      `including ${criticalCount} critical and ${highCount} high severity items requiring attention before production launch.`;
  }
}

/**
 * Amazon Bedrock explanation service with caching and deterministic fallback
 */
export class BedrockExplanationService extends ExplanationService {
  constructor() {
    super();
    this.fallback = new DeterministicExplanationService();
    this.cache = new Map(); // Key: hash(findingSummary + promptVersion)
    this.modelId = config.bedrock.modelId;
    this.region = config.bedrock.region;
    this.timeoutMs = config.bedrock.timeoutMs;
    this.maxTokens = config.bedrock.maxTokens;
    this.client = null;

    if (config.bedrock.enabled) {
      try {
        this.client = new BedrockRuntimeClient({ region: this.region });
      } catch (err) {
        console.warn('[BedrockExplanation] Failed to initialize Bedrock client:', err.message);
      }
    }
  }

  computeCacheKey(finding) {
    const raw = `${this.modelId}:${finding.ruleId}:${finding.category}:${finding.title}:${finding.severity}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Sanitizes finding data before sending to LLM (no cookies, passwords, or raw headers)
   */
  sanitizeFinding(finding) {
    return {
      ruleId: finding.ruleId,
      category: finding.category,
      severity: finding.severity,
      title: finding.title,
      description: finding.description,
      impact: finding.impact,
    };
  }

  async explainFinding(finding, framework = 'generic') {
    if (!config.bedrock.enabled || !this.client) {
      return this.fallback.explainFinding(finding, framework);
    }

    const cacheKey = this.computeCacheKey(finding);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const sanitized = this.sanitizeFinding(finding);
    const prompt = `You are an expert application security and web performance engineer.
Explain the following website audit finding concisely and clearly to a developer:
Rule: ${sanitized.ruleId}
Category: ${sanitized.category}
Severity: ${sanitized.severity}
Issue: ${sanitized.title}
Impact: ${sanitized.impact}
Framework: ${framework}

Provide a concise 2-sentence developer explanation and practical remediation code snippet if applicable.`;

    try {
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      // Invoke with timeout guard
      const responsePromise = this.client.send(command);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bedrock invocation timeout')), this.timeoutMs)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const textContent = responseBody.content?.[0]?.text || '';

      const result = {
        summary: finding.title,
        remediationSnippet: finding.remediation?.codeSnippet || null,
        explanation: textContent.trim(),
        source: 'bedrock',
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[BedrockExplanation] Bedrock call failed or timed out (${err.message}). Falling back to deterministic guidance.`);
      return this.fallback.explainFinding(finding, framework);
    }
  }

  async generateExecutiveSummary(reportSummary, topFindings) {
    if (!config.bedrock.enabled || !this.client) {
      return this.fallback.generateExecutiveSummary(reportSummary, topFindings);
    }

    const cacheKey = `exec_summary_${reportSummary.readinessScore}_${reportSummary.critical}_${reportSummary.high}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const sanitizedTop = topFindings.slice(0, 5).map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
    }));

    const prompt = `Provide a concise 3-sentence executive launch readiness summary for a web audit report.
Readiness Score: ${reportSummary.readinessScore}/100
Total Findings: ${reportSummary.totalFindings}
Critical Issues: ${reportSummary.critical}
High Issues: ${reportSummary.high}
Top Issues: ${JSON.stringify(sanitizedTop)}
Maintain professional, balanced tone. Do not exaggerate or make unsubstantiated claims.`;

    try {
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const responsePromise = this.client.send(command);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bedrock timeout')), this.timeoutMs)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const summaryText = responseBody.content?.[0]?.text?.trim() || '';

      this.cache.set(cacheKey, summaryText);
      return summaryText;
    } catch (err) {
      console.warn(`[BedrockExplanation] Failed executive summary call (${err.message}), using fallback.`);
      return this.fallback.generateExecutiveSummary(reportSummary, topFindings);
    }
  }
}

export const explanationService = new BedrockExplanationService();
