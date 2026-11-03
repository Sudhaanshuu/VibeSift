# VibeSift AWS Architecture & Security Blueprint

VibeSift is built on an enterprise-grade, cloud-native AWS hybrid architecture designed for safety, multi-tenant isolation, high performance, and deep application-security testing with flat, predictable cloud costs.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["🌐 User (Browser / Developer)"]
    CF["🛡️ Cloudflare (Edge DNS, TLS 1.3, WAF & Turnstile Bot Gate)"]
    RZP["💳 Razorpay Payment Gateway (Live Direct Checkout)"]
    EC2_API["💻 EC2: Express API (Port 4000 / PM2: vibesift-backend)"]
    SSRF["🛡️ SSRF & Egress Gatekeeper (DNS + IP Range Filter)"]
    SQLITE[("⚡ Local SQLite (node:sqlite Fast Index Cache)")]
    SQS["📬 AWS SQS FIFO Queue (vibesift-scan-jobs.fifo)"]
    DLQ["⚠️ SQS Dead Letter Queue (vibesift-scan-jobs-dlq.fifo)"]
    EC2_WORKER["⚙️ EC2: SQS Consumer Worker (PM2: vibesift-sqs-worker)"]
    LAMBDA["⚡ AWS Lambda (vibesift-python-inspector-dev)"]
    CHROME["🧭 Local Headless Chromium (Lighthouse CWV Engine)"]
    S3[("🪣 AWS S3 (vibesift-audit-reports-dev-501380833083)")]
    COUPONS[("🎟️ S3 Coupon Store (config/coupons.json)")]
    CW["📊 Amazon CloudWatch (EMF Metrics, Logs & Alarms)"]
    SSM["🔐 AWS Systems Manager (SSM Parameter Store)"]
    COG["🔑 Amazon Cognito (User Pools & 14-Day JWT Session Refresh)"]

    User -->|1. HTTPS Request| CF
    CF -->|2. Validated Traffic| EC2_API
    EC2_API <-->|Auth & Refresh Tokens| COG
    EC2_API <-->|Fetch Config / SSM Secrets| SSM
    User <-->|Pay ₹39 / ₹1 on Deep Audit| RZP
    EC2_API <-->|Validate & Verify Payment| RZP
    EC2_API <-->|Read / Validate Coupons| COUPONS
    EC2_API -->|3. Check Precheck Cache| SQLITE
    EC2_API -->|4. Check Direct S3 Cache| S3
    EC2_API -->|5. SSRF Pre-flight Validation| SSRF
    EC2_API -->|6. Enqueue Job| SQS
    SQS -.->|Failed 3x MaxReceiveCount| DLQ
    SQS -->|7. 20s Long Polling| EC2_WORKER
    EC2_WORKER -->|8a. Invoke Security & Privacy Suite| LAMBDA
    EC2_WORKER -->|8b. Run Core Web Vitals & Accessibility| CHROME
    EC2_WORKER -->|9. Normalize Scores & Deduplicate| EC2_WORKER
    EC2_WORKER -->|10. Upload Final report.json & Markdown| S3
    EC2_WORKER -->|11. Fast Local State & Metric Index| SQLITE
    EC2_WORKER -->|12. Emit Execution Telemetry| CW
    User <-->|13. Telemetry Polling & Final Report Render| EC2_API
```

---

## 2. Dual Runtime Topology: Hybrid Local vs AWS Production

| Dimension | Local Development Mode | AWS Production Mode *(Current Active)* |
| :--- | :--- | :--- |
| **Frontend** | Vite Dev Server (`http://localhost:5173`) | Vite Production Bundle via NGINX (`vibesift.pixir.in`) |
| **Edge Security** | Localhost Direct | Cloudflare DNS, TLS 1.3, Turnstile, & WAF |
| **Backend API** | Node.js Express (`localhost:4000`) | EC2 Ubuntu Host with PM2 (`vibesift-backend`) |
| **Orchestration** | Local Async Runner (`USE_MOCK_ORCHESTRATION=true`) | Amazon SQS FIFO Queue (`vibesift-scan-jobs.fifo`) |
| **Security Probing** | Local Python Process (`inspector.py`) | AWS Lambda (`vibesift-python-inspector-dev`) |
| **Performance Engine** | Local Headless Chrome / Lighthouse | EC2 Native Linux Chromium Sandbox |
| **Database** | Embedded SQLite (`.local_storage/vibesift.sqlite`) | Native SQLite (WAL mode) + Amazon DynamoDB |
| **Report Storage** | Local File Storage (`.local_storage/s3/`) | Amazon S3 (`vibesift-audit-reports-dev-501380833083`) |
| **Configuration** | Local `.env` file | AWS Systems Manager (SSM) Parameter Store |
| **Authentication** | Demo Dev Tokens / Cognito | Amazon Cognito User Pool (`us-east-1_nW70Gohxd`) |

