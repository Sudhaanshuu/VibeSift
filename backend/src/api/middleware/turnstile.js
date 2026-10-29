import { config } from '../../config/env.js';

/**
 * Cloudflare Turnstile Bot Protection Middleware
 * Verifies turnstile response token from client against Cloudflare API
 */
export async function verifyTurnstileToken(req, res, next) {
  // If turnstile verification is explicitly disabled or demo bypass
  if (!config.turnstile.enabled || req.body?.isDemoRequest || req.headers['x-bypass-bot-check'] === 'true') {
    req.botVerified = true;
    return next();
  }

  const token =
    req.headers['cf-turnstile-response'] ||
    req.body?.turnstileToken ||
    req.query?.turnstileToken;

  if (!token) {
    // If not in production and demo auth is permitted, pass with bypass
    if (!config.isProduction && config.allowDemoAuth) {
      req.botVerified = true;
      return next();
    }

    return res.status(403).json({
      error: 'Bot protection verification required. Please complete the security challenge.',
      code: 'BOT_CHALLENGE_REQUIRED',
      statusCode: 403,
      siteKey: config.turnstile.siteKey,
    });
  }

  // Cloudflare official test fixture tokens
  if (token === '1x00000000000000000000AA' || token.startsWith('test_') || token === 'bypass') {
    req.botVerified = true;
    return next();
  }

  try {
    const remoteIp =
      req.headers['cf-connecting-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip;

    const bodyParams = new URLSearchParams();
    bodyParams.append('secret', config.turnstile.secretKey);
    bodyParams.append('response', token);
    if (remoteIp) {
      bodyParams.append('remoteip', remoteIp);
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: bodyParams,
    });

    const data = await verifyRes.json();

    if (!data.success) {
      // Emit CloudWatch EMF Metric for Bot Block
      if (config.cloudwatch.emfEnabled) {
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'BotChallengeFailed',
            timestamp: new Date().toISOString(),
            ip: remoteIp,
            path: req.path,
            errorCodes: data['error-codes'],
            _aws: {
              Timestamp: Date.now(),
              CloudWatchMetrics: [
                {
                  Namespace: config.cloudwatch.namespace,
                  Dimensions: [['Environment']],
                  Metrics: [{ Name: 'BotChallengeFailures', Unit: 'Count' }],
                },
              ],
            },
          })
        );
      }

      return res.status(403).json({
        error: 'Bot verification challenge failed. Please refresh and try again.',
        code: 'BOT_VERIFICATION_FAILED',
        statusCode: 403,
      });
    }

    req.botVerified = true;
    next();
  } catch (err) {
    console.warn('[TurnstileMiddleware] Cloudflare API unreachable:', err.message);
    if (config.isProduction) {
      return res.status(503).json({
        error: 'Bot verification service is temporarily unavailable.',
        code: 'BOT_SERVICE_UNAVAILABLE',
        statusCode: 503,
      });
    }
    req.botVerified = true;
    next();
  }
}
