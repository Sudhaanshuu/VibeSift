import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',

  // Feature flags
  useLocalStorage: process.env.USE_LOCAL_STORAGE === 'true' || !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_EXECUTION_ENV,
  useMockOrchestration: process.env.USE_MOCK_ORCHESTRATION === 'true' || !process.env.SCAN_SFN_ARN,

  // DynamoDB tables
  tables: {
    sites: process.env.DYNAMODB_SITES_TABLE || 'VibeSift-SavedWebsites',
    scans: process.env.DYNAMODB_SCANS_TABLE || 'VibeSift-Scans',
    findings: process.env.DYNAMODB_FINDINGS_TABLE || 'VibeSift-Findings',
  },

  // S3
  storage: {
    reportsBucket: process.env.S3_REPORTS_BUCKET || 'vibesift-audit-reports-dev',
    presignedUrlTtlSeconds: parseInt(process.env.PRESIGNED_URL_TTL || '900', 10), // 15 mins
  },

  // SQS & Step Functions
  orchestration: {
    scanQueueUrl: process.env.SCAN_QUEUE_URL || '',
    scanStateMachineArn: process.env.SCAN_SFN_ARN || '',
  },

  // Amazon Cognito
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    issuer: process.env.COGNITO_ISSUER || (process.env.COGNITO_USER_POOL_ID ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}` : ''),
    jwksUri: process.env.COGNITO_JWKS_URI || '',
  },

  // Amazon Bedrock
  bedrock: {
    enabled: process.env.BEDROCK_ENABLED === 'true',
    region: process.env.BEDROCK_REGION || 'us-east-1',
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS || '1024', 10),
    timeoutMs: parseInt(process.env.BEDROCK_TIMEOUT_MS || '8000', 10),
  },

  // Scan limits & policy
  scannerLimits: {
    maxPagesPerScan: parseInt(process.env.SCAN_MAX_PAGES || '10', 10),
    maxDepth: parseInt(process.env.SCAN_MAX_DEPTH || '2', 10),
    maxResponseSizeBytes: parseInt(process.env.SCAN_MAX_RESPONSE_SIZE || '2097152', 10), // 2MB
    requestTimeoutMs: parseInt(process.env.SCAN_REQUEST_TIMEOUT_MS || '6000', 10), // 6s
    totalJobTimeoutSeconds: parseInt(process.env.SCAN_JOB_TIMEOUT_SECONDS || '90', 10), // 90s
    requestsPerSecond: parseFloat(process.env.SCAN_RPS || '2.0'),
  },

  // Rate limits
  rateLimits: {
    scansPerHourPerUser: parseInt(process.env.USER_HOURLY_SCAN_QUOTA || '15', 10),
    scansPerMinutePerUser: parseInt(process.env.USER_MINUTE_SCAN_QUOTA || '3', 10),
  },
};
