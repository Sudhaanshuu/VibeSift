import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeTargetUrl } from '../../lib/validation/urlSchema';
import { precheckScanTarget, PrecheckResult } from '../../lib/api/scans';
import { ExistingAuditModal } from '../common/ExistingAuditModal';
import { 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Globe, 
  Zap, 
  Lock, 
  Activity, 
  TrendingUp,
  Sparkles,
  Layers
} from 'lucide-react';

interface HeroSectionProps {
  onViewSampleReport?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onViewSampleReport }) => {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cachedAudit, setCachedAudit] = useState<PrecheckResult | null>(null);
  const [isExistingModalOpen, setIsExistingModalOpen] = useState(false);
  const { openNewScanModal, isScanning } = useAudit();
  const { isAuthenticated, openLoginModal } = useAuth();

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      setErrorMsg('Please enter a website URL');
      return;
    }
    setErrorMsg('');
    const normalized = normalizeTargetUrl(inputUrl);

    // Check S3 and SQLite for existing audit
    try {
      const check = await precheckScanTarget(normalized);
      if (check.exists && check.scanId) {
        setCachedAudit(check);
        setIsExistingModalOpen(true);
        return;
      }
    } catch (checkErr) {
      console.warn('[HeroSection] Precheck error:', checkErr);
    }

    if (!isAuthenticated) {
      openNewScanModal(normalized);
      openLoginModal();
      return;
    }

    openNewScanModal(normalized);
  };

  const handleViewExisting = (scanId: string) => {
    setIsExistingModalOpen(false);
    navigate(`/app/scans/${scanId}`);
  };

  const handleReaudit = () => {
    setIsExistingModalOpen(false);
    const normalized = normalizeTargetUrl(inputUrl);
    if (!isAuthenticated) {
      openNewScanModal(normalized);
      openLoginModal();
      return;
    }
    openNewScanModal(normalized);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-16 lg:pb-28 bg-brand-mint border-b border-brand-border">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-white/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, URL Input, Stats */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-xs font-bold text-brand-emerald-deep shadow-subtle border border-brand-border">
              <span className="flex h-2 w-2 rounded-full bg-brand-emerald animate-pulse" />
              <span className="uppercase tracking-wider text-[11px]">24-Check Pre-Launch Verification</span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-brand-text-secondary">AI & Vibe Code Auditor</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-brand-text leading-[1.08]">
              Find what your <br />
              <span className="text-brand-emerald-dark underline decoration-brand-emerald decoration-4 underline-offset-4">
                AI-built website
              </span> missed before launch.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-brand-text-secondary leading-relaxed max-w-xl font-normal">
              Audit SEO, performance, accessibility, and website security configuration in one evidence-backed report. Find problems before your users do.
            </p>

            {/* URL Submission Form */}
            <div className="space-y-3 max-w-xl">
              <form 
                onSubmit={handleQuickSubmit} 
                className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-2xl sm:rounded-full bg-white border-2 border-brand-border shadow-card focus-within:border-brand-emerald transition-all"
              >
                <div className="flex-1 flex items-center px-4 gap-2.5">
                  <Globe className="w-5 h-5 text-brand-emerald shrink-0" />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="https://yourwebsite.com"
                    aria-label="Website URL to audit"
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

              {errorMsg && (
                <p className="text-xs text-red-600 font-semibold pl-3">{errorMsg}</p>
              )}

              {/* Feature checkmark pills beneath CTA (Matching reference screenshot) */}
              <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-brand-text-secondary font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  <span>No credit card required</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  <span>Instant passive baseline</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
                  <span>100% Client-safe</span>
                </span>
              </div>

              {/* Secondary link */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onViewSampleReport}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-brand-emerald-dark hover:text-brand-emerald hover:underline transition-colors"
                >
                  <span>Or explore a pre-generated sample report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scope clarification notice */}
            <div className="p-3 rounded-xl bg-white/80 border border-brand-border/80 text-xs text-brand-text-secondary max-w-xl">
              <strong className="text-brand-text">Simple vs. Deep Search: </strong>
              Run a quick 20-second public quality check, or sign in to launch a deep privacy and security audit across your pages.
            </div>

          </div>

          {/* Right Column: Visual 3D Hero Art & Floating Stats Grid (Matching Reference Screenshot) */}
          <div className="lg:col-span-5 relative space-y-4">
            
            {/* Main Visual 3D Image */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-white shadow-elevated bg-white">
              <img
                src="/images/hero-audit-3d.jpg"
                alt="VibeSift 3D Web Launch Readiness Audit Concept"
                className="w-full h-auto object-cover transform hover:scale-102 transition-transform duration-500"
              />

              {/* Verified Pill Overlay */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-brand-emerald-deep shadow-subtle border border-brand-border backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                  <span>VibeSift Precision Engine</span>
                </span>
              </div>
            </div>

            {/* 4 Feature Capability Tiles in 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tile 1 */}
              <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-subtle">
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary font-medium">
                  <span>Coverage</span>
                  <span className="text-[10px] font-bold text-brand-emerald-deep bg-brand-mint px-1.5 py-0.5 rounded-full border border-brand-border">
                    Full Stack
                  </span>
                </div>
                <div className="text-xl font-extrabold text-brand-text mt-1">24 Checks</div>
                <div className="text-[10px] text-brand-text-secondary">Security, Performance & SEO</div>
              </div>

              {/* Tile 2 */}
              <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-subtle">
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary font-medium">
                  <span>Inspection</span>
                  <span className="text-[10px] font-bold text-brand-emerald-deep bg-brand-mint px-1.5 py-0.5 rounded-full border border-brand-border">
                    Passive
                  </span>
                </div>
                <div className="text-xl font-extrabold text-brand-text mt-1">Zero Intrude</div>
                <div className="text-[10px] text-brand-text-secondary">Non-destructive evaluation</div>
              </div>

              {/* Tile 3 */}
              <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-subtle">
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary font-medium">
                  <span>Privacy</span>
                  <Lock className="w-3.5 h-3.5 text-brand-emerald" />
                </div>
                <div className="text-xl font-extrabold text-brand-text mt-1">Redacted</div>
                <div className="text-[10px] text-brand-text-secondary">Tokens stripped from logs</div>
              </div>

              {/* Tile 4 */}
              <div className="p-3.5 rounded-2xl bg-white border border-brand-border shadow-subtle">
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary font-medium">
                  <span>Verification</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald" />
                </div>
                <div className="text-xl font-extrabold text-brand-text mt-1">Evidence</div>
                <div className="text-[10px] text-brand-text-secondary">Reproducible curl & diffs</div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Existing Audit Found in S3 Modal */}
      <ExistingAuditModal
        isOpen={isExistingModalOpen}
        onClose={() => setIsExistingModalOpen(false)}
        cachedAudit={cachedAudit}
        onViewExisting={handleViewExisting}
        onReaudit={handleReaudit}
      />
    </section>
  );
};
