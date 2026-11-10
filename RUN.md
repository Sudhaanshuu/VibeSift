# Running & Operating VibeSift

### Quick Start (2 Commands)

```bash
# 1. Install all dependencies (root & backend)
npm run setup

# 2. Start everything (Frontend + Backend + Local SQLite DB)
npm run dev
```

---

### What Runs Automatically:

- **Frontend:** http://localhost:5173 (React 19 + Vite)
- **Backend API:** http://localhost:4000 (Express)
- **Database & Storage:** `.local_storage/vibesift.sqlite` (Built-in Node.js SQLite & local file storage — **zero cloud or external DB setup required**)
- **API Proxy:** Requests to `/api/*` on port 5173 are automatically proxied to port 4000.

---

### Optional Individual Commands:

- `npm run dev:frontend` — Run only the Vite frontend
- `npm run dev:backend` — Run only the Express backend
- `npm test` — Run frontend test suite
- `npm run test:backend` — Run backend test suite
- `npm run test:lambda` — Run Python Lambda audit test suite
- `npm run demo:lambda` — Trigger AWS Lambda Python Inspector locally
- `npm run demo:inspect` — Real-time inspection dashboard for Cognito, SQLite & S3

---

### 🖥️ How to View & Query the Production SQLite Database on EC2

The production database is located on the EC2 host at:
`/var/www/vibesift/.local_storage/vibesift.sqlite` (running in SQLite 3 WAL Mode).

#### Step 1: Connect via AWS Console (Zero SSH Keys Needed)
1. Open the [AWS EC2 Management Console](https://console.aws.amazon.com/ec2/).
2. Navigate to **Instances** and select `vibesift-core-host-prod` (`i-0657c75769eb55165`).
3. Click **Connect** (top right).
4. Select **Session Manager** (or **EC2 Instance Connect**) $\rightarrow$ Click **Connect**. A terminal shell opens in your browser.

*(CLI Alternative: `aws ssm start-session --target i-0657c75769eb55165`)*

#### Step 2: Open SQLite CLI
Inside the terminal shell:
```bash
sudo su - ubuntu
sqlite3 /var/www/vibesift/.local_storage/vibesift.sqlite
```

Configure formatted output inside the SQLite prompt (`sqlite>`):
```sql
.headers on
.mode column
```

#### Step 3: Common Queries

```sql
-- 1. List all tables
.tables

-- 2. Inspect table schemas
.schema scans
.schema sites
.schema findings

-- 3. View the latest completed audits
SELECT scanId, targetUrl, status, readinessScore, createdAt 
FROM scans 
ORDER BY createdAt DESC 
LIMIT 5;

-- 4. View registered websites and verification status
SELECT siteId, hostname, verified, createdAt 
FROM sites;

-- 5. View top critical & high severity findings
SELECT severity, category, title, affectedUrl 
FROM findings 
WHERE severity IN ('critical', 'high') 
LIMIT 10;

-- 6. Exit SQLite
.quit
```

#### Quick Bash One-Liner (Without Interactive Shell)
```bash
sqlite3 -header -column /var/www/vibesift/.local_storage/vibesift.sqlite \
  "SELECT scanId, targetUrl, status, createdAt FROM scans ORDER BY createdAt DESC LIMIT 5;"
```

> **Note on WAL Mode Files**:
> You will observe `vibesift.sqlite`, `vibesift.sqlite-wal`, and `vibesift.sqlite-shm`. This is normal for Write-Ahead Logging (WAL) mode—`sqlite3` automatically reads across both the database and the active WAL log seamlessly.

---

### 📖 Live Demo Guide & Architecture Walkthrough
- See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the complete system topology verified against `vibesift-architecture.png`.
- See **[docs/PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md](docs/PRODUCTION_ARCHITECTURE_AND_RUNBOOK.md)** for full operational runbooks, Cloudflare Turnstile, Razorpay, S3, and PM2 maintenance.
- See **[docs/AWS_STUDY_GUIDE.md](docs/AWS_STUDY_GUIDE.md)** for the deep AWS services study guide, component dictionary, and evaluator Q&A.
- See **[LAMBDA_IMPLEMENTATION.md](LAMBDA_IMPLEMENTATION.md)** for a complete step-by-step walkthrough covering Amazon Cognito user creation, AWS Lambda test events, SQLite real-time storage, and S3 artifact inspection.
- See **[ARCHITECTURE_DEEP_DIVE.md](ARCHITECTURE_DEEP_DIVE.md)** for architectural trade-offs and evaluator defense playbooks.
