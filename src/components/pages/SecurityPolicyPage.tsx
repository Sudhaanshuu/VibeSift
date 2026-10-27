import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { useAudit } from '../../context/AuditContext';
import { 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Mail, 
  Award,
  Terminal
} from 'lucide-react';
import { Footer } from '../landing/Footer';

interface SecurityPolicyPageProps {
  onBackToHome: () => void;
  onNavigateToApp: () => void;
  onNavigateToMethodology: () => void;
  onNavigateToSampleReports: () => void;
  onNavigateToRemediation: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToSecurity: () => void;
  onOpenPrivacyNotice: () => void;
  onOpenSecurityPolicy: () => void;
}

export const SecurityPolicyPage: React.FC<SecurityPolicyPageProps> = ({
  onBackToHome,
  onNavigateToApp,
  onNavigateToMethodology,
  onNavigateToSampleReports,
  onNavigateToRemediation,
  onNavigateToPrivacy,
  onNavigateToSecurity,
  onOpenPrivacyNotice,
  onOpenSecurityPolicy,
}) => {
  const { openNewScanModal } = useAudit();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = 'Security & Responsible Disclosure (RFC 9116) — VibeSift by Pixir';
  }, []);

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-mint selection:text-brand-emerald-deep flex flex-col justify-between">
      
      {/* Subpage Header */}
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
              <button type="button" onClick={onBackToHome} className="text-left">
                <BrandLogo size="sm" showTagline={false} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-xs font-mono text-brand-text-secondary">
                Security & Responsible Disclosure
              </span>
              <button
                type="button"
                onClick={() => openNewScanModal()}
                className="inline-flex items-center justify-center font-bold text-xs sm:text-sm px-4 py-2 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white shadow-subtle transition-all gap-1.5"
              >
                <span>Run Live Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Page Hero Badge & Headline */}
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint border border-brand-emerald/20 text-xs font-bold text-brand-emerald-deep">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RFC 9116 Vulnerability Disclosure & Safety Standard</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            Security & Responsible Disclosure Policy
          </h1>

          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed">
            Machine-readable RFC 9116 file available at{' '}
            <a href="/.well-known/security.txt" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-emerald-deep font-bold underline">
              /.well-known/security.txt
            </a>
            {' '}and{' '}
            <a href="/security.txt" target="_blank" rel="noopener noreferrer" className="font-mono text-brand-emerald-deep font-bold underline">
              /security.txt
            </a>
          </p>

          {/* Quick RFC 9116 Code Box */}
          <div className="p-4 rounded-xl bg-gray-900 text-gray-200 border border-gray-800 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand-emerald" />
                <span>RFC 9116 Canonical Directives</span>
              </span>
              <span className="text-brand-emerald">Valid through 2027</span>
            </div>
            <p className="text-brand-mint">Contact: mailto:security@pixir.in</p>
            <p className="text-brand-mint">Contact: https://vibesift.pixir.in/security</p>
            <p className="text-gray-300">Expires: 2027-12-31T23:59:59.000Z</p>
            <p className="text-gray-300">Preferred-Languages: en</p>
            <p className="text-gray-300">Canonical: https://vibesift.pixir.in/.well-known/security.txt</p>
            <p className="text-gray-300">Policy: https://vibesift.pixir.in/security</p>
          </div>
        </div>

        {/* Structured Sections */}
        <div className="space-y-10 text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
          
          {/* Section 1: Non-Destructive Scanning Baseline */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">01.</span>
              <span>Non-Destructive Scanning Principles</span>
            </h2>
            <p>
              VibeSift is engineered specifically to evaluate public website launch readiness without disrupting target infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-brand-text">100% Passive Baseline:</strong> Free baseline scans issue safe HTTP <code className="font-mono bg-brand-muted px-1 rounded">GET</code> and <code className="font-mono bg-brand-muted px-1 rounded">HEAD</code> requests, inspecting only publicly accessible web responses.
              </li>
              <li>
                <strong className="text-brand-text">Zero Database Tampering:</strong> We do not submit forms, execute destructive exploits, or perform brute-force authentication guessing.
              </li>
              <li>
                <strong className="text-brand-text">Polite Request Pacing:</strong> Audit workers enforce bounded request frequency, respectful user-agent strings (<code className="font-mono bg-brand-muted px-1 rounded">VibeSift-Auditor/1.0 (+https://vibesift.pixir.in/security)</code>), and strict execution timeouts (maximum 90 seconds).
              </li>
            </ul>
          </section>

          {/* Section 2: SSRF Guard Architecture */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">02.</span>
              <span>Server-Side Request Forgery (SSRF) Defense</span>
            </h2>
            <p>
              To prevent malicious actors from using VibeSift as an SSRF proxy to probe internal networks or cloud metadata endpoints, our worker architecture applies multi-layered egress filtering:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-brand-border bg-white space-y-1">
                <strong className="text-brand-text text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                  <span>Loopback & Private Subnets</span>
                </strong>
                <p className="text-[11px] text-brand-text-secondary">
                  Resolves target hostnames before dispatch. Rejects <code className="font-mono text-brand-text">127.0.0.0/8</code>, <code className="font-mono text-brand-text">10.0.0.0/8</code>, <code className="font-mono text-brand-text">172.16.0.0/12</code>, and <code className="font-mono text-brand-text">192.168.0.0/16</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-brand-border bg-white space-y-1">
                <strong className="text-brand-text text-xs flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-brand-emerald" />
                  <span>Cloud Metadata Protection</span>
                </strong>
                <p className="text-[11px] text-brand-text-secondary">
                  Explicitly blocks requests directed to AWS / GCP / Azure instance metadata IP (<code className="font-mono text-brand-text">169.254.169.254</code>) and link-local ranges (<code className="font-mono text-brand-text">fe80::/10</code>).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Safe Harbor for Security Researchers */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">03.</span>
              <span>Safe Harbor for Ethical Security Researchers</span>
            </h2>
            <p>
              We consider research conducted under this policy to be authorized. We will not pursue legal action or notify law enforcement against researchers who:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Make a good-faith effort to avoid privacy violations, data destruction, and service interruption.</li>
              <li>Report identified vulnerabilities promptly to <code className="font-mono text-brand-emerald-deep font-bold">security@pixir.in</code> without public premature disclosure.</li>
              <li>Do not access, download, or modify user scan reports or credentials beyond what is necessary to demonstrate the vulnerability.</li>
              <li>Allow us a reasonable window (minimum 30 days) to patch the vulnerability before public coordination.</li>
            </ul>
          </section>

          {/* Section 4: Out-of-Scope Activities */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">04.</span>
              <span>Scope Boundaries</span>
            </h2>
            <div className="space-y-2">
              <p><strong className="text-brand-text">In-Scope Assets:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Web application frontend: <code className="font-mono text-brand-text">https://vibesift.pixir.in</code></li>
                <li>Audit dispatch and report APIs: <code className="font-mono text-brand-text">https://vibesift.pixir.in/api/*</code></li>
                <li>Authentication and session validation mechanisms</li>
                <li>Worker SSRF boundary filters</li>
              </ul>

              <p className="pt-2"><strong className="text-brand-text">Out-of-Scope Activities:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Volumetric Denial of Service (DoS/DDoS) attacks against VibeSift or third-party targets</li>
                <li>Social engineering, phishing, or physical attacks against Pixir employees or infrastructure</li>
                <li>Testing third-party domains or web applications without explicit domain authorization</li>
                <li>Automated high-rate fuzzing that degrades platform availability for legitimate users</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Response SLAs & Hall of Fame */}
          <section className="space-y-3" id="hall-of-fame">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">05.</span>
              <span>Response Timeline SLAs & Hall of Fame</span>
            </h2>
            <div className="p-4 rounded-xl border border-brand-border bg-brand-card-green/50 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white rounded-lg border border-brand-border">
                  <div className="text-lg font-bold text-brand-emerald-deep font-mono">24 Hours</div>
                  <div className="text-[11px] text-brand-text-secondary">Initial Response & Acknowledgement</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-brand-border">
                  <div className="text-lg font-bold text-brand-emerald-deep font-mono">72 Hours</div>
                  <div className="text-[11px] text-brand-text-secondary">Severity & Impact Triage</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-brand-border">
                  <div className="text-lg font-bold text-brand-emerald-deep font-mono">30 Days</div>
                  <div className="text-[11px] text-brand-text-secondary">Target Resolution SLA</div>
                </div>
              </div>

              <div className="pt-2 text-xs flex items-center gap-2 text-brand-text">
                <Award className="w-4 h-4 text-brand-emerald shrink-0" />
                <span>
                  Researchers who report valid, previously unknown security vulnerabilities are recognized in our Security Hall of Fame.
                </span>
              </div>
            </div>
          </section>

          {/* Contact Box */}
          <div className="p-5 rounded-2xl border border-brand-emerald/40 bg-brand-mint/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-brand-text flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-emerald" />
                <span>Report a Vulnerability</span>
              </div>
              <p className="text-xs text-brand-text-secondary">
                Send security reports with reproduction steps to <a href="mailto:security@pixir.in" className="text-brand-emerald-deep font-semibold underline">security@pixir.in</a>
              </p>
            </div>

            <a
              href="mailto:security@pixir.in?subject=Vulnerability%20Disclosure%20Report"
              className="px-4 py-2 rounded-lg bg-brand-emerald text-white text-xs font-bold hover:bg-brand-emerald-dark transition-colors shrink-0"
            >
              Email Security Desk
            </a>
          </div>

        </div>

        {/* Bottom Back Button */}
        <div className="mt-14 pt-8 border-t border-brand-border flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="flex items-center gap-2 text-xs font-bold text-brand-text-secondary hover:text-brand-text"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to VibeSift Home</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToPrivacy}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-emerald-deep hover:text-brand-emerald"
          >
            <span>View Privacy Policy & Data Collection</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      {/* Global Footer */}
      <Footer
        onNavigateToApp={onNavigateToApp}
        onNavigateToMethodology={onNavigateToMethodology}
        onNavigateToSampleReports={onNavigateToSampleReports}
        onNavigateToRemediation={onNavigateToRemediation}
        onNavigateToPrivacy={onNavigateToPrivacy}
        onNavigateToSecurity={onNavigateToSecurity}
        onOpenPrivacyNotice={onOpenPrivacyNotice}
        onOpenSecurityPolicy={onOpenSecurityPolicy}
      />

    </div>
  );
};
