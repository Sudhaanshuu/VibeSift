# VibeSift Deployment & Operations Guide

> **Document Status:** Authoritative Production Deployment Guide  
> **Production Target:** https://vibesift.pixir.in  
> **Host Architecture:** AWS EC2 (Ubuntu 24.04 LTS) + Amazon SQS FIFO + AWS Lambda + Amazon S3 + Amazon Cognito + Cloudflare  
> **Cost Model:** 100% AWS Free Tier / Zero-Docker Overhead (~$0.00 – $1.00 / month)

---

## 1. Local Development (Zero Cloud Dependencies)

You can run and test the complete frontend and backend locally with zero cloud accounts required:
- In-memory & local filesystem storage (`.local_storage/vibesift.sqlite`) mock DynamoDB and S3.
- Scans execute through the local asynchronous pipeline.
- SSRF protections remain fully active and enforced.
- Development auth tokens are accepted (`Authorization: Bearer demo_user_123`).

### Step 1: Install Dependencies
```bash
# Root and backend dependencies
npm run setup
```

### Step 2: Start Development Server
```bash
npm run dev
# Frontend starts at http://localhost:5173
# Backend API starts at http://localhost:4000
# SQLite WAL database created at .local_storage/vibesift.sqlite
```

### Step 3: Run Test Suites
```bash
# Backend unit & integration tests (72 tests)
npm run test:backend

# Frontend Vitest test suite (51 tests)
npm test

# Python Inspector unit tests (11 tests)
npm run test:lambda
python backend/src/workers/python-inspector/test_inspector.py
```

---

## 2. Production Cloud Deployment Architecture

VibeSift operates on a lean, zero-Docker compute topology that replaces heavyweight ECS Fargate clusters and Step Functions with native host processes, serverless Lambda, and SQS FIFO queueing.

```
                          ┌─────────────────────────────────────┐
                          │          Cloudflare Edge            │
                          │ DNS • SSL/TLS 1.3 • Turnstile • WAF │
                          └──────────────────┬──────────────────┘
                                             │ HTTPS (Port 443)
                                             ▼
                          ┌─────────────────────────────────────┐
                          │        AWS EC2 Production Host      │
                          │   Ubuntu 24.04 LTS (54.144.160.191) │
                          │                                     │
                          │  ┌───────────────┐ ┌──────────────┐ │
                          │  │ Nginx Proxy   │ │ Vite Dist SPA│ │
                          │  └───────┬───────┘ └──────────────┘ │
                          │          │                          │
                          │  ┌───────▼────────────────────────┐ │
                          │  │ Express API (PM2: port 4000)   │ │
                          │  │ 'vibesift-backend'             │ │
                          │  └───────┬────────────────────────┘ │
                          │          │                          │
                          │  ┌───────▼────────────────────────┐ │
                          │  │ SQS Worker (PM2)               │ │
                          │  │ 'vibesift-sqs-worker'          │ │
                          │  └───────┬───────────┬────────────┘ │
                          │          │           │              │
                          │          ▼           ▼              │
                          │      Chromium     SQLite 3          │
                          │     Lighthouse   (WAL Mode)         │
                          └──────────┼───────────┼──────────────┘
                                     │           │
            ┌────────────────────────┼───────────┴──────────┐
            │                        │                      │
            ▼                        ▼                      ▼
┌───────────────────────┐ ┌────────────────────┐ ┌─────────────────────┐
│  Amazon SQS FIFO      │ │  AWS Lambda        │ │  Amazon S3          │
│  vibesift-scan-jobs   │ │  Python Inspector  │ │  Audit Reports      │
│  .fifo (+ DLQ)        │ │  (71 checks, zip)  │ │  (JSON, MD, PDF)    │
└───────────────────────┘ └────────────────────┘ └─────────────────────┘
```

---

## 3. Step-by-Step Production Deployment

### Step 1: AWS Systems Manager (SSM) Configuration
Create production configuration parameters under `/vibesift/prod/...` in `us-east-1`:

```bash
# S3 Reports Bucket
aws ssm put-parameter --name "/vibesift/prod/s3/reports-bucket" \
  --value "vibesift-audit-reports-dev-501380833083" --type "String" --overwrite

# SQS FIFO Queue URL
aws ssm put-parameter --name "/vibesift/prod/sqs/scan-queue-url" \
  --value "https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs.fifo" --type "String" --overwrite

# Cognito User Pool & Client IDs
aws ssm put-parameter --name "/vibesift/prod/cognito/user-pool-id" \
  --value "us-east-1_nW70Gohxd" --type "String" --overwrite

aws ssm put-parameter --name "/vibesift/prod/cognito/client-id" \
  --value "2o811dvh5f5n00r49540b9vav9" --type "String" --overwrite

# Server Port
aws ssm put-parameter --name "/vibesift/prod/server/port" \
  --value "4000" --type "String" --overwrite
```

