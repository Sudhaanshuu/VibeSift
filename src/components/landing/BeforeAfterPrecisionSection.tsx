import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Zap,
  Lock,
  Sliders,
  Eye,
  Activity,
  FileCode,
  Gauge
} from 'lucide-react';

export const BeforeAfterPrecisionSection: React.FC = () => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [activeMode, setActiveMode] = useState<'split' | 'before' | 'after'>('split');
  const [showHotspots, setShowHotspots] = useState<boolean>(true);

  return (
    <section id="precision" className="py-14 sm:py-20 bg-white border-b border-brand-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-deep text-[11px] font-bold mb-3 border border-brand-border">
            <Sparkles className="w-3.5 h-3.5 text-brand-emerald" />
            <span>PRE-LAUNCH VERIFICATION BENCHMARK</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-brand-text">
            How Does VibeSift Catch Hidden Pre-Launch Defects?
          </h2>

          <p className="mt-2.5 text-sm sm:text-base text-brand-text-secondary leading-relaxed max-w-2xl mx-auto">
            Combining headless browser rendering, network header probing, and deterministic rules to catch silent failure modes before your users do.
          </p>

          {/* Mode Selector & Hotspot Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex p-1 rounded-full bg-brand-muted border border-brand-border text-xs font-bold shadow-subtle">
              <button
                onClick={() => setActiveMode('split')}
                className={`px-3.5 py-1.5 rounded-full transition-all text-xs ${
                  activeMode === 'split' ? 'bg-brand-emerald text-white shadow-subtle' : 'text-brand-text-secondary hover:text-brand-text'
                }`}
              >
                Comparison Slider
              </button>
              <button
                onClick={() => setActiveMode('before')}
                className={`px-3.5 py-1.5 rounded-full transition-all text-xs ${
                  activeMode === 'before' ? 'bg-red-600 text-white shadow-subtle' : 'text-brand-text-secondary hover:text-brand-text'
                }`}
              >
                Unaudited (41% Risk)
              </button>
              <button
                onClick={() => setActiveMode('after')}
                className={`px-3.5 py-1.5 rounded-full transition-all text-xs ${
                  activeMode === 'after' ? 'bg-brand-emerald-deep text-white shadow-subtle' : 'text-brand-text-secondary hover:text-brand-text'
                }`}
              >
                Verified Ready (98%)
              </button>
            </div>

            <button
              onClick={() => setShowHotspots(!showHotspots)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                showHotspots 
                  ? 'bg-brand-mint text-brand-emerald-deep border-brand-emerald/30 shadow-subtle' 
                  : 'bg-white text-brand-text-secondary border-brand-border hover:text-brand-text'
              }`}
              title="Toggle defect indicator pins"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showHotspots ? 'Defect Hotspots: ON' : 'Defect Hotspots: OFF'}</span>
            </button>
          </div>
        </div>

        {/* Comparison Showcase Container */}
        <div className="max-w-5xl mx-auto rounded-2xl sm:rounded-3xl border-2 border-brand-border bg-brand-card-green p-3 sm:p-6 shadow-elevated">
          
          {/* Browser Chrome Window Frame */}
          <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-brand-border bg-slate-900 shadow-2xl">
            
            {/* Browser Top Bar */}
            <div className="px-3 sm:px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 hidden sm:inline text-[11px] text-slate-400 font-mono">VibeSift Precision Viewport (1440x900)</span>
              </div>

              {/* Simulated Address Bar */}
              <div className="flex-1 max-w-sm sm:max-w-md mx-auto bg-slate-900/90 border border-slate-700/60 rounded-md px-2.5 py-1 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <Lock className="w-3 h-3 text-brand-emerald shrink-0" />
                  <span className="text-slate-400">https://</span>
                  <span className="text-slate-100 font-medium">preview.store-launch.dev</span>
                </div>
                <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-brand-emerald/20 text-brand-emerald font-bold border border-brand-emerald/30">
                  TLS 1.3
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                <span className="hidden md:inline font-mono">TELEMETRY LIVE</span>
              </div>
            </div>

            {/* Viewport Canvas with Clean Pixel Alignment */}
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-slate-950 select-none overflow-hidden">
              
              {activeMode === 'split' ? (
                <>
                  {/* Underneath Layer: AFTER (Verified Launch Ready) */}
                  <img
                    src="/images/audit-comparison-after.jpg"
                    alt="VibeSift Audited Web App (Launch Ready)"
                    className="absolute inset-0 w-full h-full object-cover block select-none pointer-events-none"
                  />

                  {/* Top Layer: BEFORE (Clipped using inset so it never squishes or distorts) */}
                  <div 
                    className="absolute inset-0 pointer-events-none select-none"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <img
                      src="/images/audit-comparison-before.jpg"
                      alt="Raw AI Web App (Unaudited with bugs)"
                      className="w-full h-full object-cover block select-none pointer-events-none"
                    />

                    {/* Defect Radar Hotspots (Before Side) */}
                    {showHotspots && (
                      <>
                        <div className="absolute top-[16%] left-[6%] z-20 pointer-events-auto group">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500/80 text-red-200 text-[10px] font-bold shadow-lg backdrop-blur-sm animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span>SEC-EXP: .js.map Leaked</span>
                          </div>
                        </div>

                        <div className="absolute top-[48%] left-[10%] z-20 pointer-events-auto group">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500/80 text-red-200 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span>SEC-HDR: Zero CSP / HSTS</span>
                          </div>
                        </div>

                        <div className="absolute bottom-[22%] left-[18%] z-20 pointer-events-auto group">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-500/80 text-amber-200 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span>PERF: 3.8s LCP (3.2MB Hero)</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Defect Radar Hotspots (After Side) */}
                  {showHotspots && (
                    <>
                      <div className="absolute top-[16%] right-[6%] z-10 pointer-events-auto">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-brand-emerald text-emerald-200 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-brand-emerald shrink-0" />
                          <span>SEC-FIX: Source Maps Stripped</span>
                        </div>
                      </div>

                      <div className="absolute top-[48%] right-[10%] z-10 pointer-events-auto">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-brand-emerald text-emerald-200 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-brand-emerald shrink-0" />
                          <span>SEC-FIX: Strict Nonce CSP Enforced</span>
                        </div>
                      </div>

                      <div className="absolute bottom-[22%] right-[16%] z-10 pointer-events-auto">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-brand-emerald text-emerald-200 text-[10px] font-bold shadow-lg backdrop-blur-sm">
                          <span className="w-2 h-2 rounded-full bg-brand-emerald shrink-0" />
                          <span>PERF: WebP Optim (0.7s LCP)</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Left Label Tag */}
                  <div className="absolute top-3 left-3 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-600 text-white shadow-card uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Raw AI Scaffolding · 41% Risk</span>
                    </span>
                  </div>

                  {/* Right Label Tag */}
                  <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-emerald text-white shadow-card uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>VibeSift Audited · 98% Ready</span>
                    </span>
                  </div>

                  {/* High-Tech Draggable Divider & Laser Sweep Bar */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-brand-emerald shadow-[0_0_12px_rgba(34,197,94,0.9)] z-20 pointer-events-none flex items-center justify-center"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    {/* Glowing Center Handle */}
                    <div className="w-9 h-9 rounded-full bg-white border-2 border-brand-emerald shadow-xl flex items-center justify-center text-brand-emerald-dark transition-transform hover:scale-110">
                      <Sliders className="w-4 h-4" />
                    </div>

                    {/* Top percentage tag */}
                    <div className="absolute top-3 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/90 border border-brand-emerald/60 text-[9px] font-mono text-brand-emerald font-bold shadow-md">
                      {sliderPosition}%
                    </div>
                  </div>

                  {/* Transparent Drag Input Range */}
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                    aria-label="Drag to compare before and after audit"
                  />
                </>
              ) : activeMode === 'before' ? (
                /* Single Unaudited Before View */
                <div className="relative w-full h-full">
                  <img
                    src="/images/audit-comparison-before.jpg"
                    alt="Raw AI Web App Unaudited"
                    className="w-full h-full object-cover block"
                  />
                  <div className="absolute top-4 left-4 z-10">
                    <span className="px-3 py-1.5 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-wider shadow">
                      Raw AI Code · 41% At Risk (Missing CSP, Source Maps Leaked, Slow LCP)
                    </span>
                  </div>

                  {/* Hotspots */}
                  <div className="absolute top-[25%] left-[8%] z-10">
                    <div className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold shadow-lg">
                      🔴 Vulnerable: Public .js.map files exposed
                    </div>
                  </div>
                  <div className="absolute bottom-[30%] left-[12%] z-10">
                    <div className="px-2.5 py-1 rounded-lg bg-red-950/90 border border-red-500 text-red-200 text-xs font-bold shadow-lg">
                      🔴 Insecure: Session cookies lack HttpOnly flag
                    </div>
                  </div>
                </div>
              ) : (
                /* Single After View */
                <div className="relative w-full h-full">
                  <img
                    src="/images/audit-comparison-after.jpg"
                    alt="VibeSift Verified Launch Ready Web App"
                    className="w-full h-full object-cover block"
                  />
                  <div className="absolute top-4 right-4 z-10">
                    <span className="px-3 py-1.5 rounded-full text-xs font-black bg-brand-emerald text-white uppercase tracking-wider shadow">
                      VibeSift Audited · 98% Launch Ready (Hardened Headers, 0.7s LCP)
                    </span>
                  </div>

                  {/* Hotspots */}
                  <div className="absolute top-[25%] right-[8%] z-10">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-brand-emerald text-emerald-200 text-xs font-bold shadow-lg">
                      🟢 Hardened: CSP nonce + HSTS preloaded
                    </div>
                  </div>
                  <div className="absolute bottom-[30%] right-[12%] z-10">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-brand-emerald text-emerald-200 text-xs font-bold shadow-lg">
                      🟢 Optimized: Core Web Vitals all green
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Drag Hint & Navigation Footer */}
            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-emerald" />
                <span>Drag the horizontal laser divider or click preset:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveMode('split'); setSliderPosition(25); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  25%
                </button>
                <button
                  onClick={() => { setActiveMode('split'); setSliderPosition(50); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  50% (Center)
                </button>
                <button
                  onClick={() => { setActiveMode('split'); setSliderPosition(75); }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  75%
                </button>
              </div>
            </div>
          </div>

          {/* Precision Comparison Telemetry Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
            <div className="p-3 rounded-xl bg-white border border-brand-border text-center shadow-subtle">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Readiness Score</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-xs font-mono font-bold text-red-600 line-through">41%</span>
                <ArrowRight className="w-3 h-3 text-brand-text-secondary" />
                <span className="text-base font-black text-brand-emerald-deep font-mono">98%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-brand-border text-center shadow-subtle">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Critical Exposure</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-xs font-mono font-bold text-red-600">3 Leaks</span>
                <ArrowRight className="w-3 h-3 text-brand-text-secondary" />
                <span className="text-base font-black text-brand-emerald-deep font-mono">0 Leaks</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-brand-border text-center shadow-subtle">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Largest Paint (LCP)</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-xs font-mono font-bold text-amber-600">3.8s</span>
                <ArrowRight className="w-3 h-3 text-brand-text-secondary" />
                <span className="text-base font-black text-brand-emerald-deep font-mono">0.7s</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-brand-border text-center shadow-subtle">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">Security Headers</div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className="text-xs font-mono font-bold text-red-600">0 of 6</span>
                <ArrowRight className="w-3 h-3 text-brand-text-secondary" />
                <span className="text-base font-black text-brand-emerald-deep font-mono">6 of 6</span>
              </div>
            </div>
          </div>

          {/* 3 Metric Pills Beneath */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-brand-border">
            <div className="p-3.5 rounded-xl bg-white border border-brand-border shadow-subtle text-center hover:border-brand-emerald/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-brand-mint text-brand-emerald-deep flex items-center justify-center mx-auto mb-2">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-black text-brand-text">0.2s Audit Probing</div>
              <div className="text-[11px] text-brand-text-secondary mt-0.5">Non-destructive passive telemetry</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-brand-border shadow-subtle text-center hover:border-brand-emerald/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-brand-mint text-brand-emerald-deep flex items-center justify-center mx-auto mb-2">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-black text-brand-text">Zero Secret Retention</div>
              <div className="text-[11px] text-brand-text-secondary mt-0.5">Automated token & credential redaction</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-brand-border shadow-subtle text-center hover:border-brand-emerald/40 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-brand-mint text-brand-emerald-deep flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-black text-brand-text">Cryptographic Ownership</div>
              <div className="text-[11px] text-brand-text-secondary mt-0.5">DNS TXT proof for deep ZAP scans</div>
            </div>
          </div>

          {/* Reference links */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-brand-emerald-deep">
            <a href="#features" className="hover:underline flex items-center gap-1">
              <span>Deterministic rule engine taxonomy</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a href="#sample-reports" className="hover:underline flex items-center gap-1">
              <span>View sample remediation diffs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

      </div>
    </section>
  );
};
