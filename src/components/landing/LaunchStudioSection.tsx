import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { normalizeTargetUrl } from '../../lib/validation/urlSchema';
import { 
  Globe, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Lock, 
  Zap, 
  Sparkles, 
  Check, 
  Terminal,
  Activity
} from 'lucide-react';

export const LaunchStudioSection: React.FC = () => {
  const [studioUrl, setStudioUrl] = useState('');
  const { openNewScanModal, isScanning } = useAudit();

  const sampleTargets = [
    { name: 'Next.js App', url: 'https://saas-market-starter.vercel.app' },
    { name: 'Vite SPA', url: 'https://vibe-landing-demo.dev' },
    { name: 'SaaS Platform', url: 'https://vibe-pulse-app.io' },
  ];

  const developers = [
    { name: 'Sarah', role: 'CTO · Next.js', initial: 'S', color: 'bg-emerald-100 text-brand-emerald-deep' },
    { name: 'Marcus', role: 'Lead Dev · Vite', initial: 'M', color: 'bg-blue-100 text-blue-800' },
    { name: 'Priya', role: 'Founder · AI Builder', initial: 'P', color: 'bg-purple-100 text-purple-800' },
    { name: 'David', role: 'Indie Hacker', initial: 'D', color: 'bg-amber-100 text-amber-800' },
    { name: 'Elena', role: 'Design Engineer', initial: 'E', color: 'bg-teal-100 text-teal-800' },
  ];

  const handleLaunchScan = (e: React.FormEvent) => {
    e.preventDefault();
    const target = studioUrl.trim() || 'https://vibe-landing-demo.dev';
    const normalized = normalizeTargetUrl(target);
    openNewScanModal(normalized);
  };

  return (
    <section id="studio" className="py-16 sm:py-24 bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-xs font-bold mb-3 border border-brand-border">
            <Cpu className="w-3.5 h-3.5 text-brand-emerald" />
            <span>AI-POWERED PRE-LAUNCH SUITE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-text">
            Complete Pre-Launch Studio
          </h2>

          <p className="mt-3 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            One URL in, full inspection report out: security headers, edge performance, and meta-layer checks.
          </p>
        </div>

        {/* Central Studio Box (Matching Reference Screenshot layout) */}
        <div className="max-w-4xl mx-auto rounded-3xl border-2 border-brand-border bg-brand-card-green p-6 sm:p-10 shadow-card">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Drop/Enter URL Area */}
            <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-dashed border-brand-emerald/40 p-6 sm:p-8 text-center space-y-4 hover:border-brand-emerald transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-brand-mint text-brand-emerald flex items-center justify-center mx-auto border border-brand-border shadow-subtle">
                <Globe className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-brand-text">
                  Enter Any Website URL
                </h3>
                <p className="text-xs text-brand-text-secondary mt-1">
                  HTTPS or HTTP — evaluated safely with bounded concurrency
                </p>
              </div>

              <form onSubmit={handleLaunchScan} className="space-y-3 pt-2">
                <input
                  type="text"
                  value={studioUrl}
                  onChange={(e) => setStudioUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full text-center text-sm px-4 py-2.5 rounded-full border border-brand-border bg-brand-muted focus:outline-none focus:border-brand-emerald font-mono"
                />

                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full py-3 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold text-sm shadow-subtle flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Audit Website Now</span>
                </button>
              </form>

              {/* Sample Target Quick Chips */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
                <span className="text-brand-text-secondary">Or try:</span>
                {sampleTargets.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setStudioUrl(s.url);
                      openNewScanModal(s.url);
                    }}
                    className="font-medium px-2 py-0.5 rounded-md bg-brand-mint text-brand-emerald-deep hover:bg-brand-emerald hover:text-white transition-colors border border-brand-border"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Studio Feature Cards Grid (Matching Reference Screenshot layout) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-emerald-deep mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                <span>Multi-Vector Automated Diagnostics</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Feature 1 */}
                <div className="p-3 bg-white rounded-xl border border-brand-border shadow-subtle">
                  <div className="text-brand-emerald font-bold mb-0.5">Instant SSRF</div>
                  <div className="text-[11px] text-brand-text-secondary">Egress filtering active</div>
                </div>

                {/* Feature 2 */}
                <div className="p-3 bg-white rounded-xl border border-brand-border shadow-subtle">
                  <div className="text-brand-emerald font-bold mb-0.5">Core Vitals</div>
                  <div className="text-[11px] text-brand-text-secondary">LCP, CLS & FCP tested</div>
                </div>

                {/* Feature 3 */}
                <div className="p-3 bg-white rounded-xl border border-brand-border shadow-subtle">
                  <div className="text-brand-emerald font-bold mb-0.5">Zero Config</div>
                  <div className="text-[11px] text-brand-text-secondary">No code access needed</div>
                </div>

                {/* Feature 4 */}
                <div className="p-3 bg-white rounded-xl border border-brand-border shadow-subtle">
                  <div className="text-brand-emerald font-bold mb-0.5">Fix Diffs</div>
                  <div className="text-[11px] text-brand-text-secondary">Copy-paste remediation</div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-brand-border text-xs text-brand-text-secondary">
                <span className="font-bold text-brand-text">Independent Engine: </span>
                Combines Python HTTP Inspector, Google Lighthouse 12.x, and OWASP ZAP safe baseline rules.
              </div>
            </div>

          </div>

          {/* User/Developer Avatars Bar (Matching Reference Screenshot) */}
          <div className="mt-8 pt-6 border-t border-brand-border/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 overflow-hidden">
                {developers.map((dev) => (
                  <div
                    key={dev.name}
                    className={`inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center font-bold text-xs ${dev.color}`}
                    title={`${dev.name} (${dev.role})`}
                  >
                    {dev.initial}
                  </div>
                ))}
              </div>
              <div className="text-xs font-semibold text-brand-text pl-2">
                Audited by 2,400+ developers & vibe-coders this month
              </div>
            </div>

            <div className="text-xs font-bold text-brand-emerald-deep flex items-center gap-1">
              <span>View live verification telemetry</span>
              <span>→</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
