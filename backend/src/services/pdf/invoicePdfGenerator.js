import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates an official, professional Tax Invoice & Payment Receipt PDF as a Buffer.
 *
 * @param {Object} options
 * @param {string} options.invoiceNumber - e.g. 'INV-2026-948123'
 * @param {string} options.paymentId - Razorpay payment ID (e.g. 'pay_...')
 * @param {string} [options.orderId] - Razorpay order ID
 * @param {string} options.customerName - Name of the user
 * @param {string} options.customerEmail - Email of the user
 * @param {string} options.targetUrl - Target website audited
 * @param {string} options.scanId - Scan identifier
 * @param {number} [options.amountPaid=39] - Amount in INR paid
 * @param {string} [options.couponCode] - Applied coupon code if any
 * @param {string} [options.createdAt] - ISO Date string
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePdf(options) {
  const {
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
    paymentId = 'pay_direct_checkout',
    orderId = null,
    customerName = 'Valued Developer',
    customerEmail = 'user@example.com',
    targetUrl = 'https://example.com',
    scanId = 'scn_unknown',
    amountPaid = 39,
    couponCode = null,
    createdAt = new Date().toISOString(),
  } = options;

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

  const COLOR_PRIMARY = [6, 78, 59]; // Emerald 900
  const COLOR_BRAND = [5, 150, 105]; // Emerald 600
  const COLOR_TEXT = [15, 23, 42]; // Slate 900
  const COLOR_TEXT_MUTED = [100, 116, 139]; // Slate 500
  const COLOR_BG_LIGHT = [248, 250, 252]; // Slate 50
  const COLOR_BORDER = [226, 232, 240]; // Slate 200

  // 1. HEADER BANNER
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, y, contentWidth, 75, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VIBESIFT', margin + 20, y + 34);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208); // Emerald 200
  doc.text('by Pixir  •  Website Security & DPDP Compliance', margin + 20, y + 50);
  doc.text('https://vibesift.pixir.in  •  accounts@pixir.in', margin + 20, y + 64);

  // Invoice Title Right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE / RECEIPT', pageWidth - margin - 20, y + 36, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(209, 250, 229);
  doc.text(`Invoice No: ${invoiceNumber}`, pageWidth - margin - 20, y + 52, { align: 'right' });
  doc.text(`Date: ${new Date(createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin - 20, y + 64, { align: 'right' });

  y += 90;

  // 2. PAYMENT STATUS BAR
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(margin, y, contentWidth, 38, 4, 4, 'F');
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(margin, y, contentWidth, 38, 4, 4, 'S');

  // Status Badge (PAID)
  doc.setFillColor(...COLOR_BRAND);
  doc.roundedRect(margin + 12, y + 9, 64, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAID', margin + 44, y + 22, { align: 'center' });

  // Gateway reference
  doc.setTextColor(...COLOR_TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Payment ID: ${paymentId}`, margin + 86, y + 23);

  // Currency & Total right aligned
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_BRAND);
  doc.text(`Amount Paid: Rs. ${Number(amountPaid).toFixed(2)} INR`, pageWidth - margin - 14, y + 23, { align: 'right' });

  y += 50;

  // 3. BILLED TO & BILLED BY (TWO COLUMNS)
  const colWidth = (contentWidth - 20) / 2;

  // Billed To Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(margin, y, colWidth, 90, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('BILLED TO (CUSTOMER)', margin + 12, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(customerName || 'Valued Developer', margin + 12, y + 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text(`Email: ${customerEmail}`, margin + 12, y + 50);
  doc.text(`Service: Deep Search Audit Voucher`, margin + 12, y + 64);
  doc.text(`Place of Supply: India`, margin + 12, y + 78);

  // Billed By Box
  const col2X = margin + colWidth + 20;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(col2X, y, colWidth, 90, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('ISSUED BY (MERCHANT)', col2X + 12, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_TEXT);
  doc.text('Pixir Digital Innovations / Team VibeSift', col2X + 12, y + 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('Billing & Support: accounts@pixir.in', col2X + 12, y + 50);
  doc.text('Website: https://vibesift.pixir.in', col2X + 12, y + 64);
  doc.text('Payment Gateway: Razorpay (RBI Regulated)', col2X + 12, y + 78);

  y += 105;

  // 4. AUDIT SERVICE CONTEXT BOX
  doc.setFillColor(240, 253, 250); // Emerald 50
  doc.setDrawColor(204, 251, 241); // Emerald 100
  doc.roundedRect(margin, y, contentWidth, 42, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('AUDIT TARGET & SCOPE', margin + 12, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110); // Teal 700
  doc.text(`Target URL: ${targetUrl}   |   Scan ID: ${scanId}`, margin + 12, y + 30);

  y += 54;

  // 5. LINE ITEMS TABLE (autoTable)
  const baseRate = 39.0;
  const finalPaid = Number(amountPaid);
  const discount = Math.max(0, baseRate - finalPaid);

  const tableBody = [
    [
      'VibeSift Authorized Deep Security & DPDP Compliance Audit\n• Exhaustive vulnerability heuristics, session security & SSRF guards\n• Google Lighthouse Core Web Vitals & accessibility benchmarks\n• Digital Personal Data Protection Act 2023 preliminary compliance suite',
      '1',
      `Rs. ${baseRate.toFixed(2)}`,
      `Rs. ${baseRate.toFixed(2)}`,
    ],
  ];

  if (couponCode && discount > 0) {
    tableBody.push([
      `Promotional Discount (Coupon Code: ${couponCode.toUpperCase()})`,
      '1',
      `-Rs. ${discount.toFixed(2)}`,
      `-Rs. ${discount.toFixed(2)}`,
    ]);
  }

  const applyAutoTable = autoTable.default || autoTable;
  applyAutoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    head: [['Item Description', 'Qty', 'Unit Rate', 'Amount']],
    body: tableBody,
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 8,
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8.5,
      cellPadding: 8,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.58 },
      1: { cellWidth: contentWidth * 0.1, halign: 'center' },
      2: { cellWidth: contentWidth * 0.16, halign: 'right' },
      3: { cellWidth: contentWidth * 0.16, halign: 'right' },
    },
  });

  y = doc.lastAutoTable.finalY + 15;

  // 6. TOTALS BREAKDOWN
  const summaryBoxWidth = 220;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(summaryBoxX, y, summaryBoxWidth, 75, 4, 4, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_TEXT_MUTED);

  doc.text('Subtotal:', summaryBoxX + 12, y + 18);
  doc.text(`Rs. ${baseRate.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 12, y + 18, { align: 'right' });

  if (discount > 0) {
    doc.text('Discount Applied:', summaryBoxX + 12, y + 32);
    doc.text(`-Rs. ${discount.toFixed(2)}`, summaryBoxX + summaryBoxWidth - 12, y + 32, { align: 'right' });
  } else {
    doc.text('Taxes (GST Included):', summaryBoxX + 12, y + 32);
    doc.text('Rs. 0.00', summaryBoxX + summaryBoxWidth - 12, y + 32, { align: 'right' });
  }

  doc.setDrawColor(...COLOR_BORDER);
  doc.line(summaryBoxX + 10, y + 42, summaryBoxX + summaryBoxWidth - 10, y + 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_BRAND);
  doc.text('Total Paid:', summaryBoxX + 12, y + 60);
  doc.text(`Rs. ${finalPaid.toFixed(2)} INR`, summaryBoxX + summaryBoxWidth - 12, y + 60, { align: 'right' });

  // Transaction details on left side of summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('Payment Gateway Details:', margin, y + 16);
  doc.text(`• Gateway: Razorpay Software Private Ltd.`, margin, y + 28);
  doc.text(`• Razorpay Payment ID: ${paymentId}`, margin, y + 40);
  if (orderId) {
    doc.text(`• Razorpay Order ID: ${orderId}`, margin, y + 52);
  } else {
    doc.text(`• Order Reference: Instant Checkout`, margin, y + 52);
  }
  doc.text(`• Status: Transaction Authorized & Captured`, margin, y + 64);

  y += 95;

  // 7. FOOTER & POLICIES
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('TERMS & NOTES:', margin, y);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    '1. This document serves as an electronic payment receipt and tax invoice for digital software analysis services provided by VibeSift by Pixir.',
    margin,
    y
  );
  y += 10;
  doc.text(
    '2. Deep audits execute on-demand compute infrastructure immediately upon payment authorization; all sales are governed by VibeSift Refund Policy.',
    margin,
    y
  );
  y += 10;
  doc.text(
    '3. For billing inquiries, duplicate receipt requests, or assistance, please contact accounts@pixir.in.',
    margin,
    y
  );
  y += 14;
  doc.text(
    '4. This is a computer-generated invoice and requires no physical signature.',
    margin,
    y
  );

  // Return Node Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
