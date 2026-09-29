# Frontend setup — S3 + CloudFront

Run these yourself via the AWS CLI (`aws configure` first) or console — I
don't have AWS credentials, so nothing here executes automatically.

## 1. ACM certificate — MUST be in us-east-1, regardless of your other AWS region

CloudFront only accepts certificates from `us-east-1`. Request one for
`app.yourdomain.com`, then validate it (DNS validation is simplest — ACM
gives you a CNAME record to add at your DNS provider).

```bash
aws acm request-certificate \
  --domain-name app.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

Wait for it to reach `ISSUED` status (`aws acm describe-certificate ...`)
before continuing — CloudFront won't accept a pending cert.

## 2. S3 bucket — private, no public access, no static website hosting mode

```bash
aws s3api create-bucket --bucket REPLACE_BUCKET_NAME --region us-east-1
aws s3api put-public-access-block --bucket REPLACE_BUCKET_NAME \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

Deliberately NOT using S3's "static website hosting" mode (that serves over
plain HTTP with no useful access control) — CloudFront reads the bucket as
a private origin via Origin Access Control (OAC) instead, so the bucket
itself stays fully blocked from direct public access. All real traffic
goes through CloudFront.

## 3. CloudFront distribution — OAC, HTTPS-only, SPA-friendly error pages

Create the distribution via the console (Origins → S3 bucket → "Origin
access control settings (recommended)" → create a new OAC) — this is the
one step genuinely easier through the console than raw CLI, since OAC
creation + attaching it to a distribution + the resulting bucket policy is
several linked API calls. When creating it, set:

- **Origin**: the S3 bucket, with the OAC you just created
- **Viewer protocol policy**: Redirect HTTP to HTTPS
- **Alternate domain name (CNAME)**: `app.yourdomain.com`
- **Custom SSL certificate**: the ACM cert from step 1
- **Default root object**: `index.html`
- **Custom error responses** (this is the part that's easy to miss and
  breaks deep-linked routes on refresh): add two —
  - HTTP 403 → Response page path `/index.html`, HTTP response code `200`
  - HTTP 404 → Response page path `/index.html`, HTTP response code `200`

  Without these, a hard refresh on e.g. `/dashboard` 403s/404s directly
  from S3 instead of loading the React app and letting React Router
  handle that path client-side.

After creating it, copy the distribution's ARN and ID, and your AWS
account ID, into `s3-bucket-policy.json` (the three `REPLACE_*`
placeholders), then apply it:

```bash
aws s3api put-bucket-policy \
  --bucket REPLACE_BUCKET_NAME \
  --policy file://deploy/s3-bucket-policy.json
```

## 4. DNS

CNAME/ALIAS `app.yourdomain.com` → the CloudFront distribution's domain
name (`dXXXXXXXXXXXXX.cloudfront.net`) — if your DNS provider is Route 53,
use an ALIAS record pointed at the distribution instead of a plain CNAME
(works at the zone apex too, and CloudFront charges nothing extra for the
Route 53 alias lookup).

## 5. Deploy

```bash
cd Frontend
AQUIRE_S3_BUCKET=REPLACE_BUCKET_NAME \
AQUIRE_CLOUDFRONT_DISTRIBUTION_ID=REPLACE_DISTRIBUTION_ID \
./deploy/deploy.sh
```

See `deploy.sh` for what it does — builds (picking up `.env.production`
automatically, per Vite's mode default), syncs to S3 with cache headers
appropriate for each file type, then invalidates the CloudFront cache so
the new build is actually served instead of a cached old one.
