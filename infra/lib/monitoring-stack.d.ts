import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
export interface MonitoringStackProps extends cdk.StackProps {
    stage: string;
    api: apigwv2.HttpApi;
    stateMachine: sfn.StateMachine;
    scanQueue: sqs.Queue;
    dlq: sqs.DeadLetterQueue;
}
export declare class MonitoringStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: MonitoringStackProps);
}
