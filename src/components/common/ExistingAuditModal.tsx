import React, { useEffect } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Button } from './Button';
import { PrecheckResult } from '../../lib/api/scans';
import { 
  History, 
  ArrowRight, 
  RotateCw, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Calendar, 
  Clock 
} from 'lucide-react';

export interface ExistingAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  cachedAudit: PrecheckResult | null;
  onViewExisting: (scanId: string) => void;
  onReaudit: () => void;
  isReauditing?: boolean;
}

export const ExistingAuditModal: React.FC<ExistingAuditModalProps> = ({
  isOpen,
  onClose,
  cachedAudit,
  onViewExisting,
  onReaudit,
  isReauditing = false,
}) => {
  // Robust multi-platform scroll lock for background document
  useBodyScrollLock(isOpen && !!cachedAudit);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || !cachedAudit) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isReauditing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, cachedAudit, isReauditing, onClose]);

  if (!isOpen || !cachedAudit) return null;

  const formattedDate = cachedAudit.createdAt
    ? new Date(cachedAudit.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently';

  const formattedTime = cachedAudit.createdAt
    ? new Date(cachedAudit.createdAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const score = cachedAudit.readinessScore ?? cachedAudit.summary?.readinessScore ?? null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isReauditing) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] flex flex-col min-h-0 rounded-2xl border border-brand-border shadow-2xl overflow-hidden transform transition-all animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="existing-audit-title"
      >
        {/* Top Banner */}
        <div className="shrink-0 p-4 sm:p-5 bg-brand-mint/40 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-brand-emerald-dark flex items-center justify-center border border-brand-border shadow-sm">
              <History className="w-5 h-5 text-brand-emerald" />
            </div>
            <div>
              <h3 id="existing-audit-title" className="text-base font-bold text-brand-text">
                Existing Audit Found in S3
              </h3>
              <p className="text-xs text-brand-text-secondary">
                This website has already been audited
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5">
          <div className="rounded-xl border border-brand-border bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Target Website
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-brand-text bg-white px-2.5 py-1 rounded-md border border-brand-border truncate max-w-[240px]">
                {cachedAudit.targetUrl || cachedAudit.normalizedHostname}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5 text-xs text-brand-text-secondary">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Audited on:</span>
              </div>
              <span className="text-xs font-semibold text-brand-text flex items-center gap-1">
                <Clock className="w-3 h-3 text-brand-emerald" />
                {formattedDate} at {formattedTime}
              </span>
            </div>

            {score !== null && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span className="text-xs text-brand-text-secondary">
                  Launch Readiness Score:
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full ${
                  score >= 80 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : score >= 60 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {score} / 100
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-brand-text-secondary leading-relaxed">
            We already have a complete audit report stored in S3 for this target. You can view the full evidence-backed UI report immediately, or dispatch a fresh re-audit via our SQS pipeline.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onReaudit}
              disabled={isReauditing}
              className="w-full justify-center order-2 sm:order-1"
            >
              {isReauditing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-brand-emerald" />
                  <span>Enqueuing...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 text-brand-text-secondary" />
                  <span>Re-audit Again</span>
                </>
              )}
            </Button>

            <Button
              variant="primary"
              onClick={() => cachedAudit.scanId && onViewExisting(cachedAudit.scanId)}
              className="w-full justify-center order-1 sm:order-2"
            >
              <span>View Existing Audit</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
