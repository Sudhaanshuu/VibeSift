import React, { useState, useEffect } from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { useAudit } from '../../context/AuditContext';
import { ArrowLeft, ArrowRight, FileCheck, CheckCircle2, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { SampleReportsSection } from '../landing/SampleReportsSection';
import { InteractiveReportPreview } from '../landing/InteractiveReportPreview';
import { Footer } from '../landing/Footer';

interface SampleReportsPageProps {
  onBackToHome: () => void;
  onNavigateToApp: () => void;
  onNavigateToMethodology: () => void;
  onNavigateToSampleReports: () => void;
  onNavigateToRemediation: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToSecurity?: () => void;
  onOpenPrivacyNotice: () => void;
  onOpenSecurityPolicy: () => void;
}

export const SampleReportsPage: React.FC<SampleReportsPageProps> = ({
  onBackToHome,
  onNavigateToApp,
  onNavigateToMethodology,
  onNavigateToSampleReports,
  onNavigateToRemediation,
  onNavigateToPrivacy,
  onNavigateToSecurity,
  onOpenPrivacyNotice,
  onOpenSecurityPolicy,
}) => {
  const { openNewScanModal } = useAudit();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectSample = (sampleKey: string) => {
    const el = document.getElementById('sample-reports');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-brand-text font-sans antialiased selection:bg-brand-mint selection:text-brand-emerald-deep flex flex-col justify-between">
      
      {/* Subpage Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-text-secondary hover:text-brand-text px-3 py-1.5 rounded-full border border-brand-border hover:bg-brand-muted transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <div className="h-5 w-px bg-brand-border hidden sm:block" />
              <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }}>
                <BrandLogo size="sm" showTagline={false} />
              </a>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-block text-xs font-mono text-brand-text-secondary">
                Sample Audit Reports & Diffs
              </span>
              <button
                type="button"
                onClick={() => openNewScanModal()}
                className="inline-flex items-center justify-center font-bold text-xs sm:text-sm px-4 py-2 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white shadow-subtle transition-all gap-1.5"
              >
                <span>Run Live Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-brand-mint border-b border-brand-border py-14 sm:py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-brand-emerald-deep text-xs font-bold border border-brand-border shadow-subtle">
            <FileCheck className="w-4 h-4 text-brand-emerald" />
            <span>INTERACTIVE DEMO SUITE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-text">
            Sample Audit Reports & <br />
            <span className="text-brand-emerald-dark">Verified Vulnerability Diffs</span>
          </h1>

          <p className="text-base sm:text-lg text-brand-text-secondary max-w-2xl mx-auto leading-relaxed">
            Inspect live, pre-generated baseline audit reports across React, Next.js, and Full-Stack SaaS stacks. Test our filterable finding engine, reproducible curl commands, and code remediation snippets.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-brand-text-secondary">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-brand-emerald" />
              <span>3 Realistic Architecture Presets</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Terminal className="w-4 h-4 text-brand-emerald" />
              <span>Reproducible Curl Commands</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Layers className="w-4 h-4 text-brand-emerald" />
              <span>Framework-Specific Diffs</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Pre-generated demo cards */}
        <SampleReportsSection onSelectSample={handleSelectSample} />

        {/* 2. Interactive Finding & Diff Explorer */}
        <InteractiveReportPreview />

        {/* Action Callout */}
        <section className="py-16 bg-brand-card-green border-t border-brand-border">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-brand-text">
              Run this exact audit on your website
            </h2>
            <p className="text-sm text-brand-text-secondary max-w-xl mx-auto">
              Get an instant baseline inspection with evidence-backed findings, reproducible HTTP curls, and framework code diffs in less than 30 seconds.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openNewScanModal()}
                className="px-6 py-2.5 rounded-full bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold text-sm shadow-subtle transition-all flex items-center gap-1.5"
              >
                <span>Run Free Baseline Scan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onBackToHome}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-brand-muted text-brand-text font-bold text-sm border border-brand-border shadow-subtle transition-all"
              >
                Return to Home
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Subpage Footer */}
      <Footer
        onNavigateToApp={onNavigateToApp}
        onNavigateToMethodology={onNavigateToMethodology}
        onNavigateToSampleReports={onNavigateToSampleReports}
        onNavigateToRemediation={onNavigateToRemediation}
        onNavigateToPrivacy={onNavigateToPrivacy}
        onNavigateToSecurity={onNavigateToSecurity}
        onOpenPrivacyNotice={onOpenPrivacyNotice}
        onOpenSecurityPolicy={onOpenSecurityPolicy}
      />
    </div>
  );
};
