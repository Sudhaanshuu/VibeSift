import React, { useState } from 'react';
import { Finding } from '../../types/audit';
import { SeverityBadge } from './SeverityBadge';
import { CategoryBadge } from './CategoryBadge';
import { 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Code, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertCircle,
  FileCode
} from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  onToggleResolved?: (id: string) => void;
  onResolve?: (id: string) => void;
  isDetailedDefault?: boolean;
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  onToggleResolved,
  onResolve,
  isDetailedDefault = false
}) => {
  const [isExpanded, setIsExpanded] = useState(isDetailedDefault);
  const [activeTab, setActiveTab] = useState<'evidence' | 'remediation'>('remediation');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const isFixed = finding.verificationStatus === 'fixed';
  const resolveHandler = onResolve || onToggleResolved;

  const copyCurl = () => {
    if (finding.evidence.reproductionCurl) {
      navigator.clipboard.writeText(finding.evidence.reproductionCurl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  return (
    <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${
      isFixed 
        ? 'bg-emerald-50/40 border-emerald-200 opacity-80' 
        : 'bg-white border-brand-border hover:border-brand-emerald/40 hover:shadow-subtle'
    }`}>
      {/* Header bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button 
            type="button" 
            className="mt-1 text-brand-text-secondary hover:text-brand-text transition-colors shrink-0"
            aria-label={isExpanded ? "Collapse finding details" : "Expand finding details"}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-brand-emerald" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <SeverityBadge severity={finding.severity} size="sm" />
              <CategoryBadge category={finding.category} size="sm" />
              <span className="text-[11px] font-mono text-brand-text-secondary bg-brand-muted px-2 py-0.5 rounded border border-brand-border">
                {finding.ruleId}
              </span>
              <span className="text-[11px] text-brand-text-secondary capitalize">
                · {finding.detectionMethod} check
              </span>
              {isFixed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved on re-scan
                </span>
              )}
            </div>

            <h3 className={`text-base font-semibold leading-snug ${isFixed ? 'line-through text-gray-500' : 'text-brand-text'}`}>
              {finding.title}
            </h3>

            <p className="text-xs text-brand-text-secondary font-mono truncate mt-1 max-w-xl">
              Target: {finding.affectedUrl}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {resolveHandler && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resolveHandler(finding.id);
              }}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                isFixed 
                  ? 'bg-white text-brand-text-secondary border-brand-border hover:bg-gray-50' 
                  : 'bg-brand-mint text-brand-emerald-dark border-brand-border hover:bg-brand-emerald hover:text-white'
              }`}
            >
              {isFixed ? 'Mark as Open' : 'Mark as Fixed'}
            </button>
          )}

          <span className="text-xs text-brand-emerald font-medium hidden sm:inline-block">
            {isExpanded ? 'Hide details' : 'View fix & evidence'}
          </span>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div className="border-t border-brand-border/80 bg-brand-muted/40 p-4 sm:p-5 text-sm space-y-4">
          {/* Explanation / Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                Technical Explanation
              </h4>
              {finding.aiExplanation && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  AI Guidance
                </span>
              )}
            </div>
            <p className="text-brand-text leading-relaxed">
              {finding.aiExplanation || finding.description}
            </p>
          </div>

          {/* Impact Alert Box */}
          <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold text-amber-950">Potential Impact: </span>
              {finding.impact}
            </div>
          </div>

          {/* Tab buttons: Remediation vs Technical Evidence */}
          <div className="flex border-b border-brand-border gap-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('remediation')}
              className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'remediation'
                  ? 'border-brand-emerald text-brand-emerald-dark font-semibold'
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Recommended Remediation & Code Diff
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`pb-2 flex items-center gap-1.5 transition-colors border-b-2 ${
                activeTab === 'evidence'
                  ? 'border-brand-emerald text-brand-emerald-dark font-semibold'
                  : 'border-transparent text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Reproducible Evidence & Curl
            </button>
          </div>

          {/* Tab 1: Remediation */}
          {activeTab === 'remediation' && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-brand-text">
                {finding.remediation.summary}
              </p>

              {/* Code diff comparison if available */}
              {(finding.remediation.diffBefore || finding.remediation.diffAfter) && (
                <div className="rounded-lg border border-brand-border overflow-hidden bg-white text-xs font-mono">
                  {finding.remediation.diffBefore && (
                    <div className="bg-red-50/60 p-3 border-b border-brand-border text-red-900">
                      <div className="text-[10px] uppercase font-bold text-red-700 tracking-wider mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Before Fix (Problematic)
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{finding.remediation.diffBefore}</pre>
                    </div>
                  )}
                  {finding.remediation.diffAfter && (
                    <div className="bg-emerald-50/60 p-3 text-emerald-950">
                      <div className="text-[10px] uppercase font-bold text-brand-emerald-dark tracking-wider mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span> Recommended Fix (Clean)
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{finding.remediation.diffAfter}</pre>
                    </div>
                  )}
                </div>
              )}

              {finding.remediation.frameworkNotes && (
                <div className="text-xs text-brand-text-secondary bg-white p-3 rounded-lg border border-brand-border">
                  <span className="font-semibold text-brand-text">Framework Insight: </span>
                  {finding.remediation.frameworkNotes}
                </div>
              )}

              {finding.remediation.docUrl && (
                <div className="pt-1">
                  <a
                    href={finding.remediation.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-emerald hover:text-brand-emerald-dark font-medium underline underline-offset-2"
                  >
                    <span>View official documentation & specifications</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Evidence */}
          {activeTab === 'evidence' && (
            <div className="space-y-3 font-mono text-xs">
              {finding.evidence.reproductionCurl && (
                <div className="rounded-lg bg-gray-900 text-gray-100 p-3 relative group">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
                    <span>Terminal Reproduction:</span>
                    <button
                      onClick={copyCurl}
                      className="flex items-center gap-1 text-gray-300 hover:text-white bg-gray-800 px-2 py-0.5 rounded text-[10px]"
                    >
                      {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCurl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-emerald-400">{finding.evidence.reproductionCurl}</pre>
                </div>
              )}

              {finding.evidence.observedHeader && (
                <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                  <div className="text-[11px] font-semibold text-brand-text-secondary uppercase">Observed Response Header:</div>
                  <div className="text-red-700 bg-red-50 p-1.5 rounded">{finding.evidence.observedHeader}</div>
                  {finding.evidence.expectedHeader && (
                    <>
                      <div className="text-[11px] font-semibold text-brand-text-secondary uppercase pt-1">Expected Standard:</div>
                      <div className="text-emerald-800 bg-emerald-50 p-1.5 rounded">{finding.evidence.expectedHeader}</div>
                    </>
                  )}
                </div>
              )}

              {finding.evidence.domSelector && (
                <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                  <div className="text-[11px] font-semibold text-brand-text-secondary uppercase">Affected DOM Selector:</div>
                  <div className="text-gray-800 bg-gray-100 p-1.5 rounded">{finding.evidence.domSelector}</div>
                </div>
              )}

              {finding.evidence.metrics && (
                <div className="p-3 bg-white rounded-lg border border-brand-border">
                  <div className="text-[11px] font-semibold text-brand-text-secondary uppercase mb-1.5">Engine Metrics:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(finding.evidence.metrics).map(([k, v]) => (
                      <div key={k} className="p-1.5 bg-brand-muted rounded flex items-center justify-between">
                        <span className="text-brand-text-secondary">{k}:</span>
                        <span className="font-semibold text-brand-text">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {finding.evidence.responseSnippet && (
                <div className="p-3 bg-white rounded-lg border border-brand-border space-y-1">
                  <div className="text-[11px] font-semibold text-brand-text-secondary uppercase">Server Response Snippet:</div>
                  <pre className="overflow-x-auto text-[11px] text-gray-700 bg-gray-50 p-2 rounded max-h-40">{finding.evidence.responseSnippet}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
