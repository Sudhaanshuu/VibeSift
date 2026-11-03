import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { Footer } from '../landing/Footer';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  Mail, 
  Building, 
  AlertCircle, 
  CheckCircle2,
  User
} from 'lucide-react';
import { Button } from '../common/Button';

interface RefundPolicyPageProps {
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

export const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({
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
    document.title = 'Cancellation & Refund Policy — VibeSift by Pixir';
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
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fair Customer Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">
            Last Updated: November 3, 2026 · Effective Immediately
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-brand-text leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              1. Nature of the Digital Service
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              VibeSift (operated by <strong>Pixir</strong>) is an automated web application launch-readiness auditor. 
              Our baseline public audits (Quick Search) are provided free of charge. Our comprehensive security, 
              DPDP Act 2023 compliance, and multi-page audits (Deep Search) are provided as pay-as-you-go digital services 
              priced at <strong>₹39 (Thirty-Nine Indian Rupees)</strong> per individual target audit.
            </p>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              Because audit workers (AWS Lambda, SQS FIFO runners, and automated crawlers) are triggered immediately upon payment confirmation, delivery of the digital report begins instantaneously.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              2. Cancellation Policy
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              Once an order is placed and payment is authorized via Razorpay, the automated scan pipeline provisions compute resources and begins crawling the target URL in real time. Therefore, once the scanning job has entered the <code>RUNNING</code> status, an in-progress scan cannot be cancelled or retracted.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              3. Refund Eligibility & Conditions
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              We stand firmly behind the quality of our inspection engines. You are fully entitled to a 100% refund in the following circumstances:
            </p>
            <div className="bg-brand-card-green/40 border border-brand-border rounded-xl p-5 space-y-2 text-xs text-brand-text">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Technical Pipeline Failure</strong>: If the audit terminates with a system error, container crash, or failure to produce a report.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Execution Timeout</strong>: If the scanning job exceeds our 90-second SLA and fails to generate report artifacts.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Duplicate Billing</strong>: If a network glitch or session interruption results in multiple charges for the same scan target.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <span><strong>Target Unreachable (Egress Guard)</strong>: If our SSRF guard blocks a private/disallowed IP before crawler initialization, any charged fee will be credited.</span>
              </div>
            </div>
            <p className="text-xs text-brand-text-secondary italic">
              Note: If an audit successfully completes and identifies defects or vulnerabilities on your target website, this does not constitute grounds for a refund, as the service has operated as designed.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              4. How to Request a Refund
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              To request a refund, please send an email to our support team at <a href="mailto:support@pixir.in" className="text-brand-emerald-deep font-bold hover:underline">support@pixir.in</a> with:
            </p>
            <ul className="list-disc pl-5 text-xs text-brand-text-secondary space-y-1">
              <li>Your registered email address or account ID.</li>
              <li>Razorpay Payment ID (e.g. <code>pay_...</code>).</li>
              <li>Target website URL audited.</li>
              <li>Brief description of the technical issue encountered.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-emerald" />
              5. Refund Turnaround & Payout SLA
            </h2>
            <p className="text-xs sm:text-sm text-brand-text-secondary">
              Our operations team reviews all refund requests within <strong>24 to 48 business hours</strong>. 
              Once approved, the refund is processed immediately via Razorpay to your original mode of payment (UPI, Netbanking, Credit/Debit card). 
              Funds typically reflect in your bank account within <strong>5 to 7 banking days</strong> depending on your card issuer or bank.
            </p>
          </section>

          {/* Operational Details Box */}
          <div className="bg-slate-50 border border-brand-border rounded-2xl p-6 sm:p-8 space-y-5 mt-8">
            <div className="flex items-center gap-2 pb-3 border-b border-brand-border">
              <Building className="w-5 h-5 text-brand-emerald" />
              <h3 className="text-sm font-bold text-brand-text">
                Operational Information & Merchant Contact
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
