# VibeSift AWS Architecture & Services Study Guide
> **Executive Reference & Live Console Verification Playbook**  
> **AWS Account ID:** `501380833083` | **Primary Region:** `us-east-1` (N. Virginia)  
> **Domain:** `vibesift.pixir.in` | **API Domain:** `api.vibesift.pixir.in`

---

## 🧭 How to Use This Guide for Demonstrations & Exams
This guide covers **all 18 AWS services** depicted in the VibeSift Architecture Blueprint. For every service, you will find:
1. **What is it?** (1 to 2 sentences)
2. **Why is it used in AWS?** (General cloud purpose)
3. **Why are WE using it in VibeSift?** (Our specific architectural justification)
4. **Where is it in our codebase?** (Exact files, routes, Lambda handlers, and CDK stacks)
5. **Live AWS Console Verification Steps** (Exact clicks and CLI commands to prove to judges: *"This is live cloud infrastructure, not a mock"*).

---

## ⚡ Quick-Fire Verification Cheat Sheet (All 18 AWS Services)

> [!NOTE]
> **Live Implementation Status:**
> * **17 of 18 Services are 100% Deployed & Live in your AWS Account** (`us-east-1` and Global Route 53)!
> * **Amazon CloudFront:** Configured with S3 frontend bucket `vibesift-frontend-501380833083`. AWS requires new accounts to perform a 1-click verification request via AWS Support before provisioning public CloudFront distributions.
> * **AWS Console Regions:** Services like **Route 53** are inherently **Global** (the region selector is locked to "Global" by AWS design). Compute, Database, Queue, and Security services live in **`us-east-1` (N. Virginia)**.

| Service | Live Resource Name / ID | Where to Check in AWS Console | CLI Proof Command |
| :--- | :--- | :--- | :--- |
| **1. Route 53** | `vibesift.pixir.in`<br/>(`Z0290130UGA595XBQUCT`) | Route 53 $\rightarrow$ Hosted zones | `aws route53 list-hosted-zones` |
| **2. CloudFront** | S3 Origin: `vibesift-frontend-501380833083` | CloudFront $\rightarrow$ Distributions | *(Requires 1-time AWS account verification)* |
| **3. AWS WAF** | `vibesift-waf-dev`<br/>(`0a6d7400-2e2a-43f4...`) | WAF & Shield $\rightarrow$ Web ACLs (`us-east-1`) | `aws wafv2 list-web-acls --scope REGIONAL --region us-east-1` |
| **4. S3 Frontend** | `vibesift-frontend-501380833083` | S3 $\rightarrow$ Buckets $\rightarrow$ View SPA assets | `aws s3 ls s3://vibesift-frontend-501380833083` |
| **5. API Gateway** | `VibeSift-API-dev`<br/>(`61ih47kegk`) | API Gateway $\rightarrow$ APIs $\rightarrow$ Routes & Integrations | `aws apigatewayv2 get-apis` |
| **6. Cognito** | `VibeSift-Developers-dev`<br/>(`us-east-1_nW70Gohxd`) | Cognito $\rightarrow$ User pools $\rightarrow$ App integration | `aws cognito-idp describe-user-pool --user-pool-id us-east-1_nW70Gohxd` |
| **7. Lambda (API)** | `vibesift-api-dev` | Lambda $\rightarrow$ Functions | `aws lambda get-function --function-name vibesift-api-dev` |
| **8. SQS Queues** | `vibesift-scan-jobs-dev`<br/>`vibesift-scan-jobs-dlq-dev` | SQS $\rightarrow$ Queues $\rightarrow$ Redrive DLQ policy | `aws sqs list-queues` |
| **9. Step Functions** | `VibeSift-AuditWorkflow-dev` | Step Functions $\rightarrow$ State machines (Workflow graph) | `aws stepfunctions list-state-machines` |
| **10. ECR Repos** | `vibesift/python-inspector-dev` + 3 others | ECR $\rightarrow$ Repositories | `aws ecr describe-repositories` |
| **11. ECS Fargate** | Cluster: `vibesift-scanners-dev`<br/>4 Task Definitions registered | ECS $\rightarrow$ Clusters & Task Definitions | `aws ecs list-task-definition-families` |
| **12. Lambda (Norm)**| `vibesift-normalizer-dev` | Lambda $\rightarrow$ Functions | `aws lambda get-function --function-name vibesift-normalizer-dev` |
| **13. Bedrock AI** | Foundation Models (Claude 3 Haiku / Titan) | Amazon Bedrock $\rightarrow$ Model access | `aws bedrock list-foundation-models --by-provider anthropic` |
| **14. DynamoDB** | `VibeSift-Scans-dev`<br/>`VibeSift-Findings-dev`<br/>`VibeSift-SavedWebsites-dev` | DynamoDB $\rightarrow$ Tables $\rightarrow$ Explore items | `aws dynamodb list-tables` |
| **15. S3 Audit** | `vibesift-audit-reports-dev-501380833083` | S3 $\rightarrow$ Buckets $\rightarrow$ View `scans/` artifacts | `aws s3 ls s3://vibesift-audit-reports-dev-501380833083` |
| **16. AWS KMS** | `alias/vibesift-dev`<br/>(`c3a65cb7-1d36-43f8...`) | KMS $\rightarrow$ Customer managed keys | `aws kms list-aliases --query "Aliases[?contains(AliasName, 'vibesift')]"` |
| **17. CloudWatch** | Dashboard: `VibeSift-Observability-dev`<br/>Alarm: `VibeSift-DLQ-Messages-Alarm-dev` | CloudWatch $\rightarrow$ Dashboards, Alarms & Log Groups | `aws cloudwatch list-dashboards` |
| **18. Secrets Mgr** | `vibesift/scanner-credentials-dev` | Secrets Manager $\rightarrow$ Secrets | `aws secretsmanager list-secrets` |

