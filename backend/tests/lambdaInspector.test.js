import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runPythonInspectorViaLambda,
  setLambdaClient,
} from '../src/orchestration/workflowHandler.js';

test('Lambda Inspector: successfully invokes AWS Lambda and returns structured audit report', async () => {
  const mockReport = {
    scanId: 'scn_lambda_test_01',
    targetUrl: 'https://example.com',
    checks: [
      {
        checkId: 'B01_FOOTER_EXISTS',
        name: 'Footer Presence and Completeness',
        category: 'completeness',
        status: 'pass',
        severity: 'info',
      },
    ],
    findings: [],
    executionTimeMs: 1200,
  };

  const mockLambdaClient = {
    send: async (command) => {
      assert.equal(command.constructor.name, 'InvokeCommand');
      return {
        StatusCode: 200,
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 200,
            report: mockReport,
            s3Key: 'scans/scn_lambda_test_01/raw/custom-python.json',
          })
        ),
      };
    },
  };

  setLambdaClient(mockLambdaClient);

  const result = await runPythonInspectorViaLambda(
    'https://example.com',
    'scn_lambda_test_01',
    'baseline_public'
  );

  assert.equal(result.success, true);
  assert.equal(result.invokedVia, 'aws_lambda');
  assert.equal(result.report.scanId, 'scn_lambda_test_01');
  assert.equal(result.report.checks.length, 1);
  assert.equal(result.s3Key, 'scans/scn_lambda_test_01/raw/custom-python.json');
});

test('Lambda Inspector: handles SSRF error returned by Lambda safely', async () => {
  const mockLambdaClient = {
    send: async () => {
      return {
        StatusCode: 200,
        Payload: Buffer.from(
          JSON.stringify({
            statusCode: 403,
            error: {
              error: 'SSRF_PROHIBITED',
              message: 'Target host is in a prohibited private range',
            },
          })
        ),
      };
    },
  };

  setLambdaClient(mockLambdaClient);

  const result = await runPythonInspectorViaLambda(
    'http://127.0.0.1',
    'scn_ssrf_lambda',
    'baseline_public'
  );

  assert.equal(result.success, false);
  assert.match(result.error, /prohibited private range/i);
});

test('Lambda Inspector: handles AWS FunctionError safely', async () => {
  const mockLambdaClient = {
    send: async () => {
      return {
        StatusCode: 200,
        FunctionError: 'Unhandled',
        Payload: Buffer.from(
          JSON.stringify({
            errorMessage: 'Process exited unexpectedly before completing request',
          })
        ),
      };
    },
  };

  setLambdaClient(mockLambdaClient);

  const result = await runPythonInspectorViaLambda(
    'https://example.com',
    'scn_err_lambda',
    'baseline_public'
  );

  assert.equal(result.success, false);
  assert.match(result.error, /Process exited unexpectedly/i);
});
