import React, { useState, useEffect } from 'react';
import { useAudit } from '../../context/AuditContext';
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
        {isScanning && scanProgress ? (
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
                Select Audit Profile
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Baseline Public */}
                <div
                  onClick={() => setProfile('baseline_public')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    profile === 'baseline_public'
                      ? 'border-brand-emerald bg-brand-mint/50 ring-1 ring-brand-emerald'
                      : 'border-brand-border bg-white hover:bg-brand-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-text">Public Baseline</span>
                    <span className="text-[10px] font-semibold text-brand-emerald bg-white px-2 py-0.5 rounded border border-brand-border">
                      Free / Fast
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary leading-snug">
                    Technical SEO, Lighthouse performance, accessibility, public headers, cookies, and source map leakage.
                  </p>
                </div>

                {/* Option 2: Authorized Deep */}
                <div
                  onClick={() => setProfile('authorized_deep')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    profile === 'authorized_deep'
                      ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500'
                      : 'border-brand-border bg-white hover:bg-brand-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-brand-text flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" /> Authorized Deep
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                      isVerifiedDomain || acknowledgedTerms ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {isVerifiedDomain ? 'Verified' : acknowledgedTerms ? 'Owner Consent' : 'Consent Needed'}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-text-secondary leading-snug">
                    OWASP ZAP baseline + Nuclei safe templates. Enabled via verified domain or confirmed ownership consent.
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Status Banner if Deep Profile Selected */}
            {profile === 'authorized_deep' && !isVerifiedDomain && (
              acknowledgedTerms ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Ownership Authorization Confirmed:</strong>
                    You have declared ownership authorization for <span className="font-mono">{cleanHostname || 'domain'}</span>. Authorized deep security scan (OWASP ZAP & Nuclei) is enabled.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Ownership Authorization Required:</strong>
                    Confirm that you own or are authorized to audit <span className="font-mono">{cleanHostname || 'domain'}</span> using the checkbox below to unlock authorized deep scanning.
                  </div>
                </div>
              )
            )}

            {/* Responsible Scanning Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2 text-xs text-brand-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgedTerms}
                  onChange={(e) => setAcknowledgedTerms(e.target.checked)}
                  className="rounded border-gray-300 text-brand-emerald focus:ring-brand-emerald mt-0.5"
                />
                <span>
                  I confirm that I own or am authorized to audit this target, and agree to the non-destructive scanning policy.
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
