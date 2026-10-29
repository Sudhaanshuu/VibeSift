# VibeSift AWS Architecture & Security Blueprint

VibeSift is built on an enterprise-grade, cloud-native AWS serverless and containerized architecture designed for safety, multi-tenant isolation, elastic scaling, and deep application-security testing.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    User["Developer / Web Browser"] -->|HTTPS / JWT| WAF["AWS WAF (Rate Limits & Rules)"]
    WAF --> APIGW["Amazon API Gateway (HTTP API v2)"]
    APIGW -->|Cognito JWT Auth| Cognito["Amazon Cognito (User Pool)"]
    APIGW --> ApiLambda["API Lambda Handler (Node.js ES Modules)"]
    
    subgraph Storage ["Encrypted Data Layer (SSE-KMS)"]
        DDB_Sites[("DynamoDB: SavedWebsites-dev<br/>PK: id | GSI: ownerUserId")]
        DDB_Scans[("DynamoDB: Scans-dev<br/>PK: scanId | GSIs: ownerUserId, idempotency")]
        DDB_Findings[("DynamoDB: Findings-dev<br/>PK: id, SK: scanId | GSI: scanId")]
        S3_Reports[("Amazon S3: Audit Artifacts & Reports (KMS)")]
    end
    
    ApiLambda -->|Read / Write| DDB_Sites
    ApiLambda -->|Create Scan| DDB_Scans
    ApiLambda -->|Enqueue Job| SQS["Amazon SQS (Scan Queue)"]
    SQS -->|DLQ on 3 Failures| DLQ["Dead Letter Queue"]
    
    SQS --> SFN["AWS Step Functions (Audit Orchestrator)"]
    
    subgraph Workers ["Containerized Isolated Workers (ECS Fargate)"]
        direction LR
        Worker_Py["Python Inspector<br/>(SEO, TLS, Headers, SSRF Guard)"]
        Worker_LH["Lighthouse Worker<br/>(Performance, Accessibility, CWV)"]
        Worker_ZAP["OWASP ZAP Baseline<br/>(Gated by Domain Verification)"]
        Worker_NUC["Nuclei Worker<br/>(Curated Safe Templates)"]
    end
    
    SFN -->|Baseline Parallel Execution| Worker_Py
    SFN -->|Baseline Parallel Execution| Worker_LH
    SFN -->|If Profile == authorized_deep| Worker_ZAP
    SFN -->|If Profile == authorized_deep| Worker_NUC
    
    Worker_Py -->|Write Raw JSON| S3_Reports
    Worker_LH -->|Write Raw JSON| S3_Reports
    Worker_ZAP -->|Write Raw JSON| S3_Reports
    Worker_NUC -->|Write Raw JSON| S3_Reports
    
    SFN --> NormalizerLambda["Normalizer Lambda (Deduplication, Sanitization, Scoring)"]
    NormalizerLambda -->|Read Raw Artifacts| S3_Reports
    NormalizerLambda -->|Save Unified Findings| DDB_Findings
    NormalizerLambda -->|Save Final Report JSON & MD| S3_Reports
    NormalizerLambda -->|Update Status: COMPLETED/PARTIAL| DDB_Scans
    
    subgraph OptionalAI ["AI Explanation Engine"]
        Bedrock["Amazon Bedrock (Claude 3 Haiku)"]
        FallbackAI["Deterministic Fallback Engine"]
    end
    NormalizerLambda -.->|Bedrock Enabled| Bedrock
    NormalizerLambda -.->|Fallback if Disabled or Offline| FallbackAI
```

---

## 2. Dual Runtime Topology: Hybrid vs Full Serverless

| Dimension | Hybrid Development Mode *(Current)* | Production Serverless Mode *(Full Cloud)* |
| :--- | :--- | :--- |
| **Frontend** | Vite Dev Server (`http://localhost:5173`) | Amazon S3 + CloudFront Distribution (HTTPS) |
| **Backend API** | Express Server (`http://localhost:4000`) | Amazon API Gateway HTTP API v2 + Lambda |
| **Worker Engine** | Live Local Node/Python Process (`inspector.py`) | Amazon ECS Fargate Container Tasks |
| **Container Engine** | Not Required (Local process execution) | Docker Daemon + Amazon ECR Container Images |
| **Database** | Live AWS DynamoDB (3 On-Demand Tables) | Live AWS DynamoDB (3 On-Demand Tables) |
| **Artifact Storage** | Live AWS S3 Bucket (`vibesift-audit-reports-dev`) | Live AWS S3 Bucket (`vibesift-audit-reports-dev`) |
| **Job Queue** | Amazon SQS or in-memory async runner | Amazon SQS (`vibesift-scan-jobs-dev`) |
| **AI Explanations** | Deterministic Engine (no LLM latency/costs) | Amazon Bedrock (Anthropic Claude 3 Haiku) |

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
- Every HTTP 3xx redirect destination (`Location` header) is passed through full SSRF normalization and DNS re-resolution before following.
- Bounded redirect limit (maximum 5 redirects).

### Layer 4: Network & IAM Isolation
- Scanner containers run inside dedicated subnets with restrictive security groups allowing outbound egress strictly to TCP ports 80 and 443.
- IAM task execution roles grant scanner containers **zero access** to DynamoDB, Secrets Manager, or internal VPC resources.
- Containers can write output only to a scoped S3 prefix: `scans/{scanId}/raw/*`.

---

## 4. Scan Workflow State Machine

Valid state transitions are deterministic and monotonic:

```
[QUEUED] ──> [VALIDATING] ──> [RUNNING] ──> [NORMALIZING] ──> [COMPLETED]
   │             │                │               │
   ├──> [FAILED] ┴──────> [FAILED]┴──────> [FAILED]┴────> [PARTIAL]
   │             │                │
   └──> [CANCELLED] ────> [CANCELLED] ───> [CANCELLED]
```

- **QUEUED**: Scan request persisted, queued in SQS.
- **VALIDATING**: Target URL syntax checked, DNS resolved safely, domain ownership checked if deep profile.
- **RUNNING**: Baseline tasks (Python Inspector & Lighthouse) executing.
- **NORMALIZING**: Raw outputs collected, deduplicated, secrets redacted, readiness score calculated.
- **COMPLETED**: All engines passed successfully; final report persisted.
- **PARTIAL**: At least one engine succeeded while another failed or was skipped; findings from successful engines are fully preserved.
- **FAILED**: Target unreachable or fatal scan error; terminal state.
- **CANCELLED**: User explicitly halted the scan.

---

## 5. Domain Verification & Scoping Protocol

Deep security scans (OWASP ZAP and ProjectDiscovery Nuclei) can only be initiated against targets with proven ownership:

1. **DNS TXT Record**: User creates `_vibesift-challenge.<domain>` or `@` with token `vbs_verify_<siteId>_<hash>`.
2. **HTML Meta Tag**: User adds `<meta name="vibesift-site-verification" content="...">` to their root page.
3. **HTTP Well-Known File**: User serves token at `/.well-known/vibesift-verification.txt`.
4. Verification timestamps, methods, and owner user IDs are immutably logged in DynamoDB.
5. Scans on verified domains cover the root domain and all authorized subdomains (e.g. verifying `example.com` allows `api.example.com`).
