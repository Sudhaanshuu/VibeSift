import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/AuthContext';
import { ScanProfile } from '../../types/audit';
import { Button } from '../common/Button';
import { ScanQuotaIndicator } from '../common/ScanQuotaIndicator';
import { 
  X, 
  Globe, 
  ShieldCheck, 
  Server, 
  AlertTriangle, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface NewScanModalProps {
  onScanComplete?: (scanId: string) => void;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({ onScanComplete }) => {
  const { 
    isNewScanModalOpen, 
    closeNewScanModal, 
    prefilledScanUrl, 
    startNewScan, 
    savedWebsites, 
    isScanning,
    scanProgress 
  } = useAudit();
  const { isAuthenticated, openLoginModal } = useAuth();

  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState<ScanProfile>('baseline_public');
  const [acknowledgedTerms, setAcknowledgedTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (prefilledScanUrl) {
      setUrl(prefilledScanUrl);
    }
  }, [prefilledScanUrl]);

  if (!isNewScanModalOpen) return null;

  // Extract hostname for domain verification check
  const cleanHostname = url.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  const matchedSavedSite = savedWebsites.find(s => s.hostname.toLowerCase() === cleanHostname);
  const isVerifiedDomain = matchedSavedSite ? matchedSavedSite.isVerified : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Please specify a target website URL');
      return;
    }

    if (!acknowledgedTerms) {
      setErrorMsg('Please confirm that you own or are authorized to audit this target.');
      return;
    }

    setErrorMsg('');
    try {
      const scanId = await startNewScan(url, profile);
      onScanComplete?.(scanId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Scan dispatch failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl border border-brand-border shadow-elevated overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-brand-card-green/40 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-mint text-brand-emerald-dark flex items-center justify-center border border-brand-border">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-text">Configure Pre-Launch Audit</h3>
              <p className="text-xs text-brand-text-secondary">Safe, containerized multi-engine inspection</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ScanQuotaIndicator />
            <button
              onClick={closeNewScanModal}
              disabled={isScanning}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scanning Progress or Form */}
        {!isAuthenticated ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-brand-mint text-brand-emerald-dark flex items-center justify-center mx-auto border border-brand-border">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-brand-text">Account Required to Run Audits</h4>
              <p className="text-xs text-brand-text-secondary mt-1 max-w-sm mx-auto">
                Sign in or register your free account to launch scans, check privacy & DPDP compliance, and store historical reports.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  closeNewScanModal();
                  openLoginModal();
                }}
              >
                Sign In / Create Free Account
              </Button>
              <Button variant="ghost" onClick={closeNewScanModal}>
                Cancel
              </Button>
            </div>
          </div>
        ) : isScanning && scanProgress ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-brand-mint text-brand-emerald flex items-center justify-center mx-auto border-2 border-brand-border animate-pulse">
              <ShieldCheck className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-brand-text">
                Auditing {cleanHostname || 'Website'}...
              </h4>
              <p className="text-xs sm:text-sm text-brand-text-secondary mt-1 font-mono">
                {scanProgress.stageMessage}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-brand-border">
                <div 
                  className="bg-brand-emerald h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-brand-text-secondary font-mono">
                <span>Active engine: {scanProgress.currentEngine}</span>
                <span>{scanProgress.percent}%</span>
              </div>
            </div>

            <div className="p-3 bg-brand-muted rounded-xl text-xs text-brand-text-secondary border border-brand-border">
              SSRF & rate-limit egress filters active. Average runtime: 30-45 seconds.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Target URL field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                Target Website URL
              </label>
              <div className="relative flex items-center">
                <Globe className="w-4 h-4 text-brand-emerald absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="https://yourwebsite.com"
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-white focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-brand-text-secondary">
                HTTP and HTTPS supported. Disallowed IP ranges and internal AWS endpoints are blocked by SSRF filter.
              </p>
            </div>

            {/* Scan Profile Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-text">
                Select Audit Mode
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Quick Search */}
                <div
                  onClick={() => setProfile('baseline_public')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    profile === 'baseline_public'
                      ? 'border-brand-emerald bg-brand-mint/50 ring-1 ring-brand-emerald'
                      : 'border-brand-border bg-white hover:bg-brand-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-text">Quick Search</span>
                    <span className="text-[10px] font-semibold text-brand-emerald bg-white px-2 py-0.5 rounded border border-brand-border">
                      Fast (20s)
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary leading-snug">
                    Lighthouse Core Web Vitals, SEO, SSL/TLS certificates, security headers, and public cookies.
                  </p>
                </div>

                {/* Option 2: Deep Search */}
                <div
                  onClick={() => setProfile('authorized_deep')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    profile === 'authorized_deep'
                      ? 'border-brand-emerald bg-brand-card-green ring-1 ring-brand-emerald'
                      : 'border-brand-border bg-white hover:bg-brand-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-text flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" /> Deep Search
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Comprehensive
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary leading-snug">
                    Multi-page crawl, Indian DPDP Act privacy compliance, third-party tracker audits, and active security checks.
                  </p>
                </div>
              </div>
            </div>

            {/* Deep Search Info Banner */}
            {profile === 'authorized_deep' && (
              <div className="p-3 bg-brand-card-green/50 rounded-xl border border-brand-emerald/30 text-xs text-brand-text flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-emerald shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Comprehensive Privacy & Security Audit:</strong>
                  Deep Search will inspect {cleanHostname || 'this target'} across multiple pages, auditing third-party scripts, cookie banner consent, and sensitive data leakage.
                </div>
              </div>
            )}

            {/* Simple Consent Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-brand-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedTerms}
                  onChange={(e) => setAcknowledgedTerms(e.target.checked)}
                  className="rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald mt-0.5"
                />
                <span>
                  I authorize VibeSift to run an active, non-destructive audit on this website.
                </span>
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeNewScanModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Start Launch Audit
              </Button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
