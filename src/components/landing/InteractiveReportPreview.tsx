import React, { useState } from 'react';
import { sampleReports } from '../../data/sampleReports';
import { FindingCard } from '../common/FindingCard';
import { Severity, Category } from '../../types/audit';
import { 
  Filter, 
  Search, 
  SlidersHorizontal, 
  ExternalLink, 
  ShieldCheck, 
  AlertOctagon, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Clock,
  Sparkles
} from 'lucide-react';

export const InteractiveReportPreview: React.FC = () => {
  const [selectedSampleKey, setSelectedSampleKey] = useState<string>('react-vite-landing');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const report = sampleReports[selectedSampleKey] || sampleReports['react-vite-landing'];

  // Filtering logic
  const filteredFindings = report.findings.filter((finding) => {
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && finding.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = finding.title.toLowerCase().includes(q);
      const matchDesc = finding.description.toLowerCase().includes(q);
      const matchRule = finding.ruleId.toLowerCase().includes(q);
      const matchUrl = finding.affectedUrl.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchRule && !matchUrl) return false;
    }
    return true;
  });

  return (
    <section id="sample-reports" className="py-16 sm:py-24 bg-brand-muted/60 border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-card-green text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Working Software Preview</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-text">
            Actual report interface. <br />
            <span className="text-brand-emerald">Inspect findings, evidence & diffs.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-brand-text-secondary leading-relaxed">
            Click through findings below to test the actual report viewer. Every result provides reproducible curl commands, exact server headers, and verified remediation diffs.
          </p>

          {/* Sample Site Switcher Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-xl bg-white border border-brand-border shadow-subtle inline-flex">
            <button
              onClick={() => setSelectedSampleKey('react-vite-landing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSampleKey === 'react-vite-landing'
                  ? 'bg-brand-emerald text-white shadow-subtle'
                  : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-muted'
              }`}
            >
              React / Vite Landing Page
            </button>
            <button
              onClick={() => setSelectedSampleKey('nextjs-marketing')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSampleKey === 'nextjs-marketing'
                  ? 'bg-brand-emerald text-white shadow-subtle'
                  : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-muted'
              }`}
            >
              Next.js Marketing Website
            </button>
            <button
              onClick={() => setSelectedSampleKey('saas-application')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedSampleKey === 'saas-application'
                  ? 'bg-brand-emerald text-white shadow-subtle'
                  : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-muted'
              }`}
            >
              Small SaaS Application
            </button>
          </div>
        </div>

        {/* Working Report Shell */}
        <div className="rounded-2xl border-2 border-brand-border bg-white shadow-elevated overflow-hidden">
          
          {/* Top Banner: Audited Site Details */}
          <div className="p-6 bg-brand-card-green/50 border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-text-secondary font-semibold">
                  Report ID: {report.scanId}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                  Illustrative Sample Data
                </span>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-mono font-bold text-brand-text">
                  {report.targetUrl}
                </h3>
                <span className="text-xs text-brand-text-secondary">({report.durationSeconds}s scan)</span>
              </div>
            </div>

            {/* Launch Readiness Score Gauge */}
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-brand-border shadow-subtle self-start md:self-auto">
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-text-secondary">
                  Launch Readiness
                </div>
                <div className="text-2xl font-black text-brand-emerald-dark">
                  {report.summary.readinessScore} <span className="text-xs font-normal text-gray-500">/ 100</span>
                </div>
              </div>

              <div className="w-12 h-12 rounded-full border-4 border-brand-mint border-t-brand-emerald flex items-center justify-center font-bold text-sm text-brand-emerald">
                {report.summary.readinessScore}%
              </div>
            </div>
          </div>

          {/* Severity Counters Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-brand-border border-b border-brand-border bg-white text-xs">
            {/* Critical */}
            <button
              onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
              className={`p-3.5 text-center transition-colors hover:bg-red-50/50 ${
                severityFilter === 'critical' ? 'bg-red-50/80 ring-2 ring-red-400 inset-0' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-red-700 font-semibold mb-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Critical</span>
              </div>
              <div className="text-xl font-bold text-red-800">{report.summary.critical}</div>
            </button>

            {/* High */}
            <button
              onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
              className={`p-3.5 text-center transition-colors hover:bg-orange-50/50 ${
                severityFilter === 'high' ? 'bg-orange-50/80 ring-2 ring-orange-400' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-orange-800 font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>High</span>
              </div>
              <div className="text-xl font-bold text-orange-900">{report.summary.high}</div>
            </button>

            {/* Medium */}
            <button
              onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
              className={`p-3.5 text-center transition-colors hover:bg-amber-50/50 ${
                severityFilter === 'medium' ? 'bg-amber-50/80 ring-2 ring-amber-400' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-amber-800 font-semibold mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Medium</span>
              </div>
              <div className="text-xl font-bold text-amber-900">{report.summary.medium}</div>
            </button>

            {/* Low */}
            <button
              onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
              className={`p-3.5 text-center transition-colors hover:bg-emerald-50/50 ${
                severityFilter === 'low' ? 'bg-emerald-50/80 ring-2 ring-emerald-400' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-semibold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Low</span>
              </div>
              <div className="text-xl font-bold text-emerald-900">{report.summary.low}</div>
            </button>

            {/* Info */}
            <button
              onClick={() => setSeverityFilter(severityFilter === 'info' ? 'all' : 'info')}
              className={`p-3.5 text-center col-span-2 sm:col-span-1 transition-colors hover:bg-slate-50 ${
                severityFilter === 'info' ? 'bg-slate-100 ring-2 ring-slate-400' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-slate-700 font-semibold mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>Informational</span>
              </div>
              <div className="text-xl font-bold text-slate-900">{report.summary.info}</div>
            </button>
          </div>

          {/* Category Scores Strip */}
          <div className="p-4 bg-brand-muted/30 border-b border-brand-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-brand-text-secondary uppercase tracking-wider text-[11px]">
                Category Breakdown:
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(report.summary.categoryScores).map(([cat, score]) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat as Category)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    categoryFilter === cat 
                      ? 'bg-brand-emerald text-white border-brand-emerald' 
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

          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-white border-b border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule ID, title, or evidence..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-brand-border bg-brand-muted/30 focus:outline-none focus:border-brand-emerald"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {(severityFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSeverityFilter('all');
                    setCategoryFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-brand-emerald hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}

              <span className="text-xs text-brand-text-secondary font-mono">
                Showing {filteredFindings.length} of {report.findings.length} findings
              </span>
            </div>
          </div>

          {/* Findings List (Click to expand evidence & code diffs) */}
          <div className="p-4 sm:p-6 space-y-4 bg-brand-muted/20">
            {filteredFindings.length === 0 ? (
              <div className="p-12 text-center text-sm text-brand-text-secondary bg-white rounded-xl border border-brand-border">
                No findings match the selected filters.
              </div>
            ) : (
              filteredFindings.map((finding) => (
                <FindingCard 
                  key={finding.id} 
                  finding={finding}
                  isDetailedDefault={false}
                />
              ))
            )}
          </div>

          {/* What Was Not Tested Section */}
          <div className="p-5 bg-brand-card-green/40 border-t border-brand-border text-xs">
            <div className="flex items-center gap-2 mb-2 font-bold text-brand-text">
              <ShieldCheck className="w-4 h-4 text-brand-emerald" />
              <span>Transparent Audit Scope: Tests NOT Performed in Public Baseline</span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-brand-text-secondary">
              {report.checksNotPerformed.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-gray-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>
    </section>
  );
};
