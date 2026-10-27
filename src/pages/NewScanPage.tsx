import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSubmitScan } from '../hooks/useScans';
import { useSavedSites } from '../hooks/useSites';
import { SiteUrlForm } from '../components/common/SiteUrlForm';
import { ScanProfile } from '../types/audit';
import { ShieldCheck, Info, ArrowLeft, Lock, Zap } from 'lucide-react';

export const NewScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUrlFromQuery = searchParams.get('url') || '';
  const submitMutation = useSubmitScan();
  const { data: sites } = useSavedSites();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const savedSitesList = (sites || []).map((s) => ({
    hostname: s.hostname,
    isVerified: s.isVerified,
  }));

  const handleStartScan = async (data: {
    url: string;
    profile: ScanProfile;
    acknowledgedTerms: boolean;
  }) => {
    setSubmissionError(null);
    try {
      const response = await submitMutation.mutateAsync({
        url: data.url,
        profile: data.profile,
        acknowledgedTerms: data.acknowledgedTerms,
      });

      // Navigate to detailed scan report page
      navigate(`/app/scans/${response.scanId}`);
    } catch (err: any) {
      setSubmissionError(err.message || 'Audit dispatch failed. Please check network connectivity.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back Link */}
      <Link
        to="/app"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary hover:text-brand-text transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Overview</span>
      </Link>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 sm:p-8 shadow-card space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-mint text-brand-emerald-dark text-xs font-semibold mb-3 border border-brand-border">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-emerald" />
            <span>Launch-Readiness Preflight</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text">
            Start a New Website Audit
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-secondary mt-1.5 leading-relaxed">
            Enter any public website URL to test SEO indexability, Lighthouse performance, accessibility indicators, and HTTPS security headers.
          </p>
        </div>

        {/* SiteUrlForm Component */}
        <SiteUrlForm
          initialUrl={initialUrlFromQuery}
          onSubmitScan={handleStartScan}
          isSubmitting={submitMutation.isPending}
          backendError={submissionError}
          savedSites={savedSitesList}
          onVerifyDomainClick={(hostname) => navigate('/app/sites')}
        />
      </div>

      {/* Scope Details & Security Notice */}
      <div className="rounded-2xl border border-brand-border bg-brand-muted/40 p-5 space-y-3 text-xs text-brand-text-secondary">
        <h4 className="font-bold uppercase tracking-wider text-brand-text flex items-center gap-1.5 text-[11px]">
          <Info className="w-4 h-4 text-brand-emerald" />
          <span>Audit Guardrails & Testing Ethics</span>
        </h4>
        <p className="leading-relaxed">
          All baseline scans are passive and non-destructive. We do not inject malicious payloads, fuzz private database queries, or flood web servers. Deeper active scans are strictly gated behind DNS domain verification.
        </p>
      </div>
    </div>
  );
};
