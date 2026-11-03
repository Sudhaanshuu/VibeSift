import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from '../config/env.js';
import { executeScanPipelineLocally } from './workflowHandler.js';
import { bootstrapEnvironmentFromSSM } from '../services/ssmService.js';

let sqsClient = null;

function getSqsClient() {
  if (!sqsClient) {
    const region = process.env.AWS_REGION || config.awsRegion || 'us-east-1';
    try {
      sqsClient = new SQSClient({ region });
    } catch (err) {
      console.warn('[SQSConsumer] Failed to initialize SQS client:', err.message);
    }
  }
  return sqsClient;
}

/**
 * Processes a single scan job payload
 */
export async function processScanJob(job) {
  const { scanId, targetUrl } = job;
  console.log(`[SQSConsumer] Starting audit execution for scan ${scanId} (target: ${targetUrl})`);
  await executeScanPipelineLocally(job);
}

/**
 * Continuous EC2 background worker that long-polls the SQS FIFO queue
 */
export async function startSqsPollingWorker({ signal } = {}) {
  // Hydrate environment from SSM if on EC2
  await bootstrapEnvironmentFromSSM();

  const queueUrl = process.env.SCAN_QUEUE_URL || config.orchestration.scanQueueUrl;
  const client = getSqsClient();

  if (!client || !queueUrl) {
    console.log('[SQSConsumer] SQS client or SCAN_QUEUE_URL not configured. Poller inactive.');
    return;
  }

  console.log(`[SQSConsumer] Starting EC2 SQS FIFO polling worker on ${queueUrl}...`);

  while (!signal?.aborted) {
    try {
      const response = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20, // Long-polling (reduces AWS SQS cost to near zero)
          VisibilityTimeout: 120, // 2 minutes to complete scan
          AttributeNames: ['All'],
        })
      );

      const messages = response.Messages || [];
      for (const msg of messages) {
        try {
          const job = JSON.parse(msg.Body);
          await processScanJob(job);

          // Acknowledge and delete message upon successful execution
          await client.send(
            new DeleteMessageCommand({
              QueueUrl: queueUrl,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );
          console.log(`[SQSConsumer] Successfully processed & deleted scan job message ${msg.MessageId}`);
        } catch (jobErr) {
          console.error(`[SQSConsumer] Error processing scan job message ${msg.MessageId}:`, jobErr);
          // Message will automatically reappear or route to DLQ after MaxReceiveCount
        }
      }
    } catch (pollErr) {
      if (signal?.aborted) break;
      console.warn('[SQSConsumer] SQS polling error (will retry in 5s):', pollErr.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

/**
 * AWS Lambda SQS event handler (if deployed as an event-driven Lambda trigger)
 */
export async function handler(event) {
  console.log(`[SQSConsumer] Received ${event.Records?.length || 0} scan job records from SQS.`);

  for (const record of event.Records || []) {
    try {
      const job = JSON.parse(record.body);
      await processScanJob(job);
    } catch (err) {
      console.error(`[SQSConsumer] Failed to process SQS record ${record.messageId}:`, err);
      throw err;
    }
  }

  return { statusCode: 200, processed: event.Records?.length || 0 };
}

// Auto-start worker when run directly via Node or PM2
const isRunningInPm2 = Boolean(process.env.pm_id !== undefined || process.env.PM2_HOME);
const isDirectExecution = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith('sqsConsumer.js')
);

if (isRunningInPm2 || isDirectExecution) {
  console.log(`[SQSConsumer] Starting standalone SQS FIFO poller (PID: ${process.pid})...`);
  startSqsPollingWorker().catch((err) => {
    console.error('[SQSConsumer] Fatal worker failure:', err);
    process.exit(1);
  });
}
