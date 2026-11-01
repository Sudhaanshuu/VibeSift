import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSSMParameter,
  getSSMParametersByPath,
  setSSMClient,
  putSSMParameter,
} from '../src/services/ssmService.js';

test('SSM Service: retrieves parameter with mock SSM client', async () => {
  const mockClient = {
    send: async (command) => {
      if (command.input?.Name === '/vibesift/dev/s3_bucket') {
        return {
          Parameter: {
            Name: '/vibesift/dev/s3_bucket',
            Value: 'vibesift-audit-reports-test',
          },
        };
      }
      throw new Error('ParameterNotFound');
    },
  };

  setSSMClient(mockClient);

  const val = await getSSMParameter('/vibesift/dev/s3_bucket', false);
  assert.equal(val, 'vibesift-audit-reports-test');

  // Fallback test
  process.env.TEST_SSM_FALLBACK = 'fallback_value';
  const fallbackVal = await getSSMParameter('/vibesift/dev/missing', false, 'TEST_SSM_FALLBACK');
  assert.equal(fallbackVal, 'fallback_value');
  delete process.env.TEST_SSM_FALLBACK;
});

test('SSM Service: retrieves parameters by path hierarchy', async () => {
  const mockClient = {
    send: async (command) => {
      return {
        Parameters: [
          { Name: '/vibesift/dev/cognito_user_pool_id', Value: 'us-east-1_mock123' },
          { Name: '/vibesift/dev/cognito_client_id', Value: 'client_mock456' },
        ],
      };
    },
  };

  setSSMClient(mockClient);

  const params = await getSSMParametersByPath('/vibesift/dev/');
  assert.equal(params.cognito_user_pool_id, 'us-east-1_mock123');
  assert.equal(params.cognito_client_id, 'client_mock456');
});

test('SSM Service: writes parameter to Parameter Store', async () => {
  let capturedInput = null;
  const mockClient = {
    send: async (command) => {
      capturedInput = command.input;
      return { Version: 1 };
    },
  };

  setSSMClient(mockClient);

  const ok = await putSSMParameter('/vibesift/dev/test_key', 'test_val', 'String');
  assert.equal(ok, true);
  assert.equal(capturedInput.Name, '/vibesift/dev/test_key');
  assert.equal(capturedInput.Value, 'test_val');
});
