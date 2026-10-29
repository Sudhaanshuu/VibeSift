import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config/env.js';
import { sqliteStorage } from './sqliteStorage.js';

let docClient = null;
if (!config.useLocalStorage) {
  try {
    const rawClient = new DynamoDBClient({ region: config.awsRegion });
    docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  } catch (err) {
    console.warn('[DynamoStorage] Failed to init AWS DynamoDB client, falling back to SQLite storage:', err.message);
  }
}

export class DynamoStorageService {
  constructor() {
    this.useLocal = config.useLocalStorage || !docClient;
  }

  // ==================== SITES ====================

  async saveSite(site) {
    if (this.useLocal) return sqliteStorage.saveSite(site);

    const now = new Date().toISOString();
    const item = {
      ...site,
      createdAt: site.createdAt || now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: config.tables.sites,
        Item: item,
      })
    );
    return item;
  }

  async getSite(siteId, ownerUserId) {
    if (this.useLocal) return sqliteStorage.getSite(siteId, ownerUserId);

    const res = await docClient.send(
      new GetCommand({
        TableName: config.tables.sites,
        Key: { id: siteId },
      })
    );

    const item = res.Item;
    if (!item || (ownerUserId && item.ownerUserId !== ownerUserId)) {
      return null;
    }
    return item;
  }

  async getSiteByHostname(hostname, ownerUserId = null) {
    if (this.useLocal) return sqliteStorage.getSiteByHostname(hostname, ownerUserId);

    const sites = await this.listSitesByUser(ownerUserId);
    return sites.find((s) => s.hostname.toLowerCase() === hostname.toLowerCase()) || null;
  }

  async listSitesByUser(ownerUserId) {
    if (this.useLocal) return sqliteStorage.listSitesByUser(ownerUserId);

    const res = await docClient.send(
      new QueryCommand({
        TableName: config.tables.sites,
        IndexName: 'ownerUserId-index',
        KeyConditionExpression: 'ownerUserId = :uid',
        ExpressionAttributeValues: {
          ':uid': ownerUserId,
        },
      })
    );
    return res.Items || [];
  }

  async deleteSite(siteId, ownerUserId) {
    if (this.useLocal) return sqliteStorage.deleteSite(siteId, ownerUserId);

    const site = await this.getSite(siteId, ownerUserId);
    if (!site) return false;

    await docClient.send(
      new DeleteCommand({
        TableName: config.tables.sites,
        Key: { id: siteId },
      })
    );
    return true;
  }

  async getSiteStats(siteIdOrHostname, ownerUserId = null) {
    if (this.useLocal) return sqliteStorage.getSiteStats(siteIdOrHostname, ownerUserId);

    let site = await this.getSite(siteIdOrHostname, ownerUserId);
    if (!site) {
      site = await this.getSiteByHostname(siteIdOrHostname, ownerUserId);
    }
    const hostname = site ? site.hostname : siteIdOrHostname;
    const scans = await this.listScansByUser(ownerUserId, { hostname });

    const totalScans = scans.length;
    const scores = scans.map((s) => s.summary?.readinessScore).filter((sc) => sc !== undefined && sc !== null);
    const latestScore = scores[0] ?? null;
    const previousScore = scores.length > 1 ? scores[1] : null;
    const scoreDelta = previousScore !== null && latestScore !== null ? latestScore - previousScore : 0;
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    return {
      hostname,
      siteId: site?.id || null,
      totalScans,
      latestScore,
      previousScore,
      scoreDelta,
      averageScore,
      lastScannedAt: scans[0]?.createdAt || null,
      latestScanId: scans[0]?.scanId || null,
      scoreHistory: scans.slice(0, 10).map((s) => ({
        scanId: s.scanId,
        createdAt: s.createdAt,
        readinessScore: s.summary?.readinessScore ?? 0,
        critical: s.summary?.critical ?? 0,
        high: s.summary?.high ?? 0,
      })),
      categoryAverages: {},
      findingsSummary: { total: 0, open: 0, fixed: 0, waived: 0 },
    };
  }

  // ==================== SCANS ====================

  async saveScan(scan) {
    if (this.useLocal) return sqliteStorage.saveScan(scan);

    await docClient.send(
      new PutCommand({
        TableName: config.tables.scans,
        Item: scan,
      })
    );
    return scan;
  }

  async getScan(scanId, ownerUserId = null) {
    if (this.useLocal) return sqliteStorage.getScan(scanId, ownerUserId);

    const res = await docClient.send(
      new GetCommand({
        TableName: config.tables.scans,
        Key: { scanId },
      })
    );

    const item = res.Item;
    if (!item) return null;
    if (ownerUserId && item.ownerUserId !== ownerUserId) {
      return null;
    }
    return item;
  }

  async getLatestScanForSite(hostname, ownerUserId = null) {
    if (this.useLocal) return sqliteStorage.getLatestScanForSite(hostname, ownerUserId);
    const scans = await this.listScansByUser(ownerUserId, { hostname });
    return scans[0] || null;
  }

  async getScanByIdempotencyKey(ownerUserId, idempotencyKey) {
    if (this.useLocal) return sqliteStorage.getScanByIdempotencyKey(ownerUserId, idempotencyKey);

    const res = await docClient.send(
      new QueryCommand({
        TableName: config.tables.scans,
        IndexName: 'idempotency-index',
        KeyConditionExpression: 'idempotencyKey = :ikey',
        ExpressionAttributeValues: {
          ':ikey': idempotencyKey,
        },
        Limit: 1,
      })
    );
    const item = res.Items?.[0];
    if (!item) return null;
    return this.getScan(item.scanId, ownerUserId);
  }

  async listScansByUser(ownerUserId, options = {}) {
    if (this.useLocal) return sqliteStorage.listScansByUser(ownerUserId, options);

    const res = await docClient.send(
      new QueryCommand({
        TableName: config.tables.scans,
        IndexName: 'ownerUserId-createdAt-index',
        KeyConditionExpression: 'ownerUserId = :uid',
        ExpressionAttributeValues: {
          ':uid': ownerUserId,
        },
        ScanIndexForward: false, // Descending
      })
    );

    let scans = res.Items || [];
    if (options.profile) {
      scans = scans.filter((s) => s.scanProfile === options.profile);
    }
    if (options.hostname) {
      scans = scans.filter((s) => s.normalizedHostname === options.hostname.toLowerCase());
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      scans = scans.filter((s) => s.targetUrl.toLowerCase().includes(q) || s.scanId.toLowerCase().includes(q));
    }
    return scans;
  }

  async updateScan(scanId, updateData) {
    if (this.useLocal) return sqliteStorage.updateScanStatus(scanId, updateData);

    const keys = Object.keys(updateData);
    if (keys.length === 0) return this.getScan(scanId);

    const expAttrNames = {};
    const expAttrValues = {};
    const setClauses = [];

    for (const key of keys) {
      expAttrNames[`#${key}`] = key;
      expAttrValues[`:${key}`] = updateData[key];
      setClauses.push(`#${key} = :${key}`);
    }

    const res = await docClient.send(
      new UpdateCommand({
        TableName: config.tables.scans,
        Key: { scanId },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: expAttrNames,
        ExpressionAttributeValues: expAttrValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return res.Attributes;
  }

  // ==================== FINDINGS ====================

  async saveFindings(scanId, findings) {
    if (this.useLocal) return sqliteStorage.saveFindings(scanId, findings);
    if (!findings || findings.length === 0) return [];

    const batches = [];
    for (let i = 0; i < findings.length; i += 25) {
      batches.push(findings.slice(i, i + 25));
    }

    for (const batch of batches) {
      const putRequests = batch.map((item) => ({
        PutRequest: {
          Item: { ...item, scanId },
        },
      }));

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [config.tables.findings]: putRequests,
          },
        })
      );
    }

    return findings;
  }

  async getFindingsByScan(scanId, options = {}) {
    if (this.useLocal) return sqliteStorage.getFindingsByScan(scanId, options);

    const res = await docClient.send(
      new QueryCommand({
        TableName: config.tables.findings,
        IndexName: 'scanId-index',
        KeyConditionExpression: 'scanId = :sid',
        ExpressionAttributeValues: {
          ':sid': scanId,
        },
      })
    );

    let items = res.Items || [];
    if (options.category && options.category !== 'all') {
      items = items.filter((f) => f.category === options.category);
    }
    if (options.severity && options.severity !== 'all') {
      items = items.filter((f) => f.severity === options.severity);
    }
    return items;
  }

  async updateFindingStatus(scanId, findingId, verificationStatus) {
    if (this.useLocal) return sqliteStorage.updateFindingStatus(scanId, findingId, verificationStatus);

    const res = await docClient.send(
      new UpdateCommand({
        TableName: config.tables.findings,
        Key: { scanId, id: findingId },
        UpdateExpression: 'SET verificationStatus = :status, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': verificationStatus,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return res.Attributes;
  }
}

export const dbService = new DynamoStorageService();
