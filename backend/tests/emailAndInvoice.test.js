import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInvoicePdf } from '../src/services/pdf/invoicePdfGenerator.js';
import { generateAuditReportPdf } from '../src/services/pdf/reportPdfGenerator.js';
import { sendDeepSearchAuditEmail } from '../src/services/emailService.js';
import { dbService } from '../src/services/dynamoStorage.js';

test('Invoice PDF Generator: creates valid PDF buffer with invoice details', async () => {
  const buf = await generateInvoicePdf({
    invoiceNumber: 'INV-2026-TEST88',
    paymentId: 'pay_test_signature_valid',
    orderId: 'order_test_9988',
    customerName: 'Sudhanshu',
    customerEmail: 'accounts@pixir.in',
    targetUrl: 'https://pixir.in',
    scanId: 'scn_test_invoice_unit',
    amountPaid: 39,
    couponCode: null,
  });

  assert.ok(Buffer.isBuffer(buf), 'Should return a Node.js Buffer');
  assert.ok(buf.length > 5000, `Buffer length ${buf.length} should be substantial for a valid PDF`);

  // Verify PDF header magic bytes "%PDF-"
  const pdfHeader = buf.subarray(0, 5).toString('ascii');
  assert.equal(pdfHeader, '%PDF-', 'PDF must begin with valid PDF header magic bytes');
});

test('Invoice PDF Generator: handles coupon discounts correctly', async () => {
  const buf = await generateInvoicePdf({
    invoiceNumber: 'INV-2026-DISCOUNT',
    paymentId: 'pay_test_discount',
    customerName: 'Discount Tester',
    customerEmail: 'tester@example.com',
    targetUrl: 'https://example.com',
    scanId: 'scn_test_discount',
    amountPaid: 1,
    couponCode: 'FLAT418',
  });

  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 5000);
});

test('Report PDF Generator: creates multi-page developer audit report PDF', async () => {
  const mockReport = {
    scanId: 'scn_pdf_unit_test',
    targetUrl: 'https://pixir.in',
    scanProfile: 'authorized_deep',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    durationSeconds: 15,
    summary: {
      readinessScore: 85,
      totalFindings: 2,
      critical: 0,
      high: 1,
      medium: 1,
      low: 0,
      info: 0,
      categoryScores: {
        security: 80,
        performance: 90,
        privacy: 85,
      },
    },
    privacyCompliance: {
      complianceRating: 'compliant',
      hasGrievanceOfficer: true,
      hasTrackersBeforeConsent: false,
      hasRejectParity: true,
    },
    findings: [
      {
        id: 'f1',
        ruleId: 'SEC_CSP_MISSING',
        category: 'security',
        severity: 'high',
        title: 'Missing Content Security Policy Header',
        affectedUrl: 'https://pixir.in',
        engine: 'custom-python',
        aiExplanation: 'The application did not return a Content-Security-Policy header.',
        remediation: { summary: 'Configure a strict CSP header.' },
      },
      {
        id: 'f2',
        ruleId: 'SEC_HSTS_SHORT',
        category: 'security',
        severity: 'medium',
        title: 'Short Strict-Transport-Security Max-Age',
        affectedUrl: 'https://pixir.in',
        engine: 'custom-python',
        aiExplanation: 'HSTS max-age should be at least 31536000 seconds.',
        remediation: { summary: 'Increase max-age in HSTS header.' },
      },
    ],
  };

  const buf = await generateAuditReportPdf(mockReport);
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 8000, `Report PDF should have substantial size: ${buf.length}`);
  const header = buf.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});

test('Email Service: validates user email address requirement', async () => {
  const res = await sendDeepSearchAuditEmail({
    scan: { scanId: 'scn_no_email' },
    report: {},
    userEmail: null,
  });

  assert.equal(res.success, false);
  assert.equal(res.error, 'NO_VALID_EMAIL');
});

test('Email Service: saves local preview and records state when dispatching', async () => {
  const testScanId = `scn_email_unit_${Date.now()}`;
  const mockScan = {
    scanId: testScanId,
    ownerUserId: 'usr_unit_test',
    ownerEmail: 'accounts@pixir.in',
    ownerName: 'Unit Tester',
    targetUrl: 'https://pixir.in',
    normalizedHostname: 'pixir.in',
    scanProfile: 'authorized_deep',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    paymentId: 'pay_unit_123',
    amountPaid: 39,
  };

  await dbService.saveScan(mockScan);

  const mockReport = {
    scanId: testScanId,
    targetUrl: 'https://pixir.in',
    scanProfile: 'authorized_deep',
    status: 'COMPLETED',
    createdAt: mockScan.createdAt,
    summary: {
      readinessScore: 94,
      totalFindings: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      categoryScores: { security: 98, performance: 90 },
    },
    findings: [],
  };

  const dispatchResult = await sendDeepSearchAuditEmail({
    scan: mockScan,
    report: mockReport,
    userEmail: 'accounts@pixir.in',
    userName: 'Unit Tester',
    paymentId: 'pay_unit_123',
    amountPaid: 39,
  });

  assert.equal(dispatchResult.success, true);
  assert.ok(dispatchResult.emailId, 'Should return a valid emailId');

  // Verify scan record was updated in database
  const updatedScan = await dbService.getScan(testScanId);
  assert.ok(updatedScan, 'Scan should exist in DB');
  assert.equal(updatedScan.emailSent, true, 'emailSent should be true');
  assert.ok(updatedScan.emailSentAt, 'emailSentAt should be recorded');
});
