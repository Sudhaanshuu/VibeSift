import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/env.js';

class LocalFileStorage {
  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.local_storage', 's3');
  }

  async ensureDir(filePath) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async putObject(key, body, contentType = 'application/json') {
    const fullPath = path.join(this.baseDir, key);
    await this.ensureDir(fullPath);
    const content = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    await fs.writeFile(fullPath, content, 'utf-8');
    return { key, location: fullPath };
  }

  async getObject(key) {
    const fullPath = path.join(this.baseDir, key);
    try {
      const data = await fs.readFile(fullPath, 'utf-8');
      return data;
    } catch {
      return null;
    }
  }

  async getPresignedUrl(key, expiresInSeconds = 900) {
    // For local dev, return a mock or direct local URL
    return `http://localhost:${config.port}/api/artifacts/download?key=${encodeURIComponent(key)}&expiresIn=${expiresInSeconds}`;
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
   * Saves raw scanner output to S3
   * @param {string} scanId
   * @param {string} engineName
   * @param {object | string} rawData
   * @returns {Promise<string>} S3 Key
   */
  async saveRawEngineOutput(scanId, engineName, rawData) {
    const key = `scans/${scanId}/raw/${engineName}.json`;
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
   * @param {string} scanId
   * @param {object} reportData
   * @param {string} [markdownReport]
   * @returns {Promise<{ jsonKey: string, mdKey?: string }>}
   */
  async saveReport(scanId, reportData, markdownReport = null) {
    const jsonKey = `scans/${scanId}/report.json`;
    const jsonBody = JSON.stringify(reportData, null, 2);

    if (this.useLocal) {
      await localStorage.putObject(jsonKey, jsonBody, 'application/json');
      let mdKey = null;
      if (markdownReport) {
        mdKey = `scans/${scanId}/report.md`;
        await localStorage.putObject(mdKey, markdownReport, 'text/markdown');
      }
      return { jsonKey, mdKey };
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

    let mdKey = null;
    if (markdownReport) {
      mdKey = `scans/${scanId}/report.md`;
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

    return { jsonKey, mdKey };
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
}

export const s3Service = new S3StorageService();
