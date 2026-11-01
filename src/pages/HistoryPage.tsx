import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScansList, useRescan } from '../hooks/useScans';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ScanProfile } from '../types/audit';
import {
  Search,
  PlusCircle,
  RefreshCw,
  Eye,
  ArrowRight,
  X,
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState<'all' | ScanProfile>('all');

  const { data: scans, isLoading, error, refetch } = useScansList({
    search: searchTerm,
    profile: profileFilter === 'all' ? undefined : profileFilter,
  });

  const rescanMutation = useRescan();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Scan History"
        message={error.message || 'Unable to retrieve historical audit records.'}
        onRetry={() => refetch()}
        onHome={() => navigate('/app')}
      />
    );
  }

  const scansList = scans || [];

  const handleRescan = async (scanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await rescanMutation.mutateAsync(scanId);
    navigate(`/app/scans/${res.scanId}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Audit Scan History"
        description="Historical audit records, launch readiness scores, and verified remediation states."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/scans/new')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            New Audit Scan
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card variant="white" elevation="subtle" className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scans by URL or scan ID..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-brand-border bg-white text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-full md:w-56">
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value as any)}
            className="w-full py-2.5 px-3 rounded-xl border border-brand-border bg-white text-xs font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-emerald"
            aria-label="Filter by scan profile"
          >
            <option value="all">All Profiles</option>
            <option value="baseline_public">Baseline Public</option>
            <option value="authorized_deep">Authorized Deep</option>
          </select>
        </div>
      </Card>

      {/* Scans List / Table */}
      {scansList.length === 0 ? (
        <EmptyState
          title="No Matching Audits Found"
          description="We couldn't find any scans matching your criteria. Try adjusting your query or launch a new audit."
          actionLabel="Start New Scan"
          onAction={() => navigate('/app/scans/new')}
        />
      ) : (
        <>
          {/* Mobile View: Stacked Cards (<640px) */}
          <div className="sm:hidden space-y-3">
            {scansList.map((scan) => {
              let scoreBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200';
              const readiness = scan.summary?.readinessScore ?? 0;
              if (readiness < 70) scoreBadge = 'text-red-700 bg-red-50 border-red-200';
              else if (readiness < 80) scoreBadge = 'text-amber-800 bg-amber-50 border-amber-200';

              return (
                <Card
                  key={scan.scanId}
                  variant="white"
                  elevation="subtle"
                  className="p-4 space-y-3 cursor-pointer hover:border-slate-300"
                  onClick={() => navigate(`/app/scans/${scan.scanId}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-bold text-sm text-brand-text block truncate">
                        {scan.normalizedHostname}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        ID: {scan.scanId}
                      </span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-lg border font-mono font-bold text-xs shrink-0 ${scoreBadge}`}>
                      {readiness}/100
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-brand-text-secondary font-mono pt-1 border-t border-brand-border">
                    <StatusBadge status={scan.status} size="sm" />
                    <span>
                      {new Date(scan.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500 font-mono">
                      {(scan.findings || []).length} findings
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/scans/${scan.scanId}`);
                      }}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Report
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Tablet & Desktop View: Table (>=640px) */}
          <Card variant="white" elevation="subtle" className="hidden sm:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-border bg-slate-50/75 text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
                    <th className="py-3.5 px-6">Target Website</th>
                    <th className="py-3.5 px-4">Profile & Status</th>
                    <th className="py-3.5 px-4">Readiness Score</th>
                    <th className="py-3.5 px-4">Findings Breakdown</th>
                    <th className="py-3.5 px-4">Scan Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {scansList.map((scan) => {
                    let scoreBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                    const readiness = scan.summary?.readinessScore ?? 0;
                    if (readiness < 70) scoreBadge = 'text-red-700 bg-red-50 border-red-200';
                    else if (readiness < 80) scoreBadge = 'text-amber-800 bg-amber-50 border-amber-200';

                    return (
                      <tr
                        key={scan.scanId}
                        onClick={() => navigate(`/app/scans/${scan.scanId}`)}
                        className="hover:bg-brand-muted/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6 min-w-[200px]">
                          <div className="font-mono font-bold text-sm text-brand-text group-hover:text-brand-emerald-deep transition-colors truncate">
                            {scan.normalizedHostname}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                            ID: {scan.scanId}
                          </span>
                        </td>

                        <td className="py-4 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <StatusBadge status={scan.status} size="sm" />
                            <span className="text-[10px] text-brand-text-secondary font-mono block capitalize">
                              {scan.scanProfile.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 min-w-[120px]">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${scoreBadge}`}>
                            {readiness}/100
                          </span>
                        </td>

                        <td className="py-4 px-4 font-mono min-w-[160px]">
                          <div className="flex items-center gap-1.5 text-xs">
                            {scan.summary && scan.summary.critical > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                                {scan.summary.critical} crit
                              </span>
                            )}
                            {scan.summary && scan.summary.high > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">
                                {scan.summary.high} high
                              </span>
                            )}
                            <span className="text-slate-500 text-[11px]">
                              {(scan.findings || []).length} total
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-brand-text-secondary font-mono text-[11px] min-w-[110px]">
                          {new Date(scan.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-4 px-6 text-right min-w-[140px]">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleRescan(scan.scanId, e)}
                              isLoading={rescanMutation.isPending}
                              title="Rescan target"
                              className="p-2 min-h-[36px]"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/app/scans/${scan.scanId}`)}
                              rightIcon={<Eye className="w-3.5 h-3.5" />}
                              className="text-xs"
                            >
                              Report
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
