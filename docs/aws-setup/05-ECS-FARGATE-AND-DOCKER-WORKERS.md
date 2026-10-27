# ECS Fargate & Docker Workers Setup Guide

This guide details how to build, test, and push container images for the four VibeSift inspection engines to Amazon Elastic Container Registry (ECR) and run them inside isolated Amazon ECS Fargate tasks.

---

## 1. Engine Containers & Responsibilities

| Engine | Directory | Base Image | Inspection Capabilities | Execution Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Python Inspector** | `backend/src/workers/python-inspector` | `python:3.11-slim` | TLS/SSL certs, security headers, cookie flags, HTML SEO tags, robots/sitemaps, broken link crawling, sensitive files | Baseline Public & Authorized Deep |
| **Lighthouse Worker** | `backend/src/workers/lighthouse` | `node:22-bullseye` + Chromium | Core Web Vitals (LCP, CLS, FID), performance budgets, accessibility score, best practices | Baseline Public & Authorized Deep |
| **OWASP ZAP Worker** | `backend/src/workers/zap` | `zaproxy/zap-stable` | Passive and baseline web application security scanning | **Authorized Deep Only** (Domain verification required) |
| **Nuclei Worker** | `backend/src/workers/nuclei` | `projectdiscovery/nuclei:v3` | Fast, non-destructive vulnerability template checks | **Authorized Deep Only** (Domain verification required) |

---

## 2. Amazon ECR Repositories Setup

Create four ECR repositories with image scanning on push enabled:

```bash
REGIONS="us-east-1"
WORKERS=("python-inspector" "lighthouse" "owasp-zap" "nuclei")

for WORKER in "${WORKERS[@]}"; do
  aws ecr create-repository \
    --repository-name "vibesift/${WORKER}-dev" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --region $REGIONS
done
```

---

## 3. Authenticate Docker to Amazon ECR

Retrieve your 12-digit AWS Account ID and authenticate your local Docker daemon:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_REGION="us-east-1"

aws ecr get-login-password --region $AWS_REGION | docker login \
  --username AWS \
  --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

---

## 4. Build, Tag, and Push Container Images

### 1. Python Inspector:
```bash
docker build -t vibesift/python-inspector:latest backend/src/workers/python-inspector

docker tag vibesift/python-inspector:latest \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/python-inspector-dev:latest

docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/python-inspector-dev:latest
```

### 2. Lighthouse Worker:
```bash
docker build -t vibesift/lighthouse:latest backend/src/workers/lighthouse

docker tag vibesift/lighthouse:latest \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/lighthouse-dev:latest

docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/lighthouse-dev:latest
```

### 3. OWASP ZAP Worker:
```bash
docker build -t vibesift/owasp-zap:latest backend/src/workers/zap

docker tag vibesift/owasp-zap:latest \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/owasp-zap-dev:latest

docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/owasp-zap-dev:latest
```

### 4. Nuclei Worker:
```bash
docker build -t vibesift/nuclei:latest backend/src/workers/nuclei

docker tag vibesift/nuclei:latest \
  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/nuclei-dev:latest

docker push ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/vibesift/nuclei-dev:latest
```

---

## 5. ECS Fargate Cluster & Network Isolation

The compute stack (`infra/lib/compute-stack.ts`) creates an isolated ECS Cluster with security groups configured to prevent Server-Side Request Forgery (SSRF):

### SSRF Network Defense Rules in ECS:
1. **No Ingress**: Scanner tasks accept zero incoming network connections.
2. **Egress Guard**: Egress traffic to `169.254.169.254/32` (AWS Instance Metadata Service) is blocked at the subnet route table and Security Group level.
3. **Private Subnets**: Containers execute in private subnets and route outbound internet traffic exclusively via a NAT Gateway with DNS filtering.

---

## Next Steps
Proceed to [06-COGNITO-AUTH-AND-API-GATEWAY.md](./06-COGNITO-AUTH-AND-API-GATEWAY.md) to set up user authentication, JWT verification, and API Gateway.
