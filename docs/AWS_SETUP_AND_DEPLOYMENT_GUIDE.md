# VibeSift 2.0: Complete AWS Setup & Zero-Docker Deployment Guide

> **Architecture:** Zero-Docker, Flat-Cost Cloud Architecture  
> **Production Domain:** `https://vibesift.pixir.in`  
> **Core Services:** AWS Lightsail • SQLite (WAL Mode) • Amazon S3 • Amazon Cognito • AWS Systems Manager (SSM) Parameter Store • AWS Lambda • Amazon CloudWatch • Cloudflare Edge  
> **Estimated AWS Infrastructure Cost:** **~$5.00 – $7.00 / month flat** (No hidden IOPS, NAT gateways, or container registry fees)

---

## 📋 Table of Contents

1. [Architecture Overview & Blueprint](#1-architecture-overview--blueprint)
2. [Order of Operations & Checklist](#2-order-of-operations--checklist)
3. [Section 1: AWS SSM Parameter Store Setup (Free Tier)](#3-section-1-aws-ssm-parameter-store-setup-free-tier)
4. [Section 2: AWS Lightsail Host Provisioning ($5/mo)](#4-section-2-aws-lightsail-host-provisioning-5mo)
5. [Section 3: Server Dependency Installation (Zero Docker)](#5-section-3-server-dependency-installation-zero-docker)
6. [Section 4: Application Deployment, SQLite & PM2 Setup](#6-section-4-application-deployment-sqlite--pm2-setup)
7. [Section 5: Nginx Reverse Proxy Configuration](#7-section-5-nginx-reverse-proxy-configuration)
8. [Section 6: Cloudflare DNS, Free SSL & CloudFront Edge](#8-section-6-cloudflare-dns-free-ssl--cloudfront-edge)
9. [Section 7: Serverless Scheduled Audits (AWS Lambda)](#9-section-7-serverless-scheduled-audits-aws-lambda)
10. [Section 8: Amazon CloudWatch Observability & Alarms](#10-section-8-amazon-cloudwatch-observability--alarms)
11. [Section 9: Complete 5-Minute Host Setup Script](#11-section-9-complete-5-minute-host-setup-script)
12. [Section 10: Health Verification & Smoke Tests](#12-section-10-health-verification--smoke-tests)

---

## 1. Architecture Overview & Blueprint

VibeSift 2.0 uses a lean, production-grade architecture that completely avoids bulky Docker orchestration (ECS Fargate, Docker-in-Docker, multi-gigabyte container registries) by running native Linux processes on a single dedicated AWS Lightsail instance:

```
┌─────────────────────────────────────────────────────────────┐
│                       End User Browser                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (TLS 1.3)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Cloudflare Edge (vibesift.pixir.in)             │
│   • Free Universal SSL/TLS      • Fast Global DNS            │
│   • Layer 7 DDoS Protection     • Cloudflare Bot Management  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Proxied HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Amazon CloudFront (Optional CDN)            │
│   • Edge Caching for Static JS/CSS Bundles & Public Reports │
└──────────────────────────────┬──────────────────────────────┘
                               │ Origin HTTP/HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          AWS Lightsail Production Host ($5/mo Ubuntu)        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Nginx Web Server / Reverse Proxy                    │   │
│   │   • Serves React 19 SPA static assets (/dist)       │   │
│   │   • Proxies /api/* to Express backend on port 4000  │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              ▼                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Node.js 20 Backend (PM2 Process Manager)            │   │
│   │   • Express API & Orchestrator                      │   │
│   │   • Spawns Python & Chromium audits asynchronously  │   │
│   └───────────────┬─────────────────────────┬───────────┘   │
│                   │                         │               │
│                   ▼                         ▼               │
│   ┌─────────────────────────────┐  ┌────────────────────┐   │
│   │ Python 3 HTTP Inspector     │  │ Headless Chromium  │   │
│   │  (24-Check Quality & DPDP)  │  │ (Lighthouse CWV)   │   │
│   └─────────────────────────────┘  └────────────────────┘   │
│                   │                                         │
│                   ▼                                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ SQLite 3 Database (WAL Mode)                        │   │
│   │  • High-throughput embedded ACID storage            │   │
│   │  • Zero latency, zero external network calls        │   │
│   └─────────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────┬──────┘
                        │                              │
         Config & Auth  ▼                              ▼  Artifacts
┌───────────────────────────────┐              ┌───────────────────────────────┐
│      Amazon Cognito Auth      │              │       Amazon S3 Storage       │
│  User Pool: us-east-1_nW70Goh │              │ vibesift-audit-reports-dev-   │
│  Client ID: 2jg3m4brvt5adfa59 │              │ 501380833083                  │
└───────────────────────────────┘              └───────────────────────────────┘
```

---

## 2. Order of Operations & Checklist

| Step | Component | Action | Verification |
| :---: | :--- | :--- | :--- |
| **1** | **SSM Parameter Store** | Store configuration values and secrets in AWS Systems Manager. | `aws ssm get-parameters-by-path --path "/vibesift/prod"` |
| **2** | **AWS Lightsail** | Launch $5/mo Ubuntu 24.04 instance, assign Static IP, set firewall rules. | Static IP responds to ping/SSH |
| **3** | **Native Tools** | Install Node.js 20 LTS, Python 3 + venv, Chromium, Nginx, PM2. | `node -v`, `python3 --version`, `chromium-browser --version` |
| **4** | **VibeSift App** | Clone repo, install dependencies, build frontend, start PM2. | `pm2 status` shows `vibesift-backend` online |
| **5** | **Nginx** | Configure reverse proxy for `/` (Vite dist) and `/api` (port 4000). | `curl http://localhost/api/health` returns `healthy` |
| **6** | **DNS & SSL** | Point `vibesift.pixir.in` A-record to Static IP via Cloudflare with Full SSL. | Browser opens `https://vibesift.pixir.in` |
| **7** | **AWS Lambda** | Deploy serverless scheduled audit trigger function. | Test invocation returns HTTP 200 |
| **8** | **CloudWatch** | Add CPU and instance status check alarms in Lightsail console. | Alarms active with email notification |

---

## 3. Section 1: AWS SSM Parameter Store Setup (Free Tier)

AWS Systems Manager Parameter Store replaces AWS Secrets Manager ($0.40/secret/month) and KMS customer keys ($1.00/key/month) at **$0.00/month**.

### Parameter Hierarchy

All production parameters live under `/vibesift/prod/`:

| Parameter Name | Tier | Type | Value |
| :--- | :--- | :--- | :--- |
| `/vibesift/prod/cognito/user-pool-id` | Standard | String | `us-east-1_nW70Gohxd` |
| `/vibesift/prod/cognito/client-id` | Standard | String | `2jg3m4brvt5adfa59vhl2ds0qs` |
| `/vibesift/prod/s3/reports-bucket` | Standard | String | `vibesift-audit-reports-dev-501380833083` |
| `/vibesift/prod/server/port` | Standard | String | `4000` |
| `/vibesift/prod/security/jwt-secret` | Standard | **SecureString** | *(Your secure random token)* |

### AWS CLI Creation Commands

Run these commands on your local machine or terminal with AWS credentials configured:

```bash
# 1. Cognito User Pool ID
aws ssm put-parameter \
  --name "/vibesift/prod/cognito/user-pool-id" \
  --type "String" \
  --value "us-east-1_nW70Gohxd" \
  --overwrite

# 2. Cognito App Client ID
aws ssm put-parameter \
  --name "/vibesift/prod/cognito/client-id" \
  --type "String" \
  --value "2jg3m4brvt5adfa59vhl2ds0qs" \
  --overwrite

# 3. Amazon S3 Reports Bucket
aws ssm put-parameter \
  --name "/vibesift/prod/s3/reports-bucket" \
  --type "String" \
  --value "vibesift-audit-reports-dev-501380833083" \
  --overwrite

# 4. Express Server Port
aws ssm put-parameter \
  --name "/vibesift/prod/server/port" \
  --type "String" \
  --value "4000" \
  --overwrite

# 5. Security Token (SecureString)
aws ssm put-parameter \
  --name "/vibesift/prod/security/jwt-secret" \
  --type "SecureString" \
  --value "$(openssl rand -hex 32)" \
  --overwrite
```

---

## 4. Section 2: AWS Lightsail Host Provisioning ($5/mo)

### Step 4.1: Launch the Instance
1. Open the [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click **Create instance**.
3. **Region:** `us-east-1 (N. Virginia)`.
4. **Platform:** Linux/Unix $\rightarrow$ **OS Only** $\rightarrow$ **Ubuntu 24.04 LTS** (or 22.04 LTS).
5. **Plan:** **$5 USD/month** (2 GB RAM, 1 vCPU, 40 GB SSD, 2 TB data transfer).
6. **Instance Name:** `vibesift-core-host-prod`.
7. Click **Create instance**.

### Step 4.2: Attach a Static IP (Free)
1. Go to the **Networking** tab in the Lightsail Console.
2. Click **Create static IP**.
3. Select `vibesift-core-host-prod` to attach it to.
4. Name: `vibesift-static-ip`.
5. Click **Create**. Note down the Public Static IP address (e.g. `54.x.x.x`).

### Step 4.3: Firewall Rules
In instance **Networking** $\rightarrow$ **IPv4 Firewall**, open only:
- **SSH (Port 22):** TCP
- **HTTP (Port 80):** TCP (Cloudflare / Public)
- **HTTPS (Port 443):** TCP (Cloudflare / Public)

---

## 5. Section 3: Server Dependency Installation (Zero Docker)

Connect to your Lightsail host via SSH:
```bash
ssh -i /path/to/LightsailKey.pem ubuntu@<STATIC_IP>
```

Run package installations:

```bash
# Update Ubuntu package lists
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential sqlite3 software-properties-common nginx

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Install Python 3, pip, and venv
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Install native Chromium (for headless Lighthouse audits)
sudo apt install -y chromium-browser

# Verify installations
node -v              # v20.x.x
python3 --version    # Python 3.12.x
chromium-browser --version
pm2 -v
```

---

## 6. Section 4: Application Deployment, SQLite & PM2 Setup

### Step 6.1: Clone and Install
```bash
# Create directory and clone repository
sudo mkdir -p /var/www/vibesift
sudo chown -R ubuntu:ubuntu /var/www/vibesift
git clone https://github.com/Sudhaanshuu/vibesift.git /var/www/vibesift
cd /var/www/vibesift

# Install frontend and backend packages
npm install
npm --prefix backend install

# Set up Python virtual environment
python3 -m venv backend/src/workers/python-inspector/venv
backend/src/workers/python-inspector/venv/bin/pip install --upgrade pip
backend/src/workers/python-inspector/venv/bin/pip install requests beautifulsoup4 urllib3
```

### Step 6.2: Configure Environment (`backend/.env`)
Create `/var/www/vibesift/backend/.env`:

```ini
NODE_ENV=production
PORT=4000
AWS_REGION=us-east-1

# Embedded High-Performance Storage
USE_LOCAL_STORAGE=true
USE_MOCK_ORCHESTRATION=true
SQLITE_DB_PATH=/var/www/vibesift/.local_storage/vibesift.sqlite

# Amazon S3 Bucket
S3_REPORTS_BUCKET=vibesift-audit-reports-dev-501380833083

# Amazon Cognito
COGNITO_USER_POOL_ID=us-east-1_nW70Gohxd
COGNITO_CLIENT_ID=2jg3m4brvt5adfa59vhl2ds0qs
COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_nW70Gohxd
ALLOW_DEMO_AUTH=false

# Scanner Safeguards
SCAN_MAX_PAGES=5
SCAN_REQUEST_TIMEOUT_MS=6000
SCAN_JOB_TIMEOUT_SECONDS=60
SCAN_RPS=2.0
USER_HOURLY_SCAN_QUOTA=30
USER_MINUTE_SCAN_QUOTA=10
```

### Step 6.3: Optimize SQLite for High Concurrency (WAL Mode)
```bash
mkdir -p /var/www/vibesift/.local_storage
sqlite3 /var/www/vibesift/.local_storage/vibesift.sqlite "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;"
```

### Step 6.4: Build Frontend Assets
```bash
cd /var/www/vibesift
npm run build
# Output generated in /var/www/vibesift/dist
```

### Step 6.5: Start Process with PM2
Create `/var/www/vibesift/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'vibesift-backend',
      script: 'src/local-dev/server.js',
      cwd: '/var/www/vibesift/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
```

Start and persist across reboots:
```bash
pm2 start /var/www/vibesift/ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## 7. Section 5: Nginx Reverse Proxy Configuration

Configure Nginx to serve the Vite production SPA build for web traffic and proxy all `/api/*` calls to the Node.js backend.

Create `/etc/nginx/sites-available/vibesift`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name vibesift.pixir.in;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Frontend Single-Page Application (Vite Build)
    root /var/www/vibesift/dist;
    index index.html;

    # API Proxy to Express Backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    # Static Assets Caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA Client-Side Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/vibesift /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 8. Section 6: Cloudflare DNS, Free SSL & CloudFront Edge

### Cloudflare Setup
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) $\rightarrow$ select domain `pixir.in`.
2. **DNS Records:**
   - **Type:** `A`
   - **Name:** `vibesift`
   - **IPv4 Address:** `<YOUR_LIGHTSAIL_STATIC_IP>`
   - **Proxy Status:** **Proxied (Orange Cloud)**
   - **TTL:** Auto
3. **SSL/TLS Settings:**
   - Go to **SSL/TLS** $\rightarrow$ **Overview** $\rightarrow$ set encryption mode to **Full**.
   - Go to **SSL/TLS** $\rightarrow$ **Edge Certificates** $\rightarrow$ turn **Always Use HTTPS** `ON`.
   - Minimum TLS Version: `TLS 1.2` or `TLS 1.3`.

---

## 9. Section 7: Serverless Scheduled Audits (AWS Lambda)

To schedule recurring automated scans without placing heavy cron timers on the Lightsail server, deploy an AWS Lambda function triggered by Amazon EventBridge (100% Free Tier).

### Lambda Function Code (`index.mjs`)

```javascript
/**
 * VibeSift Scheduled Audit & Webhook Trigger
 */
export const handler = async (event) => {
  const API_URL = process.env.VIBESIFT_API_URL || 'https://vibesift.pixir.in/api';
  const CRON_SECRET = process.env.CRON_TRIGGER_SECRET || 'vbs_cron_secret_prod';
  
  console.log(`[LambdaTrigger] Starting scheduled audit trigger to ${API_URL}...`);

  try {
    const response = await fetch(`${API_URL}/scans/scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
        'User-Agent': 'VibeSift-Lambda-Scheduler/2.0',
      },
      body: JSON.stringify({
        source: 'aws.eventbridge.scheduled',
        timestamp: new Date().toISOString(),
      }),
    });

    const body = await response.json().catch(() => ({}));
    return {
      statusCode: response.status,
      body: JSON.stringify({ success: response.ok, data: body }),
    };
  } catch (err) {
    console.error('[LambdaTrigger] Scheduled trigger failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

---

## 10. Section 8: Amazon CloudWatch Observability & Alarms

### Step 10.1: Built-in Lightsail Host Alarms (Zero Config)
1. Open [AWS Lightsail Console](https://lightsail.aws.amazon.com/) $\rightarrow$ click `vibesift-core-host-prod` $\rightarrow$ **Metrics**.
2. Next to **CPU utilization**, click **+ Add alarm**:
   - Greater than **85%** for **10 minutes**.
   - Add your notification email.
3. Next to **Status check failed (Instance)**, click **+ Add alarm**:
   - Greater than or equal to **1**.
   - Add your notification email.

---

## 11. Section 9: Complete 5-Minute Host Setup Script

For fresh Ubuntu host installations, run this entire script block in one step:

```bash
#!/usr/bin/env bash
set -e

echo "=== VibeSift 2.0 Host Installation Starting ==="

# 1. Base packages & updates
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential sqlite3 nginx chromium-browser python3 python3-pip python3-venv

# 2. Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Clone Repository
sudo mkdir -p /var/www/vibesift
sudo chown -R ubuntu:ubuntu /var/www/vibesift
git clone https://github.com/Sudhaanshuu/vibesift.git /var/www/vibesift
cd /var/www/vibesift

# 4. Dependencies
npm install
npm --prefix backend install

# 5. Python virtual environment
python3 -m venv backend/src/workers/python-inspector/venv
backend/src/workers/python-inspector/venv/bin/pip install --upgrade pip
backend/src/workers/python-inspector/venv/bin/pip install requests beautifulsoup4 urllib3

# 6. SQLite WAL Mode
mkdir -p /var/www/vibesift/.local_storage
sqlite3 /var/www/vibesift/.local_storage/vibesift.sqlite "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;"

# 7. Build Frontend
npm run build

# 8. Start PM2 Backend Process
pm2 start /var/www/vibesift/ecosystem.config.cjs || pm2 start backend/src/local-dev/server.js --name vibesift-backend
pm2 save

echo "=== VibeSift 2.0 Host Setup Complete! ==="
```

---

## 12. Section 10: Health Verification & Smoke Tests

Run these tests on the Lightsail host to verify all layers are operating:

```bash
# 1. Verify Backend API Health
curl -s http://localhost:4000/api/health | grep '"status":"healthy"'

# 2. Verify Nginx Reverse Proxy
curl -s http://localhost/api/health | grep '"status":"healthy"'

# 3. Test Live Python Inspector
python3 backend/src/workers/python-inspector/test_inspector.py

# 4. Verify Frontend Static Assets
curl -I http://localhost/index.html | grep '200 OK'

# 5. Check PM2 Process Health
pm2 status
```

When all commands return clean success codes, the entire zero-Docker stack is fully online and accessible at `https://vibesift.pixir.in`.
