import { Router } from 'express';
import crypto from 'node:crypto';
import { dbService } from '../../services/dynamoStorage.js';
import {
  generateVerificationChallenge,
  verifyDomainOwnership,
} from '../../services/domainVerification.js';
import { validateAndNormalizeUrl } from '../../services/ssrfGuard.js';

export const sitesRouter = Router();

/**
 * GET /sites — List saved websites for user
 */
sitesRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sites = await dbService.listSitesByUser(userId);
    res.json(sites);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sites — Save a website
 */
sitesRouter.post('/', async (req, res, next) => {
  try {
    const { hostname, url } = req.body;
    const rawTarget = hostname || url;

    if (!rawTarget) {
      return res.status(400).json({
        error: 'Hostname or URL is required',
        code: 'MISSING_HOSTNAME',
        statusCode: 400,
      });
    }

    // Clean and normalize target
    const targetWithScheme = rawTarget.startsWith('http://') || rawTarget.startsWith('https://')
      ? rawTarget
      : `https://${rawTarget}`;

    const validated = validateAndNormalizeUrl(targetWithScheme);
    const userId = req.user.id;

    // Check if already saved by this user
    const existingSites = await dbService.listSitesByUser(userId);
    const existing = existingSites.find((s) => s.hostname === validated.hostname);
    if (existing) {
      return res.status(200).json(existing);
    }

    const siteId = `site_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const newSite = {
      id: siteId,
      ownerUserId: userId,
      hostname: validated.hostname,
      normalizedUrl: `https://${validated.hostname}`,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    await dbService.saveSite(newSite);
    res.status(201).json(newSite);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sites/stats — Get aggregated statistics for a hostname (?hostname=example.com)
 */
sitesRouter.get('/stats', async (req, res, next) => {
  try {
    const { hostname } = req.query;
    if (!hostname) {
      return res.status(400).json({
        error: 'Hostname query parameter is required',
        code: 'MISSING_HOSTNAME',
        statusCode: 400,
      });
    }
    const userId = req.user.id;
    const stats = await dbService.getSiteStats(String(hostname), userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sites/:siteId/stats — Get aggregated statistics for a saved website
 */
sitesRouter.get('/:siteId/stats', async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;
    const site = await dbService.getSite(siteId, userId);
    if (!site) {
      return res.status(404).json({
        error: `Website "${siteId}" not found.`,
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    const stats = await dbService.getSiteStats(site.hostname, userId);
    res.json({
      site,
      stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /sites/:siteId/scans — List all historical scans for a website
 */
sitesRouter.get('/:siteId/scans', async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;
    const site = await dbService.getSite(siteId, userId);
    if (!site) {
      return res.status(404).json({
        error: `Website "${siteId}" not found.`,
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    const scans = await dbService.listScansByUser(userId, { hostname: site.hostname });
    res.json(scans);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /sites/:siteId — Delete a saved website
 */
sitesRouter.delete('/:siteId', async (req, res, next) => {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;

    const ok = await dbService.deleteSite(siteId, userId);
    if (!ok) {
      return res.status(404).json({
        error: `Website "${siteId}" not found or not owned by you.`,
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sites/verification-challenges (and /sites/:siteId/verify-request)
 * Generates verification instructions and token
 */
async function handleVerificationChallenge(req, res, next) {
  try {
    const siteId = req.params.siteId || req.body.siteId;
    const method = req.body.method || 'dns_txt';
    const userId = req.user.id;

    if (!siteId) {
      return res.status(400).json({
        error: 'siteId is required',
        code: 'MISSING_SITE_ID',
        statusCode: 400,
      });
    }

    const site = await dbService.getSite(siteId, userId);
    if (!site) {
      return res.status(404).json({
        error: `Website "${siteId}" was not found.`,
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    }

    // Reuse existing token or generate new one
    let token = site.verificationToken;
    if (!token) {
      const challenge = generateVerificationChallenge(siteId, site.hostname);
      token = challenge.token;
      await dbService.saveSite({
        ...site,
        verificationToken: token,
      });
    }

    const challenge = generateVerificationChallenge(siteId, site.hostname);
    challenge.token = token;

    // Format response matching frontend expectations
    res.json({
      siteId,
      hostname: site.hostname,
      method,
      token,
      dnsHostRecord: `@ (or _vibesift-challenge.${site.hostname})`,
      dnsRecordType: 'TXT',
      metaHtmlTag: `<meta name="vibesift-site-verification" content="${token}" />`,
      httpFilePath: `/.well-known/vibesift-verification.txt`,
      httpFileContent: token,
      instructions: challenge.methods[method] || challenge.methods.dns_txt,
    });
  } catch (err) {
    next(err);
  }
}

sitesRouter.post('/verification-challenges', handleVerificationChallenge);
sitesRouter.post('/:siteId/verify-request', handleVerificationChallenge);

/**
 * POST /sites/:siteId/verify (and /sites/:siteId/verify-confirm)
 * Confirms domain ownership check
 */
async function handleConfirmVerification(req, res, next) {
  try {
    const { siteId } = req.params;
    const userId = req.user.id;

    const site = await dbService.getSite(siteId, userId);
    if (!site) {
      return res.status(404).json({
        error: `Website "${siteId}" not found.`,
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    }

    if (!site.verificationToken) {
      return res.status(400).json({
        error: 'No active verification challenge exists for this site. Request verification challenge first.',
        code: 'NO_ACTIVE_CHALLENGE',
        statusCode: 400,
      });
    }

    const method = req.body.method || site.verificationMethod || 'dns_txt';

    // Run verification check
    const result = await verifyDomainOwnership({
      hostname: site.hostname,
      token: site.verificationToken,
      method,
    });

    if (result.verified) {
      const updated = await dbService.saveSite({
        ...site,
        isVerified: true,
        verificationMethod: method,
        verifiedAt: result.timestamp,
      });

      return res.json({
        verified: true,
        message: `Successfully verified ownership of ${site.hostname} via ${method}.`,
        site: updated,
      });
    }

    res.status(200).json({
      verified: false,
      message: `Verification check could not confirm ownership of ${site.hostname} using method ${method}. Please ensure DNS/HTML changes have propagated and retry.`,
      instructions: `Check TXT record for '_vibesift-challenge.${site.hostname}' or HTML meta tag.`,
    });
  } catch (err) {
    next(err);
  }
}

sitesRouter.post('/:siteId/verify', handleConfirmVerification);
sitesRouter.post('/:siteId/verify-confirm', handleConfirmVerification);
