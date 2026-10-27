import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import { validateAndNormalizeUrl, resolveAndValidateHost } from './ssrfGuard.js';

export class DomainVerificationError extends Error {
  constructor(message, code = 'VERIFICATION_FAILED') {
    super(message);
    this.name = 'DomainVerificationError';
    this.code = code;
    this.statusCode = 400;
  }
}

/**
 * Generates verification instructions and cryptographically secure token
 * @param {string} siteId
 * @param {string} hostname
 * @returns {object}
 */
export function generateVerificationChallenge(siteId, hostname) {
  const cleanHost = hostname.toLowerCase().trim();
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const token = `vbs_verify_${siteId.replace(/[^a-zA-Z0-9]/g, '')}_${randomSuffix}`;

  return {
    siteId,
    hostname: cleanHost,
    token,
    methods: {
      dns_txt: {
        recordType: 'TXT',
        host: `_vibesift-challenge.${cleanHost}`,
        fallbackHost: `@`,
        value: token,
        instruction: `Add a TXT record for '_vibesift-challenge.${cleanHost}' (or '@') with value '${token}'.`,
      },
      html_meta: {
        tag: `<meta name="vibesift-site-verification" content="${token}" />`,
        instruction: `Add the meta tag '<meta name="vibesift-site-verification" content="${token}" />' inside the <head> of your homepage.`,
      },
      http_file: {
        path: `/.well-known/vibesift-verification.txt`,
        url: `https://${cleanHost}/.well-known/vibesift-verification.txt`,
        content: token,
        instruction: `Host a text file at 'https://${cleanHost}/.well-known/vibesift-verification.txt' containing strictly the verification token.`,
      },
    },
  };
}

/**
 * Performs DNS TXT resolution to check verification token
 * @param {string} hostname
 * @param {string} token
 * @param {object} [resolverOverride] Optional for testing
 * @returns {Promise<boolean>}
 */
export async function checkDnsTxtRecord(hostname, token, resolverOverride = null) {
  const resolver = resolverOverride || dns;
  const hostsToCheck = [
    `_vibesift-challenge.${hostname}`,
    hostname,
  ];

  for (const host of hostsToCheck) {
    try {
      const records = await resolver.resolveTxt(host);
      // Flatten chunks in TXT records
      for (const record of records) {
        const fullTxt = Array.isArray(record) ? record.join('') : String(record);
        if (fullTxt.trim() === token.trim() || fullTxt.includes(token.trim())) {
          return true;
        }
      }
    } catch {
      // Continue to next host if this resolution failed or ENODATA
    }
  }

  return false;
}

/**
 * Checks for HTML meta tag or HTTP well-known file on the target website
 * Uses safe SSRF validation before outbound HTTP request
 * @param {string} hostname
 * @param {string} token
 * @param {'html_meta' | 'http_file'} method
 * @param {function} [fetcherOverride] Optional for testing
 * @returns {Promise<boolean>}
 */
export async function checkHttpVerification(hostname, token, method, fetcherOverride = null) {
  const protocol = 'https:';
  const targetPath = method === 'http_file' ? '/.well-known/vibesift-verification.txt' : '/';
  const targetUrl = `${protocol}//${hostname}${targetPath}`;

  // Validate URL and resolve DNS with SSRF guard
  const validated = validateAndNormalizeUrl(targetUrl);
  await resolveAndValidateHost(validated.hostname);

  const fetcher = fetcherOverride || globalThis.fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetcher(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VibeSift-DomainVerifier/1.0 (+https://vibesift.pixir.in/docs/bot)',
        'Accept': method === 'http_file' ? 'text/plain' : 'text/html',
      },
    });

    if (!res.ok) {
      return false;
    }

    const body = await res.text();

    if (method === 'http_file') {
      return body.trim() === token.trim() || body.includes(token.trim());
    }

    if (method === 'html_meta') {
      // Look for <meta name="vibesift-site-verification" content="...">
      const metaRegex = /<meta\s+[^>]*name=["'](?:vibesift-site-verification|vibesift-challenge)["'][^>]*content=["']([^"']+)["'][^>]*>/i;
      const match = body.match(metaRegex);
      if (match && match[1] && (match[1].trim() === token.trim() || match[1].includes(token.trim()))) {
        return true;
      }

      // Also check content followed by name
      const reverseMetaRegex = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["'](?:vibesift-site-verification|vibesift-challenge)["'][^>]*>/i;
      const reverseMatch = body.match(reverseMetaRegex);
      if (reverseMatch && reverseMatch[1] && reverseMatch[1].trim() === token.trim()) {
        return true;
      }
    }

    return false;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new DomainVerificationError('Connection timed out while attempting domain verification.', 'TIMEOUT');
    }
    throw new DomainVerificationError(`Verification check request failed: ${err.message}`, 'REQUEST_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verifies domain ownership using the requested or available method
 * @param {object} params
 * @param {string} params.hostname
 * @param {string} params.token
 * @param {'dns_txt' | 'html_meta' | 'http_file'} [params.method]
 * @param {object} [params.resolverOverride]
 * @param {function} [params.fetcherOverride]
 * @returns {Promise<{ verified: boolean, method: string, timestamp: string }>}
 */
export async function verifyDomainOwnership({
  hostname,
  token,
  method = 'dns_txt',
  resolverOverride = null,
  fetcherOverride = null,
}) {
  const cleanHost = hostname.toLowerCase().trim();

  if (method === 'dns_txt') {
    const isDnsVerified = await checkDnsTxtRecord(cleanHost, token, resolverOverride);
    if (isDnsVerified) {
      return {
        verified: true,
        method: 'dns_txt',
        timestamp: new Date().toISOString(),
      };
    }
  } else if (method === 'html_meta' || method === 'http_file') {
    const isHttpVerified = await checkHttpVerification(cleanHost, token, method, fetcherOverride);
    if (isHttpVerified) {
      return {
        verified: true,
        method,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return {
    verified: false,
    method,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Checks if target hostname is allowed under verified domain scope
 * (Exact match or valid subdomain of verified root)
 * @param {string} targetHost
 * @param {string} verifiedHost
 * @returns {boolean}
 */
export function matchesVerifiedDomain(targetHost, verifiedHost) {
  const target = targetHost.toLowerCase().trim();
  const verified = verifiedHost.toLowerCase().trim();

  if (target === verified) return true;
  if (target.endsWith(`.${verified}`)) return true;

  return false;
}
