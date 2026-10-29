import crypto from 'node:crypto';
import { config } from '../../config/env.js';

export function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || `req_${crypto.randomBytes(6).toString('hex')}`;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const is5xx = res.statusCode >= 500;
    const is4xx = res.statusCode >= 400 && res.statusCode < 500;

    const logEntry = {
      level: is5xx ? 'ERROR' : is4xx ? 'WARN' : 'INFO',
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id || 'anonymous',
    };

    // AWS CloudWatch Embedded Metric Format (EMF)
    // Generates high-resolution custom CloudWatch metrics automatically from stdout
    if (config.cloudwatch?.emfEnabled && !req.path.startsWith('/health')) {
      const metrics = [
        { Name: 'ApiLatencyMs', Unit: 'Milliseconds' },
        { Name: 'ApiRequestCount', Unit: 'Count' },
      ];

      logEntry.ApiLatencyMs = duration;
      logEntry.ApiRequestCount = 1;

      if (is5xx) {
        metrics.push({ Name: 'Api5xxErrorCount', Unit: 'Count' });
        logEntry.Api5xxErrorCount = 1;
      }
      if (is4xx) {
        metrics.push({ Name: 'Api4xxErrorCount', Unit: 'Count' });
        logEntry.Api4xxErrorCount = 1;
      }

      logEntry._aws = {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: config.cloudwatch?.namespace || 'VibeSift/Audits',
            Dimensions: [['Method', 'StatusCode']],
            Metrics: metrics,
          },
        ],
      };
    }

    console.log(JSON.stringify(logEntry));
  });

  next();
}
