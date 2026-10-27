import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditReport, Finding } from '../../types/audit';

/**
 * Generates and downloads a developer-grade PDF audit report
 * containing Launch Readiness Score, category scores, executive summary,
 * Bedrock/AI explanations, and comprehensive remediation specs.
 */
export async function exportReportToPdf(report: AuditReport): Promise<void> {
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

  // Colors
  const COLOR_BRAND = [16, 185, 129]; // Emerald 500
  const COLOR_BRAND_DARK = [6, 95, 70]; // Emerald 800
  const COLOR_TEXT = [15, 23, 42]; // Slate 900
  const COLOR_TEXT_MUTED = [100, 116, 139]; // Slate 500
  const COLOR_BG_LIGHT = [248, 250, 252]; // Slate 50

  const getSeverityColor = (sev: string): [number, number, number] => {
    switch (sev.toLowerCase()) {
      case 'critical': return [225, 29, 72]; // Rose 600
      case 'high': return [234, 88, 12]; // Orange 600
      case 'medium': return [217, 119, 6]; // Amber 600
      case 'low': return [13, 148, 136]; // Teal 600
      default: return [100, 116, 139]; // Slate 500
    }
  };

  // Helper: check page break
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin - 30) {
      doc.addPage();
      y = margin;
    }
  };

  // ==================== 1. HEADER & BRANDING ====================
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(margin, y, contentWidth, 75, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('VIBESIFT', margin + 18, y + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text('WEBSITE LAUNCH-READINESS AUDIT REPORT', margin + 18, y + 46);
  doc.text(`Target: ${report.targetUrl}`, margin + 18, y + 62);

  // Score Badge in Header (Right side)
  const score = report.summary.readinessScore;
  const scoreColor = score >= 90 ? [52, 211, 153] : score >= 75 ? [251, 191, 36] : [248, 113, 113];
  
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 120, y + 12, 105, 52, 6, 6, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${score}`, pageWidth - margin - 78, y + 38, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('READINESS SCORE', pageWidth - margin - 78, y + 54, { align: 'center' });

  y += 90;

  // ==================== 2. AUDIT METADATA BAR ====================
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 38, 4, 4, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const scanDate = new Date(report.createdAt).toUTCString();
  const profileLabel = report.scanProfile === 'authorized_deep' ? 'Authorized Deep Scan' : 'Baseline Public Scan';
  const durationLabel = report.durationSeconds ? `${report.durationSeconds}s duration` : 'Instant';

  doc.text(`Scan ID: ${report.scanId}`, margin + 12, y + 16);
  doc.text(`Audit Date: ${scanDate}`, margin + 12, y + 28);
  doc.text(`Profile: ${profileLabel} (${durationLabel})`, pageWidth - margin - 12, y + 16, { align: 'right' });
  doc.text(`Status: ${report.status}`, pageWidth - margin - 12, y + 28, { align: 'right' });

  y += 50;

  // ==================== 3. EXECUTIVE SUMMARY ====================
  ensureSpace(90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Launch-Readiness Summary', margin, y);
  y += 14;

  const execSummary = report.summary.executiveSummary || 
    `The target website achieved an overall launch readiness score of ${score}/100 with ${report.summary.totalFindings} findings identified across inspected vectors. Identified issues include ${report.summary.critical} critical and ${report.summary.high} high severity findings requiring attention prior to public launch.`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(execSummary, contentWidth);
  doc.text(splitSummary, margin, y);
  y += splitSummary.length * 14 + 14;

  // ==================== 4. SCORES & SEVERITY TABLES ====================
  ensureSpace(120);

  // Category Scores Table & Severity Breakdown
  const catRows = Object.entries(report.summary.categoryScores).map(([cat, val]) => [
    cat.toUpperCase(),
    `${val} / 100`,
    val >= 90 ? 'Strong' : val >= 70 ? 'Moderate' : 'Action Required',
  ]);

  autoTable(doc, {
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

  y = (doc as any).lastAutoTable.finalY + 18;

  // Severity Tally Strip
  ensureSpace(50);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 34, 4, 4, 'FD');

  const pillWidth = contentWidth / 5;
  const severities = [
    { label: 'Critical', count: report.summary.critical, color: [225, 29, 72] },
    { label: 'High', count: report.summary.high, color: [234, 88, 12] },
    { label: 'Medium', count: report.summary.medium, color: [217, 119, 6] },
    { label: 'Low', count: report.summary.low, color: [13, 148, 136] },
    { label: 'Informational', count: report.summary.info, color: [100, 116, 139] },
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

  // ==================== 5. DETAILED FINDINGS WITH EXPLANATIONS ====================
  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`Technical Audit Findings & Actionable Remediation Specs (${report.findings.length})`, margin, y);
  y += 18;

  if (report.findings.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No security vulnerabilities, performance regressions, or SEO deficiencies were detected.', margin, y);
    y += 24;
  } else {
    report.findings.forEach((finding: Finding, index: number) => {
      ensureSpace(140);

      const sevColor = getSeverityColor(finding.severity);
      
      // Finding Card Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      
      // Title line with severity tag
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
      const sevTag = `[${finding.severity.toUpperCase()}]`;
      doc.text(sevTag, margin, y);

      const tagWidth = doc.getTextWidth(sevTag) + 6;
      doc.setTextColor(15, 23, 42);
      const titleText = `${index + 1}. ${finding.title}`;
      const splitTitle = doc.splitTextToSize(titleText, contentWidth - tagWidth);
      doc.text(splitTitle, margin + tagWidth, y);
      y += splitTitle.length * 13 + 4;

      // Meta attributes (Rule ID, Category, Affected URL)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Rule: ${finding.ruleId}  |  Category: ${finding.category.toUpperCase()}  |  Engine: ${finding.engine}  |  Status: ${finding.verificationStatus.toUpperCase()}`, margin, y);
      y += 11;
      
      doc.text(`Target URL: ${finding.affectedUrl}`, margin, y);
      y += 13;

      // AI Explanation / Description
      const explanation = finding.aiExplanation || finding.description;
      if (explanation) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text('Technical Explanation:', margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const splitExp = doc.splitTextToSize(explanation, contentWidth);
        doc.text(splitExp, margin, y);
        y += splitExp.length * 11 + 6;
      }

      // Impact Analysis
      if (finding.impact) {
        ensureSpace(35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9); // Amber 700
        doc.text('Impact on Users / Production Posture:', margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        const splitImpact = doc.splitTextToSize(finding.impact, contentWidth);
        doc.text(splitImpact, margin, y);
        y += splitImpact.length * 11 + 6;
      }

      // Remediation Guidance & Code Snippet
      if (finding.remediation?.summary) {
        ensureSpace(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(6, 95, 70); // Emerald 800
        doc.text('Recommended Remediation Spec:', margin, y);
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const splitRem = doc.splitTextToSize(finding.remediation.summary, contentWidth);
        doc.text(splitRem, margin, y);
        y += splitRem.length * 11 + 6;
      }

      // Code snippet block if present
      if (finding.remediation?.codeSnippet) {
        ensureSpace(50);
        const snippet = finding.remediation.codeSnippet;
        const splitSnippet = doc.splitTextToSize(snippet, contentWidth - 16);
        const snippetBoxHeight = splitSnippet.length * 10 + 10;

        doc.setFillColor(241, 245, 249); // Slate 100
        doc.roundedRect(margin, y, contentWidth, snippetBoxHeight, 3, 3, 'F');

        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(splitSnippet, margin + 8, y + 11);
        y += snippetBoxHeight + 8;
      }

      // Evidence Snippet if present
      const evidenceText = finding.evidence?.observedHeader || finding.evidence?.responseSnippet || finding.evidence?.reproductionCurl;
      if (evidenceText) {
        ensureSpace(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Observed Server Evidence:', margin, y);
        y += 9;

        doc.setFont('courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const splitEv = doc.splitTextToSize(evidenceText.slice(0, 300), contentWidth);
        doc.text(splitEv, margin, y);
        y += splitEv.length * 9 + 8;
      }

      // Divider between findings
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
    });
  }

  // ==================== 6. UNTESTED BOUNDARIES ====================
  if (report.checksNotPerformed && report.checksNotPerformed.length > 0) {
    ensureSpace(80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text('Scope Exclusions & Non-Tested Vectors', margin, y);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    report.checksNotPerformed.forEach((note) => {
      const splitNote = doc.splitTextToSize(`• ${note}`, contentWidth);
      doc.text(splitNote, margin, y);
      y += splitNote.length * 10 + 3;
    });
  }

  // ==================== 7. FOOTERS & PAGE NUMBERING ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.text(
      'VibeSift Launch-Readiness Auditor — https://vibesift.pixir.in',
      margin,
      pageHeight - 16
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 16,
      { align: 'right' }
    );
  }

  // Download PDF
  const cleanHostname = (report.normalizedHostname || 'audit')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();
  const filename = `${cleanHostname}_audit_report_${report.scanId}.pdf`;
  doc.save(filename);
}
