# Amazon DynamoDB & Amazon S3 Storage Setup Guide

This guide details how to configure persistent data storage for VibeSift using Amazon DynamoDB on-demand tables and SSE-KMS encrypted Amazon S3 buckets.

---

## 1. Amazon DynamoDB Tables Architecture

VibeSift utilizes three DynamoDB tables with On-Demand (pay-per-request) billing mode to eliminate idle database costs:

```
VibeSift Storage Topology
├── VibeSift-SavedWebsites (Saved domains, verification status, and historical stats)
├── VibeSift-Scans         (Audit jobs, lifecycle status, readiness scores, and metrics)
└── VibeSift-Findings      (Individual technical observations, evidence, and remediation diffs)
```

---

## 2. Table Specifications & AWS CLI Commands

### Table 1: `VibeSift-SavedWebsites`
Stores saved user websites, domain verification challenges (DNS TXT, HTML `<meta>`, HTTP token), and aggregated site statistics.

- **Partition Key (PK)**: `id` (String) — e.g. `site_a1b2c3d4`
- **Global Secondary Index (GSI)**: `ownerUserId-index`
  - Partition Key: `ownerUserId` (String)
  - Projection: `ALL`

#### CLI Creation Command:
```bash
aws dynamodb create-table \
  --table-name VibeSift-SavedWebsites-dev \
  --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=ownerUserId,AttributeType=S \
  --key-schema \
      AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
      "[{\"IndexName\":\"ownerUserId-index\",\"KeySchema\":[{\"AttributeName\":\"ownerUserId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --region us-east-1
```

---

### Table 2: `VibeSift-Scans`
Tracks audit lifecycle transitions (`QUEUED` → `VALIDATING` → `RUNNING` → `NORMALIZING` → `COMPLETED` / `FAILED`), readiness scores, engine run metadata, and summary tallies.

- **Partition Key (PK)**: `scanId` (String) — e.g. `scn_7890abcdef123456`
- **Global Secondary Index 1 (GSI)**: `ownerUserId-createdAt-index`
  - Partition Key: `ownerUserId` (String)
  - Sort Key: `createdAt` (String, ISO 8601)
  - Projection: `ALL`
- **Global Secondary Index 2 (GSI)**: `idempotency-index`
  - Partition Key: `idempotencyKey` (String)
  - Projection: `INCLUDE` (`scanId`, `status`, `targetUrl`, `createdAt`)

#### CLI Creation Command:
```bash
aws dynamodb create-table \
  --table-name VibeSift-Scans-dev \
  --attribute-definitions \
      AttributeName=scanId,AttributeType=S \
      AttributeName=ownerUserId,AttributeType=S \
      AttributeName=createdAt,AttributeType=S \
      AttributeName=idempotencyKey,AttributeType=S \
  --key-schema \
      AttributeName=scanId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
      "[{\"IndexName\":\"ownerUserId-createdAt-index\",\"KeySchema\":[{\"AttributeName\":\"ownerUserId\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"idempotency-index\",\"KeySchema\":[{\"AttributeName\":\"idempotencyKey\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"INCLUDE\",\"NonKeyAttributes\":[\"scanId\",\"status\",\"targetUrl\",\"createdAt\"]}}]" \
  --region us-east-1
```

---

### Table 3: `VibeSift-Findings`
Stores individual normalized findings across all engines (TLS, headers, cookies, SEO, performance, accessibility, sensitive files).

- **Partition Key (PK)**: `id` (String) — e.g. `fnd_py_scn12345_1_a1b2`
- **Sort Key (SK)**: `scanId` (String)
- **Global Secondary Index (GSI)**: `scanId-index`
  - Partition Key: `scanId` (String)
  - Projection: `ALL`

#### CLI Creation Command:
```bash
aws dynamodb create-table \
  --table-name VibeSift-Findings-dev \
  --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=scanId,AttributeType=S \
  --key-schema \
      AttributeName=id,KeyType=HASH \
      AttributeName=scanId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
      "[{\"IndexName\":\"scanId-index\",\"KeySchema\":[{\"AttributeName\":\"scanId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --region us-east-1
```

---

## 3. Amazon S3 Storage Setup (`vibesift-audit-reports`)

Amazon S3 holds raw worker outputs (e.g., full Lighthouse JSON, Nuclei SARIF logs) and final generated audit markdown and JSON reports.

### Bucket Characteristics:
- **Block Public Access**: Fully enabled (`true`). All user downloads happen via short-lived presigned URLs (TTL: 900 seconds).
- **Server-Side Encryption**: SSE-KMS with an AWS managed key (`aws/s3`) or dedicated KMS Customer Managed Key.
- **Lifecycle Rule**: Raw scanner artifacts automatically expire after 90 days to minimize storage costs.

### Step 1: Create the S3 Bucket
Replace `123456789012` with your AWS Account ID to ensure a globally unique bucket name:
```bash
aws s3api create-bucket \
  --bucket vibesift-audit-reports-dev-123456789012 \
  --region us-east-1
```

### Step 2: Enable Default Encryption (KMS)
```bash
aws s3api put-bucket-encryption \
  --bucket vibesift-audit-reports-dev-123456789012 \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
```

### Step 3: Enforce Block Public Access
```bash
aws s3api put-public-access-block \
  --bucket vibesift-audit-reports-dev-123456789012 \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'
```

### Step 4: Configure CORS (for Frontend Presigned Download Access)
Create a `cors.json` file:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": [
        "https://vibesift.pixir.in",
        "http://localhost:5173",
        "http://localhost:4000"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```
Apply the CORS policy:
```bash
aws s3api put-bucket-cors \
  --bucket vibesift-audit-reports-dev-123456789012 \
  --cors-configuration file://cors.json
```

### Step 5: Configure Lifecycle Rule (90-Day Auto-Purge of Raw Logs)
Create a `lifecycle.json` file:
```json
{
  "Rules": [
    {
      "ID": "PurgeRawScanLogsAfter90Days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "scans/"
      },
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```
Apply the lifecycle policy:
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket vibesift-audit-reports-dev-123456789012 \
  --lifecycle-configuration file://lifecycle.json
```

---

## 4. Environment Variables Configuration

Add the created table names and bucket to `backend/.env`:

```ini
USE_LOCAL_STORAGE=false
DYNAMODB_SITES_TABLE=VibeSift-SavedWebsites-dev
DYNAMODB_SCANS_TABLE=VibeSift-Scans-dev
DYNAMODB_FINDINGS_TABLE=VibeSift-Findings-dev
S3_REPORTS_BUCKET=vibesift-audit-reports-dev-123456789012
PRESIGNED_URL_TTL=900
```

---

## Next Steps
Proceed to [04-STEP-FUNCTIONS-AND-SQS.md](./04-STEP-FUNCTIONS-AND-SQS.md) to set up the asynchronous job queues and orchestration workflow state machine.
