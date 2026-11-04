# VibeSift — Website Launch-Readiness Auditor
> **by Pixir** · [vibesift.pixir.in](https://vibesift.pixir.in)

A developer-grade, evidence-backed SaaS platform designed to audit websites built using AI coding tools (vibe coding), website builders, and modern development workflows before public launch.

---

## 🛠️ Technology Stack

- **React 19 & Vite 6**: Lightning-fast compilation and optimized code-split chunking.
- **TypeScript**: Strict type contracts across audit schemas, API responses, and UI components.
- **Tailwind CSS**: Custom white-and-green design system with mint accents, dark readable text, and crisp borders.
- **React Router 7 (`react-router-dom`)**: Complete client-side routing, route parameters, and protected application guards.
- **TanStack Query v5 (`@tanstack/react-query`)**: Server-state management and smart scan-status polling with terminal-state detection.
- **React Hook Form & Zod**: Reusable URL validation, SSRF boundary defenses, and scan scope enforcement.
- **Cloudflare Turnstile**: Seamless, privacy-preserving bot defense protecting login, registration, and scan task creation.
- **Razorpay Payments**: Direct client-side checkout integration (`checkout.js`) with backend signature/order validation and S3-managed promotional coupon engine.
- **Amazon Cognito 14-Day Session Management**: Long-lived developer sessions with automatic token refresh (`REFRESH_TOKEN_AUTH`) and 401 retry interceptor.
- **Lucide React**: Clean, accessible icon system with semantic stroke weights.
- **Vitest & React Testing Library**: Comprehensive test suite with 52 passing frontend component and smoke tests.
- **Node.js Native Test Runner**: 73 passing backend integration, security, SSRF, and auth tests.
- **Python Inspector Test Suite**: 6 passing AWS Lambda & Inspector checks (total 131 passing tests across the repo).

---

## 🗺️ Application Routes

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Public marketing landing page with interactive report preview, features, and sample audits. |
| `/pricing` | `PricingPage` | Transparent pricing breakdown: Free Quick Audit vs ₹39 Deep Search with feature matrix. |
| `/refund-policy` | `RefundPolicyPage` | Comprehensive refund, cancellation, and dispute policy with 24–48h SLA and operational details. |
| `/terms` | `TermsPage` | Terms of Service, acceptable use guidelines, and authorized testing compliance agreement. |
| `/contact` | `ContactPage` | Customer support channels, SLA commitments, registered physical address, and founder contacts. |
| `/privacy` | `PrivacyPolicyPage` | Data protection notice compliant with the Indian Digital Personal Data Protection (DPDP) Act 2023. |
| `/security` | `SecurityPage` | Enterprise security whitepaper, SSRF mitigation architecture, and isolation mechanisms. |
| `/methodology` | `MethodologyPage` | Transparent 71-point inspection breakdown across 6 readiness pillars. |
| `/sample-reports` | `SampleReportsPage` | Public interactive sample audit reports demonstrating findings, scores, and remediation diffs. |
| `/remediation` | `RemediationPage` | Actionable vulnerability remediation guides and code snippets for vibe coders. |
| `/login` | `LoginPage` | Authentication screen supporting Amazon Cognito and one-click demo developer sign-in. |
| `/signup` | `SignupPage` | Developer account registration with Cloudflare Turnstile protection. |
| `/app` | `DashboardPage` | Authenticated overview dashboard with metrics, recent audits, and saved websites. |
| `/app/scans/new` | `NewScanPage` | Scan initiation with URL normalization, scope selection, paywall gate, and validation feedback. |
| `/app/scans/:scanId` | `ScanDetailPage` | Real-time scan telemetry and detailed audit report with evidence, diffs, and export. |
| `/app/history` | `HistoryPage` | Searchable scan history table with filtering, score badges, and rescan action. |
| `/app/sites` | `SitesPage` | Saved websites and domain verification management (DNS TXT & HTML meta challenges). |
| `/app/settings` | `SettingsPage` | Identity credentials, CI/CD API keys, email alerts, and data privacy purge controls. |
| `*` | `NotFoundPage` | Polished 404 error page with navigation shortcuts. |

---

## 🛡️ Audit Scopes & Pricing Model

### 1. Quick Search (Baseline Public Scan — `baseline_public`)
- **Cost**: **Free (₹0)**
- **Turnaround**: ~20 seconds
- **Checks Included**:
  - Safe, non-destructive passive analysis.
  - SEO and crawlability (titles, meta tags, canonicals, robots.txt, sitemaps).
  - Google Lighthouse performance (Core Web Vitals: LCP, CLS, FCP, TBT).
  - Accessibility signals (contrast, alt attributes, ARIA landmarks).
  - HTTPS / TLS configuration and security headers (CSP, HSTS, X-Content-Type-Options).
  - Cookie security flags (Secure, HttpOnly, SameSite).
  - Source map exposure and unbundled development assets.
- **Access**: Instant; no authorization or payment barrier required.

### 2. Deep Search (Authorized Deep Audit — `authorized_deep`)
- **Cost**: **₹39 per audit** (Direct client checkout via Razorpay Live Gateway)
- **Turnaround**: ~2 minutes
- **Checks Included**:
  - Everything in Quick Search plus comprehensive active verification.
  - Multi-page intelligent crawler discovering subpages and deep link integrity.
  - **Indian DPDP Act 2023 Compliance**: 15 privacy tests auditing third-party scripts, tracker leakage, cookie banner consent, sensitive data exfiltration, and notice requirements.
  - **Active Security Testing**: 22 security probes evaluating XSS reflection, SQLi error resilience, CORS origin misconfigurations, header injection, and cookie tampering.
  - Actionable before/after code diffs and executive remediation summaries.
- **Paywall & Gating**:
  - Direct integration with Razorpay checkout (`RAZORPAY_KEY_ID`).
  - Scan submission requires verified `paymentId` recorded in backend transactions. Submitting `authorized_deep` without payment returns `402 Payment Required`.
  - Discreet coupon code input for authorized promotional discounts, validated against AWS S3.

---

## 🔌 API Layer Architecture (`src/lib/api/`)

```
src/lib/api/
├── client.ts       # Base HTTP client with error normalization and auth header injection
├── scans.ts        # submitScan, getScanStatus, listScans, rescanTarget, cancelScan
├── sites.ts        # listSavedSites, addSavedSite, requestDomainVerification, confirmDomainVerification
├── reports.ts      # getReport, downloadReportJson, generateReportMarkdown, resolveFinding
├── auth.ts         # Amazon Cognito production adapter + Mock development adapter
└── mockData.ts     # In-memory reactive mock store with simulated scan lifecycle progression
```

### Mock Development Mode (`VITE_USE_MOCK_API=true`)
When AWS backend credentials or Amazon Cognito are not available locally, the frontend runs in explicit development mock mode:
- Clearly identifies mock status via a persistent top banner.
- Simulates realistic scan progression: `QUEUED` (0s) → `VALIDATING` (1.5s) → `RUNNING` (3.5s) → `NORMALIZING` (5.5s) → `COMPLETED` (7s).
- Automatically stops TanStack Query polling upon terminal status.
- Persists user modifications (new scans, resolved findings, verified domains) in `localStorage`.

---

## ⚡ Quick Start & Development

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configuration options:
```ini
VITE_API_BASE_URL=https://api.vibesift.pixir.in
VITE_USE_MOCK_API=true
VITE_APP_NAME="VibeSift"
VITE_COGNITO_USER_POOL_ID=us-east-1_example123
VITE_COGNITO_CLIENT_ID=exampleclientid123
VITE_AWS_REGION=us-east-1
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFx4L_X5foiyZTNW
```

Backend `.env` options:
```ini
PORT=4000
NODE_ENV=production
TURNSTILE_SITE_KEY=0x4AAAAAAFx4L_X5foiyZTNW
TURNSTILE_SECRET_KEY=0x4AAAAAAFx4LyDw-n53U4-1sDlZ6iIdb_8
TURNSTILE_ENABLED=true
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Run Unit and Integration Tests
```bash
npm run test
```

### 5. Run Production Build
```bash
npm run build
```
Build output is optimized and chunk-split in `dist/`.

---

## 🧪 Test Coverage Summary

- `src/lib/validation/urlSchema.test.ts`: URL normalization, valid protocol enforcement, SSRF defenses (blocking loopback, cloud metadata `169.254.169.254`, and private CIDR ranges).
- `src/components/common/SiteUrlForm.test.tsx`: Form rendering, validation error states, and submission callbacks.
- `src/lib/api/scans.test.ts`: Scan submission, lifecycle state machine, cancellation, and rescan triggering.
- `src/components/common/FindingFilters.test.tsx`: Search queries, category filters, and severity pill selections.
- `src/components/common/ReportSummary.test.tsx`: Readiness score gauge, severity counts, and category scores.
- `src/components/auth/ProtectedRoute.test.tsx`: Redirection of unauthenticated visitors and authorized access.
- `src/lib/api/client.test.ts`: Normalized error responses for 404, 401, and network failures.

---

## ☁️ Backend Architecture & AWS Infrastructure (`backend/` & `infra/`)

The backend is built with **Node.js 22+ (ES Modules)**, **Python 3.11**, and **AWS CDK v2** infrastructure-as-code.

### Services & Responsibilities
- **Application API (`backend/src/api/`)**:
  - Express.js and AWS Lambda serverless handlers.
  - Amazon Cognito JWT authentication and multi-tenant authorization.
  - Cloudflare Turnstile bot verification middleware (`verifyTurnstileToken`) for login, signup, and scan submission endpoints.
  - Strict SSRF defense filter before any network resolution.
  - Rate limiting (3 scans/min, 15 scans/hour) and idempotency enforcement.
  - Domain ownership verification (DNS TXT, HTML `<meta>`, and HTTP `/.well-known/`).
- **Inspection Workers (`backend/src/workers/`)**:
  - `python-inspector`: High-speed inspection engine (34 Basic checks, 22 Deep security probes, 15 Indian DPDP Act 2023 compliance checks) with built-in SSRF socket guards. Runs natively or as a serverless AWS Lambda function.
  - `lighthouse`: Native Linux Headless Chromium collecting Core Web Vitals (LCP, CLS, FCP, TBT), Performance, Accessibility, and SEO.
- **Normalizer & Scoring (`backend/src/normalizer/`)**:
  - Unifies multi-engine outputs into a common schema (`src/types/audit.ts`).
  - Directly ingests genuine Google Lighthouse category scores (Performance, Accessibility, SEO, Best Practices) and maps Core Web Vitals into the Check Registry.
  - Computes Launch Readiness Score using multi-pillar weighted scoring (Security 25%, Performance 20%, Accessibility 15%, SEO 15%, Privacy 15%, Completeness/Trust 10%), capping at 50 if Critical vulnerabilities exist.
  - Redacts sensitive secrets, AWS keys (`AKIA...`), and tokens.
  - Builds executive Markdown audit reports and stores raw/final artifacts in S3.
- **Rules-Based Explanation & Executive Summary Service (`backend/src/services/explanationService.js`)**:
  - Pure deterministic, high-speed rules-based developer guidance and executive summaries (zero external AI latency or costs).
- **AWS Infrastructure & Orchestration**:
  - Storage: High-throughput local SQLite 3 (WAL mode) / Amazon DynamoDB + KMS-encrypted Amazon S3 bucket.
  - Configuration: AWS Systems Manager (SSM) Parameter Store (`/vibesift/prod/*`) with zero hardcoded plain text secrets.
  - Compute: Dedicated Node.js on AWS EC2 with PM2 process manager (`vibesift-backend` & `vibesift-sqs-worker`) + AWS Lambda (`vibesift-python-inspector-dev`).
  - Orchestration: Amazon SQS FIFO Queue (`vibesift-scan-jobs.fifo`) with dedicated FIFO Dead-Letter Queue (DLQ).
  - Global S3 Cache Check: Instant cross-tenant pre-check against S3 & SQLite before queuing new audits, discovering existing reports across users with zero redundant compute.
  - Complete Setup Guide: **[`SQS_SETUP_AND_INTEGRATION.md`](SQS_SETUP_AND_INTEGRATION.md)**
  - Comprehensive Operations Runbook: **[`PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md`](docs/PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md)**

### Running Backend Locally
```bash
# Start local API server on http://localhost:4000
npm run dev:backend

# Run backend test suites
npm run test:backend
```

### Synthesizing AWS Infrastructure
```bash
npm run build:infra
npm run synth:infra
```

### Production Deployment & Update Runbook
On the production Ubuntu host (`/var/www/vibesift`):
```bash
# 1. Pull latest code from GitHub
git pull origin main

# 2. Install dependencies & build frontend bundle
npm install
npm run build

# 3. Restart PM2 processes with updated environment & SSM parameters
pm2 restart all --update-env

# 4. Save the active PM2 process list so it persists across server reboots
pm2 save

# 5. Check live health
pm2 status
pm2 logs --lines 20
```

---

## 🎟️ S3 Promotional Coupon Management

VibeSift manages promotional discount coupons directly in AWS S3 (`s3://<bucket>/config/coupons.json`) with zero database schema locks and high availability. The backend caches coupons in-memory with a 30-second TTL.

Manage coupons via the CLI tool from the project root:

```bash
# List all active and disabled coupons
npm run coupon -- list

# Add or update a coupon (e.g., FLAT418 with ₹38 discount)
npm run coupon -- add FLAT418 38 1000

# Disable a coupon immediately
npm run coupon -- disable FLAT418

# Re-enable a coupon
npm run coupon -- enable FLAT418

# Delete a coupon permanently
npm run coupon -- remove FLAT418
```

> **Rules & Constraints**:
> - Discount coupons are case-insensitive and whitespace-stripped upon validation.
> - Razorpay requires a minimum transaction of ₹1 (100 paise) in India. Discount amounts cannot reduce the payable balance below ₹1.
> - Coupon codes are strictly private operational instruments and are never advertised or displayed on marketing surfaces.

---

## 🤖 Crawler Directives & Machine Standards

VibeSift provides machine-readable specifications adhering to open web and security standards:

- **Security Policy (RFC 9116)**: `/.well-known/security.txt` and `/security.txt` listing security contact, encryption keys, policy URLs, and disclosure SLAs.
- **Search Engine Directives**: `/robots.txt` allowing public indexing of landing, pricing, policy, and educational pages while disallowing `/app/` and `/api/`.
- **XML Sitemap**: `/sitemap.xml` providing canonical URLs, change frequencies, and search priority for search indexers.

---

## 🏢 Operational & Business Information

```
Operational Information
Customer Support Email
support@pixir.in

Operating Hours & SLA
Monday – Friday, 9:30 AM – 6:30 PM IST
Turnaround: 24 to 48 business hours

Registered Physical Address
Pixir Operations
Chennai, Tamil Nadu, India — 603103

Operator & Founder
Sudhanshu Kumar (sudhanshu@pixir.in)
```

---

## 📚 Complete Documentation & Guides
- **[System Architecture Specification & Verification](docs/ARCHITECTURE.md)** (Verified 100% against ibesift-architecture.png)
- **[Production Architecture & Operations Runbook](docs/PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md)**
- **[Complete AWS Services Study Guide](docs/AWS_STUDY_GUIDE.md)**
- **[Complete AWS Setup & Deployment Guide](docs/AWS_SETUP_AND_DEPLOYMENT_GUIDE.md)**
- **[Amazon SQS FIFO Setup & Integration Guide](SQS_SETUP_AND_INTEGRATION.md)**
- **[API Contract Specification](docs/API.md)**
- **[Audit Report Schema & Scoring](docs/REPORT_SCHEMA.md)**
- **[Deployment & Cost Breakdown](docs/DEPLOYMENT.md)**
