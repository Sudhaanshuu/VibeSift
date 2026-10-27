import { Router } from 'express';
import crypto from 'node:crypto';
import { dbService } from '../../services/dynamoStorage.js';
import { sqliteStorage } from '../../services/sqliteStorage.js';
import { authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /auth/login — Developer login
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL',
        statusCode: 400,
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user = await sqliteStorage.getUserByEmail(cleanEmail);

    if (!user) {
      // Auto-create developer account if first login
      const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;
      user = await sqliteStorage.saveUser({
        id: userId,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        plan: 'verified_developer',
        createdAt: new Date().toISOString(),
      });
    }

    const token = `demo_jwt_${user.id}_${Date.now()}`;
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan || 'verified_developer',
        isDemoUser: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/signup — Developer registration
 */
authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL',
        statusCode: 400,
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const userId = `usr_${crypto.randomBytes(6).toString('hex')}`;

    const user = await sqliteStorage.saveUser({
      id: userId,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      plan: 'verified_developer',
      createdAt: new Date().toISOString(),
    });

    const token = `demo_jwt_${user.id}_${Date.now()}`;
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        isDemoUser: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me — Current session
 */
authRouter.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    let user = await sqliteStorage.getUserById(userId);
    if (!user) {
      user = {
        id: userId,
        email: req.user.email,
        name: req.user.name,
        plan: req.user.plan,
        isDemoUser: req.user.id.includes('demo'),
      };
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      isDemoUser: user.id.includes('demo'),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout — Sign out
 */
authRouter.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Successfully signed out' });
});
