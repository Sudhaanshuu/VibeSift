"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStack = void 0;
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigwv2 = require("aws-cdk-lib/aws-apigatewayv2");
const integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const authorizers = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const iam = require("aws-cdk-lib/aws-iam");
const wafv2 = require("aws-cdk-lib/aws-wafv2");
class ApiStack extends cdk.Stack {
    userPool;
    userPoolClient;
    apiLambda;
    httpApi;
    constructor(scope, id, props) {
        super(scope, id, props);
        const isProd = props.stage === 'prod';
        // 1. Amazon Cognito Identity Configuration Strategy
        // Deliberate strategy: Import & reuse manually created Cognito resources (us-east-1_nW70Gohxd)
        // when configured to prevent duplicate user pools. Fall back to CDK-managed creation if not provided.
        const configuredUserPoolId = props.existingUserPoolId ||
            this.node.tryGetContext('cognitoUserPoolId') ||
            process.env.COGNITO_USER_POOL_ID;
        const configuredClientId = props.existingUserPoolClientId ||
            this.node.tryGetContext('cognitoClientId') ||
            process.env.COGNITO_CLIENT_ID;
        if (configuredUserPoolId && configuredClientId) {
            this.userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', configuredUserPoolId);
            this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(this, 'ImportedUserPoolClient', configuredClientId);
        }
        else {
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
        // Grant Amazon Bedrock invocation for optional AI explanations
        this.apiLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
            ],
        }));
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
            value: this.httpApi.url,
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
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxtREFBbUQ7QUFDbkQsaURBQWlEO0FBQ2pELHdEQUF3RDtBQUN4RCwwRUFBMEU7QUFDMUUsd0VBQXdFO0FBTXhFLDJDQUEyQztBQUMzQywrQ0FBK0M7QUFnQi9DLE1BQWEsUUFBUyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3JCLFFBQVEsQ0FBb0I7SUFDNUIsY0FBYyxDQUEwQjtJQUN4QyxTQUFTLENBQWtCO0lBQzNCLE9BQU8sQ0FBa0I7SUFFekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQztRQUV0QyxvREFBb0Q7UUFDcEQsK0ZBQStGO1FBQy9GLHNHQUFzRztRQUN0RyxNQUFNLG9CQUFvQixHQUN4QixLQUFLLENBQUMsa0JBQWtCO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDO1lBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUM7UUFDbkMsTUFBTSxrQkFBa0IsR0FDdEIsS0FBSyxDQUFDLHdCQUF3QjtZQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1FBRWhDLElBQUksb0JBQW9CLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ2hHLElBQUksQ0FBQyxjQUFj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d0JBQzlCLFVBQVUsRUFBRSxpQkFBaUI7d0JBQzdCLHNCQUFzQixFQUFFLElBQUk7cUJBQzdCO2lCQUNGO2dCQUNELG9DQUFvQztnQkFDcEM7b0JBQ0UsSUFBSSxFQUFFLGtCQUFrQjtvQkFDeEIsUUFBUSxFQUFFLENBQUM7b0JBQ1gsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtvQkFDNUIsU0FBUyxFQUFFO3dCQUNULHlCQUF5QixFQUFFOzRCQUN6QixJQUFJLEVBQUUsOEJBQThCOzRCQUNwQyxVQUFVLEVBQUUsS0FBSzt5QkFDbEI7cUJBQ0Y7b0JBQ0QsZ0JBQWdCLEVBQUU7d0JBQ2hCLHdCQUF3QixFQUFFLElBQUk7d0JBQzlCLFVBQVUsRUFBRSx3QkFBd0I7d0JBQ3BDLHNCQUFzQixFQUFFLElBQUk7cUJBQzdCO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBSTtZQUN4QixXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUMvQixXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO1lBQzNDLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBeE9ELDRCQXdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgKiBhcyBpbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0ICogYXMgYXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcbmltcG9ydCAqIGFzIHNmbiBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyB3YWZ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtd2FmdjInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgc3RhZ2U6IHN0cmluZztcbiAgc2NhbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHNpdGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBmaW5kaW5nc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcmVwb3J0c0J1Y2tldDogczMuQnVja2V0O1xuICBrbXNLZXk6IGttcy5LZXk7XG4gIHNjYW5RdWV1ZTogc3FzLlF1ZXVlO1xuICBzdGF0ZU1hY2hpbmU6IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIGV4aXN0aW5nVXNlclBvb2xJZD86IHN0cmluZztcbiAgZXhpc3RpbmdVc2VyUG9vbENsaWVudElkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uSVVzZXJQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uSVVzZXJQb29sQ2xpZW50O1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpTGFtYmRhOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBodHRwQXBpOiBhcGlnd3YyLkh0dHBBcGk7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGlzUHJvZCA9IHByb3BzLnN0YWdlID09PSAncHJvZCc7XG5cbiAgICAvLyAxLiBBbWF6b24gQ29nbml0byBJZGVudGl0eSBDb25maWd1cmF0aW9uIFN0cmF0ZWd5XG4gICAgLy8gRGVsaWJlcmF0ZSBzdHJhdGVneTogSW1wb3J0ICYgcmV1c2UgbWFudWFsbHkgY3JlYXRlZCBDb2duaXRvIHJlc291cmNlcyAodXMtZWFzdC0xX25XNzBHb2h4ZClcbiAgICAvLyB3aGVuIGNvbmZpZ3VyZWQgdG8gcHJldmVudCBkdXBsaWNhdGUgdXNlciBwb29scy4gRmFsbCBiYWNrIHRvIENESy1tYW5hZ2VkIGNyZWF0aW9uIGlmIG5vdCBwcm92aWRlZC5cbiAgICBjb25zdCBjb25maWd1cmVkVXNlclBvb2xJZCA9XG4gICAgICBwcm9wcy5leGlzdGluZ1VzZXJQb29sSWQgfHxcbiAgICAgIHRoaXMubm9kZS50cnlHZXRDb250ZXh0KCdjb2duaXRvVXNlclBvb2xJZCcpIHx8XG4gICAgICBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRDtcbiAgICBjb25zdCBjb25maWd1cmVkQ2xpZW50SWQgPVxuICAgICAgcHJvcHMuZXhpc3RpbmdVc2VyUG9vbENsaWVudElkIHx8XG4gICAgICB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnY29nbml0b0NsaWVudElkJykgfHxcbiAgICAgIHByb2Nlc3MuZW52LkNPR05JVE9fQ0xJRU5UX0lEO1xuXG4gICAgaWYgKGNvbmZpZ3VyZWRVc2VyUG9vbElkICYmIGNvbmZpZ3VyZWRDbGllbnRJZCkge1xuICAgICAgdGhpcy51c2VyUG9vbCA9IGNvZ25pdG8uVXNlclBvb2wuZnJvbVVzZXJQb29sSWQodGhpcywgJ0ltcG9ydGVkVXNlclBvb2wnLCBjb25maWd1cmVkVXNlclBvb2xJZCk7XG4gICAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gY29nbml0by5Vc2VyUG9vbENsaWVudC5mcm9tVXNlclBvb2xDbGllbnRJZChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgJ0ltcG9ydGVkVXNlclBvb2xDbGllbnQnLFxuICAgICAgICBjb25maWd1cmVkQ2xpZW50SWRcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG1hbmFnZWRQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xuICAgICAgICB1c2VyUG9vbE5hbWU6IGB2aWJlc2lmdC11c2Vycy0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXG4gICAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcbiAgICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGlzUHJvZCA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgICAgdGhpcy51c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgICAgdXNlclBvb2w6IG1hbmFnZWRQb29sLFxuICAgICAgICB1c2VyUG9vbENsaWVudE5hbWU6IGB2aWJlc2lmdC13ZWItY2xpZW50LSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBTUEEgZnJvbnRlbmRcbiAgICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIHRoaXMudXNlclBvb2wgPSBtYW5hZ2VkUG9vbDtcbiAgICB9XG5cbiAgICAvLyAyLiBOb2RlLmpzIEFQSSBMYW1iZGEgRnVuY3Rpb25cbiAgICB0aGlzLmFwaUxhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FwaUhhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYHZpYmVzaWZ0LWFwaS0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGhhbmRsZXI6ICdzcmMvYXBpL2xhbWJkYUhhbmRsZXIuaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJy4uL2JhY2tlbmQnKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDI5KSwgLy8gQVBJIEdhdGV3YXkgbWF4IHRpbWVvdXQgaXMgMzBzXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTk9ERV9FTlY6IHByb3BzLnN0YWdlLFxuICAgICAgICBBUFBfUkVHSU9OOiB0aGlzLnJlZ2lvbixcbiAgICAgICAgRFlOQU1PREJfU0lURVNfVEFCTEU6IHByb3BzLnNpdGVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBEWU5BTU9EQl9TQ0FOU19UQUJMRTogcHJvcHMuc2NhbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIERZTkFNT0RCX0ZJTkRJTkdTX1RBQkxFOiBwcm9wcy5maW5kaW5nc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUzNfUkVQT1JUU19CVUNLRVQ6IHByb3BzLnJlcG9ydHNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgU0NBTl9RVUVVRV9VUkw6IHByb3BzLnNjYW5RdWV1ZS5xdWV1ZVVybCxcbiAgICAgICAgU0NBTl9TRk5fQVJOOiBwcm9wcy5zdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBCRURST0NLX0VOQUJMRUQ6ICd0cnVlJyxcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogJ2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMZWFzdC1Qcml2aWxlZ2UgUGVybWlzc2lvbnNcbiAgICBwcm9wcy5zaXRlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0aGlzLmFwaUxhbWJkYSk7XG4gICAgcHJvcHMuc2NhbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5hcGlMYW1iZGEpO1xuICAgIHByb3BzLmZpbmRpbmdzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHRoaXMuYXBpTGFtYmRhKTtcbiAgICBwcm9wcy5yZXBvcnRzQnVja2V0LmdyYW50UmVhZFdyaXRlKHRoaXMuYXBpTGFtYmRhKTtcbiAgICBwcm9wcy5rbXNLZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdCh0aGlzLmFwaUxhbWJkYSk7XG4gICAgcHJvcHMuc2NhblF1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKHRoaXMuYXBpTGFtYmRhKTtcbiAgICBwcm9wcy5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih0aGlzLmFwaUxhbWJkYSk7XG5cbiAgICAvLyBHcmFudCBBbWF6b24gQmVkcm9jayBpbnZvY2F0aW9uIGZvciBvcHRpb25hbCBBSSBleHBsYW5hdGlvbnNcbiAgICB0aGlzLmFwaUxhbWJkYS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFsnYmVkcm9jazpJbnZva2VNb2RlbCddLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgYXJuOmF3czpiZWRyb2NrOiR7dGhpcy5yZWdpb259Ojpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowYCxcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIDMuIEFQSSBHYXRld2F5IEhUVFAgQVBJICh2MilcbiAgICAvLyBBdXRob3JpemF0aW9uIEFyY2hpdGVjdHVyZSBEZWNpc2lvbjpcbiAgICAvLyBIVFRQIEFQSSBwcm94aWVzIGFsbCBhcHBsaWNhdGlvbiB0cmFmZmljIHRvIHRoZSBFeHByZXNzIEFQSSBMYW1iZGEgaGFuZGxlci5cbiAgICAvLyBSb3V0aW5nICYgYXV0aG9yaXphdGlvbiBhcmUgZW5mb3JjZWQgaW5zaWRlIHRoZSBFeHByZXNzIGFwcGxpY2F0aW9uIG1pZGRsZXdhcmUgKGF1dGhlbnRpY2F0ZVRva2VuKTpcbiAgICAvLyAtIFB1YmxpYyBlbmRwb2ludHMgKC9hcGkvaGVhbHRoLCAvYXBpL2F1dGgvbG9naW4sIC9hcGkvYXV0aC9zaWdudXAsIC9zZWN1cml0eS50eHQpIHJlbWFpbiBhY2Nlc3NpYmxlIHVuYXV0aGVudGljYXRlZC5cbiAgICAvLyAtIFByaXZhdGUgZW5kcG9pbnRzICgvYXBpL3NjYW5zLCAvYXBpL3NpdGVzLCAvYXBpL3JlcG9ydHMsIC9hcGkvYXJ0aWZhY3RzL2Rvd25sb2FkKSBzdHJpY3RseSByZXF1aXJlIHZlcmlmaWVkIENvZ25pdG8gSldUcy5cbiAgICAvLyBBdHRhY2hpbmcgYSBibGFua2V0IEhUVFAgQVBJIGF1dGhvcml6ZXIgb24gL3twcm94eSt9IHdvdWxkIGJsb2NrIHB1YmxpYyBsb2dpbiBhbmQgc2lnbnVwIGNhbGxzIGF0IHRoZSBnYXRld2F5LlxuICAgIC8vIFRoZSBDb2duaXRvQXV0aG9yaXplciBpbnN0YW5jZSBpcyBleHBvc2VkIGJlbG93IGlmIHJvdXRlLWxldmVsIGF1dGhvcml6ZXJzIGFyZSBhdHRhY2hlZCBpbiBmdXR1cmUgaXRlcmF0aW9ucy5cbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGF1dGhvcml6ZXJzLkh0dHBVc2VyUG9vbEF1dGhvcml6ZXIoJ0NvZ25pdG9BdXRob3JpemVyJywgdGhpcy51c2VyUG9vbCwge1xuICAgICAgdXNlclBvb2xDbGllbnRzOiBbdGhpcy51c2VyUG9vbENsaWVudF0sXG4gICAgfSk7XG5cbiAgICAvLyBSZXN0cmljdCBwcm9kdWN0aW9uIENPUlMgc3RyaWN0bHkgdG8gaHR0cHM6Ly92aWJlc2lmdC5waXhpci5pbjsgcGVybWl0IGxvY2FsaG9zdCBvbmx5IGluIGRldiBzdGFnZXNcbiAgICBjb25zdCBhbGxvd2VkT3JpZ2lucyA9IGlzUHJvZFxuICAgICAgPyBbJ2h0dHBzOi8vdmliZXNpZnQucGl4aXIuaW4nXVxuICAgICAgOiBbXG4gICAgICAgICAgJ2h0dHBzOi8vdmliZXNpZnQucGl4aXIuaW4nLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjQwMDAnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgICdodHRwOi8vMTI3LjAuMC4xOjUxNzMnLFxuICAgICAgICBdO1xuXG4gICAgdGhpcy5odHRwQXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnSHR0cEFwaScsIHtcbiAgICAgIGFwaU5hbWU6IGB2aWJlc2lmdC1hcGktJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQXV0aG9yaXphdGlvbicsICdDb250ZW50LVR5cGUnLCAnWC1SZXF1ZXN0LUlEJywgJ0lkZW1wb3RlbmN5LUtleSddLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QQVRDSCxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93T3JpZ2luczogYWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbGFtYmRhSW50ZWdyYXRpb24gPSBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTGFtYmRhSW50ZWdyYXRpb24nLCB0aGlzLmFwaUxhbWJkYSk7XG5cbiAgICAvLyBQdWJsaWMgUm91dGVzIChIZWFsdGggY2hlY2spXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gQ2F0Y2gtYWxsIFByb3h5IFJvdXRlOiBEaXNwYXRjaGVkIHRvIEV4cHJlc3MgYXBwbGljYXRpb24gd2hpY2ggZW5mb3JjZXMgYXV0aGVudGljYXRpb24gJiB0ZW5hbnQgaXNvbGF0aW9uXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3twcm94eSt9JyxcbiAgICAgIG1ldGhvZHM6IFtcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCxcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgIF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbGFtYmRhSW50ZWdyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyA0LiBBV1MgV0FGIFdlYkFDTCBmb3IgcHVibGljIEFQSSBwcm90ZWN0aW9uXG4gICAgLy8gTm90ZSBvbiBXQUYgQXNzb2NpYXRpb246IEFXUyBXQUZ2MiByZWdpb25hbCBXZWJBQ0xzIGNhbm5vdCBiZSBkaXJlY3RseSBhc3NvY2lhdGVkIHdpdGggQVBJIEdhdGV3YXkgSFRUUCBBUElzICh2MikuXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgYXNzb2NpYXRlIHRoaXMgV2ViQUNMIHdpdGggYW4gQW1hem9uIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZyb250aW5nIHRoZSBBUEkgR2F0ZXdheSBIVFRQIEFQSSxcbiAgICAvLyBvciBtaWdyYXRlIHRvIEFQSSBHYXRld2F5IFJFU1QgQVBJLiBUaGUgV2ViQUNMIGRlZmluaXRpb24gaXMgbWFpbnRhaW5lZCBoZXJlIGZvciB0aGF0IGRlcGxveW1lbnQgYXJjaGl0ZWN0dXJlLlxuICAgIGNvbnN0IHdlYkFjbCA9IG5ldyB3YWZ2Mi5DZm5XZWJBQ0wodGhpcywgJ0FwaVdlYkFjbCcsIHtcbiAgICAgIG5hbWU6IGB2aWJlc2lmdC13YWYtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgc2NvcGU6ICdSRUdJT05BTCcsXG4gICAgICBkZWZhdWx0QWN0aW9uOiB7IGFsbG93OiB7fSB9LFxuICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIG1ldHJpY05hbWU6IGBWaWJlU2lmdFdBRi0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgICAgcnVsZXM6IFtcbiAgICAgICAgLy8gUmF0ZS1iYXNlZCBydWxlOiBNYXggNTAwIHJlcXVlc3RzIHBlciA1IG1pbnV0ZXMgcGVyIElQXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnUmF0ZUxpbWl0UnVsZScsXG4gICAgICAgICAgcHJpb3JpdHk6IDEsXG4gICAgICAgICAgYWN0aW9uOiB7IGJsb2NrOiB7fSB9LFxuICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgcmF0ZUJhc2VkU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIGxpbWl0OiA1MDAsXG4gICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1JhdGVMaW1pdE1ldHJpYycsXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIENvbW1vbiBhdHRhY2sgcHJvdGVjdGlvbiBydWxlIHNldFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0FXU0NvbW1vblJ1bGVTZXQnLFxuICAgICAgICAgIHByaW9yaXR5OiAyLFxuICAgICAgICAgIG92ZXJyaWRlQWN0aW9uOiB7IG5vbmU6IHt9IH0sXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXU0NvbW1vblJ1bGVTZXRNZXRyaWMnLFxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRW5kcG9pbnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5odHRwQXBpLnVybCEsXG4gICAgICBkZXNjcmlwdGlvbjogJ1B1YmxpYyBBUEkgR2F0ZXdheSBFbmRwb2ludCBVUkwnLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FtYXpvbiBDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9DbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FtYXpvbiBDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=