# AWS Step Functions & Amazon SQS Orchestration Guide

This guide details how to set up the asynchronous scan job queue, dead-letter queue (DLQ), and the multi-engine audit state machine using Amazon SQS and AWS Step Functions.

---

## 1. Orchestration Architecture Overview

```
Client Scan Request
       │
       ▼
[API Gateway / Express] ──> [SSRF Guard & Idempotency Check]
                                      │
                                      ▼
                        [Amazon SQS Scan Queue]
                                      │
                                      ▼
                      [AWS Step Functions State Machine]
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
    [Python Inspector]      [Lighthouse Worker]      [OWASP ZAP / Nuclei]
     (TLS/Headers/SEO)       (CWV/Perf/A11y)          (Deep Scans Only)
              │                       │                       │
              └───────────────────────┼───────────────────────┘
                                      ▼
                         [Findings Normalizer Lambda]
                                      │
                                      ▼
                           [Bedrock Explanations]
                                      │
                                      ▼
                         [Scoring & S3 Final Report]
                                      │
                                      ▼
                           [DynamoDB Status: COMPLETED]
```

---

## 2. Amazon SQS Setup (Queue + Dead-Letter Queue)

### Step 1: Create Dead-Letter Queue (DLQ)
A DLQ captures jobs that repeatedly fail (after 3 attempts) for operator inspection:
```bash
aws sqs create-queue \
  --queue-name vibesift-scan-jobs-dlq-dev \
  --region us-east-1
```

Retrieve the DLQ ARN:
```bash
aws sqs get-queue-attributes \
  --queue-url $(aws sqs get-queue-url --queue-name vibesift-scan-jobs-dlq-dev --query 'QueueUrl' --output text) \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text
```

### Step 2: Create Main Scan Queue with Redrive Policy
Replace `<DLQ_ARN>` with the ARN retrieved above:
```bash
aws sqs create-queue \
  --queue-name vibesift-scan-jobs-dev \
  --attributes '{
    "VisibilityTimeout": "300",
    "MessageRetentionPeriod": "86400",
    "RedrivePolicy": "{\"deadLetterTargetArn\":\"<DLQ_ARN>\",\"maxReceiveCount\":\"3\"}"
  }' \
  --region us-east-1
```

---

## 3. Step Functions State Machine Setup

### Step 1: Create IAM Role for Step Functions
Create a trust policy file `sfn-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "states.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the IAM role:
```bash
aws iam create-role \
  --role-name VibeSiftStepFunctionsExecutionRole-dev \
  --assume-role-policy-document file://sfn-trust-policy.json
```

Attach the required permissions policy `sfn-permissions.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:DescribeTasks",
        "lambda:InvokeFunction",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "s3:PutObject",
        "s3:GetObject",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "*"
    }
  ]
}
```

Attach to role:
```bash
aws iam put-role-policy \
  --role-name VibeSiftStepFunctionsExecutionRole-dev \
  --policy-name StepFunctionsExecutionPolicy \
  --policy-document file://sfn-permissions.json
```

### Step 2: Deploy Step Functions State Machine
The state machine definition is located at `backend/src/orchestration/stepFunctionsDefinition.json`. Deploy it using the AWS CLI:

```bash
SFN_ROLE_ARN=$(aws iam get-role --role-name VibeSiftStepFunctionsExecutionRole-dev --query 'Role.Arn' --output text)

aws stepfunctions create-state-machine \
  --name VibeSift-AuditWorkflow-dev \
  --definition file://backend/src/orchestration/stepFunctionsDefinition.json \
  --role-arn $SFN_ROLE_ARN \
  --region us-east-1
```

---

## 4. Backend Environment Configuration

Add the queue URL and state machine ARN to `backend/.env`:

```ini
USE_MOCK_ORCHESTRATION=false
SCAN_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/vibesift-scan-jobs-dev
SCAN_SFN_ARN=arn:aws:states:us-east-1:123456789012:stateMachine:VibeSift-AuditWorkflow-dev
```

---

## Next Steps
Proceed to [05-ECS-FARGATE-AND-DOCKER-WORKERS.md](./05-ECS-FARGATE-AND-DOCKER-WORKERS.md) to build and push container images to Amazon ECR and configure ECS Fargate tasks.
