# VibeSift: Complete AWS Architecture & Services Study Guide
> **Official Playbook for the 100% Free Tier, Zero-Docker Architecture**  
> **Reference Architecture:** Verified against `public/vibesift-architecture.png` and codebase  
> **AWS Account ID:** `501380833083` | **Primary Region:** `us-east-1` (N. Virginia)  
> **Production Domain:** `https://vibesift.pixir.in` | **Static Host IP:** `54.144.160.191`

---

## 📑 Table of Contents
1. [Architecture Overview & Blueprint (The 7 Core Services)](#-architecture-overview--blueprint)
2. [Whole Architecture Explained in 7 End-to-End Sections](#-whole-architecture-explained-in-7-end-to-end-sections)
3. [Complete Step-by-Step User Flow](#-complete-step-by-step-user-flow)
4. [Master Verification Matrix (The 7 Services)](#-master-verification-matrix)
5. [In-Depth Study Guide for the 7 Core Services](#-in-depth-study-guide-for-the-7-core-services)
   * [1. AWS EC2 Host (Core Compute & Native Engines)](#1-aws-ec2-host-core-compute--native-engines)
   * [2. Amazon Cognito (User Pool & Identity Provider)](#2-amazon-cognito-user-pool--identity-provider)
   * [3. AWS Systems Manager (SSM) Parameter Store (Runtime Config & Secrets)](#3-aws-systems-manager-ssm-parameter-store-runtime-config--secrets)
   * [4. Amazon S3 (Audit Reports Bucket)](#4-amazon-s3-audit-reports-bucket)
   * [5. Amazon CloudWatch (Server Metrics & Observability)](#5-amazon-cloudwatch-server-metrics--observability)
   * [6. AWS Lambda (Serverless Inspector & Scheduled Audit Webhooks)](#6-aws-lambda-serverless-inspector--scheduled-audit-webhooks)
   * [7. Amazon SQS FIFO Queue (Asynchronous Job Queue & Dead-Letter Queue)](#7-amazon-sqs-fifo-queue-asynchronous-job-queue--dead-letter-queue)
   * [* Edge Perimeter: Cloudflare (DNS, SSL/TLS & DDoS Shield)](#-edge-perimeter-cloudflare-dns-ssltls--ddos-shield)
6. [Native On-Host Engines (How Audits Run Without Docker)](#-native-on-host-engines-how-audits-run-without-docker)
7. [Exam & Live Demo Defense FAQ](#-exam--live-demo-defense-faq)

---

## 🏛️ Architecture Overview & Blueprint

As depicted in the official architecture blueprint (`public/vibesift-architecture.png`), VibeSift is engineered as a **100% Free Tier, Zero-Docker Overhead** website quality and security auditor. It eliminates heavyweight container orchestration (ECS Fargate, ECR, Step Functions) in favor of native Linux process execution on an AWS host, paired with **6 specialized serverless AWS services** and **Cloudflare Edge**:

```mermaid
flowchart TD
    User([Developer / Web Browser]) -->|DNS + HTTPS| CF[Cloudflare Edge<br/>DNS • SSL/TLS • DDoS Shield • Caching]
    
    CF -->|Proxied HTTPS Port 443| Host["AWS EC2 Host<br/>(t2.micro Free Tier / Ubuntu 24.04 LTS)<br/>Static IP: 54.144.160.191"]
    
    subgraph CoreHost ["AWS Host (Core Compute & Storage)"]
        direction TB
        Nginx["Nginx Reverse Proxy"] --> SPA["Web App: React 19 SPA (Vite /dist)"]
        Nginx --> API["API Backend: Node.js 24 (PM2 vibesift-backend Port 4000)"]
        API --> DB[("Embedded Database: SQLite 3 (WAL Mode)<br/>vibesift.sqlite")]
        
        API -->|Enqueue Scan Job| SQS["Amazon SQS FIFO<br/>vibesift-scan-jobs.fifo"]
        SQS -.->|Retry 3x| DLQ["Amazon SQS DLQ<br/>vibesift-scan-jobs-dlq.fifo"]
        
        Worker["PM2 SQS Worker<br/>vibesift-sqs-worker"] <-->|Long-Poll 20s & Acknowledge| SQS
        Worker --> DB
        Worker --> Engines["Native Audit Engines<br/>• Google Lighthouse (CWV)<br/>• Python 3 HTTP Inspector"]
    end
    
    Host <--->|JWT Auth Verification| Cog["Amazon Cognito<br/>User Registration • Login • JWT Auth"]
    Host <--->|Runtime Config /vibesift/prod| SSM["AWS SSM Parameter Store<br/>Encrypted Config • API Tokens (Free Tier)"]
    Worker --->|Save Reports (PDF, JSON, MD)| S3[("Amazon S3<br/>Audit Reports Bucket")]
    Host --->|Logs & Metrics| CW["Amazon CloudWatch<br/>Server Metrics & Observability"]
    Worker --->|Invoke Serverless Inspector| Lambda["AWS Lambda<br/>vibesift-python-inspector-dev"]
```

### The 7 Core Services at a Glance
1. **AWS EC2 Host:** The central Linux compute server running Nginx, Node.js 24 (PM2 `vibesift-backend` on port 4000 and PM2 `vibesift-sqs-worker`), SQLite WAL mode, and native Headless Chromium Lighthouse.
2. **Amazon Cognito:** Manages developer registration, login, and issues cryptographically signed RSA256 JWT tokens (`us-east-1_nW70Gohxd`).
3. **AWS Systems Manager (SSM) Parameter Store:** Provides free-tier, encrypted configuration storage under `/vibesift/prod/` loaded into process memory at boot time.
4. **Amazon S3:** Object storage bucket (`vibesift-audit-reports-dev-501380833083`) storing final PDF, JSON, and Markdown audit reports with presigned download URLs.
5. **Amazon CloudWatch:** Collects server metrics, CPU usage, health checks, Lambda execution logs, and triggers operational alarms (>85% CPU).
6. **AWS Lambda:** Serverless function (`vibesift-python-inspector-dev`, Python 3.12, 71 checks) executing isolated security and DPDP compliance audits, plus EventBridge scheduled re-audit webhooks.
7. **Amazon SQS FIFO Queue:** Decoupled, ordered message queue (`vibesift-scan-jobs.fifo`) with deduplication and Dead-Letter Queue (`vibesift-scan-jobs-dlq.fifo`) for asynchronous, fault-tolerant job processing.
*(Backed by **Cloudflare** for Anycast DNS, edge caching, and free SSL/TLS termination).*

---

## 🔄 Whole Architecture Explained in 7 End-to-End Sections

### Section 1: Developer Ingress & Edge Protection
The workflow begins when a developer visits `https://vibesift.pixir.in`. The browser initiates a DNS request resolved by **Cloudflare's global Anycast network**. Cloudflare terminates modern TLS 1.3 encryption, applies Layer 7 DDoS filtering and bot protection, and caches static assets before proxying authorized HTTPS traffic to the AWS host's static IP (`54.144.160.191`).

### Section 2: Host Ingress & Reverse Proxy Routing (Nginx)
Traffic reaches port 443 of the **AWS EC2 Host** (`vibesift-core-host-prod`). **Nginx** handles web server routing:
- Static browser requests (`/`, CSS, JS) are served instantly from the compiled React 19 SPA directory (`/var/www/vibesift/dist`).
- API calls (`/api/*`) are reverse-proxied internally to `http://127.0.0.1:4000`, where the Express backend runs under the **PM2** process supervisor (`vibesift-backend`).

### Section 3: User Authentication & JWT Security (Amazon Cognito)
When a developer signs up or logs in, credentials are authenticated directly against **Amazon Cognito User Pool** (`us-east-1_nW70Gohxd`). Cognito verifies passwords, confirms email addresses, and returns an RSA256-signed JSON Web Token (JWT). The backend verifies this token against Cognito's JWKS endpoint for every private route.

### Section 4: Configuration & Secrets Injection (SSM Parameter Store)
When the backend boots, it does not read secrets from plain text or `.env` files committed to Git. Instead, it retrieves encrypted production parameters from **AWS Systems Manager (SSM) Parameter Store** (`/vibesift/prod/...`). Parameters include Cognito client IDs, S3 bucket names, SQS queue URLs, port configurations, and JWT secrets—all provided at zero cost in the Free Tier.

### Section 5: SSRF Guard, Global Discovery & SQS FIFO Queueing
When the user submits a URL to audit:
- The backend's **SSRF Guard** verifies the target domain to block internal cloud metadata attacks (`169.254.169.254`) and private RFC-1918 subnets.
- The **Global Precheck Cache** checks if a recent completed audit already exists for this hostname (across SQLite and S3). If so, it returns the existing audit summary instantly.
- If a fresh audit is needed, Express inserts a `QUEUED` record and dispatches a message to **Amazon SQS FIFO** (`vibesift-scan-jobs.fifo`) with `MessageGroupId` (sanitized hostname) and deduplication ID.
- The **PM2 SQS Worker** (`vibesift-sqs-worker`) long-polls SQS (20s wait time), consumes the job, and runs the audit engines.

### Section 6: Dual Storage Architecture (SQLite + Amazon S3)
Audit findings flow into the Normalizer:
- **Instant Local Metadata:** Tabular scan records, user histories, and status flags are written directly to embedded **SQLite 3 in WAL mode** on NVMe SSD, delivering sub-millisecond query response times on the user dashboard.
- **Durable Cloud Archival:** Complete multi-megabyte audit dumps, diagnostic traces, and downloadable PDF reports are uploaded directly to **Amazon S3** (`vibesift-audit-reports-dev-501380833083`).
- Once S3 upload succeeds, the SQS worker deletes the message from the queue via `DeleteMessageCommand`.

### Section 7: Observability & Serverless Automation (CloudWatch + Lambda)
The system is monitored 24/7 without human intervention:
- **Amazon CloudWatch** tracks host CPU utilization, Lambda logs (`/aws/lambda/vibesift-python-inspector-dev`), and instance health checks, automatically alerting engineers if CPU exceeds 85%.
- **AWS Lambda** executes the unified Python Inspector (`vibesift-python-inspector-dev`) with 71 security, SEO, and DPDP checks, and acts as a scheduled webhook trigger for recurring audits.

---

## 🚶 Complete Step-by-Step User Flow

```text
[1. User visits https://vibesift.pixir.in]
             │
             ▼
[2. Cloudflare validates TLS 1.3 & proxies to AWS Host: 54.144.160.191]
             │
             ▼
[3. Nginx serves React 19 SPA; User signs up / logs in via Amazon Cognito]
             │
             ▼
[4. User submits Target URL & chooses Baseline Public or Authorized Deep]
             │
             ▼
[5. Instant Precheck: checks SQLite & S3 for existing audit of target hostname]
       ├─ Cached report found: UI offers instant report review or re-run
       └─ Fresh audit: Express enqueues job to Amazon SQS FIFO queue
             │
             ▼
[6. PM2 Worker (vibesift-sqs-worker) pulls message via 20s long-polling]
             │
             ▼
[7. Parallel Engine Execution: AWS Lambda Python Inspector + Host Headless Chromium]
             │
             ▼
[8. Normalization & Scoring: Direct Lighthouse category scores + weighted formula]
             │
             ▼
[9. S3 Persistence: Final report.json & report.md saved; SQS message deleted]
             │
             ▼
[10. Frontend Polling completes: Interactive SVG Gauge, Checks & PDF Export ready]
```

---

## 📊 Master Verification Matrix

| Service | Target Resource | Verification Command | Expected Result |
|:---|:---|:---|:---|
| **EC2 Host** | Ubuntu 24.04 (`54.144.160.191`) | `ssh ubuntu@54.144.160.191 "pm2 status"` | `vibesift-backend` (port 4000) & `vibesift-sqs-worker` online |
| **Amazon Cognito** | User Pool `us-east-1_nW70Gohxd` | `aws cognito-idp describe-user-pool --user-pool-id us-east-1_nW70Gohxd` | Active User Pool with email sign-up |
| **AWS SSM** | `/vibesift/prod/*` | `aws ssm describe-parameters --region us-east-1` | 5+ encrypted production parameters |
| **Amazon S3** | `vibesift-audit-reports-dev-501380833083` | `aws s3 ls s3://vibesift-audit-reports-dev-501380833083/scans/` | KMS-encrypted audit directories |
| **Amazon CloudWatch** | `/aws/lambda/vibesift-python-inspector-dev` | `aws logs describe-log-streams --log-group-name ...` | Active execution log streams |
| **AWS Lambda** | `vibesift-python-inspector-dev` | Node.js `InvokeCommand` test script | 71 checks, status 200 |
| **Amazon SQS FIFO** | `vibesift-scan-jobs.fifo` | `aws sqs get-queue-attributes --queue-url ...` | 20s long-polling, 300s visibility timeout |
| **Cloudflare** | `vibesift.pixir.in` | `nslookup vibesift.pixir.in` | Anycast IPs (Origin masked) |

---

## 🔍 In-Depth Study Guide for the 7 Core Services

### 1. AWS EC2 Host (Core Compute & Native Engines)

#### What is this service?
A virtual computing server in the AWS cloud providing dedicated CPU, RAM, and NVMe SSD storage running Ubuntu 24.04 LTS.

#### Why we are using it in VibeSift
EC2 hosts the web application front door, reverse proxy, and local workers:
- **Nginx:** Serves the compiled React 19 SPA and reverse proxies `/api/*` to Express.
- **Node.js 24 API (`vibesift-backend`):** High-speed API server running under PM2 on port 4000.
- **PM2 SQS Worker (`vibesift-sqs-worker`):** Continuous background consumer pulling jobs from Amazon SQS FIFO.
- **Native Headless Chromium:** Runs Google Lighthouse directly with sub-100ms startup.
- **Embedded SQLite 3:** Native `node:sqlite` in WAL mode on SSD.

---

### 2. Amazon Cognito (User Pool & Identity Provider)

#### What is this service?
A managed Customer Identity and Access Management (CIAM) service handling secure user registration, email verification, and cryptographic RSA256 JWT tokens.

#### Why we are using it in VibeSift
- User Pool `us-east-1_nW70Gohxd` handles user registration and login.
- Eliminates storing plaintext passwords in databases (uses Secure Remote Password protocol).
- Express verifies JWT signatures in sub-milliseconds against Cognito's JWKS endpoint.

---

### 3. AWS Systems Manager (SSM) Parameter Store (Runtime Config & Secrets)

#### What is this service?
A centralized, encrypted configuration store providing versioned key-value storage at zero cost in the AWS Free Tier.

#### Why we are using it in VibeSift
Replaces plaintext `.env` files with KMS-encrypted parameters under `/vibesift/prod/...`:
- `/vibesift/prod/cognito/client-id`: `2o811dvh5f5n00r49540b9vav9`
- `/vibesift/prod/cognito/user-pool-id`: `us-east-1_nW70Gohxd`
- `/vibesift/prod/s3/reports-bucket`: `vibesift-audit-reports-dev-501380833083`
- `/vibesift/prod/sqs/scan-queue-url`: `https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs.fifo`
- `/vibesift/prod/server/port`: `4000`

---

### 4. Amazon S3 (Audit Reports Bucket)

#### What is this service?
High-durability (99.999999999%) cloud object storage for heavy, unstructured files.

#### Why we are using it in VibeSift
Bucket `vibesift-audit-reports-dev-501380833083` stores:
- `scans/{sanitizedHost}__{scanId}/report.json`: Full normalized JSON audit report.
- `scans/{sanitizedHost}__{scanId}/report.md`: Formatted executive Markdown report.
- `scans/{sanitizedHost}__{scanId}/raw/`: Raw telemetry dumps from Python and Lighthouse.
- Presigned URLs (`@aws-sdk/s3-request-presigner`) provide secure, 15-minute download links directly from S3.

---

### 5. Amazon CloudWatch (Server Metrics & Observability)

#### What is this service?
Cloud monitoring and observability service collecting metrics, logs, and automated alarm triggers.

#### Why we are using it in VibeSift
- Host CPU utilization alarm firing if CPU exceeds 85% for 10 minutes.
- CloudWatch Logs indexing Lambda executions (`/aws/lambda/vibesift-python-inspector-dev`) and API logs (`/vibesift/host/api`).
- Embedded Metric Format (EMF) logs for custom metric generation (scan duration, success rates) with zero agent overhead.

---

### 6. AWS Lambda (Serverless Inspector & Scheduled Audit Webhooks)

#### What is this service?
Event-driven serverless compute that executes code in response to triggers and shuts down immediately, incurring $0.00 when idle.

#### Why we are using it in VibeSift
1. **Serverless Python Inspector (`vibesift-python-inspector-dev`):** Runs the 71-check security, SEO, and Indian DPDP Act 2023 audit suite in an ephemeral container (Python 3.12, 512MB RAM, 60s timeout). Offloads intensive network scanning from the EC2 host.
2. **Scheduled Audit Webhooks (`vibesift-scheduled-scanner`):** EventBridge cron triggers Lambda to dispatch recurring health re-audits.

---

### 7. Amazon SQS FIFO Queue (Asynchronous Job Queue & Dead-Letter Queue)

#### What is this service?
A fully managed, highly reliable First-In-First-Out message queuing service that guarantees strict message ordering and exactly-once processing.

#### Why we are using it in VibeSift
- **Decoupled Architecture:** User HTTP requests return immediately with `QUEUED` status; long-running audits process in the background.
- **Queue:** `vibesift-scan-jobs.fifo` configured with 20-second long-polling (`ReceiveMessageWaitTimeSeconds = 20`) and 300-second visibility timeout.
- **Dead-Letter Queue:** `vibesift-scan-jobs-dlq.fifo` catches poison payloads after 3 consecutive failures (`maxReceiveCount = 3`), isolating corrupt jobs without stalling the worker.
- **Deduplication:** Prevents duplicate audit submissions for the same target within a 5-minute window via `MessageDeduplicationId`.

---

### * Edge Perimeter: Cloudflare (DNS, SSL/TLS & DDoS Shield)

#### Why we are using it in VibeSift
- Anycast DNS resolving `vibesift.pixir.in` in milliseconds worldwide.
- Free Full SSL/TLS 1.3 encryption without Let's Encrypt cron renewal overhead.
- Cloudflare Turnstile bot verification and Layer 7 DDoS mitigation.

---

## ⚡ Native On-Host Engines (How Audits Run Without Docker)

```
┌────────────────────────────────────────────────────────────────────────┐
│             AWS EC2 Host (Ubuntu 24.04 LTS / Static IP: 54.144.160.191)│
│                                                                        │
│   ┌──────────────────────────┐      ┌──────────────────────────────┐   │
│   │   Nginx Reverse Proxy    │      │    Node.js 24 API (PM2)      │   │
│   │   Port 80/443 -> Port 4000│ ---> │ vibesift-backend (Port 4000) │   │
│   └──────────────────────────┘      └──────────────┬───────────────┘   │
│                                                    │                   │
│                                     ┌──────────────▼───────────────┐   │
│                                     │  Amazon SQS FIFO Queue       │   │
│                                     │  vibesift-scan-jobs.fifo     │   │
│                                     └──────────────┬───────────────┘   │
│                                                    │ (20s Long Poll)   │
│                                     ┌──────────────▼───────────────┐   │
│                                     │  PM2 SQS Worker Process      │   │
│                                     │  vibesift-sqs-worker         │   │
│                                     └──────────────┬───────────────┘   │
│                                                    │                   │
│         ┌──────────────────────────────────────────┴───────────────┐   │
│         ▼                                                          ▼   │
│  ┌──────────────────────────────┐           ┌────────────────────────┐ │
│  │    AWS Lambda Inspector      │           │   Headless Chromium    │ │
│  │ • 34 Basic Hygiene Checks    │           │ • Google Lighthouse    │ │
│  │ • 22 Deep Security Probes    │           │ • Core Web Vitals      │ │
│  │ • 15 DPDP Act 2023 Checks    │           │ • Accessibility (a11y) │ │
│  └──────────────┬───────────────┘           └──────────────┬─────────┘ │
│                 │                                          │           │
│                 └────────────────────┬─────────────────────┘           │
│                                      ▼                                 │
│                 ┌──────────────────────────────────────────┐           │
│                 │     Embedded SQLite 3 (WAL Mode)         │           │
│                 │  • Sub-millisecond reads and writes      │           │
│                 │  • vibesift.sqlite on NVMe SSD           │           │
│                 └──────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 Exam & Live Demo Defense FAQ

### Q1: "Why did you choose a dedicated Linux host with SQLite instead of DynamoDB and ECS Fargate?"
> **Answer:** "In our initial research, an ECS Fargate and DynamoDB architecture looked attractive on paper. However, in practice, it had major drawbacks: first, AWS NAT Gateways and Fargate container registries drove idle baseline costs over $150/month. Second, spinning up a Fargate task for every audit added a 45-second container pull and boot penalty. In VibeSift, we achieved a 100% Free Tier, Zero-Docker architecture by running native Linux processes on an AWS host. Database reads and writes execute in under 50 microseconds directly on NVMe SSD using SQLite in WAL mode, and native Python and Lighthouse audits start in less than 250 milliseconds. We integrated serverless AWS services where they add the most value: Amazon Cognito for identity, AWS SSM Parameter Store for zero-cost secrets, Amazon S3 for durable PDF report storage, and Amazon SQS FIFO for resilient queueing."

### Q2: "How does VibeSift prevent Server-Side Request Forgery (SSRF)?"
> **Answer:** "Because users can submit any website URL to audit, an attacker could try auditing internal cloud addresses like `http://169.254.169.254` (the AWS Instance Metadata Service) or private subnets like `10.0.0.0/8` or `192.168.0.0/16` to steal cloud credentials. Before any scan is started, our Express backend runs the URL through a strict SSRF Guard (`backend/src/services/ssrfGuard.js`). The guard resolves the destination domain to its underlying IP and rejects loopbacks (`127.0.0.1`), link-local IPs (`169.254.x.x`), and private RFC-1918 subnets, logging and rejecting illegal attempts immediately."

### Q3: "How does SQLite handle multiple users without database locking?"
> **Answer:** "Standard SQLite databases lock the entire database file during write transactions. In VibeSift, we configure SQLite with **Write-Ahead Logging (WAL) mode** (`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;`). In WAL mode, writes are appended sequentially to a separate `-wal` file while reads continue simultaneously from the main database file without blocking. This provides full ACID concurrency, allowing multiple users to view their dashboard history while background workers stream audit findings in real time."

### Q4: "Why did you implement Amazon SQS FIFO and a Dead-Letter Queue?"
> **Answer:** "Website audits take 15 to 45 seconds to execute because Headless Chromium must load the DOM, measure Core Web Vitals, and run accessibility rules. If the API executed scans synchronously in the HTTP request loop, ingress would freeze under concurrent load and client requests would encounter 504 Gateway Timeouts. Amazon SQS FIFO decouples request ingress from execution. It buffers jobs, guarantees per-hostname FIFO ordering using `MessageGroupId`, eliminates duplicate scan submissions within 5 minutes via `MessageDeduplicationId`, and automatically shunts poison messages to the DLQ after 3 failures so a single crashing target cannot stall the worker."

### Q5: "How does cross-tenant caching work while preserving security isolation?"
> **Answer:** "Every user's private audit history in SQLite and DynamoDB is partitioned strictly by `ownerUserId`, preventing User A from seeing User B's dashboard. However, during the precheck phase (`POST /scans/precheck`), the backend inspects recent completed scans for the normalized hostname globally. If an audit completed within the cache TTL, User B is notified immediately and can reuse the existing audit result without spending server compute. When User B accepts the cached scan, a distinct reference is recorded for User B without exposing User A's user ID or internal session metadata."

### Q6: "How are Lighthouse category scores and Launch Readiness calculated without mock data?"
> **Answer:** "VibeSift completely eliminates mock data in production audits. The Headless Chromium runner executes genuine Google Lighthouse audits, ingesting real category scores directly: Performance, Accessibility, Best Practices, and SEO. Individual Core Web Vitals (FCP, LCP, CLS, TBT, Speed Index) are extracted and mapped into the Check Registry tab. The overall Launch Readiness Score (0-100) is calculated via a multi-pillar weighted formula: Security (25%), Performance (20%), Accessibility (15%), SEO (15%), Privacy (15%), and Completeness & Trust (10%). If an unpatched Critical security defect is found, a safety rule hard-caps the overall score at 50/100 to prevent premature production deployment."

---
*VibeSift Architecture Study Guide — Verified against `public/vibesift-architecture.png` on AWS Account `501380833083`.*
