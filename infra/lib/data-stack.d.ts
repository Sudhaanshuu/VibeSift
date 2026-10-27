import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface DataStackProps extends cdk.StackProps {
    stage: string;
}
export declare class DataStack extends cdk.Stack {
    readonly kmsKey: kms.Key;
    readonly reportsBucket: s3.Bucket;
    readonly sitesTable: dynamodb.Table;
    readonly scansTable: dynamodb.Table;
    readonly findingsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DataStackProps);
}
