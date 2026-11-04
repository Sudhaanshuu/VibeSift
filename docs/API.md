# VibeSift Backend API Contract & Endpoints Reference

> **Base URL (Production):** `https://vibesift.pixir.in`  
> **Base URL (Local Dev):** `http://localhost:4000` (proxied from Vite frontend on `http://localhost:5173`)  
> **Status:** 100% Verified against `backend/src/api/routes/*`  
> **Security Standards:** RFC 9116 (`security.txt`), Cloudflare Turnstile, Amazon Cognito RSA256 JWT, SSRF Defense

---

## 📑 Table of Contents
1. [Authentication & Header Specification](#1-authentication--header-specification)
2. [Cloudflare Turnstile Bot Defense Protocol](#2-cloudflare-turnstile-bot-defense-protocol)
3. [System & Compliance Endpoints (Public)](#3-system--compliance-endpoints-public)
4. [Identity & Authentication Endpoints (`/api/auth`)](#4-identity--authentication-endpoints-apiauth)
5. [Razorpay Payments & Coupons (`/api/payments`)](#5-razorpay-payments--coupons-apipayments)
6. [Website Audit Scans (`/api/scans`)](#6-website-audit-scans-apiscans)
7. [Saved Websites & Domain Verification (`/api/sites`)](#7-saved-websites--domain-verification-apisites)
8. [Report Artifacts & Downloads (`/api/reports`)](#8-report-artifacts--downloads-apireports)
9. [Standard Error Codes & Structure](#9-standard-error-codes--structure)

---

## 1. Authentication & Header Specification

All private endpoints require an Amazon Cognito JWT Bearer token in the `Authorization` header:

```http
Authorization: Bearer <cognito_access_token_or_id_token>
```

In local development mode (`USE_LOCAL_STORAGE=true`), test bearer tokens (e.g. `Bearer demo_user_123`) are accepted when `ALLOW_DEMO_AUTH=true`. In production, only RSA256 tokens cryptographically signed by the Amazon Cognito User Pool JWKS are accepted.

### Standard Request Headers
| Header | Type | Description |
| :--- | :--- | :--- |
| `Authorization` | String | Bearer JWT token issued by Amazon Cognito. |
| `Content-Type` | String | `application/json` for requests with bodies. |
| `cf-turnstile-response` | String | Cloudflare Turnstile response token for bot challenge verification. |
| `Idempotency-Key` | String | Optional client idempotency key to prevent double submissions. |

---

## 2. Cloudflare Turnstile Bot Defense Protocol

To protect compute resources, Chromium instances, Cognito authentication pools, and prevent automated spam attacks, sensitive endpoints enforce Cloudflare Turnstile bot verification when `turnstile.enabled` is active in SSM or `.env`.

### Protected Endpoints
- `POST /api/auth/login` (Authentication)
- `POST /api/auth/signup` (Account Registration)
- `POST /api/scans` (Scan Task Submission)

### Client Token Delivery Channels (Evaluated in Priority Order)
1. Header: `cf-turnstile-response: <token>`
2. Header: `x-turnstile-token: <token>`
3. JSON Body: `{ "turnstileToken": "<token>", ... }`
4. Query Parameter: `?turnstileToken=<token>`

---

## 3. System & Compliance Endpoints (Public)

### `GET /api/health` or `GET /health`
Returns system operational status, active storage driver, and orchestration mode.
- **Auth:** None (Public)
- **Response 200 OK:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-04T10:00:00.000Z",
    "uptime": 86420.5,
    "service": "vibesift-backend",
    "version": "1.0.0",
    "storage": "sqlite_wal",
    "orchestration": "sqs_fifo"
  }
  ```

### `GET /.well-known/security.txt` & `GET /security.txt`
RFC 9116 compliant security disclosure notice.
- **Auth:** None (Public)
- **Response 200 OK (`text/plain`):**
  ```text
  Contact: mailto:security@pixir.in
  Contact: https://vibesift.pixir.in/security
  Expires: 2027-12-31T23:59:59.000Z
  Preferred-Languages: en
  Canonical: https://vibesift.pixir.in/.well-known/security.txt
  Policy: https://vibesift.pixir.in/security
  ```

### `GET /robots.txt` & `GET /sitemap.xml`
Automated crawler index directives and XML sitemap routes.

---

## 4. Identity & Authentication Endpoints (`/api/auth`)

### `POST /api/auth/login`
Authenticates user with Amazon Cognito User Pool.
- **Auth:** None (Turnstile protected)
- **Request Body:**
  ```json
  {
    "email": "developer@example.com",
    "password": "SecurePassword123!",
    "turnstileToken": "0.abcdef12345..."
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "idToken": "eyJraWQi...",
    "accessToken": "eyJraWQi...",
    "refreshToken": "eyJjdHki...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "c0a80101-0000-0000-0000-000000000001",
      "email": "developer@example.com",
      "name": "Alex Rivera",
      "plan": "verified_developer"
    }
  }
  ```

### `POST /api/auth/signup`
Registers a new developer account with Cognito.
- **Auth:** None (Turnstile protected)
- **Request Body:**
  ```json
  {
    "email": "developer@example.com",
    "password": "SecurePassword123!",
    "name": "Alex Rivera",
    "turnstileToken": "0.abcdef12345..."
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "userSub": "c0a80101-0000-0000-0000-000000000001",
    "userConfirmed": false,
    "message": "User registered. Please confirm verification code sent to your email."
  }
  ```

### `POST /api/auth/confirm`
Confirms user registration using the email OTP verification code.
- **Request Body:**
  ```json
  {
    "email": "developer@example.com",
    "code": "123456"
  }
  ```

### `POST /api/auth/refresh`
Refreshes expired access tokens using the long-lived refresh token (`REFRESH_TOKEN_AUTH`).
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJjdHki..."
  }
  ```

### `GET /api/auth/me`
Retrieves authenticated user profile and active subscription plan.
- **Auth:** Bearer JWT Required

---

## 5. Razorpay Payments & Coupons (`/api/payments`)

### `GET /api/payments/config`
Retrieves public Razorpay Key ID and pricing information.
- **Auth:** None (Public)
- **Response 200 OK:**
  ```json
  {
    "keyId": "rzp_live_Td6jjT5Yl85c4L",
    "deepAuditPriceInRupees": 39,
    "currency": "INR"
  }
  ```

### `POST /api/payments/validate-coupon`
Validates a promotional coupon against S3 configuration.
- **Request Body:** `{ "couponCode": "FLAT418" }`
- **Response 200 OK:**
  ```json
  {
    "valid": true,
    "code": "FLAT418",
    "discount": 38,
    "finalAmount": 1,
    "currency": "INR",
    "message": "Promotional coupon applied: ₹38 discount. Payable: ₹1"
  }
  ```

### `POST /api/payments/create-order`
Prepares a server-side order with Razorpay Orders API.
- **Auth:** Bearer JWT Required
- **Request Body:**
  ```json
  {
    "targetUrl": "https://example.com",
    "couponCode": "FLAT418"
  }
  ```
- **Response 200 OK:**
  ```json
  {
    "orderId": "order_Px1234567890",
    "amount": 1,
    "amountInPaise": 100,
    "currency": "INR",
    "keyId": "rzp_live_Td6jjT5Yl85c4L",
    "appliedCoupon": "FLAT418"
  }
  ```

### `POST /api/payments/verify`
Validates payment signatures (`razorpay_signature`) via HMAC-SHA256 and records verified transactions.
- **Auth:** Bearer JWT Required
- **Request Body:**
  ```json
  {
    "razorpay_payment_id": "pay_XYZ123456",
    "razorpay_order_id": "order_Px1234567890",
    "razorpay_signature": "a1b2c3d4...",
    "targetUrl": "https://example.com"
  }
  ```

---

## 6. Website Audit Scans (`/api/scans`)

### `POST /api/scans/precheck`
Checks whether a completed audit already exists in SQLite or Amazon S3 for the target hostname.
- **Auth:** None (Public)
- **Request Body:** `{ "url": "https://example.com" }`
- **Response 200 OK (When cached scan exists):**
  ```json
  {
    "exists": true,
    "scanId": "scn_a1b2c3d4",
    "targetUrl": "https://example.com",
    "normalizedHostname": "example.com",
    "createdAt": "2026-11-04T08:30:00.000Z",
    "status": "COMPLETED",
    "readinessScore": 88,
    "s3Key": "scans/example.com__scn_a1b2c3d4/report.json"
  }
  ```

### `POST /api/scans`
Submits a new website audit scan to the SQS queue.
- **Auth:** Bearer JWT Required
- **Protections:** Turnstile Bot Gate + User Rate Limiter + SSRF Guard
- **Request Body:**
  ```json
  {
    "url": "https://example.com",
    "profile": "authorized_deep",
    "acknowledgedTerms": true,
    "turnstileToken": "0.abcdef...",
    "paymentId": "pay_XYZ123456",
    "idempotencyKey": "idem_12345"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "scanId": "scn_9988aabb",
    "status": "QUEUED",
    "targetUrl": "https://example.com",
    "createdAt": "2026-11-04T10:00:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: SSRF check failed (`Target host is a private network IP`).
  - `402 Payment Required`: `authorized_deep` submitted without verified Razorpay payment.
  - `403 Forbidden`: Turnstile token missing or domain not verified without owner consent.
  - `429 Too Many Requests`: Hourly quota exceeded (standard: 30 scans/hr).

### `GET /api/scans/:scanId`
Polls active telemetry and scan status. Returns full audit summary upon completion.
- **Auth:** Bearer JWT Required
- **Response 200 OK:**
  ```json
  {
    "scanId": "scn_9988aabb",
    "ownerUserId": "user_123",
    "targetUrl": "https://example.com",
    "normalizedHostname": "example.com",
    "scanProfile": "authorized_deep",
    "status": "COMPLETED",
    "durationSeconds": 45.2,
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
      }
    },
    "s3ReportKey": "scans/example.com__scn_9988aabb/report.json"
  }
  ```

### `GET /api/scans/:scanId/findings`
Returns the array of discrete `AuditFinding` objects for the scan.

### `POST /api/scans/:scanId/cancel`
Cancels a running scan. Status transitions from `QUEUED`/`VALIDATING`/`RUNNING` to `CANCELLED`.

### `GET /api/scans/quota`
Returns the user's active scan quota (remaining hourly and minute allocations).

---

## 7. Saved Websites & Domain Verification (`/api/sites`)

### `GET /api/sites`
Lists all registered websites for the authenticated user, verification status, and latest score trends.

### `POST /api/sites`
Adds a website to the user's monitored sites registry.
- **Request Body:** `{ "url": "https://example.com" }`

### `POST /api/sites/verification-challenges`
Generates cryptographically unique verification tokens and instructions:
- `dns_txt`: Add TXT record for `_vibesift-challenge.example.com` with token `vbs_verify_...`.
- `html_meta`: Add `<meta name="vibesift-site-verification" content="vbs_verify_...">` inside `<head>`.
- `http_file`: Host text file at `https://example.com/.well-known/vibesift-verification.txt`.

### `POST /api/sites/:siteId/verify`
Executes real-time verification query against DNS or HTTP endpoints to mark site as `isVerified: true`.

---

## 8. Report Artifacts & Downloads (`/api/reports`)

### `GET /api/reports/:scanId/download`
Returns presigned Amazon S3 download URLs for the finalized audit artifacts:
- `jsonUrl`: Presigned S3 URL for `report.json` (15-min TTL).
- `markdownUrl`: Presigned S3 URL for `report.md`.
- `rawOutputs`: Presigned URLs for `raw/custom-python.json` and `raw/lighthouse.json`.

---

## 9. Standard Error Codes & Structure

All error responses return standard JSON structures with descriptive machine-readable error codes:

```json
{
  "error": "Target URL resolves to a prohibited private network address.",
  "code": "SSRF_PROHIBITED",
  "statusCode": 400
}
```

| HTTP Status | Error Code | Meaning |
| :--- | :--- | :--- |
| `400` | `INVALID_URL` | Malformed target URL. |
| `400` | `SSRF_PROHIBITED` | Target resolves to loopback, RFC 1918, or AWS IMDS. |
| `401` | `UNAUTHORIZED` | Missing or invalid Cognito JWT Bearer token. |
| `402` | `PAYMENT_REQUIRED` | Deep Search attempted without ₹39 Razorpay payment. |
| `403` | `BOT_CHALLENGE_REQUIRED`| Cloudflare Turnstile token missing. |
| `403` | `DOMAIN_NOT_VERIFIED` | Deep scan attempted without verified domain ownership or terms attestation. |
| `404` | `SCAN_NOT_FOUND` | Specified scan ID does not exist. |
| `409` | `INVALID_STATE_TRANSITION` | Attempted illegal state progression (e.g. `COMPLETED` to `RUNNING`). |
| `429` | `SCAN_RATE_LIMIT_EXCEEDED` | Hourly or minute scan quota exceeded. |
| `500` | `INTERNAL_ERROR` | Unhandled runtime exception. |
