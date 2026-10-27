import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  hasConsented
} from '../lib/cookies/cookieConsent';

describe('Compliance, Static Directives & SEO Integrity Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Static Compliance Files on Disk', () => {
    const publicDir = path.resolve(__dirname, '../../public');

    it('has a valid public/robots.txt with host and sitemap', () => {
      const robotsPath = path.join(publicDir, 'robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const content = fs.readFileSync(robotsPath, 'utf-8');
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /privacy');
      expect(content).toContain('Allow: /security');
      expect(content).toContain('Disallow: /app/');
      expect(content).toContain('Disallow: /api/');
      expect(content).toContain('Sitemap: https://vibesift.pixir.in/sitemap.xml');
      expect(content).toContain('Host: vibesift.pixir.in');
    });

    it('has a valid public/sitemap.xml with xml structure', () => {
      const sitemapPath = path.join(publicDir, 'sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const content = fs.readFileSync(sitemapPath, 'utf-8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(content).toContain('https://vibesift.pixir.in/');
      expect(content).toContain('https://vibesift.pixir.in/methodology');
      expect(content).toContain('https://vibesift.pixir.in/sample-reports');
      expect(content).toContain('https://vibesift.pixir.in/remediation');
      expect(content).toContain('https://vibesift.pixir.in/privacy');
      expect(content).toContain('https://vibesift.pixir.in/security');
    });

    it('has RFC 9116 compliant security.txt files', () => {
      const wellKnownPath = path.join(publicDir, '.well-known/security.txt');
      const rootPath = path.join(publicDir, 'security.txt');

      expect(fs.existsSync(wellKnownPath)).toBe(true);
      expect(fs.existsSync(rootPath)).toBe(true);

      const wellKnownContent = fs.readFileSync(wellKnownPath, 'utf-8');
      expect(wellKnownContent).toContain('Contact: mailto:security@pixir.in');
      expect(wellKnownContent).toContain('Contact: https://vibesift.pixir.in/security');
      expect(wellKnownContent).toContain('Expires:');
      expect(wellKnownContent).toContain('Preferred-Languages: en');
      expect(wellKnownContent).toContain('Canonical: https://vibesift.pixir.in/.well-known/security.txt');
      expect(wellKnownContent).toContain('Policy: https://vibesift.pixir.in/security');
    });

    it('has brand favicon SVG shield-check.svg', () => {
      const iconPath = path.join(publicDir, 'shield-check.svg');
      expect(fs.existsSync(iconPath)).toBe(true);

      const content = fs.readFileSync(iconPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('path');
    });
  });

  describe('HTML SEO Metadata & Structured Data', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');

    it('contains complete Open Graph, Twitter Cards and Canonical Link in index.html', () => {
      expect(fs.existsSync(indexPath)).toBe(true);
      const html = fs.readFileSync(indexPath, 'utf-8');

      // Canonical link
      expect(html).toContain('<link rel="canonical" href="https://vibesift.pixir.in/" />');

      // Open Graph
      expect(html).toContain('property="og:site_name" content="VibeSift by Pixir"');
      expect(html).toContain('property="og:type" content="website"');
      expect(html).toContain('property="og:url" content="https://vibesift.pixir.in/"');
      expect(html).toContain('property="og:image"');

      // Twitter Cards
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="twitter:title"');
      expect(html).toContain('name="twitter:description"');
      expect(html).toContain('name="twitter:image"');

      // Structured Data JSON-LD
      expect(html).toContain('application/ld+json');
      expect(html).toContain('"@type": "Organization"');
      expect(html).toContain('"@type": "WebApplication"');
      expect(html).toContain('"@type": "FAQPage"');
    });
  });

  describe('Cookie Consent Manager Logic', () => {
    it('initial state has not consented', () => {
      expect(hasConsented()).toBe(false);
      expect(getCookieConsent()).toBeNull();
    });

    it('acceptAllCookies saves full consent', () => {
      const record = acceptAllCookies();
      expect(record.necessary).toBe(true);
      expect(record.analytics).toBe(true);
      expect(record.preferences).toBe(true);
      expect(hasConsented()).toBe(true);

      const fetched = getCookieConsent();
      expect(fetched?.analytics).toBe(true);
      expect(fetched?.preferences).toBe(true);
    });

    it('rejectNonEssentialCookies saves essential-only consent', () => {
      const record = rejectNonEssentialCookies();
      expect(record.necessary).toBe(true);
      expect(record.analytics).toBe(false);
      expect(record.preferences).toBe(false);
      expect(hasConsented()).toBe(true);

      const fetched = getCookieConsent();
      expect(fetched?.analytics).toBe(false);
      expect(fetched?.preferences).toBe(false);
    });

    it('saveCookieConsent persists custom preferences', () => {
      const record = saveCookieConsent({ analytics: true, preferences: false });
      expect(record.necessary).toBe(true);
      expect(record.analytics).toBe(true);
      expect(record.preferences).toBe(false);

      const fetched = getCookieConsent();
      expect(fetched?.analytics).toBe(true);
      expect(fetched?.preferences).toBe(false);
    });
  });
});
