import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useScansList, useRescan } from '../hooks/useScans';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ScanProfile } from '../types/audit';
import {
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  Eye,
  History,
  ArrowRight,
  ExternalLink,
  Calendar,
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
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
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
        message={error.message}
        onRetry={() => refetch()}
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
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Audit Scan History
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Historical audit records, launch readiness scores, and verified remediation states.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/app/scans/new')}
          leftIcon={<PlusCircle className="w-4 h-4" />}
          className="shadow-subtle"
        >
          New Audit Scan
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-subtle flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scans by URL or scan ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-xs font-mono text-brand-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-emerald"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
          >
            <option value="all">All Profiles</option>
            <option value="baseline_public">Baseline Public</option>
            <option value="authorized_deep">Authorized Deep</option>
          </select>
        </div>
      </div>

      {/* Scans Table / List */}
      {scansList.length === 0 ? (
        <EmptyState
          title="No Matching Audits Found"
          description="We couldn't find any scans matching your criteria. Try adjusting filters or run a new scan."
          actionLabel="Start New Scan"
          onAction={() => navigate('/app/scans/new')}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-brand-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-slate-50/75 text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
                  <th className="py-3.5 px-4 sm:px-6">Target Website</th>
                  <th className="py-3.5 px-4">Profile & Status</th>
                  <th className="py-3.5 px-4">Readiness Score</th>
                  <th className="py-3.5 px-4">Findings Breakdown</th>
                  <th className="py-3.5 px-4">Scan Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {scansList.map((scan) => {
                  let scoreBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  if (scan.summary.readinessScore < 70) scoreBadge = 'text-red-700 bg-red-50 border-red-200';
                  else if (scan.summary.readinessScore < 80) scoreBadge = 'text-amber-800 bg-amber-50 border-amber-200';

                  return (
                    <tr
                      key={scan.scanId}
                      onClick={() => navigate(`/app/scans/${scan.scanId}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-mono font-bold text-sm text-brand-text group-hover:text-brand-emerald transition-colors">
                          {scan.normalizedHostname}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          ID: {scan.scanId}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <StatusBadge status={scan.status} size="sm" />
                          <span className="text-[10px] text-brand-text-secondary font-mono block capitalize">
                            {scan.scanProfile.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${scoreBadge}`}>
                          {scan.summary.readinessScore}/100
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        <div className="flex items-center gap-1.5 text-xs">
                          {scan.summary.critical > 0 && (
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

                      <td className="py-4 px-4 text-brand-text-secondary font-mono text-[11px]">
                        {new Date(scan.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleRescan(scan.scanId, e)}
                            isLoading={rescanMutation.isPending}
                            title="Rescan target"
                            className="p-1.5"
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
        </div>
      )}
    </div>
  );
};
