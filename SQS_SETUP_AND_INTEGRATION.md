# 📬 Amazon SQS FIFO Implementation & Setup Guide for VibeSift

> **Architecture:** Zero-Step-Functions, Flat-Cost Cloud Architecture  
> **Queue Type:** **Amazon SQS FIFO (`.fifo`)**  
> **Target Environment:** AWS EC2 (Node.js 20/22) • AWS Lambda (Python Inspector) • SQLite (WAL Mode) • Amazon S3  
> **AWS Region:** `us-east-1` (or your preferred region)

---

## 🏛️ 1. Architecture Flow

```
┌────────────────────────┐
│  React 19 Frontend UI  │
└───────────┬────────────┘
            │ 1. POST /api/scans (Target URL)
            ▼
┌────────────────────────────────────────────────────────┐
│  VibeSift API (EC2 Express Backend)                    │
│   • Runs SSRF Guard & Normalization                    │
│   • Checks S3 & SQLite for existing audit              │
│   • Inserts QUEUED record into SQLite                  │
│   • Sends job with MessageGroupId & DeduplicationId    │
└───────────┬────────────────────────────────────────────┘
            │ 2. SendMessageCommand
            ▼
┌────────────────────────────────────────────────────────┐
│  Amazon SQS FIFO Queue (vibesift-scan-jobs.fifo)       │
│   • Strictly ordered, exactly-once processing          │
│   • Dead-Letter Queue (vibesift-scan-jobs-dlq.fifo)    │
└───────────┬────────────────────────────────────────────┘
            │ 3. ReceiveMessageCommand (Long Polling 20s)
            ▼
┌────────────────────────────────────────────────────────┐
│  EC2 SQS Worker Service                                │
│   • Transitions scan state: VALIDATING ➔ RUNNING       │
│   ├─➔ 4. Invokes AWS Lambda (Python Inspector Tests)   │
│   ├─➔ 5. Runs Google Lighthouse CWV (EC2 Chromium)     │
│   ├─➔ 6. Normalizes & Records Findings in SQLite       │
│   ├─➔ 7. Uploads report.json & report.md to Amazon S3  │
│   └─➔ 8. Deletes message from SQS FIFO Queue           │
└────────────────────────────────────────────────────────┘
```

---

## 📋 2. Step-by-Step AWS Management Console Setup

Follow these exact steps in your browser inside the **AWS Management Console**:

---

### Step 1: Open Amazon SQS Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **SQS** and select **Simple Queue Service**.
3. Ensure your desired AWS Region is selected in the top-right header (e.g., **US East (N. Virginia) `us-east-1`**).

---

### Step 2: Create the Dead-Letter Queue (DLQ) First

Before creating the main queue, we create the DLQ so the main queue can reference it immediately.

1. Click the orange **Create queue** button.
2. Under **Type**, select **FIFO** *(Important: FIFO queues must end with `.fifo`)*.
3. **Name:** Enter `vibesift-scan-jobs-dlq.fifo`.
4. **Configuration:**
   * **Visibility timeout:** `120 Seconds` (2 minutes).
   * **Delivery delay:** `0 Seconds`.
   * **Receive message wait time:** `0 Seconds`.
   * **Message retention period:** `14 Days` (maximum allowed for auditing failed jobs).
   * **Maximum message size:** `256 KB`.
5. **Encryption:**
   * Choose **Amazon SQS key (SSE-SQS)** (included in AWS Free Tier, zero KMS surcharge) OR choose **AWS KMS** if corporate compliance requires it.
6. **Dead-letter queue:** Leave disabled for the DLQ itself.
7. Click **Create queue** at the bottom.

---

### Step 3: Create the Primary Scan FIFO Queue

1. Return to the **Queues** dashboard and click **Create queue**.
2. Under **Type**, select **FIFO**.
3. **Name:** Enter `vibesift-scan-jobs.fifo`.
4. **Configuration:**
   * **Visibility timeout:** `300 Seconds` (5 minutes — allows sufficient time for Lighthouse & Lambda inspection).
   * **Delivery delay:** `0 Seconds`.
   * **Receive message wait time:** `20 Seconds` *(Long polling enabled: minimizes empty responses and reduces SQS API costs to near zero)*.
   * **Message retention period:** `4 Days`.
   * **Maximum message size:** `256 KB`.
5. **FIFO configuration:**
   * **Content-based deduplication:** Check **Enable** (allows deduplication using SHA-256 hash of the message body, in addition to explicit `MessageDeduplicationId`).
   * **High throughput FIFO:** Check **Enable** (optional, recommended for high volume).
   * **Deduplication scope:** **Message group** (recommended).
   * **FIFO throughput limit:** **Per message group ID**.
6. **Encryption:**
   * Choose **Amazon SQS key (SSE-SQS)**.
7. **Dead-letter queue (DLQ) Redrive Policy:**
   * Toggle **Enabled**.
   * Under **Choose queue**, select `vibesift-scan-jobs-dlq.fifo`.
   * **Maximum receives:** Enter `3` (a job will be retried up to 3 times before moving to the DLQ).
8. Click **Create queue**.
9. **Copy the Queue URL:** Note down the Queue URL displayed at the top, for example:
   ```
   https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs.fifo
   ```

---

### Step 4: Configure IAM Permissions for EC2 Instance

Your EC2 instance needs permission to send and receive messages from the SQS queue.

