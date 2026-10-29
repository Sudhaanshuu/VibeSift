import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as jose from 'jose';
import { config } from '../config/env.js';

let cognitoClientInstance = null;

export function getCognitoClient() {
  if (!cognitoClientInstance) {
    cognitoClientInstance = new CognitoIdentityProviderClient({
      region: config.awsRegion || 'us-east-1',
    });
  }
  return cognitoClientInstance;
}

export function setCognitoClient(customClient) {
  cognitoClientInstance = customClient;
}

/**
 * Maps Cognito Identity Provider exceptions to safe API responses.
 * Never leaks passwords or internal stack traces.
 */
export function mapCognitoError(err) {
  const name = err.name || err.__type || 'CognitoError';

  switch (name) {
    case 'NotAuthorizedException':
      return {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      };
    case 'UserNotFoundException':
      return {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Incorrect email or password.',
      };
    case 'UserNotConfirmedException':
      return {
        statusCode: 403,
        code: 'USER_NOT_CONFIRMED',
        message: 'User is not confirmed. Please enter the verification code sent to your email.',
      };
    case 'UsernameExistsException':
      return {
        statusCode: 409,
        code: 'USER_EXISTS',
        message: 'An account with this email address already exists.',
      };
    case 'InvalidPasswordException':
      return {
        statusCode: 400,
        code: 'INVALID_PASSWORD',
        message: err.message || 'Password does not meet requirements.',
      };
    case 'InvalidParameterException':
      return {
        statusCode: 400,
        code: 'INVALID_PARAMETER',
        message: err.message || 'Invalid parameters supplied.',
      };
    case 'CodeMismatchException':
      return {
        statusCode: 400,
        code: 'CODE_MISMATCH',
        message: 'Invalid verification code provided.',
      };
    case 'ExpiredCodeException':
      return {
        statusCode: 400,
        code: 'EXPIRED_CODE',
        message: 'Verification code has expired. Please request a new code.',
      };
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
      };
    case 'PasswordResetRequiredException':
      return {
        statusCode: 403,
        code: 'PASSWORD_RESET_REQUIRED',
        message: 'Password reset required.',
      };
    default:
      return {
        statusCode: 500,
        code: 'AUTH_ERROR',
        message: 'An authentication error occurred. Please try again.',
      };
  }
}

/**
 * Register a new user in AWS Cognito User Pool
 */
export async function cognitoSignUp({ email, password, name }) {
  if (!config.cognito.clientId) {
    throw new Error('COGNITO_CLIENT_ID is not configured');
  }

  const client = getCognitoClient();
  const cleanEmail = String(email).trim().toLowerCase();
  const displayName = name ? String(name).trim() : cleanEmail.split('@')[0];

  const command = new SignUpCommand({
    ClientId: config.cognito.clientId,
    Username: cleanEmail,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: cleanEmail },
      { Name: 'name', Value: displayName },
    ],
  });

  const response = await client.send(command);
  return {
    userSub: response.UserSub,
    userConfirmed: response.UserConfirmed,
    codeDeliveryDetails: response.CodeDeliveryDetails,
    email: cleanEmail,
    message: response.UserConfirmed
      ? 'Account created and verified successfully.'
      : 'Account created. Verification code sent to email.',
  };
}

/**
 * Confirm user registration using verification code
 */
export async function cognitoConfirmSignUp({ email, code }) {
  if (!config.cognito.clientId) {
    throw new Error('COGNITO_CLIENT_ID is not configured');
  }

  const client = getCognitoClient();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();

  const command = new ConfirmSignUpCommand({
    ClientId: config.cognito.clientId,
    Username: cleanEmail,
    ConfirmationCode: cleanCode,
  });

  await client.send(command);
  return {
    success: true,
    message: 'Email verified successfully. You may now log in.',
  };
}

/**
 * Resend email verification code
 */
export async function cognitoResendCode({ email }) {
  if (!config.cognito.clientId) {
    throw new Error('COGNITO_CLIENT_ID is not configured');
  }

  const client = getCognitoClient();
  const cleanEmail = String(email).trim().toLowerCase();

  const command = new ResendConfirmationCodeCommand({
    ClientId: config.cognito.clientId,
    Username: cleanEmail,
  });

  const response = await client.send(command);
  return {
    success: true,
    message: 'Verification code resent successfully.',
    codeDeliveryDetails: response.CodeDeliveryDetails,
  };
}

/**
 * Authenticate credentials via Cognito USER_PASSWORD_AUTH
 */
export async function cognitoLogin({ email, password }) {
  if (!config.cognito.clientId) {
    throw new Error('COGNITO_CLIENT_ID is not configured');
  }

  const client = getCognitoClient();
  const cleanEmail = String(email).trim().toLowerCase();

  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: config.cognito.clientId,
    AuthParameters: {
      USERNAME: cleanEmail,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);
  const authResult = response.AuthenticationResult;

  if (!authResult) {
    throw new Error('No authentication result returned from Cognito');
  }

  const accessToken = authResult.AccessToken;
  const idToken = authResult.IdToken;
  const refreshToken = authResult.RefreshToken;
  const expiresIn = authResult.ExpiresIn;

  // Extract user claims safely from ID token or access token
  let sub = '';
  let userName = cleanEmail.split('@')[0];
  let userEmail = cleanEmail;
  let userPlan = 'verified_developer';

  if (idToken) {
    try {
      const decodedId = jose.decodeJwt(idToken);
      sub = decodedId.sub || '';
      userEmail = decodedId.email || cleanEmail;
      userName = decodedId.name || decodedId.email || userName;
      userPlan = decodedId['custom:plan'] || userPlan;
    } catch {
      // fallback
    }
  }

  if (!sub && accessToken) {
    try {
      const decodedAccess = jose.decodeJwt(accessToken);
      sub = decodedAccess.sub || '';
    } catch {
      // fallback
    }
  }

  return {
    token: accessToken,
    accessToken,
    idToken,
    refreshToken,
    expiresIn,
    user: {
      id: sub || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: userEmail,
      name: userName,
      plan: userPlan,
      isDemoUser: false,
    },
  };
}

/**
 * Fetch verified user attributes from Cognito using access token
 */
export async function cognitoGetUser(accessToken) {
  const client = getCognitoClient();
  const command = new GetUserCommand({
    AccessToken: accessToken,
  });

  const response = await client.send(command);
  const attributes = {};
  for (const attr of response.UserAttributes || []) {
    attributes[attr.Name] = attr.Value;
  }

  return {
    id: attributes.sub || response.Username,
    email: attributes.email || response.Username,
    name: attributes.name || attributes.email || 'Authenticated User',
    plan: attributes['custom:plan'] || 'verified_developer',
    isDemoUser: false,
  };
}
