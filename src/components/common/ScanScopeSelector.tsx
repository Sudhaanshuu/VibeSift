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
                <h4 className="text-sm font-bold text-brand-text">Quick Search</h4>
                <span className="text-[11px] text-brand-text-secondary">Fast public quality inspection (20s)</span>
              </div>
            </div>
            {value === 'baseline_public' && (
              <CheckCircle2 className="w-4 h-4 text-brand-emerald flex-shrink-0" />
            )}
          </div>

          <p className="mt-3 text-xs text-brand-text-secondary leading-relaxed">
            Audits SEO, Lighthouse Core Web Vitals, accessibility signals, security headers, broken links, and public cookies.
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Lighthouse CWV
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Security Headers
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Fast 20s
            </span>
          </div>
        </div>

        {/* Deep Search */}
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
                    : 'bg-brand-mint text-brand-emerald-dark'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-text flex items-center gap-1.5">
                  Deep Search
                </h4>
                <span className="text-[11px] text-emerald-800 font-medium">
                  Comprehensive privacy & security audit
                </span>
              </div>
            </div>
            {value === 'authorized_deep' && (
              <CheckCircle2 className="w-4 h-4 text-brand-emerald flex-shrink-0" />
            )}
          </div>

          <p className="mt-3 text-xs text-brand-text-secondary leading-relaxed">
            Multi-page crawl, Indian DPDP Act privacy compliance, third-party tracker audit, and security vulnerability testing.
          </p>

          <div className="mt-3 flex flex-wrap gap-1">
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              DPDP Act 2023
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Tracker Audit
            </span>
            <span className="inline-block text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-brand-border text-brand-text-secondary">
              Multi-Page
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