1. Open the [IAM Console](https://console.aws.amazon.com/iam/).
2. Click **Policies** ➔ **Create policy**.
3. Select the **JSON** tab and paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VibeSiftSQSFifoAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ChangeMessageVisibility"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:501380833083:vibesift-scan-jobs.fifo",
        "arn:aws:sqs:us-east-1:501380833083:vibesift-scan-jobs-dlq.fifo"
      ]
    },
    {
      "Sid": "VibeSiftLambdaInvokeAccess",
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:501380833083:function:vibesift-python-inspector-*"
    },
    {
      "Sid": "VibeSiftS3ReportAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::vibesift-audit-reports-*/*"
    }
  ]
}
```

4. Name the policy `VibeSiftEC2WorkerPolicy` and click **Create policy**.
5. Attach this policy to the **IAM Role** assigned to your EC2 instance (EC2 ➔ Actions ➔ Security ➔ Modify IAM role).

---

## ⚙️ 3. Connecting SQS to the VibeSift Application

### Environment Configuration (`backend/.env` & `.env`)

Add or update your SQS Queue URL:

```ini
# SQS FIFO Configuration
AWS_REGION=us-east-1
SCAN_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs.fifo
USE_MOCK_ORCHESTRATION=false

# AWS Lambda Inspector
USE_LAMBDA_INSPECTOR=true
LAMBDA_INSPECTOR_FUNCTION_NAME=vibesift-python-inspector-dev

# Storage
USE_LOCAL_STORAGE=false
S3_REPORTS_BUCKET=vibesift-audit-reports-dev-501380833083
SQLITE_DB_PATH=.local_storage/vibesift.sqlite
```

---

## 💻 4. Code Implementation Architecture

### A. Producer (`backend/src/orchestration/workflowHandler.js`)

When a user submits a URL, the Express API normalizes the URL and enqueues it to SQS FIFO:

```javascript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { sanitizeTargetHost } from '../services/s3Storage.js';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function startScanWorkflow(job) {
  const isFifo = process.env.SCAN_QUEUE_URL?.endsWith('.fifo');
  const group = sanitizeTargetHost(job.normalizedHostname) || 'default';

  const sendParams = {
    QueueUrl: process.env.SCAN_QUEUE_URL,
    MessageBody: JSON.stringify(job),
  };

  if (isFifo) {
    sendParams.MessageGroupId = group; // Groups messages by target domain
    sendParams.MessageDeduplicationId = `${job.scanId}_${Date.now()}`;
  }

  await sqsClient.send(new SendMessageCommand(sendParams));
}
```

---

### B. Consumer Worker (`backend/src/orchestration/sqsConsumer.js`)

The EC2 background worker continuously polls SQS using **20-second Long Polling**:

```javascript
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { executeScanPipelineLocally } from './workflowHandler.js';

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

export async function startSqsPollingWorker() {
  const queueUrl = process.env.SCAN_QUEUE_URL;

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20, // Long Polling
          VisibilityTimeout: 180,
          AttributeNames: ['All'],
        })
      );

      for (const msg of response.Messages || []) {
        const job = JSON.parse(msg.Body);
        
        // 1. Run Python Inspector (Lambda) + Lighthouse (Local Chromium)
        // 2. Write scan status & findings into SQLite
        // 3. Upload report.json to S3
        await executeScanPipelineLocally(job);

        // Delete message after successful execution
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          })
        );
      }
    } catch (err) {
      console.error('[SQSConsumer] Polling error:', err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
```

---

## 🚀 5. Running the Background Worker on EC2

Use **PM2** on your EC2 instance to keep the SQS Consumer worker running 24/7 with automatic restarts:

```bash
# Start the SQS Polling Worker in the background
pm2 start backend/src/orchestration/sqsConsumer.js --name "vibesift-sqs-worker"

# Verify worker is active
pm2 status

# View live worker logs
pm2 logs vibesift-sqs-worker
```

---

## 🧪 6. Testing & Verifying SQS FIFO Setup

### Test 1: Send a Test Message via AWS Console
1. Open the SQS Console ➔ Click `vibesift-scan-jobs.fifo`.
2. Click **Send and receive messages** in the top right.
3. In **Message body**, paste:
   ```json
   {
     "scanId": "scn_test_123456",
     "ownerUserId": "test-user-001",
     "targetUrl": "https://example.com",
     "normalizedHostname": "example.com",
     "scanProfile": "baseline_public"
   }
   ```
4. In **Message group ID**, enter: `example.com`.
5. In **Message deduplication ID**, enter: `dedup_test_001`.
6. Click **Send message**.
7. In your EC2 terminal, run `pm2 logs vibesift-sqs-worker` and verify the job was picked up, executed, and deleted!

---

## 🛡️ S3 Key Naming Convention Reference

As configured in `backend/src/services/s3Storage.js`:
* Report file: `scans/{sanitizedHost}__{scanId}/report.json`
* Markdown file: `scans/{sanitizedHost}__{scanId}/report.md`
* Direct mirror: `audits/{sanitizedHost}__{scanId}.json`
* Trimming utility:
  ```javascript
  import { parseScanFromS3Key } from './services/s3Storage.js';
  const { hostname, scanId } = parseScanFromS3Key("scans/example.com__scn_abc123/report.json");
  // hostname => "example.com"
  // scanId   => "scn_abc123"
  ```
