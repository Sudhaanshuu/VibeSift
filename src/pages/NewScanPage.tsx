import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSubmitScan } from '../hooks/useScans';
import { useSavedSites } from '../hooks/useSites';
import { precheckScanTarget, PrecheckResult } from '../lib/api/scans';
import { SiteUrlForm } from '../components/common/SiteUrlForm';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { ExistingAuditModal } from '../components/common/ExistingAuditModal';
import { ScanProfile } from '../types/audit';
import { ArrowLeft, Info, ShieldCheck } from 'lucide-react';

export const NewScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUrlFromQuery = searchParams.get('url') || '';
  const submitMutation = useSubmitScan();
  const { data: sites } = useSavedSites();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Existing S3 Audit Pop-up state
  const [cachedAudit, setCachedAudit] = useState<PrecheckResult | null>(null);
  const [isExistingModalOpen, setIsExistingModalOpen] = useState(false);
  const [pendingScanData, setPendingScanData] = useState<{
    url: string;
    profile: ScanProfile;
    acknowledgedTerms: boolean;
    turnstileToken?: string;
  } | null>(null);

  const savedSitesList = (sites || []).map((s) => ({
    hostname: s.hostname,
    isVerified: s.isVerified,
  }));

  const handleStartScan = async (data: {
    url: string;
    profile: ScanProfile;
    acknowledgedTerms: boolean;
    turnstileToken?: string;
    forceRescan?: boolean;
  }) => {
    setSubmissionError(null);

    // Step 1: Pre-check S3 and SQLite to see if an audit already exists
    if (!data.forceRescan) {
      try {
        const check = await precheckScanTarget(data.url);
        if (check.exists && check.scanId) {
          setCachedAudit(check);
          setPendingScanData(data);
          setIsExistingModalOpen(true);
          return;
        }
      } catch (checkErr) {
        console.warn('[NewScanPage] Pre-check note:', checkErr);
      }
    }

    // Step 2: Enqueue scan through SQS FIFO pipeline
    try {
      const response = await submitMutation.mutateAsync({
        url: data.url,
        profile: data.profile,
        acknowledgedTerms: data.acknowledgedTerms,
        forceRescan: data.forceRescan,
        turnstileToken: data.turnstileToken,
      });

      // Navigate to detailed scan report page (which loads UI from JSON)
      navigate(`/app/scans/${response.scanId}`);
    } catch (err: any) {
      setSubmissionError(err.message || 'Audit dispatch failed. Please check network connectivity.');
    }
  };

  const handleViewExisting = (scanId: string) => {
    setIsExistingModalOpen(false);
    navigate(`/app/scans/${scanId}`);
  };

  const handleReaudit = async () => {
    if (!pendingScanData) return;
    setIsExistingModalOpen(false);
    await handleStartScan({
      ...pendingScanData,
      forceRescan: true,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Consistent Page Header with Back Link */}
      <PageHeader
        backAction={
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        }
        title="Start a New Website Audit"
        description="Inspect SEO crawlability, Core Web Vitals, accessibility indicators, and HTTPS security response headers in one evidence-backed report."
      />

      {/* Main Form Card */}
      <Card variant="white" elevation="card" className="p-6 sm:p-8 space-y-6">
        <SiteUrlForm
          initialUrl={initialUrlFromQuery}
          onSubmitScan={handleStartScan}
          isSubmitting={submitMutation.isPending}
          backendError={submissionError}
          savedSites={savedSitesList}
          onVerifyDomainClick={() => navigate('/app/sites')}
        />
      </Card>

      {/* Existing Audit Found in S3 Modal */}
      <ExistingAuditModal
        isOpen={isExistingModalOpen}
        onClose={() => setIsExistingModalOpen(false)}
        cachedAudit={cachedAudit}
        onViewExisting={handleViewExisting}
        onReaudit={handleReaudit}
        isReauditing={submitMutation.isPending}
      />

      {/* Scope Details & Security Notice */}
      <div className="rounded-2xl border border-brand-border bg-brand-muted/50 p-5 space-y-2 text-xs text-brand-text-secondary">
        <h4 className="font-bold uppercase tracking-wider text-brand-text flex items-center gap-1.5 text-[11px]">
          <Info className="w-4 h-4 text-brand-emerald" />
          <span>Audit Guardrails & Testing Scope</span>
        </h4>
        <p className="leading-relaxed">
          Baseline public audits are safe and passive. We do not inject malicious payloads, flood servers with traffic, or test denial-of-service vectors. Deeper security scans require verified domain ownership.
        </p>
      </div>
    </div>
  );
};
