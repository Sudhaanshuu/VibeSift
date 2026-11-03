import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { Footer } from '../landing/Footer';
import { 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  Clock, 
  Building, 
  User, 
  PhoneCall, 
  ShieldCheck, 
  MessageSquare,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Button } from '../common/Button';

interface ContactPageProps {
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

export const ContactPage: React.FC<ContactPageProps> = ({
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
    document.title = 'Contact Support & Operational Information — VibeSift by Pixir';
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
        <div className="space-y-4 mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-mono font-bold border border-brand-border">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Developer Support & Entity Info</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            Contact Support & Operational Details
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary">
            Need technical assistance with a scan report, have billing inquiries, or want to report an issue? Our engineering and support team is here to assist.
          </p>
        </div>

        {/* Operational Info Card */}
        <div className="bg-slate-50 border border-brand-border rounded-2xl p-6 sm:p-10 space-y-8 shadow-subtle mb-12">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <div className="p-2.5 rounded-xl bg-brand-emerald text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-text">
                Pixir Operational Information
              </h2>
              <span className="text-xs text-slate-500">Official Merchant & Legal Entity Profile</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-brand-text">
            {/* Item 1: Support Email */}
            <div className="space-y-2 bg-white p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 text-brand-emerald-deep font-bold">
                <Mail className="w-4 h-4 text-brand-emerald" />
                <span>Customer Support Email</span>
              </div>
              <p className="text-slate-600">
                For audit inquiries, refund processing, or developer questions:
              </p>
              <a
                href="mailto:support@pixir.in"
                className="text-sm font-bold text-brand-emerald-deep hover:underline block pt-1 font-mono"
              >
                support@pixir.in
              </a>
            </div>

            {/* Item 2: Hours & SLA */}
            <div className="space-y-2 bg-white p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 text-brand-emerald-deep font-bold">
                <Clock className="w-4 h-4 text-brand-emerald" />
                <span>Operating Hours & SLA</span>
              </div>
              <p className="font-semibold text-brand-text">
                Monday – Friday, 9:30 AM – 6:30 PM IST
              </p>
              <span className="inline-block text-[11px] font-mono bg-brand-mint text-brand-emerald-deep px-2 py-0.5 rounded border border-brand-border font-bold">
                Turnaround: 24 to 48 business hours
              </span>
            </div>

            {/* Item 3: Registered Physical Address */}
            <div className="space-y-2 bg-white p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 text-brand-emerald-deep font-bold">
                <Building className="w-4 h-4 text-brand-emerald" />
                <span>Registered Physical Address</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                Pixir Operations<br />
                Chennai, Tamil Nadu, India — 603103
              </p>
              <span className="text-[10px] text-slate-400 block pt-1">
                Official operating headquarters for merchant verification
              </span>
            </div>

            {/* Item 4: Operator & Founder */}
            <div className="space-y-2 bg-white p-5 rounded-xl border border-brand-border">
              <div className="flex items-center gap-2 text-brand-emerald-deep font-bold">
                <User className="w-4 h-4 text-brand-emerald" />
                <span>Operator & Founder</span>
              </div>
              <p className="font-bold text-brand-text text-sm">
                Sudhanshu Kumar
              </p>
              <a
                href="mailto:sudhanshu@pixir.in"
                className="text-xs font-mono font-bold text-brand-emerald-deep hover:underline block"
              >
                sudhanshu@pixir.in
              </a>
            </div>
          </div>
        </div>

        {/* Support Topics Quick Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-brand-text">
          <div className="p-4 rounded-xl border border-brand-border bg-white space-y-1.5">
            <HelpCircle className="w-4 h-4 text-brand-emerald mb-2" />
            <h4 className="font-bold text-brand-text">Billing & Refunds</h4>
            <p className="text-brand-text-secondary text-[11px]">
              Charged multiple times or scan failed? Email us with your <code>pay_...</code> ID for instant refund evaluation.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-white space-y-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-emerald mb-2" />
            <h4 className="font-bold text-brand-text">Security Disclosures</h4>
            <p className="text-brand-text-secondary text-[11px]">
              Review our RFC 9116 security policy or submit responsible disclosure reports to <a href="mailto:security@pixir.in" className="underline font-bold">security@pixir.in</a>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-white space-y-1.5">
            <FileCheck className="w-4 h-4 text-brand-emerald mb-2" />
            <h4 className="font-bold text-brand-text">Custom Audits</h4>
            <p className="text-brand-text-secondary text-[11px]">
              Need automated CI/CD integration, custom rule packs, or enterprise scans? Get in touch with our engineering lead.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer {...commonFooterProps} />
    </div>
  );
};
