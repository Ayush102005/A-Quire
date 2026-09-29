# EC2 setup — backend (docker-compose + Caddy)

Run these yourself via the AWS CLI (`aws configure` first) or translate to
console clicks — I don't have AWS credentials, so nothing here executes
automatically. Review before running; this creates billable resources.

## 1. Security group — 80/443 open, SSH restricted to you

```bash
aws ec2 create-security-group \
  --group-name aquire-backend-sg \
  --description "A-Quire backend: HTTP/HTTPS public, SSH restricted"

SG_ID=$(aws ec2 describe-security-groups \
  --group-names aquire-backend-sg \
  --query 'SecurityGroups[0].GroupId' --output text)

# HTTP/HTTPS — Caddy needs 80 for the Let's Encrypt challenge, 443 for real traffic
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# SSH — replace with YOUR actual IP, never 0.0.0.0/0 (an open SSH port is a
# constant scan/brute-force target). Find yours: curl -s https://checkip.amazonaws.com
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr YOUR_IP/32

# Deliberately NOT opening 8000 (backend), 5432 (Postgres), or 6379 (Redis) —
# docker-compose.yml doesn't publish those to the host at all; only Caddy
# (80/443) and SSH need to be reachable from outside this instance.
```

## 2. Launch the instance — no IAM role, IMDSv2 enforced

This is the actual security-relevant part (see the "EC2 instance metadata
credential theft" finding from the security review): the code judge
(`app/api/v1/problems.py`) runs student-submitted code with network access
still intact — the tradeoff is documented in that file. On a real EC2
instance, that network access can reach `http://169.254.169.254` (the
instance metadata service). If an IAM role is attached, ANY process on the
box — including a student's submitted code — can steal that role's
temporary AWS credentials from there. Two independent mitigations below;
do both.

```bash
aws ec2 run-instances \
  --image-id ami-XXXXXXXX \
  --instance-type t3.small \
  --key-name YOUR_KEY_PAIR \
  --security-group-ids $SG_ID \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=aquire-backend}]'
  # No --iam-instance-profile — nothing on this stack calls AWS APIs via an
  # instance role today (Polly/Anthropic use static keys in .env). Attach
  # one later ONLY if something genuinely needs it, and re-verify this
  # threat model if you do.
```

`--image-id`: pick a current Amazon Linux 2023 or Ubuntu 22.04/24.04 AMI
for your region (`aws ec2 describe-images` or the console's AMI catalog —
the exact ID changes per region/release, deliberately not hardcoded here).

If the instance already exists and you need to retrofit IMDSv2 onto it:

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-XXXXXXXXXXXXXXXXX \
  --http-tokens required \
  --http-endpoint enabled
```

## 3. On the instance — install Docker, deploy

```bash
# Amazon Linux 2023:
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out/in once for this to take effect
# Docker Compose v2 ships as a plugin on recent Docker packages; if
# `docker compose version` fails, install the plugin per Docker's own docs
# for your distro.

git clone <your-repo-url> aquire
cd aquire/Backend

# Fill in the real domain (replace yourdomain.com everywhere — this file,
# .env.production, and Caddyfile all need to agree) and any remaining
# TODOs in .env.production, then:
cp .env.production .env
chmod 600 .env firebase-credentials.json   # readable only by the user running docker compose

docker compose up -d --build
docker compose logs -f caddy   # watch for the Let's Encrypt cert to issue successfully
```

## 4. Point DNS at this instance BEFORE step 3's `docker compose up`

An A record for `api.yourdomain.com` → this instance's public IP.
Caddy's automatic HTTPS needs that to already resolve when it starts, or
the Let's Encrypt HTTP-01 challenge fails (it'll retry/log, not crash —
but nothing will actually serve over HTTPS until DNS is live and it
succeeds).
