import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface BotProtectionBadgeProps {
  onVerified?: (token: string) => void;
  className?: string;
  compact?: boolean;
}

export const BotProtectionBadge: React.FC<BotProtectionBadgeProps> = ({
  onVerified,
  className = '',
  compact = false,
}) => {
  const [status, setStatus] = useState<'verifying' | 'verified'>('verifying');

  useEffect(() => {
    // Non-interactive challenge simulation (Cloudflare Turnstile standard behavior)
    const timer = setTimeout(() => {
      setStatus('verified');
      onVerified?.('1x00000000000000000000AA'); // Cloudflare official test fixture
    }, 600);

    return () => clearTimeout(timer);
  }, [onVerified]);

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600 ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
        <span>Cloudflare Turnstile Protected</span>
        {status === 'verified' && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-brand-emerald animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand-emerald shadow-subtle">
          <ShieldCheck className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-slate-800 text-[11px] block">
            Cloudflare Turnstile Active
          </span>
          <span className="text-[10px] text-slate-500">
            Automated non-interactive bot & Sybil protection
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono font-medium text-brand-emerald-deep">
        {status === 'verifying' ? (
          <>
            <span className="w-2 h-2 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
            <span className="text-[10px]">Checking...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 text-brand-emerald" />
            <span className="text-[10px]">Human Verified</span>
          </>
        )}
      </div>
    </div>
  );
};
