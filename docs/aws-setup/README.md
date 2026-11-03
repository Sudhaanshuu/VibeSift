# VibeSift 2.0 AWS Setup & Deployment Guide

> **Architecture:** EC2 Native Node.js & SQS FIFO Architecture  
> **Production Domain:** `https://vibesift.pixir.in`  
> **Core Services:** AWS EC2 (Node.js 20/22) • Amazon SQS FIFO • SQLite (WAL Mode) • Amazon S3 • Amazon Cognito • AWS Lambda • Cloudflare  

---

## 📖 Master Deployment Guide

All setup and deployment instructions for VibeSift 2.0 have been consolidated into a single comprehensive, sequential document:

➡️ [**Master AWS Setup & Zero-Docker Deployment Guide**](../AWS_SETUP_AND_DEPLOYMENT_GUIDE.md)

### What the Master Guide Covers in Sequence:
1. **Architecture Blueprint:** Zero-Docker system topology and request flows.
2. **SSM Parameter Store:** 100% Free Tier secrets and configuration management (`/vibesift/prod/...`).
3. **AWS EC2 Host:** Ubuntu provisioning, Elastic IP, and security firewall rules.
4. **Amazon SQS FIFO:** Ordered scan job queue, deduplication, and dead-letter queue.
4. **Native Tooling:** Node 20 LTS, Python 3 virtual environment, native Chromium for Lighthouse, and SQLite WAL mode.
5. **Application Setup & PM2:** Repository setup, build scripts, and background process management.
6. **Nginx Reverse Proxy:** Serving Vite SPA `/dist` and proxying `/api/*` to Express.
7. **Cloudflare & CloudFront Edge:** Setting up `vibesift.pixir.in`, DNS, and free Full SSL/TLS.
8. **AWS Lambda Automation:** Free-tier serverless scheduled re-audits.
9. **Amazon CloudWatch:** Health and CPU alarm configuration with email alerts.
10. **Single 5-Minute Script:** Complete copy-paste terminal script for fresh host installations.
