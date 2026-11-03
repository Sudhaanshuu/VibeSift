import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { Footer } from '../landing/Footer';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Building, 
  Scale, 
  CheckCircle2,
  User,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../common/Button';

interface TermsPageProps {
  onBackToHome: () => void;
  onNavigateToApp: () => void;
  onNavigateToMethodology?: () => void;
  onNavigateToSampleReports?: () => void;
  onNavigateToRemediation?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSecurity?: () => void;
  onNavigateToPricing?: () => void;
  onNavigateToRefund?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToContact?: () => void;
  onOpenPrivacyNotice?: () => void;
  onOpenSecurityPolicy?: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  onBackToHome,
  onNavigateToApp,
  onNavigateToMethodology,
  onNavigateToSampleReports,
  onNavigateToRemediation,
  onNavigateToPrivacy,
  onNavigateToSecurity,
  onNavigateToPricing,
  onNavigateToRefund,
  onNavigateToTerms,
  onNavigateToContact,
  onOpenPrivacyNotice,
  onOpenSecurityPolicy,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Terms of Service & Audit Authorization — VibeSift by Pixir';
  }, []);

  const commonFooterProps = {
    onNavigateToApp,
    onNavigateToMethodology,
    onNavigateToSampleReports,
    onNavigateToRemediation,
    onNavigateToPrivacy,
    onNavigateToSecurity,
    onNavigateToPricing,
    onNavigateToRefund,
    onNavigateToTerms,
    onNavigateToContact,
    onOpenPrivacyNotice,
    onOpenSecurityPolicy,
  };

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased flex flex-col justify-between selection:bg-brand-mint selection:text-brand-emerald-deep">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-text-secondary hover:text-brand-text px-3 py-1.5 rounded-full border border-brand-border hover:bg-brand-muted transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <div className="h-5 w-px bg-brand-border hidden sm:block" />
              <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }}>
                <BrandLogo size="sm" showTagline={false} />
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={onNavigateToApp}
                className="text-xs shadow-subtle"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Open Console
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-mono font-bold border border-brand-border">
            <Scale className="w-3.5 h-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            Terms of Service & Audit Authorization
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">
            Last Updated: November 3, 2026 · Effective for all users and scanning requests
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-brand-text leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              1. Acceptance of Terms & Services
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              By accessing, browsing, or utilizing VibeSift (accessible at <code>vibesift.pixir.in</code>), operated by <strong>Pixir</strong>, you agree to be legally bound by these Terms of Service. If you do not agree to these terms, do not access or submit websites to this platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              2. User Authorization & Consent to Scan
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Mandatory Authorization Requirement:</strong>
                You warrant and represent that you are either the registered owner, administrator, or explicitly authorized developer of any website URL you submit for auditing. Submitting third-party websites without proper consent is strictly prohibited.
              </div>
            </div>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              By checking the consent box and initiating a scan, you explicitly grant VibeSift permission to send HTTP/HTTPS requests to the target domain, analyze its public HTML/CSS/JavaScript structure, inspect security headers, review publicly set cookies, evaluate tracking pixels, and measure web performance signals.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              3. Scope of Non-Intrusive Testing
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              VibeSift operates strictly as a safe, containerized, non-destructive auditor:
            </p>
            <ul className="list-disc pl-5 text-xs text-brand-text-secondary space-y-1">
              <li>All HTTP requests are throttled to a conservative maximum rate (typically 2 requests per second).</li>
              <li>Our automated engines do not exploit vulnerabilities, inject harmful payloads, or cause denial of service.</li>
              <li>Private IP ranges (e.g. <code>10.0.0.0/8</code>, <code>127.0.0.1</code>, AWS metadata endpoints) are filtered and blocked by our SSRF protection layer.</li>
              <li>Our bot requests declare explicit user-agent identifiers following RFC 9116 responsible disclosure standards.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              4. Fees, Pricing & Payment Terms
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              <strong>Quick Search</strong> audits are provided free of charge without requiring a payment method.
            </p>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              <strong>Deep Search</strong> audits are billed on a pay-per-scan basis at <strong>₹39 (INR)</strong> per scan target. All transactions are securely processed via Razorpay. Any promotional or coupon discount must be entered prior to transaction authorization.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              5. Intellectual Property & Report Ownership
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              You retain all ownership rights to your website content, domain, and generated audit report outputs. Pixir retains all rights, title, and intellectual property in the VibeSift auditing platform, scanning heuristics, scoring algorithms, and remediation specification code.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              6. Limitation of Liability
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              VibeSift provides automated diagnostic assessments on an "AS IS" and "AS AVAILABLE" basis. While our engines test for major OWASP Top 10 vectors, Core Web Vitals, and Indian DPDP Act 2023 compliance, automated audits do not replace manual penetration testing or certified legal privacy counsel. In no event shall Pixir or its operators be liable for indirect, incidental, or consequential damages.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              7. Governing Law & Jurisdiction
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              These Terms of Service are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Chennai, Tamil Nadu, India</strong>.
            </p>
          </section>

          {/* Operational Details Box */}
          <div className="bg-slate-50 border border-brand-border rounded-2xl p-6 sm:p-8 space-y-5 not-prose mt-8">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border">
              <Building className="w-5 h-5 text-brand-emerald" />
              <h3 className="text-sm font-bold text-brand-text">
                Operational & Entity Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-brand-text">
              <div>
                <span className="text-slate-500 font-bold block mb-1">Customer Support Email</span>
                <a href="mailto:support@pixir.in" className="text-brand-emerald-deep font-bold hover:underline flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-emerald" />
                  <span>support@pixir.in</span>
                </a>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Operating Hours & SLA</span>
                <p className="font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-emerald" />
                  <span>Monday – Friday, 9:30 AM – 6:30 PM IST</span>
                </p>
                <span className="text-slate-500 text-[11px]">Turnaround: 24 to 48 business hours</span>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Registered Physical Address</span>
                <p className="font-medium text-slate-700">
                  Pixir Operations<br />
                  Chennai, Tamil Nadu, India — 603103
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Operator & Founder</span>
                <p className="font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-emerald" />
                  <span>Sudhanshu Kumar (<a href="mailto:sudhanshu@pixir.in" className="text-brand-emerald-deep hover:underline">sudhanshu@pixir.in</a>)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer {...commonFooterProps} />
    </div>
  );
};
