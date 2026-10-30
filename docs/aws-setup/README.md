# VibeSift 2.0 AWS Setup & Deployment Guide

> **Architecture:** Zero-Docker, Flat-Cost Cloud Architecture  
> **Production Domain:** `https://vibesift.pixir.in`  
> **Core Services:** AWS Lightsail • SQLite (WAL Mode) • Amazon S3 • Amazon Cognito • AWS SSM Parameter Store • AWS Lambda • Amazon CloudWatch • Cloudflare  
> **Estimated Cost:** **~$5.00 – $7.00 / month flat**

---

## 📖 Master Deployment Guide

All setup and deployment instructions for VibeSift 2.0 have been consolidated into a single comprehensive, sequential document:

➡️ [**Master AWS Setup & Zero-Docker Deployment Guide**](../AWS_SETUP_AND_DEPLOYMENT_GUIDE.md)

### What the Master Guide Covers in Sequence:
1. **Architecture Blueprint:** Zero-Docker system topology and request flows.
2. **SSM Parameter Store:** 100% Free Tier secrets and configuration management (`/vibesift/prod/...`).
3. **AWS Lightsail Host ($5/mo):** Ubuntu 24.04 provisioning, static IP, and security firewall rules.
4. **Native Tooling:** Node 20 LTS, Python 3 virtual environment, native Chromium for Lighthouse, and SQLite WAL mode.
5. **Application Setup & PM2:** Repository setup, build scripts, and background process management.
6. **Nginx Reverse Proxy:** Serving Vite SPA `/dist` and proxying `/api/*` to Express.
7. **Cloudflare & CloudFront Edge:** Setting up `vibesift.pixir.in`, DNS, and free Full SSL/TLS.
8. **AWS Lambda Automation:** Free-tier serverless scheduled re-audits.
9. **Amazon CloudWatch:** Health and CPU alarm configuration with email alerts.
10. **Single 5-Minute Script:** Complete copy-paste terminal script for fresh host installations.
