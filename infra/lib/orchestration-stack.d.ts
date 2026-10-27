import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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
    zapTaskDef: ecs.FargateTaskDefinition;
    nucleiTaskDef: ecs.FargateTaskDefinition;
    scannerSecurityGroup: ec2.SecurityGroup;
}
export declare class OrchestrationStack extends cdk.Stack {
    readonly scanQueue: sqs.Queue;
    readonly dlq: sqs.DeadLetterQueue;
    readonly stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: OrchestrationStackProps);
}
