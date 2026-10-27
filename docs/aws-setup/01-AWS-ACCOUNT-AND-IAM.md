# AWS Account & IAM Configuration Guide

This guide walks you through setting up an AWS account, creating a dedicated IAM administrator/deployment user, configuring credentials locally, and bootstrapping the AWS Cloud Development Kit (CDK) for VibeSift.

---

## 1. Prerequisites

- An active **AWS Account** ([aws.amazon.com](https://aws.amazon.com)).
- **AWS CLI v2** installed on your workstation:
  - Windows: `msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi`
  - macOS: `brew install awscli`
  - Linux: `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install`
- **Node.js 20+** and **npm 10+**.

---

## 2. Create IAM Administrator Deployment User

For security best practices, never deploy infrastructure using your root AWS account. Create a dedicated IAM user:

### Step-by-Step in AWS Console:
1. Open the [IAM Console](https://console.aws.amazon.com/iam/).
2. In the left navigation pane, select **Users** > **Create user**.
3. Set **User name**: `vibesift-deployer`.
4. Leave *Provide user access to the AWS Management Console* **unchecked** (programmatic CLI access only). Click **Next**.
5. Select **Attach policies directly**.
6. Attach the following managed policies:
   - `AdministratorAccess` (recommended for initial CDK infrastructure provisioning)
   *(Or create a scoped deployment policy using the permissions listed in section 4 below)*.
7. Click **Next** > **Create user**.

### Step 3: Generate Access Keys
1. In the **Users** list, click on `vibesift-deployer`.
2. Navigate to the **Security credentials** tab.
3. Scroll to **Access keys** and click **Create access key**.
4. Select **Command Line Interface (CLI)**, check the confirmation box, and click **Next**.
5. Set an optional description tag: `VibeSift Local & CI/CD Deployment`.
6. Click **Create access key**.
7. **Important:** Copy the **Access Key ID** and **Secret Access Key** or download the `.csv` file. You will not be able to view the secret key again.

---

## 3. Configure AWS CLI Locally

On your local development machine, configure your AWS profile:

```bash
aws configure
```

Enter your details when prompted:
```text
AWS Access Key ID [None]: AKIAXXXXXXXXXXXXXXXX
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

Verify your authentication:
```bash
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/vibesift-deployer"
}
```

---

## 4. Bootstrap AWS CDK in Your Region

AWS CDK requires a bootstrap stack (S3 bucket, ECR repository, and IAM execution roles) in each region where resources are deployed.

1. Install AWS CDK globally:
   ```bash
   npm install -g aws-cdk
   ```

2. Retrieve your 12-digit AWS Account ID:
   ```bash
   aws sts get-caller-identity --query "Account" --output text
   ```

3. Bootstrap the CDK environment (replace `123456789012` and `us-east-1` with your account and region):
   ```bash
   cd infra
   npm install
   npm run build
   cdk bootstrap aws://123456789012/us-east-1
   ```

---

## 5. Least-Privilege Scoped IAM Policy (Production Alternative)

If your organization prohibits `AdministratorAccess`, attach an IAM policy containing only the required service namespaces:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VibeSiftCDKDeploymentPermissions",
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "dynamodb:*",
        "s3:*",
        "kms:*",
        "ec2:*",
        "ecs:*",
        "ecr:*",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PassRole",
        "iam:TagRole",
        "states:*",
        "sqs:*",
        "lambda:*",
        "apigateway:*",
        "cognito-idp:*",
        "wafv2:*",
        "budgets:*",
        "cloudwatch:*",
        "logs:*",
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Next Steps
Proceed to [02-BEDROCK-MODEL-ACCESS-AND-SETUP.md](./02-BEDROCK-MODEL-ACCESS-AND-SETUP.md) to request Bedrock foundation model access and configure AI-driven explanations.
