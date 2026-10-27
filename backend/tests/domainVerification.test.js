import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateVerificationChallenge,
  checkDnsTxtRecord,
  checkHttpVerification,
  verifyDomainOwnership,
  matchesVerifiedDomain,
} from '../src/services/domainVerification.js';

test('Domain Verification: challenge generation creates unique tokens and instructions', () => {
  const challenge = generateVerificationChallenge('site-123', 'example.com');
  assert.equal(challenge.siteId, 'site-123');
  assert.equal(challenge.hostname, 'example.com');
  assert.match(challenge.token, /^vbs_verify_site123_[a-f0-9]{32}$/);
  assert.ok(challenge.methods.dns_txt);
  assert.ok(challenge.methods.html_meta);
  assert.ok(challenge.methods.http_file);
  assert.match(challenge.methods.html_meta.tag, new RegExp(challenge.token));
});

test('Domain Verification: checkDnsTxtRecord succeeds when token is present', async () => {
  const mockResolver = {
    async resolveTxt(host) {
      if (host === '_vibesift-challenge.example.com') {
        return [['vbs_verify_site123_abc123']];
      }
      return [];
    },
  };

  const verified = await checkDnsTxtRecord('example.com', 'vbs_verify_site123_abc123', mockResolver);
  assert.equal(verified, true);

  const missing = await checkDnsTxtRecord('example.com', 'wrong_token', mockResolver);
  assert.equal(missing, false);
});

test('Domain Verification: checkHttpVerification validates html_meta and http_file', async () => {
  const token = 'vbs_verify_site99_tokenxyz';

  // Mock fetcher for HTML meta
  const htmlFetcher = async () => ({
    ok: true,
    async text() {
      return `<!DOCTYPE html><html><head><meta name="vibesift-site-verification" content="${token}"><title>Test</title></head><body></body></html>`;
    },
  });

  const metaResult = await checkHttpVerification('example.com', token, 'html_meta', htmlFetcher);
  assert.equal(metaResult, true);

  // Mock fetcher for well-known file
  const fileFetcher = async () => ({
    ok: true,
    async text() {
      return token;
    },
  });

  const fileResult = await checkHttpVerification('example.com', token, 'http_file', fileFetcher);
  assert.equal(fileResult, true);
});

test('Domain Verification: matchesVerifiedDomain enforces strict scoping', () => {
  assert.equal(matchesVerifiedDomain('example.com', 'example.com'), true);
  assert.equal(matchesVerifiedDomain('api.example.com', 'example.com'), true);
  assert.equal(matchesVerifiedDomain('staging.api.example.com', 'example.com'), true);

  // Disallowed non-matching domains
  assert.equal(matchesVerifiedDomain('notexample.com', 'example.com'), false);
  assert.equal(matchesVerifiedDomain('example.com.attacker.com', 'example.com'), false);
  assert.equal(matchesVerifiedDomain('google.com', 'example.com'), false);
});
