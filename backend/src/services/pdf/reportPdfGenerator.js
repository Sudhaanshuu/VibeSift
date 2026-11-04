import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates an official, developer-grade Website Launch-Readiness & Deep Audit Report PDF as a Buffer.
 *
 * @param {Object} report - Complete AuditReport object
 * @returns {Promise<Buffer>}
 */
export async function generateAuditReportPdf(report) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const COLOR_BRAND_DARK = [6, 78, 59]; // Emerald 900
  const COLOR_BRAND = [16, 185, 129]; // Emerald 500
  const COLOR_TEXT = [15, 23, 42]; // Slate 900
  const COLOR_TEXT_MUTED = [100, 116, 139]; // Slate 500
  const COLOR_BG_LIGHT = [248, 250, 252]; // Slate 50
  const COLOR_BORDER = [226, 232, 240]; // Slate 200

  const getSeverityColor = (sev) => {
    switch (String(sev).toLowerCase()) {
      case 'critical': return [225, 29, 72]; // Rose 600
      case 'high': return [234, 88, 12]; // Orange 600
      case 'medium': return [217, 119, 6]; // Amber 600
      case 'low': return [13, 148, 136]; // Teal 600
      default: return [100, 116, 139]; // Slate 500
    }
  };

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - margin - 30) {
      doc.addPage();
      y = margin;
    }
  };

  const applyAutoTable = autoTable.default || autoTable;

  // ==================== 1. HEADER & BRANDING ====================
  doc.setFillColor(...COLOR_BRAND_DARK);
  doc.rect(margin, y, contentWidth, 75, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('VIBESIFT', margin + 18, y + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text('WEBSITE LAUNCH-READINESS AUDIT REPORT', margin + 18, y + 46);
  doc.text(`Target: ${report.targetUrl || 'N/A'}`, margin + 18, y + 62);

  // Score Badge in Header (Right side)
  const score = report.summary?.readinessScore ?? 0;
  const scoreColor = score >= 90 ? [52, 211, 153] : score >= 75 ? [251, 191, 36] : [248, 113, 113];

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 120, y + 12, 105, 52, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${score}`, pageWidth - margin - 68, y + 38, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('READINESS SCORE', pageWidth - margin - 68, y + 54, { align: 'center' });

  y += 90;

  // ==================== 2. AUDIT METADATA BAR ====================
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 38, 4, 4, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const scanDate = report.createdAt ? new Date(report.createdAt).toUTCString() : new Date().toUTCString();
  const profileLabel = report.scanProfile === 'authorized_deep' ? 'Authorized Deep Scan' : 'Baseline Public Scan';
  const durationLabel = report.durationSeconds ? `${report.durationSeconds}s duration` : 'Complete';

  doc.text(`Scan ID: ${report.scanId || 'N/A'}`, margin + 12, y + 16);
  doc.text(`Audit Date: ${scanDate}`, margin + 12, y + 28);
  doc.text(`Profile: ${profileLabel} (${durationLabel})`, pageWidth - margin - 12, y + 16, { align: 'right' });
  doc.text(`Status: ${report.status || 'COMPLETED'}`, pageWidth - margin - 12, y + 28, { align: 'right' });

  y += 50;

  // ==================== 3. EXECUTIVE SUMMARY ====================
  ensureSpace(90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Executive Launch-Readiness Summary', margin, y);
  y += 14;

  const totalFindings = report.summary?.totalFindings ?? 0;
  const criticalCount = report.summary?.critical ?? 0;
  const highCount = report.summary?.high ?? 0;

  const execSummary =
    report.summary?.executiveSummary ||
    `The target website achieved an overall launch readiness score of ${score}/100 with ${totalFindings} findings identified across inspected vectors. Identified issues include ${criticalCount} critical and ${highCount} high severity findings requiring attention prior to public launch.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(execSummary, contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 14 + 14;

  // ==================== 4. SCORES & SEVERITY TABLES ====================
  ensureSpace(120);

  const categoryScores = report.summary?.categoryScores || {};
  const catRows = Object.entries(categoryScores).map(([cat, val]) => [
    cat.toUpperCase(),
    `${val} / 100`,
    val >= 90 ? 'Strong' : val >= 70 ? 'Moderate' : 'Action Required',
  ]);

  if (catRows.length > 0) {
    applyAutoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Category Vector', 'Score', 'Status Evaluation']],
      body: catRows,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    y = doc.lastAutoTable.finalY + 18;
  }

  // Severity Tally Strip
  ensureSpace(50);
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(margin, y, contentWidth, 34, 4, 4, 'FD');

  const pillWidth = contentWidth / 5;
  const severities = [
    { label: 'Critical', count: report.summary?.critical ?? 0, color: [225, 29, 72] },
    { label: 'High', count: report.summary?.high ?? 0, color: [234, 88, 12] },
    { label: 'Medium', count: report.summary?.medium ?? 0, color: [217, 119, 6] },
    { label: 'Low', count: report.summary?.low ?? 0, color: [13, 148, 136] },
    { label: 'Informational', count: report.summary?.info ?? 0, color: [100, 116, 139] },
  ];

  severities.forEach((sev, i) => {
    const px = margin + i * pillWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(sev.color[0], sev.color[1], sev.color[2]);
    doc.text(`${sev.count}`, px + pillWidth / 2, y + 16, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(sev.label.toUpperCase(), px + pillWidth / 2, y + 26, { align: 'center' });
  });

  y += 50;

  // ==================== 5. INDIAN DPDP ACT (2023) COMPLIANCE SECTION ====================
  if (report.privacyCompliance) {
    const pc = report.privacyCompliance;
    ensureSpace(100);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_TEXT);
    doc.text('Privacy & Indian DPDP Act (2023) Assessment', margin, y);
    y += 16;

    const complianceRating = pc.complianceRating || pc.overallRating || 'needs_review';
    const ratingColor =
      complianceRating === 'compliant'
        ? [16, 185, 129]
        : complianceRating === 'partially_compliant' || complianceRating === 'needs_attention'
        ? [217, 119, 6]
        : [225, 29, 72];

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(margin, y, contentWidth, 54, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...ratingColor);
    doc.text(`Rating: ${complianceRating.toUpperCase().replace('_', ' ')}`, margin + 12, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Grievance Redressal Officer: ${pc.hasGrievanceOfficer ? 'Identified' : 'Missing'}`, margin + 12, y + 32);
    doc.text(`• Pre-Consent Tracking Cookies: ${pc.hasTrackersBeforeConsent ? 'Detected (Risk)' : 'Clean'}`, margin + 12, y + 44);
    doc.text(`• Consent Notice & Reject Parity: ${pc.hasRejectParity ? 'Verified' : 'Review Required'}`, margin + 220, y + 32);

    y += 70;
  }

  // ==================== 6. DETAILED FINDINGS ====================
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR_TEXT);
  const findingsList = Array.isArray(report.findings) ? report.findings : [];
  doc.text(`Technical Audit Findings & Actionable Remediation Specs (${findingsList.length})`, margin, y);
  y += 18;

  if (findingsList.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No critical security vulnerabilities, performance regressions, or SEO deficiencies were detected.', margin, y);
    y += 24;
  } else {
    // Show top 25 findings to keep PDF size tight and developer-focused
    const displayFindings = findingsList.slice(0, 25);
    displayFindings.forEach((finding, index) => {
      ensureSpace(120);

      const sevColor = getSeverityColor(finding.severity);

      // Title line with severity tag
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
      const sevTag = `[${String(finding.severity || 'INFO').toUpperCase()}]`;
      doc.text(sevTag, margin, y);

      const tagWidth = doc.getTextWidth(sevTag) + 6;
      doc.setTextColor(...COLOR_TEXT);
      const titleText = `${index + 1}. ${finding.title || 'Audit Observation'}`;
      const splitTitle = doc.splitTextToSize(titleText, contentWidth - tagWidth);
      doc.text(splitTitle, margin + tagWidth, y);
      y += splitTitle.length * 13 + 4;

      // Meta attributes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Rule: ${finding.ruleId || 'N/A'}  |  Category: ${String(finding.category || 'General').toUpperCase()}  |  Engine: ${finding.engine || 'VibeCode'}`,
        margin,
        y
      );
      y += 11;

      if (finding.affectedUrl) {
        doc.text(`URL: ${finding.affectedUrl}`, margin, y);
        y += 13;
      }

      // Technical Explanation
      const explanation = finding.aiExplanation || finding.description;
      if (explanation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text('Explanation:', margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitExp = doc.splitTextToSize(explanation, contentWidth);
        doc.text(splitExp, margin, y);
        y += splitExp.length * 10 + 6;
      }

      // Remediation summary
      const remediation = finding.remediation?.summary || (typeof finding.remediation === 'string' ? finding.remediation : '');
      if (remediation) {
        ensureSpace(28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 95, 70); // Emerald 800
        doc.text('Recommended Fix:', margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitRem = doc.splitTextToSize(remediation, contentWidth);
        doc.text(splitRem, margin, y);
        y += splitRem.length * 10 + 6;
      }

      y += 10;
      doc.setDrawColor(...COLOR_BORDER);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
    });

    if (findingsList.length > 25) {
      ensureSpace(30);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `... and ${findingsList.length - 25} additional observations. View complete interactive results at https://vibesift.pixir.in/scans/${report.scanId}`,
        margin,
        y
      );
      y += 20;
    }
  }

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `VibeSift by Pixir  •  Website Launch-Readiness Audit  •  https://vibesift.pixir.in`,
      margin,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
