#!/usr/bin/env node
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

const options = {
  url: { type: 'string' },
  'scan-id': { type: 'string' },
  output: { type: 'string' },
  emulatedFormFactor: { type: 'string', default: 'mobile' },
};

async function run() {
  const { values } = parseArgs({ options, allowPositionals: true });

  const targetUrl = values.url;
  const scanId = values['scan-id'];
  const outputPath = values.output;

  if (!targetUrl || !scanId || !outputPath) {
    console.error('Usage: node runner.js --url <URL> --scan-id <ID> --output <FILE>');
    process.exit(1);
  }

  console.log(`[LighthouseWorker] Starting audit for ${targetUrl} (scanId: ${scanId})`);
  const startTime = Date.now();

  try {
    // Dynamic import to allow running in environments without full Chrome installed
    let chromeLauncher;
    let lighthouse;
    try {
      chromeLauncher = await import('chrome-launcher');
      const lhModule = await import('lighthouse');
      lighthouse = lhModule.default || lhModule;
    } catch (importErr) {
      console.error('[LighthouseWorker] Lighthouse or chrome-launcher not found in environment.');
      const errReport = {
        scanId,
        targetUrl,
        error: 'LIGHTHOUSE_DEPENDENCY_MISSING',
        message: 'Lighthouse or chrome-launcher dependencies are not installed in the worker environment.',
        executionTimeMs: Date.now() - startTime,
      };
      await fs.writeFile(outputPath, JSON.stringify(errReport, null, 2), 'utf-8');
      process.exit(1);
    }

    const chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
      ],
    });

    const lhOptions = {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      logLevel: 'error',
    };

    const runnerResult = await lighthouse(targetUrl, lhOptions);
    await chrome.kill();

    const reportJson = runnerResult.report;
    await fs.writeFile(outputPath, reportJson, 'utf-8');

    const duration = Date.now() - startTime;
    console.log(`[LighthouseWorker] Audit completed in ${duration}ms. Saved to ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error(`[LighthouseWorker] Execution failed: ${err.message}`);
    const errReport = {
      scanId,
      targetUrl,
      error: 'LIGHTHOUSE_EXECUTION_FAILED',
      message: err.message,
      executionTimeMs: Date.now() - startTime,
    };
    await fs.writeFile(outputPath, JSON.stringify(errReport, null, 2), 'utf-8');
    process.exit(1);
  }
}

run();
