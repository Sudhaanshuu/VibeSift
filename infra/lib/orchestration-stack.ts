import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface OrchestrationStackProps extends cdk.StackProps {
  stage: string;
  scansTable: dynamodb.Table;
  findingsTable: dynamodb.Table;
  reportsBucket: s3.Bucket;
  kmsKey: kms.Key;
  ecsCluster: ecs.Cluster;
  pythonTaskDef: ecs.FargateTaskDefinition;
  lighthouseTaskDef: ecs.FargateTaskDefinition;
  pythonInspectorLambda?: lambda.Function;
  scannerSecurityGroup: ec2.SecurityGroup;
}

export class OrchestrationStack extends cdk.Stack {
  public readonly scanQueue: sqs.Queue;
  public readonly dlq: sqs.DeadLetterQueue;
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: OrchestrationStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';

    // 1. Dead Letter Queue for failed scan events
    const deadLetterQueue = new sqs.Queue(this, 'ScanJobsDLQ', {
      queueName: `vibesift-scan-jobs-dlq-${props.stage}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: props.kmsKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    this.dlq = {
      queue: deadLetterQueue,
      maxReceiveCount: 3,
    };

    // 2. Primary Scan Queue
    this.scanQueue = new sqs.Queue(this, 'ScanJobsQueue', {
      queueName: `vibesift-scan-jobs-${props.stage}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: props.kmsKey,
      visibilityTimeout: cdk.Duration.minutes(10), // Step function can take up to 10 mins
      deadLetterQueue: this.dlq,
    });

    // 3. Normalizer Lambda Function
    const normalizerLambda = new lambda.Function(this, 'NormalizerFunction', {
      functionName: `vibesift-normalizer-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'src/api/lambdaHandler.handler',
      code: lambda.Code.fromAsset('../backend'),
      timeout: cdk.Duration.minutes(2),
      memorySize: 512,
      environment: {
        NODE_ENV: props.stage,
        DYNAMODB_SCANS_TABLE: props.scansTable.tableName,
        DYNAMODB_FINDINGS_TABLE: props.findingsTable.tableName,
        S3_REPORTS_BUCKET: props.reportsBucket.bucketName,
      },
    });

    props.scansTable.grantReadWriteData(normalizerLambda);
    props.findingsTable.grantReadWriteData(normalizerLambda);
    props.reportsBucket.grantReadWrite(normalizerLambda);
    props.kmsKey.grantEncryptDecrypt(normalizerLambda);

    // 4. Step Functions Log Group
    const sfnLogGroup = new logs.LogGroup(this, 'StepFunctionsLogGroup', {
      logGroupName: `/aws/vendedlogs/states/vibesift-orchestration-${props.stage}`,
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // 5. ECS Task Definitions Runner Construct
    const runFargateTask = (id: string, taskDef: ecs.FargateTaskDefinition, containerName: string) =>
      new tasks.EcsRunTask(this, id, {
        integrationPattern: sfn.IntegrationPattern.RUN_JOB,
        cluster: props.ecsCluster,
        taskDefinition: taskDef,
        launchTarget: new tasks.EcsFargateLaunchTarget({
          platformVersion: ecs.FargatePlatformVersion.LATEST,
        }),
        securityGroups: [props.scannerSecurityGroup],
        assignPublicIp: false,
        containerOverrides: [
          {
            containerDefinition: taskDef.findContainer(containerName)!,
            environment: [
              { name: 'TARGET_URL', value: sfn.JsonPath.stringAt('$.targetUrl') },
              { name: 'SCAN_ID', value: sfn.JsonPath.stringAt('$.scanId') },
            ],
          },
        ],
      });

    // Serverless Python Inspector Task (executed directly via Lambda if available, or Fargate fallback)
    const pythonInspectorTask = props.pythonInspectorLambda
      ? new tasks.LambdaInvoke(this, 'InvokePythonInspectorLambda', {
          lambdaFunction: props.pythonInspectorLambda,
          payload: sfn.TaskInput.fromObject({
            targetUrl: sfn.JsonPath.stringAt('$.targetUrl'),
            scanId: sfn.JsonPath.stringAt('$.scanId'),
            scanProfile: sfn.JsonPath.stringAt('$.scanProfile'),
            s3Bucket: props.reportsBucket.bucketName,
          }),
          resultPath: '$.pythonResult',
        })
      : runFargateTask('RunPythonTask', props.pythonTaskDef, 'python-inspector');

    const lighthouseTask = runFargateTask('RunLighthouseTask', props.lighthouseTaskDef, 'lighthouse');

    // Parallel Scanner Execution
    const scannersParallel = new sfn.Parallel(this, 'RunAuditScanners')
      .branch(pythonInspectorTask)
      .branch(lighthouseTask);

    // Normalizer Task: aggregates findings, runs Bedrock / AI explanation, updates DynamoDB & S3
    const normalizerTask = new tasks.LambdaInvoke(this, 'InvokeNormalizer', {
      lambdaFunction: normalizerLambda,
      payload: sfn.TaskInput.fromObject({
        scanId: sfn.JsonPath.stringAt('$.scanId'),
        targetUrl: sfn.JsonPath.stringAt('$.targetUrl'),
        scanProfile: sfn.JsonPath.stringAt('$.scanProfile'),
        ownerUserId: sfn.JsonPath.stringAt('$.ownerUserId'),
      }),
    });

    const definition = scannersParallel.next(normalizerTask);

    // 6. Step Functions State Machine
    this.stateMachine = new sfn.StateMachine(this, 'ScanWorkflowStateMachine', {
      stateMachineName: `VibeSift-AuditWorkflow-${props.stage}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(15),
      logs: {
        destination: sfnLogGroup,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
    });
  }
}
