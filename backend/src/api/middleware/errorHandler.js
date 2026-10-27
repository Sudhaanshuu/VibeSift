import { SSRFProtectionError } from '../../services/ssrfGuard.js';
import { DomainVerificationError } from '../../services/domainVerification.js';
import { InvalidStateTransitionError } from '../../services/scanStateService.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // SSRF Protection violation
  if (err instanceof SSRFProtectionError) {
    return res.status(400).json({
      error: err.message,
      code: err.code || 'SSRF_BLOCKED',
      statusCode: 400,
    });
  }

  // Domain Verification error
  if (err instanceof DomainVerificationError) {
    return res.status(400).json({
      error: err.message,
      code: err.code || 'VERIFICATION_ERROR',
      statusCode: 400,
    });
  }

  // Invalid state transition
  if (err instanceof InvalidStateTransitionError) {
    return res.status(409).json({
      error: err.message,
      code: 'INVALID_STATE_TRANSITION',
      statusCode: 409,
    });
  }

  // Zod request schema validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Request validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: err.flatten(),
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // Structured logging
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode,
    errorCode: code,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  }));

  // Never leak internal stack trace or AWS internals in production
  const message = statusCode === 500 && process.env.NODE_ENV !== 'development'
    ? 'An unexpected error occurred while processing your request.'
    : err.message;

  res.status(statusCode).json({
    error: message,
    code,
    statusCode,
  });
}
