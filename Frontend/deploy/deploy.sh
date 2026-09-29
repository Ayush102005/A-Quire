#!/usr/bin/env bash
# Frontend deploy — build, sync to S3, invalidate CloudFront.
#
# Requires: AWS CLI configured (`aws configure`) with permissions for
# s3:PutObject/DeleteObject on the bucket and cloudfront:CreateInvalidation
# on the distribution. Run from the Frontend/ directory.
#
# Usage:
#   AQUIRE_S3_BUCKET=your-bucket-name \
#   AQUIRE_CLOUDFRONT_DISTRIBUTION_ID=EXXXXXXXXXXXXX \
#   ./deploy/deploy.sh

set -euo pipefail

: "${AQUIRE_S3_BUCKET:?Set AQUIRE_S3_BUCKET to your S3 bucket name}"
: "${AQUIRE_CLOUDFRONT_DISTRIBUTION_ID:?Set AQUIRE_CLOUDFRONT_DISTRIBUTION_ID to your CloudFront distribution ID}"

echo "==> Building (picks up .env.production automatically — see its own header comment)"
npm run build

echo "==> Syncing dist/ to s3://$AQUIRE_S3_BUCKET"
# --delete removes files in the bucket that no longer exist in dist/ (stale
# hashed JS/CSS chunks from previous builds) — safe here since this bucket
# should contain nothing but this build's output.
#
# Cache headers: hashed assets (JS/CSS/fonts under /assets/) are safe to
# cache aggressively since a new build gets new hashes; index.html must
# NOT be cached long, or deployed updates won't reach users until their
# cached copy expires.
aws s3 sync dist/ "s3://$AQUIRE_S3_BUCKET" \
  --delete \
  --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable"

aws s3 cp dist/index.html "s3://$AQUIRE_S3_BUCKET/index.html" \
  --cache-control "no-cache, must-revalidate"

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation \
  --distribution-id "$AQUIRE_CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*"

echo "==> Done. Allow a few minutes for the CloudFront invalidation to propagate globally."
