import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { Footer } from '../landing/Footer';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  X as CrossIcon, 
  ShieldCheck, 
  Zap, 
  FileText, 
  Lock, 
  Clock, 
  Building, 
  Mail, 
  User,
  Sparkles
} from 'lucide-react';
import { Button } from '../common/Button';

interface PricingPageProps {
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

export const PricingPage: React.FC<PricingPageProps> = ({
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
    document.title = 'Audit Plans & Pricing (Free vs Deep) — VibeSift by Pixir';
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

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-mono font-bold border border-brand-border">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Developer Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-brand-text tracking-tight">
            Free Quick Audit vs Deep Launch Verification
          </h1>
          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed">
            Run instant public quality inspections at zero cost, or unlock multi-page recursive compliance, Indian DPDP Act 2023 auditing, and tracker analysis for just ₹39.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Quick Search Plan (Free) */}
          <div className="rounded-2xl border border-brand-border p-8 bg-white shadow-subtle flex flex-col justify-between relative">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                    <Zap className="w-5 h-5 text-brand-emerald" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-text">Quick Search</h3>
                    <span className="text-xs text-brand-text-secondary">Instant public health check</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  FREE
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black font-mono text-brand-text">₹0</span>
                  <span className="text-xs text-brand-text-secondary font-medium">/ unlimited scans</span>
                </div>
                <p className="text-xs text-brand-text-secondary mt-1">
                  No credit card or payment required. Ideal for rapid iteration.
                </p>
              </div>

              <div className="border-t border-brand-border pt-6 space-y-3 text-xs text-brand-text">
                <p className="font-bold text-brand-text-secondary uppercase tracking-wider text-[11px]">
                  What's Included:
                </p>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>1 Page Audit</strong> (Landing / root target URL)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>Google Lighthouse Core Web Vitals (FCP, LCP, CLS, TBT)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>HTTP Security Headers evaluation (HSTS, CSP, X-Frame)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>Public cookie security flags (Secure, HttpOnly, SameSite)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>Basic SEO signals (meta title, robots.txt, canonical)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>Fast ~20 second containerized run time</span>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2 text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <CrossIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Multi-page recursive crawling (Deep only)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CrossIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Indian DPDP Act 2023 compliance audit (Deep only)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CrossIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Third-party telemetry & tracker detection (Deep only)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="outline"
                size="lg"
                onClick={onNavigateToApp}
                className="w-full justify-center text-xs"
              >
                Start Free Quick Audit
              </Button>
            </div>
          </div>

          {/* Deep Search Plan (₹39) */}
          <div className="rounded-2xl border-2 border-brand-emerald p-8 bg-brand-card-green/40 shadow-elevated flex flex-col justify-between relative ring-1 ring-brand-emerald/30">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-brand-emerald text-white shadow-subtle">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-text">Deep Search</h3>
                    <span className="text-xs text-brand-emerald-deep font-semibold">Production launch verification</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-brand-mint text-brand-emerald-deep border border-brand-emerald/30">
                  POPULAR
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black font-mono text-brand-emerald-deep">₹39</span>
                  <span className="text-xs text-brand-text-secondary font-medium">/ single deep audit</span>
                </div>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Pay-as-you-go. Instant digital report generation and download.
                </p>
              </div>

              <div className="border-t border-brand-border pt-6 space-y-3 text-xs text-brand-text">
                <p className="font-bold text-brand-text uppercase tracking-wider text-[11px]">
                  Everything in Free, plus:
                </p>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>Multi-Page Crawl</strong>: Inspects up to 10 subpages across internal links</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>Indian DPDP Act 2023 Compliance</strong>: Evaluates privacy notices, consent mechanisms & data collection items</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>Third-Party Tracker Audit</strong>: Pinpoints telemetry beacons, analytics pixels, and unexpected external network requests</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>Actionable Remediation Code Diffs</strong>: Instant copy-paste fixes formatted for Next.js, React, and Express</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span><strong>Downloadable Audit Artifacts</strong>: Official PDF executive summary and full JSON audit output</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-brand-emerald shrink-0" />
                  <span>Permanent secure storage on Amazon S3 with persistent share links</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="primary"
                size="lg"
                onClick={onNavigateToApp}
                className="w-full justify-center text-xs bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold py-3 shadow-subtle flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Launch Deep Audit (₹39)</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Comparison Feature Table */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-xl sm:text-2xl font-bold text-center text-brand-text mb-8">
            Detailed Capability Matrix
          </h2>
          <div className="border border-brand-border rounded-2xl overflow-x-auto bg-white shadow-subtle">
            <table className="w-full min-w-[550px] text-xs text-left">
              <thead className="bg-brand-mint/40 border-b border-brand-border font-mono uppercase tracking-wider text-[11px] text-brand-text">
                <tr>
                  <th className="p-4">Feature / Inspection Engine</th>
                  <th className="p-4 text-center">Quick Search (Free)</th>
                  <th className="p-4 text-center bg-brand-mint text-brand-emerald-deep font-bold">Deep Search (₹39)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Audit Scope Depth</td>
                  <td className="p-4 text-center text-slate-600">1 Page (Root URL)</td>
                  <td className="p-4 text-center font-bold text-brand-emerald-deep bg-brand-mint/20">Up to 10 Pages (Recursive)</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Lighthouse CWV (Performance & SEO)</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-brand-mint/20">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Security Headers & TLS Handshake</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">Included</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-brand-mint/20">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Indian DPDP Act 2023 Compliance</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-brand-mint/20">Full Evaluation</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Third-Party Tracker & Pixel Discovery</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-brand-mint/20">Full Evaluation</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Remediation Code Diffs (Before / After)</td>
                  <td className="p-4 text-center text-slate-600">Basic Guidance</td>
                  <td className="p-4 text-center font-bold text-brand-emerald-deep bg-brand-mint/20">Actionable Copy-Paste Diffs</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Downloadable PDF & JSON Artifacts</td>
                  <td className="p-4 text-center text-slate-400">—</td>
                  <td className="p-4 text-center font-bold text-emerald-600 bg-brand-mint/20">Instant Download</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-brand-text">Execution Turnaround</td>
                  <td className="p-4 text-center text-slate-600">~20 Seconds</td>
                  <td className="p-4 text-center font-bold text-brand-text bg-brand-mint/20">~45–60 Seconds</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Operational & Entity Information */}
        <div className="max-w-4xl mx-auto bg-slate-50 border border-brand-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-brand-border">
            <Building className="w-5 h-5 text-brand-emerald" />
            <h3 className="text-base font-bold text-brand-text">
              Operational Information & Merchant Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-brand-text">
            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Customer Support Email
              </span>
              <a href="mailto:support@pixir.in" className="text-brand-emerald-deep font-bold hover:underline flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-emerald" />
                <span>support@pixir.in</span>
              </a>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Operating Hours & Service SLA
              </span>
              <p className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Monday – Friday, 9:30 AM – 6:30 PM IST</span>
              </p>
              <span className="text-slate-500 block text-[11px]">Turnaround: 24 to 48 business hours</span>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Registered Physical Address
              </span>
              <p className="font-medium text-slate-700">
                Pixir Operations<br />
                Chennai, Tamil Nadu, India — 603103
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] block">
                Operator & Founder
              </span>
              <p className="font-bold text-brand-text flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Sudhanshu Kumar (<a href="mailto:sudhanshu@pixir.in" className="text-brand-emerald-deep hover:underline">sudhanshu@pixir.in</a>)</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer {...commonFooterProps} />
    </div>
  );
};
