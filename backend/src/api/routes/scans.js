import { Router } from 'express';
import crypto from 'node:crypto';
import { dbService } from '../../services/dynamoStorage.js';
import { s3Service } from '../../services/s3Storage.js';
import { validateAndNormalizeUrl, resolveAndValidateHost } from '../../services/ssrfGuard.js';
import { matchesVerifiedDomain } from '../../services/domainVerification.js';
import { assertTransition } from '../../services/scanStateService.js';
import { ScanSubmissionPayloadSchema } from '../../types/index.js';
import { enforceScanRateLimit } from '../middleware/rateLimiter.js';
import { startScanWorkflow } from '../../orchestration/workflowHandler.js';

export const scansRouter = Router();

/**
 * POST /scans (or /api/scans) — Submit a new website audit scan
 */
scansRouter.post('/', enforceScanRateLimit, async (req, res, next) => {
  try {
    const payload = ScanSubmissionPayloadSchema.parse(req.body);
    const userId = req.user.id;

    // 1. SSRF Validation: Normalize URL, check scheme, credentials, ports, and DNS
    const validated = validateAndNormalizeUrl(payload.url);
    await resolveAndValidateHost(validated.hostname);

    // 2. Check Idempotency & Cached Site Scans
    const idempotencyKey = payload.idempotencyKey || req.headers['idempotency-key'];
    if (idempotencyKey) {
      const existingScan = await dbService.getScanByIdempotencyKey(userId, idempotencyKey);
      if (existingScan) {
        return res.status(200).json({
          scanId: existingScan.scanId,
          status: existingScan.status,
          targetUrl: existingScan.targetUrl,
          createdAt: existingScan.createdAt,
          isDuplicate: true,
        });
      }
    }

    // Check if user requested existing cached scan for the same site
    if (req.body.useCached === true || req.query.useCached === 'true') {
      const latestExisting = await dbService.getLatestScanForSite(validated.hostname, userId);
      if (latestExisting && latestExisting.status === 'COMPLETED') {
        return res.status(200).json({
          scanId: latestExisting.scanId,
          status: latestExisting.status,
          targetUrl: latestExisting.targetUrl,
          createdAt: latestExisting.createdAt,
          isCached: true,
          summary: latestExisting.summary,
        });
      }
    }

    // 3. Authorization check for deep security scan
    if (payload.profile === 'authorized_deep') {
      const userSites = await dbService.listSitesByUser(userId);
      const isDomainVerified = userSites.some(
        (site) => site.isVerified && matchesVerifiedDomain(validated.hostname, site.hostname)
      );

      if (!isDomainVerified) {
        return res.status(403).json({
          error: `Authorized deep security scanning requires verified domain ownership for '${validated.hostname}'. Please verify domain control in Sites settings before submitting.`,
          code: 'DOMAIN_NOT_VERIFIED',
          statusCode: 403,
          requiredAction: 'VERIFY_DOMAIN',
        });
      }
    }

    // Check previous scan of the same site for comparison
    const previousScan = await dbService.getLatestScanForSite(validated.hostname, userId);

    // 4. Create Scan Record in DynamoDB / SQLite
    const scanId = `scn_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const scanRecord = {
      scanId,
      ownerUserId: userId,
      targetUrl: validated.normalizedUrl,
      normalizedHostname: validated.hostname,
      scanProfile: payload.profile,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
      idempotencyKey,
      enginesRun: [],
      checksNotPerformed: [],
      previousScanId: previousScan?.scanId || null,
      previousScore: previousScan?.summary?.readinessScore ?? null,
    };

    await dbService.saveScan(scanRecord);

    // 5. Enqueue scan to SQS / Step Functions
    await startScanWorkflow({
      scanId,
      ownerUserId: userId,
      targetUrl: validated.normalizedUrl,
      normalizedHostname: validated.hostname,
      scanProfile: payload.profile,
    });

    res.status(201).json({
      scanId,
      status: 'QUEUED',
      targetUrl: validated.normalizedUrl,
      createdAt: now,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans/site/:hostname — List all historical scans for a specific hostname
 */
scansRouter.get('/site/:hostname', async (req, res, next) => {
  try {
    const { hostname } = req.params;
    const userId = req.user.id;
    const scans = await dbService.listScansByUser(userId, { hostname });
    res.json(scans);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans — List scans for authenticated user
 */
scansRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, profile } = req.query;

    const scans = await dbService.listScansByUser(userId, {
      search: search ? String(search) : undefined,
      profile: profile ? String(profile) : undefined,
    });

    res.json(scans);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans/:scanId — Retrieve scan status and summary
 */
scansRouter.get('/:scanId', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Audit scan with ID "${scanId}" was not found or does not belong to you.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    res.json(scan);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans/:scanId/findings — Retrieve findings with filtering and pagination
 */
scansRouter.get('/:scanId/findings', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;
    const { category, severity, page = 1, limit = 50 } = req.query;

    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Audit scan with ID "${scanId}" was not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    const allFindings = await dbService.getFindingsByScan(scanId, {
      category: category ? String(category) : undefined,
      severity: severity ? String(severity) : undefined,
    });

    const pageNum = parseInt(String(page), 10);
    const limitNum = Math.min(100, parseInt(String(limit), 10));
    const startIdx = (pageNum - 1) * limitNum;
    const paginated = allFindings.slice(startIdx, startIdx + limitNum);

    res.json({
      scanId,
      totalFindings: allFindings.length,
      page: pageNum,
      limit: limitNum,
      findings: paginated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans/:scanId/report — Retrieve the full report or download presigned URL
 */
scansRouter.get('/:scanId/report', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Audit scan "${scanId}" was not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    const findings = await dbService.getFindingsByScan(scanId);

    // If presigned format is requested
    if (req.query.format === 'download' || req.query.download === 'true') {
      const artifactKey = `scans/${scanId}/report.json`;
      const presignedUrl = await s3Service.getPresignedDownloadUrl(artifactKey);
      return res.json({
        scanId,
        downloadUrl: presignedUrl,
        expiresInSeconds: 900,
      });
    }

    res.json({
      ...scan,
      findings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /scans/:scanId/rescan — Trigger a rescan of an existing target
 */
scansRouter.post('/:scanId/rescan', enforceScanRateLimit, async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const existingScan = await dbService.getScan(scanId, userId);
    if (!existingScan) {
      return res.status(404).json({
        error: `Original scan "${scanId}" does not exist.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    const newScanId = `scn_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const newScan = {
      scanId: newScanId,
      ownerUserId: userId,
      targetUrl: existingScan.targetUrl,
      normalizedHostname: existingScan.normalizedHostname,
      scanProfile: existingScan.scanProfile,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
      enginesRun: [],
      checksNotPerformed: [],
    };

    await dbService.saveScan(newScan);

    await startScanWorkflow({
      scanId: newScanId,
      ownerUserId: userId,
      targetUrl: existingScan.targetUrl,
      normalizedHostname: existingScan.normalizedHostname,
      scanProfile: existingScan.scanProfile,
    });

    res.status(201).json({
      scanId: newScanId,
      status: 'QUEUED',
      targetUrl: existingScan.targetUrl,
      createdAt: now,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /scans/:scanId/cancel — Cancel an active scan
 */
scansRouter.post('/:scanId/cancel', async (req, res, next) => {
  try {
    const { scanId } = req.params;
    const userId = req.user.id;

    const scan = await dbService.getScan(scanId, userId);
    if (!scan) {
      return res.status(404).json({
        error: `Scan "${scanId}" not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    assertTransition(scan.status, 'CANCELLED', scanId);
    const updated = await dbService.updateScan(scanId, {
      status: 'CANCELLED',
      completedAt: new Date().toISOString(),
    });

    res.json({
      scanId,
      status: 'CANCELLED',
      message: 'Scan has been cancelled.',
    });
  } catch (err) {
    next(err);
  }
});
