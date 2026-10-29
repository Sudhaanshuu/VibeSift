import { Router } from 'express';
import {
  cognitoLogin,
  cognitoSignUp,
  cognitoConfirmSignUp,
  cognitoResendCode,
  cognitoGetUser,
  mapCognitoError,
} from '../../services/cognitoAuth.js';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../../config/env.js';

export const authRouter = Router();

/**
 * POST /auth/login — Cognito Authentication
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        error: 'Email address is required.',
        code: 'MISSING_EMAIL',
        statusCode: 400,
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Password is required.',
        code: 'MISSING_PASSWORD',
        statusCode: 400,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Isolated developer mock fallback ONLY when demo auth is explicitly enabled in non-production
    if (!config.isProduction && config.allowDemoAuth && (!config.cognito.clientId || req.body.isDemoRequest)) {
      const demoToken = `demo_dev_${Buffer.from(cleanEmail).toString('hex').slice(0, 16)}`;
      return res.json({
        token: demoToken,
        accessToken: demoToken,
        user: {
          id: `usr_${Buffer.from(cleanEmail).toString('hex').slice(0, 12)}`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          plan: 'verified_developer',
          isDemoUser: true,
        },
      });
    }

    // Live Cognito authentication
    const session = await cognitoLogin({ email: cleanEmail, password });
    return res.json(session);
  } catch (err) {
    const mapped = mapCognitoError(err);
    return res.status(mapped.statusCode).json({
      error: mapped.message,
      code: mapped.code,
      statusCode: mapped.statusCode,
      email: err.name === 'UserNotConfirmedException' ? req.body?.email?.trim().toLowerCase() : undefined,
    });
  }
});

/**
 * POST /auth/signup — Cognito User Registration
 */
authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        error: 'Email address is required.',
        code: 'MISSING_EMAIL',
        statusCode: 400,
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Password is required.',
        code: 'MISSING_PASSWORD',
        statusCode: 400,
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
        code: 'INVALID_PASSWORD',
        statusCode: 400,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Isolated developer mock fallback ONLY when demo auth is explicitly enabled in non-production
    if (!config.isProduction && config.allowDemoAuth && !config.cognito.clientId) {
      const demoToken = `demo_dev_${Buffer.from(cleanEmail).toString('hex').slice(0, 16)}`;
      return res.status(201).json({
        userConfirmed: true,
        token: demoToken,
        user: {
          id: `usr_${Buffer.from(cleanEmail).toString('hex').slice(0, 12)}`,
          email: cleanEmail,
          name: name ? String(name).trim() : cleanEmail.split('@')[0],
          plan: 'verified_developer',
          isDemoUser: true,
        },
      });
    }

    const result = await cognitoSignUp({
      email: cleanEmail,
      password,
      name,
    });

    return res.status(201).json(result);
  } catch (err) {
    const mapped = mapCognitoError(err);
    return res.status(mapped.statusCode).json({
      error: mapped.message,
      code: mapped.code,
      statusCode: mapped.statusCode,
    });
  }
});

/**
 * POST /auth/confirm — Confirm registration with verification code
 */
authRouter.post('/confirm', async (req, res, next) => {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({
        error: 'Email and verification code are required.',
        code: 'MISSING_PARAMETERS',
        statusCode: 400,
      });
    }

    const result = await cognitoConfirmSignUp({ email, code });
    return res.json(result);
  } catch (err) {
    const mapped = mapCognitoError(err);
    return res.status(mapped.statusCode).json({
      error: mapped.message,
      code: mapped.code,
      statusCode: mapped.statusCode,
    });
  }
});

/**
 * POST /auth/resend-code — Resend verification code
 */
authRouter.post('/resend-code', async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        error: 'Email address is required.',
        code: 'MISSING_EMAIL',
        statusCode: 400,
      });
    }

    const result = await cognitoResendCode({ email });
    return res.json(result);
  } catch (err) {
    const mapped = mapCognitoError(err);
    return res.status(mapped.statusCode).json({
      error: mapped.message,
      code: mapped.code,
      statusCode: mapped.statusCode,
    });
  }
});

/**
 * GET /auth/me — Current authenticated session
 */
authRouter.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7).trim();

    // If live access token and not demo user, fetch fresh Cognito profile if available
    let freshUser = null;
    if (token && !token.startsWith('demo_') && req.user.tokenUse === 'access') {
      try {
        freshUser = await cognitoGetUser(token);
      } catch {
        // Fall back to decoded token claims in req.user
      }
    }

    const user = freshUser || {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      plan: req.user.plan,
      isDemoUser: req.user.isDemoUser || false,
    };

    return res.json(user);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /auth/logout — Sign out
 */
authRouter.post('/logout', (req, res) => {
  return res.status(200).json({ message: 'Successfully signed out' });
});
