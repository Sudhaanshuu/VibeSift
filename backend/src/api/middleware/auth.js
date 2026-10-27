import * as jose from 'jose';
import { config } from '../../config/env.js';

let jwks = null;
if (config.cognito.jwksUri) {
  try {
    jwks = jose.createRemoteJWKSet(new URL(config.cognito.jwksUri));
  } catch (err) {
    console.warn('[AuthMiddleware] Failed to create remote JWKS set:', err.message);
  }
} else if (config.cognito.issuer) {
  try {
    jwks = jose.createRemoteJWKSet(new URL(`${config.cognito.issuer}/.well-known/jwks.json`));
  } catch (err) {
    console.warn('[AuthMiddleware] Failed to init Cognito JWKS from issuer:', err.message);
  }
}

/**
 * Authenticates request via Amazon Cognito JWT or development demo token
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication token missing or invalid format.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  const token = authHeader.split(' ')[1].trim();

  // 1. Check for live Cognito verification
  if (jwks && config.cognito.issuer && !token.startsWith('demo_')) {
    try {
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer: config.cognito.issuer,
        audience: config.cognito.clientId || undefined,
      });

      req.user = {
        id: payload.sub,
        email: payload.email || payload['cognito:username'] || 'user@example.com',
        name: payload.name || payload.email || 'Authenticated Developer',
        plan: payload['custom:plan'] || 'free',
      };
      return next();
    } catch (err) {
      return res.status(401).json({
        error: `Cognito JWT validation failed: ${err.message}`,
        code: 'TOKEN_INVALID',
        statusCode: 401,
      });
    }
  }

  // 2. Development / Demo Token fallback
  if (config.env === 'development' || !config.cognito.userPoolId || token.startsWith('demo_')) {
    // Decode base64 or construct user context
    let userId = 'user_demo_001';
    let email = 'developer@vibesift.local';

    if (token.startsWith('demo_')) {
      userId = `user_${token.slice(5, 15)}`;
    }

    req.user = {
      id: userId,
      email,
      name: 'Demo Developer',
      plan: 'verified_developer',
    };
    return next();
  }

  return res.status(401).json({
    error: 'Invalid authentication credentials',
    code: 'UNAUTHORIZED',
    statusCode: 401,
  });
}
