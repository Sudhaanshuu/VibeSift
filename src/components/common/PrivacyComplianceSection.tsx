import React, { useState } from 'react';
import { PrivacyComplianceSummary, AuditCheckResult } from '../../types/audit';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Scale, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  FileText, 
  ExternalLink 
} from 'lucide-react';

interface PrivacyComplianceSectionProps {
  privacyCompliance?: PrivacyComplianceSummary;
  summary?: PrivacyComplianceSummary;
  checks?: AuditCheckResult[];
}

export const PrivacyComplianceSection: React.FC<PrivacyComplianceSectionProps> = ({
  privacyCompliance,
  summary,
  checks = [],
}) => {
  const activeCompliance = privacyCompliance || summary;
  const [showAllChecks, setShowAllChecks] = useState(false);

  const dpdpChecks: AuditCheckResult[] = checks.length > 0
    ? checks.filter((c: AuditCheckResult) => c.auditMode === 'privacy' || c.category === 'privacy' || c.checkId.startsWith('P'))
    : ((activeCompliance as any)?.dpdpChecks || []).map((d: any, idx: number) => ({
        checkId: `P${String(idx + 1).padStart(2, '0')}`,
        name: d.item || d.name || `Check P${idx + 1}`,
        category: 'privacy' as const,
        status: (d.status || 'pass') as any,
        explanation: d.details || d.explanation || '',
        legalCitation: d.section || d.legalCitation || 'DPDP Act 2023',
        auditMode: 'privacy' as const,
        scope: 'privacy_dpdp',
      }));

  const rating = activeCompliance?.complianceRating || (activeCompliance as any)?.overallRating || 'needs_attention';

  const renderRatingBadge = () => {
    switch (rating) {
      case 'compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" /> COMPLIANT (PRELIMINARY)
          </span>
        );
      case 'high_risk':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-4 h-4 text-rose-700" /> HIGH COMPLIANCE RISK
          </span>
        );
      case 'needs_attention':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-700" /> ATTENTION REQUIRED
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-6 shadow-subtle space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-violet-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-violet-800 bg-violet-100 px-2.5 py-0.5 rounded border border-violet-200 font-bold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> India DPDP Act 2023 & Privacy Assessment
            </span>
            {renderRatingBadge()}
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Digital Personal Data Protection Act, 2023 Compliance Review
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Automated technical verification of notice requirements, affirmative consent, reject parity, tracker gating, and Grievance Officer disclosures.
          </p>
        </div>

        {/* Legal Disclaimer Pill */}
        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 max-w-sm">
          <div className="flex items-start gap-1.5 font-semibold text-amber-950 mb-0.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span>Automated Preliminary Assessment</span>
          </div>
          <span>
            This report evaluates observable technical signals against DPDP Act 2023 provisions and does not constitute formal legal counsel.
          </span>
        </div>
      </div>

      {/* Key Compliance Signals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Grievance Officer */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Grievance Officer in India</span>
            {activeCompliance?.hasGrievanceOfficer ? (
              <span className="text-emerald-700 font-bold">Disclosed ✅</span>
            ) : (
              <span className="text-rose-600 font-bold">Missing ⚠️</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Section 8(9) & 13(1): Mandatory disclosure of designated Grievance Redressal contact in India.
          </p>
        </div>

        {/* Consent Choice Parity */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Reject Choice Parity</span>
            {activeCompliance?.hasRejectParity !== false ? (
              <span className="text-emerald-700 font-bold">Balanced ✅</span>
            ) : (
              <span className="text-amber-600 font-bold">Asymmetric ⚠️</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Section 6(1): Equal ease to reject non-essential cookies without coercive dark patterns.
          </p>
        </div>

        {/* Pre-Consent Tracking */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Pre-Consent Cookies</span>
            {!activeCompliance?.hasTrackersBeforeConsent ? (
              <span className="text-emerald-700 font-bold">Blocked ✅</span>
            ) : (
              <span className="text-rose-600 font-bold">Fired Early ⚠️</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Section 6(1): Analytics/ad cookies must not fire prior to affirmative user consent.
          </p>
        </div>

        {/* Children's Data Protection */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Children's Data Clause</span>
            {activeCompliance?.hasChildrenDataClause ? (
              <span className="text-emerald-700 font-bold">Addressed ✅</span>
            ) : (
              <span className="text-amber-600 font-bold">Missing ℹ️</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Section 9: Strict prohibition of tracking or behavioral profiling of minors under 18.
          </p>
        </div>
      </div>

      {/* Accordion List of All 15 DPDP Checks */}
      <div className="border border-violet-100 rounded-xl overflow-hidden bg-white">
        <button
          onClick={() => setShowAllChecks(!showAllChecks)}
          className="w-full p-4 flex items-center justify-between bg-violet-50/50 hover:bg-violet-50 transition-colors text-xs font-bold text-violet-900 select-none"
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-600" />
            <span>
              Detailed DPDP Act Checklist ({dpdpChecks.filter((c) => c.status === 'pass').length}/{dpdpChecks.length} Verified Passed)
            </span>
          </div>
          <div className="flex items-center gap-1 text-violet-700">
            <span>{showAllChecks ? 'Collapse Detailed Checklist' : 'Expand All 15 DPDP Checks'}</span>
            {showAllChecks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAllChecks && (
          <div className="divide-y divide-slate-100 p-2 space-y-1">
            {dpdpChecks.map((check) => (
              <div key={check.checkId} className="p-3 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {check.status === 'pass' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Pass
                      </span>
                    )}
                    {check.status === 'fail' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" /> Fail
                      </span>
                    )}
                    {check.status === 'warning' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Action
                      </span>
                    )}
                    {check.status === 'info' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        Informational
                      </span>
                    )}
                    <span className="font-semibold text-slate-900">{check.name}</span>
                  </div>

                  {check.legalCitation && (
                    <span className="text-[10px] font-mono text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                      {check.legalCitation}
                    </span>
                  )}
                </div>

                <p className="text-slate-600 leading-relaxed pl-1">
                  {check.explanation}
                </p>

                {check.remediation?.summary && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                    <span className="font-bold text-slate-900">Recommended Action: </span>
                    {check.remediation.summary}
                    {check.remediation.codeSnippet && (
                      <pre className="mt-1.5 p-2 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                        {check.remediation.codeSnippet}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
