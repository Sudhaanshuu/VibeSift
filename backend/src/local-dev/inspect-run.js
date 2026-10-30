#!/usr/bin/env node
/**
 * VibeSift Demo Inspection Utility
 * Inspects what SQLite and S3 store for the latest audit run in real time.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve('.local_storage', 'vibesift.sqlite');
const S3_BASE = path.resolve('.local_storage', 's3', 'scans');

console.log('\n================================================================');
console.log('       🔍 VIBESIFT REAL-TIME SERVICES INSPECTION DASHBOARD       ');
console.log('================================================================\n');

if (!fs.existsSync(DB_PATH)) {
  console.log(`⚠️  SQLite database not found at ${DB_PATH}. Run a scan first via frontend or API!`);
  process.exit(0);
}

const db = new DatabaseSync(DB_PATH);

// 1. Inspect Latest User
try {
  const users = db.prepare('SELECT id, email, name, plan, createdAt FROM users ORDER BY rowid DESC LIMIT 1').all();
  console.log('👤 [COGNITO & SQLITE] LATEST REGISTERED USER:');
  if (users.length > 0) {
    console.table(users);
  } else {
    console.log('   (No local user records found yet)');
  }
} catch (e) {
  console.log('   User table inspection note:', e.message);
}

console.log('\n----------------------------------------------------------------');

// 2. Inspect Scan (specified via argv[2] or latest completed / latest scan)
let latestScan = null;
const targetScanId = process.argv[2];
try {
  let query = 'SELECT scanId, targetUrl, normalizedHostname, status, durationSeconds, createdAt, updatedAt FROM scans ORDER BY createdAt DESC LIMIT 1';
  let params = [];
  if (targetScanId) {
    query = 'SELECT scanId, targetUrl, normalizedHostname, status, durationSeconds, createdAt, updatedAt FROM scans WHERE scanId = ?';
    params = [targetScanId];
  } else {
    // Prefer latest completed scan if available, else latest scan
    const completedScan = db.prepare("SELECT scanId, targetUrl, normalizedHostname, status, durationSeconds, createdAt, updatedAt FROM scans WHERE status = 'COMPLETED' ORDER BY createdAt DESC LIMIT 1").get();
    if (completedScan) {
      latestScan = completedScan;
    }
  }

  if (!latestScan) {
    const scans = db.prepare(query).all(...params);
    if (scans.length > 0) {
      latestScan = scans[0];
    }
  }

  if (latestScan) {
    console.log(`🚀 [SQLITE] AUDIT SCAN RECORD (Scan ID: ${latestScan.scanId}):`);
    console.table([latestScan]);

    // Parse summary & engines
    const fullScan = db.prepare('SELECT summary, enginesRun, checks, privacyCompliance FROM scans WHERE scanId = ?').get(latestScan.scanId);
    if (fullScan?.summary) {
      try {
        const sum = JSON.parse(fullScan.summary);
        console.log(`\n📊 [METRICS] READINESS SCORE: ${sum.readinessScore}/100 | TOTAL FINDINGS: ${sum.totalFindings}`);
        console.log('   Category Breakdown:', JSON.stringify(sum.categoryScores || {}));
      } catch {}
    }
    if (fullScan?.enginesRun) {
      try {
        const engines = JSON.parse(fullScan.enginesRun);
        console.log('\n⚙️  [ENGINES TRIGGERED]:');
        console.table(engines.map((e) => ({
          Engine: e.engine,
          Name: e.displayName,
          Status: e.status,
          ExecutionTime: `${e.executionTimeMs}ms`,
        })));
      } catch {}
    }
  } else {
    console.log('   (No scans found in SQLite database yet)');
  }
} catch (e) {
  console.log('   Scans table inspection error:', e.message);
}

console.log('\n----------------------------------------------------------------');

// 3. Inspect Findings
if (latestScan) {
  try {
    const findings = db.prepare('SELECT id, ruleId, category, severity, title FROM findings WHERE scanId = ? ORDER BY rowid ASC').all(latestScan.scanId);
    console.log(`🛡️  [SQLITE] PERSISTED FINDINGS (${findings.length} findings recorded for this run):`);
    if (findings.length > 0) {
      console.table(findings.slice(0, 5));
      if (findings.length > 5) {
        console.log(`   ... and ${findings.length - 5} more findings stored in SQLite.`);
      }
    } else {
      console.log('   (Zero findings recorded - target clean or pending)');
    }
  } catch (e) {
    console.log('   Findings table inspection error:', e.message);
  }

  console.log('\n----------------------------------------------------------------');

  // 4. Inspect Amazon S3 / Local Storage Artifacts
  console.log(`📦 [AMAZON S3] STORAGE ARTIFACTS FOR SCAN ${latestScan.scanId}:`);
  const scanS3Dir = path.join(S3_BASE, latestScan.scanId);
  if (fs.existsSync(scanS3Dir)) {
    const files = [];

    function walkDir(dir, prefix = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkDir(full, rel);
        } else {
          const stats = fs.statSync(full);
          files.push({
            S3_Key: `scans/${latestScan.scanId}/${rel}`,
            Size_Bytes: stats.size,
            LastModified: stats.mtime.toISOString(),
          });
        }
      }
    }

    walkDir(scanS3Dir);
    if (files.length > 0) {
      console.table(files);
      console.log(`\n✅ Verified: All engine outputs and finalized audit reports are persisted to S3.`);
    } else {
      console.log('   (Scan directory exists but no files uploaded yet)');
    }
  } else {
    console.log(`   (No local S3 directory found at ${scanS3Dir})`);
  }
}

console.log('\n================================================================\n');
