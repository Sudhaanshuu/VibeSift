import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, Scale, Server, FileCheck } from 'lucide-react';

export const PrivacyTestingScopeSection: React.FC = () => {
  return (
    <section id="scope" className="py-16 sm:py-24 bg-brand-muted/50 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-card-green text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <Lock className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Scope Boundaries & Responsible Disclosure</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            Clear boundaries. <br />
            <span className="text-brand-emerald">Responsible scanning policies.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            We adhere to strict ethical testing practices. We separate public external baseline checks from deeper testing, and maintain honesty regarding what external tools cannot assess.
          </p>
        </div>

        {/* 2 Wide Feature Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Box 1: Public Baseline Checks */}
          <div className="rounded-2xl bg-white border-2 border-brand-border p-6 sm:p-8 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold font-mono text-brand-emerald-dark bg-brand-card-green px-2.5 py-1 rounded-full border border-brand-border">
                  Scope Level 1: Public Baseline
                </span>
              </div>

              <h3 className="text-lg font-bold text-brand-text mb-2">
                External Quality & Best Practices
              </h3>

              <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed mb-4">
                Available to any publicly reachable website URL. Operates under strictly polite request rates with non-destructive HTTP requests.
              </p>

              <ul className="space-y-2 text-xs text-brand-text">
                <li className="flex items-start gap-2">
                  <span className="text-brand-emerald font-bold">✓</span>
                  <span>Public technical SEO, sitemaps, and robots.txt analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-emerald font-bold">✓</span>
                  <span>Headless Chromium Core Web Vitals and Lighthouse metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-emerald font-bold">✓</span>
                  <span>Automated WCAG 2.1 AA accessibility checks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-emerald font-bold">✓</span>
                  <span>HTTP security headers, TLS configuration & cookie flags</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-emerald font-bold">✓</span>
                  <span>Exposure checks for public source maps and leaked configuration</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-brand-border text-[11px] text-brand-text-secondary">
              Zero server disruption or credential requirements.
            </div>
          </div>

          {/* Box 2: Deeper Security Auditing */}
          <div className="rounded-2xl bg-white border-2 border-amber-200 p-6 sm:p-8 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold font-mono text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                  Scope Level 2: Authorized Targets Only
                </span>
              </div>

              <h3 className="text-lg font-bold text-brand-text mb-2">
                OWASP ZAP & Nuclei Vulnerability Checks
              </h3>

              <p className="text-xs sm:text-sm text-brand-text-secondary leading-relaxed mb-4">
                Deeper vulnerability checks operate strictly against targets with cryptographically verified domain ownership (DNS TXT or HTML meta token).
              </p>

              <ul className="space-y-2 text-xs text-brand-text">
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔒</span>
                  <span>Strict domain boundary enforcement (never probes unauthorized subdomains)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔒</span>
                  <span>Curated, non-destructive vulnerability template suites</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔒</span>
                  <span>Controlled AWS Fargate isolated container execution</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔒</span>
                  <span>Strict rate limiting, bounded timeouts, and egress filtering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold">🔒</span>
                  <span>No denial-of-service, destructive fuzzing, or arbitrary SQL injection</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-200 text-[11px] text-amber-900 font-medium">
              Requires explicit domain challenge verification prior to scan dispatch.
            </div>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="rounded-2xl bg-white border border-brand-border p-6 sm:p-7 flex items-start gap-4">
          <Scale className="w-6 h-6 text-brand-emerald shrink-0 mt-1" />
          <div className="space-y-1.5 text-xs sm:text-sm text-brand-text-secondary">
            <h4 className="font-bold text-brand-text text-sm">
              Technical Indicators vs Legal Compliance Certification
            </h4>
            <p className="leading-relaxed">
              Our platform provides technical quality findings, security hygiene indicators, and developer guidance. It does <strong className="text-brand-text">not</strong> constitute formal legal compliance certification. A cookie consent banner, privacy policy link, or robots.txt file alone does not guarantee compliance with the GDPR, CCPA, India’s Digital Personal Data Protection (DPDP) Act, or other regulatory frameworks. Legal compliance depends on your actual backend data handling agreements, international transfer policies, and jurisdictional counsel.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
