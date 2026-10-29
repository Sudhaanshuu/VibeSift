import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useScanReport, useRescan, useCancelScan, useResolveFinding, isScanTerminal } from '../hooks/useScans';
import { ScanProgress } from '../components/common/ScanProgress';
import { ReportSummary } from '../components/common/ReportSummary';
import { FindingCard } from '../components/common/FindingCard';
import { FindingFilters, FindingFilterState } from '../components/common/FindingFilters';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ReportSkeleton } from '../components/common/LoadingSkeleton';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { downloadReportJson, generateReportMarkdown } from '../lib/api/reports';
import { exportReportToPdf } from '../lib/export/pdfReportGenerator';
import { CheckRegistryView } from '../components/common/CheckRegistryView';
import { PrivacyComplianceSection } from '../components/common/PrivacyComplianceSection';
import { DeepComparisonSection } from '../components/common/DeepComparisonSection';
import { buildBasicAuditChecks, buildDeepSecurityChecks, buildDpdpComplianceChecks } from '../data/auditReportBuilder';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  StopCircle,
  FileText,
  ListFilter,
  CheckSquare,
  Lock,
  GitCompare,
} from 'lucide-react';

export const ScanDetailPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading, error, refetch } = useScanReport(scanId);
  const rescanMutation = useRescan();
  const cancelMutation = useCancelScan();
  const resolveMutation = useResolveFinding();

  const [copiedMd, setCopiedMd] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  const [filters, setFilters] = useState<FindingFilterState>({
    search: '',
    severity: 'all',
    category: 'all',
    verificationStatus: 'all',
  });

  const [activeTab, setActiveTab] = useState<'findings' | 'registry' | 'dpdp' | 'comparison'>('findings');

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (error || !report) {
    return (
      <ErrorState
        title="Audit Report Not Found"
        message={error?.message || `Unable to locate audit report for ID: "${scanId}".`}
        errorCode="NOT_FOUND"
        onRetry={() => refetch()}
        onHome={() => navigate('/app')}
      />
    );
  }

  const isTerminal = isScanTerminal(report.status);
  const isRunning = !isTerminal;
  const rawFindings = report.findings || [];

  // Filter findings
  const filteredFindings = rawFindings.filter((f) => {
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

  const effectiveChecks = (report.checks && report.checks.length > 0)
    ? report.checks
    : (report.scanProfile === 'authorized_deep'
        ? [...buildBasicAuditChecks(report.targetUrl), ...buildDeepSecurityChecks(report.targetUrl), ...buildDpdpComplianceChecks(report.targetUrl)]
        : buildBasicAuditChecks(report.targetUrl));

  const severityCounts = {
    critical: rawFindings.filter((f) => f.severity === 'critical').length,
    high: rawFindings.filter((f) => f.severity === 'high').length,
    medium: rawFindings.filter((f) => f.severity === 'medium').length,
    low: rawFindings.filter((f) => f.severity === 'low').length,
    info: rawFindings.filter((f) => f.severity === 'info').length,
  };

  const handleDownloadJson = () => {
    downloadReportJson(report);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleExportPdf = async () => {
    if (!report) return;
    setPdfExporting(true);
    try {
      await exportReportToPdf(report);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setPdfExporting(false);
    }
  };

  const handleCopyMarkdown = () => {
    const md = generateReportMarkdown(report);
    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2500);
  };

  const handleRescan = async () => {
    if (!scanId) return;
    const res = await rescanMutation.mutateAsync(scanId);
    navigate(`/app/scans/${res.scanId}`);
  };

  const handleCancel = async () => {
    if (!scanId) return;
    await cancelMutation.mutateAsync(scanId);
  };

  const handleMarkResolved = (findingId: string) => {
    if (!scanId) return;
    const current = rawFindings.find((f) => f.id === findingId);
    const nextStatus = current?.verificationStatus === 'fixed' ? 'open' : 'fixed';
    resolveMutation.mutate({
      scanId,
      findingId,
      status: nextStatus,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/app/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scan History</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
              leftIcon={<StopCircle className="w-4 h-4 text-red-500" />}
              className="text-xs border-red-200 text-red-700 hover:bg-red-50"
            >
              Cancel Scan
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                isLoading={pdfExporting}
                leftIcon={<FileText className="w-3.5 h-3.5 text-brand-emerald" />}
                className="text-xs font-semibold"
              >
                Export PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                leftIcon={copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {copiedMd ? 'Markdown Copied!' : 'Copy Markdown'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJson}
                leftIcon={downloadSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {downloadSuccess ? 'Downloaded!' : 'Export JSON'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleRescan}
                isLoading={rescanMutation.isPending}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Rescan Target
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Live Polling Status / Progress Banner if running */}
      {isRunning && (
        <ScanProgress
          status={report.status}
          enginesRun={report.enginesRun}
          durationSeconds={report.durationSeconds}
        />
      )}

      {/* Executive Summary */}
      <ReportSummary
        report={report}
        onCategoryClick={(cat) => setFilters((prev) => ({ ...prev, category: cat }))}
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-brand-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'findings'
              ? 'border-brand-emerald text-brand-emerald bg-white shadow-xs'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Actionable Findings</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700">
            {rawFindings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'registry'
              ? 'border-brand-emerald text-brand-emerald bg-white shadow-xs'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-slate-50'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Full Check Registry</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800">
            {effectiveChecks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dpdp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'dpdp'
              ? 'border-brand-emerald text-brand-emerald bg-white shadow-xs'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-slate-50'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Privacy & DPDP Act (2023)</span>
          {report.privacyCompliance && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-800 uppercase">
              {(report.privacyCompliance.overallRating || report.privacyCompliance.complianceRating || 'review').replace('_', ' ')}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'comparison'
              ? 'border-brand-emerald text-brand-emerald bg-white shadow-xs'
              : 'border-transparent text-brand-text-secondary hover:text-brand-text hover:bg-slate-50'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5 text-purple-500" />
          <span>Deep vs Basic Differential</span>
          {report.scanProfile === 'authorized_deep' && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 text-purple-800">
              Deep Active
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Actionable Findings */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-subtle">
            <FindingFilters
              filters={filters}
              onChange={setFilters}
              severityCounts={severityCounts}
              totalCount={rawFindings.length}
            />
          </div>

          {/* Findings List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-brand-text">
                Audit Findings ({filteredFindings.length} of {rawFindings.length})
              </h3>
              <span className="text-xs text-brand-text-secondary font-mono">
                Click finding card to inspect server headers, reproduction curl & fix diffs
              </span>
            </div>

            {filteredFindings.length === 0 ? (
              <EmptyState
                title="No Findings Match Filter"
                description="All clear for this filter combination, or try resetting search filters."
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
                    onResolve={() => handleMarkResolved(finding.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Full Check Registry */}
      {activeTab === 'registry' && (
        <CheckRegistryView checks={effectiveChecks} />
      )}

      {/* Tab 3: Privacy & DPDP Compliance */}
      {activeTab === 'dpdp' && (
        <PrivacyComplianceSection summary={report.privacyCompliance} />
      )}

      {/* Tab 4: Deep vs Basic Comparison */}
      {activeTab === 'comparison' && (
        <DeepComparisonSection
          comparison={report.deepComparison}
          scanProfile={report.scanProfile}
        />
      )}

      {/* Explicit What Was Not Tested Section */}
      {report.checksNotPerformed && report.checksNotPerformed.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Checks Not Performed in this Scope
              </h4>
              <p className="text-[11px] text-slate-500">
                Safe audits observe external properties only. "Not detected" is distinct from "not tested".
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {report.checksNotPerformed.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 flex items-start gap-2"
              >
                <span className="text-slate-400 font-bold">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
