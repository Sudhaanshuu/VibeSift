# VibeSift AWS Architecture & Security Blueprint

VibeSift is built on an enterprise-grade, cloud-native AWS hybrid architecture designed for safety, multi-tenant isolation, high performance, and deep application-security testing with flat, predictable cloud costs.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["🌐 User (Browser / Developer)"]
    CF["🛡️ Cloudflare (Edge DNS, TLS 1.3, WAF & Turnstile Bot Gate)"]
    EC2_API["💻 EC2: Express API (Port 4000 / PM2: vibesift-backend)"]
    SSRF["🛡️ SSRF & Egress Gatekeeper (DNS + IP Range Filter)"]
    SQLITE[("⚡ Local SQLite (node:sqlite Fast Index Cache)")]
    SQS["📬 AWS SQS FIFO Queue (vibesift-scan-jobs.fifo)"]
    DLQ["⚠️ SQS Dead Letter Queue (vibesift-scan-jobs-dlq.fifo)"]
    EC2_WORKER["⚙️ EC2: SQS Consumer Worker (PM2: vibesift-sqs-worker)"]
    LAMBDA["⚡ AWS Lambda (vibesift-python-inspector-dev)"]
    CHROME["🧭 Local Headless Chromium (Lighthouse CWV Engine)"]
    S3[("🪣 AWS S3 (vibesift-audit-reports-dev-501380833083)")]
    CW["📊 Amazon CloudWatch (EMF Metrics, Logs & Alarms)"]
    SSM["🔐 AWS Systems Manager (SSM Parameter Store)"]
    COG["🔑 Amazon Cognito (User Pools & JWT Multi-Tenant Auth)"]

    User -->|1. HTTPS Request| CF
    CF -->|2. Validated Traffic| EC2_API
    EC2_API <-->|Auth Tokens| COG
    EC2_API <-->|Fetch Config / Secrets| SSM
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
