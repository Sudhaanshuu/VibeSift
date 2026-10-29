import * as jose from 'jose';
import { config } from '../../config/env.js';

let customJwksProvider = null;
let remoteJwksProvider = null;

export function getJwks() {
  if (customJwksProvider) {
    return customJwksProvider;
  }
  if (!remoteJwksProvider) {
    const jwksUrl = config.cognito.jwksUri || (config.cognito.issuer ? `${config.cognito.issuer}/.well-known/jwks.json` : null);
    if (jwksUrl) {
      try {
        remoteJwksProvider = jose.createRemoteJWKSet(new URL(jwksUrl));
      } catch (err) {
        console.warn('[AuthMiddleware] Failed to initialize Cognito JWKS set:', err.message);
      }
    }
  }
  return remoteJwksProvider;
}

export function setJwks(jwks) {
  customJwksProvider = jwks;
}

/**
 * Authenticates requests via Amazon Cognito JWT.
 * Development demo tokens are strictly isolated and rejected in production.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication token missing or invalid format.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Authentication token is empty.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  // 1. Strict demo token check
  if (token.startsWith('demo_')) {
    // Production NEVER permits demo tokens
    if (config.isProduction) {
      return res.status(401).json({
        error: 'Demo tokens are strictly forbidden in production.',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    }

    // Development only allows demo tokens if explicitly enabled
    if (config.allowDemoAuth) {
      const sanitizedId = token.slice(5).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
      req.user = {
        id: sanitizedId ? `usr_${sanitizedId}` : 'usr_dev_default',
        email: 'developer@vibesift.local',
        name: 'Demo Developer',
        plan: 'verified_developer',
        isDemoUser: true,
      };
      return next();
    }

    return res.status(401).json({
      error: 'Demo authentication is disabled in current configuration.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  // 2. Validate live Amazon Cognito JWT
  const jwks = getJwks();

  if (!jwks || !config.cognito.issuer) {
    return res.status(401).json({
      error: 'Cognito authentication service is unavailable or misconfigured.',
      code: 'AUTH_UNAVAILABLE',
      statusCode: 401,
    });
  }

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: config.cognito.issuer,
    });

    // Validate token_use
    const tokenUse = payload.token_use;
    if (tokenUse !== 'access' && tokenUse !== 'id') {
      return res.status(401).json({
        error: 'Invalid token_use claim: expected "access" or "id".',
        code: 'TOKEN_INVALID',
        statusCode: 401,
      });
    }

    // Validate client audience / client_id claim against configured App Client ID
    if (config.cognito.clientId) {
      if (tokenUse === 'access') {
        if (payload.client_id !== config.cognito.clientId) {
          return res.status(401).json({
            error: 'Cognito token client_id does not match configured App Client ID.',
            code: 'TOKEN_INVALID',
            statusCode: 401,
          });
        }
      } else if (tokenUse === 'id') {
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(config.cognito.clientId)) {
          return res.status(401).json({
            error: 'Cognito token audience does not match configured App Client ID.',
            code: 'TOKEN_INVALID',
            statusCode: 401,
          });
        }
      }
    }

    if (!payload.sub) {
      return res.status(401).json({
        error: 'Missing subject claim in token.',
        code: 'TOKEN_INVALID',
        statusCode: 401,
      });
    }

    // Derive immutable user identity strictly from verified token claims
    const userEmail = payload.email || payload.username || payload['cognito:username'] || payload.sub;
    const userName = payload.name || payload.email || 'Authenticated User';
    const userPlan = payload['custom:plan'] || 'verified_developer';

    req.user = {
      id: payload.sub,
      email: userEmail,
      name: userName,
      plan: userPlan,
      isDemoUser: false,
      tokenUse,
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
