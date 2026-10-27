import React, { useState } from 'react';
import { AuditReport, Severity, Category } from '../../types/audit';
import { FindingCard } from './FindingCard';
import { FindingFilters, FindingFilterState } from './FindingFilters';
import { ReportSummary } from './ReportSummary';
import { EmptyState } from './EmptyState';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface ReportPreviewProps {
  report: AuditReport;
  onMarkResolved?: (findingId: string) => void;
  showSummary?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  report,
  onMarkResolved,
  showSummary = true,
}) => {
  const [filters, setFilters] = useState<FindingFilterState>({
    search: '',
    severity: 'all',
    category: 'all',
    verificationStatus: 'all',
  });

  const filteredFindings = report.findings.filter((f) => {
    if (filters.severity !== 'all' && f.severity !== filters.severity) return false;
    if (filters.category !== 'all' && f.category !== filters.category) return false;
    if (filters.verificationStatus !== 'all' && f.verificationStatus !== filters.verificationStatus) {
      return false;
    }
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchDesc = f.description.toLowerCase().includes(q);
      const matchRule = f.ruleId.toLowerCase().includes(q);
      const matchUrl = f.affectedUrl.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchRule && !matchUrl) return false;
    }
    return true;
  });

  const severityCounts = {
    critical: report.findings.filter((f) => f.severity === 'critical').length,
    high: report.findings.filter((f) => f.severity === 'high').length,
    medium: report.findings.filter((f) => f.severity === 'medium').length,
    low: report.findings.filter((f) => f.severity === 'low').length,
    info: report.findings.filter((f) => f.severity === 'info').length,
  };

  return (
    <div className="space-y-6">
      {showSummary && (
        <ReportSummary
          report={report}
          onCategoryClick={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
        />
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-subtle">
        <FindingFilters
          filters={filters}
          onChange={setFilters}
          severityCounts={severityCounts}
          totalCount={report.findings.length}
        />
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-brand-text">
            Audit Findings ({filteredFindings.length} of {report.findings.length})
          </h3>
          <span className="text-xs text-brand-text-secondary font-mono">
            Click finding to inspect evidence & diffs
          </span>
        </div>

        {filteredFindings.length === 0 ? (
          <EmptyState
            title="No Findings Match Filter"
            description="Try clearing your search query or adjusting the severity and category filters."
            actionLabel="Reset All Filters"
            onAction={() =>
              setFilters({
                search: '',
                severity: 'all',
                category: 'all',
                verificationStatus: 'all',
              })
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onResolve={onMarkResolved ? () => onMarkResolved(finding.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* What Was Not Tested Section */}
      {report.checksNotPerformed && report.checksNotPerformed.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-500" />
            <span>Boundary Notice: What Was Not Tested in this Profile</span>
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            A clean or partial result does not prove the website is impervious or legally compliant. The following tests were intentionally excluded from this scan:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-700 pt-1">
            {report.checksNotPerformed.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
