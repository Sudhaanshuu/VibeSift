# VibeSift Audit Report Schema & Scoring Specification

> **Specification Version:** 2.0 (Authoritative)  
> **Source Definitions:** `backend/src/types/index.js`, `backend/src/normalizer/scoring.js`, `src/types/audit.ts`  
> **Engine Scope:** Unified Python Inspector (71 Checks: 34 Basic, 22 Deep, 15 Privacy/DPDP) + Google Lighthouse (Core Web Vitals & Accessibility)

---

## 📑 Table of Contents
1. [Core Data Types & Contracts](#1-core-data-types--contracts)
2. [Launch Readiness Scoring Model (0-100)](#2-launch-readiness-scoring-model-0-100)
3. [The 71 Unified Python Inspector Checks](#3-the-71-unified-python-inspector-checks)
   - [BasicAuditor: 34 Website Completeness & Hygiene Checks](#basicauditor-34-website-completeness--hygiene-checks)
   - [DeepAuditor: 22 Active Security Checks](#deepauditor-22-active-security-checks)
   - [PrivacyAuditor: 15 Indian DPDP Act 2023 Compliance Checks](#privacyauditor-15-indian-dpdp-act-2023-compliance-checks)
4. [Google Lighthouse Core Web Vitals & Signals](#4-google-lighthouse-core-web-vitals--signals)
5. [Complete Report JSON Schema](#5-complete-report-json-schema)

---

## 1. Core Data Types & Contracts

### Severity Hierarchy
```typescript
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
```
- **Critical:** Immediate exploitability or severe compliance breach (e.g., exposed `.env` / AWS keys, active SQLi, critical pre-consent tracking without notice).
- **High:** High-probability security vulnerability or missing foundational baseline (e.g., missing CSP, open redirect, plain HTTP transmission, missing DPDP consent banner).
- **Medium:** Configuration weakness or performance defect (e.g., cookie missing `HttpOnly`/`SameSite`, high CLS / slow LCP, missing `HSTS`).
- **Low:** Sub-optimal best practice or minor hygiene omission (e.g., missing meta description, unoptimized static cache header, missing social Open Graph tags).
- **Info:** Informational telemetry, verified hygiene items, or positive attestation (e.g., TLS cipher suite details, robots.txt discovered).

### Audit Categories
```typescript
export type Category = 
  | 'seo' 
  | 'performance' 
  | 'accessibility' 
  | 'security' 
  | 'cookies' 
  | 'exposure'
  | 'privacy'
  | 'completeness'
  | 'trust'
  | 'infrastructure'
  | 'abuse';
```

### Finding Model (`AuditFinding`)
```typescript
export interface AuditFinding {
  id: string;                    // Unique finding identifier: find_<uuid>
  ruleId: string;                // Specific check code: e.g. D01_XSS_REFLECTION, P06_REJECT_PARITY
  category: Category;            // Primary operational category
  severity: Severity;            // Finding severity level
  confidence: 'certain' | 'high' | 'medium' | 'low';
  title: string;                 // Concise headline describing the issue
  description: string;           // Detailed technical explanation
  affectedUrl: string;           // Target URL where defect was observed
  detectionMethod: 'passive' | 'heuristic' | 'active';
  engine: 'custom-python' | 'lighthouse';
  impact: string;                // Real-world operational or legal consequence
  remediation: {
    summary: string;             // Actionable resolution instructions
    codeSnippet?: string;        // Drop-in configuration or code fix
    diffBefore?: string;         // Vulnerable code snippet
    diffAfter?: string;          // Hardened remediation snippet
    frameworkNotes?: string;     // Notes for Next.js, Express, React, etc.
  };
  evidence: {
    request?: string;            // Probe request details
    responseSnippet?: string;    // Captured server response
    domSelector?: string;        // Failing DOM element
    observedHeader?: string;     // Failing header observed
    expectedHeader?: string;     // Expected secure header
    metrics?: Record<string, string | number>;
    reproductionCurl?: string;   // Copy-paste curl command to reproduce
    cwe?: string;                // Common Weakness Enumeration ID
    owaspCategory?: string;      // OWASP Top 10 category mapping
  };
  verificationStatus: 'open' | 'fixed' | 'waived' | 'cannot_verify';
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;
}
```

---

## 2. Launch Readiness Scoring Model (0-100)

The Launch Readiness Score represents a deterministic 0 to 100 evaluation of whether a web application is safe and polished for production launch.

### Pillar Weighting (With Real Lighthouse Data)
When Google Lighthouse data is present, the final score combines six core pillars:

$$\text{ReadinessScore} = 0.25(\text{Security}) + 0.20(\text{Performance}) + 0.15(\text{Accessibility}) + 0.15(\text{SEO}) + 0.15(\text{Privacy}) + 0.05(\text{Completeness})$$

### Severity Deductions
If real Lighthouse data is pending, scores start at 100 and apply direct severity deductions:
- **Critical Finding:** -25 points
- **High Finding:** -12 points
- **Medium Finding:** -5 points
- **Low Finding:** -2 points
- **Info Finding:** 0 points

Category scores apply an intensified 1.5x multiplier on category-specific deductions before normalization to $[0, 100]$.

---

## 3. The 71 Unified Python Inspector Checks

The native Python Inspector (`backend/src/workers/python-inspector/`) contains **71 discrete verification checks** divided across three specialized auditors:

### BasicAuditor: 34 Website Completeness & Hygiene Checks
Always runs for all scan profiles (`baseline_public` and `authorized_deep`):

| Check ID | Check Name | Primary Category | Description |
| :--- | :--- | :--- | :--- |
| `B00_PAGE_ACCESSIBLE` | Page Accessibility & Reachability | Infrastructure | Verifies target URL returns a valid 200 HTTP status and responds within timeout limits. |
| `B01_FOOTER_EXISTS` | Footer Discovery | Completeness | Verifies presence of a structured `<footer>` containing navigation and legal links. |
| `B02_CONTACT_PAGE` | Contact Us Presence | Completeness | Checks for working contact page, email address, or support link. |
| `B03_ABOUT_PAGE` | About Us Presence | Completeness | Validates presence of an About Us or company identity page. |
| `B04_PRIVACY_POLICY` | Privacy Policy Presence | Completeness | Verifies presence of a dedicated, accessible Privacy Policy link. |
| `B05_TERMS_CONDITIONS` | Terms of Service Presence | Completeness | Verifies presence of accessible Terms of Service. |
| `B06_COOKIE_POLICY` | Cookie Policy Presence | Completeness | Checks for dedicated cookie disclosures or cookie policy links. |
| `B07_BROKEN_INTERNAL_LINKS` | Internal Link Integrity | Completeness | Scans internal links to ensure zero 404 broken routes. |
| `B08_BROKEN_EXTERNAL_LINKS` | External Link Validation | Completeness | Validates external outbound links return valid HTTP status codes. |
| `B09_FAVICON_AVAILABILITY` | Favicon Presence | Completeness | Checks for valid `favicon.ico` or shortcut icon link. |
| `B10_SOCIAL_METADATA` | Open Graph & Twitter Cards | SEO | Validates `og:title`, `og:image`, `og:description`, and `twitter:card` tags. |
| `B11_CANONICAL_URL` | Canonical Tag Presence | SEO | Verifies presence and syntax of `<link rel="canonical">`. |
| `B12_404_PAGE_HANDLING` | Custom 404 Error Page | Completeness | Verifies non-existent URLs return HTTP 404 status without leaking stack traces. |
| `B13_ROBOTS_TXT` | robots.txt Availability | SEO | Confirms `/robots.txt` exists, is well-formed, and does not block critical assets. |
| `B14_SITEMAP_XML` | sitemap.xml Availability | SEO | Confirms `/sitemap.xml` exists and references valid URLs. |
| `B15_SECURITY_TXT` | RFC 9116 security.txt | Trust | Verifies `/.well-known/security.txt` exists with contact emails and encryption keys. |
| `B16_PAGE_TITLE` | HTML Title Tag | SEO | Validates `<title>` length between 30 and 60 characters without generic placeholders. |
| `B17_META_DESCRIPTION` | Meta Description | SEO | Validates `<meta name="description">` length between 70 and 160 characters. |
| `B18_H1_HEADINGS` | Primary Heading Structure | SEO / A11y | Ensures exactly one distinct `<h1>` element exists on the page. |
| `B19_IMAGE_ALT_TEXT` | Image Alt Attributes | Accessibility | Checks that all `<img>` tags supply descriptive `alt` attributes. |
| `B20_HTTPS_REDIRECT` | HTTP to HTTPS Enforced | Security | Confirms plain HTTP connections automatically redirect to secure HTTPS. |
| `B21_MIXED_CONTENT` | Passive Mixed Content | Security | Detects insecure `http://` images, scripts, stylesheets, or iframes on HTTPS pages. |
| `B22_HTML_LANG` | HTML Language Attribute | Accessibility | Validates `<html lang="...">` declaration for screen readers. |
| `B23_INDEXABILITY` | Robots Directives | SEO | Verifies meta robots tags do not unintentionally set `noindex` on landing pages. |
| `B24_STRUCTURED_DATA` | Schema.org Structured Data | SEO | Inspects JSON-LD or Microdata structured schemas. |
| `B25_HTML_SIZE` | HTML Document Size | Performance | Flags bloated initial HTML payloads exceeding 100 KB. |
| `B26_RESOURCE_COUNTS` | Total Request Count | Performance | Flags pages making over 75 external resource requests. |
| `B27_IMAGE_DIMENSIONS` | Explicit Image Dimensions | Performance | Verifies images have `width` and `height` to prevent layout shift. |
| `B28_RESOURCE_COMPRESSION` | Gzip/Brotli Compression | Performance | Verifies `Content-Encoding: gzip`, `br`, or `zstd` on text assets. |
| `B29_STATIC_CACHE` | Static Asset Caching | Performance | Checks `Cache-Control: max-age` and `immutable` headers on static assets. |
| `B30_REDIRECT_CHAINS` | Redirect Chain Depth | Infrastructure | Ensures redirect chains do not exceed 2 hops. |
| `B31_MOBILE_VIEWPORT` | Responsive Viewport Meta | Mobile / A11y | Verifies `<meta name="viewport" content="width=device-width, initial-scale=1">`. |
| `B32_TLS_CERT_VALIDITY` | TLS Certificate Hardening | Security | Validates certificate expiration (>30 days remaining) and SAN domain match. |
| `B33_A11Y_LANDMARKS` | ARIA Landmarks & Regions | Accessibility | Confirms presence of `<main>`, `<nav>`, `<header>`, or equivalent ARIA roles. |

---

### DeepAuditor: 22 Active Security Checks
Runs under the `authorized_deep` scan profile (unlocked via domain ownership or verified developer attestation):

| Check ID | Check Name | Primary Category | Description |
| :--- | :--- | :--- | :--- |
| `D01_XSS_REFLECTION` | Reflected Cross-Site Scripting | Security | Probes query parameters for unescaped HTML reflection (`<script>`, `alert`). |
| `D02_SQLI_HEURISTIC` | SQL Injection Error Resilience | Security | Tests parameters with single-quotes/syntax payloads to detect database error disclosure. |
| `D03_CSRF_PROTECTION` | CSRF Token & SameSite Check | Security | Audits POST/PUT forms and session cookies for anti-CSRF tokens or `SameSite=Lax/Strict`. |
| `D04_SECURITY_HEADERS` | Essential Security Headers | Security | Audits `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`. |
| `D05_CSP_DEEP_EVALUATION` | Content Security Policy | Security | Evaluates CSP against `unsafe-inline`, `unsafe-eval`, wildcards (`*`), and missing directives. |
| `D06_CLICKJACKING_FRAMING` | Clickjacking Defense | Security | Verifies `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors 'self'`. |
| `D07_OPEN_REDIRECT` | Open Redirect Validation | Security | Tests parameter-driven redirect URLs for unvalidated destination domain jumps. |
| `D08_PATH_TRAVERSAL` | Directory / Path Traversal | Security | Probes file parameters with `../../etc/passwd` sequences to detect arbitrary reads. |
| `D09_SSRF_SURFACE` | SSRF Vulnerability Surface | Security | Evaluates URL input fields and webhook endpoints for internal IP exfiltration risks. |
| `D10_AUTH_ENDPOINTS` | Authentication Transport | Security | Audits login/signup endpoints to guarantee HTTPS and prevent credentials over HTTP. |
| `D11_COOKIE_SECURITY_DEEP` | Deep Cookie Flag Audit | Cookies | Verifies `Secure`, `HttpOnly`, and `SameSite` flags on all session cookies. |
| `D12_CORS_MISCONFIG` | CORS Configuration Audit | Security | Tests `Access-Control-Allow-Origin` against origin reflection and credentials misconfigs. |
| `D13_INFO_DISCLOSURE` | Server Banner & Stack Traces | Exposure | Detects verbose `Server`, `X-Powered-By` headers, internal IPs, and runtime exceptions. |
| `D14_SENSITIVE_FILES` | Sensitive File Exposure | Exposure | Probes for exposed `.env`, `.git/HEAD`, `.aws/credentials`, `docker-compose.yml`, and backups. |
| `D15_HTTP_METHODS` | HTTP Method Tampering | Abuse | Tests for dangerous active methods (`PUT`, `DELETE`, `TRACE`, `CONNECT`). |
| `D16_RATE_LIMITING` | API Burst Rate Limiting | Abuse | Dispatches rapid requests to evaluate 429 Too Many Requests response headers. |
| `D17_BRUTE_FORCE_DEFENSE` | Brute-Force Posture | Abuse | Evaluates lockout mechanisms, bot verification challenges, or proof-of-work on auth routes. |
| `D18_API_EXPOSURE` | Swagger / OpenAPI Exposure | Exposure | Checks if unauthenticated Swagger UI, `/api-docs`, or GraphQL schemas are exposed. |
| `D19_TLS_HARDENING` | TLS Protocol Hardening | Infrastructure | Verifies legacy SSLv3, TLS 1.0, and TLS 1.1 are disabled in favor of TLS 1.2 and TLS 1.3. |
| `D20_DNS_EMAIL_SECURITY` | DNS Email Hardening | Infrastructure | Validates presence of SPF (`v=spf1`), DMARC (`v=DMARC1`), and DKIM DNS records. |
| `D21_CLIENT_DEPENDENCIES` | Exposed Source Maps | Exposure | Probes for publicly accessible `.map` JavaScript and TypeScript source files. |
| `D22_CACHE_SECURITY` | Authenticated Cache Security | Security | Checks that sensitive/authenticated pages send `Cache-Control: no-store, private`. |

---

### PrivacyAuditor: 15 Indian DPDP Act 2023 Compliance Checks
Audits websites against the statutory mandates of the **Indian Digital Personal Data Protection Act, 2023**:

| Check ID | DPDP Statutory Requirement | Description |
| :--- | :--- | :--- |
| `P01_PRIVACY_POLICY_EXISTS` | Section 5 Notice Requirement | Verifies a dedicated, readily accessible privacy notice is available. |
| `P02_DATA_COLLECTION_DISCLOSURE` | Section 5(1)(i) Itemized Data | Checks whether the policy itemizes specific categories of personal data collected. |
| `P03_CONSENT_MECHANISM` | Section 6(1) Freely Given Consent | Verifies the site uses an affirmative, unambiguous opt-in consent mechanism. |
| `P04_SPECIFIC_PURPOSE_LINKED` | Section 6(1) Purpose Specification | Verifies personal data collection is explicitly tied to a lawful, specified purpose. |
| `P05_PRE_CONSENT_TRACKING` | Section 6 Negative Injunction | Checks for tracking cookies or marketing pixels emitted **before** consent is granted. |
| `P06_REJECT_PARITY` | Section 6(2) Equal Prominence | Verifies that 'Reject All' / 'Decline' is as accessible and prominent as 'Accept All'. |
| `P07_CONSENT_WITHDRAWAL` | Section 6(4) Easy Withdrawal | Checks for accessible mechanisms allowing users to withdraw consent at any time. |
| `P08_COOKIE_POLICY_ALIGNMENT` | Section 6 Purpose Consistency | Confirms actual cookies dropped in browser match the declared cookie disclosures. |
| `P09_THIRD_PARTY_TRACKERS` | Section 7 Third-Party Sharing | Audits third-party analytics and ad trackers (Google Analytics, Meta Pixel, Hotjar). |
| `P10_FORM_PURPOSE_NOTICE` | Section 5(2) Notice at Collection | Verifies contact/signup forms provide inline purpose notices before data submission. |
| `P11_DATA_PRINCIPAL_RIGHTS` | Section 11 Data Principal Rights | Checks for explicit disclosures regarding rights of access, correction, and erasure. |
| `P12_CHILDREN_DATA_SECTION9` | Section 9 Child Data Protection | Audits parental consent protocols and checks for behavioral tracking of children. |
| `P13_RETENTION_SHARING` | Section 8(7) Erasure on Purpose Met | Verifies disclosed data retention periods and third-party data processor disclosures. |
| `P14_GRIEVANCE_OFFICER` | Section 8(10) Grievance Redressal | Verifies the name, email, and address of the designated **Data Grievance Officer**. |
| `P15_OVERALL_DPDP_ASSESSMENT` | Master Readiness Index | Synthesizes an overall DPDP Act 2023 Compliance Score (Compliant, Conditional, Critical Breach). |

---

## 4. Google Lighthouse Core Web Vitals & Signals

Google Lighthouse evaluates real client-side rendering metrics using native Chromium:

| Metric | Target (Good) | Needs Improvement | Poor | Category Weight |
| :--- | :--- | :--- | :--- | :--- |
| **Largest Contentful Paint (LCP)** | $\le 2.5\text{ s}$ | $2.5\text{ s} - 4.0\text{ s}$ | $> 4.0\text{ s}$ | 25% of Performance |
| **First Contentful Paint (FCP)** | $\le 1.8\text{ s}$ | $1.8\text{ s} - 3.0\text{ s}$ | $> 3.0\text{ s}$ | 10% of Performance |
| **Cumulative Layout Shift (CLS)** | $\le 0.10$ | $0.10 - 0.25$ | $> 0.25$ | 25% of Performance |
| **Total Blocking Time (TBT)** | $\le 200\text{ ms}$ | $200\text{ ms} - 600\text{ ms}$ | $> 600\text{ ms}$ | 30% of Performance |
| **Speed Index (SI)** | $\le 3.4\text{ s}$ | $3.4\text{ s} - 5.8\text{ s}$ | $> 5.8\text{ s}$ | 10% of Performance |

---

## 5. Complete Report JSON Schema

The final report artifact saved to Amazon S3 (`scans/[host]__[scanId]/report.json`) follows this JSON contract:

```json
{
  "scanId": "scn_a1b2c3d4e5f6",
  "ownerUserId": "user_cognito_sub_uuid",
  "targetUrl": "https://example.com",
  "normalizedHostname": "example.com",
  "scanProfile": "authorized_deep",
  "status": "COMPLETED",
  "createdAt": "2026-11-04T10:00:00.000Z",
  "completedAt": "2026-11-04T10:01:45.000Z",
  "durationSeconds": 105,
  "summary": {
    "readinessScore": 88,
    "totalFindings": 4,
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 1,
    "info": 0,
    "categoryScores": {
      "security": 85,
      "performance": 92,
      "accessibility": 88,
      "seo": 95,
      "privacy": 80,
      "completeness": 90
    },
    "executiveSummary": "Overall, example.com demonstrates strong performance and accessibility hygiene..."
  },
  "enginesRun": [
    {
      "engine": "custom-python",
      "displayName": "Python Website Inspector (AWS Lambda)",
      "status": "passed",
      "executionTimeMs": 14200
    },
    {
      "engine": "lighthouse",
      "displayName": "Google Lighthouse CWV (Live)",
      "status": "passed",
      "executionTimeMs": 28400
    }
  ],
  "checks": [
    {
      "id": "B00_PAGE_ACCESSIBLE",
      "name": "Page Reachability & HTTP 200 Status",
      "category": "infrastructure",
      "status": "pass",
      "engine": "custom-python"
    }
  ],
  "findings": [
    {
      "id": "find_7f8a9b",
      "ruleId": "D04_SECURITY_HEADERS",
      "category": "security",
      "severity": "medium",
      "title": "Missing Content-Security-Policy (CSP) Header",
      "description": "The web server does not supply a Content-Security-Policy header...",
      "affectedUrl": "https://example.com",
      "remediation": {
        "summary": "Configure a strict Content-Security-Policy HTTP header on your reverse proxy.",
        "codeSnippet": "Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none';"
      }
    }
  ],
  "privacyCompliance": {
    "dpdpReadinessScore": 80,
    "status": "conditional_pass",
    "noticeDisclosures": true,
    "grievanceOfficerFound": true,
    "preConsentTrackingDetected": false
  }
}
```
