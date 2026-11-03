import test from 'node:test';
import assert from 'node:assert/strict';
import { enforceScanRateLimit, getUsageStats, getScanQuota } from '../src/api/middleware/rateLimiter.js';
import { verifyTurnstileToken } from '../src/api/middleware/turnstile.js';

test('Rate Limiter: sets standard rate limit headers on response', () => {
  const req = {
    user: { id: 'usr_test_ratelimit_headers' },
    headers: {},
  };

  const headers = {};
  const res = {
    setHeader(name, val) {
      headers[name] = val;
    },
    status() {
      return this;
    },
    json() {
      return this;
    },
  };

  let nextCalled = false;
  enforceScanRateLimit(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.ok(headers['X-RateLimit-Limit'] !== undefined);
  assert.ok(headers['X-RateLimit-Remaining'] !== undefined);
  assert.ok(headers['X-RateLimit-Reset'] !== undefined);
  assert.ok(headers['X-RateLimit-Minute-Limit'] !== undefined);
});

test('Rate Limiter: returns user quota statistics via getScanQuota', () => {
  const req = {
    user: { id: 'usr_test_quota_fetch', plan: 'verified_developer' },
    headers: {},
  };

  let jsonResult = null;
  const res = {
    json(data) {
      jsonResult = data;
    },
  };

  getScanQuota(req, res);

  assert.ok(jsonResult !== null);
  assert.equal(typeof jsonResult.hourlyLimit, 'number');
  assert.equal(typeof jsonResult.hourlyRemaining, 'number');
  assert.equal(typeof jsonResult.minuteLimit, 'number');
  assert.equal(typeof jsonResult.resetInSeconds, 'number');
  assert.equal(jsonResult.plan, 'verified_developer');
});

test('Turnstile: accepts official bypass or test fixture tokens', async () => {
  const req = {
    headers: { 'cf-turnstile-response': 'test_token_sample' },
    body: {},
  };
  const res = {};

  let nextCalled = false;
  await verifyTurnstileToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.botVerified, true);
});

test('Turnstile: accepts token via body.turnstileToken or x-turnstile-token header', async () => {
  const reqBody = {
    headers: {},
    body: { turnstileToken: '1x00000000000000000000AA' },
  };
  let nextCalledBody = false;
  await verifyTurnstileToken(reqBody, {}, () => {
    nextCalledBody = true;
  });
  assert.equal(nextCalledBody, true);

  const reqHeader = {
    headers: { 'x-turnstile-token': '1x00000000000000000000AA' },
    body: {},
  };
  let nextCalledHeader = false;
  await verifyTurnstileToken(reqHeader, {}, () => {
    nextCalledHeader = true;
  });
  assert.equal(nextCalledHeader, true);
});

test('Turnstile: rejects request with 403 when token is missing and turnstile is required', async () => {
  const req = {
    headers: {},
    body: {},
  };
  let statusCode = null;
  let responseBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseBody = data;
      return this;
    },
  };

  await verifyTurnstileToken(req, res, () => {
    assert.fail('next() should not be called when token is missing');
  });

  assert.equal(statusCode, 403);
  assert.equal(responseBody.code, 'BOT_CHALLENGE_REQUIRED');
  assert.ok(responseBody.siteKey);
});
