# AWS Bedrock Foundation Model Access & Setup Guide

This guide details how to obtain model access in Amazon Bedrock, configure foundation models (Anthropic Claude 3 Haiku / Sonnet, Amazon Titan), set up cross-region inference profiles, configure IAM permissions, and verify AI explanations for VibeSift.

---

## 1. Overview of AI Models Used in VibeSift

VibeSift leverages foundation models hosted on **Amazon Bedrock** to provide:
1. **Developer-Friendly Finding Explanations**: Translating technical HTTP headers, TLS attributes, and DOM structures into clear 2-sentence developer explanations.
2. **Actionable Remediation Specs**: Providing exact code snippets and configuration blocks tailored to specific frameworks (Nginx, Apache, Cloudflare, Next.js).
3. **Executive Launch-Readiness Summaries**: Formulating 3-sentence executive launch postures based on total scores, critical vulnerability tallies, and priority risks.

### Recommended Model IDs:
| Model Provider | Model Name | Model ID / Inference Profile | Cost per 1M Tokens (Input/Output) | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Anthropic** | **Claude 3 Haiku** *(Default)* | `anthropic.claude-3-haiku-20240307-v1:0`<br>or `us.anthropic.claude-3-haiku-20240307-v1:0` | \$0.25 / \$1.25 | **Ultra-fast, lowest latency, cheapest, ideal for VibeSift audits** |
| **Anthropic** | **Claude 3.5 Sonnet** | `anthropic.claude-3-5-sonnet-20240620-v1:0`<br>or `us.anthropic.claude-3-5-sonnet-20240620-v1:0` | \$3.00 / \$15.00 | Deep architectural code remediation |
| **Amazon** | **Titan Text Express** | `amazon.titan-text-express-v1` | \$0.20 / \$0.60 | Budget alternative if Anthropic is restricted |
| **Amazon** | **Nova Micro** | `amazon.nova-micro-v1:0` | \$0.035 / \$0.14 | Ultra-budget high throughput summaries |

---

## 2. Step-by-Step: Requesting Model Access in AWS Bedrock

Before your AWS account can invoke Claude or other third-party models, you must explicitly enable **Model Access** in the AWS Console. This is a one-time request per AWS region.

### Step 1: Open the Bedrock Console
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top navigation bar, select your target deployment region (recommended: **us-east-1** (N. Virginia) or **us-west-2** (Oregon)).
3. Search for and select **Amazon Bedrock**.

### Step 2: Navigate to Model Access
1. In the left-hand navigation menu, scroll down to the **Bedrock configurations** section.
2. Click on **Model access**.
3. In the upper-right corner of the Model Access page, click **Modify model access** (or **Manage model access**).

### Step 3: Request Anthropic Claude Access
1. Locate the **Anthropic** section in the model provider list.
2. Check the box for:
   - ☑ **Claude 3 Haiku**
   - ☑ **Claude 3.5 Sonnet** (optional, for advanced explanations)
3. If this is your first time requesting Anthropic models:
   - AWS will prompt you with an Anthropic Use Case Questionnaire.
   - Fill in standard information:
     - **Company / Project Name**: `VibeSift Website Auditor`
     - **Company Website**: `https://vibesift.pixir.in` (or your personal domain/GitHub repo)
     - **Intended Industry**: `Technology / Web Development`
     - **Use Case**: `Internal web developer tool generating security and performance audit explanations and remediation diffs.`
4. Click **Next** / **Submit**.
5. Model status will transition from *Available to request* to **Access granted** (typically within 1 to 5 minutes for Claude 3 Haiku).

> [!NOTE]
> Amazon Titan models (`amazon.titan-text-express-v1`) do not require use-case questionnaires and are granted immediately upon selecting the checkbox.

---

## 3. Cross-Region Inference Profiles (Important for US Regions)

AWS Bedrock uses **Cross-Region Inference Profiles** for Anthropic Claude models to ensure high availability and prevent throttling.
When invoking Claude 3 Haiku in `us-east-1`, you can use either:
- Direct model ID: `anthropic.claude-3-haiku-20240307-v1:0`
- US Cross-Region Profile: `us.anthropic.claude-3-haiku-20240307-v1:0`

Both are supported by the VibeSift Bedrock explanation service.

---

## 4. IAM Permissions for Bedrock Invocation

The backend execution environment (Lambda function, ECS Task role, or local developer credentials) must have permission to invoke the foundation model.

Attach this policy statement to your backend IAM execution role or deployment user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowBedrockFoundationModelInvocation",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0",
        "arn:aws:bedrock:*::foundation-model/amazon.titan-text-express-v1",
        "arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-3-haiku-20240307-v1:0"
      ]
    }
  ]
}
```

---

## 5. Backend Configuration for Bedrock

Update your backend environment file (`backend/.env`):

```ini
# Amazon Bedrock AI Explanation Service
BEDROCK_ENABLED=true
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_MAX_TOKENS=1024
BEDROCK_TIMEOUT_MS=8000
```

> [!TIP]
> If `BEDROCK_ENABLED=false` or if network access to AWS Bedrock fails, VibeSift automatically engages its built-in **Deterministic Explanation Engine**. Scans will never fail even if AWS Bedrock is offline or rate-limited.

---

## 6. Verifying Bedrock Model Access via CLI and Node.js

### Quick Verification via AWS CLI:
Run this command from your terminal to verify model access:

```bash
aws bedrock-runtime invoke-model \
  --region us-east-1 \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body "{\"anthropic_version\":\"bedrock-2023-05-31\",\"max_tokens\":100,\"messages\":[{\"role\":\"user\",\"content\":\"Explain in 1 sentence why HSTS is critical for website security.\"}]}" \
  --cli-binary-format raw-in-base64-out \
  output.json && cat output.json
```

If configured correctly, `output.json` will contain a valid response from Claude 3 Haiku:
```json
{
  "id": "msg_01...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "HSTS (HTTP Strict Transport Security) is critical because it forces browsers to only connect via secure HTTPS, preventing SSL-stripping and man-in-the-middle attacks."
    }
  ]
}
```

---

## Next Steps
Proceed to [03-DYNAMODB-AND-S3-STORAGE.md](./03-DYNAMODB-AND-S3-STORAGE.md) to configure persistent DynamoDB tables and encrypted S3 artifact storage.
