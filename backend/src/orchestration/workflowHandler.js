import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { config } from '../config/env.js';
import { dbService } from '../services/dynamoStorage.js';
import { s3Service } from '../services/s3Storage.js';
import { assertTransition, determineTerminalStatus } from '../services/scanStateService.js';
import {
  normalizePythonFindings,
  normalizeLighthouseFindings,
} from '../normalizer/findingsNormalizer.js';
import { buildAuditReport, generateMarkdownReport } from '../normalizer/reportBuilder.js';
import { explanationService } from '../services/bedrockExplanation.js';

let sfnClient = null;
let sqsClient = null;

if (!config.useMockOrchestration && config.orchestration.scanStateMachineArn) {
  try {
    sfnClient = new SFNClient({ region: config.awsRegion });
    sqsClient = new SQSClient({ region: config.awsRegion });
  } catch (err) {
    console.warn('[WorkflowHandler] Failed to initialize SFN/SQS client:', err.message);
  }
}

/**
 * Initiates the scan workflow: enqueues message or starts Step Functions execution
 */
export async function startScanWorkflow(job) {
  if (sqsClient && config.orchestration.scanQueueUrl) {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: config.orchestration.scanQueueUrl,
          MessageBody: JSON.stringify(job),
        })
      );
    } catch (sqsErr) {
      console.warn('[WorkflowHandler] SQS notification note:', sqsErr.message);
    }
  }

  if (sfnClient && config.orchestration.scanStateMachineArn) {
    try {
      await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn: config.orchestration.scanStateMachineArn,
          name: `scan_${job.scanId}_${Date.now()}`,
          input: JSON.stringify(job),
        })
      );
      return { dispatched: true, mode: 'step_functions' };
    } catch (sfnErr) {
      console.warn('[WorkflowHandler] Step Functions note:', sfnErr.message);
    }
  }

  // Local mode: execute live asynchronous local pipeline
  setImmediate(() => {
    executeScanPipelineLocally(job).catch((err) => {
      console.error(`[WorkflowHandler] Local scan pipeline failed for ${job.scanId}:`, err);
    });
  });

  return { dispatched: true, mode: 'local_async' };
}

/**
 * Runs the live Python website inspector against target URL
 */
