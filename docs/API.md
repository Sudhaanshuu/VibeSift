# VibeSift Backend API Contract

The VibeSift API exposes a documented, consistent REST interface with JSON payloads, standard HTTP status codes, and multi-tenant security isolation.

All endpoints (except `/api/health`) require an Amazon Cognito JWT Bearer token in the `Authorization` header:
```http
Authorization: Bearer <cognito_id_token_or_access_token>
```
*Note: In development mock mode (`USE_LOCAL_STORAGE=true`), any test Bearer token such as `Bearer demo_dev_123` is accepted.*

---

## 1. System Health

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

## 2. Audit Scans

### `POST /api/scans`
Submits a target website URL for audit inspection.

#### Request Body
```json
{
  "url": "https://example.com",
  "profile": "baseline_public",
  "acknowledgedTerms": true,
  "idempotencyKey": "unique-client-req-key-001"
}
```

- `url` *(string, required)*: HTTP or HTTPS URL to audit. Subject to strict SSRF validation.
- `profile` *(string, default: `baseline_public`)*: `baseline_public` or `authorized_deep`. If `authorized_deep` is selected, the requesting user must have verified domain control of the target hostname.
- `acknowledgedTerms` *(boolean, required)*: Must be `true`.
- `idempotencyKey` *(string, optional)*: Unique token to prevent duplicate scans on network retry.

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

## 3. Saved Websites & Domain Verification

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
