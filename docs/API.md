# VibeSift Backend API Contract

The VibeSift API exposes a documented, consistent REST interface with JSON payloads, standard HTTP status codes, and multi-tenant security isolation.

All endpoints (except `/api/health`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/confirm`, and `/api/auth/resend-code`) require an Amazon Cognito JWT Bearer token in the `Authorization` header:
```http
Authorization: Bearer <cognito_id_token_or_access_token>
```
*Note: In development mock mode (`USE_LOCAL_STORAGE=true`), any test Bearer token such as `Bearer demo_dev_123` is accepted.*

---

## 🛡️ Cloudflare Turnstile Bot Defense Protocol

To protect compute resources, Chromium instances, Cognito authentication pools, and prevent credential stuffing or automated spam attacks, sensitive endpoints enforce Cloudflare Turnstile bot verification when `turnstile.enabled` is active in SSM or `.env`.

### Protected Endpoints
- `POST /api/auth/login` (Authentication)
- `POST /api/auth/signup` (Account Registration)
- `POST /api/scans` (Scan Task Submission)

### Client Token Delivery Methods
Clients may submit the solved Turnstile challenge response through any of the following channels (checked in priority order):
1. **Header**: `cf-turnstile-response: <turnstile_token>`
2. **Header**: `x-turnstile-token: <turnstile_token>`
3. **JSON Body**: `{ "turnstileToken": "<turnstile_token>", ... }`
4. **URL Query**: `?turnstileToken=<turnstile_token>`

### Bot Challenge Error Responses

#### `403 Forbidden` (`BOT_CHALLENGE_REQUIRED`)
Returned when the endpoint requires bot verification but no token was provided. The API returns the public site key so the client widget can render immediately:
```json
{
  "error": "Bot protection verification required. Please complete the security challenge.",
  "code": "BOT_CHALLENGE_REQUIRED",
  "statusCode": 403,
  "siteKey": "0x4AAAAAAFx4L_X5foiyZTNW"
}
```

#### `403 Forbidden` (`BOT_VERIFICATION_FAILED`)
Returned when the token fails Cloudflare's server-to-server validation (e.g. token expired, already consumed, or invalid origin):
```json
{
  "error": "Bot verification challenge failed. Please refresh and try again.",
  "code": "BOT_VERIFICATION_FAILED",
  "statusCode": 403
}
```

---

## 1. Authentication

### `POST /api/auth/login`
Authenticates a user against Amazon Cognito (or local mock developer auth if demo mode enabled). Protected by Cloudflare Turnstile.

#### Request Headers
- `cf-turnstile-response` or `x-turnstile-token` *(string, required if bot defense enabled)*

#### Request Body
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123!",
  "turnstileToken": "0.1234567890abcdef..."
}
```

#### Response `200 OK`
```json
{
  "token": "eyJraWQiOi...",
  "accessToken": "eyJraWQiOi...",
  "idToken": "eyJraWQiOi...",
  "refreshToken": "eyJjdHki...",
  "expiresIn": 3600,
  "user": {
    "id": "usr_9a8b7c6d5e4f",
    "email": "developer@example.com",
    "name": "Alex Developer",
    "plan": "developer"
  }
}
```

#### Error Responses
- `400 Bad Request` (`MISSING_EMAIL` / `MISSING_PASSWORD`): Missing required authentication parameters.
- `401 Unauthorized` (`INVALID_CREDENTIALS`): Incorrect email or password.
- `403 Forbidden` (`BOT_CHALLENGE_REQUIRED` / `BOT_VERIFICATION_FAILED`): Turnstile verification missing or invalid.
- `403 Forbidden` (`USER_NOT_CONFIRMED`): User has not verified their email code yet.

---

### `POST /api/auth/signup`
Registers a new developer account via Amazon Cognito. Protected by Cloudflare Turnstile.

#### Request Body
```json
{
  "email": "developer@example.com",
  "password": "SecurePassword123!",
  "name": "Alex Developer",
  "turnstileToken": "0.1234567890abcdef..."
}
```

#### Response `201 Created`
```json
{
  "userConfirmed": false,
  "userSub": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "email": "developer@example.com"
}
```

#### Error Responses
- `400 Bad Request` (`MISSING_EMAIL` / `INVALID_PASSWORD`): Password must be at least 8 characters.
- `403 Forbidden` (`BOT_CHALLENGE_REQUIRED` / `BOT_VERIFICATION_FAILED`): Turnstile verification missing or invalid.
- `409 Conflict` (`USERNAME_EXISTS`): An account with this email address already exists.

---

### `POST /api/auth/confirm`
Confirms user registration using the one-time verification code sent by Amazon Cognito.

#### Request Body
```json
{
  "email": "developer@example.com",
  "code": "123456"
}
```

#### Response `200 OK`
```json
{
  "confirmed": true,
  "message": "Email address verified successfully. You may now sign in."
}
```

---

### `POST /api/auth/resend-code`
Requests a fresh verification code to be dispatched to the user's registered email.

#### Request Body
```json
{
  "email": "developer@example.com"
}
```

#### Response `200 OK`
```json
{
  "sent": true,
  "destination": "d***@e***.com"
}
```

---

### `GET /api/auth/me`
Fetches user profile details for the currently authenticated Cognito session.

#### Response `200 OK`
```json
{
  "id": "usr_9a8b7c6d5e4f",
  "email": "developer@example.com",
  "name": "Alex Developer",
  "plan": "developer"
}
```

---

### `POST /api/auth/refresh`
Refreshes an expired Amazon Cognito access token using the stored refresh token. Used by the frontend client's automatic 401 retry interceptor and persistent 14-day session manager.

#### Request Body
```json
{
  "refreshToken": "eyJjdHki..."
}
```

#### Response `200 OK`
```json
{
  "token": "eyJraWQiOi...",
  "accessToken": "eyJraWQiOi...",
  "idToken": "eyJraWQiOi...",
  "expiresIn": 3600
}
```

#### Error Responses
- `400 Bad Request` (`MISSING_REFRESH_TOKEN`): Missing `refreshToken` parameter in JSON body.
- `401 Unauthorized` (`SESSION_EXPIRED`): The refresh token has expired or is invalid. The client clears local session storage and prompts the user to re-authenticate.

---

## 2. System Health

### `GET /api/health`
Exposes a minimal service health indicator without leaking infrastructure details.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2026-10-27T07:30:00.000Z",
  "service": "vibesift-backend",
  "version": "1.0.0"
}
```

---

## 3. Audit Scans

### `POST /api/scans`
Submits a target website URL for audit inspection. Protected by Cloudflare Turnstile bot verification when enabled. When `profile: "authorized_deep"` is selected, verified upfront Razorpay payment is strictly enforced.

#### Request Headers
- `Authorization: Bearer <cognito_token>` *(required)*
- `cf-turnstile-response` or `x-turnstile-token` *(string, optional if passing `turnstileToken` in body)*

#### Request Body
```json
{
  "url": "https://example.com",
  "profile": "authorized_deep",
  "acknowledgedTerms": true,
  "idempotencyKey": "unique-client-req-key-001",
  "turnstileToken": "0.1234567890abcdef...",
  "paymentId": "pay_live_abc123456",
  "orderId": null,
  "couponCode": "FLAT418"
}
```

- `url` *(string, required)*: HTTP or HTTPS URL to audit. Subject to strict SSRF validation.
- `profile` *(string, default: `baseline_public`)*: `baseline_public` (free single-page passive audit) or `authorized_deep` (paid ₹39 multi-page active audit).
- `acknowledgedTerms` *(boolean, required)*: Must be `true`.
- `paymentId` *(string, conditional)*: Razorpay payment ID (`pay_...`). **Mandatory** when `profile` is `authorized_deep`.
- `orderId` *(string, optional)*: Razorpay order ID if generated.
- `couponCode` *(string, optional)*: Applied coupon code (e.g., `FLAT418`).
- `idempotencyKey` *(string, optional)*: Unique token to prevent duplicate scans on network retry.
- `turnstileToken` *(string, optional)*: Cloudflare Turnstile token from the verification widget.

#### Response `201 Created`
```json
{
  "scanId": "scn_a1b2c3d4e5f60718",
  "status": "QUEUED",
  "targetUrl": "https://example.com",
  "createdAt": "2026-10-27T07:31:00.000Z"
}
```

#### Error Responses
- `400 Bad Request` (`SSRF_BLOCKED`): Destination URL resolves to a private, loopback, or cloud metadata IP address.
- `402 Payment Required` (`PAYMENT_REQUIRED`): Attempted `authorized_deep` scan without valid upfront payment. Single deep audit is ₹39.
- `403 Forbidden` (`BOT_CHALLENGE_REQUIRED`): Cloudflare Turnstile token missing.
- `403 Forbidden` (`BOT_VERIFICATION_FAILED`): Cloudflare Turnstile token validation failed.
- `403 Forbidden` (`DOMAIN_NOT_VERIFIED`): Attempted `authorized_deep` scan on an unverified domain.
- `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED` / `QUOTA_EXCEEDED`): Hourly or minute scan submission limit reached.

---

### `GET /api/scans`
Lists previous audit scans initiated by the authenticated user.

#### Query Parameters
- `search` *(string, optional)*: Filter by target URL substring or scan ID.
- `profile` *(string, optional)*: Filter by `baseline_public` or `authorized_deep`.

#### Response `200 OK`
```json
[
  {
    "scanId": "scn_a1b2c3d4e5f60718",
    "ownerUserId": "user_demo_001",
    "targetUrl": "https://example.com",
    "normalizedHostname": "example.com",
    "scanProfile": "baseline_public",
    "status": "COMPLETED",
    "createdAt": "2026-10-27T07:31:00.000Z",
    "completedAt": "2026-10-27T07:31:45.000Z",
    "durationSeconds": 45,
    "summary": {
      "totalFindings": 3,
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 0,
      "info": 0,
      "readinessScore": 81,
      "categoryScores": {
        "seo": 90,
        "performance": 85,
        "accessibility": 88,
        "security": 75,
        "cookies": 70,
        "exposure": 100
      }
    }
  }
]
```

---

### `GET /api/scans/{scanId}`
Retrieves real-time execution status, progress, engine states, and summary scores for a specific scan.

#### Response `200 OK`
```json
{
  "scanId": "scn_a1b2c3d4e5f60718",
  "status": "RUNNING",
  "targetUrl": "https://example.com",
  "normalizedHostname": "example.com",
  "scanProfile": "baseline_public",
  "createdAt": "2026-10-27T07:31:00.000Z",
  "enginesRun": [
    {
      "engine": "custom-python",
      "displayName": "Python Website Inspector",
      "status": "passed",
      "executionTimeMs": 1420
    },
    {
      "engine": "lighthouse",
      "displayName": "Google Lighthouse",
      "status": "passed",
      "executionTimeMs": 3120
    }
  ]
}
```

---

### `GET /api/scans/{scanId}/findings`
Retrieves normalized audit findings with pagination and filtering.

#### Query Parameters
- `category` *(string, optional)*: `seo`, `performance`, `accessibility`, `security`, `cookies`, `exposure`.
- `severity` *(string, optional)*: `critical`, `high`, `medium`, `low`, `info`.
- `page` *(number, default: 1)*.
- `limit` *(number, default: 50, max: 100)*.

#### Response `200 OK`
```json
{
  "scanId": "scn_a1b2c3d4e5f60718",
  "totalFindings": 3,
  "page": 1,
  "limit": 50,
  "findings": [
    {
      "id": "fnd_py_scn_a1b2_1_c8e9f0",
      "scanId": "scn_a1b2c3d4e5f60718",
      "ruleId": "SEC_HSTS_MISSING",
      "category": "security",
      "severity": "medium",
      "confidence": "certain",
      "title": "Strict-Transport-Security (HSTS) Header Missing",
      "description": "The server does not enforce HTTPS connections using the HSTS response header.",
      "affectedUrl": "https://example.com",
      "detectionMethod": "passive",
      "engine": "custom-python",
      "impact": "Users are vulnerable to SSL-stripping and man-in-the-middle attacks on public networks.",
      "remediation": {
        "summary": "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to HTTPS responses.",
        "codeSnippet": "add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;"
      },
      "verificationStatus": "open"
    }
  ]
}
```

---

### `GET /api/scans/{scanId}/report`
Retrieves the complete report JSON or a temporary Amazon S3 presigned download URL.

#### Query Parameters
- `download=true`: Returns an authorized temporary S3 presigned URL expiring in 15 minutes.

#### Response `200 OK` (when `download=true`)
```json
{
  "scanId": "scn_a1b2c3d4e5f60718",
  "downloadUrl": "https://vibesift-audit-reports-dev.s3.amazonaws.com/scans/scn_a1b2c3d4e5f60718/report.json?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "expiresInSeconds": 900
}
```

---

### `POST /api/scans/{scanId}/rescan`
Resubmits an audit for the target URL using the same scan profile.

#### Response `201 Created`
```json
{
  "scanId": "scn_f9e8d7c6b5a41234",
  "status": "QUEUED",
  "targetUrl": "https://example.com",
  "createdAt": "2026-10-27T07:45:00.000Z"
}
```

---

### `POST /api/scans/{scanId}/cancel`
Cancels an active scan.

#### Response `200 OK`
```json
{
  "scanId": "scn_a1b2c3d4e5f60718",
  "status": "CANCELLED",
  "message": "Scan has been cancelled."
}
```

---

## 4. Saved Websites & Domain Verification

### `GET /api/sites`
Lists all saved websites and domain verification statuses for the authenticated user.

#### Response `200 OK`
```json
[
  {
    "id": "site_9a8b7c6d5e4f",
    "ownerUserId": "user_demo_001",
    "hostname": "example.com",
    "normalizedUrl": "https://example.com",
    "isVerified": true,
    "verificationMethod": "dns_txt",
    "verifiedAt": "2026-10-27T07:00:00.000Z"
  }
]
```

---

### `POST /api/sites`
Saves a new website domain to the user's account.

#### Request Body
```json
{
  "hostname": "example.com"
}
```

#### Response `201 Created`
```json
{
  "id": "site_9a8b7c6d5e4f",
  "ownerUserId": "user_demo_001",
  "hostname": "example.com",
  "normalizedUrl": "https://example.com",
  "isVerified": false,
  "createdAt": "2026-10-27T07:15:00.000Z"
}
```

---

### `POST /api/sites/verification-challenges`
Generates cryptographically random verification challenge tokens and instructions for proving domain control.

#### Request Body
```json
{
  "siteId": "site_9a8b7c6d5e4f",
  "method": "dns_txt"
}
```
*`method` can be `dns_txt`, `html_meta`, or `http_file`.*

#### Response `200 OK`
```json
{
  "siteId": "site_9a8b7c6d5e4f",
  "hostname": "example.com",
  "method": "dns_txt",
  "token": "vbs_verify_site9a8b7c6d5e4f_f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
  "dnsHostRecord": "@ (or _vibesift-challenge.example.com)",
  "dnsRecordType": "TXT",
  "metaHtmlTag": "<meta name=\"vibesift-site-verification\" content=\"vbs_verify_...\" />",
  "httpFilePath": "/.well-known/vibesift-verification.txt",
  "httpFileContent": "vbs_verify_...",
  "instructions": {
    "recordType": "TXT",
    "host": "_vibesift-challenge.example.com",
    "value": "vbs_verify_...",
    "instruction": "Add a TXT record for '_vibesift-challenge.example.com' with value 'vbs_verify_...'"
  }
}
```

---

### `POST /api/sites/{siteId}/verify`
Initiates server-side verification by checking DNS TXT records, `<meta>` tags, or `/.well-known/` resources on the target domain.

#### Request Body
```json
{
  "method": "dns_txt"
}
```

#### Response `200 OK` (Verified)
```json
{
  "verified": true,
  "message": "Successfully verified ownership of example.com via dns_txt.",
  "site": {
    "id": "site_9a8b7c6d5e4f",
    "hostname": "example.com",
    "isVerified": true,
    "verificationMethod": "dns_txt",
    "verifiedAt": "2026-10-27T07:20:00.000Z"
  }
}
```

#### Response `200 OK` (Not Yet Propagated)
```json
{
  "verified": false,
  "message": "Verification check could not confirm ownership of example.com using method dns_txt. Please ensure DNS changes have propagated and retry.",
  "instructions": "Check TXT record for '_vibesift-challenge.example.com' or HTML meta tag."
}
```

---

## 7. Payments & Razorpay Paywall

Deep Search scans require upfront payment (₹39 per scan) to protect cloud compute, Chromium resources, and active security testing engines.

### `GET /api/payments/config`
Public endpoint returning active payment gateway configuration and base pricing.

#### Response `200 OK`
```json
{
  "keyId": "rzp_live_Td6jjT5Yl85c4L",
  "deepAuditPriceInRupees": 39,
  "currency": "INR"
}
```

---

### `POST /api/payments/validate-coupon`
Validates a user-supplied coupon code against the S3 coupon directory (`config/coupons.json`). Strips all whitespace and normalizes casing (e.g., `flat 418` -> `FLAT418`). Cached in-memory for 30 seconds.

#### Request Body
```json
{
  "couponCode": "flat 418"
}
```
*(Accepts either `couponCode` or `code` keys).*

#### Response `200 OK` (Valid Coupon)
```json
{
  "valid": true,
  "code": "FLAT418",
  "originalAmount": 39,
  "discountAmount": 38,
  "finalAmount": 1,
  "description": "Flat ₹38 discount — deep audit for ₹1"
}
```

#### Response `200 OK` (Invalid / Expired Coupon)
```json
{
  "valid": false,
  "originalAmount": 39,
  "discountAmount": 0,
  "finalAmount": 39,
  "error": "Coupon code not found."
}
```

---

### `POST /api/payments/create-order`
Prepares a payment transaction for Razorpay checkout. Requires authentication.

#### Request Headers
- `Authorization: Bearer <cognito_token>` *(required)*

#### Request Body
```json
{
  "targetUrl": "https://example.com",
  "couponCode": "FLAT418",
  "scanProfile": "authorized_deep"
}
```

#### Response `200 OK`
```json
{
  "orderId": null,
  "amount": 1,
  "amountInPaise": 100,
  "currency": "INR",
  "keyId": "rzp_live_Td6jjT5Yl85c4L",
  "appliedCoupon": "FLAT418",
  "targetUrl": "https://example.com"
}
```
*(When `RAZORPAY_KEY_SECRET` is omitted, `orderId` is `null`, activating Razorpay standard direct client checkout without requiring Orders API).*

---

### `POST /api/payments/verify`
Verifies a completed transaction received from the Razorpay Checkout SDK. Stores the payment record in-memory to prevent replay and authorize the subsequent scan submission.

#### Request Headers
- `Authorization: Bearer <cognito_token>` *(required)*

#### Request Body
```json
{
  "razorpay_payment_id": "pay_live_abc123456",
  "razorpay_order_id": null,
  "razorpay_signature": null,
  "targetUrl": "https://example.com",
  "couponCode": "FLAT418",
  "amount": 1
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "paymentId": "pay_live_abc123456",
  "message": "Payment verified successfully."
}
```

---

## 8. Machine & Crawler Standards

Endpoints serving RFC-compliant security disclosures, web crawler instructions, and XML sitemaps.

### `GET /.well-known/security.txt` & `GET /security.txt`
Returns RFC 9116 security disclosure policies and vulnerability reporting instructions. Also mirrored under `/api/.well-known/security.txt`.
- **Content-Type**: `text/plain`

### `GET /robots.txt`
Returns robot exclusion rules, indexing directives, disallowed API paths, and the canonical XML sitemap location. Also mirrored under `/api/robots.txt`.
- **Content-Type**: `text/plain`

### `GET /sitemap.xml`
Returns the production XML sitemap containing all 10 canonical web application URLs. Also mirrored under `/api/sitemap.xml`.
- **Content-Type**: `application/xml`
