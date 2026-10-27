# VibeSift Deployment & Operations Guide

This guide details local development workflows, AWS CDK deployment steps for a small development environment, and AWS cost breakdown.

---

## 1. Local Development (Zero AWS Account Required)

You can run and test the complete backend locally with zero external cloud dependencies. In local development mode:
- In-memory & local filesystem storage mock DynamoDB and S3.
- Scans execute through the local asynchronous pipeline.
- SSRF protections remain fully active and enforced.
- Development auth tokens are accepted (`Authorization: Bearer demo_user_123`).

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure `USE_LOCAL_STORAGE=true` and `USE_MOCK_ORCHESTRATION=true`.

### Step 3: Run the API Server
```bash
npm start
# Server starts at http://localhost:4000
```

### Step 4: Run Test Suites
```bash
# Run all 26 backend unit and integration tests
npm test

# Run Python inspector unit tests
cd src/workers/python-inspector
python test_inspector.py
```

---

## 2. AWS Account Deployment (Small Development Environment)

### Prerequisites
1. **AWS CLI v2** configured with administrator credentials:
   ```bash
   aws configure
   ```
2. **Node.js 20+** and **npm 10+** installed.
3. **AWS CDK CLI v2** installed:
   ```bash
   npm install -g aws-cdk
   ```
4. **Docker** running locally (for building scanner container images).

### Step 1: Bootstrap AWS Environment
```bash
cd infra
npm install
npm run build
cdk bootstrap aws://<ACCOUNT_ID>/<AWS_REGION>
```

### Step 2: Synthesize and Review CloudFormation Templates
```bash
cdk synth
```

### Step 3: Deploy All Stacks
```bash
cdk deploy --all --context stage=dev
```

### Step 4: Build and Push Worker Docker Images to ECR
After CDK deploys the ECR repositories:
```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com

# 1. Python Inspector
docker build -t <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/python-inspector-dev:latest ../backend/src/workers/python-inspector
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/python-inspector-dev:latest

# 2. Lighthouse Worker
docker build -t <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/lighthouse-dev:latest ../backend/src/workers/lighthouse
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/lighthouse-dev:latest

# 3. OWASP ZAP Worker
docker build -t <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/owasp-zap-dev:latest ../backend/src/workers/zap
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/owasp-zap-dev:latest

# 4. Nuclei Worker
docker build -t <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/nuclei-dev:latest ../backend/src/workers/nuclei
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/vibesift/nuclei-dev:latest
```

### Step 5: Connect Frontend to Backend
Update the root frontend `.env` with the CDK output values:
```ini
VITE_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
VITE_COGNITO_USER_POOL_ID=<user-pool-id>
VITE_COGNITO_CLIENT_ID=<user-pool-client-id>
VITE_USE_MOCK_API=false
```

---

## 3. Cost Identification & Small Dev Environment Optimization

The infrastructure is tailored for cost efficiency while preserving production architecture:

| AWS Service | Dev Tier Sizing | Estimated Monthly Cost (Dev) | Cost Optimization Strategy |
| :--- | :--- | :--- | :--- |
| **AWS NAT Gateway** | 1 NAT Gateway (Single AZ for dev) | ~$32.00 / mo | Dev uses 1 NAT gateway instead of 2. Can be replaced with VPC Endpoints for S3/DynamoDB to eliminate NAT data charges. |
| **ECS Fargate** | On-demand tasks (0.5–1 vCPU) | ~$5.00–$15.00 / mo (usage based) | Tasks only run during active scans and terminate immediately upon completion (pay-per-second). |
| **DynamoDB** | On-Demand (PAY_PER_REQUEST) | Free Tier (first 25 RCU/WCU free) | Zero idle cost when not actively reading/writing. |
| **Amazon S3** | Standard + KMS encryption | < $1.00 / mo | Raw scan outputs auto-expire after 90 days; reports transition to Infrequent Access after 30 days. |
| **AWS Lambda & API Gateway** | 1M free requests / mo | Free Tier (< $0.50 / mo) | Sub-second execution times; pay-per-request. |
| **Amazon Cognito** | 50,000 MAUs free tier | Free | Zero cost for small developer user bases. |
| **AWS WAF** | 1 WebACL + 2 rules | ~$7.00 / mo | Fixed cost for managed regional protection. Optional to disable in non-public staging environments. |
| **Amazon Bedrock** | Claude 3 Haiku ($0.25 / 1M tokens) | < $1.00 / mo | Compact prompts, sanitized payloads, and aggressive in-memory caching. Operates with deterministic fallback if disabled. |
| **Total Estimated Dev Cost** | — | **~$45.00 – $55.00 / mo** | Cost cap enforced via CloudWatch Budget Alert at $25 (80% threshold trigger). |

---

## 4. Required IAM Permissions for Deployment

To deploy the VibeSift CDK stack, the deploying AWS identity (CI/CD pipeline or developer IAM user) requires permissions for:
- `cloudformation:*`
- `dynamodb:*`
- `s3:*`
- `kms:*`
- `ec2:*` (VPC, Subnets, Security Groups, NAT Gateways)
- `ecs:*`
- `ecr:*`
- `iam:CreateRole`, `iam:PutRolePolicy`, `iam:PassRole`
- `states:*` (Step Functions)
- `sqs:*`
- `lambda:*`
- `apigateway:*`
- `cognito-idp:*`
- `wafv2:*`
- `budgets:*`
- `cloudwatch:*`
