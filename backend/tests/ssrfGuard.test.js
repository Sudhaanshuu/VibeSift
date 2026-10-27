import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndNormalizeUrl,
  isDisallowedIp,
  isDisallowedIpv4,
  isDisallowedIpv6,
  resolveAndValidateHost,
  SSRFProtectionError,
} from '../src/services/ssrfGuard.js';

test('SSRF Guard: rejects unsupported protocols', () => {
  const disallowed = [
    'ftp://example.com',
    'file:///etc/passwd',
    'gopher://example.com',
    'data:text/html;base64,PHNjcmlwdD4=',
    'javascript:alert(1)',
    'ldap://127.0.0.1',
    'dict://example.com',
  ];

  for (const url of disallowed) {
    assert.throws(
      () => validateAndNormalizeUrl(url),
      SSRFProtectionError,
      `Should throw SSRFProtectionError for ${url}`
    );
  }
});

test('SSRF Guard: rejects embedded credentials', () => {
  assert.throws(
    () => validateAndNormalizeUrl('https://admin:secret@example.com'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('http://user@example.com'),
    SSRFProtectionError
  );
});

test('SSRF Guard: rejects whitespace and control characters', () => {
  assert.throws(
    () => validateAndNormalizeUrl('https://example .com'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('https://example.com\r\nHost: malicious.com'),
    SSRFProtectionError
  );
});

test('SSRF Guard: blocks loopback IPv4 and IPv6', () => {
  assert.equal(isDisallowedIpv4('127.0.0.1'), true);
  assert.equal(isDisallowedIpv4('127.0.1.1'), true);
  assert.equal(isDisallowedIpv6('::1'), true);
  assert.equal(isDisallowedIpv6('0:0:0:0:0:0:0:1'), true);
  assert.equal(isDisallowedIp('127.0.0.1'), true);
  assert.equal(isDisallowedIp('::1'), true);
});

test('SSRF Guard: blocks AWS instance metadata (IMDSv1 & IMDSv2)', () => {
  assert.equal(isDisallowedIpv4('169.254.169.254'), true);
  assert.equal(isDisallowedIpv4('169.254.1.1'), true); // link-local
  assert.throws(
    () => validateAndNormalizeUrl('http://169.254.169.254/latest/meta-data/'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('http://metadata/'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('http://instance-data/'),
    SSRFProtectionError
  );
});

test('SSRF Guard: blocks private RFC 1918 IPv4 ranges', () => {
  assert.equal(isDisallowedIpv4('10.0.0.1'), true);
  assert.equal(isDisallowedIpv4('10.254.254.254'), true);
  assert.equal(isDisallowedIpv4('172.16.0.1'), true);
  assert.equal(isDisallowedIpv4('172.31.255.255'), true);
  assert.equal(isDisallowedIpv4('192.168.1.1'), true);
  assert.equal(isDisallowedIpv4('192.168.0.254'), true);
  // Carrier-grade NAT
  assert.equal(isDisallowedIpv4('100.64.0.1'), true);
  assert.equal(isDisallowedIpv4('100.127.255.255'), true);
});

test('SSRF Guard: blocks IPv6 ULA, Link-Local, and IPv4-mapped addresses', () => {
  // Unique local fc00::/7
  assert.equal(isDisallowedIpv6('fc00::1'), true);
  assert.equal(isDisallowedIpv6('fd12:3456:789a::1'), true);
  // Link-local fe80::/10
  assert.equal(isDisallowedIpv6('fe80::1'), true);
  // IPv4-mapped 127.0.0.1
  assert.equal(isDisallowedIpv6('::ffff:127.0.0.1'), true);
  // IPv4-mapped 169.254.169.254
  assert.equal(isDisallowedIpv6('::ffff:169.254.169.254'), true);
  // IPv4-mapped 10.0.0.1
  assert.equal(isDisallowedIpv6('::ffff:10.0.0.1'), true);
});

test('SSRF Guard: allows legitimate public IPv4 and domains', () => {
  assert.equal(isDisallowedIpv4('8.8.8.8'), false);
  assert.equal(isDisallowedIpv4('1.1.1.1'), false);
  assert.equal(isDisallowedIpv4('93.184.216.34'), false);

  const res = validateAndNormalizeUrl('https://example.com/blog?page=1');
  assert.equal(res.hostname, 'example.com');
  assert.equal(res.normalizedUrl, 'https://example.com/blog?page=1');
});

test('SSRF Guard: rejects obfuscated IP formats', () => {
  // Decimal integer IP
  assert.throws(
    () => validateAndNormalizeUrl('http://2130706433'),
    SSRFProtectionError
  );
  // Octal IP
  assert.throws(
    () => validateAndNormalizeUrl('http://0177.0.0.1'),
    SSRFProtectionError
  );
});

test('SSRF Guard: rejects disallowed non-standard ports', () => {
  assert.throws(
    () => validateAndNormalizeUrl('https://example.com:22/ssh'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('http://example.com:25/smtp'),
    SSRFProtectionError
  );
  assert.throws(
    () => validateAndNormalizeUrl('http://example.com:6379/redis'),
    SSRFProtectionError
  );

  // Allowed standard ports
  assert.doesNotThrow(() => validateAndNormalizeUrl('http://example.com:80'));
  assert.doesNotThrow(() => validateAndNormalizeUrl('https://example.com:443'));
  assert.doesNotThrow(() => validateAndNormalizeUrl('https://example.com:8443'));
});
