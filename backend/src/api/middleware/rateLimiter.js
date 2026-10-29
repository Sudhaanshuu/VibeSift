import { config } from '../../config/env.js';

// In-memory sliding window rate tracker: identifier -> timestamp[]
const rateLimitTracker = new Map();

/**
 * Returns current usage statistics for a user or IP
 */
export function getUsageStats(identifier) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneMinuteAgo = now - 60 * 1000;

  let timestamps = rateLimitTracker.get(identifier) || [];
  // Prune entries older than 1 hour
  timestamps = timestamps.filter((t) => t > oneHourAgo);
  rateLimitTracker.set(identifier, timestamps);

  const scansLastMinute = timestamps.filter((t) => t > oneMinuteAgo).length;
  const scansLastHour = timestamps.length;

  const hourlyLimit = config.rateLimits.scansPerHourPerUser;
  const minuteLimit = config.rateLimits.scansPerMinutePerUser;

  const hourlyRemaining = Math.max(0, hourlyLimit - scansLastHour);
  const minuteRemaining = Math.max(0, minuteLimit - scansLastMinute);

  const oldestTimestamp = timestamps[0] || now;
  const resetInSeconds = Math.max(1, Math.ceil((oldestTimestamp + 3600000 - now) / 1000));

  return {
    hourlyLimit,
    hourlyRemaining,
    minuteLimit,
    minuteRemaining,
    resetInSeconds,
    scansLastHour,
    scansLastMinute,
  };
}

/**
 * Enforces per-user hourly and minute scan quotas and attaches visible rate limit headers
 */
export function enforceScanRateLimit(req, res, next) {
  const identifier = req.user?.id || req.headers['x-forwarded-for'] || req.ip || 'anonymous';
  const stats = getUsageStats(identifier);

  // Set visible standard RateLimit response headers
  res.setHeader('X-RateLimit-Limit', stats.hourlyLimit);
  res.setHeader('X-RateLimit-Remaining', stats.hourlyRemaining);
  res.setHeader('X-RateLimit-Reset', stats.resetInSeconds);
  res.setHeader('X-RateLimit-Minute-Limit', stats.minuteLimit);
  res.setHeader('X-RateLimit-Minute-Remaining', stats.minuteRemaining);

  // Minute-level burst throttle check
  if (stats.minuteRemaining <= 0) {
    emitRateLimitCloudWatchMetric('MinuteRateLimitHit', req, identifier);
    return res.status(429).json({
      error: `Minute rate limit reached. Maximum ${stats.minuteLimit} scans per minute. Please wait a few moments.`,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      quota: {
        minuteLimit: stats.minuteLimit,
        minuteRemaining: 0,
        retryAfterSeconds: 60,
      },
    });
  }

  // Hourly quota check
  if (stats.hourlyRemaining <= 0) {
    emitRateLimitCloudWatchMetric('HourlyQuotaHit', req, identifier);
    return res.status(429).json({
      error: `Hourly scan quota reached. Maximum ${stats.hourlyLimit} scans per hour on your developer plan.`,
      code: 'QUOTA_EXCEEDED',
      statusCode: 429,
      quota: {
        hourlyLimit: stats.hourlyLimit,
        hourlyRemaining: 0,
        resetInSeconds: stats.resetInSeconds,
      },
    });
  }

  // Record this scan in the window
  const timestamps = rateLimitTracker.get(identifier) || [];
  timestamps.push(Date.now());
  rateLimitTracker.set(identifier, timestamps);

  next();
}

/**
 * Controller to fetch active scan quota for the current authenticated user
 */
export function getScanQuota(req, res) {
  const identifier = req.user?.id || req.headers['x-forwarded-for'] || req.ip || 'anonymous';
  const stats = getUsageStats(identifier);

  res.json({
    hourlyLimit: stats.hourlyLimit,
    hourlyRemaining: stats.hourlyRemaining,
    minuteLimit: stats.minuteLimit,
    minuteRemaining: stats.minuteRemaining,
    resetInSeconds: stats.resetInSeconds,
    status: stats.hourlyRemaining > 0 ? 'available' : 'exhausted',
    plan: req.user?.plan || 'verified_developer',
  });
}

function emitRateLimitCloudWatchMetric(metricName, req, identifier) {
  if (config.cloudwatch?.emfEnabled) {
    console.log(
      JSON.stringify({
        level: 'WARN',
        event: metricName,
        timestamp: new Date().toISOString(),
        identifier,
        path: req.path,
        _aws: {
          Timestamp: Date.now(),
          CloudWatchMetrics: [
            {
              Namespace: config.cloudwatch?.namespace || 'VibeSift/Audits',
              Dimensions: [['Environment']],
              Metrics: [{ Name: 'RateLimitBlockedRequests', Unit: 'Count' }],
            },
          ],
        },
      })
    );
  }
}
