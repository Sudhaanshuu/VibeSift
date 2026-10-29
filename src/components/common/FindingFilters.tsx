import React from 'react';
import { Severity, Category, VerificationStatus } from '../../types/audit';
import { Search, Filter, X } from 'lucide-react';

export interface FindingFilterState {
  search: string;
  severity: Severity | 'all';
  category: Category | 'all';
  verificationStatus: VerificationStatus | 'all';
}

interface FindingFiltersProps {
  filters: FindingFilterState;
  onChange: (filters: FindingFilterState) => void;
  severityCounts?: Record<Severity, number>;
  totalCount?: number;
}

export const FindingFilters: React.FC<FindingFiltersProps> = ({
  filters,
  onChange,
  severityCounts,
  totalCount,
}) => {
  const severities: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low', 'info'];

  const categories: { id: Category | 'all'; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'security', label: 'Security & App Sec' },
    { id: 'privacy', label: 'DPDP / Privacy' },
    { id: 'completeness', label: 'Completeness & Trust' },
    { id: 'exposure', label: 'Exposure & Artifacts' },
    { id: 'performance', label: 'Performance' },
    { id: 'seo', label: 'SEO & Metadata' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'cookies', label: 'Cookies & Consent' },
    { id: 'infrastructure', label: 'Infrastructure & DNS' },
    { id: 'abuse', label: 'Abuse Prevention' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleSeverityChange = (sev: Severity | 'all') => {
    onChange({ ...filters, severity: sev });
  };

  const handleCategoryChange = (cat: Category | 'all') => {
    onChange({ ...filters, category: cat });
  };

  const handleStatusChange = (status: VerificationStatus | 'all') => {
    onChange({ ...filters, verificationStatus: status });
  };

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.severity !== 'all' ||
    filters.category !== 'all' ||
    filters.verificationStatus !== 'all';

  const clearAllFilters = () => {
    onChange({
      search: '',
      severity: 'all',
      category: 'all',
      verificationStatus: 'all',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Dropdown Selectors */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search findings by rule ID, description, or title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown */}
        <div className="w-full md:w-60">
          <select
            value={filters.category}
            onChange={(e) => handleCategoryChange(e.target.value as any)}
            className="w-full py-2.5 px-3 rounded-xl border border-brand-border bg-white text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Verification Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={filters.verificationStatus}
            onChange={(e) => handleStatusChange(e.target.value as any)}
            className="w-full py-2.5 px-3 rounded-xl border border-brand-border bg-white text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open Findings</option>
            <option value="fixed">Verified Fixed</option>
            <option value="waived">Waived / Accepted</option>
          </select>
        </div>
      </div>

      {/* Severity Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-bold text-brand-text-secondary uppercase mr-1">
          Severity:
        </span>
        {severities.map((sev) => {
          const isSelected = filters.severity === sev;
          const count =
            sev === 'all'
              ? totalCount
              : severityCounts
              ? severityCounts[sev]
              : undefined;

          return (
            <button
              key={sev}
              type="button"
              onClick={() => handleSeverityChange(sev)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all duration-150 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-brand-emerald text-white border-brand-emerald shadow-subtle font-semibold'
                  : 'bg-white text-brand-text-secondary border-brand-border hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="capitalize">{sev}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 ml-auto flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>
    </div>
  );
};
