import React, { useState } from 'react';
import { AuditCheckResult, CheckStatus, Severity } from '../../types/audit';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  MinusCircle, 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  ShieldCheck, 
  Code, 
  ExternalLink 
} from 'lucide-react';

interface CheckRegistryViewProps {
  checks: AuditCheckResult[];
}

export const CheckRegistryView: React.FC<CheckRegistryViewProps> = ({ checks }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredChecks = checks.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchId = c.checkId.toLowerCase().includes(q);
      const matchCat = c.category.toLowerCase().includes(q);
      const matchExp = (c.explanation || c.description || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCat && !matchExp) return false;
    }
    return true;
  });

  const counts = {
    all: checks.length,
    pass: checks.filter((c) => c.status === 'pass').length,
    fail: checks.filter((c) => c.status === 'fail').length,
    warning: checks.filter((c) => c.status === 'warning').length,
    info: checks.filter((c) => c.status === 'info').length,
    not_tested: checks.filter((c) => c.status === 'not_tested').length,
    not_applicable: checks.filter((c) => c.status === 'not_applicable').length,
  };

  const renderStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Pass
          </span>
        );
      case 'fail':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-rose-700" /> Fail
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-amber-700" /> Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full">
            <Info className="w-3 h-3 text-sky-700" /> Info
          </span>
        );
      case 'not_tested':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
            <MinusCircle className="w-3 h-3 text-slate-500" /> Not Tested
          </span>
        );
      case 'not_applicable':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full">
            <MinusCircle className="w-3 h-3 text-gray-400" /> N/A
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full">
            <HelpCircle className="w-3 h-3 text-gray-500" /> Unknown
          </span>
        );
    }
  };

  const renderFindingTypeBadge = (ft?: string) => {
    if (ft === 'confirmed') {
      return (
        <span className="text-[10px] font-mono font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded border border-red-300">
          Confirmed Finding
        </span>
      );
    }
    if (ft === 'suspected') {
      return (
        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
          Potential Risk
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search checks by name, ID, or description..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('pass')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'pass'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Passed ({counts.pass})
          </button>
          <button
            onClick={() => setStatusFilter('fail')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'fail'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Failed ({counts.fail})
          </button>
          <button
            onClick={() => setStatusFilter('warning')}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              statusFilter === 'warning'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Warnings ({counts.warning})
          </button>
          {counts.not_tested > 0 && (
            <button
              onClick={() => setStatusFilter('not_tested')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                statusFilter === 'not_tested'
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Not Tested ({counts.not_tested})
            </button>
          )}
        </div>
      </div>

      {/* Check Items List */}
      <div className="space-y-2">
        {filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No audit checks matched your current filter criteria.
          </div>
        ) : (
          filteredChecks.map((c) => {
            const isExpanded = expandedId === c.checkId;
            return (
              <div
                key={c.checkId}
                className={`rounded-xl border transition-all overflow-hidden ${
                  c.status === 'fail'
                    ? 'border-rose-200 bg-rose-50/20'
                    : c.status === 'warning'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : c.checkId)}
                  className="p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      className="mt-0.5 text-slate-400 hover:text-slate-700 shrink-0"
                      aria-label={isExpanded ? 'Collapse check' : 'Expand check'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {renderStatusBadge(c.status)}
                        {renderFindingTypeBadge(c.findingType)}
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {c.checkId}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-slate-500">
                          · {c.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          [{(c.auditMode || 'audit').toUpperCase()}]
                        </span>
                        {c.legalCitation && (
                          <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                            {c.legalCitation}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                        {c.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {c.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] font-medium text-emerald-700 hover:underline">
                      {isExpanded ? 'Hide Details' : 'View Evidence & Remediation'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3.5 text-xs">
                    {/* Explanation */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Finding Explanation
                      </span>
                      <p className="text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                        {c.explanation}
                      </p>
                    </div>

                    {/* Impact if present */}
                    {c.impact && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                        <span className="font-semibold text-amber-950">Why This Issue Matters: </span>
                        {c.impact}
                      </div>
                    )}

                    {/* Remediation */}
                    {c.remediation?.summary && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Code className="w-3.5 h-3.5 text-emerald-600" /> Actionable Remediation
                        </span>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                          <p className="text-slate-800 font-medium">{c.remediation.summary}</p>
                          {c.remediation.codeSnippet && (
                            <pre className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                              {c.remediation.codeSnippet}
                            </pre>
                          )}
                          {c.remediation.docUrl && (
                            <a
                              href={c.remediation.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium text-[11px] underline"
                            >
                              <span>Official Technical Specification</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Technical Evidence */}
                    {c.evidence && Object.keys(c.evidence).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5 text-slate-600" /> Technical Evidence
                        </span>
                        <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2 font-mono text-[11px]">
                          {c.evidence.testedUrl && (
                            <div>
                              <span className="text-slate-400">Tested URL: </span>
                              <span className="text-slate-800">{c.evidence.testedUrl}</span>
                            </div>
                          )}
                          {c.evidence.statusCode !== undefined && (
                            <div>
                              <span className="text-slate-400">HTTP Status: </span>
                              <span className="text-slate-800 font-bold">{c.evidence.statusCode}</span>
                            </div>
                          )}
                          {c.evidence.observedHeader && (
                            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-800">
                              {c.evidence.observedHeader}
                            </div>
                          )}
                          {c.evidence.reproductionCurl && (
                            <div className="p-2 bg-slate-900 text-emerald-400 rounded">
                              {c.evidence.reproductionCurl}
                            </div>
                          )}
                          <pre className="text-[10px] text-slate-600 overflow-x-auto p-2 bg-slate-50 rounded">
                            {JSON.stringify(c.evidence, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Execution Reason if skipped */}
                    {c.executionReason && (
                      <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        <span className="font-bold">Execution Scope Note: </span>
                        {c.executionReason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
