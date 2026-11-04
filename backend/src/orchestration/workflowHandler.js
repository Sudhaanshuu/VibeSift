import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { config } from '../config/env.js';
import { dbService } from '../services/dynamoStorage.js';
import { s3Service, sanitizeTargetHost } from '../services/s3Storage.js';
import { assertTransition, determineTerminalStatus } from '../services/scanStateService.js';
import {
  normalizePythonFindings,
  normalizeLighthouseFindings,
} from '../normalizer/findingsNormalizer.js';
import { buildAuditReport, generateMarkdownReport } from '../normalizer/reportBuilder.js';
import { explanationService } from '../services/explanationService.js';
import { sendDeepSearchAuditEmail } from '../services/emailService.js';

let sqsClient = null;

function getWorkflowSqsClient() {
  if (!sqsClient) {
    const region = process.env.AWS_REGION || config.awsRegion || 'us-east-1';
    try {
      sqsClient = new SQSClient({ region });
    } catch (err) {
      console.warn('[WorkflowHandler] Failed to initialize SQS client:', err.message);
    }
  }
  return sqsClient;
}

/**
 * Initiates the scan workflow: enqueues message to SQS FIFO queue
 */
export async function startScanWorkflow(job) {
  const queueUrl = process.env.SCAN_QUEUE_URL || config.orchestration.scanQueueUrl;
  const isFifo = queueUrl?.endsWith('.fifo');
  const client = getWorkflowSqsClient();
  let dispatchedToSqs = false;

  // In production / non-mock mode, dispatch to AWS SQS FIFO queue
  if (!config.useMockOrchestration && client && queueUrl) {
    try {
      const sanitizedGroup = sanitizeTargetHost(job.normalizedHostname || 'default') || 'default';
      const sendParams = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(job),
      };

      if (isFifo) {
        sendParams.MessageGroupId = sanitizedGroup;
        sendParams.MessageDeduplicationId = `${job.scanId}_${Date.now()}`;
      }

      await client.send(new SendMessageCommand(sendParams));
      dispatchedToSqs = true;
      console.log(`[WorkflowHandler] Scan job ${job.scanId} enqueued to SQS FIFO queue.`);
      return { dispatched: true, mode: 'sqs_fifo' };
    } catch (sqsErr) {
      console.warn('[WorkflowHandler] SQS dispatch failed, falling back to local async runner:', sqsErr.message);
    }
  }

  // Local dev mock runner or fallback: execute live asynchronous pipeline locally
  setImmediate(() => {
    executeScanPipelineLocally(job).catch((err) => {
      console.error(`[WorkflowHandler] Scan pipeline failed for ${job.scanId}:`, err);
    });
  });

  return { dispatched: true, mode: 'local_async' };
}

let lambdaClient = null;

export function getLambdaClient() {
  if (!lambdaClient) {
    try {
      lambdaClient = new LambdaClient({ region: config.awsRegion });
    } catch (err) {
      console.warn('[WorkflowHandler] Failed to initialize Lambda client:', err.message);
    }
  }
  return lambdaClient;
}

export function setLambdaClient(customClient) {
  lambdaClient = customClient;
}

/**
 * Executes the Python website inspector suite via AWS Lambda
 */
