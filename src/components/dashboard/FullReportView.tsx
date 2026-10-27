import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { FindingCard } from '../common/FindingCard';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { Severity, Category } from '../../types/audit';
import { 
  Download, 
  RefreshCw, 
  ExternalLink, 
  ShieldCheck, 
  Search, 
  Filter, 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Clock,
  Sparkles,
  FileText,
  Share2,
  Check
} from 'lucide-react';

export const FullReportView: React.FC = () => {
  const { activeReport, markFindingResolved, rescanWebsite, isScanning } = useAudit();
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!activeReport) {
    return (
      <div className="p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-gray-300 mx-auto" />
        <h2 className="text-lg font-bold text-brand-text">No Active Report Selected</h2>
        <p className="text-xs text-brand-text-secondary">Please select a report from your history or run a new scan.</p>
      </div>
    );
  }

  const filteredFindings = activeReport.findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!f.title.toLowerCase().includes(q) && !f.description.toLowerCase().includes(q) && !f.ruleId.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const exportReportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit-report-${activeReport.normalizedHostname}-${activeReport.scanId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Header Card */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-brand-border">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-brand-text-secondary bg-brand-muted px-2.5 py-0.5 rounded border border-brand-border">
                Scan ID: {activeReport.scanId}
              </span>
              <StatusBadge status={activeReport.status} size="sm" />
              <span className="text-xs text-brand-text-secondary capitalize font-mono">
                · {activeReport.scanProfile.replace('_', ' ')}
              </span>
              {activeReport.isSampleData && (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Illustrative Sample
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text flex items-center gap-2 font-mono">
              <span>{activeReport.targetUrl}</span>
              <a 
                href={activeReport.targetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-emerald hover:text-brand-emerald-dark"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-brand-text-secondary font-mono">
              <span>Created: {new Date(activeReport.createdAt).toLocaleString()}</span>
              <span>·</span>
              <span>Duration: {activeReport.durationSeconds || 32}s</span>
              <span>·</span>
              <span>Total findings: {activeReport.summary.totalFindings}</span>
            </div>
          </div>

          {/* Readiness Score Box & Actions */}
          <div className="flex flex-wrap items-center gap-4 self-start lg:self-auto">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-card-green border border-brand-border">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-brand-text-secondary">
                  Launch Readiness
                </div>
                <div className="text-3xl font-black text-brand-emerald-dark font-mono">
                  {activeReport.summary.readinessScore}%
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-brand-mint border-t-brand-emerald flex items-center justify-center font-bold text-xs text-brand-emerald">
                {activeReport.summary.readinessScore}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                isLoading={isScanning}
                onClick={() => rescanWebsite(activeReport.scanId)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Rescan & Verify Fixes
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportReportJson}
                leftIcon={downloadSuccess ? <Check className="w-3.5 h-3.5 text-brand-emerald" /> : <Download className="w-3.5 h-3.5" />}
              >
                {downloadSuccess ? 'Exported JSON' : 'Download Report JSON'}
              </Button>
            </div>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-brand-border bg-brand-muted/40 rounded-xl border border-brand-border overflow-hidden text-xs">
          <button
            onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
            className={`p-3 text-center transition-colors ${severityFilter === 'critical' ? 'bg-red-100/70 font-bold' : 'hover:bg-red-50'}`}
          >
            <div className="text-red-700 font-semibold mb-0.5">Critical</div>
            <div className="text-xl font-bold text-red-900">{activeReport.summary.critical}</div>
          </button>
          <button
            onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
            className={`p-3 text-center transition-colors ${severityFilter === 'high' ? 'bg-orange-100/70 font-bold' : 'hover:bg-orange-50'}`}
          >
            <div className="text-orange-800 font-semibold mb-0.5">High</div>
            <div className="text-xl font-bold text-orange-950">{activeReport.summary.high}</div>
          </button>
          <button
            onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
            className={`p-3 text-center transition-colors ${severityFilter === 'medium' ? 'bg-amber-100/70 font-bold' : 'hover:bg-amber-50'}`}
          >
            <div className="text-amber-800 font-semibold mb-0.5">Medium</div>
            <div className="text-xl font-bold text-amber-950">{activeReport.summary.medium}</div>
          </button>
          <button
            onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
            className={`p-3 text-center transition-colors ${severityFilter === 'low' ? 'bg-emerald-100/70 font-bold' : 'hover:bg-emerald-50'}`}
          >
            <div className="text-emerald-800 font-semibold mb-0.5">Low</div>
            <div className="text-xl font-bold text-emerald-950">{activeReport.summary.low}</div>
          </button>
          <button
            onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
            className={`p-3 text-center col-span-2 sm:col-span-1 transition-colors ${severityFilter === 'info' ? 'bg-slate-200/70 font-bold' : 'hover:bg-slate-100'}`}
          >
            <div className="text-slate-700 font-semibold mb-0.5">Info</div>
            <div className="text-xl font-bold text-slate-900">{activeReport.summary.info}</div>
          </button>
        </div>

        {/* Category Breakdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-text-secondary uppercase tracking-wider text-[10px]">
              Filter by Category:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(activeReport.summary.categoryScores).map(([cat, score]) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat as Category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                  categoryFilter === cat
                    ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle'
                    : 'bg-white text-brand-text border-brand-border hover:bg-brand-card-green'
                }`}
              >
                <span className="capitalize">{cat}</span>
                <span className={`font-mono text-[11px] font-bold ${categoryFilter === cat ? 'text-white' : 'text-brand-emerald'}`}>
                  {score}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Finding Counts Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings by rule ID, title, or target..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-brand-border bg-brand-muted/30 focus:outline-none focus:border-brand-emerald"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs">
          {(severityFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSeverityFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="text-brand-emerald hover:underline font-semibold"
            >
              Reset all filters
            </button>
          )}

          <span className="text-brand-text-secondary font-mono">
            Showing {filteredFindings.length} of {activeReport.findings.length} findings
          </span>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-brand-border">
            <p className="text-sm font-semibold text-brand-text">No findings match the selected filters.</p>
            <p className="text-xs text-brand-text-secondary mt-1">Try resetting the severity or category filters.</p>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onToggleResolved={markFindingResolved}
              isDetailedDefault={finding.severity === 'critical' || finding.severity === 'high'}
            />
          ))
        )}
      </div>

      {/* Engines Run & Transparent Scope Notice */}
      <div className="rounded-2xl bg-white border border-brand-border p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold text-brand-text mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            <span>Scanning Engine Execution Telemetry</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeReport.enginesRun.map((eng, i) => (
              <div key={i} className="p-3 rounded-xl bg-brand-muted/40 border border-brand-border text-xs">
                <div className="font-bold text-brand-text">{eng.displayName}</div>
                <div className="flex items-center justify-between text-[11px] text-brand-text-secondary mt-1">
                  <span className={`capitalize font-semibold ${
                    eng.status === 'passed' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {eng.status.replace('_', ' ')}
                  </span>
                  {eng.executionTimeMs && <span>{eng.executionTimeMs}ms</span>}
                </div>
                {eng.message && (
                  <p className="text-[10px] text-gray-500 mt-1 italic">{eng.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-brand-border">
          <h4 className="text-xs font-bold text-brand-text mb-2">
            Audit Transparency: Tests NOT Performed in This Scan
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-brand-text-secondary">
            {activeReport.checksNotPerformed.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-gray-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};
