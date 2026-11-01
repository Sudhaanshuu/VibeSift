import {
  SSMClient,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
} from '@aws-sdk/client-ssm';

let ssmClientInstance = null;

export function getSSMClient(region = process.env.AWS_REGION || 'us-east-1') {
  if (!ssmClientInstance) {
    try {
      ssmClientInstance = new SSMClient({ region });
    } catch (err) {
      console.warn('[SSMService] Failed to initialize SSMClient:', err.message);
    }
  }
  return ssmClientInstance;
}

export function setSSMClient(customClient) {
  ssmClientInstance = customClient;
}

/**
 * Retrieves a parameter from AWS Systems Manager Parameter Store.
 * Falls back to process.env if SSM is unavailable or in local development.
 *
 * @param {string} parameterName - e.g. '/vibesift/dev/s3_reports_bucket'
 * @param {boolean} withDecryption - true for SecureString
 * @param {string} fallbackEnvVar - optional environment variable name fallback
 * @returns {Promise<string | null>}
 */
export async function getSSMParameter(
  parameterName,
  withDecryption = false,
  fallbackEnvVar = null
) {
  // If fallback is provided and in local dev without AWS, check env first
  const envVal = fallbackEnvVar ? process.env[fallbackEnvVar] : null;

  const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
  const client = getSSMClient();

  if (!client) {
    return envVal || null;
  }

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: withDecryption,
    });
    const response = await client.send(command);
    return response.Parameter?.Value || envVal || null;
  } catch (err) {
    if (isProd) {
      console.warn(`[SSMService] Could not fetch SSM parameter "${parameterName}":`, err.message);
    }
    return envVal || null;
  }
}

/**
 * Fetches all parameters under a hierarchy path (e.g. '/vibesift/dev/')
 * @param {string} pathPrefix - e.g. '/vibesift/dev/'
 * @param {boolean} withDecryption
 * @returns {Promise<Record<string, string>>}
 */
export async function getSSMParametersByPath(pathPrefix, withDecryption = true) {
  const client = getSSMClient();
  if (!client) return {};

  const result = {};
  let nextToken = undefined;

  try {
    do {
      const command = new GetParametersByPathCommand({
        Path: pathPrefix,
        Recursive: true,
        WithDecryption: withDecryption,
        NextToken: nextToken,
      });

      const response = await client.send(command);
      for (const param of response.Parameters || []) {
        if (param.Name && param.Value) {
          // Normalize key name (remove prefix)
          const key = param.Name.replace(pathPrefix, '').replace(/^\//, '');
          result[key] = param.Value;
        }
      }
      nextToken = response.NextToken;
    } while (nextToken);
  } catch (err) {
    console.warn(`[SSMService] Failed to fetch parameters by path "${pathPrefix}":`, err.message);
  }

  return result;
}

/**
 * Stores or updates a parameter in AWS Systems Manager Parameter Store.
 * @param {string} name
 * @param {string} value
 * @param {'String' | 'StringList' | 'SecureString'} type
 * @param {string} [description]
 * @returns {Promise<boolean>}
 */
export async function putSSMParameter(name, value, type = 'String', description = '') {
  const client = getSSMClient();
  if (!client) return false;

  try {
    const command = new PutParameterCommand({
      Name: name,
      Value: value,
      Type: type,
      Description: description,
      Overwrite: true,
    });
    await client.send(command);
    return true;
  } catch (err) {
    console.error(`[SSMService] Failed to write parameter "${name}":`, err);
    return false;
  }
}
