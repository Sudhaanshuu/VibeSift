import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
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
  pythonInspectorLambda?: lambda.Function;
  existingUserPoolId?: string;
  existingUserPoolClientId?: string;
}

export class ApiStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly apiLambda: lambda.Function;
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';

    // 1. Amazon Cognito Identity Configuration Strategy
    // Deliberate strategy: Import & reuse manually created Cognito resources (us-east-1_nW70Gohxd)
    // when configured to prevent duplicate user pools. Fall back to CDK-managed creation if not provided.
    const configuredUserPoolId =
      props.existingUserPoolId ||
      this.node.tryGetContext('cognitoUserPoolId') ||
      process.env.COGNITO_USER_POOL_ID;
    const configuredClientId =
      props.existingUserPoolClientId ||
      this.node.tryGetContext('cognitoClientId') ||
      process.env.COGNITO_CLIENT_ID;

    if (configuredUserPoolId && configuredClientId) {
      this.userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', configuredUserPoolId);
      this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
        this,
        'ImportedUserPoolClient',
        configuredClientId
      );
    } else {
      const managedPool = new cognito.UserPool(this, 'UserPool', {
        userPoolName: `vibesift-users-${props.stage}`,
        selfSignUpEnabled: true,
        signInAliases: { email: true },
        autoVerify: { email: true },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: false,
        },
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
        removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      });

      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: managedPool,
        userPoolClientName: `vibesift-web-client-${props.stage}`,
        generateSecret: false, // SPA frontend
        authFlows: {
          userSrp: true,
          userPassword: true,
        },
      });
      this.userPool = managedPool;
    }

    // 2. Node.js API Lambda Function
    this.apiLambda = new lambda.Function(this, 'ApiHandlerFunction', {
      functionName: `vibesift-api-${props.stage}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'src/api/lambdaHandler.handler',
      code: lambda.Code.fromAsset('../backend'),
      timeout: cdk.Duration.seconds(29), // API Gateway max timeout is 30s
      memorySize: 1024,
      environment: {
        NODE_ENV: props.stage,
        APP_REGION: this.region,
        DYNAMODB_SITES_TABLE: props.sitesTable.tableName,
        DYNAMODB_SCANS_TABLE: props.scansTable.tableName,
        DYNAMODB_FINDINGS_TABLE: props.findingsTable.tableName,
        S3_REPORTS_BUCKET: props.reportsBucket.bucketName,
        SCAN_QUEUE_URL: props.scanQueue.queueUrl,
        SCAN_SFN_ARN: props.stateMachine.stateMachineArn,
        COGNITO_USER_POOL_ID: this.userPool.userPoolId,
        COGNITO_CLIENT_ID: this.userPoolClient.userPoolClientId,
        BEDROCK_ENABLED: 'true',
        BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
    });

    // Grant Least-Privilege Permissions
    props.sitesTable.grantReadWriteData(this.apiLambda);
    props.scansTable.grantReadWriteData(this.apiLambda);
    props.findingsTable.grantReadWriteData(this.apiLambda);
    props.reportsBucket.grantReadWrite(this.apiLambda);
    props.kmsKey.grantEncryptDecrypt(this.apiLambda);
    props.scanQueue.grantSendMessages(this.apiLambda);
    props.stateMachine.grantStartExecution(this.apiLambda);

    if (props.pythonInspectorLambda) {
      props.pythonInspectorLambda.grantInvoke(this.apiLambda);
      this.apiLambda.addEnvironment('USE_LAMBDA_INSPECTOR', 'true');
      this.apiLambda.addEnvironment('LAMBDA_INSPECTOR_FUNCTION_NAME', props.pythonInspectorLambda.functionName);
    }

    // Grant Amazon Bedrock invocation for optional AI explanations
    this.apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      })
    );

    // 3. API Gateway HTTP API (v2)
    // Authorization Architecture Decision:
    // HTTP API proxies all application traffic to the Express API Lambda handler.
    // Routing & authorization are enforced inside the Express application middleware (authenticateToken):
    // - Public endpoints (/api/health, /api/auth/login, /api/auth/signup, /security.txt) remain accessible unauthenticated.
    // - Private endpoints (/api/scans, /api/sites, /api/reports, /api/artifacts/download) strictly require verified Cognito JWTs.
    // Attaching a blanket HTTP API authorizer on /{proxy+} would block public login and signup calls at the gateway.
    // The CognitoAuthorizer instance is exposed below if route-level authorizers are attached in future iterations.
    const authorizer = new authorizers.HttpUserPoolAuthorizer('CognitoAuthorizer', this.userPool, {
      userPoolClients: [this.userPoolClient],
    });

    // Restrict production CORS strictly to https://vibesift.pixir.in; permit localhost only in dev stages
    const allowedOrigins = isProd
      ? ['https://vibesift.pixir.in']
      : [
          'https://vibesift.pixir.in',
          'http://localhost:5173',
          'http://localhost:4000',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
        ];

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `vibesift-api-${props.stage}`,
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type', 'X-Request-ID', 'Idempotency-Key'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: allowedOrigins,
        maxAge: cdk.Duration.days(1),
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration('LambdaIntegration', this.apiLambda);

    // Public Routes (Health check)
    this.httpApi.addRoutes({
      path: '/api/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });
    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigwv2.HttpMethod.GET],
      integration: lambdaIntegration,
    });

    // Catch-all Proxy Route: Dispatched to Express application which enforces authentication & tenant isolation
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      integration: lambdaIntegration,
    });

    // 4. AWS WAF WebACL for public API protection
    // Note on WAF Association: AWS WAFv2 regional WebACLs cannot be directly associated with API Gateway HTTP APIs (v2).
    // In production, associate this WebACL with an Amazon CloudFront distribution fronting the API Gateway HTTP API,
    // or migrate to API Gateway REST API. The WebACL definition is maintained here for that deployment architecture.
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      name: `vibesift-waf-${props.stage}`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `VibeSiftWAF-${props.stage}`,
        sampledRequestsEnabled: true,
      },
      rules: [
        // Rate-based rule: Max 500 requests per 5 minutes per IP
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 500,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitMetric',
            sampledRequestsEnabled: true,
          },
        },
        // Common attack protection rule set
        {
          name: 'AWSCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSCommonRuleSetMetric',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.httpApi.url!,
      description: 'Public API Gateway Endpoint URL',
    });
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Amazon Cognito User Pool ID',
    });
    new cdk.CfnOutput(this, 'CognitoClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Amazon Cognito User Pool Client ID',
    });
  }
}
