import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __envDirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__envDirname, '../../.env') });
dotenv.config({ path: path.resolve(__envDirname, '../../../.env') });
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production' || env === 'prod';

export const config = {
  env,
  isProduction,
  port: parseInt(process.env.PORT || '4000', 10),
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',

  // Explicit dev-only demo authentication toggle
  // Must be strictly false in production
  allowDemoAuth: !isProduction && process.env.ALLOW_DEMO_AUTH === 'true',

  // Feature flags
  useLocalStorage: isProduction ? false : process.env.USE_LOCAL_STORAGE === 'true',
  useMockOrchestration: isProduction ? false : process.env.USE_MOCK_ORCHESTRATION === 'true',

  // DynamoDB tables
  tables: {
    sites: process.env.DYNAMODB_SITES_TABLE || 'VibeSift-SavedWebsites-dev',
    scans: process.env.DYNAMODB_SCANS_TABLE || 'VibeSift-Scans-dev',
    findings: process.env.DYNAMODB_FINDINGS_TABLE || 'VibeSift-Findings-dev',
  },

  // S3
  storage: {
    reportsBucket: process.env.S3_REPORTS_BUCKET || 'vibesift-audit-reports-dev-501380833083',
    presignedUrlTtlSeconds: parseInt(process.env.PRESIGNED_URL_TTL || '900', 10), // 15 mins
  },

  // SQS & Step Functions
  orchestration: {
    scanQueueUrl: process.env.SCAN_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/501380833083/vibesift-scan-jobs-dev',
    scanStateMachineArn: process.env.SCAN_SFN_ARN || '',
  },

  // Amazon Cognito
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
    issuer:
      process.env.COGNITO_ISSUER ||
      (process.env.COGNITO_USER_POOL_ID
        ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
        : ''),
    jwksUri:
      process.env.COGNITO_JWKS_URI ||
      (process.env.COGNITO_USER_POOL_ID
        ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`
        : ''),
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
    scansPerHourPerUser: parseInt(process.env.USER_HOURLY_SCAN_QUOTA || '30', 10),
    scansPerMinutePerUser: parseInt(process.env.USER_MINUTE_SCAN_QUOTA || '10', 10),
  },

  // Cloudflare Turnstile bot protection
  turnstile: {
    enabled: process.env.TURNSTILE_ENABLED === 'true',
    secretKey: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA', // Cloudflare always-pass test key
    siteKey: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA', // Cloudflare always-pass test sitekey
  },

  // CloudWatch Observability
  cloudwatch: {
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'VibeSift/Audits',
    emfEnabled: process.env.CLOUDWATCH_EMF_ENABLED !== 'false',
  },
};

/**
 * Validates that production environments do not start with insecure or missing configurations.
 * Fails safely and immediately if critical settings are absent.
 */
export function validateProductionConfig(cfg = config) {
  if (!cfg.isProduction) return;

  const errors = [];
  if (cfg.useLocalStorage) {
    errors.push('USE_LOCAL_STORAGE must be false in production');
  }
  if (cfg.useMockOrchestration) {
    errors.push('USE_MOCK_ORCHESTRATION must be false in production');
  }
  if (cfg.allowDemoAuth || process.env.ALLOW_DEMO_AUTH === 'true') {
    errors.push('ALLOW_DEMO_AUTH is strictly forbidden in production');
  }
  if (!cfg.cognito.userPoolId) {
    errors.push('COGNITO_USER_POOL_ID is required in production');
  }
  if (!cfg.cognito.clientId) {
    errors.push('COGNITO_CLIENT_ID is required in production');
  }
  if (!cfg.cognito.issuer) {
    errors.push('COGNITO_ISSUER is required in production');
  }
  if (!cfg.storage.reportsBucket) {
    errors.push('S3_REPORTS_BUCKET is required in production');
  }
  if (!cfg.tables.sites || !cfg.tables.scans || !cfg.tables.findings) {
    errors.push('DynamoDB table names (sites, scans, findings) are required in production');
  }
  if (!cfg.orchestration.scanQueueUrl) {
    errors.push('SCAN_QUEUE_URL is required in production');
  }
  if (!cfg.orchestration.scanStateMachineArn) {
    errors.push('SCAN_SFN_ARN is required in production');
  }

  if (errors.length > 0) {
    throw new Error(`Production Configuration Validation Failed:\n- ${errors.join('\n- ')}`);
  }
}

// Automatically enforce production config validation when running in production
if (config.isProduction) {
  validateProductionConfig(config);
}