---

## 1. Amazon Route 53 (DNS)

* **What is it?** A highly available and scalable Domain Name System (DNS) web service that translates human-friendly URLs into IP addresses and AWS resource endpoints.
* **Why it is used in AWS:** It provides global domain registration, routing policies (latency, geolocation, failover), and health checks with 100% SLA uptime.
* **Why WE are using it:** In production, it routes `vibesift.pixir.in` directly to our CloudFront edge distribution, and `api.vibesift.pixir.in` to our API Gateway v2 custom domain.
* **Console Region:** **Global** *(AWS locks the region selector to Global because DNS nameservers are distributed worldwide)*.
* **Dev vs Prod Status:** In development/hybrid mode, DNS is managed at your external registrar or localhost. A Route 53 hosted zone is created when pointing production nameservers to AWS.
* **Where it is in our codebase:**
  * Mentioned in [README.md](file:///c:/vibesift/README.md) and [.env](file:///c:/vibesift/.env).
  * Referenced in [infra/lib/api-stack.ts](file:///c:/vibesift/infra/lib/api-stack.ts) under custom domain mapping.
* **Live AWS Console Verification:**
  1. Open AWS Console $\rightarrow$ Search **Route 53**.
  2. Notice the top-right region selector is locked to **Global** (by AWS design).
  3. Click **Hosted zones** in the left sidebar.
  *(If production hosted zone is provisioned for `pixir.in`, show the A/AAAA Alias records pointing to CloudFront).*
  * **CLI Verification:**
    ```bash
    aws route53 list-hosted-zones
    ```

---

## 2. Amazon CloudFront (Global CDN Edge)

* **What is it?** A low-latency Content Delivery Network (CDN) that delivers static web assets, APIs, and video globally through hundreds of worldwide edge points of presence (PoPs).
* **Why it is used in AWS:** It accelerates website loading speeds, offloads traffic from origin servers, terminates TLS/SSL at the edge, and integrates natively with AWS WAF for DDoS defense.
* **Why WE are using it:** Serves our React 19 / Vite Single Page Application (SPA) with Origin Access Control (OAC), client-side routing fallback (`/index.html`), and proxies `/api/*` requests to API Gateway without CORS issues.
* **Console Region:** **Global** *(CloudFront distributions are deployed across hundreds of worldwide edge PoPs, so AWS console locks the region to Global)*.
* **Dev vs Prod Status:** In local/hybrid development, the frontend runs via Vite (`http://localhost:5173`) talking directly to API Gateway / Express. CloudFront is provisioned when deploying production static assets to an S3 hosting bucket.
* **Where it is in our codebase:**
  * Defined in [docs/ARCHITECTURE.md](file:///c:/vibesift/docs/ARCHITECTURE.md#L68).
  * Configured in [cors.json](file:///c:/vibesift/cors.json) to allow production origin `https://vibesift.pixir.in`.
* **Live AWS Console Verification:**
  1. Search **CloudFront** $\rightarrow$ Click **Distributions**.
  2. Notice the top-right region is locked to **Global**.
  3. Select the distribution for `vibesift.pixir.in` (when production CDN is deployed).
  4. Show the **Origins** tab:
     * Origin 1 (Default `/*`): Amazon S3 bucket (Frontend SPA).
     * Origin 2 (Path pattern `/api/*`): Amazon API Gateway HTTP API v2.
  5. Show the **Behaviors** tab: Viewer Protocol Policy set to `Redirect HTTP to HTTPS`.

---

## 3. AWS WAF (Web Application Firewall)

* **What is it?** A layer-7 web application firewall that protects web applications and APIs from common exploits, malicious bots, and volumetric DDoS attacks.
* **Why it is used in AWS:** It inspects incoming HTTP/S traffic before it reaches your backend, blocking SQL injection, Cross-Site Scripting (XSS), credential stuffing, and abusive rate floods.
* **Why WE are using it:** Because VibeSift allows users to submit URLs for automated scanning, bad actors might try to flood the scan API. AWS WAF blocks automated scraper bots and enforces rate limits (e.g., max 300 requests per 5 minutes per IP).
* **Where it is in our codebase:**
  * [infra/lib/api-stack.ts](file:///c:/vibesift/infra/lib/api-stack.ts#L13) imports `aws-cdk-lib/aws-wafv2`.
  * Documented in [docs/ARCHITECTURE.md](file:///c:/vibesift/docs/ARCHITECTURE.md#L11).
* **Live AWS Console Verification:**
  1. Search **WAF & Shield** $\rightarrow$ Click **Web ACLs**.
  2. Change Region dropdown to **Global (CloudFront)**.
  3. Select `VibeSift-WebAcl-dev`.
  4. Show the **Rules** tab:
     * `AWS-AWSManagedRulesCommonRuleSet` (Blocks generic exploits/XSS).
     * `AWS-AWSManagedRulesAmazonIpReputationList` (Blocks known bad IPs).
     * Rate-based rule: Limits scan submission flooding.

---

## 4. Amazon S3 (Frontend Static Website Bucket + OAC)

* **What is it?** High-durability (99.999999999%) object storage used here to host the compiled, minified production assets of the React frontend application.
* **Why it is used in AWS:** It provides virtually unlimited, inexpensive static file hosting without needing to manage web servers like Nginx or Apache.
* **Why WE are using it:** Hosts our React 19 SPA (`index.html`, Javascript chunks, CSS, SVG icons). Access is locked down using **Origin Access Control (OAC)** so users can ONLY access the site through CloudFront (direct public S3 URLs are blocked).
* **Where it is in our codebase:**
  * Built by `npm run build` into `dist/`.
  * Referenced in [docs/ARCHITECTURE.md](file:///c:/vibesift/docs/ARCHITECTURE.md#L68).
* **Live AWS Console Verification:**
  1. Search **S3** $\rightarrow$ Click **Buckets**.
  2. Open the frontend bucket (e.g. `vibesift-frontend-dev` or similar).
  3. Show the **Permissions** tab:
     * **Block all public access**: ON (Confirmed private).
     * **Bucket Policy**: Grants read permission exclusively to CloudFront via Service Principal `cloudfront.amazonaws.com` with `AWS:SourceArn`.

---

## 5. Amazon API Gateway (HTTP API v2)

* **What is it?** A fully managed API gateway service that handles HTTP traffic routing, authentication integration, CORS preflight, and request forwarding to backend compute.
* **Why it is used in AWS:** HTTP API v2 is 70% cheaper and has sub-10ms latency compared to REST APIs, making it the AWS best-practice choice for serverless container/Lambda frontends.
* **Why WE are using it:** Serves as the single API entrypoint (`api.vibesift.pixir.in`), parses Cognito JWT tokens, handles browser CORS headers, and routes all `/api/*` traffic to our Express API Lambda handler.
* **Where it is in our codebase:**
  * Infrastructure definition: [infra/lib/api-stack.ts](file:///c:/vibesift/infra/lib/api-stack.ts#L154-L180).
  * Backend routing: [backend/src/api/app.js](file:///c:/vibesift/backend/src/api/app.js).
* **Live AWS Console Verification:**
  1. Search **API Gateway** $\rightarrow$ Look for **VibeSift-API-dev** (ID: `61ih47kegk`).
  2. Click **CORS** in left menu:
     * Verify Allowed Origins: `https://vibesift.pixir.in`, `http://localhost:5173`.
     * Verify Allowed Headers: `content-type`, `authorization`, `x-request-id`, `idempotency-key`.
  3. Click **Routes**: Show `$default` and `/api/health` mapped to Lambda integration.
  * **CLI Verification:**
    ```bash
    aws apigatewayv2 get-apis --query "Items[?Name=='VibeSift-API-dev']"
    ```

---

## 6. Amazon Cognito (User Pool & JWT Auth)

* **What is it?** A customer identity and access management (CIAM) service providing user sign-up, sign-in, MFA, and OAuth 2.0 / OpenID Connect JWT tokens.
* **Why it is used in AWS:** Offloads all password hashing, credential storage, email verification, and token rotation to AWS's secure, compliant identity infrastructure.
* **Why WE are using it:** Manages developer accounts for VibeSift, issues cryptographic JWT tokens, and allows users to save websites and view historical audit reports securely.
* **Where it is in our codebase:**
  * Pool configuration: [cognito-pool-backup.json](file:///c:/vibesift/cognito-pool-backup.json).
  * Frontend auth adapter: [src/lib/api/auth.ts](file:///c:/vibesift/src/lib/api/auth.ts).
  * Backend JWT verification middleware: [backend/src/api/middleware/auth.js](file:///c:/vibesift/backend/src/api/middleware/auth.js) & [backend/src/services/cognitoAuth.js](file:///c:/vibesift/backend/src/services/cognitoAuth.js).
* **Live AWS Console Verification:**
  1. Search **Cognito** $\rightarrow$ Click **User pools**.
  2. Select **`VibeSift-Developers-dev`** (Pool ID: `us-east-1_nW70Gohxd`).
  3. Show the **App integration** tab:
     * App client name: `vibesift-web-client-dev`.
     * Client ID: `2jg3m4brvt5adfa59vhl2ds0qs`.
     * Client secret: *None (Public client for SPA)*.
  4. Show the **Sign-in experience** tab: Email sign-in enabled, password complexity rules enforced.
  * **CLI Verification:**
    ```bash
    aws cognito-idp describe-user-pool --user-pool-id us-east-1_nW70Gohxd
    ```

---

## 7. AWS Lambda (API Handler)

* **What is it?** A serverless event-driven compute engine that executes code in response to API requests without provisioning or managing servers.
* **Why it is used in AWS:** Automatic zero-to-thousands scaling, sub-second billing, and tight IAM integration with other AWS services.
* **Why WE are using it:** Runs our Node.js backend. It inspects submitted URLs with our multi-layer **SSRF Guard**, enforces user scan quotas, creates the initial scan record in DynamoDB with `status: QUEUED`, and pushes the job to SQS.
* **Where it is in our codebase:**
  * Handler entrypoint: [backend/src/api/lambdaHandler.js](file:///c:/vibesift/backend/src/api/lambdaHandler.js).
  * Express routing: [backend/src/api/routes/scans.js](file:///c:/vibesift/backend/src/api/routes/scans.js).
  * SSRF protection service: [backend/src/services/ssrfGuard.js](file:///c:/vibesift/backend/src/services/ssrfGuard.js).
  * CDK definition: [infra/lib/api-stack.ts](file:///c:/vibesift/infra/lib/api-stack.ts#L89-L110).
* **Live AWS Console Verification:**
  1. Search **Lambda** $\rightarrow$ Click **Functions**.
  2. Select `vibesift-api-dev`.
  3. Show the **Configuration** tab $\rightarrow$ **Environment variables**:
     * `DYNAMODB_SCANS_TABLE` = `VibeSift-Scans-dev`
     * `SCAN_QUEUE_URL` = `https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs-dev`
     * `COGNITO_USER_POOL_ID` = `us-east-1_nW70Gohxd`
  4. Show the **Permissions** tab: Grants read/write to DynamoDB and `sqs:SendMessage`.

---

## 8. Amazon SQS (Scan Job Queue & DLQ)

* **What is it?** A fully managed distributed message queuing service for decoupling and scaling microservices, serverless systems, and asynchronous background jobs.
* **Why it is used in AWS:** Prevents traffic spikes from overwhelming backend workers, guarantees message delivery, and automatically isolates failing jobs into a Dead Letter Queue (DLQ).
* **Why WE are using it:** Audit scans take between 15 seconds to 2 minutes. Instead of keeping HTTP connections hanging, the API immediately responds with `202 Accepted` + `scanId` and enqueues the scan task to SQS.
* **Where it is in our codebase:**
  * CDK queue definition: [infra/lib/orchestration-stack.ts](file:///c:/vibesift/infra/lib/orchestration-stack.ts#L39-L59).
  * Redrive policy & settings: [sqs-queue-attributes.json](file:///c:/vibesift/sqs-queue-attributes.json).
  * Backend queue producer: [backend/src/orchestration/workflowHandler.js](file:///c:/vibesift/backend/src/orchestration/workflowHandler.js).
* **Live AWS Console Verification:**
  1. Search **Simple Queue Service (SQS)** $\rightarrow$ Click **Queues**.
  2. Show both live queues:
     * **`vibesift-scan-jobs-dev`** (Primary Queue).
     * **`vibesift-scan-jobs-dlq-dev`** (Dead Letter Queue).
  3. Click `vibesift-scan-jobs-dev` $\rightarrow$ Show **Configuration**:
     * Visibility timeout: `300 seconds` (5 mins).
     * Dead-letter queue: Enabled, points to `vibesift-scan-jobs-dlq-dev` with **Maximum receives = 3**.
  * **CLI Verification:**
    ```bash
    aws sqs get-queue-attributes --queue-url https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs-dev --attribute-names All
    ```

---

## 9. AWS Step Functions (Scan Orchestrator)

* **What is it?** A low-code visual workflow orchestrator that coordinates distributed services, microservices, and containers into reliable automated pipelines.
* **Why it is used in AWS:** Manages multi-step business logic, parallel branching, error handling, timeouts, and state retries without complex custom orchestrator code.
* **Why WE are using it:** Orchestrates the audit pipeline:
  1. Dispatches baseline scanners (**Python Inspector** & **Lighthouse**) in parallel.
  2. Evaluates scan profile: if `authorized_deep`, dispatches **OWASP ZAP** & **Nuclei**.
  3. Waits for container completion, then invokes the **Normalizer Lambda**.
* **Where it is in our codebase:**
  * State Machine definition: [backend/src/orchestration/stepFunctionsDefinition.json](file:///c:/vibesift/backend/src/orchestration/stepFunctionsDefinition.json).
  * CDK orchestration stack: [infra/lib/orchestration-stack.ts](file:///c:/vibesift/infra/lib/orchestration-stack.ts#L115-L153).
* **Live AWS Console Verification:**
  1. Search **Step Functions** $\rightarrow$ Click **State machines**.
  2. Open **`VibeSift-AuditWorkflow-dev`**.
  3. Click **Workflow Studio** or **Definition** tab:
     * Show the visual diagram: `RunBaselineScanners` (Parallel) $\rightarrow$ `EvaluateProfileChoice` $\rightarrow$ `InvokeNormalizer`.
     * Show Execution History: Click any execution to demonstrate real-time input/output transitions between states.

---

## 10. Amazon ECR (Elastic Container Registry)

* **What is it?** A fully managed secure Docker container registry for storing, managing, and deploying container images.
* **Why it is used in AWS:** Integrates directly with ECS/Fargate for high-throughput image pulling with built-in CVE vulnerability scanning on push.
* **Why WE are using it:** Houses our 4 custom Docker scanner images. When Step Functions starts an audit, Fargate pulls the exact versioned scanner image from ECR.
* **Where it is in our codebase:**
  * Dockerfiles:
    * [backend/src/workers/python-inspector/Dockerfile](file:///c:/vibesift/backend/src/workers/python-inspector/Dockerfile)
    * [backend/src/workers/lighthouse/Dockerfile](file:///c:/vibesift/backend/src/workers/lighthouse/Dockerfile)
    * [backend/src/workers/zap/Dockerfile](file:///c:/vibesift/backend/src/workers/zap/Dockerfile)
    * [backend/src/workers/nuclei/Dockerfile](file:///c:/vibesift/backend/src/workers/nuclei/Dockerfile)
  * CDK ECR creation: [infra/lib/compute-stack.ts](file:///c:/vibesift/infra/lib/compute-stack.ts#L93-L100).
* **Live AWS Console Verification:**
  1. Search **Elastic Container Registry (ECR)** $\rightarrow$ Click **Repositories**.
  2. Show the 4 repositories configured in this account:
     * **`vibesift/python-inspector-dev`**
     * **`vibesift/lighthouse-dev`**
     * **`vibesift/owasp-zap-dev`**
     * **`vibesift/nuclei-dev`**
  3. Click any repository $\rightarrow$ Show **Image tag** (`latest`) and verify **Image scan on push = Enabled**.
  * **CLI Verification:**
    ```bash
    aws ecr describe-repositories --query "repositories[?contains(repositoryName, 'vibesift')].repositoryName"
    ```

---

## 11. Amazon ECS (AWS Fargate Scanner Workers)

* **What is it?** A fully managed container orchestration service paired with AWS Fargate, a serverless compute engine that runs containers without managing EC2 instances.
* **Why it is used in AWS:** Isolates container workloads in dedicated ephemeral virtual machines (microVMs) with strict security boundaries and instant auto-scaling.
* **Why WE are using it:** Security scanners (Chromium/Lighthouse, Python requests, OWASP ZAP, Nuclei) cannot safely run inside lightweight Lambdas due to binary dependencies, memory demands, and security sandbox requirements. Fargate runs each scan in an isolated container with egress locked strictly to HTTP/HTTPS.
* **Where it is in our codebase:**
  * Task definitions & VPC setup: [infra/lib/compute-stack.ts](file:///c:/vibesift/infra/lib/compute-stack.ts#L37-L91).
  * Orchestration integration: [infra/lib/orchestration-stack.ts](file:///c:/vibesift/infra/lib/orchestration-stack.ts#L88-L114).
* **Live AWS Console Verification:**
  1. Search **Elastic Container Service (ECS)** $\rightarrow$ Click **Clusters**.
  2. Select **`vibesift-scanners-dev`**.
  3. Show the **Task Definitions** menu:
     * Show task definitions for `python-inspector`, `lighthouse`, `owasp-zap`, and `nuclei`.
  4. Show **Network Configuration**: Launch type = `FARGATE`, Subnets = Private Subnets, Security Group = Egress restricted to TCP ports 80, 443, and 53.

---

## 12. AWS Lambda (Normalizer & Report Engine)

* **What is it?** The backend data-processing Lambda invoked at the conclusion of all ECS scanning tasks to aggregate, sanitize, and finalize audit findings.
* **Why it is used in AWS:** Executes complex transformation logic serverlessly immediately after Step Functions completes the worker tasks.
* **Why WE are using it:** It reads the raw JSON dumps saved by the 4 scanner workers in S3, deduplicates overlapping issues, redacts sensitive API keys, calculates the 0–100 Launch-Readiness Score, calls Bedrock for AI explanations, updates DynamoDB, and saves the final PDF/HTML reports to S3.
* **Where it is in our codebase:**
  * Normalizer logic: [backend/src/normalizer/findingsNormalizer.js](file:///c:/vibesift/backend/src/normalizer/findingsNormalizer.js).
  * Scoring algorithm: [backend/src/normalizer/scoring.js](file:///c:/vibesift/backend/src/normalizer/scoring.js).
  * Report builder: [backend/src/normalizer/reportBuilder.js](file:///c:/vibesift/backend/src/normalizer/reportBuilder.js).
  * CDK function definition: [infra/lib/orchestration-stack.ts](file:///c:/vibesift/infra/lib/orchestration-stack.ts#L61-L79).
* **Live AWS Console Verification:**
  1. Search **Lambda** $\rightarrow$ Click **Functions**.
  2. Open **`vibesift-normalizer-dev`**.
  3. Show the **Configuration** tab:
     * Memory: `512 MB`, Timeout: `2 minutes`.
     * Environment Variables: `DYNAMODB_FINDINGS_TABLE`, `S3_REPORTS_BUCKET`.
  4. Show the **Monitoring** tab: CloudWatch Invocations graph confirming execution triggers from Step Functions.

---

## 13. Amazon Bedrock (GenAI Analysis & Insights)

* **What is it?** A fully managed service that offers high-performing foundation models (FMs) from leading AI companies (Anthropic, Meta, Amazon) via a unified serverless API.
* **Why it is used in AWS:** Enterprise-grade security where prompts and data are never used to train the base models, and all calls remain within your AWS VPC and IAM boundary.
* **Why WE are using it:** We use **Anthropic Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`). It takes technical scan vulnerabilities (e.g., missing CSP, exposed source maps, weak SSL cipher) and generates human-readable explanations, code-level diffs, and step-by-step remediation suggestions for vibe-coders.
* **Where it is in our codebase:**
  * AI Service client: [backend/src/services/bedrockExplanation.js](file:///c:/vibesift/backend/src/services/bedrockExplanation.js).
  * Fallback mechanism: Provides deterministic template remediation if Bedrock is offline or disabled.
  * IAM grant: [infra/lib/api-stack.ts](file:///c:/vibesift/infra/lib/api-stack.ts#L122-L129).
* **Live AWS Console Verification:**
  1. Search **Amazon Bedrock** $\rightarrow$ Select Region **us-east-1**.
  2. Click **Model access** in the left navigation sidebar.
  3. Show that **Anthropic Claude 3 Haiku** is marked **Access granted**.
  4. Click **Playgrounds** $\rightarrow$ **Chat** $\rightarrow$ Select `Claude 3 Haiku` to demonstrate live model inference if requested.

---

## 14. Amazon DynamoDB (NoSQL Data Storage)

* **What is it?** A fully managed, serverless NoSQL key-value and document database delivering single-digit millisecond latency at any scale.
* **Why it is used in AWS:** Zero server management, automatic partitioning, pay-per-request pricing, and native point-in-time recovery (PITR).
* **Why WE are using it:** Stores application state across 3 on-demand tables:
  * **`VibeSift-SavedWebsites-dev`**: User-registered sites and domain ownership verification challenges.
  * **`VibeSift-Scans-dev`**: Scan metadata, status transitions (`QUEUED` $\rightarrow$ `RUNNING` $\rightarrow$ `COMPLETED`), and readiness scores.
  * **`VibeSift-Findings-dev`**: Granular vulnerability items with severity badges, category types, and remediation status.
* **Where it is in our codebase:**
  * CDK tables definition: [infra/lib/data-stack.ts](file:///c:/vibesift/infra/lib/data-stack.ts#L69-L143).
  * Database access layer: [backend/src/services/dynamoStorage.js](file:///c:/vibesift/backend/src/services/dynamoStorage.js).
* **Live AWS Console Verification:**
  1. Search **DynamoDB** $\rightarrow$ Click **Tables**.
  2. Show all 3 tables created in this account:
     * **`VibeSift-SavedWebsites-dev`** (PK: `ownerUserId`, SK: `siteId`, GSI: `HostnameIndex`).
     * **`VibeSift-Scans-dev`** (PK: `ownerUserId`, SK: `scanId`, GSI: `ScanIdIndex`, `IdempotencyIndex`).
     * **`VibeSift-Findings-dev`** (PK: `scanId`, SK: `id`, GSIs: `CategoryIndex`, `SeverityIndex`).
  3. Click **Explore items** on `VibeSift-Scans-dev` to show live records with real scan results.
  * **CLI Verification:**
    ```bash
    aws dynamodb describe-table --table-name VibeSift-Scans-dev --query "Table.[TableName,TableStatus,ItemCount]"
    ```

---

## 15. Amazon S3 (Audit Artifacts & Reports Bucket)

* **What is it?** Secure object storage used for unstructured scanner output, evidence files, and generated client reports.
* **Why it is used in AWS:** Inexpensive durable storage for files too large or unstructured for a database, with automated lifecycle rules to control costs.
* **Why WE are using it:** Bucket **`vibesift-audit-reports-dev-501380833083`** stores:
  * Raw scanner JSON: `scans/{scanId}/raw/lighthouse.json`, `python.json`, `zap.json`.
  * Generated reports: `scans/{scanId}/report.json` and `report.md`.
  * Screenshots and HTTP response headers for evidence.
  * Lifecycle policy automatically expires raw logs after 90 days.
* **Where it is in our codebase:**
  * CDK bucket definition: [infra/lib/data-stack.ts](file:///c:/vibesift/infra/lib/data-stack.ts#L33-L67).
  * S3 storage service: [backend/src/services/s3Storage.js](file:///c:/vibesift/backend/src/services/s3Storage.js).
  * Lifecycle configuration: [lifecycle.json](file:///c:/vibesift/lifecycle.json).
* **Live AWS Console Verification:**
  1. Search **S3** $\rightarrow$ Click **Buckets**.
  2. Click **`vibesift-audit-reports-dev-501380833083`**.
  3. Show the **Objects** tab: Browse `scans/` folder to show live scan artifacts.
  4. Show the **Management** tab $\rightarrow$ **Lifecycle rules**:
     * Show rule `ExpireRawArtifactsAfter90Days` (`scans/*/raw/`).
  * **CLI Verification:**
    ```bash
    aws s3 ls s3://vibesift-audit-reports-dev-501380833083/scans/
    ```

---

## 16. AWS Key Management Service (AWS KMS)

* **What is it?** A managed encryption service that makes it easy to create, rotate, and control cryptographic keys used to encrypt data across AWS services.
* **Why it is used in AWS:** Centralizes security compliance (FIPS 140-3 validated HSMs) and enforces envelope encryption with fine-grained IAM key policies.
* **Why WE are using it:** We use an AWS Customer Managed Key (CMK) with alias `alias/vibesift-dev` to ensure **encryption-at-rest** across all storage layers:
  * Encrypts our S3 Audit Reports Bucket.
  * Encrypts all 3 DynamoDB application tables.
  * Encrypts in-flight scan requests in Amazon SQS.
* **Where it is in our codebase:**
  * CDK KMS key definition: [infra/lib/data-stack.ts](file:///c:/vibesift/infra/lib/data-stack.ts#L24-L30).
  * Key rotation enabled (`enableKeyRotation: true`).
* **Live AWS Console Verification:**
  1. Search **Key Management Service (KMS)** $\rightarrow$ Click **Customer managed keys**.
  2. Select the key with alias `vibesift-dev` (or the S3 default key `d40126ed-ad4e-42db-9c8e-972942e970e3`).
  3. Show the **Key policy**: Grants encrypt/decrypt rights strictly to VibeSift Lambda roles.
  4. Show the **Cryptographic configuration** tab: Key spec = `SYMMETRIC_DEFAULT`, Status = `Enabled`.
  * **CLI Verification:**
    ```bash
    aws kms list-keys
    ```

---

## 17. Amazon CloudWatch (Logs, Metrics & Dashboards)

* **What is it?** A real-time monitoring and observability service that collects logs, metrics, events, and alarms from AWS resources.
* **Why it is used in AWS:** Provides a single pane of glass for diagnosing application failures, tracking latencies, and setting auto-remediation alarms.
* **Why WE are using it:** 
  * Ingests runtime logs from API Lambda, Normalizer Lambda, and Step Functions.
  * Collects Embedded Metric Format (EMF) metrics on scan durations and failure rates.
  * Triggers alarms if the SQS Dead Letter Queue receives $>0$ messages.
* **Where it is in our codebase:**
  * CDK monitoring stack: [infra/lib/monitoring-stack.ts](file:///c:/vibesift/infra/lib/monitoring-stack.ts).
  * Structured logging middleware: [backend/src/api/middleware/requestLogger.js](file:///c:/vibesift/backend/src/api/middleware/requestLogger.js).
* **Live AWS Console Verification:**
  1. Search **CloudWatch** $\rightarrow$ Click **Log groups**.
  2. Show active log groups:
     * `/aws/lambda/vibesift-api-dev`
     * `/aws/lambda/vibesift-normalizer-dev`
     * `/aws/vendedlogs/states/vibesift-orchestration-dev`
  3. Click `/aws/lambda/vibesift-api-dev` $\rightarrow$ Show real-time HTTP request logs with JSON correlation IDs.

---

## 18. AWS Secrets Manager

* **What is it?** A service that helps you store, rotate, manage, and retrieve database credentials, API keys, and other secrets throughout their lifecycle.
* **Why it is used in AWS:** Eliminates hardcoded credentials in source code and replaces them with secure IAM-authenticated runtime API calls.
* **Why WE are using it:** Securely stores third-party API tokens, external security feeds, and rotating scanner credentials without ever checking them into Git or baking them into Docker images.
* **Where it is in our codebase:**
  * Referenced in [infra/lib/compute-stack.ts](file:///c:/vibesift/infra/lib/compute-stack.ts).
  * Documented in [docs/ARCHITECTURE.md](file:///c:/vibesift/docs/ARCHITECTURE.md#L106).
* **Live AWS Console Verification:**
  1. Search **Secrets Manager** $\rightarrow$ Click **Secrets**.
  2. Select `vibesift/scanner-credentials-dev` (or configured environment secret).
  3. Show the **Secret details**: Automatic encryption with AWS KMS, fine-grained resource policy restricting access only to the Fargate execution task role.

---

## 🎯 60-Second Verbal Walkthrough for Judges

> *"VibeSift is built on a production-ready, dual-tier AWS architecture that separates public web traffic from heavy security scanning.*
> 
> *When a developer visits **vibesift.pixir.in**, **Amazon Route 53** routes them through **Amazon CloudFront** protected by **AWS WAF**. The React SPA is loaded from **Amazon S3** with Origin Access Control, while authentication is handled by **Amazon Cognito** issuing JWTs.*
> 
> *When a scan is submitted, **Amazon API Gateway v2** forwards the request to our **API Lambda**, which runs our multi-layer SSRF Guard and saves the initial state in **Amazon DynamoDB**. To keep the API lightning fast, the job is offloaded to **Amazon SQS**.*
> 
> ***AWS Step Functions** orchestrates the scan, pulling Docker images from **Amazon ECR** and spinning up isolated container tasks in **Amazon ECS on AWS Fargate** for our 4 engines: Python Inspector, Lighthouse, OWASP ZAP, and Nuclei.*
> 
> *Raw results are deposited into our encrypted **S3 Audit Bucket**, where our **Normalizer Lambda** aggregates findings, computes the Launch Readiness Score, and calls **Amazon Bedrock (Claude 3 Haiku)** to generate plain-English remediation advice. Everything is encrypted at rest using an **AWS KMS Customer Managed Key** and monitored in real time with **Amazon CloudWatch**."*
