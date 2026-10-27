import React, { useState, useEffect } from 'react';
import { howItWorksSteps } from '../../data/capabilitiesData';
import { 
  Globe, 
  Cpu, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Play, 
  Pause, 
  Zap, 
  Activity, 
  Check, 
  Terminal, 
  Radio, 
  Code2, 
  ArrowRight
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Globe,
  Cpu,
  CheckCircle2,
};

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [pulseTick, setPulseTick] = useState<number>(0);

  // Auto-cycle through the 3 steps to demonstrate continuous motion graphics
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Subtle ticker for high-tech telemetry pulse
  useEffect(() => {
    const ticker = setInterval(() => {
      setPulseTick((t) => (t + 1) % 100);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  return (
    <section id="how-it-works" className="py-14 sm:py-22 bg-brand-muted/40 border-b border-brand-border relative overflow-hidden">
      
      {/* Background Animated Motion Grid / Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-mint/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-card-green rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-card-green text-brand-emerald-dark text-[11px] font-bold mb-3 border border-brand-border shadow-subtle">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>STRUCTURED VERIFICATION WORKFLOW</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-brand-text leading-tight">
            Three steps from uncertainty <br />
            <span className="text-brand-emerald">to verified launch readiness.</span>
          </h2>

          <p className="mt-3 text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-2xl mx-auto">
            Our pipeline isolates public baseline checks from deeper active tests, ensuring safe execution without breaking live staging environments or requesting unneeded permissions.
          </p>

          {/* Motion Graphics Player Controls & Pipeline Stepper Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-brand-border text-xs font-semibold text-brand-text hover:border-brand-emerald transition-all shadow-subtle"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-brand-emerald fill-brand-emerald" />
                  <span>Pause Motion Tour</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-brand-emerald fill-brand-emerald" />
                  <span>Play Motion Tour</span>
                </>
              )}
            </button>

            {/* Step Pills */}
            <div className="inline-flex p-1 rounded-full bg-white border border-brand-border shadow-subtle">
              {howItWorksSteps.map((step, idx) => (
                <button
                  key={step.stepNumber}
                  onClick={() => {
                    setActiveStep(idx);
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeStep === idx
                      ? 'bg-brand-emerald text-white shadow-subtle'
                      : 'text-brand-text-secondary hover:text-brand-text'
                  }`}
                >
                  <span className="font-mono text-[10px]">0{idx + 1}</span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Motion Graphics Interactive Stage */}
        <div className="mb-10 max-w-5xl mx-auto rounded-2xl bg-slate-950 border border-slate-800 p-4 sm:p-6 shadow-2xl text-white relative overflow-hidden">
          
          {/* Animated Background Laser Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />
          
          {/* Active Flow Beam Travelling Header */}
          <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-emerald"></span>
              </span>
              <span className="font-mono text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                Live Pipeline Stage: 0{activeStep + 1} · {howItWorksSteps[activeStep].title}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
              <Activity className="w-3.5 h-3.5 text-brand-emerald animate-pulse" />
              <span>TELEMETRY_HZ: 60FPS</span>
            </div>
          </div>

          {/* Interactive Motion Graphic Canvas per Step */}
          <div className="relative z-10 py-5">
            {activeStep === 0 && (
              /* Step 01 Motion Graphic: Target URL & SSRF Validation */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-emerald/10 text-brand-emerald text-[11px] font-mono border border-brand-emerald/30">
                    <Globe className="w-3.5 h-3.5" />
                    <span>PROTOCOL_SSRF_RADAR</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-100">
                    SSRF Boundary Defense & Instant Target Normalization
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Incoming addresses undergo cryptographic DNS pre-flight and private IP subnet filtering (RFC 1918 / cloud metadata) before the scanning engine fires a single byte.
                  </p>
                  
                  {/* Motion Graphic Signal Indicators */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Target DNS Resolution:</span>
                      <span className="text-brand-emerald font-bold">104.21.54.21 (Public Cloudflare)</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Metadata Shield (169.254.x):</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> PROTECTED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Motion Graphic: Animated SSRF Radar Terminal */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-700/70 p-4 font-mono text-xs shadow-inner relative overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-slate-800 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-brand-emerald" />
                      <span>URL Ingestion Radar</span>
                    </span>
                    <span className="text-brand-emerald font-bold animate-pulse">PROBING ACTIVE</span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="text-slate-400">$ normalize --target https://app-staging.dev</div>
                    <div className="text-emerald-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Protocol: HTTPS/2 · TLS 1.3 Negotiated</span>
                    </div>
                    <div className="text-amber-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>Scope Check: Single FQDN Hostname Lock</span>
                    </div>
                    <div className="text-brand-emerald flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-ping" />
                      <span>Ready to Hand Off to Safe Scanning Core →</span>
                    </div>
                  </div>

                  {/* Animated Radar Pulse Rings */}
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full border border-brand-emerald/20 animate-ping pointer-events-none" />
                </div>
              </div>
            )}

            {activeStep === 1 && (
              /* Step 02 Motion Graphic: Multi-Engine Pipeline In Motion */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-[11px] font-mono border border-blue-500/30">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>PARALLEL_CORE_SANDBOX</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-100">
                    Three Containerized Engines Probing Concurrently
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Lighthouse renders in headless Chromium, OWASP ZAP evaluates security headers passively, and custom Python validators probe exposure endpoints in strict isolation.
                  </p>

                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Headless Chromium Lighthouse:</span>
                      <span className="text-blue-400 font-bold">Measuring LCP / CLS</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Passive OWASP ZAP Engine:</span>
                      <span className="text-brand-emerald font-bold">Headers & Cookie Flags</span>
                    </div>
                  </div>
                </div>

                {/* Motion Graphic: Animated Engine Processing Bars */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-700/70 p-4 font-mono text-xs shadow-inner">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-slate-800 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>Live Scan Engine Matrix</span>
                    </span>
                    <span className="text-blue-400 font-bold">3 CORES ACTIVE</span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Core Web Vitals & Hydration</span>
                        <span className="text-brand-emerald font-bold">100%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-emerald w-full animate-pulse rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>CSP & Defensive Headers Matrix</span>
                        <span className="text-blue-400 font-bold">100%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-full animate-pulse rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                        <span>Public .map & .env Leak Prober</span>
                        <span className="text-purple-400 font-bold">100%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-full animate-pulse rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              /* Step 03 Motion Graphic: Actionable Evidence Diffs */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-emerald/10 text-brand-emerald text-[11px] font-mono border border-brand-emerald/30">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>SYNTHETIC_DIFF_GENERATOR</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-100">
                    Deterministic Code Remediation & 1-Click Verification
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zero guesswork or generic advice. Receive ready-to-copy framework snippets (Next.js, Vite, Caddy) and 1-click rescan confirmation before deploying to users.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-brand-emerald text-brand-emerald font-mono text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>98% Launch Verified</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Ready for production release
                    </div>
                  </div>
                </div>

                {/* Motion Graphic: Animated Code Diff Terminal */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-700/70 p-4 font-mono text-xs shadow-inner">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 border-b border-slate-800 mb-3">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Code2 className="w-3.5 h-3.5 text-brand-emerald" />
                      <span>next.config.js · Security Fix Diff</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">COPY DIFF</span>
                  </div>

                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <div className="text-red-400 bg-red-950/30 px-2 py-0.5 rounded border-l-2 border-red-500">
                      - // Missing Content-Security-Policy & HSTS
                    </div>
                    <div className="text-brand-emerald bg-emerald-950/30 px-2 py-0.5 rounded border-l-2 border-brand-emerald">
                      + key: &apos;Content-Security-Policy&apos;,
                    </div>
                    <div className="text-brand-emerald bg-emerald-950/30 px-2 py-0.5 rounded border-l-2 border-brand-emerald">
                      + value: &quot;default-src &apos;self&apos;; script-src &apos;self&apos; &apos;nonce-...&apos;;&quot;
                    </div>
                    <div className="text-slate-400 px-2 py-0.5">
                      ✓ Confirmed fixed on re-scan in 0.4s
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Progress Rail Animation */}
          <div className="relative pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
              <span>Step 01: Ingestion</span>
              <span>Step 02: Multi-Audit</span>
              <span>Step 03: Verified Launch</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-emerald transition-all duration-700 rounded-full shadow-[0_0_8px_#22c55e]"
                style={{ width: `${((activeStep + 1) / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Step Sequence Cards with Motion Graphics Connection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {howItWorksSteps.map((step, idx) => {
            const Icon = iconMap[step.icon] || Globe;
            const isCurrent = activeStep === idx;
            return (
              <div 
                key={step.stepNumber}
                onClick={() => {
                  setActiveStep(idx);
                  setIsPlaying(false);
                }}
                className={`relative rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between cursor-pointer group ${
                  isCurrent 
                    ? 'bg-white border-2 border-brand-emerald shadow-elevated -translate-y-1 ring-4 ring-brand-emerald/10'
                    : 'bg-white/90 border border-brand-border shadow-subtle hover:border-brand-emerald/50 hover:shadow-card hover:-translate-y-0.5'
                }`}
              >
                <div>
                  {/* Step Number & Icon Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-mono text-xl font-black px-2.5 py-0.5 rounded-lg border transition-colors ${
                      isCurrent 
                        ? 'text-brand-emerald-deep bg-brand-mint border-brand-emerald/40 shadow-sm'
                        : 'text-brand-text-secondary bg-brand-muted border-brand-border'
                    }`}>
                      {step.stepNumber}
                    </span>
                    
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isCurrent
                        ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle'
                        : 'bg-brand-card-green text-brand-emerald-dark border-brand-border group-hover:bg-brand-mint'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className={`text-base font-bold mb-1 transition-colors ${
                    isCurrent ? 'text-brand-emerald-dark' : 'text-brand-text'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <h4 className="text-[11px] font-semibold text-brand-emerald uppercase tracking-wider mb-2.5">
                    {step.headline}
                  </h4>

                  <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-1.5 mb-4">
                    {step.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2 text-xs text-brand-text">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0 mt-0.5" />
                        <span className="leading-tight">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Scope boundary footer note */}
                <div className="pt-3 border-t border-brand-border">
                  <div className="text-[11px] text-brand-text-secondary flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-emerald shrink-0 mt-0.5" />
                    <span className="leading-tight">{step.scopeNote}</span>
                  </div>
                </div>

                {/* Active Indicator Pulse Corner */}
                {isCurrent && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Boundary Notice Alert */}
        <div className="mt-8 rounded-2xl bg-white border border-brand-border p-5 sm:p-6 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-brand-text">
                Testing Boundaries & Authorization Guarantee
              </h4>
              <p className="text-xs text-brand-text-secondary mt-0.5 leading-relaxed">
                Public scans never attempt destructive exploitation, SQL injection fuzzing, or unauthorized network intrusion. Deeper penetration templates are unlocked only through cryptographic DNS TXT or HTML meta token verification.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
