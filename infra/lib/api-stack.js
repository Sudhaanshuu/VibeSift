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
        // 1. Amazon Cognito User Pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
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
            userPool: this.userPool,
            userPoolClientName: `vibesift-web-client-${props.stage}`,
            generateSecret: false, // SPA frontend
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
        });
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
        const authorizer = new authorizers.HttpUserPoolAuthorizer('CognitoAuthorizer', this.userPool, {
            userPoolClients: [this.userPoolClient],
        });
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
                allowOrigins: ['*'],
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
        // Catch-all Proxy Route
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxtREFBbUQ7QUFDbkQsaURBQWlEO0FBQ2pELHdEQUF3RDtBQUN4RCwwRUFBMEU7QUFDMUUsd0VBQXdFO0FBTXhFLDJDQUEyQztBQUMzQywrQ0FBK0M7QUFjL0MsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDckIsUUFBUSxDQUFtQjtJQUMzQixjQUFjLENBQXlCO0lBQ3ZDLFNBQVMsQ0FBa0I7SUFDM0IsT0FBTyxDQUFrQjtJQUV6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDO1FBRXRDLDhCQUE4QjtRQUM5QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3JELFlBQVksRUFBRSxrQkFBa0IsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUM3QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGFBQWEsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDOUIsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUMzQixjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxLQUFLO2FBQ3RCO1lBQ0QsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUNuRCxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENB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ay1saWInO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnd3YyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGF1dGhvcml6ZXJzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgd2FmdjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXdhZnYyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHN0YWdlOiBzdHJpbmc7XG4gIHNjYW5zVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICBzaXRlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgZmluZGluZ3NUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJlcG9ydHNCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAga21zS2V5OiBrbXMuS2V5O1xuICBzY2FuUXVldWU6IHNxcy5RdWV1ZTtcbiAgc3RhdGVNYWNoaW5lOiBzZm4uU3RhdGVNYWNoaW5lO1xufVxuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcbiAgcHVibGljIHJlYWRvbmx5IGFwaUxhbWJkYTogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgaHR0cEFwaTogYXBpZ3d2Mi5IdHRwQXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBpc1Byb2QgPSBwcm9wcy5zdGFnZSA9PT0gJ3Byb2QnO1xuXG4gICAgLy8gMS4gQW1hem9uIENvZ25pdG8gVXNlciBQb29sXG4gICAgdGhpcy51c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogYHZpYmVzaWZ0LXVzZXJzLSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgc2lnbkluQWxpYXNlczogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsXG4gICAgICB9LFxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxuICAgICAgcmVtb3ZhbFBvbGljeTogaXNQcm9kID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XG4gICAgICB1c2VyUG9vbDogdGhpcy51c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogYHZpYmVzaWZ0LXdlYi1jbGllbnQtJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBTUEEgZnJvbnRlbmRcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gMi4gTm9kZS5qcyBBUEkgTGFtYmRhIEZ1bmN0aW9uXG4gICAgdGhpcy5hcGlMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBcGlIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGB2aWJlc2lmdC1hcGktJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBoYW5kbGVyOiAnc3JjL2FwaS9sYW1iZGFIYW5kbGVyLmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCcuLi9iYWNrZW5kJyksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygyOSksIC8vIEFQSSBHYXRld2F5IG1heCB0aW1lb3V0IGlzIDMwc1xuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5PREVfRU5WOiBwcm9wcy5zdGFnZSxcbiAgICAgICAgQVBQX1JFR0lPTjogdGhpcy5yZWdpb24sXG4gICAgICAgIERZTkFNT0RCX1NJVEVTX1RBQkxFOiBwcm9wcy5zaXRlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgRFlOQU1PREJfU0NBTlNfVEFCTEU6IHByb3BzLnNjYW5zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBEWU5BTU9EQl9GSU5ESU5HU19UQUJMRTogcHJvcHMuZmluZGluZ3NUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFMzX1JFUE9SVFNfQlVDS0VUOiBwcm9wcy5yZXBvcnRzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgIFNDQU5fUVVFVUVfVVJMOiBwcm9wcy5zY2FuUXVldWUucXVldWVVcmwsXG4gICAgICAgIFNDQU5fU0ZOX0FSTjogcHJvcHMuc3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybixcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgQkVEUk9DS19FTkFCTEVEOiAndHJ1ZScsXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6ICdhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MCcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgTGVhc3QtUHJpdmlsZWdlIFBlcm1pc3Npb25zXG4gICAgcHJvcHMuc2l0ZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5hcGlMYW1iZGEpO1xuICAgIHByb3BzLnNjYW5zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHRoaXMuYXBpTGFtYmRhKTtcbiAgICBwcm9wcy5maW5kaW5nc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0aGlzLmFwaUxhbWJkYSk7XG4gICAgcHJvcHMucmVwb3J0c0J1Y2tldC5ncmFudFJlYWRXcml0ZSh0aGlzLmFwaUxhbWJkYSk7XG4gICAgcHJvcHMua21zS2V5LmdyYW50RW5jcnlwdERlY3J5cHQodGhpcy5hcGlMYW1iZGEpO1xuICAgIHByb3BzLnNjYW5RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh0aGlzLmFwaUxhbWJkYSk7XG4gICAgcHJvcHMuc3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24odGhpcy5hcGlMYW1iZGEpO1xuXG4gICAgLy8gR3JhbnQgQW1hem9uIEJlZHJvY2sgaW52b2NhdGlvbiBmb3Igb3B0aW9uYWwgQUkgZXhwbGFuYXRpb25zXG4gICAgdGhpcy5hcGlMYW1iZGEuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6YmVkcm9jazoke3RoaXMucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MGAsXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyAzLiBBUEkgR2F0ZXdheSBIVFRQIEFQSSAodjIpXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhdXRob3JpemVycy5IdHRwVXNlclBvb2xBdXRob3JpemVyKCdDb2duaXRvQXV0aG9yaXplcicsIHRoaXMudXNlclBvb2wsIHtcbiAgICAgIHVzZXJQb29sQ2xpZW50czogW3RoaXMudXNlclBvb2xDbGllbnRdLFxuICAgIH0pO1xuXG4gICAgdGhpcy5odHRwQXBpID0gbmV3IGFwaWd3djIuSHR0cEFwaSh0aGlzLCAnSHR0cEFwaScsIHtcbiAgICAgIGFwaU5hbWU6IGB2aWJlc2lmdC1hcGktJHtwcm9wcy5zdGFnZX1gLFxuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQXV0aG9yaXphdGlvbicsICdDb250ZW50LVR5cGUnLCAnWC1SZXF1ZXN0LUlEJywgJ0lkZW1wb3RlbmN5LUtleSddLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QQVRDSCxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmRheXMoMSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbGFtYmRhSW50ZWdyYXRpb24gPSBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTGFtYmRhSW50ZWdyYXRpb24nLCB0aGlzLmFwaUxhbWJkYSk7XG5cbiAgICAvLyBQdWJsaWMgUm91dGVzIChIZWFsdGggY2hlY2spXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9oZWFsdGgnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxhbWJkYUludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gQ2F0Y2gtYWxsIFByb3h5IFJvdXRlXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3twcm94eSt9JyxcbiAgICAgIG1ldGhvZHM6IFtcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgIGFwaWd3djIuSHR0cE1ldGhvZC5QQVRDSCxcbiAgICAgICAgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgIF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbGFtYmRhSW50ZWdyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyA0LiBBV1MgV0FGIFdlYkFDTCBmb3IgcHVibGljIEFQSSBwcm90ZWN0aW9uXG4gICAgY29uc3Qgd2ViQWNsID0gbmV3IHdhZnYyLkNmbldlYkFDTCh0aGlzLCAnQXBpV2ViQWNsJywge1xuICAgICAgbmFtZTogYHZpYmVzaWZ0LXdhZi0ke3Byb3BzLnN0YWdlfWAsXG4gICAgICBzY29wZTogJ1JFR0lPTkFMJyxcbiAgICAgIGRlZmF1bHRBY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbWV0cmljTmFtZTogYFZpYmVTaWZ0V0FGLSR7cHJvcHMuc3RhZ2V9YCxcbiAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBydWxlczogW1xuICAgICAgICAvLyBSYXRlLWJhc2VkIHJ1bGU6IE1heCA1MDAgcmVxdWVzdHMgcGVyIDUgbWludXRlcyBwZXIgSVBcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdSYXRlTGltaXRSdWxlJyxcbiAgICAgICAgICBwcmlvcml0eTogMSxcbiAgICAgICAgICBhY3Rpb246IHsgYmxvY2s6IHt9IH0sXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICByYXRlQmFzZWRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgbGltaXQ6IDUwMCxcbiAgICAgICAgICAgICAgYWdncmVnYXRlS2V5VHlwZTogJ0lQJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnUmF0ZUxpbWl0TWV0cmljJyxcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQ29tbW9uIGF0dGFjayBwcm90ZWN0aW9uIHJ1bGUgc2V0XG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnQVdTQ29tbW9uUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDIsXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0NvbW1vblJ1bGVTZXQnLFxuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTQ29tbW9uUnVsZVNldE1ldHJpYycsXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmh0dHBBcGkudXJsISxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHVibGljIEFQSSBHYXRld2F5IEVuZHBvaW50IFVSTCcsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9Vc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1hem9uIENvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0NsaWVudElkJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1hem9uIENvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==