import { Router } from 'express';
import crypto from 'node:crypto';
import { dbService } from '../../services/dynamoStorage.js';
import { s3Service, sanitizeTargetHost } from '../../services/s3Storage.js';
import { validateAndNormalizeUrl, resolveAndValidateHost } from '../../services/ssrfGuard.js';
import { matchesVerifiedDomain } from '../../services/domainVerification.js';
import { assertTransition } from '../../services/scanStateService.js';
import { ScanSubmissionPayloadSchema } from '../../types/index.js';
import { enforceScanRateLimit, getScanQuota } from '../middleware/rateLimiter.js';
import { startScanWorkflow } from '../../orchestration/workflowHandler.js';

export const scansRouter = Router();

/**
 * POST /scans/precheck — Checks whether an audit already exists in S3 & SQLite for the target URL
 * Returns existing audit metadata, timestamp, readiness score, and S3 key if present.
 */
scansRouter.post('/precheck', async (req, res, next) => {
  try {
    const rawUrl = req.body?.url || req.query?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'A valid website URL is required', code: 'INVALID_URL' });
    }

    const validated = validateAndNormalizeUrl(rawUrl);
    await resolveAndValidateHost(validated.hostname);

    // 1. Look up latest completed scan for this target hostname globally in DB
    let latestScan = await dbService.getLatestCompletedScanForSite(validated.hostname);

    // 2. Fall back to S3 direct discovery if DB record is not yet synced
    if (!latestScan) {
      const s3Found = await s3Service.findLatestScanReportByHostname(validated.hostname);
      if (s3Found) {
        latestScan = {
          scanId: s3Found.scanId,
          ownerUserId: s3Found.report?.ownerUserId || 'public',
          targetUrl: s3Found.targetUrl,
          normalizedHostname: validated.hostname,
          scanProfile: s3Found.report?.scanProfile || 'baseline_public',
          status: s3Found.status,
          createdAt: s3Found.createdAt,
          summary: s3Found.summary,
          enginesRun: s3Found.report?.enginesRun || [],
          checksNotPerformed: s3Found.report?.checksNotPerformed || [],
          s3ReportKey: s3Found.s3Key,
        };
        try {
          await dbService.saveScan(latestScan);
        } catch {}
      }
    }

    if (!latestScan) {
      return res.status(200).json({ exists: false, hostname: validated.hostname });
    }

    // Determine S3 report key using naming convention or stored key
    const s3Key = latestScan.s3ReportKey || `scans/${sanitizeTargetHost(validated.hostname)}__${latestScan.scanId}/report.json`;
    const fallbackDirectKey = `audits/${sanitizeTargetHost(validated.hostname)}__${latestScan.scanId}.json`;
    const legacyKey = `scans/${latestScan.scanId}/report.json`;

    // Verify actual file existence in S3
    let existsInS3 = (await s3Service.objectExists(s3Key)) ||
                     (await s3Service.objectExists(fallbackDirectKey)) ||
                     (await s3Service.objectExists(legacyKey));

    if (!existsInS3) {
      const s3Check = await s3Service.findLatestScanReportByHostname(validated.hostname);
      if (s3Check) {
        existsInS3 = true;
      }
    }

    if (!existsInS3) {
      return res.status(200).json({ exists: false, hostname: validated.hostname });
    }

    return res.status(200).json({
      exists: true,
      scanId: latestScan.scanId,
      targetUrl: latestScan.targetUrl,
      normalizedHostname: validated.hostname,
      createdAt: latestScan.createdAt,
      status: latestScan.status,
      summary: latestScan.summary,
      readinessScore: latestScan.summary?.readinessScore ?? null,
      s3Key,
    });
  } catch (err) {
    next(err);
  }
});

