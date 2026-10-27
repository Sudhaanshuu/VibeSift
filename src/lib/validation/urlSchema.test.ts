import { describe, it, expect } from 'vitest';
import { 
  normalizeTargetUrl, 
  isInternalOrPrivateHost, 
  targetUrlSchema, 
  scanSubmissionSchema 
} from './urlSchema';

describe('URL Normalization & SSRF Safety', () => {
  it('normalizes URLs without protocol by prepending https://', () => {
    expect(normalizeTargetUrl('example.com')).toBe('https://example.com');
    expect(normalizeTargetUrl('app.mycompany.io/dashboard')).toBe('https://app.mycompany.io/dashboard');
  });

  it('preserves existing http:// and https:// protocols', () => {
    expect(normalizeTargetUrl('http://insecure-site.org')).toBe('http://insecure-site.org');
    expect(normalizeTargetUrl('https://secure-site.org')).toBe('https://secure-site.org');
  });

  it('detects internal, loopback, and cloud metadata hosts (SSRF defense)', () => {
    expect(isInternalOrPrivateHost('localhost')).toBe(true);
    expect(isInternalOrPrivateHost('127.0.0.1')).toBe(true);
    expect(isInternalOrPrivateHost('0.0.0.0')).toBe(true);
    expect(isInternalOrPrivateHost('::1')).toBe(true);
    expect(isInternalOrPrivateHost('169.254.169.254')).toBe(true); // AWS metadata
    expect(isInternalOrPrivateHost('10.0.4.15')).toBe(true); // Class A private
    expect(isInternalOrPrivateHost('192.168.1.1')).toBe(true); // Class C private
    expect(isInternalOrPrivateHost('172.16.0.5')).toBe(true); // Class B private
    expect(isInternalOrPrivateHost('172.31.255.255')).toBe(true);

    // Public valid hosts should NOT be marked internal
    expect(isInternalOrPrivateHost('example.com')).toBe(false);
    expect(isInternalOrPrivateHost('vibesift.pixir.in')).toBe(false);
    expect(isInternalOrPrivateHost('8.8.8.8')).toBe(false);
  });

  it('targetUrlSchema validates valid public URLs', () => {
    const valid = targetUrlSchema.safeParse('https://my-saas-launch.com');
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data).toBe('https://my-saas-launch.com');
    }
  });

  it('targetUrlSchema rejects loopback and SSRF targets', () => {
    const loopback = targetUrlSchema.safeParse('http://localhost:3000');
    expect(loopback.success).toBe(false);

    const metadata = targetUrlSchema.safeParse('http://169.254.169.254/latest/meta-data');
    expect(metadata.success).toBe(false);
  });

  it('targetUrlSchema rejects non-http protocols', () => {
    const js = targetUrlSchema.safeParse('javascript:alert(1)');
    expect(js.success).toBe(false);

    const ftp = targetUrlSchema.safeParse('ftp://files.example.com');
    expect(ftp.success).toBe(false);
  });
});

describe('Scan Submission Schema', () => {
  it('allows baseline_public scan without domain verification', () => {
    const result = scanSubmissionSchema.safeParse({
      url: 'https://mysite.com',
      profile: 'baseline_public',
      acknowledgedTerms: true,
      isDomainVerified: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects authorized_deep scan when domain is not verified', () => {
    const result = scanSubmissionSchema.safeParse({
      url: 'https://mysite.com',
      profile: 'authorized_deep',
      acknowledgedTerms: true,
      isDomainVerified: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('require verified domain ownership');
    }
  });

  it('accepts authorized_deep scan when domain is verified', () => {
    const result = scanSubmissionSchema.safeParse({
      url: 'https://mysite.com',
      profile: 'authorized_deep',
      acknowledgedTerms: true,
      isDomainVerified: true,
    });
    expect(result.success).toBe(true);
  });
});
