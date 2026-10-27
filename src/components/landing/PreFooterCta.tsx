import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { normalizeTargetUrl } from '../../lib/validation/urlSchema';
import { Globe, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const PreFooterCta: React.FC = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const { openNewScanModal, isScanning } = useAudit();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }
    setError('');
    const normalized = normalizeTargetUrl(url);
    openNewScanModal(normalized);
  };

  return (
    <section className="py-20 sm:py-28 bg-brand-mint border-b border-brand-border relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-brand-emerald-deep text-xs font-bold mb-5 border border-brand-border shadow-subtle">
          <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          <span>VibeSift by Pixir · Free Pre-Launch Audit</span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-text mb-4">
          Launch with fewer blind spots.
        </h2>

        {/* Supporting text */}
        <p className="text-base sm:text-xl text-brand-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
          Run an audit, understand your findings, and know what deserves attention before launch.
        </p>

        {/* URL Form (Rounded pill style) */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto p-1.5 rounded-2xl sm:rounded-full bg-white border-2 border-brand-border shadow-card focus-within:border-brand-emerald transition-all">
          <div className="flex-1 flex items-center px-4 gap-2.5">
            <Globe className="w-5 h-5 text-brand-emerald shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              placeholder="https://yourwebsite.com"
              aria-label="Target website address"
              className="w-full bg-transparent text-sm sm:text-base text-brand-text placeholder-gray-400 focus:outline-none py-2.5 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isScanning}
            className="whitespace-nowrap px-6 py-3 rounded-xl sm:rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold text-sm sm:text-base shadow-subtle transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>Run free baseline scan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {error && (
          <p className="text-xs text-red-600 font-semibold mt-2">{error}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-brand-text-secondary font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Public baseline check</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Safe & non-destructive</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Zero credit card required</span>
          </span>
        </div>

      </div>
    </section>
  );
};
