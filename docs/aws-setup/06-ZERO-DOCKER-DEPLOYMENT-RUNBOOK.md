# VibeSift 2.0: Master Zero-Docker Deployment Runbook

> **Target Architecture:** AWS Lightsail + SQLite + Cloudflare + CloudFront + SSM Parameter Store + Lambda  
> **Estimated Total AWS Cost:** **~$5.00 – $7.00 / month flat**  
> **Prerequisites:** Git repository access, AWS Account with Console Access, Cloudflare Account.

---

## 1. Quick-Start Architecture Map

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Cloudflare Edge │ ────► │ Amazon CloudFront│ ────► │  AWS Lightsail  │
│ (DNS, SSL, DDoS)│       │  (Global CDN)   │       │(Express+UI+Py+LH)│
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
                  ┌────────────────────────┬─────────────────┴────────┐
                  ▼                        ▼                          ▼
         ┌──────────────────┐    ┌──────────────────┐       ┌──────────────────┐
         │  Amazon Cognito  │    │SSM Parameter Store│      │    Amazon S3     │
         │ (Auth & Tokens)  │    │  (Free Config)   │       │(Reports/Artifacts)
         └──────────────────┘    └──────────────────┘       └──────────────────┘
```

---

## 2. Order of Operations

Follow these 6 steps in exact sequence:

1. **Parameters & Secrets:** Populate AWS SSM Parameter Store ([02-SSM-PARAMETER-STORE-SETUP.md](file:///c:/vibesift/docs/aws-setup/02-SSM-PARAMETER-STORE-SETUP.md)).
2. **Lightsail Instance:** Launch and configure the $5/mo Ubuntu host ([01-AWS-LIGHTSAIL-HOST-SETUP.md](file:///c:/vibesift/docs/aws-setup/01-AWS-LIGHTSAIL-HOST-SETUP.md)).
3. **Application Deployment:** Clone the code, install dependencies, enable SQLite WAL, and start PM2.
4. **Edge & CDN:** Route domain traffic via Cloudflare and CloudFront ([03-CLOUDFLARE-AND-CLOUDFRONT-SETUP.md](file:///c:/vibesift/docs/aws-setup/03-CLOUDFLARE-AND-CLOUDFRONT-SETUP.md)).
5. **Scheduled Automation:** Deploy the serverless Lambda cron trigger ([04-AWS-LAMBDA-AUTOMATION-SETUP.md](file:///c:/vibesift/docs/aws-setup/04-AWS-LAMBDA-AUTOMATION-SETUP.md)).
6. **Observability:** Set up CloudWatch CPU alarms ([05-CLOUDWATCH-MONITORING-SETUP.md](file:///c:/vibesift/docs/aws-setup/05-CLOUDWATCH-MONITORING-SETUP.md)).

---

## 3. Lightsail 5-Minute Terminal Script (Cut-and-Paste)

Once logged into your Ubuntu Lightsail server, run this complete setup block:

```bash
# 1. Update and base packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential sqlite3 nginx chromium-browser python3 python3-pip python3-venv

# 2. Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 3. Setup Project Directory
sudo mkdir -p /var/www/vibesift
sudo chown -R ubuntu:ubuntu /var/www/vibesift
git clone https://github.com/your-username/vibesift.git /var/www/vibesift
cd /var/www/vibesift

# 4. Backend Dependencies & Python Environment
cd /var/www/vibesift/backend
npm install --omit=dev
cd src/workers/python-inspector
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 5. Initialize SQLite Database with WAL Mode
mkdir -p /var/www/vibesift/backend/.local_storage
sqlite3 /var/www/vibesift/backend/.local_storage/vibesift.sqlite "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"

# 6. Build Frontend
cd /var/www/vibesift
npm install
npm run build

# 7. Start Backend with PM2
cd /var/www/vibesift/backend
pm2 start src/local-dev/server.js --name "vibesift-api"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## 4. Smoke Test Verification

Execute these verification checks from your local terminal:

```bash
# 1. Health Endpoint Check
curl -I https://vibesift.pixir.in/api/health
# Expected: HTTP/2 200 OK

# 2. Trigger a Test Baseline Scan
curl -X POST https://vibesift.pixir.in/api/scans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo_user_123" \
  -d '{"url": "https://example.com", "profile": "baseline_public"}'
# Expected: HTTP 201 Created with JSON {"scanId": "scn_...", "status": "QUEUED"}
```

---

## 5. Ongoing Maintenance & Zero-Downtime Updates

To update the server when code changes:
```bash
cd /var/www/vibesift
git pull origin main

# Rebuild frontend if UI changed
npm run build

# Reload backend with zero downtime
cd backend
npm install --omit=dev
pm2 reload vibesift-api
```
