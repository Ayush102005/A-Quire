# A-Quire AWS Deployment Runbook (Zero Custom Domain Required)

This guide takes you through deploying **A-Quire** on AWS without requiring a registered custom domain:
- **Backend API & WebSockets**: AWS EC2 + Docker Compose + Caddy with automatic Let's Encrypt TLS via `sslip.io`.
- **Frontend SPA**: AWS S3 + CloudFront with built-in CloudFront SSL (`*.cloudfront.net`).

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │    User Browser / Student App          │
                      └──────────────┬──────────────────┬──────┘
                                     │                  │
                HTTPS: 443           │                  │ HTTPS: 443
         (CloudFront SSL)            │                  │ (Caddy + sslip.io SSL)
                                     ▼                  ▼
                    ┌─────────────────────────┐   ┌───────────────────────────┐
                    │ AWS CloudFront CDN      │   │ AWS EC2 Instance          │
                    │ (*.cloudfront.net)      │   │ (Caddy Reverse Proxy)     │
                    └────────────┬────────────┘   └─────────────┬─────────────┘
                                 │                              │
                                 ▼                              ▼
                    ┌─────────────────────────┐   ┌───────────────────────────┐
                    │ Private AWS S3 Bucket   │   │ FastAPI (Docker: 8000)    │
                    │ (Static React Assets)   │   ├─────────────┼─────────────┤
                    └─────────────────────────┘   │ Postgres 16 │ Redis 7     │
                                                  ├─────────────┴─────────────┤
                                                  │ Celery Async Workers      │
                                                  └───────────────────────────┘
```

---

## Phase 1: Deploy Backend on AWS EC2

### 1. Launch EC2 Instance (AWS Console)
1. Go to **AWS Console** -> **EC2** -> **Launch Instance**.
2. **Name**: `aquire-backend`
3. **OS Image**: **Ubuntu Server 24.04 LTS** (or Amazon Linux 2023).
4. **Instance Type**: `t3.small` (2 vCPU, 2 GB RAM minimum for PostgreSQL + Redis + FastAPI + Celery).
5. **Key Pair**: Select an existing key pair or create a new one (`.pem`) and download it.
6. **Network Settings (Security Group)**:
   - Allow **SSH (Port 22)**: *My IP* (or Anywhere if using EC2 Instance Connect).
   - Allow **HTTP (Port 80)**: *Anywhere (0.0.0.0/0)* (Required by Caddy for SSL challenge).
   - Allow **HTTPS (Port 443)**: *Anywhere (0.0.0.0/0)*.
7. **Storage**: 20–30 GB gp3.
8. Click **Launch Instance**.
9. Once running, copy your instance's **Public IPv4 Address** (e.g. `54.210.12.34`).

---

### 2. Connect to the EC2 Instance
Open PowerShell / Terminal on your computer:
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```
*(Or use the orange **Connect** button in the AWS EC2 Console -> **EC2 Instance Connect** directly in your browser).*

---

### 3. Install Docker & Docker Compose on EC2
Run these commands inside the EC2 terminal:
```bash
# Update packages
sudo apt-get update && sudo apt-get install -y git curl

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Apply group changes without logging out
newgrp docker

# Verify Docker Compose is available
docker compose version
```

---

### 4. Clone Repository & Setup Environment
```bash
# Clone the repository
git clone https://github.com/Ayush102005/A-Quire.git aquire
cd aquire/Backend

# Copy production environment template
cp .env.production .env
```

Now, calculate your **sslip.io domain** from your EC2 Public IP:
- If your EC2 IP is `54.210.12.34`, replace dots with hyphens: `54-210-12-34.sslip.io`.
- `sslip.io` is a free DNS resolver: `54-210-12-34.sslip.io` resolves directly to `54.210.12.34`. Caddy will obtain a genuine Let's Encrypt TLS certificate for it automatically!

Edit `.env` using nano:
```bash
nano .env
```
Update these specific lines:
```ini
# Set DOMAIN to your sslip.io address
DOMAIN="54-210-12-34.sslip.io"

# For now, allow all origins during initial boot (will lock to CloudFront URL in Phase 3)
ALLOWED_ORIGINS="https://54-210-12-34.sslip.io,*"
FRONTEND_URL="https://54-210-12-34.sslip.io"
```
*(Press `Ctrl+O`, `Enter` to save, `Ctrl+X` to exit).*

---

### 5. Transfer `firebase-credentials.json`
Upload your `firebase-credentials.json` to the EC2 instance:
- **Option A (Copy-Paste)**:
  ```bash
  nano firebase-credentials.json
  # Paste contents of firebase-credentials.json, then save and exit
  ```
- **Option B (via SCP from local machine)**:
  ```bash
  scp -i your-key.pem Backend/firebase-credentials.json ubuntu@YOUR_EC2_IP:~/aquire/Backend/
  ```

Secure permissions:
```bash
chmod 600 .env firebase-credentials.json
```

---

