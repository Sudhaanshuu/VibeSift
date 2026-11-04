import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../config/env.js';
import { dbService } from './dynamoStorage.js';
import { s3Service, sanitizeTargetHost } from './s3Storage.js';
import { generateInvoicePdf } from './pdf/invoicePdfGenerator.js';
import { generateAuditReportPdf } from './pdf/reportPdfGenerator.js';
import { getCognitoUserById } from './cognitoAuth.js';

/**
 * Builds the professional, company-style plain text email body.
 */
function buildPlainTextEmail({
  name,
  targetUrl,
  scanId,
  score,
  totalFindings,
  criticalCount,
  highCount,
  invoiceNumber,
  amountPaid,
  cleanHostname,
}) {
  return `Hi ${name || 'there'},

We are team VibeSift by Pixir.

Here is your requested Deep Search Audit report for ${targetUrl}, along with the official invoice for your payment.

AUDIT SUMMARY
--------------------------------------------------
• Target URL: ${targetUrl}
• Scan ID: ${scanId}
• Launch Readiness Score: ${score} / 100
• Audit Profile: Authorized Deep Search
• Findings: ${totalFindings} total (${criticalCount} Critical, ${highCount} High)
--------------------------------------------------

ATTACHED DOCUMENTS
1. ${cleanHostname}_audit_report_${scanId}.pdf — Full technical deep search audit report with vulnerability analysis and code remediation snippets.
2. Invoice_${invoiceNumber}.pdf — Official tax invoice & payment receipt for Rs. ${amountPaid} INR.

INTERACTIVE DASHBOARD
You can explore the interactive audit dashboard and export real-time findings anytime at:
https://vibesift.pixir.in/scans/${scanId}

SUPPORT & QUESTIONS
If you have any questions about this audit, need technical clarification on remediation, or have billing inquiries, reply directly to this email at accounts@pixir.in.

Best regards,
The VibeSift Team by Pixir
https://vibesift.pixir.in
`;
}

/**
 * Builds the corporate, polished HTML email body matching Pixir & VibeSift styling.
 */
function buildHtmlEmail({
  name,
  targetUrl,
  scanId,
  score,
  totalFindings,
  criticalCount,
  highCount,
  invoiceNumber,
  amountPaid,
  cleanHostname,
}) {
  const scoreColor = score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : '#ef4444';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your VibeSift Deep Search Audit Report & Invoice</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); padding: 32px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin: 0;">VIBESIFT</div>
                    <div style="font-size: 13px; color: #a7f3d0; margin-top: 4px; font-weight: 500;">by Pixir &bull; Deep Security & DPDP Compliance</div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">Paid Deep Audit</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 36px 36px 24px 36px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #0f172a;">
                Hi <strong>${name || 'there'}</strong>,
              </p>
              <p style="font-size: 15px; margin: 0 0 24px 0; color: #334155;">
                We are <strong>team VibeSift by Pixir</strong>. Thank you for your purchase. Here is your requested <strong>Deep Search Audit report</strong> for <a href="${targetUrl}" style="color: #059669; text-decoration: none; font-weight: 600;" target="_blank">${targetUrl}</a>, along with the official tax invoice for your payment.
              </p>

              <!-- AUDIT SUMMARY CARD -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Audit Results Overview</div>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="top" style="padding-right: 16px;">
                          <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">Target Website</div>
                          <div style="font-size: 14px; font-weight: 600; color: #0f172a; word-break: break-all;">${targetUrl}</div>
                          
                          <div style="font-size: 13px; color: #64748b; margin-top: 12px; margin-bottom: 4px;">Scan Reference ID</div>
                          <div style="font-family: monospace; font-size: 13px; color: #334155;">${scanId}</div>
                        </td>
                        <td align="right" valign="middle" style="width: 130px; border-left: 1px solid #e2e8f0; padding-left: 16px;">
                          <div style="font-size: 32px; font-weight: 800; color: ${scoreColor}; line-height: 1;">${score}</div>
                          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px;">Readiness Score</div>
                          <div style="font-size: 12px; color: #475569; margin-top: 8px;">
                            ${totalFindings} Issues (${criticalCount} Critical, ${highCount} High)
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- ATTACHMENTS CALLOUT -->
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 12px;">Attached Files (PDF)</div>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="padding: 10px 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; margin-bottom: 8px;">
                    <div style="font-weight: 600; font-size: 14px; color: #166534;">&bull; ${cleanHostname}_audit_report_${scanId}.pdf</div>
                    <div style="font-size: 12px; color: #15803d; margin-top: 2px;">Comprehensive Deep Audit report with vulnerability heuristics, CWV, and DPDP assessment.</div>
                  </td>
                </tr>
                <tr><td style="height: 8px;"></td></tr>
                <tr>
                  <td style="padding: 10px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b;">&bull; Invoice_${invoiceNumber}.pdf</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Official payment receipt & tax invoice for Rs. ${amountPaid} INR (Captured via Razorpay).</div>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="background-color: #059669; border-radius: 8px;">
                    <a href="https://vibesift.pixir.in/scans/${scanId}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px;">
                      View Interactive Audit Online &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0; line-height: 1.5;">
                If you have any questions regarding these findings, require custom penetration testing, or need invoicing assistance, reply directly to this email at <a href="mailto:accounts@pixir.in" style="color: #059669; text-decoration: none; font-weight: 600;">accounts@pixir.in</a>.
              </p>

              <p style="font-size: 14px; color: #334155; margin: 24px 0 0 0;">
                Best regards,<br>
                <strong>The VibeSift Team by Pixir</strong><br>
                <a href="https://vibesift.pixir.in" style="color: #059669; text-decoration: none; font-size: 12px;">https://vibesift.pixir.in</a>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} Pixir Digital Innovations. All rights reserved.<br>
                This email was sent to ${name || 'developer'} because a Deep Search website audit was completed on VibeSift.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends the Deep Search audit report and invoice PDF email to the customer.
 * Uses SMTP2GO HTTP REST API with base64 PDF attachments.
 *
 * @param {Object} params
 * @param {Object} params.scan - Stored scan record
 * @param {Object} params.report - Final AuditReport
 * @param {string} [params.userEmail] - Destination email
 * @param {string} [params.userName] - Destination user name
 * @param {string} [params.paymentId] - Razorpay transaction ID
 * @param {string} [params.orderId] - Razorpay order ID
 * @param {number} [params.amountPaid] - Amount in INR
 * @param {string} [params.couponCode] - Coupon code if applied
 * @returns {Promise<{ success: boolean, emailId?: string, error?: string }>}
 */
