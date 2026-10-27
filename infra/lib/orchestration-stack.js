"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationStack = void 0;
const cdk = require("aws-cdk-lib");
const sqs = require("aws-cdk-lib/aws-sqs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const ecs = require("aws-cdk-lib/aws-ecs");
const logs = require("aws-cdk-lib/aws-logs");
const lambda = require("aws-cdk-lib/aws-lambda");
class OrchestrationStack extends cdk.Stack {
    scanQueue;
    dlq;
    stateMachine;
    constructor(scope, id, props) {
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
        const runFargateTask = (id, taskDef, containerName) => new tasks.EcsRunTask(this, id, {
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
                    containerDefinition: taskDef.findContainer(containerName),
                    environment: [
                        { name: 'TARGET_URL', value: sfn.JsonPath.stringAt('$.targetUrl') },
                        { name: 'SCAN_ID', value: sfn.JsonPath.stringAt('$.scanId') },
                    ],
                },
            ],
        });
        const pythonTask = runFargateTask('RunPythonTask', props.pythonTaskDef, 'python-inspector');
        const lighthouseTask = runFargateTask('RunLighthouseTask', props.lighthouseTaskDef, 'lighthouse');
        const zapTask = runFargateTask('RunZapTask', props.zapTaskDef, 'owasp-zap');
        const nucleiTask = runFargateTask('RunNucleiTask', props.nucleiTaskDef, 'nuclei');
        // Baseline Scanners Parallel Branch
        const baselineParallel = new sfn.Parallel(this, 'RunBaselineScanners')
            .branch(pythonTask)
            .branch(lighthouseTask);
        // Deep Scanners Parallel Branch
        const deepParallel = new sfn.Parallel(this, 'RunAuthorizedDeepScanners')
            .branch(zapTask)
            .branch(nucleiTask);
        // Normalizer Task
        const normalizerTask = new tasks.LambdaInvoke(this, 'InvokeNormalizer', {
            lambdaFunction: normalizerLambda,
            payload: sfn.TaskInput.fromObject({
                scanId: sfn.JsonPath.stringAt('$.scanId'),
                targetUrl: sfn.JsonPath.stringAt('$.targetUrl'),
                scanProfile: sfn.JsonPath.stringAt('$.scanProfile'),
                ownerUserId: sfn.JsonPath.stringAt('$.ownerUserId'),
            }),
        });
        // Profile Decision Choice
        const profileChoice = new sfn.Choice(this, 'EvaluateProfileChoice')
            .when(sfn.Condition.stringEquals('$.scanProfile', 'authorized_deep'), deepParallel.next(normalizerTask))
            .otherwise(normalizerTask);
        const definition = baselineParallel.next(profileChoice);
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
exports.OrchestrationStack = OrchestrationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JjaGVzdHJhdGlvbi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9yY2hlc3RyYXRpb24tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQyxxREFBcUQ7QUFDckQsNkRBQTZEO0FBSTdELDJDQUEyQztBQUUzQyw2Q0FBNkM7QUFDN0MsaURBQWlEO0FBaUJqRCxNQUFhLGtCQUFtQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQy9CLFNBQVMsQ0FBWTtJQUNyQixHQUFHLENBQXNCO0lBQ3pCLFlBQVksQ0FBbUI7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE4QjtRQUN0RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQztRQUV0Qyw4Q0FBOEM7UUFDOUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDekQsU0FBUyxFQUFFLDBCQUEwQixLQUFLLENBQUMsS0FBSyxFQUFFO1lBQ2xELFVBQVUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUc7WUFDbkMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDakMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsR0FBRyxHQUFHO1lBQ1QsS0FBSyxFQUFFLGVBQWU7WUFDdEIsZUFBZSxFQUFFLENBQUM7U0FDbkIsQ0FBQztRQUVGLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3BELFNBQVMsRUFBRSxzQkFBc0IsS0FBSyxD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LENBQUM7Q0FDRjtBQS9IRCxnREErSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcbmltcG9ydCAqIGFzIHRhc2tzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBPcmNoZXN0cmF0aW9uU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgc2NhbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIGZpbmRpbmdzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICByZXBvcnRzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIGttc0tleToga21zLktleTtcbiAgZWNzQ2x1c3RlcjogZWNzLkNsdXN0ZXI7XG4gIHB5dGhvblRhc2tEZWY6IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb247XG4gIGxpZ2h0aG91c2VUYXNrRGVmOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uO1xuICB6YXBUYXNrRGVmOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uO1xuICBudWNsZWlUYXNrRGVmOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uO1xuICBzY2FubmVyU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XG59XG5cbmV4cG9ydCBjbGFzcyBPcmNoZXN0cmF0aW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgc2NhblF1ZXVlOiBzcXMuUXVldWU7XG4gIHB1YmxpYyByZWFkb25seSBkbHE6IHNxcy5EZWFkTGV0dGVyUXVldWU7XG4gIHB1YmxpYyByZWFkb25seSBzdGF0ZU1hY2hpbmU6IHNmbi5TdGF0ZU1hY2hpbmU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE9yY2hlc3RyYXRpb25TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBpc1Byb2QgPSBwcm9wcy5zdGFnZSA9PT0gJ3Byb2QnO1xuXG4gICAgLy8gMS4gRGVhZCBMZXR0ZXIgUXVldWUgZm9yIGZhaWxlZCBzY2FuIGV2ZW50c1xuICAgIGNvbnN0IGRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1NjYW5Kb2JzRExRJywge1xuICAgICAgcXVldWVOYW1lOiBgdmliZXNpZnQtc2Nhbi1qb2JzLWRscS0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICBlbmNyeXB0aW9uOiBzcXMuUXVldWVFbmNyeXB0aW9uLktNUyxcbiAgICAgIGVuY3J5cHRpb25NYXN0ZXJLZXk6IHByb3BzLmttc0tleSxcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kbHEgPSB7XG4gICAgICBxdWV1ZTogZGVhZExldHRlclF1ZXVlLFxuICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgIH07XG5cbiAgICAvLyAyLiBQcmltYXJ5IFNjYW4gUXVldWVcbiAgICB0aGlzLnNjYW5RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1NjYW5Kb2JzUXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6IGB2aWJlc2lmdC1zY2FuLWpvYnMtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgZW5jcnlwdGlvbjogc3FzLlF1ZXVlRW5jcnlwdGlvbi5LTVMsXG4gICAgICBlbmNyeXB0aW9uTWFzdGVyS2V5OiBwcm9wcy5rbXNLZXksXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApLCAvLyBTdGVwIGZ1bmN0aW9uIGNhbiB0YWtlIHVwIHRvIDEwIG1pbnNcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZTogdGhpcy5kbHEsXG4gICAgfSk7XG5cbiAgICAvLyAzLiBOb3JtYWxpemVyIExhbWJkYSBGdW5jdGlvblxuICAgIGNvbnN0IG5vcm1hbGl6ZXJMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3JtYWxpemVyRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGB2aWJlc2lmdC1ub3JtYWxpemVyLSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgaGFuZGxlcjogJ3NyYy9hcGkvbGFtYmRhSGFuZGxlci5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnLi4vYmFja2VuZCcpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBOT0RFX0VOVjogcHJvcHMuc3RhZ2UsXG4gICAgICAgIERZTkFNT0RCX1NDQU5TX1RBQkxFOiBwcm9wcy5zY2Fuc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgRFlOQU1PREJfRklORElOR1NfVEFCTEU6IHByb3BzLmZpbmRpbmdzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTM19SRVBPUlRTX0JVQ0tFVDogcHJvcHMucmVwb3J0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHByb3BzLnNjYW5zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG5vcm1hbGl6ZXJMYW1iZGEpO1xuICAgIHByb3BzLmZpbmRpbmdzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG5vcm1hbGl6ZXJMYW1iZGEpO1xuICAgIHByb3BzLnJlcG9ydHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobm9ybWFsaXplckxhbWJkYSk7XG4gICAgcHJvcHMua21zS2V5LmdyYW50RW5jcnlwdERlY3J5cHQobm9ybWFsaXplckxhbWJkYSk7XG5cbiAgICAvLyA0LiBTdGVwIEZ1bmN0aW9ucyBMb2cgR3JvdXBcbiAgICBjb25zdCBzZm5Mb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdTdGVwRnVuY3Rpb25zTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3ZlbmRlZGxvZ3Mvc3RhdGVzL3ZpYmVzaWZ0LW9yY2hlc3RyYXRpb24tJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgcmV0ZW50aW9uOiBpc1Byb2QgPyBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRIIDogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIDUuIEVDUyBUYXNrIERlZmluaXRpb25zIFJ1bm5lciBDb25zdHJ1Y3RcbiAgICBjb25zdCBydW5GYXJnYXRlVGFzayA9IChpZDogc3RyaW5nLCB0YXNrRGVmOiBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uLCBjb250YWluZXJOYW1lOiBzdHJpbmcpID0+XG4gICAgICBuZXcgdGFza3MuRWNzUnVuVGFzayh0aGlzLCBpZCwge1xuICAgICAgICBpbnRlZ3JhdGlvblBhdHRlcm46IHNmbi5JbnRlZ3JhdGlvblBhdHRlcm4uUlVOX0pPQixcbiAgICAgICAgY2x1c3RlcjogcHJvcHMuZWNzQ2x1c3RlcixcbiAgICAgICAgdGFza0RlZmluaXRpb246IHRhc2tEZWYsXG4gICAgICAgIGxhdW5jaFRhcmdldDogbmV3IHRhc2tzLkVjc0ZhcmdhdGVMYXVuY2hUYXJnZXQoe1xuICAgICAgICAgIHBsYXRmb3JtVmVyc2lvbjogZWNzLkZhcmdhdGVQbGF0Zm9ybVZlcnNpb24uTEFURVNULFxuICAgICAgICB9KSxcbiAgICAgICAgc2VjdXJpdHlHcm91cHM6IFtwcm9wcy5zY2FubmVyU2VjdXJpdHlHcm91cF0sXG4gICAgICAgIGFzc2lnblB1YmxpY0lwOiBmYWxzZSxcbiAgICAgICAgY29udGFpbmVyT3ZlcnJpZGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY29udGFpbmVyRGVmaW5pdGlvbjogdGFza0RlZi5maW5kQ29udGFpbmVyKGNvbnRhaW5lck5hbWUpISxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBbXG4gICAgICAgICAgICAgIHsgbmFtZTogJ1RBUkdFVF9VUkwnLCB2YWx1ZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnRhcmdldFVybCcpIH0sXG4gICAgICAgICAgICAgIHsgbmFtZTogJ1NDQU5fSUQnLCB2YWx1ZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnNjYW5JZCcpIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHB5dGhvblRhc2sgPSBydW5GYXJnYXRlVGFzaygnUnVuUHl0aG9uVGFzaycsIHByb3BzLnB5dGhvblRhc2tEZWYsICdweXRob24taW5zcGVjdG9yJyk7XG4gICAgY29uc3QgbGlnaHRob3VzZVRhc2sgPSBydW5GYXJnYXRlVGFzaygnUnVuTGlnaHRob3VzZVRhc2snLCBwcm9wcy5saWdodGhvdXNlVGFza0RlZiwgJ2xpZ2h0aG91c2UnKTtcbiAgICBjb25zdCB6YXBUYXNrID0gcnVuRmFyZ2F0ZVRhc2soJ1J1blphcFRhc2snLCBwcm9wcy56YXBUYXNrRGVmLCAnb3dhc3AtemFwJyk7XG4gICAgY29uc3QgbnVjbGVpVGFzayA9IHJ1bkZhcmdhdGVUYXNrKCdSdW5OdWNsZWlUYXNrJywgcHJvcHMubnVjbGVpVGFza0RlZiwgJ251Y2xlaScpO1xuXG4gICAgLy8gQmFzZWxpbmUgU2Nhbm5lcnMgUGFyYWxsZWwgQnJhbmNoXG4gICAgY29uc3QgYmFzZWxpbmVQYXJhbGxlbCA9IG5ldyBzZm4uUGFyYWxsZWwodGhpcywgJ1J1bkJhc2VsaW5lU2Nhbm5lcnMnKVxuICAgICAgLmJyYW5jaChweXRob25UYXNrKVxuICAgICAgLmJyYW5jaChsaWdodGhvdXNlVGFzayk7XG5cbiAgICAvLyBEZWVwIFNjYW5uZXJzIFBhcmFsbGVsIEJyYW5jaFxuICAgIGNvbnN0IGRlZXBQYXJhbGxlbCA9IG5ldyBzZm4uUGFyYWxsZWwodGhpcywgJ1J1bkF1dGhvcml6ZWREZWVwU2Nhbm5lcnMnKVxuICAgICAgLmJyYW5jaCh6YXBUYXNrKVxuICAgICAgLmJyYW5jaChudWNsZWlUYXNrKTtcblxuICAgIC8vIE5vcm1hbGl6ZXIgVGFza1xuICAgIGNvbnN0IG5vcm1hbGl6ZXJUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnSW52b2tlTm9ybWFsaXplcicsIHtcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBub3JtYWxpemVyTGFtYmRhLFxuICAgICAgcGF5bG9hZDogc2ZuLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgc2NhbklkOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQuc2NhbklkJyksXG4gICAgICAgIHRhcmdldFVybDogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnRhcmdldFVybCcpLFxuICAgICAgICBzY2FuUHJvZmlsZTogc2ZuLkpzb25QYXRoLnN0cmluZ0F0KCckLnNjYW5Qcm9maWxlJyksXG4gICAgICAgIG93bmVyVXNlcklkOiBzZm4uSnNvblBhdGguc3RyaW5nQXQoJyQub3duZXJVc2VySWQnKSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gUHJvZmlsZSBEZWNpc2lvbiBDaG9pY2VcbiAgICBjb25zdCBwcm9maWxlQ2hvaWNlID0gbmV3IHNmbi5DaG9pY2UodGhpcywgJ0V2YWx1YXRlUHJvZmlsZUNob2ljZScpXG4gICAgICAud2hlbihzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zY2FuUHJvZmlsZScsICdhdXRob3JpemVkX2RlZXAnKSwgZGVlcFBhcmFsbGVsLm5leHQobm9ybWFsaXplclRhc2spKVxuICAgICAgLm90aGVyd2lzZShub3JtYWxpemVyVGFzayk7XG5cbiAgICBjb25zdCBkZWZpbml0aW9uID0gYmFzZWxpbmVQYXJhbGxlbC5uZXh0KHByb2ZpbGVDaG9pY2UpO1xuXG4gICAgLy8gNi4gU3RlcCBGdW5jdGlvbnMgU3RhdGUgTWFjaGluZVxuICAgIHRoaXMuc3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ1NjYW5Xb3JrZmxvd1N0YXRlTWFjaGluZScsIHtcbiAgICAgIHN0YXRlTWFjaGluZU5hbWU6IGBWaWJlU2lmdC1BdWRpdFdvcmtmbG93LSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgIGRlZmluaXRpb25Cb2R5OiBzZm4uRGVmaW5pdGlvbkJvZHkuZnJvbUNoYWluYWJsZShkZWZpbml0aW9uKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcbiAgICAgIGxvZ3M6IHtcbiAgICAgICAgZGVzdGluYXRpb246IHNmbkxvZ0dyb3VwLFxuICAgICAgICBsZXZlbDogc2ZuLkxvZ0xldmVsLkFMTCxcbiAgICAgIH0sXG4gICAgICB0cmFjaW5nRW5hYmxlZDogdHJ1ZSxcbiAgICB9KTtcbiAgfVxufVxuIl19