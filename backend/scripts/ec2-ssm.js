import { SSMClient, SendCommandCommand, GetCommandInvocationCommand } from '@aws-sdk/client-ssm';
import fs from 'fs';

const client = new SSMClient({ region: 'us-east-1' });
const instanceId = 'i-0657c75769eb55165';

export async function runSSM(scriptContent) {
  const commands = Array.isArray(scriptContent) ? scriptContent : [scriptContent];
  const sendRes = await client.send(
    new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: { commands },
    })
  );

  const commandId = sendRes.Command.CommandId;
  console.log(`[SSM] Dispatched ${commandId}`);

  let attempts = 0;
  while (attempts < 60) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const invRes = await client.send(
        new GetCommandInvocationCommand({
          CommandId: commandId,
          InstanceId: instanceId,
        })
      );
      if (['Success', 'Failed', 'TimedOut', 'Cancelled'].includes(invRes.Status)) {
        console.log(`[SSM] Status: ${invRes.Status} (Code: ${invRes.ResponseCode})`);
        if (invRes.StandardOutputContent) {
          console.log('--- STDOUT ---');
          console.log(invRes.StandardOutputContent);
        }
        if (invRes.StandardErrorContent) {
          console.error('--- STDERR ---');
          console.error(invRes.StandardErrorContent);
        }
        return invRes;
      }
    } catch (e) {
      // Waiting for command to register
    }
    attempts++;
  }
  throw new Error('Command timed out');
}

if (process.argv[1] && (process.argv[1].endsWith('ec2-ssm.js') || process.argv[1].endsWith('ec2-ssm'))) {
  if (process.argv[2] === '--file') {
    const content = fs.readFileSync(process.argv[3], 'utf8');
    runSSM(content).catch(console.error);
  } else if (process.argv[2]) {
    runSSM(process.argv[2]).catch(console.error);
  }
}
