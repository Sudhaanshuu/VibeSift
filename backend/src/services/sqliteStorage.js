import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve('.local_storage');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DB_DIR, 'vibesift.sqlite');

class SqliteStorage {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        ownerUserId TEXT NOT NULL,
        hostname TEXT NOT NULL,
        normalizedUrl TEXT NOT NULL,
        isVerified INTEGER DEFAULT 0,
        verificationMethod TEXT,
        verificationToken TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        totalScans INTEGER DEFAULT 0,
        latestScore INTEGER,
        lastScannedAt TEXT,
        latestScanId TEXT,
        scoreTrend TEXT,
        averageScore REAL
      );

      CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(ownerUserId);
      CREATE INDEX IF NOT EXISTS idx_sites_host ON sites(hostname);

      CREATE TABLE IF NOT EXISTS scans (
        scanId TEXT PRIMARY KEY,
        ownerUserId TEXT NOT NULL,
        targetUrl TEXT NOT NULL,
        normalizedHostname TEXT NOT NULL,
        scanProfile TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT,
        enginesRun TEXT,
        durationSeconds REAL,
        checksNotPerformed TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        idempotencyKey TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scans_user_created ON scans(ownerUserId, createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_scans_host ON scans(normalizedHostname);
      CREATE INDEX IF NOT EXISTS idx_scans_idempotency ON scans(ownerUserId, idempotencyKey);

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        scanId TEXT NOT NULL,
        ruleId TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        confidence TEXT,
        title TEXT NOT NULL,
        description TEXT,
        affectedUrl TEXT,
        detectionMethod TEXT,
        engine TEXT,
        impact TEXT,
        remediation TEXT,
        evidence TEXT,
        verificationStatus TEXT DEFAULT 'open',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scanId);
      CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);
      CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        passwordHash TEXT,
        plan TEXT DEFAULT 'verified_developer',
        createdAt TEXT NOT NULL
      );
    `);
  }

  // ==================== SITES ====================

  async saveSite(site) {
    const stmt = this.db.prepare(`
      INSERT INTO sites (
        id, ownerUserId, hostname, normalizedUrl, isVerified,
        verificationMethod, verificationToken, createdAt, updatedAt,
        totalScans, latestScore, lastScannedAt, latestScanId, scoreTrend, averageScore
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        hostname = excluded.hostname,
        normalizedUrl = excluded.normalizedUrl,
        isVerified = excluded.isVerified,
        verificationMethod = excluded.verificationMethod,
        verificationToken = excluded.verificationToken,
        updatedAt = excluded.updatedAt,
        totalScans = excluded.totalScans,
        latestScore = excluded.latestScore,
        lastScannedAt = excluded.lastScannedAt,
        latestScanId = excluded.latestScanId,
        scoreTrend = excluded.scoreTrend,
        averageScore = excluded.averageScore
    `);

    const now = new Date().toISOString();
    stmt.run(
      site.id,
      site.ownerUserId,
      site.hostname,
      site.normalizedUrl,
      site.isVerified ? 1 : 0,
      site.verificationMethod || null,
      site.verificationToken || null,
      site.createdAt || now,
      site.updatedAt || now,
      site.totalScans || 0,
      site.latestScore !== undefined ? site.latestScore : null,
      site.lastScannedAt || null,
      site.latestScanId || null,
      site.scoreTrend ? JSON.stringify(site.scoreTrend) : null,
      site.averageScore !== undefined ? site.averageScore : null
    );

    return this.getSite(site.id, site.ownerUserId);
  }

  async getSite(siteId, ownerUserId = null) {
    let query = 'SELECT * FROM sites WHERE id = ?';
    const params = [siteId];
    if (ownerUserId) {
      query += ' AND ownerUserId = ?';
      params.push(ownerUserId);
    }
    const row = this.db.prepare(query).get(...params);
    return row ? this._mapSiteRow(row) : null;
  }

  async getSiteByHostname(hostname, ownerUserId = null) {
    let query = 'SELECT * FROM sites WHERE hostname = ?';
    const params = [hostname.toLowerCase()];
    if (ownerUserId) {
      query += ' AND ownerUserId = ?';
      params.push(ownerUserId);
    }
    const row = this.db.prepare(query).get(...params);
    return row ? this._mapSiteRow(row) : null;
  }

  async listSitesByUser(ownerUserId) {
    const rows = this.db.prepare('SELECT * FROM sites WHERE ownerUserId = ? ORDER BY updatedAt DESC').all(ownerUserId);
    return rows.map((r) => this._mapSiteRow(r));
  }

  async deleteSite(siteId, ownerUserId) {
    const stmt = this.db.prepare('DELETE FROM sites WHERE id = ? AND ownerUserId = ?');
    const result = stmt.run(siteId, ownerUserId);
    return result.changes > 0;
  }

  async getSiteStats(siteIdOrHostname, ownerUserId = null) {
    let site = await this.getSite(siteIdOrHostname, ownerUserId);
    if (!site) {
      site = await this.getSiteByHostname(siteIdOrHostname, ownerUserId);
    }

    const hostname = site ? site.hostname : siteIdOrHostname.toLowerCase();

    // Fetch all completed scans for this hostname
    let scanQuery = "SELECT * FROM scans WHERE normalizedHostname = ? AND status = 'COMPLETED' ORDER BY createdAt DESC";
    const scanParams = [hostname];
    if (ownerUserId) {
      scanQuery = "SELECT * FROM scans WHERE normalizedHostname = ? AND ownerUserId = ? AND status = 'COMPLETED' ORDER BY createdAt DESC";
      scanParams.push(ownerUserId);
    }

    const scanRows = this.db.prepare(scanQuery).all(...scanParams);
    const scans = scanRows.map((r) => this._mapScanRow(r));

    const totalScans = scans.length;
    if (totalScans === 0) {
      return {
        hostname,
        siteId: site?.id || null,
        totalScans: 0,
        latestScore: null,
        averageScore: null,
        scoreDelta: null,
        lastScannedAt: null,
        scoreHistory: [],
        categoryAverages: {},
        findingsSummary: { total: 0, open: 0, fixed: 0, waived: 0 },
      };
    }

    const scores = scans.map((s) => s.summary?.readinessScore).filter((sc) => sc !== undefined && sc !== null);
    const latestScore = scores[0] ?? null;
    const previousScore = scores.length > 1 ? scores[1] : null;
    const scoreDelta = previousScore !== null && latestScore !== null ? latestScore - previousScore : 0;
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const scoreHistory = scans.slice(0, 10).map((s) => ({
      scanId: s.scanId,
      createdAt: s.createdAt,
      readinessScore: s.summary?.readinessScore ?? 0,
      critical: s.summary?.critical ?? 0,
      high: s.summary?.high ?? 0,
      medium: s.summary?.medium ?? 0,
    }));

    // Category averages
    const categorySums = {};
    const categoryCounts = {};
    for (const scan of scans) {
      const catScores = scan.summary?.categoryScores || {};
      for (const [cat, val] of Object.entries(catScores)) {
        categorySums[cat] = (categorySums[cat] || 0) + val;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    const categoryAverages = {};
    for (const cat of Object.keys(categorySums)) {
      categoryAverages[cat] = Math.round(categorySums[cat] / categoryCounts[cat]);
    }

    // Findings tallies across latest scan
    const latestScanId = scans[0].scanId;
    const latestFindings = await this.getFindingsByScan(latestScanId);
    const findingsSummary = {
      total: latestFindings.length,
      open: latestFindings.filter((f) => f.verificationStatus === 'open').length,
      fixed: latestFindings.filter((f) => f.verificationStatus === 'fixed').length,
      waived: latestFindings.filter((f) => f.verificationStatus === 'waived').length,
    };

    return {
      hostname,
      siteId: site?.id || null,
      totalScans,
      latestScore,
      previousScore,
      scoreDelta,
      averageScore,
      lastScannedAt: scans[0].createdAt,
      latestScanId,
      scoreHistory,
      categoryAverages,
      findingsSummary,
    };
  }

  // ==================== SCANS ====================

  async saveScan(scan) {
    const stmt = this.db.prepare(`
      INSERT INTO scans (
        scanId, ownerUserId, targetUrl, normalizedHostname, scanProfile,
        status, summary, enginesRun, durationSeconds, checksNotPerformed,
        createdAt, updatedAt, idempotencyKey
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scanId) DO UPDATE SET
        status = excluded.status,
        summary = excluded.summary,
        enginesRun = excluded.enginesRun,
        durationSeconds = excluded.durationSeconds,
        checksNotPerformed = excluded.checksNotPerformed,
        updatedAt = excluded.updatedAt
    `);

    const now = new Date().toISOString();
    stmt.run(
      scan.scanId,
      scan.ownerUserId,
      scan.targetUrl,
      scan.normalizedHostname,
      scan.scanProfile,
      scan.status,
      scan.summary ? JSON.stringify(scan.summary) : null,
      scan.enginesRun ? JSON.stringify(scan.enginesRun) : '[]',
      scan.durationSeconds || 0,
      scan.checksNotPerformed ? JSON.stringify(scan.checksNotPerformed) : '[]',
      scan.createdAt || now,
      scan.updatedAt || now,
      scan.idempotencyKey || null
    );

    // If scan has completed, update or auto-link site statistics
    if (scan.status === 'COMPLETED' && scan.normalizedHostname) {
      this._updateSiteAfterScan(scan);
    }

    return this.getScan(scan.scanId, scan.ownerUserId);
  }

  _updateSiteAfterScan(scan) {
    try {
      const hostname = scan.normalizedHostname.toLowerCase();
      let site = this.db.prepare('SELECT * FROM sites WHERE hostname = ? AND ownerUserId = ?').get(hostname, scan.ownerUserId);

      const readinessScore = scan.summary?.readinessScore ?? null;

      if (!site) {
        // Auto-save site if it doesn't exist yet
        const siteId = `site_${scan.scanId.slice(4, 12)}`;
        const now = new Date().toISOString();
        this.db.prepare(`
          INSERT INTO sites (
            id, ownerUserId, hostname, normalizedUrl, isVerified,
            createdAt, updatedAt, totalScans, latestScore, lastScannedAt, latestScanId, averageScore
          ) VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?, ?, ?, ?)
        `).run(
          siteId,
          scan.ownerUserId,
          hostname,
          `https://${hostname}`,
          now,
          now,
          readinessScore,
          scan.createdAt || now,
          scan.scanId,
          readinessScore
        );
      } else {
        // Update existing site statistics
        const currentTotal = (site.totalScans || 0) + 1;
        const prevLatest = site.latestScore ?? readinessScore;
        const delta = readinessScore !== null ? readinessScore - prevLatest : 0;
        const trend = { prevScore: prevLatest, delta };

        this.db.prepare(`
          UPDATE sites SET
            totalScans = ?,
            latestScore = ?,
            lastScannedAt = ?,
            latestScanId = ?,
            scoreTrend = ?,
            updatedAt = ?
          WHERE id = ?
        `).run(
          currentTotal,
          readinessScore,
          scan.createdAt || new Date().toISOString(),
          scan.scanId,
          JSON.stringify(trend),
          new Date().toISOString(),
          site.id
        );
      }
    } catch (err) {
      console.warn('[SqliteStorage] Failed to update site after scan:', err.message);
    }
  }

  async getScan(scanId, ownerUserId = null) {
    let query = 'SELECT * FROM scans WHERE scanId = ?';
    const params = [scanId];
    if (ownerUserId) {
      query += ' AND ownerUserId = ?';
      params.push(ownerUserId);
    }
    const row = this.db.prepare(query).get(...params);
    return row ? this._mapScanRow(row) : null;
  }

  async getLatestScanForSite(hostname, ownerUserId = null) {
    let query = 'SELECT * FROM scans WHERE normalizedHostname = ?';
    const params = [hostname.toLowerCase()];
    if (ownerUserId) {
      query += ' AND ownerUserId = ?';
      params.push(ownerUserId);
    }
    query += ' ORDER BY createdAt DESC LIMIT 1';
    const row = this.db.prepare(query).get(...params);
    return row ? this._mapScanRow(row) : null;
  }

  async getScanByIdempotencyKey(ownerUserId, idempotencyKey) {
    const row = this.db.prepare('SELECT * FROM scans WHERE ownerUserId = ? AND idempotencyKey = ?').get(ownerUserId, idempotencyKey);
    return row ? this._mapScanRow(row) : null;
  }

  async listScansByUser(ownerUserId, options = {}) {
    let query = 'SELECT * FROM scans WHERE ownerUserId = ?';
    const params = [ownerUserId];

    if (options.profile) {
      query += ' AND scanProfile = ?';
      params.push(options.profile);
    }

    if (options.hostname) {
      query += ' AND normalizedHostname = ?';
      params.push(options.hostname.toLowerCase());
    }

    if (options.search) {
      query += ' AND (targetUrl LIKE ? OR scanId LIKE ? OR normalizedHostname LIKE ?)';
      const s = `%${options.search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY createdAt DESC';
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(options.limit, 10));
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r) => this._mapScanRow(r));
  }

  async updateScanStatus(scanId, updateData) {
    const existing = await this.getScan(scanId);
    if (!existing) return null;

    const merged = { ...existing, ...updateData, updatedAt: new Date().toISOString() };
    await this.saveScan(merged);
    return merged;
  }

  // ==================== FINDINGS ====================

  async saveFindings(scanId, findings) {
    const stmt = this.db.prepare(`
      INSERT INTO findings (
        id, scanId, ruleId, category, severity, confidence,
        title, description, affectedUrl, detectionMethod, engine,
        impact, remediation, evidence, verificationStatus, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        verificationStatus = excluded.verificationStatus,
        updatedAt = excluded.updatedAt
    `);

    const now = new Date().toISOString();
    for (const f of findings) {
      stmt.run(
        f.id,
        scanId,
        f.ruleId,
        f.category,
        f.severity,
        f.confidence || 'high',
        f.title,
        f.description || '',
        f.affectedUrl || '',
        f.detectionMethod || 'passive',
        f.engine || 'custom-python',
        f.impact || '',
        f.remediation ? JSON.stringify(f.remediation) : null,
        f.evidence ? JSON.stringify(f.evidence) : null,
        f.verificationStatus || 'open',
        f.createdAt || now,
        f.updatedAt || now
      );
    }
    return findings;
  }

  async getFindingsByScan(scanId, options = {}) {
    let query = 'SELECT * FROM findings WHERE scanId = ?';
    const params = [scanId];

    if (options.category && options.category !== 'all') {
      query += ' AND category = ?';
      params.push(options.category);
    }
    if (options.severity && options.severity !== 'all') {
      query += ' AND severity = ?';
      params.push(options.severity);
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r) => this._mapFindingRow(r));
  }

  async updateFindingStatus(scanId, findingId, verificationStatus) {
    const stmt = this.db.prepare(`
      UPDATE findings SET verificationStatus = ?, updatedAt = ?
      WHERE id = ? AND scanId = ?
    `);
    const now = new Date().toISOString();
    const result = stmt.run(verificationStatus, now, findingId, scanId);
    return result.changes > 0;
  }

  // ==================== USERS & AUTH ====================

  async saveUser(user) {
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, passwordHash, plan, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        plan = excluded.plan
    `);
    const now = new Date().toISOString();
    stmt.run(user.id, user.email.toLowerCase(), user.name || user.email.split('@')[0], user.passwordHash || null, user.plan || 'verified_developer', user.createdAt || now);
    return this.getUserById(user.id);
  }

  async getUserByEmail(email) {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    return row ? { ...row } : null;
  }

  async getUserById(id) {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? { ...row } : null;
  }

  // ==================== ROW MAPPERS ====================

  _mapSiteRow(r) {
    return {
      id: r.id,
      ownerUserId: r.ownerUserId,
      hostname: r.hostname,
      normalizedUrl: r.normalizedUrl,
      isVerified: Boolean(r.isVerified),
      verificationMethod: r.verificationMethod,
      verificationToken: r.verificationToken,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      totalScans: r.totalScans || 0,
      latestScore: r.latestScore,
      lastScannedAt: r.lastScannedAt,
      latestScanId: r.latestScanId,
      scoreTrend: r.scoreTrend ? JSON.parse(r.scoreTrend) : null,
      averageScore: r.averageScore,
    };
  }

  _mapScanRow(r) {
    return {
      scanId: r.scanId,
      ownerUserId: r.ownerUserId,
      targetUrl: r.targetUrl,
      normalizedHostname: r.normalizedHostname,
      scanProfile: r.scanProfile,
      status: r.status,
      summary: r.summary ? JSON.parse(r.summary) : null,
      enginesRun: r.enginesRun ? JSON.parse(r.enginesRun) : [],
      durationSeconds: r.durationSeconds || 0,
      checksNotPerformed: r.checksNotPerformed ? JSON.parse(r.checksNotPerformed) : [],
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      idempotencyKey: r.idempotencyKey,
    };
  }

  _mapFindingRow(r) {
    return {
      id: r.id,
      scanId: r.scanId,
      ruleId: r.ruleId,
      category: r.category,
      severity: r.severity,
      confidence: r.confidence,
      title: r.title,
      description: r.description,
      affectedUrl: r.affectedUrl,
      detectionMethod: r.detectionMethod,
      engine: r.engine,
      impact: r.impact,
      remediation: r.remediation ? JSON.parse(r.remediation) : { summary: '' },
      evidence: r.evidence ? JSON.parse(r.evidence) : {},
      verificationStatus: r.verificationStatus,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

export const sqliteStorage = new SqliteStorage();
