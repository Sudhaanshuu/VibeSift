#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/data-stack';
import { ComputeStack } from '../lib/compute-stack';
import { OrchestrationStack } from '../lib/orchestration-stack';
import { ApiStack } from '../lib/api-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '123456789012',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const stage = app.node.tryGetContext('stage') || 'dev';

// 1. Data Layer: DynamoDB & KMS Encrypted S3
const dataStack = new DataStack(app, `VibeSift-Data-${stage}`, {
  env,
  stage,
  description: 'VibeSift Storage: DynamoDB tables for Scans/Sites/Findings, Encrypted S3 Bucket',
});

// 2. Compute Layer: VPC, ECS Fargate Cluster, ECR Repositories, Security Groups
const computeStack = new ComputeStack(app, `VibeSift-Compute-${stage}`, {
  env,
  stage,
  reportsBucket: dataStack.reportsBucket,
  kmsKey: dataStack.kmsKey,
  description: 'VibeSift Compute: Isolated ECS Fargate Cluster, Restricted Security Groups, Worker Repos',
});
computeStack.addStackDependency(dataStack);

// 3. Orchestration Layer: SQS Queue with DLQ, Step Functions State Machine
const orchestrationStack = new OrchestrationStack(app, `VibeSift-Orchestration-${stage}`, {
  env,
  stage,
  scansTable: dataStack.scansTable,
  findingsTable: dataStack.findingsTable,
  reportsBucket: dataStack.reportsBucket,
  kmsKey: dataStack.kmsKey,
  ecsCluster: computeStack.ecsCluster,
  pythonTaskDef: computeStack.pythonInspectorTaskDef,
  lighthouseTaskDef: computeStack.lighthouseTaskDef,
  zapTaskDef: computeStack.zapTaskDef,
  nucleiTaskDef: computeStack.nucleiTaskDef,
  scannerSecurityGroup: computeStack.scannerSecurityGroup,
  description: 'VibeSift Orchestration: SQS Queue, DLQ, Step Functions Multi-Engine State Machine',
});
orchestrationStack.addStackDependency(computeStack);

// 4. API Layer: Cognito User Pool, Lambda Handlers, API Gateway HTTP API, AWS WAF
const apiStack = new ApiStack(app, `VibeSift-Api-${stage}`, {
  env,
  stage,
  scansTable: dataStack.scansTable,
  sitesTable: dataStack.sitesTable,
  findingsTable: dataStack.findingsTable,
  reportsBucket: dataStack.reportsBucket,
  kmsKey: dataStack.kmsKey,
  scanQueue: orchestrationStack.scanQueue,
  stateMachine: orchestrationStack.stateMachine,
  description: 'VibeSift API: Amazon Cognito, Node.js Lambda API, API Gateway v2, WAF',
});
apiStack.addStackDependency(orchestrationStack);

// 5. Monitoring Layer: CloudWatch Dashboard, Alarms, Budgets
new MonitoringStack(app, `VibeSift-Monitoring-${stage}`, {
  env,
  stage,
  api: apiStack.httpApi,
  stateMachine: orchestrationStack.stateMachine,
  scanQueue: orchestrationStack.scanQueue,
  dlq: orchestrationStack.dlq,
  description: 'VibeSift Observability: CloudWatch Dashboard, Failure Alarms, Billing Alerts',
});

app.synth();
