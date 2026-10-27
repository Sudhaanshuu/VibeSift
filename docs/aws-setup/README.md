# VibeSift AWS Setup & Foundation Models Guide Series

This documentation series provides a complete, step-by-step technical guide to deploying VibeSift on AWS, enabling Amazon Bedrock foundation models (Claude 3 Haiku / Titan), configuring persistent DynamoDB & S3 storage, and managing containerized security and performance audit workers.

---

## 📚 Guide Index

| Step | Guide Document | Focus Areas |
| :---: | :--- | :--- |
| **01** | [**01-AWS-ACCOUNT-AND-IAM.md**](./01-AWS-ACCOUNT-AND-IAM.md) | AWS account prerequisites, IAM deployment user, CLI configuration, and CDK bootstrap. |
| **02** | [**02-BEDROCK-MODEL-ACCESS-AND-SETUP.md**](./02-BEDROCK-MODEL-ACCESS-AND-SETUP.md) | Requesting model access in Amazon Bedrock console, obtaining Anthropic Claude 3 Haiku / Sonnet, inference profiles, IAM permissions, and testing. |
| **03** | [**03-DYNAMODB-AND-S3-STORAGE.md**](./03-DYNAMODB-AND-S3-STORAGE.md) | Persistent DynamoDB tables (`SavedWebsites`, `Scans`, `Findings`), GSI indexes, S3 bucket setup, KMS encryption, and CORS configuration. |
| **04** | [**04-STEP-FUNCTIONS-AND-SQS.md**](./04-STEP-FUNCTIONS-AND-SQS.md) | SQS scan job queue, Dead-Letter Queue (DLQ), and AWS Step Functions multi-engine state machine. |
| **05** | [**05-ECS-FARGATE-AND-DOCKER-WORKERS.md**](./05-ECS-FARGATE-AND-DOCKER-WORKERS.md) | Building and pushing Docker container images (Python Inspector, Lighthouse, ZAP, Nuclei) to Amazon ECR, and ECS Fargate task definitions. |
| **06** | [**06-COGNITO-AUTH-AND-API-GATEWAY.md**](./06-COGNITO-AUTH-AND-API-GATEWAY.md) | Amazon Cognito User Pool & App Client, JWT Authorizers, and API Gateway HTTP API v2 routes. |
| **07** | [**07-END-TO-END-DEPLOYMENT-RUNBOOK.md**](./07-END-TO-END-DEPLOYMENT-RUNBOOK.md) | Zero-to-production deployment checklist, single-command CDK deploy, frontend build & CloudFront hosting, and smoke tests. |

---

## ⚡ Quick Navigation
- For obtaining and enabling Bedrock AI models, read [Guide 02: Bedrock Model Access & Setup](./02-BEDROCK-MODEL-ACCESS-AND-SETUP.md).
- For complete end-to-end deployment instructions, read [Guide 07: Deployment Runbook](./07-END-TO-END-DEPLOYMENT-RUNBOOK.md).
