# VibeSift 2.0 AWS Setup & Deployment Guide Series

> **Architecture:** Zero-Docker, High-Efficiency Cloud Architecture  
> **Core Services:** AWS Lightsail • SQLite • Amazon S3 • Amazon Cognito • AWS SSM Parameter Store • AWS Lambda • Amazon CloudWatch • Cloudflare  
> **Monthly Cost:** **~$5.00 – $7.00 flat**

---

## 📚 Guide Index (VibeSift 2.0)

| Guide | Document | Service Focus & Summary |
| :---: | :--- | :--- |
| **01** | [**01-AWS-LIGHTSAIL-HOST-SETUP.md**](./01-AWS-LIGHTSAIL-HOST-SETUP.md) | **AWS Lightsail Host ($5/mo):** Ubuntu setup, Node 20 LTS, Python 3 virtualenv, native Chromium (for Lighthouse), Nginx reverse proxy, PM2 process manager, and SQLite WAL mode. |
| **02** | [**02-SSM-PARAMETER-STORE-SETUP.md**](./02-SSM-PARAMETER-STORE-SETUP.md) | **AWS Systems Manager Parameter Store:** Free tier encrypted config and secrets storage (replaces Secrets Manager & KMS). Console & CLI setup. |
| **03** | [**03-CLOUDFLARE-AND-CLOUDFRONT-SETUP.md**](./03-CLOUDFLARE-AND-CLOUDFRONT-SETUP.md) | **Cloudflare & CloudFront Edge:** Setting up `vibesift.pixir.in` DNS, Full SSL/TLS, DDoS & Bot Shield, and AWS CloudFront edge caching. |
| **04** | [**04-AWS-LAMBDA-AUTOMATION-SETUP.md**](./04-AWS-LAMBDA-AUTOMATION-SETUP.md) | **AWS Lambda & EventBridge:** Fresh serverless function for scheduled website re-audits and webhook automation ($0/mo free tier). |
| **05** | [**05-CLOUDWATCH-MONITORING-SETUP.md**](./05-CLOUDWATCH-MONITORING-SETUP.md) | **Amazon CloudWatch:** Setting up host metrics, CPU/health alarms, email notifications, and optional log group streaming. |
| **06** | [**06-ZERO-DOCKER-DEPLOYMENT-RUNBOOK.md**](./06-ZERO-DOCKER-DEPLOYMENT-RUNBOOK.md) | **Master Deployment Runbook:** End-to-end cut-and-paste 5-minute setup script, smoke tests, and zero-downtime update procedures. |

---

## 🛡️ Existing Configured Services (Pre-configured)
- **Amazon Cognito:** User Pool `us-east-1_nW70Gohxd` (already configured and handling auth tokens).
- **Amazon S3:** Bucket `vibesift-audit-reports-dev-501380833083` (stores finalized JSON/Markdown audit reports with default SSE-S3 encryption).
