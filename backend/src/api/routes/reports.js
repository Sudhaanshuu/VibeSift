import { Router } from 'express';
import { dbService } from '../../services/dynamoStorage.js';
import { s3Service } from '../../services/s3Storage.js';
import { VerificationStatusEnum } from '../../types/index.js';

export const reportsRouter = Router();

/**
 * GET /reports/:scanId (matches frontend getReport)
 */
reportsRouter.get('/:scanId', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Audit report "${scanId}" does not exist.`,
        code: 'REPORT_NOT_FOUND',
        statusCode: 404,
      });
    }

    const findings = await dbService.getFindingsByScan(scanId);

    // Attempt to load finalized report from S3 artifacts
    let s3Report = null;
    try {
      const rawReport = await s3Service.getObjectContent(`scans/${scanId}/report.json`);
      if (rawReport) {
        s3Report = JSON.parse(rawReport);
      }
    } catch {
      // S3 read failed or file not present, continue with scan data
    }

    const mergedSummary = {
      ...(scan.summary || {}),
      ...(s3Report?.summary || {}),
    };

    res.json({
      ...scan,
      ...(s3Report || {}),
      findings: findings.length > 0 ? findings : (s3Report?.findings || []),
      checks: s3Report?.checks || scan.checks || [],
      privacyCompliance: s3Report?.privacyCompliance || scan.privacyCompliance || null,
      deepComparison: s3Report?.deepComparison || scan.deepComparison || null,
      summary: mergedSummary,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /reports/:scanId/findings/:findingId (matches frontend resolveFinding)
 */
reportsRouter.patch('/:scanId/findings/:findingId', async (req, res, next) => {
  try {
    const { scanId, findingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Verify scan ownership
    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Scan "${scanId}" was not found.`,
        code: 'REPORT_NOT_FOUND',
        statusCode: 404,
      });
    }

    const validStatus = VerificationStatusEnum.parse(status);
    const updated = await dbService.updateFindingStatus(scanId, findingId, validStatus);

    if (!updated) {
      return res.status(404).json({
        error: `Finding "${findingId}" could not be found or updated.`,
        code: 'FINDING_NOT_FOUND',
        statusCode: 404,
      });
    }

    res.json({
      findingId,
      status: validStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /artifacts/download (used for local/private artifact download)
 * Enforces authentication and multi-tenant scan ownership.
 */
reportsRouter.get('/download', async (req, res, next) => {
  try {
    const rawKey = req.query.key;
    if (!rawKey || typeof rawKey !== 'string') {
      return res.status(400).json({
        error: 'Missing artifact key parameter.',
        code: 'MISSING_KEY',
        statusCode: 400,
      });
    }

    const key = String(rawKey).trim();

    // Prevent path traversal and enforce key prefix
    if (key.includes('..') || !key.startsWith('scans/')) {
      return res.status(400).json({
        error: 'Invalid artifact key.',
        code: 'INVALID_KEY',
        statusCode: 400,
      });
    }

    // Extract scanId from key format "scans/:scanId/..."
    const parts = key.split('/');
    const scanId = parts[1];
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required to download artifacts.',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    }

    // Enforce multi-tenant scan ownership
    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: 'Artifact not found or unauthorized.',
        code: 'ARTIFACT_NOT_FOUND',
        statusCode: 404,
      });
    }

    const content = await s3Service.getObjectContent(key);
    if (!content) {
      return res.status(404).json({
        error: 'Artifact file not found in storage.',
        code: 'ARTIFACT_NOT_FOUND',
        statusCode: 404,
      });
    }

    res.setHeader('Content-Type', key.endsWith('.json') ? 'application/json' : 'text/markdown');
    res.send(content);
  } catch (err) {
    next(err);
  }
});
