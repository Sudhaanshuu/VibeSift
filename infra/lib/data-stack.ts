import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {
  stage: string;
}

export class DataStack extends cdk.Stack {
  public readonly kmsKey: kms.Key;
  public readonly reportsBucket: s3.Bucket;
  public readonly sitesTable: dynamodb.Table;
  public readonly scansTable: dynamodb.Table;
  public readonly findingsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // 1. KMS Customer Managed Key
    this.kmsKey = new kms.Key(this, 'VibeSiftKey', {
      alias: `alias/vibesift-${props.stage}`,
      description: 'Customer Managed Key for VibeSift data encryption at rest',
      enableKeyRotation: true,
      removalPolicy,
    });

    // 2. S3 Audit Reports and Artifacts Bucket
    this.reportsBucket = new s3.Bucket(this, 'AuditReportsBucket', {
      bucketName: `vibesift-audit-reports-${props.stage}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: isProd,
      removalPolicy,
      autoDeleteObjects: !isProd,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'ExpireRawArtifactsAfter90Days',
          prefix: 'scans/*/raw/',
          expiration: cdk.Duration.days(90),
        },
        {
          id: 'TransitionReportsToIAfter30Days',
          prefix: 'scans/*/report.',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // 3. DynamoDB Table: SavedWebsites
    this.sitesTable = new dynamodb.Table(this, 'SavedWebsitesTable', {
      tableName: `VibeSift-SavedWebsites-${props.stage}`,
      partitionKey: { name: 'ownerUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'siteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: isProd,
      },
      removalPolicy,
    });

    this.sitesTable.addGlobalSecondaryIndex({
      indexName: 'HostnameIndex',
      partitionKey: { name: 'hostname', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 4. DynamoDB Table: Scans
    this.scansTable = new dynamodb.Table(this, 'ScansTable', {
      tableName: `VibeSift-Scans-${props.stage}`,
      partitionKey: { name: 'ownerUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: isProd,
      },
      removalPolicy,
    });

    this.scansTable.addGlobalSecondaryIndex({
      indexName: 'ScanIdIndex',
      partitionKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.scansTable.addGlobalSecondaryIndex({
      indexName: 'IdempotencyIndex',
      partitionKey: { name: 'ownerUserId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'idempotencyKey', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
    });

    // 5. DynamoDB Table: Findings
    this.findingsTable = new dynamodb.Table(this, 'FindingsTable', {
      tableName: `VibeSift-Findings-${props.stage}`,
      partitionKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: isProd,
      },
      removalPolicy,
    });

    this.findingsTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.findingsTable.addGlobalSecondaryIndex({
      indexName: 'SeverityIndex',
      partitionKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'severity', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
