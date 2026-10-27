import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { config } from '../config/env.js';

const sfnClient = new SFNClient({ region: config.awsRegion });

/**
 * AWS Lambda SQS event handler: triggers Step Functions execution for each enqueued scan job
 */
export async function handler(event) {
  console.log(`[SQSConsumer] Received ${event.Records?.length || 0} scan job records from SQS.`);

  for (const record of event.Records || []) {
    try {
      const job = JSON.parse(record.body);
      const { scanId, ownerUserId, targetUrl, scanProfile } = job;

      console.log(`[SQSConsumer] Launching Step Functions workflow for scan ${scanId} (target: ${targetUrl})`);

      await sfnClient.send(
        new StartExecutionCommand({
          stateMachineArn: config.orchestration.scanStateMachineArn,
          name: `scan_${scanId}_${Date.now()}`,
          input: JSON.stringify(job),
        })
      );
    } catch (err) {
      console.error(`[SQSConsumer] Failed to process SQS record ${record.messageId}:`, err);
      throw err; // Re-throw so message is routed to DLQ after max receives
    }
  }

  return { statusCode: 200, processed: event.Records?.length || 0 };
}
