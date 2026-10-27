import crypto from 'node:crypto';

export function requestLogger(req, res, next) {
  req.id = req.headers['x-request-id'] || `req_${crypto.randomBytes(6).toString('hex')}`;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userId: req.user?.id || 'anonymous',
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
}
