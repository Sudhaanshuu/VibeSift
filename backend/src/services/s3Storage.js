import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';

/**
 * Sanitizes a domain hostname for safe use in S3 object keys
 */
export function sanitizeTargetHost(hostname = '') {
  return (hostname || 'unknown-target')
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .replace(/[^a-z0-9.-]/g, '_');
}

/**
 * Builds the S3 naming convention: [sanitizedHost]__[scanId]
 */
export function buildScanS3Prefix(hostname, scanId) {
  const host = sanitizeTargetHost(hostname);
  return `${host}__${scanId}`;
}

/**
 * Parses the hostname and scanId back out from an S3 key
 * e.g. "scans/example.com__scn_1234abcd/report.json" -> { hostname: "example.com", scanId: "scn_1234abcd" }
 */
export function parseScanFromS3Key(key = '') {
  if (!key) return null;
  const match = key.match(/(?:scans|audits)\/([^/]+?)(?:\/report\.json|\.json|$)/);
  if (!match) return null;
  const identifier = match[1];
  const parts = identifier.split('__');
  if (parts.length >= 2) {
    return {
      hostname: parts[0],
      scanId: parts.slice(1).join('__'),
      identifier,
    };
  }
  return {
    hostname: identifier,
    scanId: identifier,
    identifier,
  };
}

class LocalFileStorage {
  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.local_storage', 's3');
  }

  async _resolvePath(key) {
    const candidates = [
      path.join(this.baseDir, key),
      path.resolve(process.cwd(), 'backend', '.local_storage', 's3', key),
      path.resolve(process.cwd(), '..', '.local_storage', 's3', key),
      path.resolve(process.cwd(), '.local_storage', 's3', key),
    ];
    for (const p of candidates) {
      try {
        await fs.access(p);
        return p;
      } catch {}
    }
    return path.join(this.baseDir, key);
  }

  async ensureDir(filePath) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async putObject(key, body, contentType = 'application/json') {
    const fullPath = path.join(this.baseDir, key);
    await this.ensureDir(fullPath);
    let content;
    if (Buffer.isBuffer(body)) {
      content = body;
    } else if (typeof body === 'string') {
      content = body;
    } else {
      content = JSON.stringify(body, null, 2);
    }
    await fs.writeFile(fullPath, content);
    return { key, location: fullPath };
  }

  async getObject(key) {
    const fullPath = await this._resolvePath(key);
    try {
      const data = await fs.readFile(fullPath, 'utf-8');
      return data;
    } catch {
      return null;
    }
  }

  async exists(key) {
    const fullPath = await this._resolvePath(key);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getPresignedUrl(key, expiresInSeconds = 900) {
    // For local dev, return a mock or direct local URL
    return `http://localhost:${config.port}/api/artifacts/download?key=${encodeURIComponent(key)}&expiresIn=${expiresInSeconds}`;
  }

  async findLatestScanReportByHostname(hostname, profile = null) {
    if (!hostname) return null;
    const sanitized = sanitizeTargetHost(hostname);
    const candidateDirs = [
      path.join(this.baseDir, 'scans'),
      path.resolve(process.cwd(), 'backend', '.local_storage', 's3', 'scans'),
      path.resolve(process.cwd(), '..', '.local_storage', 's3', 'scans'),
      path.resolve(process.cwd(), '.local_storage', 's3', 'scans'),
    ];

    let foundFolders = [];
    for (const dir of candidateDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.toLowerCase().startsWith(`${sanitized}__`)) {
            const reportPath = path.join(dir, entry.name, 'report.json');
            try {
              const stat = await fs.stat(reportPath);
              foundFolders.push({ reportPath, mtime: stat.mtimeMs, folderName: entry.name });
            } catch {}
          }
        }
        if (foundFolders.length > 0) break;
      } catch {}
    }

    if (foundFolders.length === 0) {
      const auditDirs = [
        path.join(this.baseDir, 'audits'),
        path.resolve(process.cwd(), 'backend', '.local_storage', 's3', 'audits'),
        path.resolve(process.cwd(), '..', '.local_storage', 's3', 'audits'),
        path.resolve(process.cwd(), '.local_storage', 's3', 'audits'),
      ];
      for (const dir of auditDirs) {
        try {
          const files = await fs.readdir(dir);
          for (const file of files) {
            if (file.toLowerCase().startsWith(`${sanitized}__`) && file.endsWith('.json')) {
              const filePath = path.join(dir, file);
              const stat = await fs.stat(filePath);
              foundFolders.push({ reportPath: filePath, mtime: stat.mtimeMs, folderName: file.replace('.json', '') });
            }
          }
          if (foundFolders.length > 0) break;
        } catch {}
      }
    }

    if (foundFolders.length === 0) return null;

    foundFolders.sort((a, b) => b.mtime - a.mtime);
    for (const item of foundFolders) {
      try {
        const content = await fs.readFile(item.reportPath, 'utf-8');
        const parsed = JSON.parse(content);
        const reportProfile = parsed.scanProfile || parsed.profile || parsed.report?.scanProfile || 'baseline_public';
        if (profile && reportProfile !== profile) {
          continue;
        }
        const parsedKey = parseScanFromS3Key(item.folderName) || {};
        const scanId = parsed.scanId || parsedKey.scanId || item.folderName.split('__')[1] || 'unknown';
        const s3Key = item.folderName.endsWith('.json') ? `audits/${item.folderName}.json` : `scans/${item.folderName}/report.json`;
        return {
          scanId,
          targetUrl: parsed.targetUrl || parsed.url || `https://${hostname}`,
          normalizedHostname: parsed.normalizedHostname || hostname,
          scanProfile: reportProfile,
          createdAt: parsed.createdAt || new Date(item.mtime).toISOString(),
          status: parsed.status || 'COMPLETED',
          summary: parsed.summary || {},
          readinessScore: parsed.summary?.readinessScore ?? null,
          s3Key,
          report: parsed,
        };
      } catch {}
    }
    return null;
  }
}

