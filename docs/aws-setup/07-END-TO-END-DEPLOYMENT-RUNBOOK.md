# VibeSift End-to-End Production Deployment Runbook

This runbook provides the definitive checklist for deploying VibeSift to AWS from scratch using AWS CDK v2, configuring live Bedrock explanations, setting up persistent DynamoDB/S3 storage, and deploying the frontend to S3/CloudFront.

---

## 1. Pre-Flight Checklist

Before deploying, ensure you have:
- [x] AWS CLI v2 installed and configured (`aws configure`)
- [x] Node.js 20+ and npm 10+ installed
- [x] Docker daemon running locally
- [x] AWS Bedrock Claude 3 Haiku access granted ([Guide 02](./02-BEDROCK-MODEL-ACCESS-AND-SETUP.md))
- [x] AWS CDK bootstrapped in your target region (`cdk bootstrap aws://<ACCOUNT_ID>/<REGION>`)

---

## 2. Infrastructure Deployment via AWS CDK

### Step 1: Synthesize CDK CloudFormation Stacks
```bash
cd infra
npm install
npm run build
npm run synth
```

Verify that all 5 stacks synthesize cleanly:
- `VibeSift-Data-dev` (DynamoDB tables & S3 bucket)
- `VibeSift-Compute-dev` (VPC, ECS Cluster, ECR repos)
- `VibeSift-Orchestration-dev` (SQS & Step Functions)
- `VibeSift-Api-dev` (Cognito & API Gateway)
- `VibeSift-Monitoring-dev` (CloudWatch dashboards & Budget alarms)

### Step 2: Deploy All Infrastructure
```bash
cdk deploy --all --context stage=dev --require-approval never
```

CDK will output key infrastructure values upon completion:
```text
Outputs:
VibeSift-Api-dev.HttpApiUrl = https://abc123xyz.execute-api.us-east-1.amazonaws.com
VibeSift-Api-dev.UserPoolId = us-east-1_example123
VibeSift-Api-dev.UserPoolClientId = 4abc123def456
VibeSift-Data-dev.ReportsBucketName = vibesift-audit-reports-dev-123456789012
VibeSift-Orchestration-dev.ScanQueueUrl = https://sqs.us-east-1.amazonaws.com/123456789012/vibesift-scan-jobs-dev
VibeSift-Orchestration-dev.ScanStateMachineArn = arn:aws:states:us-east-1:123456789012:stateMachine:VibeSift-AuditWorkflow-dev
```

---

## 3. Build & Push Scanner Containers to ECR

Follow the instructions in [Guide 05](./05-ECS-FARGATE-AND-DOCKER-WORKERS.md) to build and push the 4 worker container images:
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
REGION="us-east-1"

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# Build and push Python Inspector
docker build -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/python-inspector-dev:latest ../backend/src/workers/python-inspector
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/python-inspector-dev:latest

# Build and push Lighthouse
docker build -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/lighthouse-dev:latest ../backend/src/workers/lighthouse
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/lighthouse-dev:latest

# Build and push OWASP ZAP
docker build -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/owasp-zap-dev:latest ../backend/src/workers/zap
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/owasp-zap-dev:latest

# Build and push Nuclei
docker build -t ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/nuclei-dev:latest ../backend/src/workers/nuclei
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/vibesift/nuclei-dev:latest
```

---

## 4. Frontend Production Build & CloudFront Deployment

### Step 1: Update Frontend `.env`
Update `.env` with live production endpoints:
```ini
VITE_API_BASE_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_example123
VITE_COGNITO_CLIENT_ID=4abc123def456
VITE_AWS_REGION=us-east-1
VITE_USE_MOCK_API=false
VITE_APP_NAME="VibeSift"
VITE_APP_SUBTITLE="by Pixir"
```

### Step 2: Build Optimized SPA
```bash
npm run build
```
Optimized assets are written to `dist/`.

### Step 3: Deploy to S3 + CloudFront (or Vercel / AWS Amplify)
```bash
# Sync static assets to hosting bucket
aws s3 sync dist/ s3://vibesift-web-hosting-bucket/ --delete

# Invalidate CloudFront cache for instant update
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

---

## 5. Post-Deployment Verification & Smoke Tests

1. **Health Check**:
   ```bash
   curl -I https://abc123xyz.execute-api.us-east-1.amazonaws.com/health
   # Expected: HTTP 200 OK
   ```

2. **Trigger Test Audit**:
   - Log in to your frontend application.
   - Navigate to `/app/scans/new`.
   - Audit a public URL (e.g., `https://example.com`).
   - Confirm status transitions: `QUEUED` → `VALIDATING` → `RUNNING` → `NORMALIZING` → `COMPLETED`.
   - Verify that Launch Readiness Score, Bedrock explanations, and evidence snippets populate correctly.
   - Click **Export as PDF** to download the complete audit report document.

---

## 6. Disaster Recovery & Teardown

To tear down all resources and stop ongoing AWS billing:
```bash
cd infra
cdk destroy --all --context stage=dev
```
*(S3 buckets with retention policies and DynamoDB deletion protection must have their policies cleared before destruction).*
