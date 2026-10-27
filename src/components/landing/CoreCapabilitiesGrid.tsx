import React from 'react';
import { coreCapabilities } from '../../data/capabilitiesData';
import { 
  Compass, 
  Zap, 
  Eye, 
  ShieldCheck, 
  Lock, 
  AlertOctagon, 
  Server, 
  FileCode,
  Check,
  ShieldAlert
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Compass,
  Zap,
  Eye,
  ShieldCheck,
  Lock,
  AlertOctagon,
  Server,
  FileCode,
};

export const CoreCapabilitiesGrid: React.FC = () => {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Core Audit Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            Eight specialized audit vectors. <br />
            <span className="text-brand-emerald">Zero mystery scores.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            Every audit checks observable facts on your live site. We clearly distinguish standard external observations from deeper tests requiring authenticated permission.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {coreCapabilities.map((cap) => {
            const Icon = iconMap[cap.icon] || ShieldCheck;
            const isAuthorizedOnly = cap.scopeType === 'Authorized Target Only';

            return (
              <div
                key={cap.title}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 ${
                  isAuthorizedOnly 
                    ? 'bg-amber-50/20 border-amber-200/80 hover:border-amber-400' 
                    : 'bg-brand-muted/30 border-brand-border hover:border-brand-emerald/40 hover:bg-white hover:shadow-subtle'
                }`}
              >
                <div>
                  {/* Top Bar: Icon + Scope Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isAuthorizedOnly 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-brand-mint text-brand-emerald-dark'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      isAuthorizedOnly 
                        ? 'bg-amber-100 text-amber-900 border-amber-300' 
                        : 'bg-brand-card-green text-brand-emerald-dark border-brand-border'
                    }`}>
                      {cap.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-brand-text mb-2">
                    {cap.title}
                  </h3>

                  <p className="text-xs text-brand-text-secondary leading-relaxed mb-4">
                    {cap.description}
                  </p>

                  {/* Checklist of what's inspected */}
                  <div className="space-y-1.5 pt-3 border-t border-brand-border/60">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary mb-1">
                      Observable Checks:
                    </div>
                    {cap.checksIncluded.map((chk, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-brand-text">
                        <Check className="w-3.5 h-3.5 text-brand-emerald shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{chk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope clarity note */}
                <div className="mt-5 pt-3 border-t border-brand-border/60">
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${
                    isAuthorizedOnly ? 'text-amber-800' : 'text-brand-text-secondary'
                  }`}>
                    {isAuthorizedOnly ? (
                      <>
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>Requires DNS TXT verification</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-brand-emerald" />
                        <span>No setup or credentials needed</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