export async function runPythonInspectorViaLambda(targetUrl, scanId, scanProfile = 'baseline_public') {
  const functionName = config.orchestration.lambdaInspectorFunctionName;
  const client = getLambdaClient();
  if (!client) {
    throw new Error('AWS Lambda client unavailable');
  }

  const payload = JSON.stringify({
    targetUrl,
    scanId,
    scanProfile,
    s3Bucket: config.storage.reportsBucket,
  });

  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(payload),
  });

  const response = await client.send(command);
  if (!response.Payload) {
    throw new Error('Empty payload returned from Lambda function');
  }

  const rawResponse = Buffer.from(response.Payload).toString('utf-8');
  const parsed = JSON.parse(rawResponse);

  if (response.FunctionError) {
    return {
      success: false,
      error: parsed.errorMessage || parsed.message || 'Lambda execution error',
      report: parsed,
    };
  }

  const report = parsed.report || (typeof parsed.body === 'string' ? JSON.parse(parsed.body).report : parsed.body) || parsed;
  if (parsed.statusCode && parsed.statusCode >= 400) {
    return {
      success: false,
      error: parsed.error?.message || report?.message || `Lambda returned status ${parsed.statusCode}`,
      report,
    };
  }

  return {
    success: true,
    report,
    s3Key: parsed.s3Key || report.s3ArtifactKey,
    invokedVia: 'aws_lambda',
  };
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

    // --- Engine 1: Python Website Inspector (AWS Lambda or Live Safe Runner) ---
    const pyStart = Date.now();
    let pyResult = null;
    let pyDisplayName = 'Python Website Inspector (Live)';

    if (config.orchestration.useLambdaInspector) {
      try {
        console.log(`[WorkflowHandler] Invoking Python inspector via AWS Lambda (${config.orchestration.lambdaInspectorFunctionName})...`);
        pyResult = await runPythonInspectorViaLambda(targetUrl, scanId, scanProfile);
        if (pyResult.success) {
          pyDisplayName = 'Python Website Inspector (AWS Lambda)';
        } else {
          console.warn(`[WorkflowHandler] Lambda returned failure, falling back to local runner: ${pyResult.error}`);
          pyResult = await runLivePythonInspector(targetUrl, scanId, scanProfile);
        }
      } catch (lambdaErr) {
        console.warn(`[WorkflowHandler] Lambda invocation exception, falling back to local runner: ${lambdaErr.message}`);
        pyResult = await runLivePythonInspector(targetUrl, scanId, scanProfile);
      }
    } else {
      pyResult = await runLivePythonInspector(targetUrl, scanId, scanProfile);
    }
    const pyDuration = Date.now() - pyStart;

    let rawPython = null;
    if (pyResult.success && pyResult.report && !pyResult.report.error) {
      rawPython = pyResult.report;
      await s3Service.saveRawEngineOutput(scanId, 'custom-python', rawPython, normalizedHostname);
      enginesRun.push({
        engine: 'custom-python',
        displayName: pyDisplayName,
        status: 'passed',
        executionTimeMs: pyDuration,
      });
      allFindings.push(...normalizePythonFindings(rawPython, scanId, targetUrl));
    } else {
      const errMsg = pyResult.error || pyResult.report?.message || 'Python inspection execution failed';
      console.warn(`[WorkflowHandler] Python inspector failed for ${targetUrl}: ${errMsg}`);
      enginesRun.push({
        engine: 'custom-python',
        displayName: pyDisplayName,
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
      await s3Service.saveRawEngineOutput(scanId, 'lighthouse', rawLighthouse, normalizedHostname);
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
      rawLighthouse,
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

    // Save artifacts to S3 using naming convention: scans/${sanitizedHost}__${scanId}/report.json
    const s3Artifacts = await s3Service.saveReport(scanId, report, mdReport, normalizedHostname);

    // Save findings to persistent Database
    await dbService.saveFindings(scanId, report.findings);

    // 4. Transition: NORMALIZING -> COMPLETED / PARTIAL
    assertTransition('NORMALIZING', terminalStatus, scanId);
    await dbService.updateScan(scanId, {
      status: terminalStatus,
      completedAt: report.completedAt,
      durationSeconds: report.durationSeconds,
      s3ReportKey: s3Artifacts.jsonKey,
      summary: report.summary,
      enginesRun: report.enginesRun,
      checksNotPerformed: report.checksNotPerformed,
      checks: report.checks,
      privacyCompliance: report.privacyCompliance,
      deepComparison: report.deepComparison,
      errorMessage: partialErrorMessage,
    });

    console.log(`[WorkflowHandler] Scan ${scanId} finished with status ${terminalStatus} in ${Date.now() - startTime}ms.`);

    // 5. Automatic Audit Report & Invoice Email Dispatch for Paid Deep Scans
    if (scanProfile === 'authorized_deep' && (terminalStatus === 'COMPLETED' || terminalStatus === 'PARTIAL')) {
      const completedScan = await dbService.getScan(scanId);
      const recipientEmail = job.ownerEmail || completedScan?.ownerEmail;
      const recipientName = job.ownerName || completedScan?.ownerName;
      const paymentId = job.paymentId || completedScan?.paymentId;
      const orderId = job.orderId || completedScan?.orderId;
      const amountPaid = job.amountPaid ?? completedScan?.amountPaid ?? (job.couponCode ? 1 : 39);
      const couponCode = job.couponCode || completedScan?.couponCode;

      if (recipientEmail) {
        console.log(`[WorkflowHandler] Dispatching Deep Search email & invoice for ${scanId} to ${recipientEmail}...`);
        sendDeepSearchAuditEmail({
          scan: completedScan || { ...job, scanId },
          report,
          userEmail: recipientEmail,
          userName: recipientName,
          paymentId,
          orderId,
          amountPaid,
          couponCode,
        }).catch((emailErr) => {
          console.warn(`[WorkflowHandler] Background email dispatch note for ${scanId}:`, emailErr.message);
        });
      } else {
        console.log(`[WorkflowHandler] Deep scan ${scanId} completed without an associated email address. Skipping email.`);
      }
    }
  } catch (err) {
    console.error(`[WorkflowHandler] Fatal error during scan ${scanId}:`, err);
    await dbService.updateScan(scanId, {
      status: 'FAILED',
      completedAt: new Date().toISOString(),
      errorMessage: err.message,
    });
  }
}
