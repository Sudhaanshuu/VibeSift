import express from 'express';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticateToken } from './middleware/auth.js';
import { scansRouter } from './routes/scans.js';
import { sitesRouter } from './routes/sites.js';
import { reportsRouter } from './routes/reports.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';

import { config } from '../config/env.js';

export const app = express();

// Disable X-Powered-By
app.disable('x-powered-by');

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Allowed origins: Production restricted to https://vibesift.pixir.in; localhost permitted only in development
const ALLOWED_ORIGINS = [
  'https://vibesift.pixir.in',
  ...(!config.isProduction
    ? ['http://localhost:5173', 'http://localhost:4000', 'http://localhost:3000', 'http://127.0.0.1:5173']
    : []),
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin && !config.isProduction) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (!origin && config.isProduction) {
    res.setHeader('Access-Control-Allow-Origin', 'https://vibesift.pixir.in');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, Idempotency-Key');

  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }
  next();
});

// Health check (public, unauthenticated)
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// RFC 9116 Security.txt & robots.txt (public, unauthenticated)
const securityTxtContent = `Contact: mailto:security@pixir.in\nContact: https://vibesift.pixir.in/security\nExpires: 2027-12-31T23:59:59.000Z\nPreferred-Languages: en\nCanonical: https://vibesift.pixir.in/.well-known/security.txt\nPolicy: https://vibesift.pixir.in/security\nAcknowledgments: https://vibesift.pixir.in/security#hall-of-fame\nHiring: https://pixir.in/careers\n`;

const robotsTxtContent = `User-agent: *\nAllow: /\nAllow: /methodology\nAllow: /sample-reports\nAllow: /remediation\nAllow: /privacy\nAllow: /security\nAllow: /sitemap.xml\nAllow: /.well-known/security.txt\nDisallow: /app/\nDisallow: /dashboard/\nDisallow: /settings/\nDisallow: /scans/\nDisallow: /api/\nDisallow: /auth/\nHost: vibesift.pixir.in\nSitemap: https://vibesift.pixir.in/sitemap.xml\n`;

app.get(['/.well-known/security.txt', '/security.txt'], (req, res) => {
  res.type('text/plain').send(securityTxtContent);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(robotsTxtContent);
});

// Authentication routes (public)
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

// Authenticated Routes
app.use('/scans', authenticateToken, scansRouter);
app.use('/api/scans', authenticateToken, scansRouter);

app.use('/sites', authenticateToken, sitesRouter);
app.use('/api/sites', authenticateToken, sitesRouter);

app.use('/reports', authenticateToken, reportsRouter);
app.use('/api/reports', authenticateToken, reportsRouter);

// Artifacts download endpoint (authenticated)
app.get('/api/artifacts/download', authenticateToken, (req, res, next) => {
  reportsRouter.handle(req, res, next);
});
app.get('/artifacts/download', authenticateToken, (req, res, next) => {
  reportsRouter.handle(req, res, next);
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: `Resource at ${req.method} ${req.path} was not found.`,
    code: 'ROUTE_NOT_FOUND',
    statusCode: 404,
  });
});

// Global error handler
app.use(errorHandler);
