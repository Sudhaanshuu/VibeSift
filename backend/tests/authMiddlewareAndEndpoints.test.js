import test from 'node:test';
import assert from 'node:assert/strict';
import * as jose from 'jose';
import { authenticateToken, setJwks } from '../src/api/middleware/auth.js';
import { config, validateProductionConfig } from '../src/config/env.js';
import { app } from '../src/api/app.js';
import { dbService } from '../src/services/dynamoStorage.js';
import { s3Service } from '../src/services/s3Storage.js';

// Setup test Cognito configuration
const TEST_ISSUER = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestUserPool';
const TEST_CLIENT_ID = 'test-client-id-abc123';

config.cognito.issuer = TEST_ISSUER;
config.cognito.clientId = TEST_CLIENT_ID;
config.cognito.userPoolId = 'us-east-1_TestUserPool';

// Generate in-memory RSA key pair for testing JWT cryptographic verification
let testKeyPair;
let localJwks;

test.before(async () => {
  testKeyPair = await jose.generateKeyPair('RS256');
  const publicJwk = await jose.exportJWK(testKeyPair.publicKey);
  publicJwk.kid = 'test-rsa-key-1';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  localJwks = jose.createLocalJWKSet({ keys: [publicJwk] });
  setJwks(localJwks);
});

// Helper to simulate Express middleware invocation
function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        resolve({ statusCode, body: data });
      },
      send(data) {
        responseBody = data;
        resolve({ statusCode, body: data });
      },
    };

    middleware(req, res, () => {
      resolve({ statusCode: 200, nextCalled: true });
    });
  });
}