---

## 3. Multi-Layer SSRF Defense Architecture

Because VibeSift accepts user-supplied destination URLs, Server-Side Request Forgery (SSRF) is treated as a tier-1 threat vector. Defenses are applied across multiple layers:

### Layer 1: URL Syntax & Scheme Filter
- Only `http:` and `https:` schemes are permitted. Schemes such as `file://`, `gopher://`, `dict://`, `ftp://`, `ldap://`, or `data:` are rejected immediately.
- Embedded user credentials (`https://user:pass@host`) are strictly forbidden.
- Whitespace, CRLF control characters, and non-printable bytes are blocked before parsing.
- Obfuscated decimal (`2130706433`), hex (`0x7f000001`), and octal (`0177.0.0.1`) IP addresses are rejected.

### Layer 2: DNS Inspection & IP Range Verification
- Hostnames are resolved through DNS lookup (`dns.promises.lookup` / `socket.getaddrinfo`) inspecting **all** returned A and AAAA records.
- If **any** returned IP address falls within a disallowed range, the connection is aborted with `SSRF_BLOCKED`.
- Disallowed ranges include:
  - **Loopback**: `127.0.0.0/8`, `::1`
  - **Private Networks (RFC 1918)**: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
  - **Link-Local & Cloud Metadata**: `169.254.0.0/16` (including AWS IMDS `169.254.169.254` and IPv6 `fd00:ec2::254`), `fe80::/10`
  - **Shared Address Space / Carrier-Grade NAT**: `100.64.0.0/10`
  - **Unique Local IPv6 (ULA)**: `fc00::/7`
  - **Multicast & Reserved**: `224.0.0.0/4`, `240.0.0.0/4`, `ff00::/8`

### Layer 3: DNS Rebinding Protection & Redirect Re-Validation
- Target IP addresses are validated on every request.
- All HTTP 301/302 redirects are captured by a custom transport adapter and re-validated against the SSRF guard before following.

---

## 4. Cross-Tenant Global S3 Caching Architecture

When a website is audited by User A, the full report is stored at `scans/{sanitizedHost}__{scanId}/report.json`.

When User B submits the same URL:
1. `POST /api/scans/precheck` executes a fast lookup against SQLite and Amazon S3.
2. If S3 holds a report with matching hostname prefix, it extracts the metadata, audit date, and readiness score.
3. The frontend presents the **Existing Audit Modal**, allowing User B to inspect the cached report instantly.
4. If User B proceeds with `useCached: true`, the API serves the cached report across tenants with \$0 incremental compute.
5. If User B chooses **Re-Audit Now** (`forceRescan: true`), a fresh SQS FIFO scan is triggered.

---

## 5. Deep Audit Paywall & Razorpay Integration Architecture

VibeSift operates a dual-tier monetization model:
- **Quick Search (`baseline_public`)**: Free (₹0), ~20 seconds execution.
- **Deep Search (`authorized_deep`)**: ₹39 per audit, ~2 minutes execution, requiring verified payment.

### Architecture Flow:
1. **Public Key Distribution**: Frontend retrieves the live Razorpay Key ID via `GET /api/payments/config` (or SSM parameter `/vibesift/prod/razorpay/key-id`).
2. **Direct Client Checkout**: The frontend initiates Razorpay Standard Checkout directly via `checkout.js` with amount in paise (3900 paise = ₹39.00 INR or 100 paise = ₹1.00 INR with valid coupon).
3. **Payment Verification**: Upon successful checkout, the browser submits `paymentId`, `amount`, and optional `couponCode` to `POST /api/payments/verify`.
4. **Transaction Recording**: Backend records the verified transaction in SQLite (`payment_transactions` table) with status `SUCCESS`.
5. **Enforced Scan Submission Gate**:
   - `POST /api/scans` checks whether `scanScope === 'authorized_deep'`.
   - If `authorized_deep` is requested without a valid `paymentId` that exists in `payment_transactions` under status `SUCCESS`, the API strictly rejects with `402 Payment Required`.
   - Once consumed by a scan, the transaction is marked as consumed, preventing replay attacks.

