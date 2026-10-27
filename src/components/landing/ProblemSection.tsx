import React from 'react';
import { problemCards } from '../../data/capabilitiesData';
import { FileCode, ShieldAlert, Zap, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  FileCode,
  ShieldAlert,
  Zap,
  Lock,
};

export const ProblemSection: React.FC<{ onExploreRemediation?: () => void }> = ({ onExploreRemediation }) => {
  return (
    <section id="product" className="py-16 sm:py-24 bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>The Reality of Vibe Coding & AI Scaffolding</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            AI can build your website. <br />
            <span className="text-brand-emerald">You still need to verify it.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            AI coding assistants and website builders write responsive UI in seconds, but routinely omit defensive HTTP headers, leak source maps, miss WCAG contrast ratios, and scaffold unoptimized assets. Discovering these after launch damages your credibility and search ranking.
          </p>
        </div>

        {/* 4 Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {problemCards.map((card) => {
            const Icon = iconMap[card.icon] || ShieldAlert;
            return (
              <div
                key={card.id}
                className="rounded-2xl border border-brand-border bg-brand-muted/40 p-6 sm:p-7 hover:border-brand-emerald/40 hover:bg-white hover:shadow-subtle transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Card top badge */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 border border-red-200/80 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-brand-text-secondary bg-white px-2.5 py-1 rounded-md border border-brand-border">
                      {card.findingCode}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-brand-text mb-2">
                    {card.title}
                  </h3>

                  {/* AI Prompt Origin */}
                  <div className="text-xs text-brand-text-secondary bg-white/90 p-3 rounded-lg border border-brand-border/70 mb-4">
                    <strong className="text-brand-text">Why AI missed it: </strong>
                    {card.aiOrigin}
                  </div>

                  {/* Real World Consequence */}
                  <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-950 leading-relaxed">
                    <span className="font-bold text-red-800 uppercase tracking-wider block mb-1">
                      Real-World Launch Consequence:
                    </span>
                    {card.realWorldConsequence}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-emerald-dark font-semibold">
                  <span>Audit checks available in baseline scan</span>
                  <span className="text-brand-emerald">→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 rounded-2xl bg-brand-mint border border-brand-border p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-bold text-brand-text">
              Don’t rely on assumptions or vague AI assurances.
            </h3>
            <p className="text-sm text-brand-text-secondary mt-1">
              Inspect your deployed URL with deterministic rules, reproducible curl commands, and code-level diffs.
            </p>
          </div>

          {onExploreRemediation && (
            <button
              onClick={onExploreRemediation}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-emerald text-white text-sm font-semibold hover:bg-brand-emerald-dark transition-colors shrink-0 shadow-subtle"
            >
              <span>See Sample Remediation Diff</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </section>
  );
};
