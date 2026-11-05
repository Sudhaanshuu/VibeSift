import fs from 'node:fs';
import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from '@aws-sdk/client-ssm';

const INSTANCE_ID = process.env.EC2_INSTANCE_ID || 'i-0657c75769eb55165';
const REGION = process.env.AWS_REGION || 'us-east-1';
const client = new SSMClient({ region: REGION });

async function uploadFileViaSSM(localPath, remotePath) {
  const content = fs.readFileSync(localPath);
  const base64Content = content.toString('base64');
  console.log(`Uploading ${localPath} (${content.length} bytes) to ${remotePath}...`);

  // Split into chunks if needed or send directly
  const script = `
cat << 'EOF' | base64 -d > ${remotePath}
${base64Content}
EOF
chown -R ubuntu:ubuntu ${remotePath}
chmod 644 ${remotePath}
ls -la ${remotePath}
`;

  const sendCmd = new SendCommandCommand({
    InstanceIds: [INSTANCE_ID],
    DocumentName: 'AWS-RunShellScript',
    Parameters: {
      commands: [script],
    },
  });

  const sendRes = await client.send(sendCmd);
  const commandId = sendRes.Command.CommandId;

  // Poll
  let status = 'Pending';
  let invocation = null;
  while (['Pending', 'InProgress', 'Delayed'].includes(status)) {
    await new Promise((r) => setTimeout(r, 2000));
    const invCmd = new GetCommandInvocationCommand({
      CommandId: commandId,
      InstanceId: INSTANCE_ID,
    });
    invocation = await client.send(invCmd);
    status = invocation.Status;
  }

  if (status !== 'Success') {
    throw new Error(`SSM upload failed (${status}): ${invocation.StandardErrorContent}`);
  }
  console.log(`Successfully uploaded ${remotePath}:\n${invocation.StandardOutputContent.trim()}`);
}

async function main() {
  await uploadFileViaSSM(
    'c:\\vibesift\\backend\\src\\workers\\lighthouse\\runner.js',
    '/var/www/vibesift/backend/src/workers/lighthouse/runner.js'
  );
  await uploadFileViaSSM(
    'c:\\vibesift\\backend\\src\\orchestration\\workflowHandler.js',
    '/var/www/vibesift/backend/src/orchestration/workflowHandler.js'
  );

  console.log('Reloading PM2 service on EC2...');
  const reloadScript = `
cd /var/www/vibesift/backend
pm2 reload vibesift-backend --update-env
pm2 status
`;
  const sendCmd = new SendCommandCommand({
    InstanceIds: [INSTANCE_ID],
    DocumentName: 'AWS-RunShellScript',
    Parameters: { commands: [reloadScript] },
  });
  const res = await client.send(sendCmd);
  const commandId = res.Command.CommandId;

  let status = 'Pending';
  let invocation = null;
  while (['Pending', 'InProgress', 'Delayed'].includes(status)) {
    await new Promise((r) => setTimeout(r, 2000));
    invocation = await client.send(new GetCommandInvocationCommand({
      CommandId: commandId,
      InstanceId: INSTANCE_ID,
    }));
    status = invocation.Status;
  }
  console.log(invocation.StandardOutputContent);
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