### 6. Build and Start the Stack
```bash
docker compose up -d --build
```
Check container logs:
```bash
docker compose logs -f caddy
```
You will see Caddy automatically complete the ACME HTTP challenge and obtain an SSL certificate for `54-210-12-34.sslip.io`!

---

### 7. Bootstrap Database (Idempotent Seed)
Run once to create the system admin account, institutions, and core assessment topics:
```bash
docker compose exec backend python scripts/seed_production.py
```
Default admin credentials:
- **Email**: `admin@aquire.io`
- **Password**: `AquireAdmin2026!`

---

### 8. Verify Backend Health
In your web browser, navigate to:
```
https://54-210-12-34.sslip.io/api/v1/health
```
and
```
https://54-210-12-34.sslip.io/docs
```
You should see a secure green padlock with valid HTTPS and the interactive FastAPI documentation!

---

## Phase 2: Deploy Frontend on AWS S3 + CloudFront

### 1. Build Frontend Locally with Your Backend URL
On your local computer in `d:/A-Quire/Frontend`:
1. Edit [Frontend/.env.production](file:///d:/A-Quire/Frontend/.env.production):
   ```ini
   VITE_API_URL=https://54-210-12-34.sslip.io/api/v1
   ```
2. Build the production bundle:
   ```bash
   npm run build
   ```
   This generates the optimized build inside `Frontend/dist/`.

---

### 2. Create S3 Bucket (AWS Console)
1. Go to **AWS Console** -> **S3** -> **Create bucket**.
2. **Bucket name**: e.g. `aquire-frontend-prod-1020` (must be globally unique).
3. **Region**: `us-east-1` (recommended).
4. **Block Public Access**: Keep **"Block all public access" ENABLED (Checked)**. CloudFront will access the bucket securely through Origin Access Control (OAC).
5. Click **Create bucket**.

---

### 3. Create CloudFront Distribution (AWS Console)
1. Go to **CloudFront** -> **Create distribution**.
2. **Origin domain**: Select your S3 bucket from the dropdown (e.g. `aquire-frontend-prod-1020.s3.us-east-1.amazonaws.com`).
3. **Origin access**: Select **Origin access control settings (recommended)** -> Click **Create new OAC** -> Click **Create**.
4. **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
5. **Allowed HTTP methods**: `GET, HEAD`.
6. **Web Application Firewall (WAF)**: Select *Do not enable security protections* (to avoid charges during setup).
7. **Default root object**: Enter `index.html`.
8. Click **Create distribution**.

---

### 4. Configure SPA Error Pages in CloudFront (Crucial for React Router)
Without this, reloading on `/dashboard` or `/lesson/1` causes 403 Access Denied errors from S3:
1. In your CloudFront distribution -> Go to the **Error pages** tab -> Click **Create custom error response**.
   - **HTTP error code**: `403: Forbidden`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP response code**: `200: OK`
   - Click **Create custom error response**.
2. Repeat for `404: Not Found`:
   - **HTTP error code**: `404: Not Found`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP response code**: `200: OK`
   - Click **Create custom error response**.

---

### 5. Attach S3 Bucket Policy
1. In CloudFront, a banner at the top will prompt you: *"You must update the S3 bucket policy"*. Click **Copy policy**.
2. Go to **S3** -> Your bucket -> **Permissions** tab -> **Bucket policy** -> Click **Edit**.
3. Paste the copied policy and click **Save changes**.

---

### 6. Upload `dist/` to S3
1. In your S3 bucket, go to the **Objects** tab -> Click **Upload**.
2. Drag and drop all files and folders inside `Frontend/dist/` (i.e. `index.html`, `favicon.ico`, and the `assets/` folder).
3. Click **Upload**.

---

### 7. Copy Your CloudFront Domain
Go to your CloudFront distribution overview and copy your **Distribution domain name**:
```
https://d123456abcdef.cloudfront.net
```
Visit this URL in your browser — your frontend is now live globally!

---

## Phase 3: Final Security Lockdown & Firebase Setup

### 1. Update Backend CORS to Match CloudFront
On the EC2 instance, edit `aquire/Backend/.env`:
```ini
ALLOWED_ORIGINS="https://d123456abcdef.cloudfront.net"
FRONTEND_URL="https://d123456abcdef.cloudfront.net"
```
Restart the backend to apply:
```bash
docker compose restart backend
```

### 2. Authorize Domain in Firebase
1. Open **Firebase Console** -> Your Project -> **Authentication**.
2. Go to the **Settings** tab -> **Authorized domains**.
3. Click **Add domain** and add your CloudFront domain:
   ```
   d123456abcdef.cloudfront.net
   ```
   and your EC2 sslip domain:
   ```
   54-210-12-34.sslip.io
   ```
4. Click **Save**.

---

## Useful Maintenance Commands

```bash
# View backend logs in real time
docker compose logs -f backend

# View Celery worker logs
docker compose logs -f celery_worker

# View Caddy reverse proxy / SSL logs
docker compose logs -f caddy

# Restart entire stack
docker compose down && docker compose up -d

# Run database migrations manually
docker compose exec backend alembic upgrade head
```
