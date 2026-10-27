import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Compass, 
  Lock, 
  CheckCircle2, 
  Activity, 
  Eye,
  ArrowRight
} from 'lucide-react';

export const CapabilityStrip: React.FC = () => {
  const pillars = [
    {
      id: 'security',
      title: 'Defensive Security & Exposure Guard',
      badge: 'Level 1 & Level 2',
      badgeColor: 'bg-emerald-50 text-brand-emerald-deep border-emerald-200',
      icon: ShieldCheck,
      secondaryIcon: Lock,
      description: 'Eliminates silent vulnerabilities before public release. Audits Content-Security-Policy headers, HSTS preloading, secure cookie flags, and accidental source map or .env file exposures.',
      engineName: 'Custom Python & OWASP ZAP',
      checks: [
        'Content-Security-Policy (CSP) & HSTS Preload',
        'HttpOnly, Secure & SameSite cookie attributes',
        'Public .js.map source maps & .env file leakage',
        'TLS cipher suite negotiation & SSRF egress filters'
      ]
    },
    {
      id: 'performance',
      title: 'Edge Performance & Core Web Vitals',
      badge: 'Lighthouse 12.x',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: Zap,
      secondaryIcon: Activity,
      description: 'Measures live browser rendering under simulated mobile network throttling. Pinpoints heavy uncompressed hero images, render-blocking Google Fonts, and layout shifts.',
      engineName: 'Headless Chromium Engine',
      checks: [
        'Largest Contentful Paint (LCP) speedup (<2.5s)',
        'Cumulative Layout Shift (CLS) stabilization',
        'Automated WebP/AVIF asset compression diffs',
        'Render-blocking stylesheet & script detection'
      ]
    },
    {
      id: 'seo-a11y',
      title: 'Technical SEO & Accessibility (a11y)',
      badge: 'Crawl & WCAG 2.1 AA',
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: Compass,
      secondaryIcon: Eye,
      description: 'Ensures search engine indexability and accessibility standards. Validates canonical tag hierarchy, robots.txt directives, Open Graph cards, and 4.5:1 color contrast.',
      engineName: 'Meta Crawler & a11y Validator',
      checks: [
        'Self-referencing canonical links & title tags',
        'Robots.txt directives & XML sitemap discovery',
        'WCAG 2.1 AA 4.5:1 color contrast ratios',
        'Screen-reader accessible ARIA labels & image alt text'
      ]
    }
  ];

  return (
    <section className="py-12 sm:py-16 bg-brand-card-green/50 border-b border-brand-border relative overflow-hidden">
      
      {/* Background Subtle Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[280px] bg-brand-mint/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Prominent Section Header - Compact & Balanced */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-brand-emerald-deep text-[11px] font-bold mb-3 border border-brand-border shadow-subtle">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>COMPREHENSIVE LAUNCH-READINESS PILLARS</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-brand-text leading-tight">
            Three Core Dimensions. <br />
            <span className="text-brand-emerald-dark">Zero Launch Blind Spots.</span>
          </h2>

          <p className="mt-2.5 text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-2xl mx-auto">
            Rather than dozens of superficial checks, VibeSift groups critical launch verification into three rigorous, evidence-backed pillars.
          </p>
        </div>

        {/* 3 Sleek, Compact Elevated Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {pillars.map((pillar) => {
            const PrimaryIcon = pillar.icon;
            const SecondaryIcon = pillar.secondaryIcon;
            return (
              <div
                key={pillar.id}
                className="rounded-2xl bg-white border border-brand-border p-5 sm:p-6 shadow-card hover:shadow-elevated hover:border-brand-emerald hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Card Top: Dual Icon + Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-brand-mint text-brand-emerald-deep flex items-center justify-center border border-brand-border shadow-subtle group-hover:bg-brand-emerald group-hover:text-white transition-colors">
                        <PrimaryIcon className="w-5 h-5" />
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-brand-card-green text-brand-emerald-deep flex items-center justify-center border border-brand-border">
                        <SecondaryIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${pillar.badgeColor}`}>
                      {pillar.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base sm:text-lg font-bold text-brand-text mb-1.5 group-hover:text-brand-emerald-dark transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                    {pillar.description}
                  </p>

                  {/* Key Checks List with Green Checkmarks */}
                  <div className="space-y-1.5 pt-3 border-t border-brand-border/70 mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary mb-1">
                      Observable Verifications:
                    </div>
                    {pillar.checks.map((chk, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-brand-text font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0 mt-0.5" />
                        <span className="leading-tight">{chk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Engine info */}
                <div className="pt-3 border-t border-brand-border flex items-center justify-between text-xs text-brand-text-secondary">
                  <span className="font-mono text-[10px] bg-brand-muted px-2 py-0.5 rounded border border-brand-border font-medium">
                    {pillar.engineName}
                  </span>
                  <span className="text-brand-emerald font-bold flex items-center gap-1 text-xs group-hover:translate-x-0.5 transition-transform">
                    <span>Active</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Engine Transparency Subtext */}
        <div className="mt-8 text-center text-xs text-brand-text-secondary max-w-3xl mx-auto">
          <span>Supported by industry-standard open-source tools: </span>
          <strong className="text-brand-text">Google Lighthouse 12.x</strong>, <strong className="text-brand-text">OWASP ZAP Baseline</strong>, and <strong className="text-brand-text">ProjectDiscovery Nuclei Safe Core</strong>.
          <span className="block sm:inline sm:ml-1 text-[11px] text-gray-400 italic">(Tools used as scanning engines; no official partnership or commercial endorsement implied.)</span>
        </div>

      </div>
    </section>
  );
};
