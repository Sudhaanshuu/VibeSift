# Service Setup Guide: AWS Systems Manager (SSM) Parameter Store

> **Role in VibeSift 2.0:** Secure Central Configuration & API Key Vault  
> **Cost:** **$0.00 / month (100% Free Tier)**  
> **Replaces:** AWS Secrets Manager ($0.40/secret/mo) & AWS KMS Customer Managed Keys ($1.00/key/mo)

---

## 1. Why SSM Parameter Store?
- **Zero Cost:** Standard parameters (both plaintext and `SecureString`) are completely free for up to 10,000 parameters.
- **Enterprise Security:** Uses AWS-managed default KMS encryption (`alias/aws/ssm`) at rest with zero extra configuration.
- **Console-Level Visibility:** All configuration keys are organized in a clean hierarchical namespace (`/vibesift/prod/...`).

---

## 2. Parameter Namespace Structure

We organize all VibeSift parameters under a clean hierarchy:
```
/vibesift/prod/
  ├── cognito/
  │    ├── user-pool-id
  │    └── client-id
  ├── s3/
  │    └── reports-bucket
  ├── security/
  │    └── turnstile-secret-key   (SecureString)
  └── server/
       └── port
```

---

## 3. Step-by-Step Parameter Creation

You can create parameters either via the **AWS Management Console** or the **AWS CLI**.

### Option A: Via AWS Console
1. Open the [AWS Systems Manager Console](https://console.aws.amazon.com/systems-manager/).
2. In the left navigation pane under **Application Management**, select **Parameter Store**.
3. Click **Create parameter**.
4. Create each parameter with the following specifications:

| Parameter Name | Tier | Type | Value |
| :--- | :--- | :--- | :--- |
| `/vibesift/prod/cognito/user-pool-id` | Standard | String | `us-east-1_nW70Gohxd` |
| `/vibesift/prod/cognito/client-id` | Standard | String | `2jg3m4brvt5adfa59vhl2ds0qs` |
| `/vibesift/prod/s3/reports-bucket` | Standard | String | `vibesift-audit-reports-dev-501380833083` |
| `/vibesift/prod/server/port` | Standard | String | `4000` |
| `/vibesift/prod/security/jwt-secret` | Standard | **SecureString** | *(Your secure random token)* |

5. Click **Create parameter**.

### Option B: Via AWS CLI (One-Liner Execution)
Run these commands in your terminal or on your Lightsail host:

```bash
# 1. Cognito User Pool ID
aws ssm put-parameter \
  --name "/vibesift/prod/cognito/user-pool-id" \
  --value "us-east-1_nW70Gohxd" \
  --type "String" \
  --region us-east-1 \
  --overwrite

# 2. Cognito Client ID
aws ssm put-parameter \
  --name "/vibesift/prod/cognito/client-id" \
  --value "2jg3m4brvt5adfa59vhl2ds0qs" \
  --type "String" \
  --region us-east-1 \
  --overwrite

# 3. S3 Reports Bucket
aws ssm put-parameter \
  --name "/vibesift/prod/s3/reports-bucket" \
  --value "vibesift-audit-reports-dev-501380833083" \
  --type "String" \
  --region us-east-1 \
  --overwrite

# 4. Optional Turnstile or Custom API Secret (Encrypted)
aws ssm put-parameter \
  --name "/vibesift/prod/security/turnstile-secret-key" \
  --value "0x4AAAAAA..." \
  --type "SecureString" \
  --region us-east-1 \
  --overwrite
```

---

## 4. Granting Lightsail IAM Permissions to Read Parameters

For Lightsail to read parameters without hardcoding AWS access keys on the disk:

### Step 4.1: Create IAM Policy
1. Open [IAM Console $\rightarrow$ Policies $\rightarrow$ Create policy](https://console.aws.amazon.com/iam/).
2. Select **JSON** tab and paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowReadVibeSiftParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/vibesift/prod/*"
    },
    {
      "Sid": "AllowS3ReportUploads",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::vibesift-audit-reports-dev-501380833083/*"
    }
  ]
}
```
3. Name it: `VibeSift-Lightsail-AccessPolicy`.

### Step 4.2: Attach to Lightsail
Configure an AWS CLI profile or IAM role credentials on your Lightsail host using `aws configure`.

---

## 5. How the Node.js API Loads Parameters on Startup

In your Node.js application, parameters can be loaded seamlessly at startup:

```javascript
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

export async function loadConfigFromSSM() {
  if (process.env.NODE_ENV !== 'production') return;

  const client = new SSMClient({ region: 'us-east-1' });
  const command = new GetParametersByPathCommand({
    Path: '/vibesift/prod/',
    Recursive: true,
    WithDecryption: true,
  });

  const response = await client.send(command);
  for (const param of response.Parameters || []) {
    const key = param.Name.replace('/vibesift/prod/', '').replace(/\//g, '_').toUpperCase();
    process.env[key] = param.Value;
  }
  console.log('[SSM] Successfully loaded encrypted parameters from AWS Parameter Store');
}
```
