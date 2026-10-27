import React from 'react';
import { useAudit } from '../../context/AuditContext';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import { 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle, 
  Globe, 
  ExternalLink, 
  Activity,
  Layers,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface DashboardOverviewProps {
  onViewReport: (scanId: string) => void;
  onNavigateTab: (tab: 'new-scan' | 'history' | 'saved-sites' | 'report' | 'settings') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  onViewReport, 
  onNavigateTab 
}) => {
  const { scansList, savedWebsites, openNewScanModal, setActiveReport } = useAudit();

  const totalScans = scansList.length;
  const verifiedCount = savedWebsites.filter(s => s.isVerified).length;
  
  // Calculate average score
  const avgScore = totalScans > 0 
    ? Math.round(scansList.reduce((acc, s) => acc + s.summary.readinessScore, 0) / totalScans) 
    : 0;

  // Calculate open high & critical
  const totalOpenHighCritical = scansList.reduce((acc, s) => {
    const count = s.findings.filter(f => (f.severity === 'critical' || f.severity === 'high') && f.verificationStatus !== 'fixed').length;
    return acc + count;
  }, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Welcome & Quick Scan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Audit Overview
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Pre-launch verification telemetry across your AI-built web applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => openNewScanModal()}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Run New Audit
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between text-xs text-brand-text-secondary mb-2">
            <span>Avg Readiness Score</span>
            <Activity className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-emerald-dark">
            {avgScore} <span className="text-xs font-normal text-gray-400">/ 100</span>
          </div>
          <div className="text-[11px] text-brand-text-secondary mt-2 flex items-center gap-1">
            <span className="text-brand-emerald font-bold">●</span> Baseline across {totalScans} reports
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between text-xs text-brand-text-secondary mb-2">
            <span>Open High / Critical</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-700">
            {totalOpenHighCritical}
          </div>
          <div className="text-[11px] text-brand-text-secondary mt-2">
            Action items requiring remediation
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between text-xs text-brand-text-secondary mb-2">
            <span>Verified Domains</span>
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            {verifiedCount} <span className="text-xs font-normal text-gray-400">/ {savedWebsites.length}</span>
          </div>
          <div className="text-[11px] text-brand-text-secondary mt-2">
            Eligible for deep security tests
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-white border border-brand-border shadow-subtle">
          <div className="flex items-center justify-between text-xs text-brand-text-secondary mb-2">
            <span>Total Audits Run</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            {totalScans}
          </div>
          <div className="text-[11px] text-brand-text-secondary mt-2">
            Saved in private history
          </div>
        </div>

      </div>

      {/* Main Grid: Recent Scans Table (Left) & Saved Domains (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Scans */}
        <div className="lg:col-span-8 rounded-2xl bg-white border border-brand-border shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-brand-text">Recent Audit Scans</h2>
              <p className="text-xs text-brand-text-secondary">Latest baseline and authorized inspections</p>
            </div>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs font-semibold text-brand-emerald hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-brand-border">
            {scansList.slice(0, 4).map((scan) => (
              <div 
                key={scan.scanId}
                onClick={() => {
                  setActiveReport(scan);
                  onNavigateTab('report');
                }}
                className="p-4 sm:p-5 hover:bg-brand-muted/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-text">
                      {scan.targetUrl}
                    </span>
                    {scan.isSampleData && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-brand-text-secondary font-mono">
                    <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span className="capitalize">{scan.scanProfile.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>{scan.summary.totalFindings} findings</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-brand-text-secondary font-semibold">Readiness</div>
                    <div className="text-sm font-bold text-brand-emerald-dark font-mono">
                      {scan.summary.readinessScore}%
                    </div>
                  </div>

                  <StatusBadge status={scan.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Saved Websites & Verification */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-brand-border shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-text">Target Domains</h2>
            <button
              onClick={() => onNavigateTab('saved-sites')}
              className="text-xs text-brand-emerald font-semibold hover:underline"
            >
              Manage
            </button>
          </div>

          <p className="text-xs text-brand-text-secondary">
            Verified ownership unlocks deeper OWASP ZAP and Nuclei testing pipelines.
          </p>

          <div className="space-y-3">
            {savedWebsites.map((site) => (
              <div
                key={site.id}
                className="p-3 rounded-xl border border-brand-border bg-brand-muted/30 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-mono font-bold text-brand-text truncate">
                    {site.hostname}
                  </div>
                  <div className="text-[10px] text-brand-text-secondary">
                    {site.isVerified ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ownership Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Unverified Domain
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => openNewScanModal(site.normalizedUrl)}
                  className="px-2.5 py-1 rounded bg-white border border-brand-border text-[11px] font-semibold text-brand-text hover:bg-brand-card-green transition-colors shrink-0"
                >
                  Scan
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab('saved-sites')}
              className="w-full text-xs"
            >
              Verify New Domain →
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
};
