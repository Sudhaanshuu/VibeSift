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

    res.json({
      ...scan,
      findings,
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
 * GET /artifacts/download (used for local presigned download mock)
 */
reportsRouter.get('/download', async (req, res, next) => {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).send('Missing artifact key');
    }

    const content = await s3Service.getObjectContent(String(key));
    if (!content) {
      return res.status(404).send('Artifact not found');
    }

    res.setHeader('Content-Type', key.endsWith('.json') ? 'application/json' : 'text/markdown');
    res.send(content);
  } catch (err) {
    next(err);
  }
});
