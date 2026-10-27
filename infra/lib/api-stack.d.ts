import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
export interface ApiStackProps extends cdk.StackProps {
    stage: string;
    scansTable: dynamodb.Table;
    sitesTable: dynamodb.Table;
    findingsTable: dynamodb.Table;
    reportsBucket: s3.Bucket;
    kmsKey: kms.Key;
    scanQueue: sqs.Queue;
    stateMachine: sfn.StateMachine;
}
export declare class ApiStack extends cdk.Stack {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly apiLambda: lambda.Function;
    readonly httpApi: apigwv2.HttpApi;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