### Step 2: Amazon SQS FIFO Queue Setup
Create the scan job queue and its Dead-Letter Queue (DLQ):

```bash
# 1. Create DLQ
aws sqs create-queue \
  --queue-name vibesift-scan-jobs-dlq.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true,MessageRetentionPeriod=1209600

# 2. Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs-dlq.fifo" \
  --attribute-names QueueArn --query "Attributes.QueueArn" --output text)

# 3. Create Main FIFO Queue with RedrivePolicy
aws sqs create-queue \
  --queue-name vibesift-scan-jobs.fifo \
  --attributes '{
    "FifoQueue": "true",
    "ContentBasedDeduplication": "false",
    "ReceiveMessageWaitTimeSeconds": "20",
    "VisibilityTimeout": "300",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
  }'
```

### Step 3: AWS Lambda Python Inspector Deployment
Package and deploy the unified Python Inspector (zero Docker required):

```bash
cd backend/src/workers/python-inspector
zip -r /tmp/lambda_inspector.zip . -x "*.pyc" "__pycache__/*" "test_*"

aws lambda update-function-code \
  --function-name vibesift-python-inspector-dev \
  --zip-file fileb:///tmp/lambda_inspector.zip
```

### Step 4: EC2 Production Host Setup
SSH into the EC2 instance (`54.144.160.191`):

```bash
ssh ubuntu@54.144.160.191
cd /var/www/vibesift

# Pull latest code
git pull origin main

# Install dependencies & build frontend
npm install
cd backend && npm install && cd ..
npm run build

# Start or restart PM2 processes with updated environment
pm2 restart vibesift-backend --update-env || pm2 start backend/src/api/server.js --name "vibesift-backend"
pm2 restart vibesift-sqs-worker --update-env || pm2 start backend/src/orchestration/sqsConsumer.js --name "vibesift-sqs-worker"

# Save PM2 process table to survive reboots
pm2 save
```

### Step 5: Verify Running Processes & Health
```bash
# Check PM2 process table
pm2 status

# Check SQS worker logs
pm2 logs vibesift-sqs-worker --lines 20

# Check backend API logs
pm2 logs vibesift-backend --lines 20

# Test backend health endpoint
curl http://127.0.0.1:4000/api/health
```

---

## 4. Cost Identification & Free Tier Optimization

| AWS Service | Production Sizing | Monthly Cost | Cost Optimization Strategy |
| :--- | :--- | :--- | :--- |
| **AWS EC2** | t2.micro (1 vCPU, 1GB RAM) | **$0.00** (Free Tier) | Lean single-host topology running Nginx, PM2 Express, and Headless Chromium directly. Zero NAT Gateways required. |
| **Amazon SQS FIFO** | 20s long-polling | **$0.00** (1M free requests/mo) | 20s long-polling reduces empty polling API calls by 95%+. |
| **AWS Lambda** | 512MB RAM, 60s timeout | **$0.00** (1M free requests/mo) | Ephemeral execution for Python inspector; 0 idle compute costs. |
| **Amazon S3** | Standard + SSE-KMS | **< $0.50 / mo** | Retains only JSON, MD reports, and raw audit dumps. Lifecycle rules expire raw dumps after 90 days. |
| **Amazon Cognito** | 50,000 MAUs free tier | **$0.00** | Free for developer user accounts. |
| **AWS SSM** | Standard Parameter Store | **$0.00** | Standard tier parameters are completely free. |
| **Amazon CloudWatch** | 10 custom metrics + alarms | **$0.00** (Free Tier) | Embedded Metric Format (EMF) eliminates extra agent licenses. |
| **Cloudflare** | Free Tier (Universal SSL + CDN) | **$0.00** | Edge TLS termination, Turnstile, and DDoS absorption at zero cost. |
| **Total Production Cost** | — | **~$0.00 – $1.00 / mo** | **Saves ~$150+/month** compared to ECS Fargate + NAT Gateway architectures. |

---

## 5. Required IAM Permissions for EC2 Instance Role

The EC2 instance requires an IAM instance profile with permissions to access SSM, S3, SQS, and Lambda:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMParameterAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:DescribeParameters"
      ],
      "Resource": "arn:aws:ssm:us-east-1:501380833083:parameter/vibesift/*"
    },
    {
      "Sid": "KMSDecryptAccess",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SQSFifoQueueAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:501380833083:vibesift-scan-jobs.fifo",
        "arn:aws:sqs:us-east-1:501380833083:vibesift-scan-jobs-dlq.fifo"
      ]
    },
    {
      "Sid": "S3ReportBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::vibesift-audit-reports-dev-501380833083",
        "arn:aws:s3:::vibesift-audit-reports-dev-501380833083/*"
      ]
    },
    {
      "Sid": "LambdaInspectorAccess",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:501380833083:function:vibesift-python-inspector-dev"
    }
  ]
}
```
