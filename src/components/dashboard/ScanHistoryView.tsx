import React, { useState } from 'react';
import { useAudit } from '../../context/AuditContext';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  RefreshCw, 
  Eye, 
  History,
  FileCheck,
  PlusCircle
} from 'lucide-react';

interface ScanHistoryViewProps {
  onSelectReport: (scanId: string) => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({ onSelectReport }) => {
  const { scansList, openNewScanModal, rescanWebsite } = useAudit();
  const [searchTerm, setSearchTerm] = useState('');
  const [profileFilter, setProfileFilter] = useState<'all' | 'baseline_public' | 'authorized_deep'>('all');

  const filteredScans = scansList.filter((s) => {
    if (profileFilter !== 'all' && s.scanProfile !== profileFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!s.targetUrl.toLowerCase().includes(q) && !s.scanId.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Scan History
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Complete audit records, launch readiness scores, and verified remediation states.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => openNewScanModal()}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          New Audit Scan
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-brand-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by target domain or scan ID..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-brand-border bg-brand-muted/40 focus:outline-none focus:border-brand-emerald"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <span className="text-brand-text-secondary font-medium">Profile:</span>
          <select
            value={profileFilter}
            onChange={(e: any) => setProfileFilter(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-brand-border bg-white focus:outline-none focus:border-brand-emerald"
          >
            <option value="all">All Profiles</option>
            <option value="baseline_public">Baseline Public</option>
            <option value="authorized_deep">Authorized Deep</option>
          </select>
        </div>
      </div>

      {/* Scans Table */}
      <div className="rounded-2xl bg-white border border-brand-border shadow-subtle overflow-hidden">
        {filteredScans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-brand-text">No scan history records found</h3>
            <p className="text-xs text-brand-text-secondary">Try clearing your search query or run a new website scan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-muted/70 border-b border-brand-border text-brand-text-secondary uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Target Website</th>
                  <th className="py-3 px-4">Profile & Status</th>
                  <th className="py-3 px-4">Date / Duration</th>
                  <th className="py-3 px-4">Findings (C / H / M / L)</th>
                  <th className="py-3 px-4 text-center">Readiness</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredScans.map((scan) => (
                  <tr key={scan.scanId} className="hover:bg-brand-muted/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-brand-text">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{scan.targetUrl}</span>
                        {scan.isSampleData && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Demo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-brand-text-secondary mt-0.5">
                        ID: {scan.scanId}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <StatusBadge status={scan.status} size="sm" />
                        <div className="text-[10px] text-brand-text-secondary capitalize font-mono">
                          {scan.scanProfile.replace('_', ' ')}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-brand-text-secondary font-mono">
                      <div>{new Date(scan.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px]">{scan.durationSeconds ? `${scan.durationSeconds}s` : 'Completed'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold" title="Critical">
                          {scan.summary.critical}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-bold" title="High">
                          {scan.summary.high}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold" title="Medium">
                          {scan.summary.medium}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold" title="Low">
                          {scan.summary.low}
                        </span>
                      </div>
                      <div className="text-[10px] text-brand-text-secondary mt-0.5">
                        {scan.summary.totalFindings} findings total
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full font-mono font-bold text-xs bg-brand-card-green text-brand-emerald-dark border border-brand-border">
                        {scan.summary.readinessScore}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectReport(scan.scanId)}
                          className="px-2.5 py-1 rounded-md bg-white border border-brand-border text-brand-emerald font-semibold text-xs hover:bg-brand-card-green transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                        <button
                          onClick={() => rescanWebsite(scan.scanId)}
                          title="Run follow-up rescan"
                          className="p-1 rounded-md text-brand-text-secondary hover:text-brand-text border border-brand-border hover:bg-brand-muted"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