const localStorage = new LocalFileStorage();

let s3Client = null;
if (!config.useLocalStorage) {
  try {
    s3Client = new S3Client({ region: config.awsRegion });
  } catch (err) {
    console.warn('[S3Storage] Failed to initialize S3 client, using local file store:', err.message);
  }
}

export class S3StorageService {
  constructor() {
    this.bucket = config.storage.reportsBucket;
    this.useLocal = config.useLocalStorage || !s3Client;
  }

  /**
   * Checks whether an object exists in S3 (or local S3 store)
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async objectExists(key) {
    if (!key) return false;
    if (this.useLocal) {
      return localStorage.exists(key);
    }

    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.warn(`[S3Storage] HeadObject check failed for ${key}:`, err.message);
      return false;
    }
  }

  /**
   * Saves raw scanner output to S3 using naming convention:
   * scans/{sanitizedHost}__{scanId}/raw/{engineName}.json
   * @param {string} scanId
   * @param {string} engineName
   * @param {object | string} rawData
   * @param {string} [hostname]
   * @returns {Promise<string>} S3 Key
   */
  async saveRawEngineOutput(scanId, engineName, rawData, hostname = null) {
    const folder = hostname ? buildScanS3Prefix(hostname, scanId) : scanId;
    const key = `scans/${folder}/raw/${engineName}.json`;
    const body = typeof rawData === 'string' ? rawData : JSON.stringify(rawData, null, 2);

    if (this.useLocal) {
      await localStorage.putObject(key, body, 'application/json');
      return key;
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
      })
    );

    return key;
  }

  /**
   * Saves the generated audit report (JSON & Markdown) to S3
   * Naming convention: scans/{sanitizedHost}__{scanId}/report.json
   * Also stores direct audit mirror: audits/{sanitizedHost}__{scanId}.json
   * @param {string} scanId
   * @param {object} reportData
   * @param {string} [markdownReport]
   * @param {string} [hostname]
   * @returns {Promise<{ jsonKey: string, mdKey?: string, directAuditKey: string }>}
   */
  /**
   * Saves a binary PDF artifact (e.g. invoice.pdf or report.pdf) to S3
   */
  async savePdfArtifact(scanId, artifactName, buffer, hostname = null) {
    const folder = hostname ? buildScanS3Prefix(hostname, scanId) : scanId;
    const key = `scans/${folder}/${artifactName}`;

    if (this.useLocal) {
      await localStorage.putObject(key, buffer, 'application/pdf');
      return key;
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ServerSideEncryption: 'aws:kms',
      })
    );

    return key;
  }

  async saveReport(scanId, reportData, markdownReport = null, hostname = null) {
    const folder = hostname ? buildScanS3Prefix(hostname, scanId) : scanId;
    const jsonKey = `scans/${folder}/report.json`;
    const directAuditKey = `audits/${folder}.json`;
    const jsonBody = JSON.stringify(reportData, null, 2);

    if (this.useLocal) {
      await localStorage.putObject(jsonKey, jsonBody, 'application/json');
      await localStorage.putObject(directAuditKey, jsonBody, 'application/json');
      let mdKey = null;
      if (markdownReport) {
        mdKey = `scans/${folder}/report.md`;
        await localStorage.putObject(mdKey, markdownReport, 'text/markdown');
      }
      return { jsonKey, mdKey, directAuditKey };
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: jsonKey,
        Body: jsonBody,
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
      })
    );

    // Direct audit mirror for convenient site-specific fetching
    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: directAuditKey,
        Body: jsonBody,
        ContentType: 'application/json',
        ServerSideEncryption: 'aws:kms',
      })
    );

    let mdKey = null;
    if (markdownReport) {
      mdKey = `scans/${folder}/report.md`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: mdKey,
          Body: markdownReport,
          ContentType: 'text/markdown',
          ServerSideEncryption: 'aws:kms',
        })
      );
    }

    return { jsonKey, mdKey, directAuditKey };
  }

  /**
   * Generates a temporary presigned URL for secure download of scan artifacts
   * @param {string} key
   * @param {number} [expiresInSeconds]
   * @returns {Promise<string>}
   */
  async getPresignedDownloadUrl(key, expiresInSeconds = config.storage.presignedUrlTtlSeconds) {
    if (this.useLocal) {
      return localStorage.getPresignedUrl(key, expiresInSeconds);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Retrieves artifact text from S3
   * @param {string} key
   * @returns {Promise<string | null>}
   */
  async getObjectContent(key) {
    if (this.useLocal) {
      return localStorage.getObject(key);
    }

    try {
      const res = await s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return await res.Body.transformToString();
    } catch {
      return null;
    }
  }

  /**
   * Discovers the latest completed scan report for a target hostname from S3.
   * Enables cross-tenant global caching across different users.
   */
  async findLatestScanReportByHostname(hostname, profile = null) {
    if (!hostname) return null;
    if (this.useLocal) {
      return localStorage.findLatestScanReportByHostname(hostname, profile);
    }

    const sanitized = sanitizeTargetHost(hostname);
    const prefixes = [`scans/${sanitized}__`, `audits/${sanitized}__`];

    let candidateKeys = [];
    for (const prefix of prefixes) {
      try {
        const res = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            MaxKeys: 30,
          })
        );
        for (const item of res.Contents || []) {
          if (item.Key && (item.Key.endsWith('/report.json') || item.Key.endsWith('.json'))) {
            candidateKeys.push({
              key: item.Key,
              lastModified: item.LastModified ? new Date(item.LastModified).getTime() : 0,
            });
          }
        }
      } catch (err) {
        console.warn(`[S3Storage] ListObjects failed for prefix ${prefix}:`, err.message);
      }
    }

    if (candidateKeys.length === 0) {
      return localStorage.findLatestScanReportByHostname(hostname, profile);
    }

    candidateKeys.sort((a, b) => b.lastModified - a.lastModified);

    for (const cand of candidateKeys) {
      try {
        const content = await this.getObjectContent(cand.key);
        if (!content) continue;
        const parsed = JSON.parse(content);
        const reportProfile = parsed.scanProfile || parsed.profile || parsed.report?.scanProfile || 'baseline_public';
        if (profile && reportProfile !== profile) {
          continue;
        }
        const parsedKey = parseScanFromS3Key(cand.key) || {};
        const scanId = parsed.scanId || parsedKey.scanId || 'unknown';

        return {
          scanId,
          targetUrl: parsed.targetUrl || parsed.url || `https://${hostname}`,
          normalizedHostname: parsed.normalizedHostname || hostname,
          scanProfile: reportProfile,
          createdAt: parsed.createdAt || (cand.lastModified ? new Date(cand.lastModified).toISOString() : new Date().toISOString()),
          status: parsed.status || 'COMPLETED',
          summary: parsed.summary || {},
          readinessScore: parsed.summary?.readinessScore ?? null,
          s3Key: cand.key,
          report: parsed,
        };
      } catch (err) {
        console.warn(`[S3Storage] Failed to parse S3 report ${cand.key}:`, err.message);
      }
    }
    return null;
  }
}

export const s3Service = new S3StorageService();
