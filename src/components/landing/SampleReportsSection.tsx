import React from 'react';
import { sampleReports } from '../../data/sampleReports';
import { useAudit } from '../../context/AuditContext';
import { SeverityBadge } from '../common/SeverityBadge';
import { ArrowRight, FileCheck, ExternalLink, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface SampleReportsSectionProps {
  onSelectSample: (sampleKey: string) => void;
}

export const SampleReportsSection: React.FC<SampleReportsSectionProps> = ({ onSelectSample }) => {
  const cards = [
    {
      key: 'react-vite-landing',
      title: 'React / Vite Landing Page',
      stack: 'Vite 5 · React 18 · Tailwind CSS',
      target: 'vibe-landing-demo.dev',
      description: 'Typical vibe-coded single page application with unbundled source maps, missing Content-Security-Policy headers, and uncompressed hero imagery.',
      findingsCount: 6,
      score: 74,
      highlights: ['Source map public exposure', 'Missing CSP header', '3.8s Largest Contentful Paint'],
      badge: 'Interactive Demo Available'
    },
    {
      key: 'nextjs-marketing',
      title: 'Next.js Marketing Website',
      stack: 'Next.js 14 · App Router · Vercel',
      target: 'saas-market-starter.vercel.app',
      description: 'AI-scaffolded marketing site exhibiting an exposed .env file rewrite leak, missing HSTS preload headers, and trailing slash redirect latency.',
      findingsCount: 5,
      score: 68,
      highlights: ['CRITICAL: Exposed .env configuration', 'Missing HSTS with subdomains', 'Trailing slash redirect hops'],
      badge: 'Critical Leak Example'
    },
    {
      key: 'saas-application',
      title: 'Small SaaS Application',
      stack: 'Node.js · Fastify · React Dashboard',
      target: 'vibe-pulse-app.io',
      description: 'Multi-view SaaS product with authentication cookie security vulnerabilities, render-blocking web fonts, and unmodified boilerplate privacy notices.',
      findingsCount: 6,
      score: 71,
      highlights: ['Insecure cookie attributes (no HttpOnly)', 'Missing X-Content-Type-Options', 'Render-blocking Google Fonts'],
      badge: 'Auth & Cookie Checks'
    }
  ];

  return (
    <section className="py-16 sm:py-24 bg-brand-muted/40 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <FileCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Pre-Generated Demo Reports</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            Explore realistic audits. <br />
            <span className="text-brand-emerald">No setup or external scanning required.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            Click any demo report card to review full technical findings, reproducible curl commands, and code diffs immediately. Pre-loaded with realistic, internally consistent data.
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card) => (
            <div
              key={card.key}
              onClick={() => onSelectSample(card.key)}
              className="rounded-2xl bg-white border-2 border-brand-border p-6 sm:p-7 shadow-subtle hover:border-brand-emerald hover:shadow-elevated transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-brand-emerald-dark bg-brand-card-green px-2.5 py-1 rounded-full border border-brand-border">
                    {card.badge}
                  </span>

                  <div className="flex items-center gap-1.5 font-bold text-sm text-brand-text">
                    <span className="text-xs text-brand-text-secondary">Readiness:</span>
                    <span className="text-brand-emerald font-mono">{card.score}/100</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-brand-text group-hover:text-brand-emerald-dark transition-colors mb-1">
                  {card.title}
                </h3>

                <p className="font-mono text-xs text-brand-text-secondary mb-3">
                  {card.target}
                </p>

                <div className="text-[11px] font-medium text-brand-text-secondary bg-brand-muted px-2.5 py-1 rounded border border-brand-border/60 mb-4">
                  Tech Stack: <span className="text-brand-text font-semibold">{card.stack}</span>
                </div>

                <p className="text-xs text-brand-text-secondary leading-relaxed mb-5">
                  {card.description}
                </p>

                {/* Finding highlights */}
                <div className="space-y-1.5 pt-4 border-t border-brand-border mb-6">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary mb-2">
                    Key Findings Included ({card.findingsCount} total):
                  </div>
                  {card.highlights.map((hl, i) => (
                    <div key={i} className="text-xs text-brand-text flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shrink-0" />
                      <span className="truncate">{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-4 border-t border-brand-border flex items-center justify-between text-xs font-bold text-brand-emerald group-hover:text-brand-emerald-dark">
                <span>Open Complete Demo Report</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Safety Note */}
        <div className="mt-8 text-center text-xs text-brand-text-secondary">
          <p>
            *Sample reports are completely self-contained fixtures. Clicking a sample card does not initiate scans against any live external servers.
          </p>
        </div>

      </div>
    </section>
  );
};