export async function sendDeepSearchAuditEmail(params) {
  const {
    scan,
    report,
    userEmail = scan.ownerEmail,
    userName = scan.ownerName,
    paymentId = scan.paymentId || 'pay_direct_checkout',
    orderId = scan.orderId || null,
    amountPaid = scan.amountPaid || (scan.couponCode ? 1 : 39),
    couponCode = scan.couponCode || null,
  } = params;

  let recipientEmail = userEmail;
  let recipientName = userName;

  // Fallback: Resolve real email from Cognito if scan had a sub/UUID instead of email
  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    const userIdToLookup = scan.ownerUserId || (typeof userEmail === 'string' && !userEmail.includes('@') ? userEmail : null);
    if (userIdToLookup) {
      try {
        const cognitoProfile = await getCognitoUserById(userIdToLookup);
        if (cognitoProfile?.email && cognitoProfile.email.includes('@')) {
          recipientEmail = cognitoProfile.email;
          if (!recipientName || recipientName === 'Authenticated User' || recipientName === 'Developer') {
            recipientName = cognitoProfile.name || recipientName;
          }
          console.log(`[EmailService] Resolved recipient email from Cognito for ${userIdToLookup}: ${recipientEmail}`);
        }
      } catch (cognitoErr) {
        console.warn(`[EmailService] Fallback Cognito lookup failed for ${userIdToLookup}:`, cognitoErr.message);
      }
    }
  }

  if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
    console.warn(`[EmailService] Cannot send audit email for scan ${scan.scanId}: No valid user email provided.`);
    return { success: false, error: 'NO_VALID_EMAIL' };
  }

  const cleanHostname = sanitizeTargetHost(scan.normalizedHostname || 'target');
  const invoiceNumber = `INV-${new Date().getFullYear()}-${paymentId ? paymentId.replace(/^pay_/, '').slice(-6).toUpperCase() : Math.floor(100000 + Math.random() * 900000)}`;

  try {
    console.log(`[EmailService] Generating Invoice PDF and Audit Report PDF for ${scan.scanId} -> ${recipientEmail}...`);

    // 1. Generate Invoice PDF Buffer
    const invoicePdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      paymentId,
      orderId,
      customerName: recipientName || 'Valued Developer',
      customerEmail: recipientEmail,
      targetUrl: scan.targetUrl,
      scanId: scan.scanId,
      amountPaid,
      couponCode,
      createdAt: scan.createdAt,
    });

    // 2. Generate Audit Report PDF Buffer
    const reportPdfBuffer = await generateAuditReportPdf(report);

    // 3. Persist PDF artifacts to S3 / local durable storage
    try {
      await s3Service.savePdfArtifact(scan.scanId, 'invoice.pdf', invoicePdfBuffer, scan.normalizedHostname);
      await s3Service.savePdfArtifact(scan.scanId, 'report.pdf', reportPdfBuffer, scan.normalizedHostname);
      console.log(`[EmailService] Saved invoice.pdf and report.pdf artifacts to S3 for scan ${scan.scanId}.`);
    } catch (s3Err) {
      console.warn(`[EmailService] Note: S3 artifact save had an issue:`, s3Err.message);
    }

    // 4. Construct email contents
    const templateData = {
      name: recipientName || 'Developer',
      targetUrl: scan.targetUrl,
      scanId: scan.scanId,
      score: report.summary?.readinessScore ?? 0,
      totalFindings: report.summary?.totalFindings ?? 0,
      criticalCount: report.summary?.critical ?? 0,
      highCount: report.summary?.high ?? 0,
      invoiceNumber,
      amountPaid,
      cleanHostname,
    };

    const textBody = buildPlainTextEmail(templateData);
    const htmlBody = buildHtmlEmail(templateData);

    const sender = config.email?.sender || 'VibeSift by Pixir <accounts@pixir.in>';
    const apiKey = config.email?.smtp2goApiKey || process.env.SMTP2GO_API_KEY;

    // Attachments for SMTP2GO
    const reportFilename = `${cleanHostname}_audit_report_${scan.scanId}.pdf`;
    const invoiceFilename = `Invoice_${invoiceNumber}.pdf`;

    const attachments = [
      {
        filename: reportFilename,
        fileblob: reportPdfBuffer.toString('base64'),
        mimetype: 'application/pdf',
      },
      {
        filename: invoiceFilename,
        fileblob: invoicePdfBuffer.toString('base64'),
        mimetype: 'application/pdf',
      },
    ];

    let emailResult = null;

    // 5. Send via SMTP2GO API if key configured
    if (apiKey) {
      console.log(`[EmailService] Dispatching email to ${recipientEmail} via SMTP2GO REST API...`);

      const payload = {
        api_key: apiKey,
        to: [recipientEmail],
        sender,
        subject: `Your VibeSift Deep Search Audit Report & Invoice – ${cleanHostname}`,
        text_body: textBody,
        html_body: htmlBody,
        attachments,
      };

      const response = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok && responseData.data?.succeeded > 0) {
        emailResult = {
          success: true,
          emailId: responseData.data.email_id || responseData.request_id,
        };
        console.log(`[EmailService] Successfully sent audit report & invoice to ${recipientEmail}. Email ID: ${emailResult.emailId}`);
      } else {
        const errorDesc = responseData.data?.failures?.[0] || responseData.error || 'SMTP2GO delivery failed';
        console.warn(`[EmailService] SMTP2GO delivery returned failure:`, errorDesc);
        emailResult = { success: false, error: String(errorDesc) };
      }
    } else {
      // Local dev mock fallback: save email to .local_storage/emails/
      console.log(`[EmailService] SMTP2GO_API_KEY not configured. Saving email preview locally...`);
      const emailsDir = path.resolve(process.cwd(), '.local_storage', 'emails');
      await fs.mkdir(emailsDir, { recursive: true });

      const emailPreviewPath = path.join(emailsDir, `${scan.scanId}_email.json`);
      await fs.writeFile(
        emailPreviewPath,
        JSON.stringify(
          {
            to: recipientEmail,
            sender,
            subject: `Your VibeSift Deep Search Audit Report & Invoice – ${cleanHostname}`,
            invoiceNumber,
            dispatchedAt: new Date().toISOString(),
            attachments: [reportFilename, invoiceFilename],
          },
          null,
          2
        ),
        'utf-8'
      );

      emailResult = { success: true, emailId: `mock_${Date.now()}` };
    }

    // 6. Record email status in scan DB
    if (emailResult.success) {
      try {
        await dbService.updateScan(scan.scanId, {
          emailSent: 1,
          emailSentAt: new Date().toISOString(),
          ownerEmail: recipientEmail,
          ownerName: recipientName,
          paymentId,
          orderId,
          amountPaid,
          couponCode,
        });
      } catch (dbErr) {
        console.warn(`[EmailService] Could not update scan emailSent flag:`, dbErr.message);
      }
    }

    return emailResult;
  } catch (err) {
    console.error(`[EmailService] Failed to send audit email for ${scan.scanId}:`, err);
    return { success: false, error: err.message };
  }
}
