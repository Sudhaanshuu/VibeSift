import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight, Zap, ExternalLink } from 'lucide-react';

export const ShowcaseUseCasesSection: React.FC<{ onExploreReport?: () => void }> = ({ onExploreReport }) => {
  return (
    <section id="showcase" className="py-16 sm:py-24 bg-brand-muted/40 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-bold mb-3 border border-brand-border">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>MULTI-SECTOR VERIFICATION MATRIX</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-text">
            One Launch Audit. <br />
            <span className="text-brand-emerald-dark">Infinite Pre-Launch Confidence.</span>
          </h2>

          <p className="mt-3 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            From high-stakes SaaS applications and e-commerce stores to client marketing sites and AI-built MVPs, verify readiness across any deployment target.
          </p>
        </div>

        {/* 4 Visual Cards Grid (Matching Reference Screenshot layout) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: SaaS Analytics Dashboard */}
          <div className="rounded-3xl bg-white border-2 border-brand-border overflow-hidden shadow-subtle hover:shadow-card hover:border-brand-emerald transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <img
                  src="/images/showcase-saas.jpg"
                  alt="SaaS Analytics Dashboard Audited by VibeSift"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-brand-emerald text-white shadow uppercase tracking-wider">
                    SaaS Launch Ready · 98%
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-brand-text mb-1.5 group-hover:text-brand-emerald-dark transition-colors">
                  Production SaaS & Cloud Stacks
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                  Verified for Content-Security-Policy headers, public `.js.map` source map stripping, and zero API token leaks in client bundles.
                </p>

                <div className="space-y-1.5 text-xs text-brand-text">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>CSP & HSTS preload confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>HttpOnly & SameSite auth session cookies</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-brand-border/60 mt-4">
              <button
                onClick={onExploreReport}
                className="text-xs font-bold text-brand-emerald-deep flex items-center justify-between w-full hover:underline"
              >
                <span>View SaaS Audit Parameters</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Modern E-Commerce Storefront */}
          <div className="rounded-3xl bg-white border-2 border-brand-border overflow-hidden shadow-subtle hover:shadow-card hover:border-brand-emerald transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                <img
                  src="/images/showcase-ecommerce.jpg"
                  alt="E-Commerce Storefront Audited by VibeSift"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-brand-emerald text-white shadow uppercase tracking-wider">
                    E-Commerce Store · 99%
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-brand-text mb-1.5 group-hover:text-brand-emerald-dark transition-colors">
                  Online Stores & Checkout Flows
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                  Audited for sub-second mobile product rendering, 0 Cumulative Layout Shift (CLS), and secure payment gateway isolation.
                </p>

                <div className="space-y-1.5 text-xs text-brand-text">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Zero layout shifts on checkout DOM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Third-party tracking script isolation</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-brand-border/60 mt-4">
              <button
                onClick={onExploreReport}
                className="text-xs font-bold text-brand-emerald-deep flex items-center justify-between w-full hover:underline"
              >
                <span>View Storefront Checklist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 3: AI-Generated Next.js & Vite Web Apps */}
          <div className="rounded-3xl bg-white border-2 border-brand-border overflow-hidden shadow-subtle hover:shadow-card hover:border-brand-emerald transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-mint to-brand-card-green p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-brand-emerald text-white shadow uppercase tracking-wider">
                    Vibe Code QA · Pass
                  </span>
                  <Zap className="w-5 h-5 text-brand-emerald" />
                </div>

                <div className="p-3 bg-white/95 rounded-xl border border-brand-border text-xs font-mono shadow-subtle">
                  <div className="text-red-700 font-bold mb-1">Before: 3.8s LCP · Missing Title</div>
                  <div className="text-brand-emerald-deep font-bold">After: 0.6s LCP · Full Meta Tags</div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-bold text-brand-text mb-1.5 group-hover:text-brand-emerald-dark transition-colors">
                  AI-Built Marketing Sites & MVPs
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                  Fixes unoptimized high-res hero PNGs, broken dynamic hydration, missing canonical link tags, and empty &lt;meta&gt; descriptions.
                </p>

                <div className="space-y-1.5 text-xs text-brand-text">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Automatic WebP compression diffs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />
                    <span>Open Graph & Twitter card tags verified</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 border-t border-brand-border/60 mt-4">
              <button
                onClick={onExploreReport}
                className="text-xs font-bold text-brand-emerald-deep flex items-center justify-between w-full hover:underline"
              >
                <span>View AI Verification Rules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
