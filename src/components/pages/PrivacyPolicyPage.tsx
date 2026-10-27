import React, { useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { useAudit } from '../../context/AuditContext';
import { 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Database, 
  FileText, 
  Cookie, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Mail,
  Scale
} from 'lucide-react';
import { Footer } from '../landing/Footer';
import { triggerCookieSettingsModal } from '../../lib/cookies/cookieConsent';

interface PrivacyPolicyPageProps {
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

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
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
    document.title = 'Privacy Policy & Data Collection Disclosures — VibeSift by Pixir';
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
                Privacy Policy & Data Collection
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* Page Hero Badge & Headline */}
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-mint border border-brand-emerald/20 text-xs font-bold text-brand-emerald-deep">
            <Lock className="w-3.5 h-3.5" />
            <span>Transparency & Compliance Specification</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-brand-text tracking-tight">
            Privacy Policy & Data Collection Disclosures
          </h1>

          <p className="text-sm sm:text-base text-brand-text-secondary leading-relaxed">
            Effective Date: October 27, 2026 · Entity: Pixir · Service: VibeSift (vibesift.pixir.in)
          </p>

          <div className="p-4 rounded-xl bg-brand-card-green border border-brand-border text-xs sm:text-sm text-brand-text leading-relaxed">
            <strong className="text-brand-emerald-deep font-bold">Summary in Plain English: </strong>
            VibeSift inspects publicly reachable websites to audit launch-readiness (SEO, performance, a11y, and defensive security headers). We never tamper with your servers, we automatically redact discovered secrets, we never sell your data, and we never use your audits to train public AI models. You can purge your scan history at any time.
          </div>
        </div>

        {/* Structured Sections */}
        <div className="space-y-10 text-xs sm:text-sm text-brand-text-secondary leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">01.</span>
              <span>Scope & Data Controller</span>
            </h2>
            <p>
              This Privacy Policy explains how <strong>Pixir</strong> ("we", "us", or "our") collects, processes, stores, and protects data through the <strong>VibeSift</strong> web application (<a href="https://vibesift.pixir.in" className="text-brand-emerald-deep font-semibold underline">https://vibesift.pixir.in</a>) and associated scan worker APIs.
            </p>
            <p>
              The primary purpose of VibeSift is to provide website creators, engineers, and product teams with automated, evidence-backed launch readiness audits prior to making web applications public.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">02.</span>
              <span>Information We Collect During Audits</span>
            </h2>
            <p>
              When an audit is initiated against a public URL target, our containerized workers collect observable surface metadata from the requested website:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-brand-text">Public HTTP Headers:</strong> Response headers including Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
              </li>
              <li>
                <strong className="text-brand-text">Document Markup & Metadata:</strong> Page titles, meta descriptions, Open Graph and Twitter Card tags, canonical tags, heading hierarchies, image alternative text (a11y), and viewport settings.
              </li>
              <li>
                <strong className="text-brand-text">Performance & Core Web Vitals:</strong> Largest Contentful Paint (LCP), Interaction to Next Paint (INP), Cumulative Layout Shift (CLS), First Contentful Paint (FCP), and resource payload weights calculated via Google Lighthouse.
              </li>
              <li>
                <strong className="text-brand-text">Server & DNS Configuration:</strong> TLS certificate validity dates, cipher suites, DNS resolution records, <code className="text-brand-text font-mono bg-brand-muted px-1 rounded">robots.txt</code> crawl directives, and <code className="text-brand-text font-mono bg-brand-muted px-1 rounded">security.txt</code> availability.
              </li>
              <li>
                <strong className="text-brand-text">User Account Data:</strong> For registered users, we store email address, cryptographic password hashes (bcrypt/argon2), user display name, and linked site inventory.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">03.</span>
              <span>Automated Secret Redaction Policy</span>
            </h2>
            <p>
              If a scanned web application accidentally exposes sensitive credentials in public client bundles or configuration files, VibeSift enforces an automated cryptographic masking filter before writing findings to the database:
            </p>
            <div className="p-4 rounded-xl border border-brand-border bg-brand-muted/40 font-mono text-xs space-y-2">
              <div className="flex items-center gap-2 text-brand-emerald-deep font-bold">
                <EyeOff className="w-4 h-4" />
                <span>Masking Patterns Enforced at Normalization Phase:</span>
              </div>
              <p className="text-brand-text-secondary">
                • AWS Access Keys: <span className="text-red-500 line-through">AKIA[SAMPLE_AWS_KEY]</span> → <span className="text-brand-emerald font-bold">AKIA****************</span><br />
                • OpenAI / Anthropic Keys: <span className="text-red-500 line-through">sk-live-abc123xyz...</span> → <span className="text-brand-emerald font-bold">sk-live-************</span><br />
                • Database URIs: <span className="text-red-500 line-through">postgres://user:password@host/db</span> → <span className="text-brand-emerald font-bold">postgres://user:***@host/db</span><br />
                • Private Keys: <span className="text-red-500 line-through">BEGIN PRIVATE KEY</span> → <span className="text-brand-emerald font-bold">[REDACTED_RSA_OR_EC_KEY]</span>
              </p>
            </div>
            <p>
              The platform alerts you that a critical secret exposure was detected, while preventing the raw credential from leaking into shared PDF exports or unencrypted logs.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">04.</span>
              <span>Storage, Encryption & Cloud Infrastructure</span>
            </h2>
            <p>
              All customer audit data is managed on AWS infrastructure adhering to least-privilege security controls:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-brand-border bg-white space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-brand-text text-xs">
                  <Database className="w-4 h-4 text-brand-emerald" />
                  <span>Encryption at Rest</span>
                </div>
                <p className="text-[11px] text-brand-text-secondary">
                  Scan state, scores, and defect lists are stored in Amazon DynamoDB encrypted via AWS Key Management Service (KMS AES-256).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-brand-border bg-white space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-brand-text text-xs">
                  <Lock className="w-4 h-4 text-brand-emerald" />
                  <span>Private S3 Artifacts</span>
                </div>
                <p className="text-[11px] text-brand-text-secondary">
                  Raw Lighthouse JSON payloads and generated PDF reports are kept in non-public S3 buckets, accessed only via signed, expiring URLs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">05.</span>
              <span>Zero Model Training & Third-Party Sharing</span>
            </h2>
            <div className="p-4 rounded-xl bg-brand-mint/50 border border-brand-emerald/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-brand-emerald-deep text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                <span>Strict AI Data Isolation Guarantee</span>
              </div>
              <p className="text-xs text-brand-text">
                Your scanned code snippets, DOM structures, and audit reports are <strong>never used to train, fine-tune, or calibrate public AI models</strong> (including models provided by OpenAI, Google, Anthropic, or Meta).
              </p>
              <p className="text-xs text-brand-text-secondary">
                We do not sell, rent, monetize, or broker personal information or scanned website data to data brokers or advertising networks.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">06.</span>
              <span>Cookies & Local Client Storage</span>
            </h2>
            <p>
              We classify storage mechanisms used on VibeSift into three clear tiers:
            </p>
            <div className="overflow-x-auto border border-brand-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-muted border-b border-brand-border text-brand-text font-bold">
                    <th className="p-3">Category</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  <tr>
                    <td className="p-3 font-semibold text-brand-text">Strictly Necessary</td>
                    <td className="p-3">Authentication session tokens, CSRF protection, and audit request idempotency.</td>
                    <td className="p-3 font-mono font-bold text-brand-emerald-deep">Yes (Mandatory)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-brand-text">Performance & Telemetry</td>
                    <td className="p-3">Anonymous worker dispatch latency metrics and Lighthouse pipeline uptime tracking.</td>
                    <td className="p-3 text-brand-text-secondary">Optional (Consent)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-brand-text">UI Preferences</td>
                    <td className="p-3">Remembers dashboard density, active tab, and table sort orders across sessions.</td>
                    <td className="p-3 text-brand-text-secondary">Optional (Consent)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs">
              You can adjust or revoke your cookie choices at any time by clicking{' '}
              <button
                type="button"
                onClick={() => triggerCookieSettingsModal()}
                className="text-brand-emerald-deep font-bold underline hover:text-brand-emerald"
              >
                Manage Cookie Preferences
              </button>
              .
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">07.</span>
              <span>Your Rights: Erasure, Export & Access</span>
            </h2>
            <p>
              In compliance with the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA/CPRA), and India's Digital Personal Data Protection Act (DPDP 2023):
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-brand-text">Right to Erasure:</strong> You can delete any individual scan report or permanently purge your complete account history via the Settings dashboard with one click.
              </li>
              <li>
                <strong className="text-brand-text">Right to Data Portability:</strong> You can download your reports in structured JSON format or high-resolution PDF format at any time.
              </li>
              <li>
                <strong className="text-brand-text">Right to Rectification:</strong> You may update your profile information, email preferences, and authorized target domains whenever needed.
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-brand-text flex items-center gap-2 border-b border-brand-border pb-2">
              <span className="text-brand-emerald font-mono">08.</span>
              <span>Contact & Data Protection Officer</span>
            </h2>
            <p>
              For privacy inquiries, data subject requests, or regulatory queries, please contact our Data Protection desk:
            </p>
            <div className="p-4 rounded-xl border border-brand-border bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-brand-text flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-emerald" />
                  <span>Pixir Data Protection Desk</span>
                </div>
                <p className="text-xs text-brand-text-secondary">
                  Direct Inquiries: <a href="mailto:privacy@pixir.in" className="text-brand-emerald-deep font-semibold hover:underline">privacy@pixir.in</a> or <a href="mailto:audit@pixir.in" className="text-brand-emerald-deep font-semibold hover:underline">audit@pixir.in</a>
                </p>
              </div>

              <a
                href="mailto:privacy@pixir.in?subject=Privacy%20Data%20Request"
                className="px-4 py-2 rounded-lg bg-brand-emerald text-white text-xs font-bold hover:bg-brand-emerald-dark transition-colors shrink-0"
              >
                Submit Privacy Request
              </a>
            </div>
          </section>

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
            onClick={onNavigateToSecurity}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-emerald-deep hover:text-brand-emerald"
          >
            <span>View Security & Responsible Disclosure</span>
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
