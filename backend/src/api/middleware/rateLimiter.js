import { config } from '../../config/env.js';

// In-memory sliding window rate tracker: userId -> timestamp[]
const userScanTimestamps = new Map();

/**
 * Enforces per-user hourly and minute scan quotas
 */
export function enforceScanRateLimit(req, res, next) {
  const userId = req.user?.id || 'anonymous';
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneMinuteAgo = now - 60 * 1000;

  let timestamps = userScanTimestamps.get(userId) || [];
  // Prune older than 1 hour
  timestamps = timestamps.filter((t) => t > oneHourAgo);

  const scansLastMinute = timestamps.filter((t) => t > oneMinuteAgo).length;
  const scansLastHour = timestamps.length;

  if (scansLastMinute >= config.rateLimits.scansPerMinutePerUser) {
    return res.status(429).json({
      error: `Scan submission rate limit exceeded. Maximum ${config.rateLimits.scansPerMinutePerUser} scans per minute.`,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    });
  }

  if (scansLastHour >= config.rateLimits.scansPerHourPerUser) {
    return res.status(429).json({
      error: `Hourly scan quota exceeded. Maximum ${config.rateLimits.scansPerHourPerUser} scans per hour on your plan.`,
      code: 'QUOTA_EXCEEDED',
      statusCode: 429,
    });
  }

  timestamps.push(now);
  userScanTimestamps.set(userId, timestamps);
  next();
}
