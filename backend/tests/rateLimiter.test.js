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
