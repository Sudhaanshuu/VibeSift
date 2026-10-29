import { Router } from 'express';
import crypto from 'node:crypto';
import { dbService } from '../../services/dynamoStorage.js';
import { s3Service } from '../../services/s3Storage.js';
import { validateAndNormalizeUrl, resolveAndValidateHost } from '../../services/ssrfGuard.js';
import { matchesVerifiedDomain } from '../../services/domainVerification.js';
import { assertTransition } from '../../services/scanStateService.js';
import { ScanSubmissionPayloadSchema } from '../../types/index.js';
import { enforceScanRateLimit, getScanQuota } from '../middleware/rateLimiter.js';
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
        // If owner confirmed authorization and terms, accept ownership consent and record site attestation
        if (payload.acknowledgedTerms) {
          const existingSite = userSites.find(
            (site) => site.hostname.toLowerCase() === validated.hostname.toLowerCase()
          );
          if (!existingSite) {
            const siteId = `site_${crypto.randomBytes(6).toString('hex')}`;
            await dbService.saveSite({
              id: siteId,
              ownerUserId: userId,
              hostname: validated.hostname,
              normalizedUrl: validated.normalizedUrl,
              isVerified: true,
              verificationMethod: 'owner_attestation',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else if (!existingSite.isVerified) {
            existingSite.isVerified = true;
            existingSite.verificationMethod = 'owner_attestation';
            existingSite.updatedAt = new Date().toISOString();
            await dbService.saveSite(existingSite);
          }
        } else {
          return res.status(403).json({
            error: `Authorized deep security scanning requires verified domain ownership or owner consent for '${validated.hostname}'.`,
            code: 'DOMAIN_NOT_VERIFIED',
            statusCode: 403,
            requiredAction: 'VERIFY_DOMAIN',
          });
        }
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

    const enrichedScans = scans.map((s) => ({
      ...s,
      findings: s.findings || [],
      checks: s.checks || [],
    }));

    res.json(enrichedScans);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /scans/quota — Retrieve active hourly and minute scan quota for user
 */
scansRouter.get('/quota', getScanQuota);

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

    const findings = await dbService.getFindingsByScan(scanId);

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
      findings: findings.length > 0 ? findings : (s3Report?.findings || scan.findings || []),
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

    // If markdown format is requested
    if (req.query.format === 'markdown') {
      const mdContent = await s3Service.getObjectContent(`scans/${scanId}/report.md`);
      if (mdContent) {
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        return res.send(mdContent);
      }
    }

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