---

## 6. S3-Backed Promotional Coupon Directory Architecture

Promotional discounts are managed via an AWS S3 JSON document, decoupling coupon lifecycle management from database migrations or redeployments:

```
s3://vibesift-audit-reports-dev-501380833083/config/coupons.json
```

### Key Architectural Characteristics:
- **In-Memory TTL Caching**: The API server loads `config/coupons.json` into memory with a 30-second TTL. This provides sub-millisecond coupon lookups without repeated S3 `GetObject` latency or costs.
- **CLI Management**: Operators manipulate coupons locally using `backend/scripts/manage-coupons.js` (`npm run coupon -- list|add|enable|disable|remove`), which downloads, updates, and atomically puts the JSON back to S3.
- **Fail-Safe Minimum Transaction Bound**: Razorpay India enforces a minimum transaction amount of ₹1 (100 paise). The coupon calculation engine automatically clamps discounts so payable amounts never drop below ₹1.
- **Strict Privacy**: Coupons are never exposed in bulk or advertised in public APIs. `POST /api/payments/validate-coupon` performs case-insensitive, whitespace-trimmed single-code validation.

---

## 7. Amazon Cognito 14-Day Persistent Session Architecture

Developer sessions are built for frictionless developer workflows while upholding zero-trust cloud security standards:

```mermaid
sequenceDiagram
    participant Browser as Browser Client (apiClient)
    participant API as Express API (/api)
    participant Cognito as Amazon Cognito User Pool

    Note over Browser: User logs in (Day 1)
    Browser->>API: POST /api/auth/login
    API->>Cognito: AdminInitiateAuth (USER_PASSWORD_AUTH)
    Cognito-->>API: AccessToken (1h) + RefreshToken (14d)
    API-->>Browser: Session Tokens Stored in localStorage

    Note over Browser: User returns on Day 5 (AccessToken Expired)
    Browser->>API: POST /api/scans (with expired AccessToken)
    API-->>Browser: 401 Unauthorized ("exp claim timestamp check failed")
    
    Note over Browser: Automatic Retry Interceptor Triggered
    Browser->>API: POST /api/auth/refresh (RefreshToken)
    API->>Cognito: InitiateAuth (REFRESH_TOKEN_AUTH)
    Cognito-->>API: New AccessToken + IdToken
    API-->>Browser: Fresh Session Tokens (14-day persistent horizon)
    Browser->>API: Re-attempt POST /api/scans (Success!)
```

### Architectural Guardrails:
- **Automatic 401 Interceptor**: `src/lib/api/client.ts` intercepts 401 responses, calls `POST /api/auth/refresh`, updates credentials, and transparently replays the initial HTTP request without failing the user interaction.
- **Clock Drift Tolerance**: `backend/src/api/middleware/auth.js` enforces `clockTolerance: '120s'` during JWT verification to eliminate intermittent clock skew rejections across container environments.
- **14-Day Session Expiry**: Sessions persist up to 14 days or until explicit logout, matching AWS Cognito Refresh Token expiration limits.

---

## 8. Crawler Directives & Machine Standards Architecture

VibeSift surfaces discoverable endpoints adhering to modern web and security standards:

1. **RFC 9116 `security.txt`**:
   - Exposed at both `/.well-known/security.txt` and `/security.txt`.
   - Outlines security contacts (`mailto:support@pixir.in`), canonical policy links, encryption standards, and disclosure SLAs (24–48 hours).
2. **Search Directives (`robots.txt`)**:
   - Instructs crawlers to index public marketing, pricing, and compliance routes.
   - Restricts crawlers from scanning authenticated routes (`/app/`) or backend API endpoints (`/api/`).
3. **Canonical XML Sitemap (`sitemap.xml`)**:
   - Serves an XML sitemap of all 10 canonical marketing and legal URLs (`/`, `/pricing`, `/refund-policy`, `/terms`, `/contact`, `/privacy`, `/security`, `/methodology`, `/sample-reports`, `/remediation`).
   - Dynamically served by Express (`backend/src/api/app.js`) and mirrored in Vite static assets (`public/sitemap.xml`).