scansRouter.get('/precheck', async (req, res, next) => {
  req.body = { url: req.query.url };
  return scansRouter.handle(req, res, next);
});

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
      let latestExisting = await dbService.getLatestCompletedScanForSite(validated.hostname);
      if (!latestExisting) {
        const s3Found = await s3Service.findLatestScanReportByHostname(validated.hostname);
        if (s3Found) {
          latestExisting = {
            scanId: s3Found.scanId,
            status: s3Found.status,
            targetUrl: s3Found.targetUrl,
            createdAt: s3Found.createdAt,
            summary: s3Found.summary,
          };
        }
      }
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

    const s3ReportKey = `scans/${sanitizeTargetHost(validated.hostname)}__${scanId}/report.json`;

    const scanRecord = {
      scanId,
      ownerUserId: userId,
      targetUrl: validated.normalizedUrl,
      normalizedHostname: validated.hostname,
      scanProfile: payload.profile,
      status: 'QUEUED',
      s3ReportKey,
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
    const userId = req.user?.id;

    // 1. Try to fetch scan owned by the current user
    let scan = userId ? await dbService.getScan(scanId, userId) : null;

    // 2. Fall back to global scan lookup (cached / public audits)
    if (!scan) {
      scan = await dbService.getScan(scanId);
    }

    // 3. Fall back to direct S3 report if database record is missing
    let s3Report = null;
    const hostname = scan?.normalizedHostname;
    const sanitizedHost = hostname ? sanitizeTargetHost(hostname) : null;

    const candidateS3Keys = [
      scan?.s3ReportKey,
      sanitizedHost ? `scans/${sanitizedHost}__${scanId}/report.json` : null,
      sanitizedHost ? `audits/${sanitizedHost}__${scanId}.json` : null,
      `scans/${scanId}/report.json`,
      `audits/${scanId}.json`,
    ].filter(Boolean);

    for (const key of candidateS3Keys) {
      try {
        const rawReport = await s3Service.getObjectContent(key);
        if (rawReport) {
          s3Report = JSON.parse(rawReport);
          break;
        }
      } catch {}
    }

    // If scan was not in database but was found in S3, reconstruct scan record
    if (!scan && s3Report) {
      scan = {
        scanId,
        ownerUserId: s3Report.ownerUserId || 'public',
        targetUrl: s3Report.targetUrl || s3Report.url,
        normalizedHostname: s3Report.normalizedHostname || s3Report.hostname,
        scanProfile: s3Report.scanProfile || 'basic_public',
        status: s3Report.status || 'COMPLETED',
        createdAt: s3Report.createdAt || new Date().toISOString(),
        summary: s3Report.summary || {},
        enginesRun: s3Report.enginesRun || [],
        checksNotPerformed: s3Report.checksNotPerformed || [],
        s3ReportKey: candidateS3Keys[0] || `scans/${scanId}/report.json`,
      };
      try {
        await dbService.saveScan(scan);
      } catch {}
    }

    if (!scan) {
      return res.status(404).json({
        error: `Audit scan with ID "${scanId}" was not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    const findings = await dbService.getFindingsByScan(scanId);

    const defaultSummary = {
      readinessScore: 0,
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      categoryScores: {},
    };

    const mergedSummary = {
      ...defaultSummary,
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
    const userId = req.user?.id;
    const { category, severity, page = 1, limit = 50 } = req.query;

    let scan = userId ? await dbService.getScan(scanId, userId) : null;
    if (!scan) {
      scan = await dbService.getScan(scanId);
    }
    if (!scan) {
      return res.status(404).json({
        error: `Audit scan with ID "${scanId}" was not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    let allFindings = await dbService.getFindingsByScan(scanId, {
      category: category ? String(category) : undefined,
      severity: severity ? String(severity) : undefined,
    });

    // If findings table was empty, fallback to findings stored inside S3 report
    if (allFindings.length === 0) {
      const sanitizedHost = scan.normalizedHostname ? sanitizeTargetHost(scan.normalizedHostname) : null;
      const candidateS3Keys = [
        scan.s3ReportKey,
        sanitizedHost ? `scans/${sanitizedHost}__${scanId}/report.json` : null,
        sanitizedHost ? `audits/${sanitizedHost}__${scanId}.json` : null,
        `scans/${scanId}/report.json`,
      ].filter(Boolean);

      for (const key of candidateS3Keys) {
        try {
          const raw = await s3Service.getObjectContent(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.findings) && parsed.findings.length > 0) {
              allFindings = parsed.findings;
              if (category) {
                allFindings = allFindings.filter((f) => f.category === String(category));
              }
              if (severity) {
                allFindings = allFindings.filter((f) => f.severity === String(severity));
              }
              break;
            }
          }
        } catch {}
      }
    }

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
    const userId = req.user?.id;

    let scan = userId ? await dbService.getScan(scanId, userId) : null;
    if (!scan) {
      scan = await dbService.getScan(scanId);
    }
    if (!scan) {
      return res.status(404).json({
        error: `Audit scan "${scanId}" was not found.`,
        code: 'SCAN_NOT_FOUND',
        statusCode: 404,
      });
    }

    const sanitizedHost = scan.normalizedHostname ? sanitizeTargetHost(scan.normalizedHostname) : null;

    // If presigned format is requested
    if (req.query.format === 'download' || req.query.download === 'true') {
      const artifactKey = scan.s3ReportKey || (sanitizedHost ? `scans/${sanitizedHost}__${scanId}/report.json` : `scans/${scanId}/report.json`);
      const presignedUrl = await s3Service.getPresignedDownloadUrl(artifactKey);
      return res.json({
        scanId,
        downloadUrl: presignedUrl,
        expiresInSeconds: 900,
      });
    }

    // If markdown format is requested
    if (req.query.format === 'markdown') {
      const candidateMdKeys = [
        sanitizedHost ? `scans/${sanitizedHost}__${scanId}/report.md` : null,
        `scans/${scanId}/report.md`,
      ].filter(Boolean);

      for (const mdKey of candidateMdKeys) {
        const mdContent = await s3Service.getObjectContent(mdKey);
        if (mdContent) {
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          return res.send(mdContent);
        }
      }
    }

    // Attempt to load finalized report from S3 artifacts
    let s3Report = null;
    const candidateS3Keys = [
      scan.s3ReportKey,
      sanitizedHost ? `scans/${sanitizedHost}__${scanId}/report.json` : null,
      sanitizedHost ? `audits/${sanitizedHost}__${scanId}.json` : null,
      `scans/${scanId}/report.json`,
      `audits/${scanId}.json`,
    ].filter(Boolean);

    for (const key of candidateS3Keys) {
      try {
        const rawReport = await s3Service.getObjectContent(key);
        if (rawReport) {
          s3Report = JSON.parse(rawReport);
          break;
        }
      } catch {}
    }

    const findings = await dbService.getFindingsByScan(scanId);
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

    let existingScan = userId ? await dbService.getScan(scanId, userId) : null;
    if (!existingScan) {
      existingScan = await dbService.getScan(scanId); // Fallback to global scan lookup so re-auditing cached scans works
    }
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
