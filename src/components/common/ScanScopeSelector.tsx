import React from 'react';
import { ScanProfile } from '../../types/audit';
import { ShieldCheck, Zap, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ScanScopeSelectorProps {
  value: ScanProfile;
  onChange: (profile: ScanProfile) => void;
  isDomainVerified?: boolean;
  disabled?: boolean;
}

export const ScanScopeSelector: React.FC<ScanScopeSelectorProps> = ({
  value,
  onChange,
  isDomainVerified = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
        Select Audit Scope
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Baseline Public Scan */}
        <div
          role="radio"
          aria-checked={value === 'baseline_public'}
          tabIndex={0}
          onClick={() => !disabled && onChange('baseline_public')}
          onKeyDown={(e) => {
            if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
              e.preventDefault();
              onChange('baseline_public');
            }
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-emerald ${
            value === 'baseline_public'
              ? 'border-brand-emerald bg-brand-card-green shadow-subtle ring-1 ring-brand-emerald'
              : 'border-brand-border bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  value === 'baseline_public'
                    ? 'bg-brand-emerald text-white'
                    : 'bg-brand-mint text-brand-emerald-deep'
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-text">Baseline Public Scan</h4>
                <span className="text-[11px] text-brand-text-secondary">Safe, observable inspection</span>
              </div>
            </div>
            {value === 'baseline_public' && (
              <CheckCircle2 className="w-4 h-4 text-brand-emerald flex-shrink-0" />
            )}
          </div>

          <p className="mt-3 text-xs text-brand-text-secondary leading-relaxed">
            Audits SEO, Lighthouse performance, accessibility signals, security headers, cookie flags, and observable misconfigurations. No authorization required.
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Lighthouse 12
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              HTTP/TLS Inspect
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Zero Burden
            </span>
          </div>
        </div>

        {/* Authorized Deep Security Scan */}
        <div
          role="radio"
          aria-checked={value === 'authorized_deep'}
          tabIndex={0}
          onClick={() => !disabled && onChange('authorized_deep')}
          onKeyDown={(e) => {
            if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
              e.preventDefault();
              onChange('authorized_deep');
            }
          }}
          className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-emerald ${
            value === 'authorized_deep'
              ? 'border-brand-emerald bg-brand-card-green shadow-subtle ring-1 ring-brand-emerald'
              : 'border-brand-border bg-white hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  value === 'authorized_deep'
                    ? 'bg-brand-emerald text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                  Authorized Deep Scan
                  {!isDomainVerified && <Lock className="w-3.5 h-3.5 text-amber-600" />}
                </h4>
                <span className="text-[11px] text-amber-700 font-medium">
                  {isDomainVerified ? 'Ownership verified' : 'Domain verification required'}
                </span>
              </div>
            </div>
            {value === 'authorized_deep' && (
              <CheckCircle2 className="w-4 h-4 text-brand-emerald flex-shrink-0" />
            )}
          </div>

          <p className="mt-3 text-xs text-brand-text-secondary leading-relaxed">
            Runs deep active security tests via isolated OWASP ZAP and ProjectDiscovery Nuclei workers. Prohibits destructive payloads.
          </p>

          <div className="mt-3">
            {!isDomainVerified ? (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                <span>Requires DNS TXT or HTML tag challenge before execution.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                <span>Domain verified. Deeper security testing is authorized.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
