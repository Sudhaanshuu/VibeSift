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
- **Lucide React**: Clean, accessible icon system with semantic stroke weights.
- **Vitest & React Testing Library**: Comprehensive test suite with 51 passing frontend component and smoke tests.

---

## 🗺️ Application Routes

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | `LandingPage` | Public marketing landing page with interactive report preview, features, and sample audits. |
| `/login` | `LoginPage` | Authentication screen supporting Amazon Cognito and one-click demo developer sign-in. |
| `/signup` | `SignupPage` | Developer account registration. |
| `/app` | `DashboardPage` | Authenticated overview dashboard with metrics, recent audits, and saved websites. |
| `/app/scans/new` | `NewScanPage` | Scan initiation with URL normalization, scope selection, and validation feedback. |
| `/app/scans/:scanId` | `ScanDetailPage` | Real-time scan telemetry and detailed audit report with evidence, diffs, and export. |
| `/app/history` | `HistoryPage` | Searchable scan history table with filtering, score badges, and rescan action. |
| `/app/sites` | `SitesPage` | Saved websites and domain verification management (DNS TXT & HTML meta challenges). |
| `/app/settings` | `SettingsPage` | Identity credentials, CI/CD API keys, email alerts, and data privacy purge controls. |
| `*` | `NotFoundPage` | Polished 404 error page. |

---

## 🛡️ Audit Scopes & Boundaries

1. **Baseline Public Scan (`baseline_public`)**:
   - Safe, non-destructive passive checks:
     - SEO and crawlability (titles, meta tags, canonicals, robots.txt, sitemaps).
     - Lighthouse performance (Core Web Vitals, render-blocking scripts).
     - Accessibility signals (contrast, alt attributes, ARIA landmarks).
     - HTTPS / TLS and security headers (CSP, HSTS, X-Content-Type-Options).
     - Cookie and browser security flags (Secure, HttpOnly, SameSite).
     - Observable exposure and misconfigurations (unbundled source maps, .env rewrites).
   - Instant execution; no authorization barrier required.

2. **Authorized Deep Scan (`authorized_deep`)**:
   - Active security and resilience verification via the Python DeepAuditor (22 active tests) and PrivacyAuditor (15 Indian DPDP Act 2023 checks).
   - Evaluates XSS reflection, SQLi error resilience, CORS misconfigurations, and cookie tampering.
   - Strictly requires proven domain ownership via DNS TXT record or HTML `<meta>` challenge.
   - Prohibits destructive payloads, database fuzzing, and denial-of-service tests.

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
  - Comprehensive Operations Runbook: **[`PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md`](PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md)**

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

### Complete Documentation & Guides
- **[Production Architecture & Operations Runbook](PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md)**
- **[Complete AWS Setup & Deployment Guide](docs/AWS_SETUP_AND_DEPLOYMENT_GUIDE.md)**
- **[Amazon SQS FIFO Setup & Integration Guide](SQS_SETUP_AND_INTEGRATION.md)**
- **[API Contract Specification](docs/API.md)**
- **[Audit Report Schema & Scoring](docs/REPORT_SCHEMA.md)**
- **[AWS Architecture & SSRF Topology](docs/ARCHITECTURE.md)**
- **[Deployment & Cost Breakdown](docs/DEPLOYMENT.md)**
