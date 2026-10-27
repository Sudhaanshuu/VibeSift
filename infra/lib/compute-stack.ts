import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
  stage: string;
  reportsBucket: s3.Bucket;
  kmsKey: kms.Key;
}

export class ComputeStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ecsCluster: ecs.Cluster;
  public readonly scannerSecurityGroup: ec2.SecurityGroup;

  public readonly pythonRepo: ecr.Repository;
  public readonly lighthouseRepo: ecr.Repository;
  public readonly zapRepo: ecr.Repository;
  public readonly nucleiRepo: ecr.Repository;

  public readonly pythonInspectorTaskDef: ecs.FargateTaskDefinition;
  public readonly lighthouseTaskDef: ecs.FargateTaskDefinition;
  public readonly zapTaskDef: ecs.FargateTaskDefinition;
  public readonly nucleiTaskDef: ecs.FargateTaskDefinition;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';
    const region = props.env?.region || 'us-east-1';

    // 1. VPC Configuration
    // In dev, 1 NAT Gateway saves significant AWS cost (~$32/mo per NAT gateway)
    this.vpc = new ec2.Vpc(this, 'ScannerVpc', {
      availabilityZones: [`${region}a`, `${region}b`],
      natGateways: isProd ? 2 : 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'ScannerPrivate',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // 2. Restricted Security Group for Scanner Containers
    // Outbound allowed only to HTTP (80) and HTTPS (443)
    this.scannerSecurityGroup = new ec2.SecurityGroup(this, 'ScannerSecurityGroup', {
      vpc: this.vpc,
      description: 'Restrictive egress security group for scanner containers',
      allowAllOutbound: false,
    });

    this.scannerSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow outbound HTTP for public website inspection'
    );
    this.scannerSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow outbound HTTPS for public website inspection'
    );
    this.scannerSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(53),
      'Allow outbound DNS TCP'
    );
    this.scannerSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(53),
      'Allow outbound DNS UDP'
    );

    // 3. ECS Fargate Cluster
    this.ecsCluster = new ecs.Cluster(this, 'ScannerCluster', {
      vpc: this.vpc,
      clusterName: `vibesift-scanners-${props.stage}`,
      containerInsightsV2: isProd ? ecs.ContainerInsights.ENHANCED : ecs.ContainerInsights.DISABLED,
    });

    // 4. ECR Repositories with vulnerability scanning
    const createRepo = (name: string) =>
      new ecr.Repository(this, `${name}Repo`, {
        repositoryName: `vibesift/${name.toLowerCase()}-${props.stage}`,
        imageScanOnPush: true,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        emptyOnDelete: !isProd,
      });

    this.pythonRepo = createRepo('python-inspector');
    this.lighthouseRepo = createRepo('lighthouse');
    this.zapRepo = createRepo('owasp-zap');
    this.nucleiRepo = createRepo('nuclei');

    // 5. Minimal Least-Privilege IAM Roles for Scanner Tasks
    // Scanner tasks have ZERO access to DynamoDB, Secrets Manager, or user pools
    const taskRole = new iam.Role(this, 'ScannerTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Least-privilege role for scanner workers: writes raw output only to S3 prefix scans/*/raw/',
    });

    // Scope S3 write permissions to raw artifacts prefix only
    props.reportsBucket.grantPut(taskRole, 'scans/*/raw/*');
    props.kmsKey.grantEncrypt(taskRole);

    // Common Task Definitions Helper
    const createTaskDef = (id: string, cpu: number, memoryLimitMiB: number) =>
      new ecs.FargateTaskDefinition(this, id, {
        cpu,
        memoryLimitMiB,
        taskRole,
      });

    // 1. Python Inspector: 0.5 vCPU, 1 GB RAM
    this.pythonInspectorTaskDef = createTaskDef('PythonInspectorTaskDef', 512, 1024);
    this.pythonInspectorTaskDef.addContainer('python-inspector', {
      image: ecs.ContainerImage.fromEcrRepository(this.pythonRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'python-inspector' }),
      environment: {
        S3_BUCKET: props.reportsBucket.bucketName,
      },
    });

    // 2. Lighthouse: 1 vCPU, 2 GB RAM (Chromium needs more memory)
    this.lighthouseTaskDef = createTaskDef('LighthouseTaskDef', 1024, 2048);
    this.lighthouseTaskDef.addContainer('lighthouse', {
      image: ecs.ContainerImage.fromEcrRepository(this.lighthouseRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'lighthouse' }),
      environment: {
        S3_BUCKET: props.reportsBucket.bucketName,
      },
    });

    // 3. OWASP ZAP: 1 vCPU, 2 GB RAM
    this.zapTaskDef = createTaskDef('ZapTaskDef', 1024, 2048);
    this.zapTaskDef.addContainer('owasp-zap', {
      image: ecs.ContainerImage.fromEcrRepository(this.zapRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'zap' }),
      environment: {
        S3_BUCKET: props.reportsBucket.bucketName,
      },
    });

    // 4. Nuclei: 0.5 vCPU, 1 GB RAM
    this.nucleiTaskDef = createTaskDef('NucleiTaskDef', 512, 1024);
    this.nucleiTaskDef.addContainer('nuclei', {
      image: ecs.ContainerImage.fromEcrRepository(this.nucleiRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'nuclei' }),
      environment: {
        S3_BUCKET: props.reportsBucket.bucketName,
      },
    });
  }
}
