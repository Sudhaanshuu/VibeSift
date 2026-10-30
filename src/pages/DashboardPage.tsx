import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useScansList } from '../hooks/useScans';
import { useSavedSites } from '../hooks/useSites';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { FindingSeverityBadge } from '../components/common/FindingSeverityBadge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import {
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Globe,
  ExternalLink,
  Layers,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isMockMode } = useAuth();

  const { data: scans, isLoading: scansLoading, error: scansError, refetch: refetchScans } = useScansList();
  const { data: sites, isLoading: sitesLoading, error: sitesError } = useSavedSites();

  if (scansLoading || sitesLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (scansError) {
    return (
      <ErrorState
        title="Failed to Load Dashboard Data"
        message={scansError.message}
        onRetry={() => refetchScans()}
      />
    );
  }

  const scansList = scans || [];
  const savedWebsites = sites || [];

  const totalScans = scansList.length;
  const verifiedCount = savedWebsites.filter((s) => s.isVerified).length;
  const avgScore =
    totalScans > 0
      ? Math.round(scansList.reduce((acc, s) => acc + (s.summary?.readinessScore ?? 0), 0) / totalScans)
      : 0;

  const totalCriticalHigh = scansList.reduce((acc, s) => {
    return acc + (s.summary?.critical || 0) + (s.summary?.high || 0);
  }, 0);

  // Collect most recent findings across scans
  const recentFindings = scansList
    .flatMap((s) => (s.findings || []).map((f) => ({ ...f, scanId: s.scanId, host: s.normalizedHostname })))
    .filter((f) => f.verificationStatus !== 'fixed')
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
              Welcome, {user?.name || 'Developer'}
            </h1>
            {isMockMode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                Mock Demo Data
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1">
            Pre-launch verification telemetry across your AI-built web applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/scans/new')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            className="shadow-subtle hover:shadow-glow-green"
          >
            Start New Scan
          </Button>
        </div>
      </div>

      {/* 4 Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-brand-border p-5 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
              Total Audits Run
            </p>
            <p className="text-2xl font-extrabold text-brand-text mt-1 font-mono">{totalScans}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Full reports retained</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-mint text-brand-emerald-dark flex items-center justify-center border border-brand-border">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-brand-border p-5 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
              Avg Readiness Score
            </p>
            <p className="text-2xl font-extrabold text-brand-text mt-1 font-mono">{avgScore}/100</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Launch benchmark</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-brand-border p-5 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
              Verified Domains
            </p>
            <p className="text-2xl font-extrabold text-brand-text mt-1 font-mono">
              {verifiedCount} / {savedWebsites.length}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">Authorized deep scope</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-brand-border p-5 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase font-bold text-brand-text-secondary">
              Open High / Critical
            </p>
            <p className="text-2xl font-extrabold text-red-600 mt-1 font-mono">{totalCriticalHigh}</p>
            <span className="text-[10px] text-slate-400 mt-1 block">Requires remediation</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Scans + Saved Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Scans Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-brand-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-emerald" />
              <span>Recent Audit Reports</span>
            </h2>
            <Link
              to="/app/history"
              className="text-xs font-semibold text-brand-emerald hover:underline flex items-center gap-1"
            >
              <span>View all scans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {scansList.length === 0 ? (
            <EmptyState
              title="No Audits Performed Yet"
              description="Submit your first website URL to inspect SEO, performance, accessibility, and security headers."
              actionLabel="Start First Audit"
              onAction={() => navigate('/app/scans/new')}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-brand-border shadow-subtle overflow-hidden">
              <div className="divide-y divide-brand-border">
                {scansList.slice(0, 5).map((scan) => {
                  let scoreBadge = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  const readiness = scan.summary?.readinessScore ?? 0;
                  if (readiness < 70) scoreBadge = 'text-red-700 bg-red-50 border-red-200';
                  else if (readiness < 80) scoreBadge = 'text-amber-800 bg-amber-50 border-amber-200';

                  return (
                    <div
                      key={scan.scanId}
                      onClick={() => navigate(`/app/scans/${scan.scanId}`)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-brand-text font-mono">
                            {scan.normalizedHostname}
                          </span>
                          <StatusBadge status={scan.status} size="sm" />
                          {scan.isSampleData && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              Demo
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-text-secondary font-mono">
                          <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                          <span>·</span>
                          <span className="capitalize">{scan.scanProfile.replace('_', ' ')}</span>
                          <span>·</span>
                          <span>{(scan.findings || []).length} findings</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs ${scoreBadge}`}>
                          {scan.summary?.readinessScore ?? 0}/100
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          className="text-xs"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Findings Feed */}
          {recentFindings.length > 0 && (
            <div className="pt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">
                Latest Open Findings Grouped by Severity
              </h3>
              <div className="bg-white rounded-2xl border border-brand-border p-4 shadow-subtle divide-y divide-brand-border">
                {recentFindings.map((finding) => (
                  <div
                    key={finding.id}
                    onClick={() => navigate(`/app/scans/${finding.scanId}`)}
                    className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FindingSeverityBadge severity={finding.severity} size="sm" />
                        <span className="font-mono text-xs font-semibold text-brand-text">
                          {finding.title}
                        </span>
                      </div>
                      <p className="text-xs text-brand-text-secondary line-clamp-1">
                        {finding.description}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">
                        {finding.host} · Rule: {finding.ruleId}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Saved Websites & Quick Verification */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-white border border-brand-border p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-brand-text flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-emerald" />
                <span>Saved Websites</span>
              </h2>
              <Link
                to="/app/sites"
                className="text-xs font-semibold text-brand-emerald hover:underline"
              >
                Manage
              </Link>
            </div>

            <p className="text-xs text-brand-text-secondary leading-relaxed">
              Verify domain control to unlock deeper OWASP ZAP and Nuclei testing pipelines.
            </p>

            <div className="space-y-2.5">
              {savedWebsites.slice(0, 4).map((site) => (
                <div
                  key={site.id}
                  className="p-3 rounded-xl border border-brand-border bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-mono font-bold text-brand-text truncate">{site.hostname}</p>
                    <span className="text-[10px] text-brand-text-secondary">
                      Score: {site.lastScanScore ? `${site.lastScanScore}/100` : 'Not scanned'}
                    </span>
                  </div>
                  {site.isVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <Link
                      to="/app/sites"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      Verify
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/sites')}
              className="w-full justify-center text-xs"
            >
              Add New Website Domain
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