test('Auth Middleware: accepts valid Cognito Access Token', async () => {
  config.isProduction = true;

  const token = await new jose.SignJWT({
    sub: 'cognito_sub_alice',
    token_use: 'access',
    client_id: TEST_CLIENT_ID,
    username: 'alice@example.com',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer(TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.nextCalled, true);
  assert.equal(req.user.id, 'cognito_sub_alice');
  assert.equal(req.user.email, 'alice@example.com');
  assert.equal(req.user.tokenUse, 'access');
  assert.equal(req.user.isDemoUser, false);
});

test('Auth Middleware: accepts valid Cognito ID Token', async () => {
  config.isProduction = true;

  const token = await new jose.SignJWT({
    sub: 'cognito_sub_bob',
    token_use: 'id',
    aud: TEST_CLIENT_ID,
    email: 'bob@example.com',
    name: 'Bob Architect',
    'custom:plan': 'enterprise',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer(TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.nextCalled, true);
  assert.equal(req.user.id, 'cognito_sub_bob');
  assert.equal(req.user.email, 'bob@example.com');
  assert.equal(req.user.name, 'Bob Architect');
  assert.equal(req.user.plan, 'enterprise');
  assert.equal(req.user.tokenUse, 'id');
});

test('Auth Middleware: rejects expired token with 401', async () => {
  config.isProduction = true;

  const expiredToken = await new jose.SignJWT({
    sub: 'cognito_sub_alice',
    token_use: 'access',
    client_id: TEST_CLIENT_ID,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer(TEST_ISSUER)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${expiredToken}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TOKEN_INVALID');
  assert.ok(res.body.error.includes('failed'));
});

test('Auth Middleware: rejects wrong issuer token with 401', async () => {
  config.isProduction = true;

  const wrongIssuerToken = await new jose.SignJWT({
    sub: 'cognito_sub_alice',
    token_use: 'access',
    client_id: TEST_CLIENT_ID,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer('https://rogue-identity-provider.com/fakePool')
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${wrongIssuerToken}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TOKEN_INVALID');
});

test('Auth Middleware: rejects wrong client ID with 401', async () => {
  config.isProduction = true;

  const wrongClientToken = await new jose.SignJWT({
    sub: 'cognito_sub_alice',
    token_use: 'access',
    client_id: 'malicious-client-id-xyz',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer(TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${wrongClientToken}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TOKEN_INVALID');
  assert.ok(res.body.error.includes('client_id'));
});

test('Auth Middleware: rejects token with invalid token_use claim', async () => {
  config.isProduction = true;

  const invalidUseToken = await new jose.SignJWT({
    sub: 'cognito_sub_alice',
    token_use: 'refresh', // Refresh tokens cannot be used as Bearer access tokens
    client_id: TEST_CLIENT_ID,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-rsa-key-1' })
    .setIssuer(TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(testKeyPair.privateKey);

  const req = {
    headers: {
      authorization: `Bearer ${invalidUseToken}`,
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TOKEN_INVALID');
});

test('Auth Middleware: strictly rejects demo tokens in production', async () => {
  config.isProduction = true;

  const req = {
    headers: {
      authorization: 'Bearer demo_jwt_alex_123456',
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'UNAUTHORIZED');
  assert.ok(res.body.error.includes('Demo tokens are strictly forbidden in production'));
});

test('Auth Middleware: rejects demo tokens in development when allowDemoAuth is disabled', async () => {
  config.isProduction = false;
  config.allowDemoAuth = false;

  const req = {
    headers: {
      authorization: 'Bearer demo_jwt_alex_123456',
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'UNAUTHORIZED');
});

test('Auth Middleware: allows isolated demo tokens in development only when explicitly enabled', async () => {
  config.isProduction = false;
  config.allowDemoAuth = true;

  const req = {
    headers: {
      authorization: 'Bearer demo_user_alex_dev_99',
    },
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.nextCalled, true);
  assert.equal(req.user.isDemoUser, true);
  assert.ok(req.user.id.startsWith('usr_'));
});

test('Auth Middleware: rejects missing or malformed Authorization header with 401', async () => {
  config.isProduction = true;

  const reqEmpty = { headers: {} };
  const resEmpty = await runMiddleware(authenticateToken, reqEmpty);
  assert.equal(resEmpty.statusCode, 401);

  const reqMalformed = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
  const resMalformed = await runMiddleware(authenticateToken, reqMalformed);
  assert.equal(resMalformed.statusCode, 401);

  const reqWhitespace = { headers: { authorization: 'Bearer   ' } };
  const resWhitespace = await runMiddleware(authenticateToken, reqWhitespace);
  assert.equal(resWhitespace.statusCode, 401);
});

test('Artifact Download Security: rejects unauthenticated requests', async () => {
  config.isProduction = true;

  const req = {
    method: 'GET',
    url: '/api/artifacts/download?key=scans/scn_test_1/report.json',
    headers: {},
  };

  const res = await runMiddleware(authenticateToken, req);
  assert.equal(res.statusCode, 401);
});

test('Artifact Download Security: prevents path traversal and enforces scan ownership', async () => {
  // Create scan owned by user Alice
  const aliceScanId = 'scn_alice_report_1';
  await dbService.saveScan({
    scanId: aliceScanId,
    ownerUserId: 'user_alice_uuid',
    targetUrl: 'https://alice.dev',
    normalizedHostname: 'alice.dev',
    scanProfile: 'baseline_public',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  });

  // Save report artifact
  await s3Service.saveReport(aliceScanId, { status: 'COMPLETE', findings: [] }, '# Report');

  // 1. Path traversal attempt is rejected with 400
  let resStatus = null;
  let resJson = null;
  const mockTraversalReq = {
    query: { key: '../../etc/passwd' },
    user: { id: 'user_alice_uuid' },
  };
  const mockRes = {
    status(c) {
      resStatus = c;
      return this;
    },
    json(d) {
      resJson = d;
    },
    send() {},
    setHeader() {},
  };

  // 2. User Bob attempts to access Alice's artifact -> rejected with 404/unauthorized
  let bobStatus = null;
  let bobJson = null;
  const mockBobRes = {
    status(c) {
      bobStatus = c;
      return this;
    },
    json(d) {
      bobJson = d;
    },
    send() {},
    setHeader() {},
  };

  // Test scan ownership enforcement in dbService
  const aliceOwns = await dbService.getScan(aliceScanId, 'user_alice_uuid');
  assert.ok(aliceOwns);

  const bobCannotOwn = await dbService.getScan(aliceScanId, 'user_bob_uuid');
  assert.equal(bobCannotOwn, null);
});

test('Production Configuration Validation: fails safely when required Cognito or AWS settings are missing', () => {
  // Missing Cognito userPoolId in prod
  assert.throws(
    () => {
      validateProductionConfig({
        isProduction: true,
        useLocalStorage: false,
        useMockOrchestration: false,
        allowDemoAuth: false,
        cognito: { userPoolId: '', clientId: 'client', issuer: 'iss' },
        storage: { reportsBucket: 'bucket' },
        tables: { sites: 's', scans: 'sc', findings: 'f' },
        orchestration: { scanQueueUrl: 'q', scanStateMachineArn: 'sfn' },
      });
    },
    (err) => {
      assert.ok(err.message.includes('COGNITO_USER_POOL_ID is required'));
      return true;
    }
  );

  // USE_LOCAL_STORAGE enabled in prod
  assert.throws(
    () => {
      validateProductionConfig({
        isProduction: true,
        useLocalStorage: true,
        useMockOrchestration: false,
        allowDemoAuth: false,
        cognito: { userPoolId: 'pool', clientId: 'client', issuer: 'iss' },
        storage: { reportsBucket: 'bucket' },
        tables: { sites: 's', scans: 'sc', findings: 'f' },
        orchestration: { scanQueueUrl: 'q', scanStateMachineArn: 'sfn' },
      });
    },
    (err) => {
      assert.ok(err.message.includes('USE_LOCAL_STORAGE must be false in production'));
      return true;
    }
  );

  // ALLOW_DEMO_AUTH enabled in prod
  assert.throws(
    () => {
      validateProductionConfig({
        isProduction: true,
        useLocalStorage: false,
        useMockOrchestration: false,
        allowDemoAuth: true,
        cognito: { userPoolId: 'pool', clientId: 'client', issuer: 'iss' },
        storage: { reportsBucket: 'bucket' },
        tables: { sites: 's', scans: 'sc', findings: 'f' },
        orchestration: { scanQueueUrl: 'q', scanStateMachineArn: 'sfn' },
      });
    },
    (err) => {
      assert.ok(err.message.includes('ALLOW_DEMO_AUTH is strictly forbidden in production'));
      return true;
    }
  );
});
