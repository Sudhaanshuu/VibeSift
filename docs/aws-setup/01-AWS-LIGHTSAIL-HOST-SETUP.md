# Service Setup Guide: AWS Lightsail Host (Zero-Docker Full Stack)

> **Role in VibeSift 2.0:** Central Host & Execution Engine  
> **Host OS:** Ubuntu 24.04 LTS (or 22.04 LTS)  
> **Instance Plan:** $5.00/month (2 GB RAM, 1 vCPU, 40 GB SSD, 2 TB Transfer)  
> **Region:** `us-east-1` (N. Virginia)

---

## 1. Why AWS Lightsail?
- **Zero Docker required:** Runs Node.js, Python 3, Google Chromium, and SQLite natively on the Linux kernel.
- **Fixed Predictable Cost:** Exactly $5.00/month flat (no hidden EBS IOPS fees, no Elastic IP fees, no NAT Gateway bills).
- **Adequate RAM:** 2 GB RAM provides sufficient buffer for Headless Chromium (Lighthouse) and concurrent Python audits.

---

## 2. Step-by-Step AWS Console Provisioning

### Step 2.1: Create Instance
1. Open the [AWS Lightsail Console](https://lightsail.aws.amazon.com/).
2. Click **Create instance**.
3. Select your location: **us-east-1 (N. Virginia)** (Zone A or B).
4. Select platform: **Linux/Unix**.
5. Select a blueprint: **OS Only** $\rightarrow$ **Ubuntu 24.04 LTS** (or 22.04 LTS).
6. Choose your instance plan: **$5 USD/month (2 GB RAM, 1 vCPU, 40 GB SSD, 2 TB transfer)**.
7. Identify your instance: Name it `vibesift-core-host-prod`.
8. Click **Create instance**.

### Step 2.2: Attach a Static IP (Free)
1. In the Lightsail dashboard, navigate to the **Networking** tab.
2. Click **Create static IP**.
3. Attach it to your instance: `vibesift-core-host-prod`.
4. Name it `vibesift-static-ip`.
5. Click **Create**. Note down this Public Static IPv4 address (e.g. `54.x.x.x`).

### Step 2.3: Configure Firewall Ports
1. Click on your `vibesift-core-host-prod` instance $\rightarrow$ **Networking** tab.
2. Under **IPv4 Firewall**, ensure only these rules are active:
   - **SSH:** Port `22` (Restrict to your IP if desired)
   - **HTTP:** Port `80` (Open to Cloudflare / CloudFront)
   - **HTTPS:** Port `443` (Open to Cloudflare / CloudFront)
3. Under **IPv6**, leave disabled or active according to your network preference.

---

## 3. Server Initialization & Dependency Installation

Connect to your instance via the browser **SSH** button in the Lightsail Console, or use your local terminal:
```bash
ssh -i /path/to/LightsailDefaultKey-us-east-1.pem ubuntu@<STATIC_IP>
```

Run the following initialization commands:

### Step 3.1: System Update
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common
```

### Step 3.2: Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should display v20.x.x
npm -v
```

### Step 3.3: Install Python 3, pip, and venv
```bash
sudo apt install -y python3 python3-pip python3-venv python3-dev
python3 --version
```

### Step 3.4: Install Google Chromium (for Lighthouse)
```bash
sudo apt install -y chromium-browser
chromium-browser --version
```
*Note: Installing Chromium natively completely eliminates the need for bulky Docker containers for Lighthouse.*

### Step 3.5: Install PM2 & Nginx
```bash
sudo npm install -g pm2
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 4. Deploying VibeSift Application

### Step 4.1: Clone Repository
```bash
sudo mkdir -p /var/www/vibesift
sudo chown -R ubuntu:ubuntu /var/www/vibesift
cd /var/www/vibesift
git clone https://github.com/your-org/vibesift.git .
```

### Step 4.2: Setup Backend & Python Virtualenv
```bash
# Setup Node.js backend
cd /var/www/vibesift/backend
npm install --omit=dev

# Setup Python virtualenv for the VibeCode Inspector
cd /var/www/vibesift/backend/src/workers/python-inspector
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python test_inspector.py # Verify SSRF Guard & tests pass
deactivate
```

### Step 4.3: Build Frontend SPA
```bash
cd /var/www/vibesift
npm install
npm run build # Generates production static assets in /var/www/vibesift/dist
```

### Step 4.4: Configure SQLite WAL Mode
SQLite handles high-throughput concurrency effortlessly when Write-Ahead Logging (WAL) is enabled:
```bash
mkdir -p /var/www/vibesift/backend/.local_storage
sqlite3 /var/www/vibesift/backend/.local_storage/vibesift.sqlite "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;"
```

---

## 5. Nginx Reverse Proxy Configuration

Create the Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/vibesift
```

Paste the following configuration:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name vibesift.pixir.in _;

    # Maximum request body size for scan uploads
    client_max_body_size 10M;

    # 1. Frontend SPA Static Files
    location / {
        root /var/www/vibesift/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # 2. API Backend Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://127.0.0.1:4000/api/health;
        access_log off;
    }
}
```

Enable the configuration and reload Nginx:
```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/vibesift /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. PM2 Process Management (Auto-Restart on Reboot)

Start the VibeSift API process under PM2:
```bash
cd /var/www/vibesift/backend
pm2 start src/local-dev/server.js --name "vibesift-api" -i 1 --time
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Useful PM2 Commands:
- `pm2 status`: View CPU & RAM usage.
- `pm2 logs vibesift-api`: Stream live logs.
- `pm2 restart vibesift-api`: Zero-downtime reload.
