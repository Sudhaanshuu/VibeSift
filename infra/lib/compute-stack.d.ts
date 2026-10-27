import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
export interface ComputeStackProps extends cdk.StackProps {
    stage: string;
    reportsBucket: s3.Bucket;
    kmsKey: kms.Key;
}
export declare class ComputeStack extends cdk.Stack {
    readonly vpc: ec2.Vpc;
    readonly ecsCluster: ecs.Cluster;
    readonly scannerSecurityGroup: ec2.SecurityGroup;
    readonly pythonRepo: ecr.Repository;
    readonly lighthouseRepo: ecr.Repository;
    readonly zapRepo: ecr.Repository;
    readonly nucleiRepo: ecr.Repository;
    readonly pythonInspectorTaskDef: ecs.FargateTaskDefinition;
    readonly lighthouseTaskDef: ecs.FargateTaskDefinition;
    readonly zapTaskDef: ecs.FargateTaskDefinition;
    readonly nucleiTaskDef: ecs.FargateTaskDefinition;
    constructor(scope: Construct, id: string, props: ComputeStackProps);
}
