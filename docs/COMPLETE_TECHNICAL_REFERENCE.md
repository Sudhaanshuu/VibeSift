# VibeSift — Complete Technical Architecture & Codebase Function Reference

> **Document Status:** Authoritative Master Technical Documentation  
> **Target Audience:** Core Architects, DevOps/Infrastructure Engineers, Security Auditors, Backend & Frontend Developers  
> **System Name:** VibeSift — Website Launch-Readiness & Multi-Vector Audit Platform  
> **Production Target:** https://vibesift.pixir.in  

---

## Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [End-to-End Audit Workflow & Orchestration Pipeline](#2-end-to-end-audit-workflow--orchestration-pipeline)
3. [Security Architecture, SSRF Defense & Verification Model](#3-security-architecture-ssrf-defense--verification-model)
4. [Backend Configuration & API Routing Reference](#4-backend-configuration--api-routing-reference)
5. [Backend Middleware Reference](#5-backend-middleware-reference)
6. [Backend API Routes & Endpoints Reference](#6-backend-api-routes--endpoints-reference)
7. [Backend Normalizer & Scoring Engine Reference](#7-backend-normalizer--scoring-engine-reference)
8. [Backend Orchestration & Workflow Handler Reference](#8-backend-orchestration--workflow-handler-reference)
9. [Backend Services & Storage Layer Reference](#9-backend-services--storage-layer-reference)
10. [Python Inspector Worker & Security Suite Reference](#10-python-inspector-worker--security-suite-reference)
11. [Lighthouse Worker & Core Web Vitals Reference](#11-lighthouse-worker--core-web-vitals-reference)
12. [Frontend Architecture & State Management Reference](#12-frontend-architecture--state-management-reference)
13. [Frontend API Client, Hooks & Utilities Reference](#13-frontend-api-client-hooks--utilities-reference)
14. [Frontend Component & Page Catalog](#14-frontend-component--page-catalog)
15. [Infrastructure as Code (AWS CDK) Reference](#15-infrastructure-as-code-aws-cdk-reference)
16. [Verification, DPDP Act (2023) & Compliance Standards](#16-verification-dpdp-act-2023--compliance-standards)

---

## 1. Executive Summary & System Architecture

### 1.1 Mission & Overview
VibeSift is an enterprise-grade website launch-readiness and multi-vector audit platform. It automates pre-launch and ongoing verification of websites across 11 critical operational vectors:
1. **SEO (Search Engine Optimization):** Meta tags, title tags, canonical URLs, robots.txt, sitemaps, structured data.
2. **Performance:** Resource size, compression, cache headers, image dimensions, Core Web Vitals (FCP, LCP, CLS, TBT).
3. **Accessibility (a11y):** Form labels, ARIA landmarks, image `alt` attributes, heading hierarchies, mobile viewports.
4. **Security:** Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), TLS hardening, cookie flags (`Secure`, `HttpOnly`, `SameSite`), open redirect vulnerabilities, path traversal, CORS misconfigurations, CSRF controls.
5. **Cookies & Tracking:** First-party vs. third-party cookie issuance, pre-consent tracking, consent banner integration.
6. **Information Exposure:** Sensitive file disclosures (`.env`, `.git`, `.aws/credentials`, backups), server banner leaks, stack traces.
7. **Privacy & DPDP Compliance:** Compliance with the **Indian Digital Personal Data Protection Act, 2023 (DPDP Act)**, consent reject parity, purpose specification, Grievance Officer disclosures.
8. **Completeness:** Footer presence, About Us, Contact Us, Privacy Policy, Terms of Service, 404 page handling, favicon.
9. **Trust & Authenticity:** RFC 9116 `security.txt`, company identity signals, social metadata (Open Graph / Twitter Cards).
10. **Infrastructure Posture:** DNS hygiene (SPF, DMARC, DKIM), HTTP-to-HTTPS redirect chains, TLS certificate validity.
11. **Abuse & Rate Resistance:** HTTP method tampering (PUT/DELETE/OPTIONS), burst rate limits, brute-force defenses.

### 1.2 High-Level Architecture Diagram
```
                       +-----------------------------------+
                       |        Client Web Browser         |
                       |  (React 19 / Vite / Tailwind CSS) |
                       +-----------------+-----------------+
                                         |
                                         | HTTPS (Bearer JWT / Turnstile)
                                         v
                       +-----------------+-----------------+
                       |         Cloudflare Edge           |
                       | DNS • SSL/TLS 1.3 • Turnstile•WAF |
                       +-----------------+-----------------+
                                         |
                                         v (Port 443)
                       +-----------------+-----------------+
                       |     AWS EC2 Production Host       |
                       |  - Nginx Reverse Proxy            |
                       |  - Express API ('vibesift-backend'|
                       |    PM2 Port 4000)                 |
                       +--------+-----------------+--------+
                                |                 |
          Enqueue Scan Job      |                 | Query / Save State
                                v                 v
         +----------------------+----+    +-------+--------------------+
         |   Amazon SQS FIFO Queue   |    | SQLite 3 (WAL Mode) /      |
         |   vibesift-scan-jobs.fifo |    | DynamoDB                   |
         |   & vibesift-scan-jobs-dlq|    | - SavedWebsites / Scans    |
         +--------------+------------+    +----------------------------+
                        |                                |
         20s Long-Poll  v                                | Save Artifacts
         +--------------+------------+                   v
         | PM2 Worker Process        |    +-------+--------------------+
         | 'vibesift-sqs-worker'     |    | Amazon S3 Reports Bucket   |
         | (Local Chromium / SQS)    |    | (KMS Encrypted Reports/Raw)|
         +--------+-------------+----+    +----------------------------+
                  |             |                        ^
                  v             v                        |
  +---------------+-----+ +-----+----------------+       |
  | AWS Lambda Worker   | | Native Headless      |-------+
  | Python Inspector    | | Chromium Lighthouse  |
  | (71 checks, zip)    | | (Core Web Vitals)    |
  +---------------+-----+ +----------------------+
                  |
                  v
         +---------------------------+
         | Normalizer & Scoring      |
         | - Deduplication & Redact  |
         | - Real Lighthouse CWV Cat |
         | - Multi-Pillar Score 0-100|
         | - Deterministic Guidance  |
         +---------------------------+
```

---

## 2. End-to-End Audit Workflow & Orchestration Pipeline

The lifecycle of an audit run follows an audited, strictly monotonic finite state machine (FSM):

```
[ QUEUED ] ──────> [ VALIDATING ] ──────> [ RUNNING ] ──────> [ NORMALIZING ] ──────> [ COMPLETED ]
     │                    │                     │                      │          └──> [ PARTIAL ]
     └──> [ CANCELLED ]   └──> [ FAILED ]       └──> [ CANCELLED ]     └──> [ FAILED ]
     └──> [ FAILED ]                            └──> [ FAILED ]
```

### Monotonic State Machine Rules (`scanStateService.js`):
1. **QUEUED:** The audit submission is validated and either resolved via global precheck cache across all tenants, or enqueued into Amazon SQS FIFO (`vibesift-scan-jobs.fifo`) with `MessageGroupId` and deduplication ID.
2. **VALIDATING:** The target URL is normalized, scheme checked (`http`/`https`), and resolved via DNS with all resolved IPs scrutinized against the SSRF CIDR blocklist. If `authorized_deep` is requested, verified domain ownership or explicit attestation is verified.
3. **RUNNING:** Inspection engines are dispatched concurrently by the EC2 PM2 worker (`vibesift-sqs-worker`):
   - In AWS: AWS Lambda (`vibesift-python-inspector-dev`, Python 3.12, 71 checks) runs serverlessly, and native Headless Chromium Lighthouse runs on the EC2 host.
   - In Local Dev: `workflowHandler.js` spawns asynchronous worker processes or invokes Lambda with local fallback.
4. **NORMALIZING:** Engine raw outputs are retrieved, deduplicated, and secrets redacted. Core Web Vitals are extracted and mapped into the Check Registry tab; genuine Lighthouse category scores (`performance`, `accessibility`, `seo`, `best-practices`) are ingested directly; Launch Readiness Score is computed via the multi-pillar weighted formula (Security 25%, Performance 20%, Accessibility 15%, SEO 15%, Privacy 15%, Completeness/Trust 10%, capped at 50 if Critical defects exist); and deterministic developer remediation guidance is generated via `explanationService.js`.
5. **TERMINAL STATES (`COMPLETED`, `PARTIAL`, `FAILED`, `CANCELLED`):**
   - `COMPLETED`: All executed audit engines succeeded. Final `report.json` and `report.md` are uploaded to S3, the message is deleted from SQS FIFO, and state transitions to COMPLETED.
   - `PARTIAL`: One or more non-fatal engines failed (e.g. Lighthouse timed out, but Python Inspector succeeded), generating an actionable report with an explicit warning note.
   - `FAILED`: All engines failed or an unrecoverable target error occurred. If unhandled, message routes to DLQ after 3 retries.
   - `CANCELLED`: The user explicitly terminated the scan before normalization.

---

## 3. Security Architecture, SSRF Defense & Verification Model

### 3.1 Server-Side Request Forgery (SSRF) Defense Matrix
Every outbound HTTP request made by VibeSift (API verification, Python crawler, Lighthouse, redirects) is gated by `ssrfGuard.js` (Node.js) and `ssrf_guard.py` (Python).

#### Disallowed Destination Ranges:
- **`0.0.0.0/8`**: RFC 1122 Current network
- **`10.0.0.0/8`**: RFC 1918 Private network
- **`100.64.0.0/10`**: RFC 6598 Carrier-grade NAT
- **`127.0.0.0/8`**: RFC 1122 Loopback
- **`169.254.0.0/16`**: RFC 3927 Link-local & **AWS IMDS** (`http://169.254.169.254/latest/meta-data/`)
- **`172.16.0.0/12`**: RFC 1918 Private network
- **`192.0.0.0/24`**: RFC 6890 IETF Protocol Assignments
- **`192.0.2.0/24`**: RFC 5737 TEST-NET-1
- **`192.88.99.0/24`**: RFC 7526 6to4 Relay Anycast
- **`192.168.0.0/16`**: RFC 1918 Private network
- **`198.18.0.0/15`**: RFC 2544 Benchmark testing
- **`198.51.100.0/24`**: RFC 5737 TEST-NET-2
- **`203.0.113.0/24`**: RFC 5737 TEST-NET-3
- **`224.0.0.0/4`**: RFC 5771 Multicast
- **`240.0.0.0/4`**: RFC 1112 Reserved
- **`255.255.255.255/32`**: Broadcast
- **IPv6 Blocks:** `::1` (Loopback), `::` (Unspecified), `fc00::/7` (Unique Local), `fe80::/10` (Link-Local), `ff00::/8` (Multicast), `2001:db8::/32` (Doc), and IPv4-mapped IPv6 (`::ffff:x.x.x.x`).
- **Blocked Hostname Patterns:** `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.lan`, `*.corp`, `*.home`, `*.test`, `*.invalid`, `*.example`, `metadata`, `instance-data`, `metadata.google.internal`.
- **Obfuscation Guards:** Prohibits raw integer/dword IP encoding (`http://2130706433/`) and octal IP encoding (`http://0177.0.0.1/`).
- **Port Restriction:** Strictly restricts target connections to standard web ports: `80`, `443`, `8080`, `8443`.
- **DNS Rebinding Guard:** Hostname resolution evaluates *all* returned IP addresses. If any resolved IP address belongs to a prohibited CIDR, the request is immediately rejected with `SSRFProtectionError`.
- **Redirect Re-Validation:** On every HTTP redirect (301, 302, 307, 308), the destination `Location` header is parsed, validated, and resolved through `resolveAndValidateHost()` before following.

### 3.2 Domain Verification Architecture (`domainVerification.js`)
To perform active security testing (XSS reflection, SQLi heuristics, CORS origin probes, sensitive file scanning) under the `authorized_deep` profile, the user must prove domain ownership via one of three methods:
1. **DNS TXT Record:** Host `_vibesift-challenge.<hostname>` (or `@`) with value `vbs_verify_<siteId>_<random16Hex>`.
2. **HTML Meta Tag:** `<meta name="vibesift-site-verification" content="vbs_verify_..." />` within the root `<head>`.
3. **HTTP Well-Known File:** Host `https://<hostname>/.well-known/vibesift-verification.txt` containing strictly the token.
4. **Owner Attestation:** Explicit consent provided during form submission for authenticated developers.

---

## 4. Backend Configuration & API Routing Reference

### File: `backend/src/config/env.js`
Central environment configuration and validation module.

#### Exported Objects & Functions:
- **`config`** (`Object`):
  - `env`: `'development'` | `'production'`.
  - `isProduction`: `boolean`.
  - `port`: Port number (default: `4000`).
  - `awsRegion`: AWS region (default: `'us-east-1'`).
  - `allowDemoAuth`: Boolean toggle. Strictly disabled in production.
  - `useLocalStorage`: Controls SQLite / local filesystem vs DynamoDB / S3.
  - `useMockOrchestration`: Controls local async runner vs SQS FIFO.
  - `tables`: `{ sites, scans, findings }` DynamoDB table names.
  - `storage`: `{ reportsBucket, presignedUrlTtlSeconds }`.
  - `orchestration`: `{ scanQueueUrl, useLambdaInspector, lambdaInspectorFunctionName }`.
  - `cognito`: `{ userPoolId, clientId, issuer, jwksUri }`.
  - `scannerLimits`: `{ maxPagesPerScan, maxDepth, maxResponseSizeBytes, requestTimeoutMs, totalJobTimeoutSeconds, requestsPerSecond }`.
  - `rateLimits`: `{ scansPerHourPerUser, scansPerMinutePerUser }`.
  - `turnstile`: `{ enabled, secretKey, siteKey }`.
  - `cloudwatch`: `{ namespace, emfEnabled }`.
- **`validateProductionConfig(cfg = config)`**:
  - *Parameters:* `cfg` (Configuration object, defaults to `config`).
  - *Returns:* `void`.
  - *Exceptions:* Throws `Error` detailing missing or insecure settings if running in production. Checks: `allowDemoAuth === false`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_ISSUER`, `S3_REPORTS_BUCKET`, and `SCAN_QUEUE_URL`.

### File: `backend/src/api/app.js`
Main Express application definition, CORS handler, middleware pipeline, and route mounts.

#### Exported Objects:
- **`app`**: Initialized Express application.

#### Registered Routes:
- `app.disable('x-powered-by')`
- `app.use(express.json({ limit: '1mb' }))`
- `app.use(express.urlencoded({ extended: true }))`
- `app.use(requestLogger)`
- Dynamic CORS Middleware: Verifies `req.headers.origin` against `https://vibesift.pixir.in` and local dev URLs.
- `GET /health`, `GET /api/health` ➔ `healthRouter`
- `GET /.well-known/security.txt`, `GET /security.txt` ➔ Returns RFC 9116 security declaration.
- `GET /robots.txt` ➔ Returns crawler disallow instructions.
- `app.use('/auth', authRouter)`, `app.use('/api/auth', authRouter)` ➔ `authRouter`
- `app.use('/scans', authenticateToken, scansRouter)`, `app.use('/api/scans', authenticateToken, scansRouter)` ➔ `scansRouter`
- `app.use('/sites', authenticateToken, sitesRouter)`, `app.use('/api/sites', authenticateToken, sitesRouter)` ➔ `sitesRouter`
- `app.use('/reports', authenticateToken, reportsRouter)`, `app.use('/api/reports', authenticateToken, reportsRouter)` ➔ `reportsRouter`
- `GET /api/artifacts/download`, `GET /artifacts/download` ➔ Artifact download controller.
- Catch-All 404 Handler ➔ Emits `ROUTE_NOT_FOUND`.
- `app.use(errorHandler)` ➔ Global exception mapper.

### File: `backend/src/api/lambdaHandler.js`
AWS Lambda entrypoint adapter translating API Gateway HTTP/REST proxy events into Express requests.

#### Functions:
- **`handler(event, context)`**:
  - *Parameters:* `event` (API Gateway Proxy Event, SFN invocation, or CloudWatch Scheduled Event), `context` (AWS Lambda Execution Context).
  - *Returns:* `Promise<{ statusCode: number, headers: Record<string, string>, body: string }>`
  - *Logic:*
    1. Intercepts warmup pings (`event.source === 'aws.events'` or `event.ping`) and returns `200 pong`.
    2. Intercepts direct asynchronous worker invocation (`event.scanId && !event.httpMethod`) and calls `executeScanPipelineLocally(event)`.
    3. Transforms API Gateway HTTP event into simulated Node.js `req` and `res` objects with full header, body (including base64 decoding), and query string normalization.
    4. Passes request to Express `app(req, res)` and resolves API Gateway compatible HTTP response.

---

## 5. Backend Middleware Reference

### File: `backend/src/api/middleware/auth.js`
Amazon Cognito JWT verification and developer identity middleware.

#### Functions:
- **`getJwks()`**:
  - *Returns:* `jose.JWTVerifyGetKey`.
  - *Logic:* Lazily constructs and caches a remote JWKS set via `jose.createRemoteJWKSet(new URL(jwksUrl))` using `config.cognito.jwksUri` or `${config.cognito.issuer}/.well-known/jwks.json`.
- **`setJwks(jwks)`**:
  - *Parameters:* `jwks` (Custom JWKS provider function).
  - *Returns:* `void`.
  - *Purpose:* Allows injection of mock key sets for automated unit and integration tests.
- **`authenticateToken(req, res, next)`**:
  - *Parameters:* `req` (Express Request), `res` (Express Response), `next` (NextFunction).
  - *Returns:* `Promise<void>`.
  - *Logic:*
    1. Extracts `Authorization: Bearer <token>` header. Rejects missing or non-Bearer headers with 401 `UNAUTHORIZED`.
    2. Demo Token Interceptor: Checks `token.startsWith('demo_')`. If running in production, strictly returns 401 `UNAUTHORIZED`. If in dev and `config.allowDemoAuth` is true, sanitizes the user ID and attaches `req.user = { id, email, name, plan, isDemoUser: true }`.
    3. Live Cognito Validation: Calls `jose.jwtVerify(token, jwks, { issuer })`.
    4. Validates `token_use` claim: Must be strictly `'access'` or `'id'`.
    5. Validates audience / client ID claim: Checks `payload.client_id` (for access tokens) or `payload.aud` (for ID tokens) against `config.cognito.clientId`.
    6. Ensures subject claim `sub` is present.
    7. Populates `req.user` with immutable verified identity claims: `{ id: payload.sub, email, name, plan, isDemoUser: false, tokenUse }`.

### File: `backend/src/api/middleware/rateLimiter.js`
In-memory sliding-window scan quota tracker and rate-limiting middleware.

#### Functions:
- **`getUsageStats(identifier)`**:
  - *Parameters:* `identifier` (String: User ID, IP address, or token).
  - *Returns:* `{ hourlyLimit: number, hourlyRemaining: number, minuteLimit: number, minuteRemaining: number, resetInSeconds: number, scansLastHour: number, scansLastMinute: number }`.
  - *Logic:* Maintains a sliding array of timestamps for each identifier in `rateLimitTracker`. Prunes timestamps older than 60 minutes. Calculates counts in the last 60 seconds and last 60 minutes.
- **`enforceScanRateLimit(req, res, next)`**:
  - *Parameters:* `req`, `res`, `next`.
  - *Returns:* `void`.
  - *Logic:* Computes stats via `getUsageStats()`. Sets response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Minute-Limit`, `X-RateLimit-Minute-Remaining`. Rejects with 429 `RATE_LIMIT_EXCEEDED` if minute limit is exceeded. Rejects with 429 `QUOTA_EXCEEDED` if hourly quota is exceeded. Emits CloudWatch EMF metrics on violations.
- **`getScanQuota(req, res)`**:
  - *Parameters:* `req`, `res`.
  - *Returns:* JSON representation of active quota stats and developer tier.
- **`emitRateLimitCloudWatchMetric(metricName, req, identifier)`**:
  - *Parameters:* `metricName` (`string`), `req` (`Request`), `identifier` (`string`).
  - *Returns:* `void`.
  - *Logic:* Outputs structured CloudWatch Embedded Metric Format (EMF) log payload for CloudWatch Dashboard graphs.

### File: `backend/src/api/middleware/requestLogger.js`
Structured request logger with CloudWatch EMF integration.

#### Functions:
- **`requestLogger(req, res, next)`**:
  - *Parameters:* `req`, `res`, `next`.
  - *Returns:* `void`.
  - *Logic:* Assigns `req.id` from `X-Request-ID` or generates random hex string `req_<random6Hex>`. Attaches listener to `res.on('finish')` measuring elapsed milliseconds. If EMF is enabled and not a `/health` check, outputs CloudWatch EMF JSON object capturing `ApiLatencyMs`, `ApiRequestCount`, `Api4xxErrorCount`, and `Api5xxErrorCount` segmented by HTTP method and status code.

### File: `backend/src/api/middleware/turnstile.js`
Cloudflare Turnstile bot protection middleware.

#### Functions:
- **`verifyTurnstileToken(req, res, next)`**:
  - *Parameters:* `req`, `res`, `next`.
  - *Returns:* `Promise<void>`.
  - *Logic:*
    1. If `config.turnstile.enabled` is false, or `req.body.isDemoRequest`, or `x-bypass-bot-check === 'true'`, sets `req.botVerified = true` and proceeds.
    2. Extracts token from `cf-turnstile-response` header, body, or query param. If missing in dev mode, allows bypass; in production, returns 403 `BOT_CHALLENGE_REQUIRED`.
    3. Recognizes official Cloudflare test fixture tokens (`1x00000000000000000000AA`, `bypass`, `test_*`).
    4. Issues `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, and `remoteip`.
    5. If Cloudflare verification fails, emits CloudWatch EMF metric `BotChallengeFailures` and returns 403 `BOT_VERIFICATION_FAILED`.

### File: `backend/src/api/middleware/errorHandler.js`
Global structured error mapper.

#### Functions:
- **`errorHandler(err, req, res, next)`**:
  - *Parameters:* `err` (Error instance), `req`, `res`, `next`.
  - *Returns:* Express Response.
  - *Mappings:*
    - `SSRFProtectionError` ➔ 400 Bad Request (`code: err.code || 'SSRF_BLOCKED'`).
    - `DomainVerificationError` ➔ 400 Bad Request (`code: err.code || 'VERIFICATION_ERROR'`).
    - `InvalidStateTransitionError` ➔ 409 Conflict (`code: 'INVALID_STATE_TRANSITION'`).
    - `ZodError` ➔ 400 Bad Request (`code: 'VALIDATION_ERROR'`, `details: err.flatten()`).
    - Standard Errors ➔ `err.statusCode || 500`. Strips internal stack traces and error messages in production.

---

## 6. Backend API Routes & Endpoints Reference

### File: `backend/src/api/routes/auth.js`
Mounted on `/auth` and `/api/auth`.

- **`POST /login`**:
  - *Body:* `{ email: string, password: string }`.
  - *Success Response:* `200 OK` with `{ token, accessToken, idToken, refreshToken, expiresIn, user }`.
  - *Errors:* 400 `MISSING_EMAIL`, 400 `MISSING_PASSWORD`, 401 `INVALID_CREDENTIALS`, 403 `USER_NOT_CONFIRMED`.
- **`POST /signup`**:
  - *Body:* `{ email: string, password: string, name?: string }`.
  - *Success Response:* `201 Created` with `{ userSub, userConfirmed, codeDeliveryDetails, email, message }`.
  - *Errors:* 400 `MISSING_EMAIL`, 400 `MISSING_PASSWORD`, 400 `INVALID_PASSWORD`, 409 `USER_EXISTS`.
- **`POST /confirm`**:
  - *Body:* `{ email: string, code: string }`.
  - *Success Response:* `200 OK` with `{ success: true, message: string }`.
  - *Errors:* 400 `MISSING_PARAMETERS`, 400 `CODE_MISMATCH`, 400 `EXPIRED_CODE`.
- **`POST /resend-code`**:
  - *Body:* `{ email: string }`.
  - *Success Response:* `200 OK` with `{ success: true, message: string, codeDeliveryDetails }`.
- **`GET /me`**:
  - *Headers:* `Authorization: Bearer <token>`.
  - *Success Response:* `200 OK` with `{ id, email, name, plan, isDemoUser }`.
- **`POST /logout`**:
  - *Success Response:* `200 OK` with `{ message: 'Successfully signed out' }`.

### File: `backend/src/api/routes/health.js`
Mounted on `/health` and `/api/health`.

- **`GET /`**:
  - *Success Response:* `200 OK` with `{ status: 'healthy', timestamp: string, service: 'vibesift-backend', version: '1.0.0' }`.

### File: `backend/src/api/routes/scans.js`
Mounted on `/scans` and `/api/scans` (Requires `authenticateToken`).

- **`POST /`**:
  - *Middleware:* `enforceScanRateLimit`.
  - *Body:* `{ url: string, profile: 'baseline_public' | 'authorized_deep', acknowledgedTerms: boolean, idempotencyKey?: string, useCached?: boolean }`.
  - *Logic:* Validates URL syntax and DNS via `validateAndNormalizeUrl` and `resolveAndValidateHost`. Checks idempotency key in DB. Checks domain authorization if `authorized_deep`. Creates scan record in status `QUEUED`. Calls `startScanWorkflow()`.
  - *Success Response:* `201 Created` (or `200 OK` if duplicate/cached) with `{ scanId, status: 'QUEUED', targetUrl, createdAt }`.
  - *Errors:* 400 `INVALID_URL` / `SSRF_BLOCKED`, 403 `DOMAIN_NOT_VERIFIED`, 429 `RATE_LIMIT_EXCEEDED`.
- **`GET /`**:
  - *Query Parameters:* `search?: string`, `profile?: string`, `hostname?: string`.
  - *Success Response:* `200 OK` with `Array<AuditReport>`.
- **`GET /quota`**:
  - *Success Response:* `200 OK` with active rate limits and scan quota remaining.
- **`GET /:scanId`**:
  - *Path Parameters:* `scanId: string`.
  - *Success Response:* `200 OK` with scan record object.
  - *Errors:* 404 `SCAN_NOT_FOUND`.
- **`GET /:scanId/findings`**:
  - *Query Parameters:* `category?: string`, `severity?: string`, `page?: number`, `limit?: number`.
  - *Success Response:* `200 OK` with `{ scanId, totalFindings, page, limit, findings }`.
- **`GET /:scanId/report`**:
  - *Query Parameters:* `format?: 'download' | 'markdown'`.
  - *Logic:* If `format=download`, returns `{ scanId, downloadUrl: presignedUrl, expiresInSeconds: 900 }`. If `format=markdown`, returns `text/markdown`. Otherwise returns full merged `AuditReport` JSON.
- **`POST /:scanId/rescan`**:
  - *Middleware:* `enforceScanRateLimit`.
  - *Success Response:* `201 Created` with newly enqueued scan job.
- **`POST /:scanId/cancel`**:
  - *Logic:* Asserts state transition to `CANCELLED` and updates status in DB.
  - *Success Response:* `200 OK` with `{ scanId, status: 'CANCELLED' }`.

### File: `backend/src/api/routes/sites.js`
Mounted on `/sites` and `/api/sites` (Requires `authenticateToken`).

- **`GET /`**: Lists all saved websites for the authenticated user.
- **`POST /`**: Saves a new website. Normalizes URL and hostname.
- **`GET /stats`**: Returns aggregated scan stats for `?hostname=example.com`.
- **`GET /:siteId/stats`**: Returns aggregated stats, average scores, and score trends for a saved website.
- **`GET /:siteId/scans`**: Lists historical scans for a saved website.
- **`DELETE /:siteId`**: Deletes a saved website owned by the user.
- **`POST /verification-challenges`** & **`POST /:siteId/verify-request`**:
  - *Body:* `{ siteId: string, method?: 'dns_txt' | 'html_meta' | 'http_file' }`.
  - *Returns:* Verification instructions, tokens, DNS host records, meta tags, and HTTP well-known paths.
- **`POST /:siteId/verify`** & **`POST /:siteId/verify-confirm`**:
  - *Body:* `{ method?: string }`.
  - *Logic:* Executes `verifyDomainOwnership()`. If verified, updates site record in DB.
  - *Returns:* `{ verified: boolean, message: string, site?: SavedWebsite }`.

### File: `backend/src/api/routes/reports.js`
Mounted on `/reports` and `/api/reports` (Requires `authenticateToken`).

- **`GET /:scanId`**: Retrieves report matching frontend `getReport()` signature.
- **`PATCH /:scanId/findings/:findingId`**:
  - *Body:* `{ status: 'open' | 'fixed' | 'waived' | 'cannot_verify' }`.
  - *Returns:* `{ findingId, status, updatedAt }`.
- **`GET /download`**:
  - *Query Parameters:* `key: string`.
  - *Security:* Enforces that `key` starts with `scans/`, contains no path traversal `..`, and validates user ownership of the scan before streaming S3 artifact.

---

## 7. Backend Normalizer & Scoring Engine Reference

### File: `backend/src/normalizer/scoring.js`
Computes the VibeSift Launch Readiness Score and category breakdowns.

#### Constants:
- `SEVERITY_PENALTIES`: `{ critical: 25, high: 12, medium: 5, low: 2, info: 0 }`.
- `CATEGORIES`: Array of 11 operational categories.

#### Functions:
- **`calculateAuditScores(findings = [])`**:
  - *Parameters:* `findings` (`Array<{ category: string, severity: string }>`).
  - *Returns:*
    ```typescript
    {
      readinessScore: number, // 0 - 100
      categoryScores: Record<string, number>, // Each 0 - 100
      counts: { total: number, critical: number, high: number, medium: number, low: number, info: number }
    }
    ```
  - *Formula:*
    - $\text{TotalDeductions} = \sum \text{SEVERITY\_PENALTIES}[\text{severity}]$
    - $\text{ReadinessScore} = \max(0, \min(100, 100 - \text{TotalDeductions}))$
    - For each category: $\text{CategoryScore} = \max(0, \min(100, 100 - \text{CategoryDeductions} \times 1.5))$.

### File: `backend/src/normalizer/findingsNormalizer.js`
Parses raw engine JSON outputs into unified finding objects.

#### Functions:
- **`redactSensitiveData(text)`**:
  - *Parameters:* `text` (`string`).
  - *Returns:* Sanitized string with AWS keys (`AKIA...`), bearer tokens, and password/API key assignments masked as `[REDACTED]`.
- **`computeDeduplicationKey(f)`**:
  - *Parameters:* `f` (Finding object).
  - *Returns:* Deterministic string `${f.ruleId}:${f.category}:${f.affectedUrl}:${f.severity}`.
- **`deduplicateFindings(findings = [])`**:
  - *Parameters:* `findings` (`Array<object>`).
  - *Returns:* Deduplicated array of findings. If duplicate findings are detected, appends secondary evidence snippets up to 3 references.
- **`normalizePythonFindings(raw, scanId, targetUrl)`**:
  - *Parameters:* `raw` (Python inspector JSON), `scanId` (`string`), `targetUrl` (`string`).
  - *Returns:* Array of normalized findings with rule IDs, category mapping, confidence, impact analysis, and remediation specifications.
- **`normalizeLighthouseFindings(raw, scanId, targetUrl)`**:
  - *Parameters:* `raw` (Lighthouse JSON output), `scanId` (`string`), `targetUrl` (`string`).
  - *Returns:* Normalized findings mapping Core Web Vitals (LCP, CLS, FCP, TBT), accessibility audits, and best practice failures into findings.

### File: `backend/src/normalizer/reportBuilder.js`
Assembles the complete report payload.

#### Functions:
- **`buildAuditReport(params)`**:
  - *Parameters:* `{ scanId, ownerUserId, targetUrl, normalizedHostname, scanProfile, status, createdAt, completedAt, allFindings, enginesRun, checksNotPerformed, checks, privacyCompliance, deepComparison, errorMessage, errorCategory }`.
  - *Returns:* `AuditReport` object.
  - *Logic:* Deduplicates findings, computes readiness scores, tallies checks by status (`pass`, `fail`, `warning`, `info`, `not_tested`), calculates confirmed vulnerabilities vs potential risks, synthesizes deep comparison metrics, and formats duration in seconds.
- **`generateMarkdownReport(report)`**:
  - *Parameters:* `report` (`AuditReport`).
  - *Returns:* Fully formatted executive markdown report string containing summary tables, DPDP compliance signals, deep audit comparisons, category score tables, and detailed finding remediation blocks.

---

## 8. Backend Orchestration & Workflow Handler Reference

### File: `backend/src/orchestration/workflowHandler.js`
Scan execution manager for Amazon SQS FIFO queue and asynchronous audit execution pipelines.

#### Functions:
- **`startScanWorkflow(job)`**:
  - *Parameters:* `job` (`{ scanId: string, ownerUserId: string, targetUrl: string, normalizedHostname: string, scanProfile: string }`).
  - *Returns:* `Promise<{ dispatched: boolean, mode: string }>`.
  - *Logic:* Dispatches message to AWS SQS FIFO queue (`SCAN_QUEUE_URL`) with `MessageGroupId` (sanitized target hostname) and `MessageDeduplicationId: ${job.scanId}_${Date.now()}`. If local mode or offline fallback, schedules asynchronous invocation via `setImmediate(() => executeScanPipelineLocally(job))`.
- **`getLambdaClient()` / `setLambdaClient(customClient)`**:
  - Getter and setter for the AWS SDK `LambdaClient`.
- **`runPythonInspectorViaLambda(targetUrl, scanId, scanProfile = 'baseline_public')`**:
  - *Parameters:* `targetUrl` (`string`), `scanId` (`string`), `scanProfile` (`string`).
  - *Returns:* `Promise<{ success: boolean, report: object, s3Key?: string, invokedVia: string, error?: string }>`.
  - *Logic:* Executes `InvokeCommand` on the AWS Lambda function `vibesift-python-inspector-dev`, decodes payload, and returns parsed inspector report.
- **`runLivePythonInspector(targetUrl, scanId, scanProfile = 'baseline_public')`**:
  - *Logic:* Spawns child process `python inspector.py --url ... --scan-id ... --output ... --profile ...`. Reads JSON result on exit.
- **`runLiveLighthouse(targetUrl, scanId)`**:
  - *Logic:* Spawns child process `node runner.js --url ... --scan-id ... --output ...`. Reads JSON result on exit.
- **`executeScanPipelineLocally(job)`**:
  - *Parameters:* `job` (Scan job specification).
  - *Returns:* `Promise<void>`.
  - *Pipeline Execution Steps:*
    1. Validates and asserts state transition `QUEUED ➔ VALIDATING`.
    2. Runs SSRF resolution check `resolveAndValidateHost()`.
    3. Asserts transition `VALIDATING ➔ RUNNING`.
    4. Triggers Python Inspector (via AWS Lambda or local child process) and Lighthouse worker in parallel.
    5. Checks terminal state with `determineTerminalStatus(enginesRun)`. If all failed, transitions to `FAILED` with exact failure reason.
    6. Asserts transition `RUNNING ➔ NORMALIZING`.
    7. Ingests genuine Lighthouse category scores directly (`performance`, `accessibility`, `seo`, `best-practices`) and extracts Core Web Vitals into the Check Registry.
    8. Calculates Launch Readiness Score (0-100) via multi-pillar weighted formula (Security 25%, Performance 20%, Accessibility 15%, SEO 15%, Privacy 15%, Completeness/Trust 10%, capped at 50 if Critical defects exist).
    9. Enriches findings with deterministic developer guidance via `explanationService.explainFinding()`.
    10. Calls `buildAuditReport()` and `explanationService.generateExecutiveSummary()`.
    11. Generates markdown report and writes `report.json` and `report.md` to S3 / local storage via `s3Service.saveReport()`.
    12. Persists findings to DynamoDB / SQLite via `dbService.saveFindings()`.
    13. Asserts transition `NORMALIZING ➔ COMPLETED` (or `PARTIAL`).
    14. Updates scan record with final scores, check counts, duration, and engine execution statuses.

### File: `backend/src/orchestration/sqsConsumer.js`
Continuous EC2 background worker and Lambda handler for Amazon SQS FIFO queue processing.

#### Functions:
- **`startSqsPollingWorker({ signal })`**:
  - *Logic:* Continuous background polling worker running under PM2 as `vibesift-sqs-worker`. Hydrates environment parameters from AWS SSM Parameter Store (`/vibesift/prod/`), connects to `vibesift-scan-jobs.fifo`, and executes 20-second long-polling (`ReceiveMessageCommand`). Dispatches message body to `processScanJob(job)`, and deletes message upon completion (`DeleteMessageCommand`). Unhandled exceptions allow the message to retry up to 3 times before SQS automatically shifts it to the DLQ.
- **`processScanJob(job)`**:
  - *Parameters:* `job` (Parsed scan job payload).
  - *Logic:* Logs job initiation and invokes `executeScanPipelineLocally(job)`.
- **`handler(event)`**:
  - *Parameters:* `event` (`{ Records: Array<{ body: string, messageId: string }> }`).
  - *Returns:* `Promise<{ statusCode: number, processed: number }>`.
  - *Logic:* SQS event trigger handler for serverless Lambda execution mode.

---

## 9. Backend Services & Storage Layer Reference

### File: `backend/src/services/scanStateService.js`
Finite state machine definitions and transition guards.

#### Constants:
- **`VALID_TRANSITIONS`**: FSM adjacency list defining permitted transitions.
- **`TERMINAL_STATES`**: Set containing `COMPLETED`, `PARTIAL`, `FAILED`, `CANCELLED`.

#### Classes & Functions:
- **`InvalidStateTransitionError`**:
  - Custom error class with properties `fromState`, `toState`, `scanId`, `statusCode: 409`.
- **`canTransition(currentState, nextState, scanId = 'unknown')`**:
  - *Returns:* `boolean`. Returns `true` if transitioning to the exact same state (idempotent) or if `nextState` exists in `VALID_TRANSITIONS[currentState]`.
- **`assertTransition(currentState, nextState, scanId = 'unknown')`**:
  - *Throws:* `InvalidStateTransitionError` if transition is illegal.
- **`determineTerminalStatus(engines)`**:
  - *Parameters:* `engines` (`Array<{ status: string }>`).
  - *Returns:* `'COMPLETED' | 'PARTIAL' | 'FAILED'`.
  - *Rules:* Returns `'FAILED'` if all non-skipped engines failed. Returns `'PARTIAL'` if at least one passed and at least one failed. Returns `'COMPLETED'` if all passed.

### File: `backend/src/services/ssrfGuard.js`
Node.js SSRF protection, IP CIDR validation, and DNS rebinding prevention.

#### Functions:
- **`ipv4ToInt(ip)`**:
  - *Parameters:* `ip` (`string`).
  - *Returns:* 32-bit unsigned integer or `null` if invalid.
- **`ipInCidr(ipInt, cidr)`**:
  - *Parameters:* `ipInt` (`number`), `cidr` (`string`).
  - *Returns:* `boolean`. Bitwise mask comparison.
- **`isDisallowedIpv4(ip)`**:
  - *Returns:* `boolean`. Checks against the 16 private/reserved IPv4 CIDR blocks.
- **`isDisallowedIpv6(ip)`**:
  - *Returns:* `boolean`. Checks loopback, link-local, ULA, multicast, and IPv4-mapped IPv6.
- **`isDisallowedIp(ip)`**:
  - *Returns:* `boolean`. Inspects IP family via `net.isIP(ip)`.
- **`validateAndNormalizeUrl(rawUrl)`**:
  - *Returns:* `{ url: URL, normalizedUrl: string, hostname: string }`.
  - *Checks:* Non-empty string, no control characters/whitespace, strictly HTTP/HTTPS protocol, no embedded credentials, non-empty hostname, blocked hostname patterns, obfuscated decimal/octal IP detection, direct private IP check, and port whitelist (`80, 443, 8080, 8443`).
- **`resolveAndValidateHost(hostname)`**:
  - *Parameters:* `hostname` (`string`).
  - *Returns:* `Promise<string[]>`. Resolves hostname using `dns.lookup(hostname, { all: true })`. Checks every returned IP against `isDisallowedIp()`.
- **`validateRedirectTarget(redirectUrl, currentUrl)`**:
  - *Returns:* `Promise<{ normalizedUrl: string, hostname: string, ip: string }>`. Re-validates redirect destinations.

### File: `backend/src/services/domainVerification.js`
Domain ownership challenge and verification engine.

#### Functions:
- **`generateVerificationChallenge(siteId, hostname)`**:
  - *Returns:* `{ siteId, hostname, token, methods: { dns_txt, html_meta, http_file } }`.
- **`checkDnsTxtRecord(hostname, token, resolverOverride = null)`**:
  - *Returns:* `Promise<boolean>`. Resolves TXT records for `_vibesift-challenge.<hostname>` and `<hostname>`.
- **`checkHttpVerification(hostname, token, method, fetcherOverride = null)`**:
  - *Returns:* `Promise<boolean>`. Performs safe HTTP GET request with SSRF guard and 6-second timeout. Searches for HTML meta tag or plain text in `/.well-known/vibesift-verification.txt`.
- **`verifyDomainOwnership({ hostname, token, method, resolverOverride, fetcherOverride })`**:
  - *Returns:* `Promise<{ verified: boolean, method: string, timestamp: string }>`.
- **`matchesVerifiedDomain(targetHost, verifiedHost)`**:
  - *Returns:* `boolean`. Returns `true` if `targetHost === verifiedHost` or `targetHost.endsWith('.' + verifiedHost)`.

### File: `backend/src/services/explanationService.js`
Deterministic rules-based explanation and executive summary service (zero external AI latency, zero cost).

#### Classes & Methods:
- **`DeterministicExplanationService`**:
  - `explainFinding(finding)`: Returns structured technical explanation, user impact, observed evidence, and framework-specific code remediation snippets.
  - `generateExecutiveSummary(reportSummary, topFindings)`: Generates 3-sentence posture summary based on Launch Readiness score brackets (Strong, Good, Moderate Action, Critical Action) and severity counts.
- **`explanationService`**: Shared singleton instance.

### File: `backend/src/services/cognitoAuth.js`
AWS Cognito Identity Provider client service.

#### Functions:
- **`getCognitoClient()` / `setCognitoClient(client)`**: Client factory and setter.
- **`mapCognitoError(err)`**: Maps AWS exceptions (`NotAuthorizedException`, `UserNotFoundException`, `UserNotConfirmedException`, `UsernameExistsException`, `InvalidPasswordException`, `CodeMismatchException`, `ExpiredCodeException`, `TooManyRequestsException`) to user-friendly messages and HTTP status codes.
- **`cognitoSignUp({ email, password, name })`**: Invokes `SignUpCommand`.
- **`cognitoConfirmSignUp({ email, code })`**: Invokes `ConfirmSignUpCommand`.
- **`cognitoResendCode({ email })`**: Invokes `ResendConfirmationCodeCommand`.
- **`cognitoLogin({ email, password })`**: Invokes `InitiateAuthCommand` with `AuthFlow: 'USER_PASSWORD_AUTH'`. Decodes ID/Access token to extract user profile.
- **`cognitoGetUser(accessToken)`**: Invokes `GetUserCommand` to fetch fresh user attributes.

### File: `backend/src/services/dynamoStorage.js`
DynamoDB storage implementation with transparent SQLite dev fallback and cross-tenant caching support.

#### Methods in `DynamoStorageService`:
- **Sites:**
  - `saveSite(site)`: Puts site record into `VibeSift-SavedWebsites-dev`.
  - `getSite(siteId, ownerUserId)`: Gets site by primary key, verifying ownership.
  - `getSiteByHostname(hostname, ownerUserId)`: Queries sites by hostname.
  - `listSitesByUser(ownerUserId)`: Queries GSI `ownerUserId-index`.
  - `deleteSite(siteId, ownerUserId)`: Deletes site item.
  - `getSiteStats(siteIdOrHostname, ownerUserId)`: Aggregates historical scores, score delta, and findings summary.
- **Scans:**
  - `saveScan(scan)`: Writes scan item to `VibeSift-Scans-dev`.
  - `getScan(scanId, ownerUserId)`: Reads scan item.
  - `getLatestCompletedScanForSite(hostname)`: Performs global scan across all tenants for completed audits on the hostname with SQLite fallback, enabling global cross-tenant precheck caching.
  - `getLatestScanForSite(hostname, ownerUserId)`: Finds most recent scan for hostname. If `ownerUserId` is null, delegates to `getLatestCompletedScanForSite(hostname)`.
  - `getScanByIdempotencyKey(ownerUserId, idempotencyKey)`: Queries GSI `idempotency-index`.
  - `listScansByUser(ownerUserId, options)`: Queries GSI `ownerUserId-createdAt-index` in descending order.
  - `updateScan(scanId, updateData)`: Constructs dynamic `UpdateExpression` and executes `UpdateCommand`.
- **Findings:**
  - `saveFindings(scanId, findings)`: Splits findings into 25-item chunks and executes `BatchWriteCommand` to `VibeSift-Findings-dev`.
  - `getFindingsByScan(scanId, options)`: Queries GSI `scanId-index` with optional category and severity filtering.
  - `updateFindingStatus(scanId, findingId, verificationStatus)`: Updates `verificationStatus` to `'open' | 'fixed' | 'waived'`.

### File: `backend/src/services/s3Storage.js`
Amazon S3 artifact storage with local filesystem fallback and global audit discovery.

#### Methods in `S3StorageService`:
- `saveRawEngineOutput(scanId, engineName, rawData)`: Writes raw JSON output to `scans/${scanId}/raw/${engineName}.json` with KMS encryption.
- `saveReport(scanId, reportData, markdownReport = null)`: Writes `scans/${sanitizedHost}__${scanId}/report.json` and `report.md`.
- `findLatestScanReportByHostname(hostname)`: Uses `ListObjectsV2Command` to search prefixes `scans/${sanitizedHost}__` and `audits/${sanitizedHost}__` for the most recent completed `report.json` to enable cross-tenant instant report discovery.
- `getPresignedDownloadUrl(key, expiresInSeconds = 900)`: Uses `@aws-sdk/s3-request-presigner` to create a signed GET URL.
- `getObjectContent(key)`: Fetches object body and returns as UTF-8 string.

### File: `backend/src/services/sqliteStorage.js`
SQLite storage implementation powering local development mode.

#### Methods in `SqliteStorage`:
- `initSchema()`: Creates tables `sites`, `scans`, `findings`, `users` and secondary indices.
- Complete parity with `DynamoStorageService` methods: `saveSite`, `getSite`, `getSiteByHostname`, `listSitesByUser`, `deleteSite`, `getSiteStats`, `saveScan`, `getScan`, `getLatestScanForSite`, `getScanByIdempotencyKey`, `listScansByUser`, `updateScanStatus`, `saveFindings`, `getFindingsByScan`, `updateFindingStatus`, `saveUser`, `getUserByEmail`, `getUserById`.
- Internal row mappers: `_mapSiteRow`, `_mapScanRow`, `_mapFindingRow`.

### File: `backend/src/services/ssmService.js`
AWS Systems Manager (SSM) Parameter Store integration service for centralized runtime configuration and secret management.

#### Functions:
- **`getSSMClient()` / `setSSMClient(client)` / `resetSSMClient()`**: SSM client factory with lazy initialization, testing client injection, and client reset.
- **`getSSMParameter(paramName, decrypt = true)`**:
  - *Parameters:* `paramName` (`string`), `decrypt` (`boolean`, default `true`).
  - *Returns:* `Promise<string|null>`. Fetches parameter using `GetParameterCommand` with decryption. Falls back gracefully to matching environment variable (`process.env`) when AWS credentials or SSM parameter is unavailable.
- **`getSSMParametersByPath(pathPrefix, decrypt = true, recursive = true)`**:
  - *Parameters:* `pathPrefix` (`string`), `decrypt` (`boolean`), `recursive` (`boolean`).
  - *Returns:* `Promise<Record<string, string>>`. Fetches all parameters matching prefix via `GetParametersByPathCommand` with pagination support (`NextToken`). Returns a key-value dictionary where keys are parameter suffixes.
- **`putSSMParameter(paramName, paramValue, type = 'SecureString', overwrite = true)`**:
  - *Parameters:* `paramName` (`string`), `paramValue` (`string`), `type` (`'String'|'SecureString'`), `overwrite` (`boolean`).
  - *Returns:* `Promise<number>`. Puts or updates a parameter via `PutParameterCommand`, returning the parameter version.


---

## 10. Python Inspector Worker & Security Suite Reference

### File: `backend/src/workers/python-inspector/ssrf_guard.py`
Python port of the SSRF defense layer.

#### Functions:
- `is_disallowed_ip(ip_str: str) -> bool`: Validates IPv4/IPv6 addresses against private/reserved CIDRs.
- `validate_url(url_str: str) -> Tuple[str, str, int]`: Validates URL format and returns `(normalized_url, hostname, port)`.
- `resolve_and_validate_host(hostname: str) -> List[str]`: Resolves DNS A/AAAA records and validates every returned IP.

### File: `backend/src/workers/python-inspector/inspector.py`
Unified coordinator running `BasicAuditor`, `DeepAuditor`, and `PrivacyAuditor`.

#### Classes & Methods:
- **`SafeSession(requests.Session)`**:
  - `__init__(max_response_size: int = 2 * 1024 * 1024)`: Limits response memory consumption to 2MB.
  - `request(method, url, **kwargs)`: Intercepts request, checks SSRF, streams and truncates content, inspects redirect history, and validates every redirect hop against SSRF rules.
- **`UnifiedInspector`**:
  - `__init__(target_url, scan_id, profile, max_pages, timeout, job_timeout)`
  - `run() -> Dict[str, Any]`:
    1. Executes `BasicAuditor.run_suite()` (34 checks).
    2. Caches root response object.
    3. If `profile == 'authorized_deep'`: Executes `DeepAuditor.run_suite()` (22 checks) and `PrivacyAuditor.run_suite()` (15 checks). Calculates comparison metrics (`additionalChecksExecuted`, `independentTestsCount`, `reusedEvidenceCount`, `confirmedVulnerabilitiesCount`, `potentialRisksCount`).
    4. If `profile == 'baseline_public'`: Executes passive checks in `PrivacyAuditor`.
    5. Returns unified report dictionary.

### File: `backend/src/workers/python-inspector/basic_auditor.py`
Performs 34 website completeness, trust, SEO, and performance health checks.

#### Methods in `BasicAuditor`:
1. `record_check(check_id, name, category, status, ...)`: Records check and appends finding if status is fail/warning.
2. `run_suite()`: Orchestrates execution of all 34 checks.
3. `_fetch_main_page()`: Fetches root URL.
4. `_check_footer_presence(soup, html)`: Verifies `<footer>` or footer class.
5. `_check_contact_page(soup, html)`: Detects contact page link or email mailto.
6. `_check_about_page(soup, html)`: Detects about page link.
7. `_check_privacy_policy_page(soup, html)`: Verifies privacy policy presence.
8. `_check_terms_page(soup, html)`: Verifies terms of service link.
9. `_check_cookie_policy_page(soup, html)`: Checks for cookie policy or banner.
10. `_check_broken_links(soup)`: Samples internal navigation links.
11. `_check_favicon(soup)`: Verifies `<link rel="icon">` or `/favicon.ico`.
12. `_check_social_metadata(soup, html)`: Inspects Open Graph (`og:title`, `og:image`) and Twitter Card tags.
13. `_check_canonical_url(soup)`: Inspects `<link rel="canonical">`.
14. `_check_404_handling()`: Tests non-existent URL response status.
15. `_check_robots_txt()`: Inspects `/robots.txt` format and directives.
16. `_check_sitemap_xml()`: Inspects `/sitemap.xml`.
17. `_check_security_txt()`: Inspects `/.well-known/security.txt` per RFC 9116.
18. `_check_page_title(soup, html)`: Evaluates `<title>` length and quality.
19. `_check_meta_description(soup, html)`: Evaluates `<meta name="description">` length.
20. `_check_h1_headings(soup, html)`: Verifies presence of exactly one `<h1>`.
21. `_check_image_alt_texts(soup)`: Evaluates accessibility `alt` attributes on `<img>` tags.
22. `_check_canonical_validity(soup)`: Checks canonical URL matches target domain.
23. `_check_http_to_https_redirect()`: Verifies HTTP port 80 redirects to HTTPS 443.
24. `_check_mixed_content(soup)`: Flags insecure `http://` asset references on HTTPS pages.
25. `_check_html_lang(soup, html)`: Verifies `<html lang="...">` attribute.
26. `_check_indexability_directives(resp, soup)`: Inspects `X-Robots-Tag` and `<meta name="robots">`.
27. `_check_structured_data(soup, html)`: Detects JSON-LD schema markup.
28. `_check_html_size(resp)`: Warns if HTML document exceeds 100KB uncompressed.
29. `_check_resource_counts(soup)`: Tallies external scripts, stylesheets, and fonts.
30. `_check_image_dimensions(soup)`: Flags images missing `width` or `height` attributes (prevents CLS).
31. `_check_resource_compression(resp)`: Verifies `content-encoding: gzip | br | zstd`.
32. `_check_static_cache_headers(resp)`: Inspects `Cache-Control` directives.
33. `_check_redirect_chains(redirect_history)`: Flags excessive redirect hops.
34. `_check_tls_certificate()`: Inspects TLS protocol version and certificate expiration date.
35. `_check_mobile_viewport(soup, html)`: Verifies `<meta name="viewport" content="width=device-width...">`.
36. `_check_a11y_landmarks_and_labels(soup)`: Checks `<main>`, `<nav>`, and form field `<label>` associations.

### File: `backend/src/workers/python-inspector/deep_auditor.py`
Performs 22 deep active security checks (authorized scope only).

#### Methods in `DeepAuditor`:
1. `record_check(...)`: Records security check results.
2. `run_suite(root_resp)`: Executes deep security tests.
3. `_test_xss_reflection()`: Injects benign alphanumeric canary probe `vbsxss7a9b` and verifies proper HTML escaping.
4. `_test_sqli_heuristic()`: Tests parameter handling with benign SQL syntax characters (`'`, `"`).
5. `_test_csrf_controls(soup)`: Inspects `<form method="POST">` for anti-CSRF tokens.
6. `_test_security_headers_suite(headers)`: Evaluates HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
7. `_test_csp_in_depth(headers)`: Evaluates Content Security Policy (`default-src`, `script-src`, unsafe-inline, object-src).
8. `_test_clickjacking_protection(headers)`: Verifies `X-Frame-Options: DENY|SAMEORIGIN` or CSP `frame-ancestors`.
9. `_test_open_redirects(soup)`: Tests redirect parameters (`?redirect=`, `?next=`, `?url=`).
10. `_test_path_traversal(soup)`: Tests file parameters for directory traversal patterns (`../`).
11. `_test_ssrf_surface(soup)`: Scans form fields and URL parameters for webhook/callback destinations.
12. `_test_auth_endpoints(soup)`: Identifies login/signup routes and enforces HTTPS.
13. `_test_session_cookie_security(root_resp)`: Enforces `Secure`, `HttpOnly`, and `SameSite` flags on `Set-Cookie`.
14. `_test_cors_misconfiguration()`: Probes CORS with `Origin: https://evil-attacker.example` and checks for wildcard reflection with credentials.
15. `_test_info_disclosure()`: Inspects `Server`, `X-Powered-By`, and `X-AspNet-Version` response headers.
16. `_test_sensitive_file_exposure()`: Probes for exposed `/.env`, `/.git/HEAD`, `/.aws/credentials`, `/.DS_Store`.
17. `_test_http_methods()`: Tests HTTP method tampering (`PUT`, `DELETE`, `TRACE`, `TRACK`).
18. `_test_rate_limiting()`: Sends rapid burst of requests to verify 429 rate-limiting responses.
19. `_test_brute_force_defense(soup)`: Analyzes login endpoints for account lockout or CAPTCHA defenses.
20. `_test_api_exposure()`: Scans for unauthenticated OpenAPI/Swagger specs (`/swagger.json`, `/openapi.json`, `/api-docs`).
21. `_test_tls_hardening(headers)`: Enforces TLS 1.2+ and HSTS `includeSubDomains`.
22. `_test_dns_email_security()`: Checks DNS TXT records for SPF (`v=spf1`) and DMARC (`v=DMARC1`).
23. `_test_client_dependencies(soup, html)`: Scans `<script src="...">` tags for Subresource Integrity (`integrity="sha384-..."`) attributes.
24. `_test_cache_security(headers)`: Enforces `no-store` on sensitive responses.

### File: `backend/src/workers/python-inspector/privacy_auditor.py`
Performs 15 Indian DPDP Act (2023) & privacy compliance checks.

#### Methods in `PrivacyAuditor`:
1. `record_check(...)`: Records privacy check result.
2. `run_suite(root_resp)`: Executes all DPDP checks.
3. `_find_and_fetch_privacy_policy(soup)`: Crawls navigation links to locate privacy notice.
4. `_check_privacy_policy_exists(policy_url)`: Verifies accessible privacy notice (DPDP Section 5).
5. `_check_data_collection_disclosure(policy_text)`: Verifies itemized personal data categories disclosure.
6. `_check_consent_mechanism(soup)`: Detects affirmative consent banners / cookie controls.
7. `_check_specific_purpose_linked(policy_text, soup)`: Verifies purpose limitation clauses (DPDP Section 6).
8. `_check_pre_consent_tracking(root_resp)`: Flags tracking cookies or analytics beacons firing before user consent.
9. `_check_reject_parity(soup, has_consent_banner)`: Enforces equal prominence for "Reject All" vs "Accept All" buttons.
10. `_check_consent_withdrawal(soup)`: Verifies mechanism for withdrawing consent as easily as giving it (DPDP Section 6(4)).
11. `_check_cookie_alignment(root_resp, policy_text)`: Compares observed cookies against policy disclosures.
12. `_check_third_party_trackers(soup, html)`: Detects third-party marketing and analytics scripts.
13. `_check_form_purpose_notice(soup)`: Verifies inline privacy notices on data capture forms.
14. `_check_data_principal_rights(policy_text)`: Verifies rights to access, correction, erasure, and grievance redressal.
15. `_check_children_data_section9(policy_text)`: Verifies parental consent clause for processing children's data (DPDP Section 9).
16. `_check_retention_sharing(policy_text)`: Evaluates data retention timelines and third-party processor disclosures.
17. `_check_grievance_officer(policy_text)`: Verifies contact details of Data Protection / Grievance Officer in India (DPDP Section 8(10)).
18. `_generate_overall_assessment()`: Synthesizes overall compliance rating (`compliant`, `needs_attention`, `high_risk`).

---

## 11. Lighthouse Worker & Core Web Vitals Reference

### File: `backend/src/workers/lighthouse/runner.js`
CLI runner invoking Google Lighthouse via headless Chromium.

#### Functions:
- **`run()`**:
  - Parses `--url`, `--scan-id`, `--output`, `--emulatedFormFactor`.
  - Discovers Chrome executable (`CHROME_PATH`, `/usr/bin/google-chrome`, `/usr/bin/chromium`).
  - Launches headless Chromium with security flags (`--headless`, `--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`).
  - Invokes `lighthouse()` with categories: `['performance', 'accessibility', 'best-practices', 'seo']`.
  - Extracts Core Web Vitals metrics:
    - **LCP (Largest Contentful Paint):** Target $\le 2.5\text{s}$.
    - **FCP (First Contentful Paint):** Target $\le 1.8\text{s}$.
    - **CLS (Cumulative Layout Shift):** Target $\le 0.1$.
    - **TBT (Total Blocking Time):** Target $\le 200\text{ms}$.
  - Kills Chrome process and writes finalized JSON report to `--output`.

---

## 12. Frontend Architecture & State Management Reference

### File: `src/context/AuthContext.tsx`
Authentication state provider wrapping the React tree.

#### Context Value & Functions:
- `user: AuthUser | null`: Authenticated user identity.
- `isAuthenticated: boolean`: `Boolean(user)`.
- `isLoading: boolean`: Session initialization state.
- `isMockMode: boolean`: Indicates local development mode.
- `login(email: string, password: string)`: Calls `authService.login()`, updates `user`, closes login modal.
- `signup(email: string, password: string, name: string)`: Calls `authService.signup()`.
- `confirmSignup(email: string, code: string)`: Calls `authService.confirmSignup()`.
- `resendCode(email: string)`: Calls `authService.resendCode()`.
- `logout()`: Clears auth tokens and sets `user = null`.
- `openLoginModal()` / `closeLoginModal()`: Controls login modal visibility.
- **`useAuth()`**: Hook consuming `AuthContext`.

### File: `src/context/AuditContext.tsx`
Global audit state provider managing active reports, scans list, and live polling.

#### Context Value & Functions:
- `activeReport: AuditReport | null`: Report currently displayed in view.
- `setActiveReport(report)`: Setter.
- `loadSampleReport(sampleKey)`: Loads pre-generated sample report.
- `scansList: AuditReport[]`: List of user audits.
- `savedWebsites: SavedWebsite[]`: User's saved sites.
- `isScanning: boolean`: Boolean scan progress flag.
- `scanProgress: { status, stageMessage, percent, currentEngine } | null`: Granular step progress.
- `startNewScan(url: string, profile: ScanProfile)`: Submits scan via `submitScan()`, starts 1-second polling loop against `getReport()`, updates progress bar, and returns `scanId`.
- `rescanWebsite(scanId: string)`: Re-triggers audit for existing target.
- `markFindingResolved(findingId: string)`: Toggles finding status (`fixed` $\leftrightarrow$ `open`) and recalculates readiness score client-side.
- `verifyDomain(siteId: string)`: Triggers domain verification.
- `addSavedWebsite(hostname: string)`: Adds website to saved list.
- `openNewScanModal(defaultUrl?)` / `closeNewScanModal()`: Controls scan submission modal.
- **`useAudit()`**: Hook consuming `AuditContext`.

---

## 13. Frontend API Client, Hooks & Utilities Reference

### File: `src/lib/api/client.ts`
- **`apiClient<T>(endpoint: string, options?: RequestInit): Promise<T>`**: Fetch wrapper injecting Bearer token from `localStorage`, setting `Content-Type: application/json`, handling HTTP 204 No Content, and translating non-2xx responses into `ApiError`.
- **`getAuthToken() / setAuthToken(token)`**: Manages token in `localStorage`.
- **`ApiError`**: Custom error class with `statusCode`, `code`, and `details`.

### File: `src/lib/api/scans.ts`
- **`submitScan(payload: ScanSubmissionPayload)`**: `POST /scans`.
- **`getScanStatus(scanId: string)`**: `GET /scans/:scanId`.
- **`listScans(params?: { search, profile })`**: `GET /scans`.
- **`rescanTarget(scanId: string)`**: `POST /scans/:scanId/rescan`.
- **`cancelScan(scanId: string)`**: `POST /scans/:scanId/cancel`.

### File: `src/lib/api/reports.ts`
- **`getReport(scanId: string)`**: `GET /reports/:scanId`.
- **`resolveFinding(scanId, findingId, status)`**: `PATCH /reports/:scanId/findings/:findingId`.
- **`generateReportMarkdown(report: AuditReport)`**: Converts audit report to Markdown string client-side.
- **`downloadReportJson(report: AuditReport)`**: Triggers browser download of report JSON file.

### File: `src/lib/api/sites.ts`
- **`listSavedSites()`**: `GET /sites`.
- **`addSavedSite(hostname: string)`**: `POST /sites`.
- **`deleteSavedSite(siteId: string)`**: `DELETE /sites/:siteId`.
- **`requestDomainVerification(siteId, method)`**: `POST /sites/:siteId/verify-request`.
- **`confirmDomainVerification(siteId)`**: `POST /sites/:siteId/verify-confirm`.
- **`getSiteStats(siteId)`**: `GET /sites/:siteId/stats`.
- **`getHostnameStats(hostname)`**: `GET /sites/stats?hostname=...`.
- **`getSiteScans(siteId)`**: `GET /sites/:siteId/scans`.

### File: `src/hooks/useScans.ts`
- **`isScanTerminal(status)`**: Returns `true` if status is `COMPLETED`, `PARTIAL`, `FAILED`, or `CANCELLED`.
- **`useScansList(filters)`**: TanStack React Query hook for `listScans`.
- **`useScanReport(scanId)`**: TanStack React Query hook polling `getScanStatus` every 2000ms until terminal status.
- **`useSubmitScan()`**: Mutation hook for `submitScan`.
- **`useRescan()`**: Mutation hook for `rescanTarget`.
- **`useCancelScan()`**: Mutation hook for `cancelScan`.
- **`useResolveFinding()`**: Mutation hook for `resolveFinding`.

### File: `src/hooks/useSites.ts`
- **`useSavedSites()`**: React Query hook for `listSavedSites`.
- **`useAddSavedSite()`**: Mutation hook for `addSavedSite`.
- **`useDeleteSavedSite()`**: Mutation hook for `deleteSavedSite`.
- **`useConfirmVerification()`**: Mutation hook for `confirmDomainVerification`.

### File: `src/lib/validation/urlSchema.ts`
- **`normalizeTargetUrl(inputUrl: string)`**: Adds `https://` if protocol missing, lowercases domain, strips trailing slash on root.
- **`isInternalOrPrivateHost(hostname: string)`**: Validates against loopback, RFC 1918, link-local, AWS IMDS.
- **`targetUrlSchema`**: Zod schema validating input URLs.
- **`scanSubmissionSchema`**: Full scan submission form schema.

### File: `src/lib/export/pdfReportGenerator.ts`
- **`exportReportToPdf(report: AuditReport)`**: Multi-page PDF generator using `jsPDF` and `jspdf-autotable`. Formats:
  1. Emerald branding header & Launch Readiness Score badge.
  2. Audit metadata bar (Scan ID, date, profile, duration).
  3. Executive summary text.
  4. Category scores table and severity distribution table.
  5. Actionable findings with technical explanations, user impact analysis, recommended remediation specs, code snippets, and observed server evidence.
  6. Scope exclusions & non-tested boundary notes.
  7. Page footers with page numbering.

### File: `src/lib/cookies/cookieConsent.ts`
- **`getCookieConsent()`**: Reads cookie preferences from `localStorage`.
- **`saveCookieConsent(prefs)`**: Stores preferences and emits `COOKIE_CHANGE_EVENT`.
- **`acceptAllCookies()`**: Grants all permissions.
- **`rejectNonEssentialCookies()`**: Denies non-essential cookies.
- **`hasConsented()`**: Checks if user has made a selection.
- **`triggerCookieSettingsModal()`**: Opens cookie settings modal.

---

## 14. Frontend Component & Page Catalog

### Pages:
- **`LandingPage.tsx`**: Public homepage featuring hero scanner form, live capability strips, interactive report preview, problem statements, before/after precision comparison, and launch studio CTA.
- **`DashboardPage.tsx`**: Authenticated developer dashboard displaying saved sites, recent audits, quick scan action, and launch readiness trends.
- **`ScanDetailPage.tsx`**: Deep audit report view with category score cards, severity filters, actionable remediation guidance, code snippets, and PDF export.
- **`NewScanPage.tsx`**: Dedicated full-page audit submission interface.
- **`HistoryPage.tsx`**: Historical audit log with search, profile filters, and re-scan triggers.
- **`SitesPage.tsx`**: Saved websites management and domain verification challenge interface.
- **`SettingsPage.tsx`**: User profile, Cognito credentials, and quota settings.
- **`LoginPage.tsx` / `SignupPage.tsx`**: Authentication pages.
- **`AuditMethodologyPage.tsx`**: Full disclosure of testing vectors and non-tested boundaries.
- **`RemediationSpecsPage.tsx`**: Developer remediation guidelines.
- **`PrivacyPolicyPage.tsx` / `SecurityPolicyPage.tsx`**: Legal policies and RFC 9116 security declaration.
- **`NotFoundPage.tsx`**: 404 error page.

### Key Components:
- **`ReadinessScoreGauge.tsx`**: Circular SVG gauge visualizing score (0-100) with dynamic emerald/amber/rose color transitions.
- **`SeverityDistributionBar.tsx`**: Horizontal stacked bar displaying critical, high, medium, low, info proportions.
- **`FindingCard.tsx`**: Collapsible card detailing rule ID, confidence, impact, remediation snippet, server evidence, and resolve toggle.
- **`FindingFilters.tsx`**: Multi-select filter bar for category, severity, and verification status.
- **`CheckRegistryView.tsx`**: Tabular view of all 71 individual evaluated checks.
- **`PrivacyComplianceSection.tsx`**: DPDP Act compliance summary card with grievance officer and consent parity indicators.
- **`DeepComparisonSection.tsx`**: Comparative breakdown between Baseline Public and Authorized Deep audit runs.
- **`CookieConsentBanner.tsx`**: Balanced DPDP-compliant consent banner with equal "Accept All" and "Reject Non-Essential" parity.

---

## 15. Infrastructure as Code (AWS CDK) Reference

The infrastructure is defined in TypeScript using AWS CDK v2 (`infra/`):

### 1. `DataStack` (`infra/lib/data-stack.ts`)
- **AWS KMS Key:** Customer-managed key (`alias/vibesift-${stage}`) with automatic annual key rotation.
- **Amazon S3 Bucket:** `vibesift-audit-reports-${stage}-${account}`. KMS encrypted, public access blocked, SSL enforced. Lifecycle rules: raw artifacts expire in 90 days; finalized reports transition to Infrequent Access after 30 days.
- **Amazon DynamoDB Tables:**
  - `VibeSift-SavedWebsites-${stage}` (Partition Key: `ownerUserId`, Sort Key: `siteId`; GSI: `HostnameIndex`).
  - `VibeSift-Scans-${stage}` (Partition Key: `ownerUserId`, Sort Key: `scanId`; GSIs: `ScanIdIndex`, `IdempotencyIndex`).
  - `VibeSift-Findings-${stage}` (Partition Key: `scanId`, Sort Key: `id`; GSIs: `CategoryIndex`, `SeverityIndex`).

### 2. `ComputeStack` (`infra/lib/compute-stack.ts`)
- **VPC:** 2 Availability Zones with public subnets and private egress subnets with NAT Gateway.
- **Security Group:** Strict egress rules allowing outbound traffic only to TCP 80, TCP 443, TCP 53, and UDP 53. All inbound traffic blocked.
- **ECS Fargate Cluster:** `vibesift-scanners-${stage}`.
- **ECR Repositories:** `vibesift/python-inspector-${stage}` and `vibesift/lighthouse-${stage}` with automated image vulnerability scanning on push.
- **Python Inspector Lambda:** Python 3.11 runtime, 1024MB RAM, 60-second timeout.
- **Fargate Task Definitions:**
  - `python-inspector`: 0.5 vCPU, 1024MB RAM.
  - `lighthouse`: 1 vCPU, 2048MB RAM (Chromium requirement).

### 3. Production Runtime Stack & Queue Architecture
- **Amazon SQS FIFO Queue:** `vibesift-scan-jobs.fifo` with 20s long-polling (`ReceiveMessageWaitTimeSeconds = 20`) and 300s visibility timeout. Guarantees per-hostname FIFO ordering using `MessageGroupId` and deduplication via `MessageDeduplicationId`.
- **Dead-Letter Queue (DLQ):** `vibesift-scan-jobs-dlq.fifo` with 14-day message retention and max receive count of 3 for poison message isolation.
- **Python Inspector Lambda:** `vibesift-python-inspector-dev`, Python 3.12 runtime, 512MB RAM, 60-second timeout, zero Docker overhead.
- **EC2 Production Host:** Ubuntu 24.04 LTS running Nginx, PM2 processes `vibesift-backend` (port 4000) and `vibesift-sqs-worker`, native Headless Chromium Lighthouse runner, and SQLite 3 WAL mode.
- **Edge Perimeter:** Cloudflare Anycast CDN, Full/Strict TLS 1.3 encryption, Turnstile bot challenges, and Layer 7 DDoS mitigation.
- **CloudWatch Alarms & EMF:** Tracks EC2 CPU utilization (>85% alert) and emits Embedded Metric Format (EMF) logs for automated latency and failure rate metrics.
- **Monthly Infrastructure Cost:** 100% AWS Free Tier eligible (~$0.00 – $1.00/mo). Zero NAT Gateways, zero Fargate clusters, zero external AI token fees.

---

## 16. Verification, DPDP Act (2023) & Compliance Standards

| Standard / Regulation | Implementation in VibeSift |
| :--- | :--- |
| **DPDP Act (2023) Section 5** | Automated detection of plain-language privacy notice prior to or at time of personal data collection. |
| **DPDP Act (2023) Section 6(1)** | Verification that consent is free, specific, informed, unconditional, and unambiguous with clear affirmative action. |
| **DPDP Act (2023) Section 6(4)** | Verification of consent withdrawal parity (withdrawal must be as easy as granting consent). |
| **DPDP Act (2023) Section 8(10)** | Automated disclosure audit for Data Protection / Grievance Officer name, email, and Indian address. |
| **DPDP Act (2023) Section 9** | Automated check for verifiable parental consent clauses regarding children's personal data. |
| **RFC 9116** | Public hosting and automated auditing of `/.well-known/security.txt` vulnerability disclosure file. |
| **OWASP ASVS v4.0** | Comprehensive automated header verification (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). |
| **W3C WCAG 2.1 AA** | Image alt attributes, form label associations, HTML lang attribute, heading structure, viewport scalability. |
| **Google Core Web Vitals** | Automated headless Lighthouse auditing of LCP, CLS, FCP, and TBT metrics. |
