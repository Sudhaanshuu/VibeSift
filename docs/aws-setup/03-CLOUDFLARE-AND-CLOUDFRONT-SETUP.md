# Service Setup Guide: Cloudflare & Amazon CloudFront

> **Role in VibeSift 2.0:** Global Edge CDN, Free Automatic SSL, & DDoS Shield  
> **Domain:** `vibesift.pixir.in`  
> **Cost:** **$0.00 / month (Cloudflare Free Tier + CloudFront 1 TB Free Tier)**

---

## 1. Architectural Roles

```
[ User Browser ]
       │ HTTPS
       ▼
[ Cloudflare Edge ] ────► DNS, Edge SSL/TLS, DDoS & Bot Mitigation
       │ Proxied HTTPS
       ▼
[ Amazon CloudFront ] ──► AWS Global CDN Edge Caching & Asset Compression
       │ HTTPS Origin
       ▼
[ AWS Lightsail Host ] ──► Express API + React SPA
```

- **Cloudflare:** Manages the public DNS for `pixir.in`, provides instant free SSL/TLS, and absorbs layer 7 DDoS traffic.
- **Amazon CloudFront:** AWS's native content delivery network caching static JS/CSS bundles and downloadable audit reports closer to global developers.

---

## 2. Step 1: Cloudflare Configuration (`vibesift.pixir.in`)

### Step 2.1: DNS Records in Cloudflare
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select your zone `pixir.in` $\rightarrow$ **DNS** $\rightarrow$ **Records**.
3. Add a CNAME or A record pointing to your Lightsail Static IP or CloudFront domain:
   - **Type:** `A` (or `CNAME` if pointing to CloudFront `d1234.cloudfront.net`)
   - **Name:** `vibesift`
   - **IPv4 Address:** `<YOUR_LIGHTSAIL_STATIC_IP>` (e.g., `54.x.x.x`)
   - **Proxy Status:** **Proxied (Orange Cloud)** (Crucial for DDoS protection and Cloudflare SSL)
   - **TTL:** Auto
4. Click **Save**.

### Step 2.2: SSL/TLS Encryption Mode
1. In Cloudflare, navigate to **SSL/TLS** $\rightarrow$ **Overview**.
2. Select **Full (strict)** or **Full**:
   - **Full:** Encrypts traffic end-to-end from browser to Cloudflare, and Cloudflare to your Lightsail server.
3. In **SSL/TLS** $\rightarrow$ **Edge Certificates**:
   - Enable **Always Use HTTPS**: `ON`
   - Minimum TLS Version: `TLS 1.2` or `TLS 1.3`
   - Opportunistic Encryption: `ON`

### Step 2.3: Security & DDoS Shield
1. Navigate to **Security** $\rightarrow$ **Settings**:
   - Security Level: **Medium**
   - Challenge Passage: **30 minutes**
2. Enable **Bot Fight Mode**: `ON` (Blocks basic automated scanners and scrapers).

---

## 3. Step 2: Amazon CloudFront Distribution Setup (Optional Acceleration)

To route through Amazon CloudFront inside AWS:

### Step 3.1: Create Distribution
1. Open the [Amazon CloudFront Console](https://console.aws.amazon.com/cloudfront/).
2. Click **Create distribution**.
3. **Origin Domain:** Enter your Lightsail static IP public DNS or hostname (e.g. `54-x-x-x.compute-1.amazonaws.com` or your Lightsail domain).
4. **Protocol:** `HTTP` or `HTTPS only` (Port 80/443).
5. **Default Cache Behavior:**
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Allowed HTTP methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
   - Cache policy: **CachingOptimized** (for static assets) or **CachingDisabled** for `/api/*`
6. **Web Application Firewall (WAF):** Do not enable AWS WAF (Cloudflare already provides this for free).
7. Click **Create distribution**.

### Step 3.2: Cache Behaviors for API vs Frontend
In the created distribution under **Behaviors**, configure 2 paths:
- Path `default (*)`: Cache policy **CachingOptimized** (caches React HTML/JS/CSS).
- Path `/api/*`: Cache policy **CachingDisabled**, Origin request policy **AllViewerExceptHostHeader** (forwards all API requests directly to Lightsail with zero caching).

---

## 4. Verification

Test the entire edge pipeline from your local terminal:
```bash
# Verify DNS resolution points to Cloudflare
nslookup vibesift.pixir.in

# Verify HTTP to HTTPS redirect & TLS 1.3 handshake
curl -I https://vibesift.pixir.in/health
```

Expected HTTP Response:
```http
HTTP/2 200
date: ...
content-type: application/json; charset=utf-8
server: cloudflare
cf-ray: ...
```