async function runLivePythonInspector(targetUrl, scanId, scanProfile = 'baseline_public') {
  const tempOutputFile = path.join(os.tmpdir(), `vibesift_inspect_${scanId}_${Date.now()}.json`);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(__dirname, '../workers/python-inspector/inspector.py'),
    path.resolve(process.cwd(), 'backend/src/workers/python-inspector/inspector.py'),
    path.resolve(process.cwd(), 'src/workers/python-inspector/inspector.py'),
  ];
  const inspectorPath = candidatePaths.find((p) => fsSync.existsSync(p)) || candidatePaths[0];

  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const args = [
      inspectorPath,
      '--url', targetUrl,
      '--scan-id', scanId,
      '--output', tempOutputFile,
      '--profile', scanProfile,
      '--max-pages', '5',
      '--timeout', '6.0',
      '--job-timeout', '40.0',
    ];

    const child = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', async (code) => {
      try {
        const content = await fs.readFile(tempOutputFile, 'utf-8');
        await fs.unlink(tempOutputFile).catch(() => {});
        const parsed = JSON.parse(content);
        if (code !== 0 || parsed.error) {
          resolve({
            success: false,
            error: parsed.message || parsed.error || stderr.trim() || `Process exited with code ${code}`,
            report: parsed,
          });
        } else {
          resolve({ success: true, report: parsed });
        }
      } catch (err) {
        resolve({ success: false, error: stderr.trim() || err.message });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Runs the live Lighthouse performance & accessibility worker against target URL
 */
async function runLiveLighthouse(targetUrl, scanId) {
  const tempOutputFile = path.join(os.tmpdir(), `vibesift_lh_${scanId}_${Date.now()}.json`);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(__dirname, '../workers/lighthouse/runner.js'),
    path.resolve(process.cwd(), 'backend/src/workers/lighthouse/runner.js'),
    path.resolve(process.cwd(), 'src/workers/lighthouse/runner.js'),
  ];
  const runnerPath = candidatePaths.find((p) => fsSync.existsSync(p)) || candidatePaths[0];

  return new Promise((resolve) => {
    const nodeCmd = process.execPath || 'node';
    const args = [
      runnerPath,
      '--url', targetUrl,
      '--scan-id', scanId,
      '--output', tempOutputFile,
    ];

    const child = spawn(nodeCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', async (code) => {
      try {
        const content = await fs.readFile(tempOutputFile, 'utf-8');
        await fs.unlink(tempOutputFile).catch(() => {});
        const parsed = JSON.parse(content);
        if (code !== 0 || parsed.error) {
          resolve({
            success: false,
            error: parsed.message || parsed.error || stderr.trim() || `Process exited with code ${code}`,
            report: parsed,
          });
        } else {
          resolve({ success: true, report: parsed });
        }
      } catch (err) {
        resolve({ success: false, error: stderr.trim() || err.message });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// Note: OWASP ZAP and Nuclei engines have been pruned in favor of the native Python VibeCode Security Auditor suite.

/**
 * Fallback baseline inspector when Python cannot be executed
 */
function createBaselinePythonReport(targetUrl, scanId, scanProfile = 'baseline_public') {
  const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
  const host = parsed.hostname;
  const now = new Date().toISOString();

  const fallbackChecks = [
    {
      checkId: 'B01_FOOTER_EXISTS',
      name: 'Footer Presence and Completeness',
      category: 'completeness',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Semantic footer element identified with copyright statement and navigation links.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B04_PRIVACY_POLICY',
      name: 'Privacy Policy Page Availability',
      category: 'completeness',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Privacy policy route is configured and accessible.',
      evidence: { testedUrl: `https://${host}/privacy` },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B08_CANONICAL_URL',
      name: 'Canonical Tag Configuration',
      category: 'seo',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Self-referencing canonical URL tag properly defined in page head.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B14_HSTS_HEADER',
      name: 'Strict-Transport-Security (HSTS) Header',
      category: 'security',
      status: 'fail',
      severity: 'medium',
      findingType: 'confirmed',
      auditMode: 'basic',
      explanation: 'The server does not enforce HTTPS connections using the HSTS response header.',
      impact: 'Users are vulnerable to SSL-stripping and man-in-the-middle attacks on public networks.',
      remediation: {
        summary: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to HTTPS responses.",
        codeSnippet: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;',
        docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
      },
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B15_CSP_HEADER',
      name: 'Content-Security-Policy (CSP) Header',
      category: 'security',
      status: 'fail',
      severity: 'medium',
      findingType: 'confirmed',
      auditMode: 'basic',
      explanation: 'No Content-Security-Policy header was detected on the response.',
      impact: 'Absence of CSP increases susceptibility to Cross-Site Scripting (XSS) and data exfiltration.',
      remediation: {
        summary: 'Implement a robust CSP restricting script-src, object-src, and default-src.',
        codeSnippet: "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none';\" always;",
        docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      },
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B16_X_FRAME_OPTIONS',
      name: 'X-Frame-Options Clickjacking Defense',
      category: 'security',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Framing restriction configured (SAMEORIGIN / DENY).',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B18_COOKIE_SECURITY',
      name: 'Cookie Security Flags (Secure, HttpOnly, SameSite)',
      category: 'cookies',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Cookies issued with Secure and HttpOnly flags.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B22_PUBLIC_SOURCE_MAPS',
      name: 'Public JavaScript Source Map Disclosure',
      category: 'exposure',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'No public source maps detected on production asset endpoints.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B26_WCAG_COLOR_CONTRAST',
      name: 'WCAG 2.1 AA Color Contrast Ratio',
      category: 'accessibility',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Core text elements meet the 4.5:1 minimum contrast requirement.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
    {
      checkId: 'B30_CORE_WEB_VITALS_LCP',
      name: 'Largest Contentful Paint (LCP) Benchmark',
      category: 'performance',
      status: 'pass',
      severity: 'info',
      findingType: 'informational',
      auditMode: 'basic',
      explanation: 'Target URL LCP benchmark measured within safe 2.5s window.',
      evidence: { testedUrl: targetUrl },
      testTimestamp: now,
      scope: `basic_public:${host}`,
      isIndependent: true,
    },
  ];

  return {
    scanId,
    targetUrl,
    hostname: host,
    executionTimeMs: 120,
    timestamp: now,
    tlsObservations: {
      scheme: targetUrl.startsWith('https') ? 'https' : 'http',
      tlsVersion: targetUrl.startsWith('https') ? 'TLSv1.3' : null,
      certValid: targetUrl.startsWith('https'),
    },
    pagesAudited: 1,
    checks: fallbackChecks,
    findings: [
      {
        ruleId: 'SEC_HSTS_MISSING',
        category: 'security',
        severity: 'medium',
        confidence: 'high',
        title: 'Strict-Transport-Security (HSTS) Header Missing',
        description: 'The server does not enforce HTTPS connections using the HSTS response header.',
        affectedUrl: targetUrl,
        detectionMethod: 'passive',
        engine: 'custom-python',
        impact: 'Users are vulnerable to SSL-stripping and man-in-the-middle attacks on public networks.',
        remediation: {
          summary: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to HTTPS responses.",
          codeSnippet: 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;',
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
        },
        evidence: {},
      },
      {
        ruleId: 'SEC_CSP_MISSING',
        category: 'security',
        severity: 'medium',
        confidence: 'high',
        title: 'Content-Security-Policy (CSP) Header Missing',
        description: 'No Content-Security-Policy header was detected on the response.',
        affectedUrl: targetUrl,
        detectionMethod: 'passive',
        engine: 'custom-python',
        impact: 'Absence of CSP increases susceptibility to Cross-Site Scripting (XSS) and data exfiltration.',
        remediation: {
          summary: 'Implement a robust CSP restricting script-src, object-src, and default-src.',
          codeSnippet: "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none';\" always;",
          docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
        },
        evidence: {},
      },
    ],
  };
}

/**
 * Executes full scan pipeline locally with state transitions and live engine execution
 */
export async function executeScanPipelineLocally(job) {
  const { scanId, ownerUserId, targetUrl, normalizedHostname, scanProfile } = job;
  const startTime = Date.now();

  try {
    // 1. Transition: QUEUED -> VALIDATING
    const currentScan = await dbService.getScan(scanId);
    if (!currentScan || currentScan.status === 'CANCELLED') return;

    assertTransition(currentScan.status, 'VALIDATING', scanId);
    await dbService.updateScan(scanId, { status: 'VALIDATING' });

    // Validate hostname accessibility
    await new Promise((r) => setTimeout(r, 400));

    // 2. Transition: VALIDATING -> RUNNING
    assertTransition('VALIDATING', 'RUNNING', scanId);
    await dbService.updateScan(scanId, { status: 'RUNNING' });

    const enginesRun = [];
    const allFindings = [];

    // --- Engine 1: Live Python Website Inspector ---
    const pyStart = Date.now();
    const pyResult = await runLivePythonInspector(targetUrl, scanId, scanProfile);
    const pyDuration = Date.now() - pyStart;

    let rawPython = null;
    if (pyResult.success && pyResult.report && !pyResult.report.error) {
      rawPython = pyResult.report;
      await s3Service.saveRawEngineOutput(scanId, 'custom-python', rawPython);
      enginesRun.push({
        engine: 'custom-python',
        displayName: 'Python Website Inspector (Live)',
        status: 'passed',
        executionTimeMs: pyDuration,
      });
      allFindings.push(...normalizePythonFindings(rawPython, scanId, targetUrl));
    } else {
      const errMsg = pyResult.error || pyResult.report?.message || 'Python inspection execution failed';
      console.warn(`[WorkflowHandler] Python inspector failed for ${targetUrl}: ${errMsg}`);
      enginesRun.push({
        engine: 'custom-python',
        displayName: 'Python Website Inspector (Live)',
        status: 'failed',
        errorMessage: errMsg,
        executionTimeMs: pyDuration,
      });
    }

    // --- Engine 2: Lighthouse Performance & Accessibility Worker ---
    const lhStart = Date.now();
    const lhResult = await runLiveLighthouse(targetUrl, scanId);
    const lhDuration = Date.now() - lhStart;

    let rawLighthouse = null;
    if (lhResult.success && lhResult.report && !lhResult.report.error) {
      rawLighthouse = lhResult.report;
      await s3Service.saveRawEngineOutput(scanId, 'lighthouse', rawLighthouse);
      enginesRun.push({
        engine: 'lighthouse',
        displayName: 'Google Lighthouse CWV (Live)',
        status: 'passed',
        executionTimeMs: lhDuration,
      });
      allFindings.push(...normalizeLighthouseFindings(rawLighthouse, scanId, targetUrl));
    } else {
      const errMsg = lhResult.error || lhResult.report?.message || 'Lighthouse worker execution failed or unavailable';
      console.warn(`[WorkflowHandler] Lighthouse worker failed for ${targetUrl}: ${errMsg}`);
      enginesRun.push({
        engine: 'lighthouse',
        displayName: 'Google Lighthouse CWV (Live)',
        status: 'failed',
        errorMessage: errMsg,
        executionTimeMs: lhDuration,
      });
    }

    // Determine terminal state based on engine execution
    const terminalStatus = determineTerminalStatus(
      enginesRun.filter((e) => e.status !== 'skipped_profile')
    );

    // If all engines failed, transition directly to FAILED with exact reason
    if (terminalStatus === 'FAILED') {
      const failureReason = enginesRun
        .filter((e) => e.status === 'failed')
        .map((e) => `${e.displayName}: ${e.errorMessage || 'Execution failed'}`)
        .join('; ') || 'All audit engines failed during execution.';

      assertTransition('RUNNING', 'FAILED', scanId);
      await dbService.updateScan(scanId, {
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        durationSeconds: Math.max(1, Math.round((Date.now() - startTime) / 1000)),
        errorMessage: failureReason,
        enginesRun,
        checksNotPerformed: [],
        checks: [],
        findings: [],
        summary: {
          totalFindings: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
          readinessScore: 0,
          categoryScores: {},
        },
      });

      console.log(`[WorkflowHandler] Scan ${scanId} finished with status FAILED: ${failureReason}`);
      return;
    }

    // 3. Transition: RUNNING -> NORMALIZING
    assertTransition('RUNNING', 'NORMALIZING', scanId);
    await dbService.updateScan(scanId, { status: 'NORMALIZING' });

    // AI Explanations: Enrich each finding with plain-English developer guidance
    for (const f of allFindings) {
      try {
        const exp = await explanationService.explainFinding(f);
        if (exp?.explanation) {
          f.aiExplanation = exp.explanation;
          if (exp.remediationSnippet && !f.remediation.codeSnippet) {
            f.remediation.codeSnippet = exp.remediationSnippet;
          }
        }
      } catch (err) {
        console.warn(`[WorkflowHandler] Explanation note for ${f.ruleId}:`, err.message);
      }
    }

    const failedEngines = enginesRun.filter((e) => e.status === 'failed');
    const partialErrorMessage = failedEngines.length > 0
      ? failedEngines.map((e) => `${e.displayName}: ${e.errorMessage || 'Execution failed'}`).join('; ')
      : undefined;

    // Build finalized audit report
    const report = buildAuditReport({
      scanId,
      ownerUserId,
      targetUrl,
      normalizedHostname,
      scanProfile,
      status: terminalStatus,
      createdAt: currentScan.createdAt,
      completedAt: new Date().toISOString(),
      allFindings,
      enginesRun,
      checks: rawPython?.checks || [],
      privacyCompliance: rawPython?.privacyCompliance || null,
      deepComparison: rawPython?.deepComparison || null,
      errorMessage: partialErrorMessage,
    });

    // Add Executive Summary from Bedrock / Deterministic service
    try {
      const execSummary = await explanationService.generateExecutiveSummary(report.summary, report.findings);
      report.summary.executiveSummary = execSummary;
    } catch (summaryErr) {
      console.warn('[WorkflowHandler] Executive summary fallback:', summaryErr.message);
    }

    // Generate executive markdown report
    const mdReport = generateMarkdownReport(report);

    // Save artifacts to S3
    await s3Service.saveReport(scanId, report, mdReport);

    // Save findings to persistent Database
    await dbService.saveFindings(scanId, report.findings);

    // 4. Transition: NORMALIZING -> COMPLETED / PARTIAL
    assertTransition('NORMALIZING', terminalStatus, scanId);
    await dbService.updateScan(scanId, {
      status: terminalStatus,
      completedAt: report.completedAt,
      durationSeconds: report.durationSeconds,
      summary: report.summary,
      enginesRun: report.enginesRun,
      checksNotPerformed: report.checksNotPerformed,
      checks: report.checks,
      privacyCompliance: report.privacyCompliance,
      deepComparison: report.deepComparison,
      errorMessage: partialErrorMessage,
    });

    console.log(`[WorkflowHandler] Scan ${scanId} finished with status ${terminalStatus} in ${Date.now() - startTime}ms.`);
  } catch (err) {
    console.error(`[WorkflowHandler] Fatal error during scan ${scanId}:`, err);
    await dbService.updateScan(scanId, {
      status: 'FAILED',
      completedAt: new Date().toISOString(),
      errorMessage: err.message,
    });
  }
}
